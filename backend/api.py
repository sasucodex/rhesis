from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel

try:
    from backend.database import init_db
    from backend.services.auth_service import (
        get_saved_api_key,
        save_api_key,
        delete_saved_api_key,
        check_api_key_status,
    )
    from backend.services.export_service import (
        ExportRequest,
        generate_docx,
        generate_pdf,
    )
    from backend.routers.courses import router as courses_router
    from backend.routers.transcriptions import router as transcriptions_router
except ImportError:
    from database import init_db
    from services.auth_service import (
        get_saved_api_key,
        save_api_key,
        delete_saved_api_key,
        check_api_key_status,
    )
    from services.export_service import (
        ExportRequest,
        generate_docx,
        generate_pdf,
    )
    from routers.courses import router as courses_router
    from routers.transcriptions import router as transcriptions_router

app = FastAPI(title="Rhesis Transcription Server")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

init_db()

app.include_router(courses_router)
app.include_router(transcriptions_router)

class SetupRequest(BaseModel):
    api_key: str

@app.get("/")
def read_root():
    return {"message": "Rhesis Server is running! 🚀"}

@app.get("/status")
def check_status():
    api_key = get_saved_api_key()
    is_configured = bool(api_key and api_key.strip())
    if not is_configured:
        return {
            "server_running": True,
            "api_key_configured": False,
            "api_key_valid": False,
            "api_key_status": "unconfigured"
        }

    is_valid, status = check_api_key_status(api_key, retry_on_unreachable=True)
    return {
        "server_running": True, 
        "api_key_configured": True,
        "api_key_valid": is_valid,
        "api_key_status": status
    }

@app.post("/setup")
def setup_api_key(req: SetupRequest):
    key = req.api_key.strip() if req.api_key else ""
    if not key:
        raise HTTPException(status_code=400, detail="Il codice di accesso non può essere vuoto")

    is_valid, status = check_api_key_status(key, retry_on_unreachable=False)
    if status == "invalid":
        raise HTTPException(status_code=400, detail="Il codice inserito non sembra corretto o è incompleto. Assicurati di averlo copiato per intero e riprova.")
    if status == "unreachable":
        raise HTTPException(status_code=400, detail="Impossibile verificare il codice con Google: connessione internet assente o irraggiungibile.")

    save_api_key(key)
    return {"message": "Configurazione salvata con successo"}

@app.delete("/setup")
def delete_api_key():
    delete_saved_api_key()
    return {"message": "Codice di accesso rimosso con successo"}

@app.post("/export/word")
def export_word(req: ExportRequest):
    try:
        file_path, download_name = generate_docx(req)
    except Exception:
        raise HTTPException(status_code=500, detail="Errore durante la generazione del documento Word")
    return FileResponse(
        file_path,
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        filename=download_name
    )

@app.post("/export/pdf")
def export_pdf(req: ExportRequest):
    try:
        file_path, download_name = generate_pdf(req)
    except Exception:
        raise HTTPException(status_code=500, detail="Errore durante la generazione del file PDF")
    return FileResponse(
        file_path,
        media_type="application/pdf",
        filename=download_name
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
