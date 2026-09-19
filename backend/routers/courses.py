from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional

try:
    from backend.database import get_db_connection
except ImportError:
    from database import get_db_connection

router = APIRouter(prefix="/courses", tags=["courses"])

class CourseCreateRequest(BaseModel):
    name: str
    color: Optional[str] = "#2563eb"
    professor_name: Optional[str] = None

class CourseUpdateRequest(BaseModel):
    name: Optional[str] = None
    color: Optional[str] = None
    professor_name: Optional[str] = None

@router.get("")
@router.get("/", include_in_schema=False)
def get_courses():
    with get_db_connection() as conn:
        c = conn.cursor()
        c.execute("""
            SELECT c.id, c.name, c.color, c.professor_name, c.created_at,
                   COUNT(t.id) as transcriptions_count
            FROM courses c
            LEFT JOIN transcriptions t ON t.course_id = c.id AND t.status = 'success'
            GROUP BY c.id
            ORDER BY c.name COLLATE NOCASE ASC
        """)
        rows = c.fetchall()
        return [dict(r) for r in rows]

@router.post("")
@router.post("/", include_in_schema=False)
def create_course(req: CourseCreateRequest):
    name = req.name.strip() if req.name else ""
    if not name:
        raise HTTPException(status_code=400, detail="Il nome del corso è obbligatorio.")
    color = req.color.strip() if req.color else "#2563eb"
    prof = req.professor_name.strip() if req.professor_name else None
    if prof == "":
        prof = None
    with get_db_connection() as conn:
        c = conn.cursor()
        c.execute("SELECT id FROM courses WHERE LOWER(name) = LOWER(?)", (name,))
        if c.fetchone():
            raise HTTPException(status_code=400, detail="Un corso con questo nome esiste già.")
        c.execute(
            "INSERT INTO courses (name, color, professor_name) VALUES (?, ?, ?)",
            (name, color, prof)
        )
        course_id = c.lastrowid
        conn.commit()
        return {
            "id": course_id,
            "name": name,
            "color": color,
            "professor_name": prof,
            "transcriptions_count": 0
        }

@router.put("/{course_id}")
def update_course(course_id: int, req: CourseUpdateRequest):
    with get_db_connection() as conn:
        c = conn.cursor()
        c.execute("SELECT id, name, color, professor_name FROM courses WHERE id = ?", (course_id,))
        course = c.fetchone()
        if not course:
            raise HTTPException(status_code=404, detail="Corso non trovato.")

        new_name = req.name.strip() if req.name is not None else course["name"]
        if not new_name:
            raise HTTPException(status_code=400, detail="Il nome del corso non può essere vuoto.")

        if new_name.lower() != course["name"].lower():
            c.execute("SELECT id FROM courses WHERE LOWER(name) = LOWER(?) AND id != ?", (new_name, course_id))
            if c.fetchone():
                raise HTTPException(status_code=400, detail="Un altro corso con questo nome esiste già.")

        new_color = req.color.strip() if req.color is not None else course["color"]
        new_prof = req.professor_name.strip() if req.professor_name is not None else course["professor_name"]
        if new_prof == "":
            new_prof = None

        c.execute(
            "UPDATE courses SET name = ?, color = ?, professor_name = ? WHERE id = ?",
            (new_name, new_color, new_prof, course_id)
        )
        c.execute("UPDATE transcriptions SET course_name = ? WHERE course_id = ?", (new_name, course_id))
        conn.commit()

        c.execute("""
            SELECT c.id, c.name, c.color, c.professor_name, c.created_at,
                   COUNT(t.id) as transcriptions_count
            FROM courses c
            LEFT JOIN transcriptions t ON t.course_id = c.id AND t.status = 'success'
            WHERE c.id = ?
            GROUP BY c.id
        """, (course_id,))
        updated = c.fetchone()
        return dict(updated)

@router.delete("/{course_id}")
def delete_course(course_id: int):
    with get_db_connection() as conn:
        c = conn.cursor()
        c.execute("UPDATE transcriptions SET course_id = NULL WHERE course_id = ?", (course_id,))
        c.execute("DELETE FROM courses WHERE id = ?", (course_id,))
        conn.commit()
        return {"message": "Corso eliminato con successo"}
