import hashlib
import json
from pathlib import Path

import httpx
from charset_normalizer import from_bytes

from backend.config import settings

_client: httpx.AsyncClient | None = None


def _get_client() -> httpx.AsyncClient:
    global _client
    if _client is None:
        _client = httpx.AsyncClient(
            timeout=settings.request_timeout,
            follow_redirects=True,
            proxy=settings.proxy,
            headers={"User-Agent": settings.user_agent},
        )
    return _client


def _cache_key(url: str, method: str, body: str | None) -> str:
    raw = f"{method}:{url}:{body or ''}"
    return hashlib.md5(raw.encode()).hexdigest()


def _cache_path(key: str) -> Path:
    d = settings.content_cache_dir / key[:2]
    d.mkdir(parents=True, exist_ok=True)
    return d / key


async def fetch(
    url: str,
    *,
    method: str = "GET",
    headers: dict | None = None,
    body: str | None = None,
    use_cache: bool = True,
    encoding: str | None = None,
) -> str:
    if use_cache:
        key = _cache_key(url, method, body)
        path = _cache_path(key)
        if path.exists():
            return path.read_text(encoding="utf-8")

    client = _get_client()
    from urllib.parse import urlparse
    parsed = urlparse(url)
    referer = f"{parsed.scheme}://{parsed.netloc}/"
    merged_headers = {"User-Agent": settings.user_agent, "Referer": referer}
    if headers:
        merged_headers.update(headers)

    if method.upper() == "POST":
        content_type = merged_headers.get("Content-Type", "")
        if "application/json" in content_type:
            resp = await client.post(url, headers=merged_headers, content=body)
        else:
            resp = await client.post(url, headers=merged_headers, content=body)
    else:
        resp = await client.get(url, headers=merged_headers)

    resp.raise_for_status()

    if encoding:
        text = resp.content.decode(encoding, errors="replace")
    else:
        text = _detect_encoding(resp.content, resp.headers.get("content-type", ""))

    if use_cache:
        key = _cache_key(url, method, body)
        path = _cache_path(key)
        path.write_text(text, encoding="utf-8")

    return text


def _detect_encoding(content: bytes, content_type: str) -> str:
    if "charset=" in content_type:
        charset = content_type.split("charset=")[-1].split(";")[0].strip()
        try:
            return content.decode(charset, errors="replace")
        except (UnicodeDecodeError, LookupError):
            pass

    try:
        return content.decode("utf-8")
    except UnicodeDecodeError:
        pass

    result = from_bytes(content).best()
    if result:
        return str(result)

    return content.decode("utf-8", errors="replace")


def parse_headers(header_str: str) -> dict:
    if not header_str:
        return {}
    try:
        return json.loads(header_str)
    except (json.JSONDecodeError, TypeError):
        return {}


async def close_client():
    global _client
    if _client:
        await _client.aclose()
        _client = None
