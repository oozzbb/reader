import json
import re

import httpx
from bs4 import BeautifulSoup
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from backend.services import source_manager

router = APIRouter(prefix="/api/sources", tags=["sources"])


class ImportResponse(BaseModel):
    count: int


class ToggleResponse(BaseModel):
    enabled: bool


class SourceItem(BaseModel):
    book_source_url: str
    book_source_name: str
    book_source_group: str
    book_source_type: int
    enabled: bool


class ImportUrlRequest(BaseModel):
    url: str


@router.post("/import", response_model=ImportResponse)
async def import_sources(sources: list[dict]):
    count = await source_manager.import_sources(sources)
    return ImportResponse(count=count)


@router.post("/import-url", response_model=ImportResponse)
async def import_sources_from_url(req: ImportUrlRequest):
    try:
        async with httpx.AsyncClient(timeout=30, follow_redirects=True) as client:
            resp = await client.get(req.url)
            resp.raise_for_status()
            data = resp.json()
    except httpx.HTTPError as e:
        raise HTTPException(status_code=400, detail=f"Failed to fetch URL: {e}")
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="URL did not return valid JSON")

    sources = data if isinstance(data, list) else [data]
    count = await source_manager.import_sources(sources)
    return ImportResponse(count=count)


@router.post("/import-yckceo", response_model=ImportResponse)
async def import_from_yckceo(count: int = Query(default=10, le=30)):
    """Fetch top N sources from yckceo.com via CF proxy."""
    try:
        async with httpx.AsyncClient(timeout=25, follow_redirects=True) as client:
            proxy_url = f"{CF_PROXY}?url=https://www.yckceo.com/yuedu/shuyuan/index.html"
            resp = await client.get(proxy_url)
            resp.raise_for_status()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to fetch yckceo list: {e}")

    soup = BeautifulSoup(resp.text, "lxml")
    links = soup.select("a[href*='/yuedu/shuyuan/content/id/']")
    ids = []
    for a in links[:count]:
        m = re.search(r"/id/(\d+)", a.get("href", ""))
        if m:
            ids.append(m.group(1))

    if not ids:
        raise HTTPException(status_code=400, detail="No sources found on page")

    all_sources = []
    async with httpx.AsyncClient(timeout=15, follow_redirects=True) as client:
        for sid in ids:
            try:
                r = await client.get(f"{CF_PROXY}?url=https://www.yckceo.com/yuedu/shuyuan/json/id/{sid}.json")
                if r.status_code == 200:
                    data = r.json()
                    if isinstance(data, list):
                        all_sources.extend(data)
                    else:
                        all_sources.append(data)
            except Exception:
                continue

    if not all_sources:
        raise HTTPException(status_code=400, detail="Failed to fetch any source JSON")

    imported = await source_manager.import_sources(all_sources)
    return ImportResponse(count=imported)


CF_PROXY = "https://tv.rio.edu.kg/reader-proxy"


@router.post("/import-manga", response_model=ImportResponse)
async def import_manga_sources(count: int = Query(default=10, le=30)):
    """Fetch manga sources from yckceo legadotauri via CF proxy."""
    try:
        async with httpx.AsyncClient(timeout=25, follow_redirects=True) as client:
            proxy_url = f"{CF_PROXY}?url=https://www.yckceo.com/legadotauri/shuyuan/index.html"
            resp = await client.get(proxy_url)
            resp.raise_for_status()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to fetch manga list: {e}")

    soup = BeautifulSoup(resp.text, "lxml")
    links = soup.select("a[href*='/legadotauri/shuyuan/content/id/']")
    ids = []
    for a in links[:count]:
        m = re.search(r"/id/(\d+)", a.get("href", ""))
        if m:
            ids.append(m.group(1))

    if not ids:
        raise HTTPException(status_code=400, detail="No manga sources found")

    imported_count = 0
    async with httpx.AsyncClient(timeout=15, follow_redirects=True) as client:
        for sid in ids:
            try:
                r = await client.get(f"{CF_PROXY}?url=https://www.yckceo.com/legadotauri/shuyuan/json/id/{sid}.json")
                if r.status_code == 200:
                    text = r.text
                    if text.strip().startswith("//") or "function search" in text:
                        ok = await source_manager.import_tauri_source(text)
                        if ok:
                            imported_count += 1
                    else:
                        try:
                            data = r.json()
                            sources = data if isinstance(data, list) else [data]
                            imported_count += await source_manager.import_sources(sources)
                        except Exception:
                            pass
            except Exception:
                continue

    if imported_count == 0:
        raise HTTPException(status_code=400, detail="Failed to fetch any manga source")

    return ImportResponse(count=imported_count)


@router.get("", response_model=list[SourceItem])
async def get_sources(group: str | None = None, enabled_only: bool = False):
    sources = await source_manager.list_sources(group=group, enabled_only=enabled_only)
    return [
        SourceItem(
            book_source_url=s.book_source_url,
            book_source_name=s.book_source_name,
            book_source_group=s.book_source_group,
            book_source_type=s.book_source_type,
            enabled=s.enabled,
        )
        for s in sources
    ]


@router.get("/groups", response_model=list[str])
async def get_groups():
    return await source_manager.get_source_groups()


@router.put("/{source_url:path}/toggle", response_model=ToggleResponse)
async def toggle_source(source_url: str):
    enabled = await source_manager.toggle_source(source_url)
    return ToggleResponse(enabled=enabled)


@router.delete("/{source_url:path}")
async def delete_source(source_url: str):
    deleted = await source_manager.delete_source(source_url)
    if not deleted:
        raise HTTPException(status_code=404, detail="Source not found")
    return {"message": "deleted"}
