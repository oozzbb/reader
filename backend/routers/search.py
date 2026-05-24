from fastapi import APIRouter, Query

from backend.models.book import SearchResultItem
from backend.services.search import search_books

router = APIRouter(prefix="/api/search", tags=["search"])


@router.get("", response_model=list[SearchResultItem])
async def search(
    keyword: str = Query(..., min_length=1),
    sources: str | None = Query(None, description="Comma-separated source URLs"),
):
    source_urls = sources.split(",") if sources else None
    results = await search_books(keyword, source_urls=source_urls)
    return results
