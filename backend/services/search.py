"""Multi-source concurrent search service."""

import asyncio
import json
import logging

from backend.config import settings
from backend.engine.parser import RuleParser
from backend.engine.fetcher import fetch, parse_headers
from backend.engine.url_parser import parse_url, make_absolute_url
from backend.models.source import BookSourceSchema
from backend.models.book import SearchResultItem
from backend.services.source_manager import list_sources

logger = logging.getLogger(__name__)


async def search_books(keyword: str, source_urls: list[str] | None = None) -> list[SearchResultItem]:
    """Search across all enabled sources (or specified sources)."""
    sources_db = await list_sources(enabled_only=True)

    if source_urls:
        sources_db = [s for s in sources_db if s.book_source_url in source_urls]

    sem = asyncio.Semaphore(settings.max_concurrent_requests)
    tasks = []
    for source_db in sources_db:
        source = BookSourceSchema.model_validate(json.loads(source_db.source_json))
        if not source.searchUrl:
            continue
        tasks.append(_search_single_source(source, keyword, sem))

    results_nested = await asyncio.gather(*tasks, return_exceptions=True)

    results = []
    for r in results_nested:
        if isinstance(r, Exception):
            logger.warning("Search source failed: %s", r)
            continue
        results.extend(r)

    return results


async def _search_single_source(
    source: BookSourceSchema,
    keyword: str,
    sem: asyncio.Semaphore,
) -> list[SearchResultItem]:
    async with sem:
        try:
            return await _do_search(source, keyword)
        except Exception as e:
            logger.warning("Search failed for %s: %s", source.bookSourceName, e)
            return []


async def _do_search(source: BookSourceSchema, keyword: str) -> list[SearchResultItem]:
    parser = RuleParser()

    # Build request
    req = parse_url(source.searchUrl, keyword=keyword, page=1)
    if not req["url"]:
        return []

    # Merge source headers
    headers = parse_headers(source.header)
    headers.update(req["headers"])

    # Fetch
    content = await fetch(
        req["url"],
        method=req["method"],
        headers=headers,
        body=req["body"],
        encoding=req["charset"],
        use_cache=False,
    )

    if not content:
        return []

    # Parse book list
    rule_search = source.ruleSearch
    if not rule_search.bookList:
        return []

    elements = parser.parse_list(rule_search.bookList, content, req["url"])
    if not elements:
        return []

    results = []
    for element in elements[:20]:  # Limit to 20 results per source
        name = parser.parse_element(rule_search.name, element, req["url"])
        if not name:
            continue

        book_url = parser.parse_element(rule_search.bookUrl, element, req["url"])
        book_url = make_absolute_url(book_url, req["url"])

        author = parser.parse_element(rule_search.author, element, req["url"])
        cover_url = parser.parse_element(rule_search.coverUrl, element, req["url"])
        cover_url = make_absolute_url(cover_url, req["url"])
        intro = parser.parse_element(rule_search.intro, element, req["url"])
        kind = parser.parse_element(rule_search.kind, element, req["url"])
        last_chapter = parser.parse_element(rule_search.lastChapter, element, req["url"])

        if isinstance(name, list):
            name = name[0] if name else ""

        results.append(SearchResultItem(
            name=name,
            author=author if isinstance(author, str) else "",
            cover_url=cover_url if isinstance(cover_url, str) else "",
            intro=intro if isinstance(intro, str) else "",
            book_url=book_url,
            source_url=source.bookSourceUrl,
            source_name=source.bookSourceName,
            last_chapter=last_chapter if isinstance(last_chapter, str) else "",
            kind=kind if isinstance(kind, str) else "",
        ))

    return results
