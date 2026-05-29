import pytest

from backend.models.source import BookSourceSchema
from backend.services.search import _do_search


@pytest.mark.asyncio
async def test_do_search_parses_legado_html_source(monkeypatch):
    source = BookSourceSchema.model_validate(
        {
            "bookSourceUrl": "https://source.example",
            "bookSourceName": "测试源",
            "searchUrl": "https://source.example/search?q={{key}}",
            "ruleSearch": {
                "bookList": "@css:article.book",
                "name": "@css:a.title@text",
                "author": "@css:.author@text",
                "coverUrl": "@css:img.cover@src",
                "bookUrl": "@css:a.title@href",
                "intro": "@css:.intro@text",
                "kind": "@css:.kind@text",
                "lastChapter": "@css:.latest@text",
            },
        }
    )
    html = """
    <article class="book">
      <a class="title" href="/book/1">第一本书</a>
      <span class="author">作者甲</span>
      <img class="cover" src="/cover/1.jpg">
      <p class="intro">简介 A</p>
      <span class="kind">玄幻</span>
      <span class="latest">第十章</span>
    </article>
    <article class="book">
      <a class="title" href="https://cdn.example/book/2">第二本书</a>
      <span class="author">作者乙</span>
      <img class="cover" src="//img.example/2.jpg">
      <p class="intro">简介 B</p>
      <span class="kind">科幻</span>
      <span class="latest">第二十章</span>
    </article>
    """
    calls = []

    async def fake_fetch(url, **kwargs):
        calls.append((url, kwargs))
        return html

    monkeypatch.setattr("backend.services.search.fetch", fake_fetch)

    results = await _do_search(source, "三体")

    assert calls[0][0] == "https://source.example/search?q=%E4%B8%89%E4%BD%93"
    assert calls[0][1]["use_cache"] is False
    assert len(results) == 2
    assert results[0].name == "第一本书"
    assert results[0].author == "作者甲"
    assert results[0].cover_url == "https://source.example/cover/1.jpg"
    assert results[0].book_url == "https://source.example/book/1"
    assert results[0].source_name == "测试源"
    assert results[1].cover_url == "https://img.example/2.jpg"
    assert results[1].book_url == "https://cdn.example/book/2"


@pytest.mark.asyncio
async def test_do_search_resolves_book_url_template(monkeypatch):
    source = BookSourceSchema.model_validate(
        {
            "bookSourceUrl": "https://source.example",
            "bookSourceName": "模板源",
            "searchUrl": "https://source.example/api?q={{key}}",
            "ruleSearch": {
                "bookList": "$.items[*]",
                "name": "$.name",
                "author": "$.author",
                "bookUrl": "/book/{{$.id}}/{{book.name}}",
            },
        }
    )

    async def fake_fetch(*args, **kwargs):
        return '{"items":[{"id":"42","name":"三体","author":"刘慈欣"}]}'

    monkeypatch.setattr("backend.services.search.fetch", fake_fetch)

    results = await _do_search(source, "三体")

    assert len(results) == 1
    assert results[0].book_url == "https://source.example/book/42/三体"
    assert results[0].name == "三体"
    assert results[0].author == "刘慈欣"


@pytest.mark.asyncio
async def test_do_search_uses_rule_parser_for_multiline_book_url_with_result_template(monkeypatch):
    source = BookSourceSchema.model_validate(
        {
            "bookSourceUrl": "https://bookshelf.example.com",
            "bookSourceName": "多行规则源",
            "searchUrl": "https://bookshelf.example.com/search?q={{key}}",
            "ruleSearch": {
                "bookList": "$.booklist[*]",
                "name": "$.title",
                "author": "$.author",
                "bookUrl": "$.bid\n<js>1100000000 + parseInt(result)</js>\nhttps://bookshelf.example.com/book?id={{result}}",
            },
        }
    )

    async def fake_fetch(*args, **kwargs):
        return '{"booklist":[{"bid":"123","title":"测试书","author":"作者"}]}'

    monkeypatch.setattr("backend.services.search.fetch", fake_fetch)

    results = await _do_search(source, "测试")

    assert len(results) == 1
    assert results[0].book_url == "https://bookshelf.example.com/book?id=1100000123"


@pytest.mark.asyncio
async def test_do_search_uses_first_url_when_book_url_rule_returns_list(monkeypatch):
    source = BookSourceSchema.model_validate(
        {
            "bookSourceUrl": "https://cards.example.com",
            "bookSourceName": "多链接卡片源",
            "searchUrl": "https://cards.example.com/search?q={{key}}",
            "ruleSearch": {
                "bookList": "@css:.book",
                "name": "@css:.title@text",
                "bookUrl": "@css:a@href",
            },
        }
    )

    async def fake_fetch(*args, **kwargs):
        return """
        <div class="book">
          <a href="/book/1"><img src="/cover.jpg"></a>
          <a class="title" href="/book/1">测试书</a>
          <a href="/book/1/latest">最新章节</a>
        </div>
        """

    monkeypatch.setattr("backend.services.search.fetch", fake_fetch)

    results = await _do_search(source, "测试")

    assert len(results) == 1
    assert results[0].book_url == "https://cards.example.com/book/1"


@pytest.mark.asyncio
async def test_do_search_merges_source_and_request_headers_for_post(monkeypatch):
    source = BookSourceSchema.model_validate(
        {
            "bookSourceUrl": "https://post.example",
            "bookSourceName": "POST 源",
            "header": '{"Cookie":"sid=abc","User-Agent":"SourceUA"}',
            "searchUrl": (
                'https://post.example/api/search,'
                '{"method":"POST","body":"kw={{key}}&page={{page}}",'
                '"headers":{"Content-Type":"application/x-www-form-urlencoded","X-Requested-With":"XMLHttpRequest"}}'
            ),
            "ruleSearch": {
                "bookList": "$.items[*]",
                "name": "$.name",
                "author": "$.author",
                "bookUrl": "$.url",
            },
        }
    )
    calls = []

    async def fake_fetch(url, **kwargs):
        calls.append((url, kwargs))
        return '{"items":[{"name":"庆余年","author":"猫腻","url":"/book/qyn"}]}'

    monkeypatch.setattr("backend.services.search.fetch", fake_fetch)

    results = await _do_search(source, "庆余年")

    assert len(results) == 1
    assert calls == [
        (
            "https://post.example/api/search",
            {
                "method": "POST",
                "headers": {
                    "Cookie": "sid=abc",
                    "User-Agent": "SourceUA",
                    "Content-Type": "application/x-www-form-urlencoded",
                    "X-Requested-With": "XMLHttpRequest",
                },
                "body": "kw=%E5%BA%86%E4%BD%99%E5%B9%B4&page=1",
                "encoding": None,
                "use_cache": False,
            },
        )
    ]
    assert results[0].book_url == "https://post.example/book/qyn"
