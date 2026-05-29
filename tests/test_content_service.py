import pytest

from backend.models.source import BookSourceSchema
from backend.services.content import get_chapter_content, get_chapters


@pytest.mark.asyncio
async def test_get_chapters_parses_toc_from_book_page(monkeypatch):
    source = BookSourceSchema.model_validate(
        {
            "bookSourceUrl": "https://source.example",
            "bookSourceName": "目录源",
            "ruleBookInfo": {},
            "ruleToc": {
                "chapterList": "@css:ul.toc li",
                "chapterName": "@css:a@text",
                "chapterUrl": "@css:a@href",
            },
        }
    )
    html = """
    <ul class="toc">
      <li><a href="/book/1/chapter/1.html">第一章 起点</a></li>
      <li><a href="chapter/2.html">第二章 继续</a></li>
    </ul>
    """

    monkeypatch.setattr("backend.services.content.get_source_raw", lambda source_url: _async_value(None))
    monkeypatch.setattr("backend.services.content.get_source", lambda source_url: _async_value(source))
    monkeypatch.setattr("backend.services.content.fetch", lambda url, **kwargs: _async_value(html))

    chapters = await get_chapters("https://source.example/book/1/index.html", "https://source.example")

    assert [chapter.title for chapter in chapters] == ["第一章 起点", "第二章 继续"]
    assert [chapter.idx for chapter in chapters] == [0, 1]
    assert chapters[0].url == "https://source.example/book/1/chapter/1.html"
    assert chapters[1].url == "https://source.example/book/1/chapter/2.html"


@pytest.mark.asyncio
async def test_get_chapters_uses_toc_url_template_and_fetches_toc_page(monkeypatch):
    source = BookSourceSchema.model_validate(
        {
            "bookSourceUrl": "https://source.example",
            "bookSourceName": "独立目录源",
            "ruleBookInfo": {
                "name": "@css:h1@text",
                "tocUrl": "/toc/{{book.name}}.html",
            },
            "ruleToc": {
                "chapterList": "@css:.chapter",
                "chapterName": "@css:a@text",
                "chapterUrl": "@css:a@href",
            },
        }
    )
    book_page = "<h1>三体</h1>"
    toc_page = '<div class="chapter"><a href="/c/1.html">第一章</a></div>'
    fetched_urls = []

    async def fake_fetch(url, **kwargs):
        fetched_urls.append(url)
        return book_page if url.endswith("/book/1") else toc_page

    monkeypatch.setattr("backend.services.content.get_source_raw", lambda source_url: _async_value(None))
    monkeypatch.setattr("backend.services.content.get_source", lambda source_url: _async_value(source))
    monkeypatch.setattr("backend.services.content.fetch", fake_fetch)

    chapters = await get_chapters("https://source.example/book/1", "https://source.example")

    assert fetched_urls == ["https://source.example/book/1", "https://source.example/toc/三体.html"]
    assert len(chapters) == 1
    assert chapters[0].title == "第一章"
    assert chapters[0].url == "https://source.example/c/1.html"


@pytest.mark.asyncio
async def test_get_chapter_content_parses_cleans_and_applies_replacement(monkeypatch):
    source = BookSourceSchema.model_validate(
        {
            "bookSourceUrl": "https://source.example",
            "bookSourceName": "正文源",
            "ruleContent": {
                "content": "@css:div.content@html",
                "replaceRegex": "广告.*",
            },
        }
    )
    html = """
    <div class="content">
      <p>第一段&nbsp;正文</p>
      <p>广告 请下载 App</p>
      <p>第二段正文</p>
    </div>
    """

    monkeypatch.setattr("backend.services.content.get_source_raw", lambda source_url: _async_value(None))
    monkeypatch.setattr("backend.services.content.get_source", lambda source_url: _async_value(source))
    monkeypatch.setattr("backend.services.content.fetch", lambda url, **kwargs: _async_value(html))

    content = await get_chapter_content("https://source.example/c/1.html", "https://source.example")

    assert "广告" not in content
    assert content == "第一段\u00a0正文\n\n第二段正文"


async def _async_value(value):
    return value
