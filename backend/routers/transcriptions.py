from fastapi import APIRouter, UploadFile, File, HTTPException, Form
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import Optional
import os
import re
import time
import shutil
import uuid
import mimetypes
import threading
import markdown
from google import genai
from google.genai import types

try:
    from backend.database import get_db_connection
    from backend.services.auth_service import get_saved_api_key, CONFIG_DIR
except ImportError:
    from database import get_db_connection
    from services.auth_service import get_saved_api_key, CONFIG_DIR

router = APIRouter(tags=["transcriptions"])

UPLOAD_DIR = os.path.join(CONFIG_DIR, "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

TASKS = {}
tasks_lock = threading.RLock()

TASK_QUEUE = []
TASK_CONTROLS = {}
ACTIVE_TASK_ID = None
queue_lock = threading.RLock()
queue_condition = threading.Condition(queue_lock)

worker_thread = None
worker_thread_lock = threading.Lock()

class TranscriptionResponse(BaseModel):
    id: int
    transcript: str
    status: str
    audio_preserved: Optional[bool] = False

class UpdateTranscriptRequest(BaseModel):
    transcript: Optional[str] = None
    filename: Optional[str] = None
    course_id: Optional[int] = None
    course_name: Optional[str] = None
    professor_name: Optional[str] = None

def clean_transcription_markdown(raw_text: str) -> str:
    if not raw_text:
        return ""
    text = raw_text.replace("\r\n", "\n").replace("\r", "\n")
    text = re.sub(r'(?m)^[ \t]*##[ \t]*\n+(?:[ \t]*\n)*[ \t]*(\[\d{1,2}:\d{2}(?::\d{2})?\]\s*[^\n]+)', r'## \1', text)
    text = re.sub(r'(?m)^[ \t]*##[ \t]*\n+(?:[ \t]*\n)*[ \t]*([A-Za-zÀ-ÿ0-9][^\n]+)', r'## \1', text)
    text = re.sub(r'(?m)^[ \t]*(\[\d{1,2}:\d{2}(?::\d{2})?\])\s*##\s*', r'## \1 ', text)
    text = re.sub(r'(?m)^[ \t]*(\[\d{1,2}:\d{2}(?::\d{2})?\])\s*\n+(?:[ \t]*\n)*##\s*', r'## \1 ', text)
    text = re.sub(r'(?m)^[ \t]*##\s*$', '', text)

    def clean_heading_and_following(match):
        ts = match.group(1)
        title = match.group(2).strip()
        sep = match.group(3)
        following = match.group(4)
        if re.match(r'\[\d{1,2}:\d{2}(?::\d{2})?\]', following.strip()):
            return f"## {title}{sep}{following}"
        return f"## {title}{sep}{ts} {following.lstrip()}"

    text = re.sub(
        r'(?m)^[ \t]*##\s*(\[\d{1,2}:\d{2}(?::\d{2})?\])\s*([^\n]+)(\n+(?:[ \t]*\n)*)([^\n]+)',
        clean_heading_and_following,
        text
    )
    text = re.sub(r'(?m)^[ \t]*##\s*\[\d{1,2}:\d{2}(?::\d{2})?\]\s*([^\n]+)', r'## \1', text)
    return text

def normalize_transcript_html(html: str) -> str:
    if not html:
        return ""
    html = re.sub(r'<p>\s*(\[\d{1,2}:\d{2}(?::\d{2})?\])\s*##\s*(.*?)</p>', r'<h2>\2</h2>', html)
    html = re.sub(r'<p>\s*##\s*(\[\d{1,2}:\d{2}(?::\d{2})?\]\s*.*?)</p>', r'<h2>\1</h2>', html)
    html = re.sub(r'<p>\s*##\s*(.*?)</p>', r'<h2>\1</h2>', html)
    html = re.sub(r'<h2>\s*</h2>\s*<p>(\s*\[\d{1,2}:\d{2}(?::\d{2})?\].*?)</p>', r'<h2>\1</h2>', html)
    html = re.sub(r'<h2>\s*</h2>\s*', '', html)

    def clean_h2_and_p(match):
        h2_full = match.group(1)
        h2_inner = match.group(2)
        sep = match.group(3)
        p_open = match.group(4)
        p_inner = match.group(5)

        ts_match = re.search(r'\[\d{1,2}:\d{2}(?::\d{2})?\]', h2_inner)
        if not ts_match:
            return match.group(0)

        ts = ts_match.group(0)
        clean_h2_inner = re.sub(r'\[\d{1,2}:\d{2}(?::\d{2})?\]\s*', '', h2_inner).strip()
        clean_h2 = f"<h2>{clean_h2_inner}</h2>"

        if re.match(r'^\s*\[\d{1,2}:\d{2}(?::\d{2})?\]', p_inner):
            return f"{clean_h2}{sep}{p_open}{p_inner}"
        else:
            return f"{clean_h2}{sep}{p_open}{ts} {p_inner.lstrip()}"

    html = re.sub(
        r'(<h2>(.*?)</h2>)(\s*)(<p[^>]*>)(.*?)(?=</p>|\Z)',
        clean_h2_and_p,
        html,
        flags=re.DOTALL
    )

    def strip_ts_from_h2(match):
        inner = match.group(1)
        clean_inner = re.sub(r'\[\d{1,2}:\d{2}(?::\d{2})?\]\s*', '', inner).strip()
        return f"<h2>{clean_inner}</h2>"

    html = re.sub(r'<h2>(.*?)</h2>', strip_ts_from_h2, html, flags=re.DOTALL)
    return html

def build_fts_query(user_query: str) -> str:
    cleaned = user_query.strip()
    if not cleaned:
        return ""
    tokens = re.findall(r'[^\W_]+', cleaned, re.UNICODE)
    if not tokens:
        return ""
    joined = " ".join(tokens)
    return f'"{joined}"*'

def focus_snippet_around_mark(snippet: str, max_chars_before: int = 25) -> str:
    if not snippet or "<mark>" not in snippet:
        return snippet.strip() if snippet else ""
    first_mark_idx = snippet.find("<mark>")
    if first_mark_idx <= max_chars_before:
        return snippet.strip()
    pre_text = snippet[:first_mark_idx]
    cut_pos = first_mark_idx - max_chars_before
    space_pos = pre_text.find(" ", cut_pos)
    if space_pos != -1 and space_pos < first_mark_idx:
        trimmed_pre = "..." + pre_text[space_pos:].lstrip()
    else:
        trimmed_pre = "..." + pre_text[cut_pos:]
    return (trimmed_pre + snippet[first_mark_idx:]).strip()

def update_task(task_id: str, status: str, progress: int, message: str, result=None, error=None):
    with tasks_lock:
        if task_id not in TASKS:
            TASKS[task_id] = {
                "task_id": task_id,
                "created_at": time.time(),
            }
        TASKS[task_id].update({
            "status": status,
            "progress": progress,
            "message": message,
            "result": result,
            "error": error,
            "updated_at": time.time(),
        })

def cleanup_old_tasks():
    with tasks_lock:
        now = time.time()
        expired = [
            tid for tid, t in TASKS.items()
            if t.get("status") in ("completed", "cancelled", "error")
            and now - t.get("created_at", now) > 7200
        ]
        for tid in expired:
            del TASKS[tid]
            TASK_CONTROLS.pop(tid, None)

def sanitize_stale_records():
    try:
        with get_db_connection() as conn:
            c = conn.cursor()
            c.execute("SELECT id, file_path, audio_preserved FROM transcriptions WHERE status IN ('processing', 'queued', 'uploading')")
            rows = c.fetchall()
            for row in rows:
                fpath = row["file_path"]
                preserved = bool(row["audio_preserved"])
                if not preserved and fpath and os.path.exists(fpath):
                    try:
                        os.remove(fpath)
                    except OSError:
                        pass
            c.execute("DELETE FROM transcriptions WHERE status IN ('processing', 'queued', 'uploading')")
            conn.commit()
    except Exception:
        pass

def _cleanup_cancelled_task(
    task_id: str,
    record_id: Optional[int],
    file_path: Optional[str],
    preserve_audio: bool,
    google_file_name: Optional[str],
    client: Optional[genai.Client]
):
    if google_file_name and client:
        try:
            client.files.delete(name=google_file_name)
        except Exception:
            pass

    if record_id:
        try:
            with get_db_connection() as conn:
                c = conn.cursor()
                c.execute("DELETE FROM transcriptions WHERE id = ?", (record_id,))
                conn.commit()
        except Exception:
            pass

    if not preserve_audio and file_path and os.path.exists(file_path):
        try:
            os.remove(file_path)
        except OSError:
            pass

    update_task(task_id, "cancelled", 0, "Trascrizione annullata dall'utente.")

def process_transcription_core(task_id: str):
    with tasks_lock:
        ctrl = TASK_CONTROLS.get(task_id)
    if not ctrl:
        return None

    api_key = ctrl["api_key"]
    file_path = ctrl["file_path"]
    record_id = ctrl["record_id"]
    enable_chapters = ctrl.get("enable_chapters", False)
    enable_timestamps = ctrl.get("enable_timestamps", False)
    preserve_audio = ctrl.get("preserve_audio", False)
    cancel_event = ctrl["cancel_event"]

    if cancel_event.is_set():
        _cleanup_cancelled_task(task_id, record_id, file_path, preserve_audio, None, None)
        return None

    uploaded_file = None
    client = None

    try:
        client = genai.Client(api_key=api_key)
        ctrl["client"] = client

        if cancel_event.is_set():
            _cleanup_cancelled_task(task_id, record_id, file_path, preserve_audio, None, client)
            return None

        update_task(task_id, "upload_google", 35, "Caricamento audio su Google AI Studio in corso...")
        uploaded_file = client.files.upload(file=file_path)
        ctrl["google_file_name"] = uploaded_file.name

        if cancel_event.is_set():
            _cleanup_cancelled_task(task_id, record_id, file_path, preserve_audio, uploaded_file.name, client)
            return None

        update_task(task_id, "processing_google", 55, "I server Google stanno elaborando il file audio...")
        file_info = client.files.get(name=uploaded_file.name)
        poll_count = 0
        while file_info.state.name == 'PROCESSING':
            if cancel_event.wait(timeout=2):
                _cleanup_cancelled_task(task_id, record_id, file_path, preserve_audio, uploaded_file.name, client)
                return None
            poll_count += 1
            prog = min(55 + poll_count * 2, 70)
            update_task(task_id, "processing_google", prog, "I server Google stanno elaborando il file audio...")
            file_info = client.files.get(name=uploaded_file.name)

        if file_info.state.name == 'FAILED':
            raise Exception("Google backend failed processing audio.")

        if cancel_event.is_set():
            _cleanup_cancelled_task(task_id, record_id, file_path, preserve_audio, uploaded_file.name, client)
            return None

        update_task(task_id, "gemini_generating", 75, "Trascrizione in corso con Gemini...")

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
        if enable_chapters and enable_timestamps:
            prompt += (
                " NOTA BENE PER I TITOLI DI CAPITOLO E I TIMESTAMP: quando introduci un capitolo, scrivi tassativamente '## Titolo del capitolo' sulla stessa riga (es. '## Introduzione e riepilogo'). "
                "Non lasciare mai i cancelletti '##' vuoti o isolati sulla riga. "
                "REGOLA TASSATIVA: nei titoli di capitolo '##' NON inserire MAI timestamp o minutaggi [MM:SS]. "
                "Il timestamp [MM:SS] deve comparire ESCLUSIVAMENTE all'inizio del paragrafo di testo sottostante, mai dentro o prima del titolo del capitolo (Esempio corretto:\n"
                "## Titolo del capitolo\n\n[00:00] Testo della lezione...)."
            )
        elif enable_chapters:
            prompt += " NOTA BENE PER I TITOLI DI CAPITOLO: quando introduci un capitolo, scrivi tassativamente '## Titolo del capitolo' sulla stessa riga. Non lasciare mai cancelletti '##' vuoti o isolati."

        max_retries = 3
        response = None
        for attempt in range(max_retries):
            if cancel_event.is_set():
                _cleanup_cancelled_task(task_id, record_id, file_path, preserve_audio, uploaded_file.name, client)
                return None
            reconnect_timer = None
            try:
                if attempt > 0:
                    update_task(
                        task_id,
                        "gemini_generating",
                        75,
                        f"Nuovo tentativo ({attempt + 1}/{max_retries}) in corso con Gemini..."
                    )
                    reconnect_timer = threading.Timer(
                        2.0,
                        update_task,
                        args=(task_id, "gemini_generating", 75, "Trascrizione in corso con Gemini...")
                    )
                    reconnect_timer.daemon = True
                    reconnect_timer.start()

                response = client.models.generate_content(
                    model="gemini-3-flash-preview",
                    contents=[uploaded_file, prompt],
                    config=types.GenerateContentConfig(
                        system_instruction=system_instruction,
                        temperature=0.2
                    )
                )
                break
            except Exception as gen_err:
                if cancel_event.is_set():
                    _cleanup_cancelled_task(task_id, record_id, file_path, preserve_audio, uploaded_file.name, client)
                    return None
                err_str = str(gen_err)
                if ('503' in err_str or 'high demand' in err_str.lower() or 'unavailable' in err_str.lower()) and attempt < max_retries - 1:
                    backoff = (2 ** attempt) * 2
                    for rem in range(backoff, 0, -1):
                        if cancel_event.wait(timeout=1):
                            _cleanup_cancelled_task(task_id, record_id, file_path, preserve_audio, uploaded_file.name, client)
                            return None
                        update_task(
                            task_id,
                            "gemini_generating",
                            75,
                            f"Server Google occupati, nuovo tentativo tra {rem}s..."
                        )
                else:
                    raise gen_err
            finally:
                if reconnect_timer:
                    reconnect_timer.cancel()

        if cancel_event.is_set():
            _cleanup_cancelled_task(task_id, record_id, file_path, preserve_audio, uploaded_file.name, client)
            return None

        raw_text = response.text
        cleaned_text = clean_transcription_markdown(raw_text)
        transcript_html = normalize_transcript_html(markdown.markdown(cleaned_text))

        if uploaded_file:
            try:
                client.files.delete(name=uploaded_file.name)
                ctrl["google_file_name"] = None
            except Exception:
                pass

        if cancel_event.is_set():
            _cleanup_cancelled_task(task_id, record_id, file_path, preserve_audio, None, client)
            return None

        with get_db_connection() as conn:
            c = conn.cursor()
            c.execute("UPDATE transcriptions SET transcript = ?, status = 'success', created_at = CURRENT_TIMESTAMP WHERE id = ?", (transcript_html, record_id))
            conn.commit()

        if not preserve_audio and os.path.exists(file_path):
            try:
                os.remove(file_path)
            except Exception:
                pass

        update_task(
            task_id,
            "completed",
            100,
            "Trascrizione completata con successo!",
            result={
                "id": record_id,
                "transcript": transcript_html,
                "status": "success",
                "audio_preserved": preserve_audio
            }
        )
        return transcript_html

    except Exception as e:
        if cancel_event.is_set():
            _cleanup_cancelled_task(task_id, record_id, file_path, preserve_audio, ctrl.get("google_file_name"), client)
            return None

        error_msg = str(e)
        is_network_err = any(kw in error_msg.lower() for kw in [
            'temporary failure in name resolution',
            'name or service not known',
            'nodename nor servname provided',
            'getaddrinfo failed',
            'failed to establish a new connection',
            'network is unreachable',
            'network unreachable',
            'connection refused',
            'errno -3',
            'errno -2',
            'errno 101',
            'connecterror',
            'connecttimeout',
            'networkerror',
            'socket.gaierror',
            'connection error',
            'connection reset',
            'max retries exceeded with url',
            'failed to resolve',
            'no address associated with hostname'
        ])
        if is_network_err:
            error_msg = "Connessione internet assente o non raggiungibile. Verifica la tua connessione Wi-Fi o di rete e riprova."
        elif any(kw in error_msg.lower() for kw in ['401', 'unauthenticated', 'api key not valid', 'api_key_invalid', 'permission_denied', 'consumer_invalid']):
            error_msg = "Codice di accesso non valido o scaduto. Per avviare la trascrizione è necessario configurare un codice personale funzionante nelle Impostazioni."
        elif '503' in error_msg or 'high demand' in error_msg.lower():
            error_msg = "I server di Google sono momentaneamente saturi (High Demand). Riprova tra qualche minuto."

        if ctrl.get("google_file_name") and client:
            try:
                client.files.delete(name=ctrl["google_file_name"])
                ctrl["google_file_name"] = None
            except Exception:
                pass

        with get_db_connection() as conn:
            c = conn.cursor()
            c.execute("DELETE FROM transcriptions WHERE id = ?", (record_id,))
            conn.commit()

        if os.path.exists(file_path):
            try:
                os.remove(file_path)
            except Exception:
                pass

        update_task(task_id, "error", 0, error_msg, error=error_msg)
        return None

def queue_worker_loop():
    global ACTIVE_TASK_ID
    while True:
        with queue_condition:
            while not TASK_QUEUE:
                ACTIVE_TASK_ID = None
                queue_condition.wait()
            next_task_id = TASK_QUEUE.pop(0)
            ACTIVE_TASK_ID = next_task_id

        with tasks_lock:
            task_info = TASKS.get(next_task_id)
            ctrl = TASK_CONTROLS.get(next_task_id)

        if not task_info or not ctrl:
            with queue_condition:
                if ACTIVE_TASK_ID == next_task_id:
                    ACTIVE_TASK_ID = None
            continue

        if ctrl["cancel_event"].is_set() or task_info.get("status") == "cancelled":
            with queue_condition:
                if ACTIVE_TASK_ID == next_task_id:
                    ACTIVE_TASK_ID = None
            continue

        try:
            with get_db_connection() as conn:
                c = conn.cursor()
                c.execute("UPDATE transcriptions SET status = 'processing' WHERE id = ?", (ctrl["record_id"],))
                conn.commit()
        except Exception:
            pass

        update_task(
            next_task_id,
            "upload_local",
            15,
            "File audio salvato in locale. Inizializzazione pipeline..."
        )

        try:
            process_transcription_core(next_task_id)
        except Exception:
            pass
        finally:
            with queue_condition:
                if ACTIVE_TASK_ID == next_task_id:
                    ACTIVE_TASK_ID = None

def ensure_worker_started():
    global worker_thread
    with worker_thread_lock:
        if worker_thread is None or not worker_thread.is_alive():
            worker_thread = threading.Thread(target=queue_worker_loop, daemon=True, name="RhesisTranscriptionWorker")
            worker_thread.start()

@router.get("/history")
def get_history(course_id: Optional[int] = None):
    with get_db_connection() as conn:
        c = conn.cursor()
        query = """
            SELECT t.id, t.filename, t.file_path, t.status, t.created_at, t.transcript, t.audio_preserved,
                   t.course_id,
                   COALESCE(c.name, t.course_name) as course_name,
                   COALESCE(c.professor_name, t.professor_name) as professor_name,
                   c.color as course_color
            FROM transcriptions t
            LEFT JOIN courses c ON t.course_id = c.id
            WHERE t.status = 'success'
        """
        params = []
        if course_id is not None and course_id > 0:
            query += " AND t.course_id = ?"
            params.append(course_id)
        query += " ORDER BY t.id DESC"
        c.execute(query, tuple(params))
        rows = c.fetchall()
    result = []
    for row in rows:
        item = dict(row)
        file_path = item.pop("file_path", None)
        item["audio_preserved"] = bool(item.get("audio_preserved", 0)) and bool(file_path and os.path.exists(file_path))
        result.append(item)
    return result

@router.get("/search")
def search_transcriptions(q: str = ""):
    fts_q = build_fts_query(q)
    if not fts_q:
        return []
    with get_db_connection() as conn:
        c = conn.cursor()
        try:
            c.execute("""
                SELECT t.id, t.filename, t.file_path, t.transcript, t.status, t.audio_preserved,
                       t.course_id,
                       COALESCE(c.name, t.course_name) as course_name,
                       COALESCE(c.professor_name, t.professor_name) as professor_name,
                       c.color as course_color,
                       t.created_at,
                       snippet(transcriptions_fts, 1, '<mark>', '</mark>', '...', 12) as content_snippet,
                       snippet(transcriptions_fts, 0, '<mark>', '</mark>', '...', 12) as title_snippet
                FROM transcriptions_fts f
                JOIN transcriptions t ON t.id = f.rowid
                LEFT JOIN courses c ON t.course_id = c.id
                WHERE transcriptions_fts MATCH ? AND t.status = 'success'
                ORDER BY rank
            """, (fts_q,))
            rows = c.fetchall()
        except Exception:
            pattern = f"%{q.strip()}%"
            c.execute("""
                SELECT t.id, t.filename, t.file_path, t.transcript, t.status, t.audio_preserved,
                       t.course_id,
                       COALESCE(c.name, t.course_name) as course_name,
                       COALESCE(c.professor_name, t.professor_name) as professor_name,
                       c.color as course_color,
                       t.created_at,
                       '' as content_snippet, '' as title_snippet
                FROM transcriptions t
                LEFT JOIN courses c ON t.course_id = c.id
                WHERE t.status = 'success' AND (t.filename LIKE ? OR t.transcript LIKE ?)
                ORDER BY t.id DESC
            """, (pattern, pattern))
            rows = c.fetchall()

    result = []
    for row in rows:
        item = dict(row)
        file_path = item.pop("file_path", None)
        item["audio_preserved"] = bool(item.get("audio_preserved", 0)) and bool(file_path and os.path.exists(file_path))
        c_snip = item.pop("content_snippet", "") or ""
        t_snip = item.pop("title_snippet", "") or ""
        if "<mark>" in c_snip:
            item["snippet"] = focus_snippet_around_mark(c_snip)
        elif "<mark>" in t_snip:
            item["snippet"] = focus_snippet_around_mark(t_snip)
        else:
            item["snippet"] = (c_snip.strip() or t_snip.strip())[:80]
        result.append(item)
    return result

@router.get("/queue")
def get_queue():
    cleanup_old_tasks()
    with queue_lock:
        active = None
        if ACTIVE_TASK_ID:
            with tasks_lock:
                active_t = TASKS.get(ACTIVE_TASK_ID)
                if active_t and active_t.get("status") not in ("completed", "cancelled", "error"):
                    active = dict(active_t)

        queue_items = []
        for tid in TASK_QUEUE:
            with tasks_lock:
                if tid in TASKS:
                    queue_items.append(dict(TASKS[tid]))

        return {
            "active_task": active,
            "queue": queue_items
        }

@router.post("/transcribe/")
@router.post("/transcribe", include_in_schema=False)
def transcribe(
    file: UploadFile = File(...),
    enable_chapters: bool = Form(False),
    enable_timestamps: bool = Form(False),
    preserve_audio: bool = Form(False),
    course_id: Optional[int] = Form(None),
    course_name: Optional[str] = Form(None),
    professor_name: Optional[str] = Form(None)
):
    cleanup_old_tasks()
    api_key = get_saved_api_key()
    if not api_key or len(api_key.strip()) < 10:
        raise HTTPException(status_code=401, detail="Codice di accesso non configurato o scaduto. Configuralo nelle Impostazioni.")
    ext = os.path.splitext(file.filename)[1].lower() if file.filename else ""
    allowed_exts = {'.mp3', '.m4a', '.wav', '.ogg', '.flac', '.aac', '.mp4', '.webm', '.mpeg', '.mpga', '.amr'}
    if ext not in allowed_exts:
        raise HTTPException(status_code=400, detail=f"Formato file non supportato ({ext}). Usa un formato audio valido (es. MP3, M4A, WAV).")
    safe_filename = f"{int(time.time())}_{uuid.uuid4().hex[:8]}{ext}"
    file_path = os.path.join(UPLOAD_DIR, safe_filename)
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    course_id_val = None
    course_color = None
    if course_id is not None and course_id > 0:
        course_id_val = course_id
        with get_db_connection() as conn:
            c = conn.cursor()
            c.execute("SELECT name, professor_name, color FROM courses WHERE id = ?", (course_id_val,))
            c_row = c.fetchone()
            if c_row:
                if not course_name:
                    course_name = c_row[0]
                if not professor_name and c_row[1]:
                    professor_name = c_row[1]
                course_color = c_row[2]

    with queue_lock:
        active_task_running = False
        if ACTIVE_TASK_ID:
            with tasks_lock:
                active_t = TASKS.get(ACTIVE_TASK_ID)
                if active_t and active_t.get("status") not in ("completed", "cancelled", "error"):
                    active_task_running = True
        is_busy = active_task_running or (len(TASK_QUEUE) > 0)
        initial_status = "queued" if is_busy else "upload_local"
        db_status = "queued" if is_busy else "processing"
        initial_progress = 5 if is_busy else 15
        initial_message = "In coda di attesa..." if is_busy else "File audio salvato in locale. Inizializzazione pipeline..."

        with get_db_connection() as conn:
            c = conn.cursor()
            c.execute(
                "INSERT INTO transcriptions (filename, file_path, status, audio_preserved, course_name, professor_name, course_id) VALUES (?, ?, ?, ?, ?, ?, ?)",
                (file.filename, file_path, db_status, 1 if preserve_audio else 0, course_name, professor_name, course_id_val)
            )
            record_id = c.lastrowid
            conn.commit()

        task_id = uuid.uuid4().hex
        with tasks_lock:
            TASKS[task_id] = {
                "task_id": task_id,
                "record_id": record_id,
                "filename": file.filename,
                "course_id": course_id_val,
                "course_name": course_name,
                "professor_name": professor_name,
                "course_color": course_color,
                "status": initial_status,
                "progress": initial_progress,
                "message": initial_message,
                "result": None,
                "error": None,
                "created_at": time.time(),
                "updated_at": time.time()
            }
            TASK_CONTROLS[task_id] = {
                "task_id": task_id,
                "record_id": record_id,
                "file_path": file_path,
                "api_key": api_key,
                "enable_chapters": enable_chapters,
                "enable_timestamps": enable_timestamps,
                "preserve_audio": preserve_audio,
                "cancel_event": threading.Event(),
                "google_file_name": None,
                "client": None
            }
            TASK_QUEUE.append(task_id)
            queue_condition.notify()

    ensure_worker_started()

    return {
        "task_id": task_id,
        "id": record_id,
        "record_id": record_id,
        "status": initial_status
    }

@router.get("/task/{task_id}")
def get_task_status(task_id: str):
    with tasks_lock:
        task = TASKS.get(task_id)
        if not task:
            raise HTTPException(status_code=404, detail="Task non trovato")
        return dict(task)

@router.post("/task/{task_id}/cancel")
def cancel_task(task_id: str):
    with queue_lock:
        with tasks_lock:
            task = TASKS.get(task_id)
            if not task:
                raise HTTPException(status_code=404, detail="Task non trovato")

            current_status = task.get("status")
            if current_status in ("completed", "cancelled", "error"):
                return {
                    "task_id": task_id,
                    "status": current_status,
                    "message": f"Il task è già nello stato '{current_status}'."
                }

            ctrl = TASK_CONTROLS.get(task_id, {})
            cancel_event = ctrl.get("cancel_event")
            if cancel_event:
                cancel_event.set()

            is_queued = task_id in TASK_QUEUE
            if is_queued:
                TASK_QUEUE.remove(task_id)

            record_id = task.get("record_id")
            file_path = ctrl.get("file_path")
            preserve_audio = ctrl.get("preserve_audio", False) if not is_queued else False
            google_file_name = ctrl.get("google_file_name") if not is_queued else None
            client = ctrl.get("client") if not is_queued else None
            api_key = ctrl.get("api_key") if not is_queued else None
            if not is_queued:
                ctrl["google_file_name"] = None

    if not is_queued and not client and api_key:
        try:
            client = genai.Client(api_key=api_key)
        except Exception:
            client = None

    _cleanup_cancelled_task(
        task_id=task_id,
        record_id=record_id,
        file_path=file_path,
        preserve_audio=preserve_audio,
        google_file_name=google_file_name,
        client=client
    )

    msg = "Trascrizione rimossa dalla coda e annullata con successo." if is_queued else "Trascrizione annullata con successo."
    return {
        "task_id": task_id,
        "status": "cancelled",
        "message": msg
    }

@router.get("/audio/{record_id}")
@router.head("/audio/{record_id}", include_in_schema=False)
def stream_audio(record_id: int):
    with get_db_connection() as conn:
        c = conn.cursor()
        c.execute("SELECT file_path, audio_preserved, filename FROM transcriptions WHERE id = ?", (record_id,))
        row = c.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Trascrizione non trovata")
    file_path, audio_preserved, orig_filename = row[0], bool(row[1]), row[2]
    if not audio_preserved or not file_path or not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File audio non disponibile o non conservato per questa trascrizione")
    
    media_type, _ = mimetypes.guess_type(file_path)
    if not media_type or not media_type.startswith("audio/"):
        ext = os.path.splitext(file_path)[1].lower()
        audio_mimes = {
            ".mp3": "audio/mpeg",
            ".m4a": "audio/mp4",
            ".wav": "audio/wav",
            ".ogg": "audio/ogg",
            ".flac": "audio/flac",
            ".aac": "audio/aac",
            ".webm": "audio/webm",
            ".mp4": "audio/mp4",
            ".mpeg": "audio/mpeg",
            ".mpga": "audio/mpeg",
            ".amr": "audio/amr",
        }
        media_type = audio_mimes.get(ext, "audio/mpeg")
    
    return FileResponse(
        file_path,
        media_type=media_type.lower() if media_type else "audio/mpeg",
        filename=orig_filename,
        content_disposition_type="inline",
        headers={"Accept-Ranges": "bytes"}
    )

@router.put("/transcript/{record_id}")
def update_transcript(record_id: int, req: UpdateTranscriptRequest):
    with get_db_connection() as conn:
        c = conn.cursor()
        updates = []
        params = []
        if req.transcript is not None:
            updates.append("transcript = ?")
            params.append(normalize_transcript_html(req.transcript))
        if req.filename is not None:
            updates.append("filename = ?")
            params.append(req.filename)
        if req.course_id is not None:
            if req.course_id > 0:
                updates.append("course_id = ?")
                params.append(req.course_id)
                c.execute("SELECT name, professor_name FROM courses WHERE id = ?", (req.course_id,))
                c_row = c.fetchone()
                if c_row:
                    updates.append("course_name = ?")
                    params.append(c_row[0])
                    if c_row[1] and req.professor_name is None:
                        updates.append("professor_name = ?")
                        params.append(c_row[1])
            else:
                updates.append("course_id = NULL")
                updates.append("course_name = NULL")
                updates.append("professor_name = NULL")
        if req.course_name is not None and (req.course_id is None or req.course_id > 0):
            updates.append("course_name = ?")
            params.append(req.course_name)
        if req.professor_name is not None and (req.course_id is None or req.course_id > 0):
            updates.append("professor_name = ?")
            params.append(req.professor_name)
        if updates:
            params.append(record_id)
            c.execute(f"UPDATE transcriptions SET {', '.join(updates)} WHERE id = ?", tuple(params))
            conn.commit()
    return {"message": "Success"}

@router.delete("/transcript/{record_id}")
def delete_transcript(record_id: int):
    with get_db_connection() as conn:
        c = conn.cursor()
        c.execute("SELECT file_path FROM transcriptions WHERE id = ?", (record_id,))
        row = c.fetchone()
        if row and row[0] and os.path.exists(row[0]):
            try:
                os.remove(row[0])
            except OSError:
                pass
        c.execute("DELETE FROM transcriptions WHERE id = ?", (record_id,))
        conn.commit()
    return {"message": "Success"}

sanitize_stale_records()
ensure_worker_started()

