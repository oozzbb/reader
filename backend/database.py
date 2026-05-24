import aiosqlite

from backend.config import settings

_db: aiosqlite.Connection | None = None

SCHEMA = """
CREATE TABLE IF NOT EXISTS book_sources (
    book_source_url TEXT PRIMARY KEY,
    book_source_name TEXT NOT NULL,
    book_source_group TEXT DEFAULT '',
    book_source_type INTEGER DEFAULT 0,
    enabled INTEGER DEFAULT 1,
    source_json TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS books (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    author TEXT DEFAULT '',
    cover_url TEXT DEFAULT '',
    intro TEXT DEFAULT '',
    book_url TEXT NOT NULL,
    source_url TEXT NOT NULL,
    last_chapter TEXT DEFAULT '',
    total_chapters INTEGER DEFAULT 0,
    added_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    UNIQUE(book_url, source_url)
);

CREATE TABLE IF NOT EXISTS chapters (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    book_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    url TEXT NOT NULL,
    idx INTEGER NOT NULL,
    cached INTEGER DEFAULT 0,
    FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_chapters_book ON chapters(book_id, idx);

CREATE TABLE IF NOT EXISTS reading_progress (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    book_id INTEGER NOT NULL UNIQUE,
    chapter_idx INTEGER DEFAULT 0,
    scroll_position REAL DEFAULT 0,
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS user_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);
"""


async def get_db() -> aiosqlite.Connection:
    global _db
    if _db is None:
        settings.database_path.parent.mkdir(parents=True, exist_ok=True)
        _db = await aiosqlite.connect(str(settings.database_path))
        _db.row_factory = aiosqlite.Row
        await _db.execute("PRAGMA journal_mode=WAL")
        await _db.execute("PRAGMA foreign_keys=ON")
        await _db.executescript(SCHEMA)
        await _db.commit()
    return _db


async def close_db():
    global _db
    if _db:
        await _db.close()
        _db = None
