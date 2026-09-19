import os
import re
import sqlite3
from contextlib import contextmanager
from typing import Optional

CONFIG_DIR = os.path.expanduser("~/.config/rhesis")
DB_FILE = os.path.join(CONFIG_DIR, "database.db")
os.makedirs(CONFIG_DIR, exist_ok=True)

def strip_html_for_fts(html_text: Optional[str]) -> str:
    if not html_text:
        return ""
    text = re.sub(r"<(?:p|h\d|div|br|li|tr|blockquote)[^>]*>", " ", html_text, flags=re.IGNORECASE)
    text = re.sub(r"<[^>]+>", "", text)
    return re.sub(r"\s+", " ", text).strip()

@contextmanager
def get_db_connection():
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON;")
    conn.create_function("strip_html_for_fts", 1, strip_html_for_fts)
    try:
        yield conn
    finally:
        conn.close()

def init_db():
    with get_db_connection() as conn:
        c = conn.cursor()
        c.execute("""
            CREATE TABLE IF NOT EXISTS courses (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL UNIQUE,
                color TEXT NOT NULL DEFAULT '#2563eb',
                professor_name TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        """)
        c.execute("""
            CREATE TABLE IF NOT EXISTS transcriptions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                filename TEXT NOT NULL,
                file_path TEXT NOT NULL,
                transcript TEXT,
                status TEXT NOT NULL,
                audio_preserved BOOLEAN DEFAULT 0,
                course_id INTEGER REFERENCES courses(id) ON DELETE SET NULL,
                course_name TEXT,
                professor_name TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        """)
        c.execute("PRAGMA table_info(transcriptions)")
        columns = [row[1] for row in c.fetchall()]
        if "audio_preserved" not in columns:
            c.execute("ALTER TABLE transcriptions ADD COLUMN audio_preserved BOOLEAN DEFAULT 0")
        if "course_id" not in columns:
            c.execute("ALTER TABLE transcriptions ADD COLUMN course_id INTEGER REFERENCES courses(id) ON DELETE SET NULL")
        if "course_name" not in columns:
            c.execute("ALTER TABLE transcriptions ADD COLUMN course_name TEXT")
        if "professor_name" not in columns:
            c.execute("ALTER TABLE transcriptions ADD COLUMN professor_name TEXT")

        c.execute("""
            CREATE VIRTUAL TABLE IF NOT EXISTS transcriptions_fts USING fts5(
                filename,
                content
            )
        """)

        c.execute("""
            CREATE TRIGGER IF NOT EXISTS transcriptions_ai AFTER INSERT ON transcriptions BEGIN
                INSERT INTO transcriptions_fts(rowid, filename, content)
                VALUES (new.id, new.filename, strip_html_for_fts(new.transcript));
            END;
        """)

        c.execute("""
            CREATE TRIGGER IF NOT EXISTS transcriptions_ad AFTER DELETE ON transcriptions BEGIN
                DELETE FROM transcriptions_fts WHERE rowid = old.id;
            END;
        """)

        c.execute("""
            CREATE TRIGGER IF NOT EXISTS transcriptions_au AFTER UPDATE ON transcriptions BEGIN
                DELETE FROM transcriptions_fts WHERE rowid = old.id;
                INSERT INTO transcriptions_fts(rowid, filename, content)
                VALUES (new.id, new.filename, strip_html_for_fts(new.transcript));
            END;
        """)

        c.execute("SELECT COUNT(*) FROM transcriptions_fts")
        fts_count = c.fetchone()[0]
        if fts_count == 0:
            c.execute("SELECT id, filename, transcript FROM transcriptions WHERE status = 'success'")
            for row in c.fetchall():
                rid, fn, tr = row[0], row[1], row[2]
                clean_text = strip_html_for_fts(tr)
                c.execute("INSERT INTO transcriptions_fts(rowid, filename, content) VALUES (?, ?, ?)", (rid, fn, clean_text))

        conn.commit()
if __name__ == "__main__":
    init_db()
