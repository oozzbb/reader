"""Rule parser — the central dispatcher for all rule types.

Determines the rule type from its prefix/pattern and delegates to the
appropriate parser. Also handles rule chains (&&, ||, %%).
"""

from lxml import etree
from bs4 import Tag

from backend.engine import css_parser, xpath_parser, jsonpath_parser, regex_parser, js_engine
from backend.engine.rule_chain import split_rules, is_compound


class RuleParser:
    """Stateless rule parser that dispatches to sub-parsers."""

    def parse(self, rule: str, content: str | dict | Tag, base_url: str = "") -> str | list[str]:
        if not rule or not content:
            return ""

        rule = rule.strip()

        # Handle compound rules (&&, ||, %%)
        if is_compound(rule):
            return self._parse_compound(rule, content, base_url)

        return self._parse_single(rule, content, base_url)

    def parse_list(self, rule: str, content: str | dict, base_url: str = ""):
        """Parse a rule that should return a list of elements/dicts."""
        if not rule or not content:
            return []

        rule = rule.strip()

        if rule.startswith("@css:") or self._is_jsoup(rule):
            return css_parser.parse_list(rule, content)
        elif rule.startswith("//") or rule.startswith("@xpath:"):
            xpath_rule = rule.removeprefix("@xpath:")
            return xpath_parser.parse_list(xpath_rule, content)
        elif rule.startswith("$.") or rule.startswith("@json:"):
            return jsonpath_parser.parse_list(rule, content)
        else:
            return css_parser.parse_list(rule, content)

    def parse_element(self, rule: str, element, base_url: str = "") -> str:
        """Parse a rule against a single element (Tag or dict or etree Element)."""
        if not rule:
            return ""

        rule = rule.strip()

        if is_compound(rule):
            return self._parse_compound(rule, element, base_url)

        if isinstance(element, dict):
            # Handle inline regex: $.field##regex##replacement
            if "##" in rule and not rule.startswith("##"):
                parts = rule.split("##", 1)
                base_result = self.parse_element(parts[0], element, base_url)
                if base_result:
                    return regex_parser.parse("##" + parts[1], base_result if isinstance(base_result, str) else str(base_result))
                return ""
            # JSON element — use jsonpath or direct key access
            if rule.startswith("$.") or rule.startswith("@json:"):
                return jsonpath_parser.get_value(element, rule)
            # Simple key access
            return str(element.get(rule, ""))

        if isinstance(element, etree._Element):
            if rule.startswith("//") or rule.startswith("@xpath:"):
                return xpath_parser.get_element_text(element, rule)
            text = etree.tostring(element, method="html", encoding="unicode")
            return self._parse_single(rule, text, base_url)

        if isinstance(element, (Tag, str)):
            return self._parse_single(rule, element, base_url)

        return ""

    def _parse_single(self, rule: str, content: str | dict | Tag, base_url: str) -> str:
        # Handle inline regex post-processing: rule##regex##replacement
        # (e.g. $.groupID##.*_## means: get jsonpath then regex-replace)
        if "##" in rule and not rule.startswith("##"):
            parts = rule.split("##", 1)
            base_rule = parts[0]
            regex_rule = "##" + parts[1]
            result = self._parse_single(base_rule, content, base_url)
            if result:
                text = result if isinstance(result, str) else str(result)
                return regex_parser.parse(regex_rule, text)
            return ""

        # JS rules
        if rule.startswith("<js>") or rule.startswith("@js:"):
            text = content if isinstance(content, str) else ""
            return js_engine.execute(rule, text, baseUrl=base_url)

        # JSONPath
        if rule.startswith("$.") or rule.startswith("@json:"):
            return jsonpath_parser.parse(rule, content)

        # XPath
        if rule.startswith("//") or rule.startswith("@xpath:"):
            text = content if isinstance(content, str) else str(content)
            return xpath_parser.parse(rule, text)

        # Regex (## prefix)
        if rule.startswith("##") or rule.startswith("###"):
            text = content if isinstance(content, str) else str(content)
            return regex_parser.parse(rule, text)

        # CSS (@css: prefix or JSOUP shorthand)
        if rule.startswith("@css:") or self._is_jsoup(rule):
            return css_parser.parse(rule, content)

        # Default: try as CSS
        return css_parser.parse(rule, content)

    def _parse_compound(self, rule: str, content, base_url: str) -> str | list[str]:
        operator, parts = split_rules(rule)

        if operator == "&&":
            # Concatenate all results
            results = []
            for part in parts:
                r = self._parse_single(part, content, base_url)
                if isinstance(r, list):
                    results.extend(r)
                elif r:
                    results.append(r)
            return "\n".join(results) if results else ""

        elif operator == "||":
            # First non-empty result
            for part in parts:
                r = self._parse_single(part, content, base_url)
                if r:
                    return r
            return ""

        elif operator == "%%":
            # Format template (first part is template, rest are values)
            if len(parts) < 2:
                return self._parse_single(parts[0], content, base_url) if parts else ""
            template = parts[0]
            for i, part in enumerate(parts[1:]):
                val = self._parse_single(part, content, base_url)
                if isinstance(val, list):
                    val = val[0] if val else ""
                template = template.replace(f"${{{i}}}", val)
            return template

        return ""

    def _is_jsoup(self, rule: str) -> bool:
        """Check if rule looks like JSOUP shorthand (class.x, tag.x, id.x, text.x)."""
        prefixes = ("class.", "tag.", "id.", "text.", "children")
        return any(rule.startswith(p) for p in prefixes)
