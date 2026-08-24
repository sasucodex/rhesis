from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel
import os
import time
from google import genai
import json
import tempfile
import sqlite3
from datetime import datetime
from docx import Document
from fpdf import FPDF
import shutil
import markdown
import uuid
from htmldocx import HtmlToDocx

app = FastAPI(title="Rhesis Transcription Server")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

CONFIG_DIR = os.path.expanduser("~/.config/rhesis")
CONFIG_FILE = os.path.join(CONFIG_DIR, "config.json")
DB_FILE = os.path.join(CONFIG_DIR, "database.db")
UPLOAD_DIR = os.path.join(CONFIG_DIR, "uploads")

os.makedirs(CONFIG_DIR, exist_ok=True)
os.makedirs(UPLOAD_DIR, exist_ok=True)

def init_db():
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute('''
        CREATE TABLE IF NOT EXISTS transcriptions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            filename TEXT NOT NULL,
            file_path TEXT NOT NULL,
            transcript TEXT,
            status TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    conn.commit()
    conn.close()

init_db()

def get_saved_api_key():
    if os.path.exists(CONFIG_FILE):
        try:
            with open(CONFIG_FILE, 'r') as f:
                config = json.load(f)
                return config.get("api_key")
        except:
            pass
    return None

def save_api_key(key: str):
    os.makedirs(CONFIG_DIR, exist_ok=True)
    with open(CONFIG_FILE, 'w') as f:
        json.dump({"api_key": key}, f)

class SetupRequest(BaseModel):
    api_key: str

class TranscriptionResponse(BaseModel):
    id: int
    transcript: str
    status: str

from docx.shared import Pt, RGBColor

class ExportRequest(BaseModel):
    text: str
    filename: str = "Trascrizione"
    date_str: str = ""

class UpdateTranscriptRequest(BaseModel):
    transcript: str

@app.get("/")
def read_root():
    return {"message": "Rhesis Server is running! 🚀"}

@app.get("/status")
def check_status():
    api_key = get_saved_api_key()
    return {
        "server_running": True, 
        "api_key_configured": api_key is not None
    }

@app.post("/setup")
def setup_api_key(req: SetupRequest):
    if not req.api_key or len(req.api_key) < 10:
        raise HTTPException(status_code=400, detail="API Key non valida")
    save_api_key(req.api_key)
    return {"message": "Configurazione salvata con successo"}

@app.delete("/setup")
def delete_api_key():
    if os.path.exists(CONFIG_FILE):
        os.remove(CONFIG_FILE)
    return {"message": "API Key rimossa con successo"}

@app.get("/history")
def get_history():
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    c.execute("SELECT id, filename, status, created_at, transcript FROM transcriptions ORDER BY id DESC")
    rows = c.fetchall()
    conn.close()
    return [dict(row) for row in rows]

async def process_transcription_core(api_key: str, file_path: str, record_id: int):
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    
    try:
        client = genai.Client(api_key=api_key)
        uploaded_file = client.files.upload(file=file_path)
        
        file_info = client.files.get(name=uploaded_file.name)
        while file_info.state == 'PROCESSING':
            time.sleep(2)
            file_info = client.files.get(name=uploaded_file.name)
            
        if file_info.state == 'FAILED':
            raise Exception("Google backend failed processing audio.")
            
        prompt = (
            "Questa è la trascrizione accurata di una lezione universitaria in italiano. "
            "Vengono usati termini tecnici e accademici. Non inserire i timestamp (minutaggi)."
        )
        
        response = client.models.generate_content(
            model="gemini-3-flash-preview",
            contents=[uploaded_file, prompt]
        )
        
        # Convert Gemini's Markdown output into HTML
        transcript_html = markdown.markdown(response.text)
        
        # Cleanup remote
        try:
            client.files.delete(name=uploaded_file.name)
        except:
            pass
            
        # Cleanup local audio file to save disk space
        try:
            if os.path.exists(file_path):
                os.remove(file_path)
        except:
            pass
            
        # Success Update DB
        c.execute("UPDATE transcriptions SET transcript = ?, status = 'success' WHERE id = ?", (transcript_html, record_id))
        conn.commit()
        return transcript_html
        
    except Exception as e:
        # Error Update DB
        c.execute("UPDATE transcriptions SET status = 'error', transcript = ? WHERE id = ?", (str(e), record_id))
        conn.commit()
        raise e
    finally:
        conn.close()


@app.post("/transcribe/")
async def transcribe(file: UploadFile = File(...)):
    api_key = get_saved_api_key()
    if not api_key:
        raise HTTPException(status_code=401, detail="API Key not configured.")
        
    ext = os.path.splitext(file.filename)[1].lower() if file.filename else ""
    allowed_exts = {'.mp3', '.m4a', '.wav', '.ogg', '.flac', '.aac', '.mp4', '.webm', '.mpeg', '.mpga', '.amr'}
    
    if ext not in allowed_exts:
        raise HTTPException(status_code=400, detail=f"Formato file non supportato ({ext}). Usa un formato audio valido (es. MP3, M4A, WAV).")
        
    # Save file permanently using an ASCII-safe physical filename to prevent UnicodeEncodeError in Google SDK
    safe_filename = f"{int(time.time())}_{uuid.uuid4().hex[:8]}{ext}"
    file_path = os.path.join(UPLOAD_DIR, safe_filename)
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    # Insert Initial DB Record
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute("INSERT INTO transcriptions (filename, file_path, status) VALUES (?, ?, 'uploading')", (file.filename, file_path))
    record_id = c.lastrowid
    conn.commit()
    conn.close()
    
    try:
        transcript = await process_transcription_core(api_key, file_path, record_id)
        return {"id": record_id, "transcript": transcript, "status": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/retry/{record_id}")
async def retry_transcription(record_id: int):
    api_key = get_saved_api_key()
    if not api_key:
        raise HTTPException(status_code=401, detail="API Key not configured.")
        
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute("SELECT file_path FROM transcriptions WHERE id = ?", (record_id,))
    row = c.fetchone()
    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="File non trovato nella cronologia.")
    
    file_path = row[0]
    c.execute("UPDATE transcriptions SET status = 'uploading', transcript = NULL WHERE id = ?", (record_id,))
    conn.commit()
    conn.close()
    
    if not os.path.exists(file_path):
        # Update DB to error
        conn = sqlite3.connect(DB_FILE)
        conn.cursor().execute("UPDATE transcriptions SET status = 'error', transcript = 'File audio rimosso dal disco.' WHERE id = ?", (record_id,))
        conn.commit()
        conn.close()
        raise HTTPException(status_code=404, detail="File audio locale non più presente sul disco.")
        
    try:
        transcript = await process_transcription_core(api_key, file_path, record_id)
        return {"id": record_id, "transcript": transcript, "status": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/transcript/{record_id}")
def update_transcript(record_id: int, req: UpdateTranscriptRequest):
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute("UPDATE transcriptions SET transcript = ? WHERE id = ?", (req.transcript, record_id))
    conn.commit()
    conn.close()
    return {"message": "Success"}

@app.delete("/transcript/{record_id}")
def delete_transcript(record_id: int):
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute("SELECT file_path FROM transcriptions WHERE id = ?", (record_id,))
    row = c.fetchone()
    if row and row[0] and os.path.exists(row[0]):
        try:
            os.remove(row[0])
        except:
            pass
            
    c.execute("DELETE FROM transcriptions WHERE id = ?", (record_id,))
    conn.commit()
    conn.close()
    return {"message": "Success"}

@app.post("/export/word")
def export_word(req: ExportRequest):
    doc = Document()
    
    # Crea il titolo con la data in grigio
    heading = doc.add_heading(req.filename, 0)
    if req.date_str:
        run = heading.add_run(f"  {req.date_str}")
        run.font.color.rgb = RGBColor(128, 128, 128)
        run.font.size = Pt(14)
    
    new_parser = HtmlToDocx()
    new_parser.add_html_to_document(req.text, doc)
            
    temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=".docx")
    doc.save(temp_file.name)
    return FileResponse(temp_file.name, media_type='application/vnd.openxmlformats-officedocument.wordprocessingml.document', filename="Trascrizione.docx")

from xhtml2pdf import pisa

@app.post("/export/pdf")
def export_pdf(req: ExportRequest):
    date_html = f' <span style="color: gray; font-size: 14pt;">{req.date_str}</span>' if req.date_str else ""
    
    html_content = f"""
    <html>
    <head>
    <meta charset="utf-8">
    <style>
    body {{ font-family: Helvetica, sans-serif; font-size: 12pt; color: #333; }}
    h1 {{ text-align: left; font-size: 18pt; margin-bottom: 20px; border-bottom: 1px solid #eee; padding-bottom: 10px; }}
    </style>
    </head>
    <body>
    <h1>{req.filename}{date_html}</h1>
    {req.text}
    </body>
    </html>
    """
    
    temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=".pdf")
    with open(temp_file.name, "wb") as f:
        pisa.CreatePDF(html_content, dest=f)
        
    return FileResponse(temp_file.name, media_type='application/pdf', filename="Trascrizione.pdf")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
