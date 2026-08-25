from fastapi import FastAPI, UploadFile, File, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel
import os
import time
from google import genai
from google.genai import types
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
def process_transcription_core(api_key: str, file_path: str, record_id: int, enable_chapters: bool = False, enable_timestamps: bool = False):
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    try:
        client = genai.Client(api_key=api_key)
        uploaded_file = client.files.upload(file=file_path)
        file_info = client.files.get(name=uploaded_file.name)
        while file_info.state.name == 'PROCESSING':
            time.sleep(2)
            file_info = client.files.get(name=uploaded_file.name)
        if file_info.state.name == 'FAILED':
            raise Exception("Google backend failed processing audio.")
        system_instruction = (
            "Sei un trascrittore professionale e accademico. Il tuo compito è produrre una trascrizione testuale PAROLA PER PAROLA (verbatim) dell'audio fornito. "
            "REGOLA FONDAMENTALE 1: NON riassumere MAI, NON saltare argomenti e NON tagliare il testo. Devi trascrivere ogni singola frase detta, parola per parola. "
            "REGOLA FONDAMENTALE 2: Non inserire mai frasi di cortesia o saluti (es. 'Ecco la trascrizione'). Inizia direttamente con il contenuto. "
            "Fai massima attenzione all'esattezza dei termini tecnici, scientifici e alla corretta capitalizzazione."
        )
        prompt = "Esegui la trascrizione parola per parola dell'intero audio, senza tralasciare nulla."
        if enable_chapters:
            prompt += " Durante la trascrizione fedele, dividi il discorso inserendo dei titoli di capitolo (usa il formato Markdown ## per i titoli) quando il professore cambia argomento. IMPORTANTE: i capitoli servono solo a separare visivamente il testo, NON devi assolutamente riassumere il contenuto sotto di essi. Continua a trascrivere parola per parola."
        else:
            prompt += " Non inserire titoli di capitolo, trascrivi tutto in un flusso continuo diviso semplicemente in paragrafi."
        if enable_timestamps:
            prompt += " Inserisci i timestamp nel formato [MM:SS] all'inizio di ogni cambio logico di argomento o blocco di discorso."
        else:
            prompt += " ASSOLUTAMENTE NON INSERIRE timestamp o minutaggi nel testo."
        response = client.models.generate_content(
            model="gemini-3-flash-preview",
            contents=[uploaded_file, prompt],
            config=types.GenerateContentConfig(
                system_instruction=system_instruction,
                temperature=0.2
            )
        )
        transcript_html = markdown.markdown(response.text)
        try:
            client.files.delete(name=uploaded_file.name)
        except:
            pass
        c.execute("UPDATE transcriptions SET transcript = ?, status = 'success', created_at = CURRENT_TIMESTAMP WHERE id = ?", (transcript_html, record_id))
        conn.commit()
        return transcript_html
    except Exception as e:
        error_msg = str(e)
        if '503' in error_msg or 'high demand' in error_msg.lower():
            error_msg = "Errore. L'audio potrebbe essere troppo breve, generato artificialmente, oppure i server sono momentaneamente saturi. Riprovare."
        c.execute("DELETE FROM transcriptions WHERE id = ?", (record_id,))
        conn.commit()
        raise Exception(error_msg)
    finally:
        try:
            if os.path.exists(file_path):
                os.remove(file_path)
        except:
            pass
        conn.close()
@app.post("/transcribe/")
def transcribe(
    file: UploadFile = File(...),
    enable_chapters: bool = Form(False),
    enable_timestamps: bool = Form(False)
):
    api_key = get_saved_api_key()
    if not api_key:
        raise HTTPException(status_code=401, detail="API Key not configured.")
    ext = os.path.splitext(file.filename)[1].lower() if file.filename else ""
    allowed_exts = {'.mp3', '.m4a', '.wav', '.ogg', '.flac', '.aac', '.mp4', '.webm', '.mpeg', '.mpga', '.amr'}
    if ext not in allowed_exts:
        raise HTTPException(status_code=400, detail=f"Formato file non supportato ({ext}). Usa un formato audio valido (es. MP3, M4A, WAV).")
    safe_filename = f"{int(time.time())}_{uuid.uuid4().hex[:8]}{ext}"
    file_path = os.path.join(UPLOAD_DIR, safe_filename)
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute("INSERT INTO transcriptions (filename, file_path, status) VALUES (?, ?, 'uploading')", (file.filename, file_path))
    record_id = c.lastrowid
    conn.commit()
    conn.close()
    try:
        transcript = process_transcription_core(api_key, file_path, record_id, enable_chapters, enable_timestamps)
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
    body {  font-family: Helvetica, sans-serif; font-size: 12pt; color: #333; } 
    h1 {  text-align: left; font-size: 18pt; margin-bottom: 20px; border-bottom: 1px solid #eee; padding-bottom: 10px; } 
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
