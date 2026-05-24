"""Parse Legado searchUrl / exploreUrl format.

Legado URL formats:
- Simple GET: `https://example.com/search?q={{key}}&page={{page}}`
- POST with body: `https://example.com/search,{"method":"POST","body":"keyword={{key}}"}`
- POST shorthand: `https://example.com/search@keyword={{key}}`
- With charset: `https://example.com/search?q={{key}}|char=gbk`
- JavaScript URL: `<js>...</js>`
"""

import json
import re
from urllib.parse import quote


def parse_url(
    url_template: str,
    *,
    keyword: str = "",
    page: int = 1,
    base_url: str = "",
    source_url: str = "",
) -> dict:
    """Parse a Legado URL template into request parameters.

    Returns dict with keys: url, method, headers, body, charset.
    """
    if not url_template:
        return {"url": "", "method": "GET", "headers": {}, "body": None, "charset": None}

    # Clean whitespace/newlines from URL template
    url_template = url_template.replace("\n", "").replace("\r", "").strip()

    # Variable substitution
    url_template = _substitute_vars(url_template, keyword=keyword, page=page)

    # Extract charset option
    charset = None
    if "|char=" in url_template:
        url_template, charset = url_template.rsplit("|char=", 1)

    # Extract other pipe options
    headers = {}
    while "|" in url_template:
        before, _, option = url_template.rpartition("|")
        if "=" in option and not option.startswith("http"):
            key, val = option.split("=", 1)
            if key.lower() == "char":
                charset = val
            else:
                headers[key] = val
            url_template = before
        else:
            break

    # Determine method and body
    method = "GET"
    body = None

    # JSON config format: url,{"method":"POST","body":"..."}
    json_config_match = re.match(r"^(https?://[^,]+),\s*(\{.+\})\s*$", url_template, re.DOTALL)
    if json_config_match:
        url = json_config_match.group(1)
        try:
            config = json.loads(json_config_match.group(2))
            method = config.get("method", "POST").upper()
            body = config.get("body", "")
            if "headers" in config:
                headers.update(config["headers"])
            if "charset" in config:
                charset = config["charset"]
        except json.JSONDecodeError:
            url = url_template
        return {"url": url, "method": method, "headers": headers, "body": body, "charset": charset}

    # POST shorthand: url@body
    if "@" in url_template:
        # Make sure it's not part of the URL path
        at_idx = url_template.find("@")
        url_part = url_template[:at_idx]
        if url_part.startswith("http"):
            body_part = url_template[at_idx + 1:]
            return {"url": url_part, "method": "POST", "headers": headers, "body": body_part, "charset": charset}

    # Resolve relative URLs using source_url origin
    final_url = url_template
    if not final_url.startswith("http"):
        origin = _get_origin(source_url or base_url)
        if origin:
            final_url = make_absolute_url(final_url, origin)

    return {"url": final_url, "method": method, "headers": headers, "body": body, "charset": charset}


def _get_origin(url: str) -> str:
    if not url:
        return ""
    from urllib.parse import urlparse
    parsed = urlparse(url)
    if parsed.scheme and parsed.netloc:
        return f"{parsed.scheme}://{parsed.netloc}"
    return ""


def _substitute_vars(template: str, keyword: str = "", page: int = 1) -> str:
    template = template.replace("{{key}}", quote(keyword))
    template = template.replace("{{keyword}}", quote(keyword))
    template = template.replace("{{page}}", str(page))
    # Legado also uses searchKey and searchPage
    template = template.replace("{{searchKey}}", quote(keyword))
    template = template.replace("{{searchPage}}", str(page))
    # Handle {page - 1} style expressions
    template = re.sub(
        r"\{\{page\s*([+-])\s*(\d+)\}\}",
        lambda m: str(page + int(m.group(2)) * (1 if m.group(1) == "+" else -1)),
        template,
    )
    return template


def make_absolute_url(url: str, base_url: str) -> str:
    if not url:
        return ""
    if url.startswith("http://") or url.startswith("https://"):
        return url
    if url.startswith("//"):
        return "https:" + url
    if url.startswith("/"):
        # Extract origin from base_url
        from urllib.parse import urlparse
        parsed = urlparse(base_url)
        return f"{parsed.scheme}://{parsed.netloc}{url}"
    # Relative path
    if base_url:
        base = base_url.rsplit("/", 1)[0]
        return f"{base}/{url}"
    return url
