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


import re as _re


def _resolve_book_url_template(
    template: str,
    fields: dict[str, str],
    element,
    parser: RuleParser,
    base_url: str,
) -> str:
    """Resolve {{book.field}} or {{$.jsonpath}} in bookUrl templates."""
    def replacer(m: _re.Match) -> str:
        expr = m.group(1)
        if expr.startswith("book."):
            field_name = expr[5:]
            # Map Legado field names
            field_map = {
                "name": "name",
                "author": "author",
                "kind": "kind",
                "coverUrl": "cover_url",
                "bookUrl": "",
            }
            mapped = field_map.get(field_name, field_name)
            return fields.get(mapped, "")
        # Try as a rule against the element
        val = parser.parse_element(expr, element, base_url)
        return val if isinstance(val, str) else ""

    return _re.sub(r"\{\{(.+?)\}\}", replacer, template)


async def search_books_stream(keyword: str, source_urls: list[str] | None = None):
    """Stream search results as each source completes."""
    sources_db = await list_sources(enabled_only=True)

    if source_urls:
        sources_db = [s for s in sources_db if s.book_source_url in source_urls]

    sem = asyncio.Semaphore(settings.max_concurrent_requests)
    queue: asyncio.Queue[list[SearchResultItem] | None] = asyncio.Queue()

    async def search_and_enqueue(source: BookSourceSchema):
        async with sem:
            try:
                results = await _do_search(source, keyword)
                if results:
                    await queue.put(results)
            except Exception as e:
                logger.warning("Search failed for %s: %s", source.bookSourceName, e)

    tasks = []
    for source_db in sources_db:
        source = BookSourceSchema.model_validate(json.loads(source_db.source_json))
        if not source.searchUrl:
            continue
        tasks.append(asyncio.create_task(search_and_enqueue(source)))

    async def wait_all():
        await asyncio.gather(*tasks, return_exceptions=True)
        await queue.put(None)

    asyncio.create_task(wait_all())

    while True:
        batch = await queue.get()
        if batch is None:
            break
        yield batch


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

        author = parser.parse_element(rule_search.author, element, req["url"])
        cover_url = parser.parse_element(rule_search.coverUrl, element, req["url"])
        cover_url = make_absolute_url(cover_url if isinstance(cover_url, str) else "", req["url"])
        intro = parser.parse_element(rule_search.intro, element, req["url"])
        kind = parser.parse_element(rule_search.kind, element, req["url"])
        last_chapter = parser.parse_element(rule_search.lastChapter, element, req["url"])

        if isinstance(name, list):
            name = name[0] if name else ""

        # Resolve bookUrl — may be a selector OR a template with {{book.field}}
        book_url_rule = rule_search.bookUrl
        if "{{" in book_url_rule:
            book_url = _resolve_book_url_template(book_url_rule, {
                "name": name,
                "author": author if isinstance(author, str) else "",
                "kind": kind if isinstance(kind, str) else "",
                "cover_url": cover_url if isinstance(cover_url, str) else "",
            }, element, parser, req["url"])
        else:
            book_url = parser.parse_element(book_url_rule, element, req["url"])
        book_url = make_absolute_url(book_url if isinstance(book_url, str) else "", req["url"])

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
