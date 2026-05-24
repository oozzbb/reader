"""QuickJS sandbox for executing book source JavaScript rules.

Injects a minimal `java` bridge object with:
- java.ajax(url) / java.get(url) — HTTP GET
- java.post(url, body) — HTTP POST
- java.base64Encode(str) / java.base64Decode(str)
- java.log(msg) — no-op
"""

import base64
import json

import quickjs


class JSEngine:
    def __init__(self):
        self._context: quickjs.Context | None = None

    def _get_context(self) -> quickjs.Context:
        if self._context is None:
            self._context = quickjs.Context()
            self._inject_bridge()
        return self._context

    def _inject_bridge(self):
        ctx = self._context

        bridge_js = """
        var java = {
            _ajax_results: {},
            ajax: function(url) { return ""; },
            get: function(url) { return java.ajax(url); },
            post: function(url, body, headers) { return ""; },
            base64Encode: function(str) { return __base64Encode(str); },
            base64Decode: function(str) { return __base64Decode(str); },
            log: function(msg) {},
            put: function(key, value) {},
            get: function(key) { return ""; },
        };
        var result = "";
        var baseUrl = "";
        var key = "";
        var page = 1;
        var keyword = "";
        """
        ctx.eval(bridge_js)

        def base64_encode(s):
            if isinstance(s, str):
                return base64.b64encode(s.encode()).decode()
            return ""

        def base64_decode(s):
            if isinstance(s, str):
                try:
                    return base64.b64decode(s).decode()
                except Exception:
                    return ""
            return ""

        ctx.add_callable("__base64Encode", base64_encode)
        ctx.add_callable("__base64Decode", base64_decode)

    def execute(self, script: str, result: str = "", **variables) -> str:
        ctx = self._get_context()

        # Set variables
        ctx.eval(f"result = {json.dumps(result or '')};")
        for k, v in variables.items():
            ctx.eval(f"{k} = {json.dumps(str(v))};")

        # Clean script tags
        script = script.strip()
        if script.startswith("<js>"):
            script = script[4:]
        if script.endswith("</js>"):
            script = script[:-5]
        if script.startswith("@js:"):
            script = script[4:]
        script = script.strip()

        try:
            val = ctx.eval(script)
            if val is None:
                return ""
            return str(val)
        except Exception:
            return ""

    def reset(self):
        self._context = None


_engine = JSEngine()


def execute(rule: str, content: str = "", **variables) -> str:
    return _engine.execute(rule, result=content, **variables)


def reset():
    _engine.reset()
