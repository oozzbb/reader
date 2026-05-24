# 自托管阅读器 — 架构方案

## Context

用户需要一个部署在 NAS 上的全能阅读器：小说 + 漫画 + 有声书 + RSS，支持 TTS 朗读，兼容阅读 app (Legado) 5400+ 现有书源。现有方案（如 hectorqin/reader）普遍存在功能不全、UI 粗糙、TTS 缺失等问题。

## 技术选型

| 层 | 选择 | 理由 |
|---|---|---|
| 后端 | Python 3.11+ / FastAPI | 异步 I/O、解析生态（BS4/lxml/jsonpath）、TTS 集成方便 |
| 前端 | React 18 + TypeScript + Vite | 组件化阅读器、PWA 支持、构建快 |
| 数据库 | SQLite (aiosqlite) | 零运维、NAS 友好、单文件备份 |
| JS 执行 | quickjs (pyquickjs) | 沙盒安全、无需 Node 依赖、轻量 |
| TTS | edge-tts + sherpa-onnx + 自定义 API | 多后端可切换 |
| 部署 | Docker 单容器 + docker-compose | 前端构建产物由 FastAPI 静态 serve |

## 目录结构

```
~/Documents/reader/
├── docker-compose.yml
├── Dockerfile
├── README.md
├── backend/
│   ├── main.py                    # FastAPI 入口
│   ├── requirements.txt
│   ├── config.py                  # 配置管理
│   ├── database.py                # SQLite 连接 + 模型
│   ├── models/
│   │   ├── book.py                # 书籍/章节 ORM
│   │   ├── source.py              # 书源模型
│   │   └── user.py                # 用户设置/进度
│   ├── engine/                    # 核心：书源规则引擎
│   │   ├── __init__.py
│   │   ├── parser.py              # 规则解析调度器
│   │   ├── css_parser.py          # CSS/JSOUP 选择器
│   │   ├── xpath_parser.py        # XPath 解析
│   │   ├── jsonpath_parser.py     # JSONPath 解析
│   │   ├── js_engine.py           # QuickJS 沙盒执行
│   │   ├── regex_parser.py        # 正则提取
│   │   ├── rule_chain.py          # 规则链 (@分隔符串联)
│   │   └── fetcher.py             # HTTP 请求 + 缓存
│   ├── services/
│   │   ├── search.py              # 搜索聚合
│   │   ├── explore.py             # 发现/分类
│   │   ├── content.py             # 内容获取 + 缓存
│   │   ├── library.py             # 书架管理
│   │   └── source_manager.py      # 书源导入/导出/测试
│   ├── tts/
│   │   ├── __init__.py
│   │   ├── base.py                # TTS 抽象接口
│   │   ├── edge_tts.py            # Edge TTS 后端
│   │   ├── sherpa_tts.py          # sherpa-onnx 本地后端
│   │   ├── openai_tts.py          # OpenAI 兼容 API 后端
│   │   └── cache.py               # 音频缓存管理
│   ├── routers/
│   │   ├── books.py               # /api/books/*
│   │   ├── sources.py             # /api/sources/*
│   │   ├── search.py              # /api/search/*
│   │   ├── content.py             # /api/content/*
│   │   ├── tts.py                 # /api/tts/*
│   │   ├── rss.py                 # /api/rss/*
│   │   └── proxy.py               # /api/proxy/* (图片代理)
│   └── utils/
│       ├── text_processor.py      # 文本清洗、分句
│       └── image_proxy.py         # 图片代理 + 缓存
├── frontend/
│   ├── package.json
│   ├── vite.config.ts
│   ├── index.html
│   ├── public/
│   │   └── manifest.json          # PWA manifest
│   └── src/
│       ├── main.tsx
│       ├── App.tsx
│       ├── api/                   # API 客户端
│       ├── components/
│       │   ├── reader/
│       │   │   ├── NovelReader.tsx     # 小说阅读器
│       │   │   ├── MangaReader.tsx     # 漫画阅读器
│       │   │   ├── AudioPlayer.tsx     # 有声书播放器
│       │   │   └── TTSControls.tsx     # TTS 控制面板
│       │   ├── library/
│       │   │   ├── Bookshelf.tsx       # 书架
│       │   │   └── BookCard.tsx        # 书籍卡片
│       │   ├── source/
│       │   │   └── SourceManager.tsx   # 书源管理
│       │   └── common/
│       │       ├── Layout.tsx
│       │       └── ThemeProvider.tsx
│       ├── pages/
│       │   ├── Home.tsx
│       │   ├── Search.tsx
│       │   ├── Explore.tsx
│       │   ├── Read.tsx
│       │   ├── Settings.tsx
│       │   └── RSS.tsx
│       ├── hooks/
│       │   ├── useReadingProgress.ts
│       │   └── useTTS.ts
│       └── stores/                # Zustand 状态管理
│           ├── bookStore.ts
│           ├── readerStore.ts
│           └── settingsStore.ts
└── data/                          # Docker volume 挂载点
    ├── reader.db
    ├── cache/
    │   ├── content/               # 内容缓存
    │   ├── images/                # 图片缓存
    │   └── tts/                   # TTS 音频缓存
    └── sources/                   # 书源 JSON 文件
```

