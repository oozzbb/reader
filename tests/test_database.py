import aiosqlite
import pytest

from backend.database import _migrate_db


@pytest.mark.asyncio
async def test_migrate_db_adds_source_format_to_existing_book_sources_table():
    db = await aiosqlite.connect(":memory:")
    db.row_factory = aiosqlite.Row
    await db.execute(
        """
        CREATE TABLE book_sources (
            book_source_url TEXT PRIMARY KEY,
            book_source_name TEXT NOT NULL,
            source_json TEXT NOT NULL
        )
        """
    )

    await _migrate_db(db)

    cursor = await db.execute("PRAGMA table_info(book_sources)")
    columns = {row["name"] for row in await cursor.fetchall()}
    await db.close()

    assert "source_format" in columns
