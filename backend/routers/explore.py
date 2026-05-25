"""Explore/ranking endpoint — fetches popular books from sources."""

import httpx
from bs4 import BeautifulSoup
from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter(prefix="/api/explore", tags=["explore"])


class RankItem(BaseModel):
    name: str
    book_url: str
    source_url: str


@router.get("/ranking", response_model=list[RankItem])
async def get_ranking():
    source_url = "http://www.shukuge.com"
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.get(
                f"{source_url}/top/",
                headers={"User-Agent": "Mozilla/5.0", "Referer": f"{source_url}/"},
            )
            resp.raise_for_status()
    except Exception:
        return []

    soup = BeautifulSoup(resp.text, "lxml")
    items = soup.find_all("a")
    results = []
    seen = set()
    for a in items:
        href = a.get("href", "")
        text = a.get_text().strip()
        if text and "/book/" in href and "/index.html" not in href and href not in seen:
            seen.add(href)
            full_url = f"{source_url}{href}" if href.startswith("/") else href
            results.append(RankItem(name=text, book_url=full_url, source_url=source_url))
            if len(results) >= 20:
                break

    return results
