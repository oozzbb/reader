import re

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

    images = _extract_images(content)
    if images:
        return {"type": "manga", "images": images, "content": ""}
    return {"type": "novel", "content": content, "images": []}


def _extract_images(content: str) -> list[str]:
    """Extract image URLs from content if it looks like manga."""
    # Check if content has multiple img tags
    img_pattern = re.compile(r'<img[^>]+src=["\']([^"\']+)["\']', re.IGNORECASE)
    matches = img_pattern.findall(content)
    if len(matches) >= 3:
        return matches

    # Check for data-src or data-original patterns
    data_src_pattern = re.compile(r'(?:data-src|data-original)=["\']([^"\']+)["\']', re.IGNORECASE)
    data_matches = data_src_pattern.findall(content)
    if len(data_matches) >= 3:
        return data_matches

    # Check if content is newline-separated URLs (all starting with http)
    lines = [l.strip() for l in content.split("\n") if l.strip()]
    if len(lines) >= 3 and all(l.startswith("http") for l in lines[:5]):
        url_lines = [l for l in lines if l.startswith("http")]
        if len(url_lines) >= 3:
            return url_lines

    return []
