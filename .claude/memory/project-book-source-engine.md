---
name: project-book-source-engine
description: 书源规则引擎需兼容 Legado 5400+ 现有书源的 JSON 格式
metadata:
  type: project
---

书源规则引擎是项目核心模块，需兼容阅读 app (Legado) 的书源规则格式。

规则语法支持：
- 默认 JSOUP CSS 选择器
- @css: 前缀显式 CSS
- // 前缀 XPath
- $. 前缀 JSONPath
- <js>...</js> JavaScript 执行
- ##regex 正则提取
- @ 分隔符做规则链（管道串联）
- {{key}} 变量插值

书源 JSON 核心字段：bookSourceUrl, bookSourceName, bookSourceType(0=文本/1=音频), ruleSearch, ruleExplore, ruleBookInfo, ruleToc, ruleContent

参考资源：
- 书源工具：https://www.yckceo.com/yuedu/tools/index/id/shuyuan.html
- 现成书源库：https://www.yckceo.com/yuedu/shuyuan/index.html（5400+ 源）

**Why:** 兼容现有书源生态是项目核心竞争力，不兼容就没有内容可看。
**How to apply:** 规则引擎是第一优先级开发，必须能正确解析主流书源的搜索/目录/正文规则。
