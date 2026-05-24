from fastapi import APIRouter, Query, HTTPException

from backend.services.content import get_book_info, get_chapters, get_chapter_content
from backend.models.book import BookSchema, ChapterSchema

router = APIRouter(prefix="/api/content", tags=["content"])


@router.get("/book-info", response_model=BookSchema)
async def book_info(
    book_url: str = Query(...),
    source_url: str = Query(...),
):
    info = await get_book_info(book_url, source_url)
    if not info:
        raise HTTPException(status_code=404, detail="Book not found")
    return info


@router.get("/chapters", response_model=list[ChapterSchema])
async def chapters(
    book_url: str = Query(...),
    source_url: str = Query(...),
):
    result = await get_chapters(book_url, source_url)
    return result


@router.get("/chapter")
async def chapter_content(
    url: str = Query(...),
    source_url: str = Query(...),
):
    content = await get_chapter_content(url, source_url)
    if not content:
        raise HTTPException(status_code=404, detail="Content not found")
    return {"content": content}
