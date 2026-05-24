from fastapi import APIRouter, HTTPException

from backend.database import get_db
from backend.models.book import BookSchema

router = APIRouter(prefix="/api/books", tags=["books"])


@router.get("", response_model=list[BookSchema])
async def list_books():
    db = await get_db()
    cursor = await db.execute("SELECT * FROM books ORDER BY updated_at DESC")
    rows = await cursor.fetchall()
    return [
        BookSchema(
            id=row["id"],
            name=row["name"],
            author=row["author"],
            cover_url=row["cover_url"] or "",
            intro=row["intro"] or "",
            book_url=row["book_url"],
            source_url=row["source_url"],
            last_chapter=row["last_chapter"] or "",
            total_chapters=row["total_chapters"],
            added_at=row["added_at"] or "",
            updated_at=row["updated_at"] or "",
        )
        for row in rows
    ]


@router.post("")
async def add_book(book: BookSchema):
    db = await get_db()
    await db.execute(
        """INSERT OR REPLACE INTO books
        (name, author, cover_url, intro, book_url, source_url, last_chapter, total_chapters, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))""",
        (
            book.name,
            book.author,
            book.cover_url,
            book.intro,
            book.book_url,
            book.source_url,
            book.last_chapter,
            book.total_chapters,
        ),
    )
    await db.commit()
    return {"message": "added"}


@router.delete("/{book_id}")
async def delete_book(book_id: int):
    db = await get_db()
    cursor = await db.execute("DELETE FROM books WHERE id = ?", (book_id,))
    await db.commit()
    if cursor.rowcount == 0:
        raise HTTPException(status_code=404, detail="Book not found")
    return {"message": "deleted"}
