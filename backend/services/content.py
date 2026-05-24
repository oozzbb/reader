"""Content service — fetch book info, chapter list, and chapter content."""

import json
import logging

from backend.engine.parser import RuleParser
from backend.engine.fetcher import fetch, parse_headers
from backend.engine.url_parser import make_absolute_url
from backend.models.source import BookSourceSchema
from backend.models.book import BookSchema, ChapterSchema
from backend.services.source_manager import get_source
from backend.database import get_db

logger = logging.getLogger(__name__)


async def get_book_info(book_url: str, source_url: str) -> BookSchema | None:
    """Fetch and parse book details from a book URL."""
    source = await get_source(source_url)
    if not source:
        return None

    parser = RuleParser()
    headers = parse_headers(source.header)

    content = await fetch(book_url, headers=headers)
    if not content:
        return None

    rule_info = source.ruleBookInfo
    name = parser.parse(rule_info.name, content, book_url)
    author = parser.parse(rule_info.author, content, book_url)
    cover_url = parser.parse(rule_info.coverUrl, content, book_url)
    cover_url = make_absolute_url(cover_url if isinstance(cover_url, str) else "", book_url)
    intro = parser.parse(rule_info.intro, content, book_url)

    if isinstance(name, list):
        name = name[0] if name else ""
    if isinstance(author, list):
        author = author[0] if author else ""
    if isinstance(intro, list):
        intro = "\n".join(intro)

    return BookSchema(
        name=name or "",
        author=author or "",
        cover_url=cover_url,
        intro=intro or "",
        book_url=book_url,
        source_url=source_url,
    )


async def get_chapters(book_url: str, source_url: str) -> list[ChapterSchema]:
    """Fetch and parse chapter list (TOC) for a book."""
    source = await get_source(source_url)
    if not source:
        return []

    parser = RuleParser()
    headers = parse_headers(source.header)

    # Determine TOC URL
    rule_info = source.ruleBookInfo
    content = await fetch(book_url, headers=headers)
    if not content:
        return []

    toc_url = book_url
    if rule_info.tocUrl:
        parsed_toc_url = parser.parse(rule_info.tocUrl, content, book_url)
        if parsed_toc_url and isinstance(parsed_toc_url, str):
            toc_url = make_absolute_url(parsed_toc_url, book_url)
            if toc_url != book_url:
                content = await fetch(toc_url, headers=headers)
                if not content:
                    return []

    rule_toc = source.ruleToc
    if not rule_toc.chapterList:
        return []

    elements = parser.parse_list(rule_toc.chapterList, content, toc_url)
    if not elements:
        return []

    chapters = []
    for idx, element in enumerate(elements):
        title = parser.parse_element(rule_toc.chapterName, element, toc_url)
        url = parser.parse_element(rule_toc.chapterUrl, element, toc_url)
        url = make_absolute_url(url if isinstance(url, str) else "", toc_url)

        if isinstance(title, list):
            title = title[0] if title else ""

        if not title:
            continue

        chapters.append(ChapterSchema(
            book_id=0,
            title=title,
            url=url,
            idx=idx,
        ))

    # Handle multi-page TOC
    if rule_toc.nextTocUrl:
        next_url = parser.parse(rule_toc.nextTocUrl, content, toc_url)
        if next_url and isinstance(next_url, str):
            next_url = make_absolute_url(next_url, toc_url)
            more = await _fetch_next_toc(source, next_url, headers, len(chapters))
            chapters.extend(more)

    return chapters


async def _fetch_next_toc(
    source: BookSourceSchema,
    url: str,
    headers: dict,
    start_idx: int,
    max_pages: int = 10,
) -> list[ChapterSchema]:
    """Follow pagination for multi-page TOCs."""
    parser = RuleParser()
    rule_toc = source.ruleToc
    chapters = []

    for _ in range(max_pages):
        content = await fetch(url, headers=headers)
        if not content:
            break

        elements = parser.parse_list(rule_toc.chapterList, content, url)
        if not elements:
            break

        for element in elements:
            title = parser.parse_element(rule_toc.chapterName, element, url)
            ch_url = parser.parse_element(rule_toc.chapterUrl, element, url)
            ch_url = make_absolute_url(ch_url if isinstance(ch_url, str) else "", url)

            if isinstance(title, list):
                title = title[0] if title else ""
            if not title:
                continue

            chapters.append(ChapterSchema(
                book_id=0,
                title=title,
                url=ch_url,
                idx=start_idx + len(chapters),
            ))

        next_url = parser.parse(rule_toc.nextTocUrl, content, url)
        if not next_url or not isinstance(next_url, str) or next_url == url:
            break
        url = make_absolute_url(next_url, url)

    return chapters


async def get_chapter_content(
    chapter_url: str,
    source_url: str,
) -> str:
    """Fetch and parse chapter text content."""
    source = await get_source(source_url)
    if not source:
        return ""

    parser = RuleParser()
    headers = parse_headers(source.header)
    rule_content = source.ruleContent

    if not rule_content.content:
        return ""

    content = await fetch(chapter_url, headers=headers)
    if not content:
        return ""

    text = parser.parse(rule_content.content, content, chapter_url)
    if isinstance(text, list):
        text = "\n".join(text)

    # Handle multi-page content
    if rule_content.nextContentUrl:
        next_url = parser.parse(rule_content.nextContentUrl, content, chapter_url)
        if next_url and isinstance(next_url, str):
            next_url = make_absolute_url(next_url, chapter_url)
            more = await _fetch_next_content(source, next_url, headers)
            if more:
                text = text + "\n" + more

    # Apply replacement regex
    if rule_content.replaceRegex and text:
        import re
        try:
            text = re.sub(rule_content.replaceRegex, "", text)
        except re.error:
            pass

    # Clean up
    text = _clean_content(text)
    return text


async def _fetch_next_content(
    source: BookSourceSchema,
    url: str,
    headers: dict,
    max_pages: int = 10,
) -> str:
    """Follow pagination for multi-page chapter content."""
    parser = RuleParser()
    rule_content = source.ruleContent
    parts = []

    for _ in range(max_pages):
        content = await fetch(url, headers=headers)
        if not content:
            break

        text = parser.parse(rule_content.content, content, url)
        if isinstance(text, list):
            text = "\n".join(text)
        if not text:
            break
        parts.append(text)

        next_url = parser.parse(rule_content.nextContentUrl, content, url)
        if not next_url or not isinstance(next_url, str) or next_url == url:
            break
        url = make_absolute_url(next_url, url)

    return "\n".join(parts)


def _clean_content(text: str) -> str:
    if not text:
        return ""
    # Remove common ad patterns
    lines = text.split("\n")
    lines = [line.strip() for line in lines]
    # Remove empty lines at start/end
    while lines and not lines[0]:
        lines.pop(0)
    while lines and not lines[-1]:
        lines.pop()
    return "\n".join(lines)
