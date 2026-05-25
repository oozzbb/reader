from fastapi import APIRouter
from pydantic import BaseModel

from backend.database import get_db

router = APIRouter(prefix="/api/progress", tags=["progress"])


class ProgressData(BaseModel):
    book_url: str
    source_url: str
    book_name: str = ""
    chapter_idx: int = 0
    chapter_title: str = ""
    chapter_url: str = ""


class ProgressResponse(ProgressData):
    updated_at: str = ""


@router.post("")
async def save_progress(data: ProgressData):
    db = await get_db()
    await db.execute(
        """INSERT OR REPLACE INTO reading_progress
        (book_url, source_url, book_name, chapter_idx, chapter_title, chapter_url, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, datetime('now'))""",
        (data.book_url, data.source_url, data.book_name,
         data.chapter_idx, data.chapter_title, data.chapter_url),
    )
    await db.commit()
    return {"message": "saved"}


@router.get("", response_model=list[ProgressResponse])
async def get_all_progress():
    db = await get_db()
    cursor = await db.execute(
        "SELECT * FROM reading_progress ORDER BY updated_at DESC LIMIT 20"
    )
    rows = await cursor.fetchall()
    return [
        ProgressResponse(
            book_url=row["book_url"],
            source_url=row["source_url"],
            book_name=row["book_name"],
            chapter_idx=row["chapter_idx"],
            chapter_title=row["chapter_title"],
            chapter_url=row["chapter_url"],
            updated_at=row["updated_at"] or "",
        )
        for row in rows
    ]


@router.get("/{book_url:path}")
async def get_progress(book_url: str):
    db = await get_db()
    cursor = await db.execute(
        "SELECT * FROM reading_progress WHERE book_url = ?", (book_url,)
    )
    row = await cursor.fetchone()
    if not row:
        return None
    return ProgressResponse(
        book_url=row["book_url"],
        source_url=row["source_url"],
        book_name=row["book_name"],
        chapter_idx=row["chapter_idx"],
        chapter_title=row["chapter_title"],
        chapter_url=row["chapter_url"],
        updated_at=row["updated_at"] or "",
    )