## 核心模块设计

### 1. 书源规则引擎 (engine/)

这是项目最核心的模块，需要兼容 Legado 的规则语法：

```python
# parser.py - 规则调度器
class RuleParser:
    def parse(self, rule: str, content: str, base_url: str) -> str | list:
        """根据规则前缀分发到对应解析器"""
        # @css:selector  → CSSParser
        # //xpath        → XPathParser
        # $.jsonpath     → JSONPathParser
        # <js>code</js>  → JSEngine
        # ##regex        → RegexParser
        # 无前缀         → 默认 JSOUP/CSS
        # rule1@rule2    → RuleChain (管道串联)
```

**关键技术点**：
- 规则链：`@` 分隔多步解析，前一步输出作为后一步输入
- JS 沙盒：用 pyquickjs 执行书源中的 JavaScript，注入 `java.ajax()` / `java.get()` 兼容方法
- 变量插值：`{{key}}` 替换为上下文变量（搜索关键词、页码等）
- searchUrl 解析：支持 GET/POST，`keyword` 和 `page` 替换

### 2. TTS 多后端 (tts/)

```python
# base.py
class TTSEngine(ABC):
    @abstractmethod
    async def synthesize(self, text: str, voice: str) -> AsyncIterator[bytes]:
        """流式生成音频片段"""

    @abstractmethod
    async def list_voices(self) -> list[Voice]:
        """可用音色列表"""
```

**Edge TTS**：免费、中文质量好（晓晓/云扬等），通过 WebSocket 流式获取
**sherpa-onnx**：纯离线，适合隐私需求，中文用 MeloTTS 或 kokoro 模型
**自定义 API**：兼容 OpenAI TTS 接口格式，用户可对接任何服务

**前端播放**：WebSocket 推流 + Web Audio API，支持倍速/跳句

### 3. 前端阅读器

**小说阅读器**：
- 翻页模式（左右滑动）+ 滚动模式
- 字体/字号/行间距/边距可调
- 主题：日间/夜间/护眼/自定义背景色
- TTS 朗读时高亮当前句子
- 阅读进度百分比 + 章节内定位

**漫画阅读器**：
- 条漫模式（上下滚动）+ 页漫模式（左右翻页）
- 双击放大、双指缩放
- 预加载下一页/下一章

**有声书播放器**：
- 标准播放控件 + 倍速
- 定时关闭（15/30/60分钟）
- 章节列表 + 进度条

## 分阶段实施

### Phase 1：骨架 + 书源引擎（本次重点）

**目标**：能导入书源 → 搜索 → 看到章节列表 → 获取正文

创建文件：
- 项目骨架（所有 __init__.py、配置文件、Docker 基础）
- `backend/engine/` 全部文件（规则引擎核心）
- `backend/models/` 数据模型
- `backend/database.py` SQLite 初始化
- `backend/routers/sources.py` 书源 CRUD API
- `backend/routers/search.py` 搜索 API
- `backend/routers/content.py` 内容获取 API
- `backend/main.py` FastAPI 启动
- `docker-compose.yml` + `Dockerfile`
- 前端基础骨架（Vite + React 初始化）

**关键依赖**：
```
# backend
fastapi, uvicorn, aiosqlite, httpx, 
beautifulsoup4, lxml, jsonpath-ng, pyquickjs,
pydantic
```

### Phase 2：前端阅读体验

- 小说阅读器组件（翻页/滚动/主题）
- 书架 + 搜索页面
- 书源管理界面
- 阅读进度持久化

### Phase 3：TTS + 漫画

- TTS 多后端实现
- WebSocket 流式推送音频
- TTS 控制面板 + 句子高亮
- 漫画阅读器组件
- 图片代理 + 缓存

### Phase 4：有声书 + RSS + PWA

- 有声书源解析 + 播放器
- RSS 源管理 + 文章列表
- PWA 离线支持
- docker-compose 完善（健康检查、资源限制）
- 文档

## Phase 1 详细实施步骤

1. 创建 `~/Documents/reader/` 项目目录
2. 初始化后端 Python 项目 + requirements.txt
3. 实现书源规则引擎核心（parser → css/xpath/jsonpath/regex/js）
4. 实现 HTTP fetcher（httpx + 缓存 + 请求头处理）
5. 实现数据模型 + SQLite 初始化
6. 实现 API 路由（sources CRUD、search、content）
7. 创建 Dockerfile + docker-compose.yml
8. 初始化前端 React 项目（Vite + TS）
9. 创建前端基础页面骨架
10. 端到端测试：导入书源 → 搜索 → 获取内容

## 验证方式

1. `docker-compose up` 启动服务
2. 通过 API 导入一个书源 JSON
3. 调用搜索接口验证规则引擎工作
4. 获取章节列表和正文内容
5. 前端能显示搜索结果和正文
