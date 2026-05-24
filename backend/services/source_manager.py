"""Book source management — import, list, toggle, delete."""

import json

import aiosqlite

from backend.database import get_db
from backend.models.source import BookSourceSchema, BookSourceInDB


async def import_sources(sources_json: list[dict]) -> int:
    db = await get_db()
    count = 0
    for raw in sources_json:
        try:
            source = BookSourceSchema.model_validate(raw)
        except Exception:
            continue

        await db.execute(
            """INSERT OR REPLACE INTO book_sources
            (book_source_url, book_source_name, book_source_group,
             book_source_type, enabled, source_json, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, datetime('now'))""",
            (
                source.bookSourceUrl,
                source.bookSourceName,
                source.bookSourceGroup,
                source.bookSourceType,
                1 if source.enabled else 0,
                json.dumps(raw, ensure_ascii=False),
            ),
        )
        count += 1

    await db.commit()
    return count


async def list_sources(
    group: str | None = None,
    enabled_only: bool = False,
) -> list[BookSourceInDB]:
    db = await get_db()

    query = "SELECT * FROM book_sources WHERE 1=1"
    params: list = []

    if group:
        query += " AND book_source_group = ?"
        params.append(group)
    if enabled_only:
        query += " AND enabled = 1"

    query += " ORDER BY book_source_name"

    cursor = await db.execute(query, params)
    rows = await cursor.fetchall()
    return [
        BookSourceInDB(
            book_source_url=row["book_source_url"],
            book_source_name=row["book_source_name"],
            book_source_group=row["book_source_group"],
            book_source_type=row["book_source_type"],
            enabled=bool(row["enabled"]),
            source_json=row["source_json"],
            created_at=row["created_at"] or "",
            updated_at=row["updated_at"] or "",
        )
        for row in rows
    ]


async def get_source(source_url: str) -> BookSourceSchema | None:
    db = await get_db()
    cursor = await db.execute(
        "SELECT source_json FROM book_sources WHERE book_source_url = ?",
        (source_url,),
    )
    row = await cursor.fetchone()
    if not row:
        return None
    return BookSourceSchema.model_validate(json.loads(row["source_json"]))


async def toggle_source(source_url: str) -> bool:
    db = await get_db()
    await db.execute(
        "UPDATE book_sources SET enabled = 1 - enabled, updated_at = datetime('now') WHERE book_source_url = ?",
        (source_url,),
    )
    await db.commit()
    cursor = await db.execute(
        "SELECT enabled FROM book_sources WHERE book_source_url = ?",
        (source_url,),
    )
    row = await cursor.fetchone()
    return bool(row["enabled"]) if row else False


async def delete_source(source_url: str) -> bool:
    db = await get_db()
    cursor = await db.execute(
        "DELETE FROM book_sources WHERE book_source_url = ?",
        (source_url,),
    )
    await db.commit()
    return cursor.rowcount > 0


async def get_source_groups() -> list[str]:
    db = await get_db()
    cursor = await db.execute(
        "SELECT DISTINCT book_source_group FROM book_sources WHERE book_source_group != '' ORDER BY book_source_group"
    )
    rows = await cursor.fetchall()
    return [row["book_source_group"] for row in rows]
