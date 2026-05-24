from pydantic import BaseModel


class BookSchema(BaseModel):
    id: int | None = None
    name: str
    author: str = ""
    cover_url: str = ""
    intro: str = ""
    book_url: str
    source_url: str
    last_chapter: str = ""
    total_chapters: int = 0
    added_at: str = ""
    updated_at: str = ""


class ChapterSchema(BaseModel):
    id: int | None = None
    book_id: int
    title: str
    url: str
    idx: int
    cached: bool = False


class SearchResultItem(BaseModel):
    name: str
    author: str = ""
    cover_url: str = ""
    intro: str = ""
    book_url: str
    source_url: str
    source_name: str = ""
    last_chapter: str = ""
    kind: str = ""
