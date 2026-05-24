import asyncio
import json

from fastapi import APIRouter, Query
from fastapi.responses import StreamingResponse

from backend.models.book import SearchResultItem
from backend.services.search import search_books_stream

router = APIRouter(prefix="/api/search", tags=["search"])


@router.get("")
async def search(
    keyword: str = Query(..., min_length=1),
    sources: str | None = Query(None, description="Comma-separated source URLs"),
):
    source_urls = sources.split(",") if sources else None

    async def event_stream():
        async for batch in search_books_stream(keyword, source_urls=source_urls):
            data = json.dumps([item.model_dump() for item in batch], ensure_ascii=False)
            yield f"data: {data}\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")
