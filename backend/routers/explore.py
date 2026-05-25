"""Explore/ranking endpoint — fetches popular books by category."""

import httpx
from bs4 import BeautifulSoup
from fastapi import APIRouter, Query
from pydantic import BaseModel

router = APIRouter(prefix="/api/explore", tags=["explore"])

CATEGORIES = {
    "xuanhuan": "玄幻",
    "dushi": "都市",
    "xianxia": "仙侠",
    "yanqing": "言情",
    "kehuan": "科幻",
    "lishi": "历史",
    "wuxia": "武侠",
    "xiuzhen": "修真",
    "chuanyue": "穿越",
}

SOURCE_URL = "http://www.shukuge.com"


class RankItem(BaseModel):
    name: str
    book_url: str
    source_url: str


@router.get("/ranking", response_model=list[RankItem])
async def get_ranking(category: str = Query(default="xuanhuan")):
    if category not in CATEGORIES:
        category = "xuanhuan"

    url = f"{SOURCE_URL}/top/{category}/"
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.get(
                url, headers={"User-Agent": "Mozilla/5.0", "Referer": f"{SOURCE_URL}/"}
            )
            resp.raise_for_status()
    except Exception:
        return []

    soup = BeautifulSoup(resp.text, "lxml")
    results = []
    seen = set()
    for a in soup.find_all("a"):
        href = a.get("href", "")
        text = a.get_text().strip()
        if (
            text
            and "/book/" in href
            and "/index.html" not in href
            and href not in seen
            and len(text) < 30
        ):
            seen.add(href)
            full_url = f"{SOURCE_URL}{href}" if href.startswith("/") else href
            results.append(RankItem(name=text, book_url=full_url, source_url=SOURCE_URL))
            if len(results) >= 15:
                break

    return results
