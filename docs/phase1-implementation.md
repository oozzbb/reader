# 自托管阅读器 — 全局实施方案

## 产品定义

部署在 NAS 上的全能阅读器，支持小说 + 漫画 + 有声书 + RSS，兼容 Legado 书源。

### 核心需求清单

| 需求 | 优先级 | 说明 |
|------|--------|------|
| 书源引擎 | P0 | 兼容 Legado JSON 格式，自建执行引擎 |
| 小说阅读 | P0 | 翻页模式 + 滚动模式可切换 |
| 漫画阅读 | P1 | 条漫（上下）+ 页漫（左右）可切换 |
| 多端自适应 | P0 | 响应式一套代码，移动端手势友好 |
| PWA | P0 | 可安装，离线可用 |
| 缓存/下载 | P0 | 自动缓存已读 + 手动下载整本 + 导出 epub/txt |
| TTS 朗读 | P2 | 多后端（Edge/本地/API），句子高亮 |
| 有声书 | P2 | 播放器 + 倍速 + 定时 |
| RSS | P2 | 源管理 + 文章阅读 |

## 全局架构决策

| 决策项 | 结论 | 理由 |
|--------|------|------|
| 引擎策略 | 兼容 Legado JSON，自建执行 | 复用 5400+ 书源选择器，不复刻 Java bridge |
| 前端框架 | React 18 + TypeScript + Vite | 组件化、生态好、PWA 支持成熟 |
| 手势处理 | @use-gesture/react | 翻页滑动、漫画缩放，同时支持触摸和鼠标 |
| 响应式 | Tailwind CSS + 移动优先断点 | 一套代码适配手机/平板/桌面 |
| 离线存储 | Service Worker + IndexedDB (idb-keyval) | 客户端缓存章节内容和图片 |
| PWA | Vite PWA Plugin (vite-plugin-pwa) | 自动生成 SW + manifest |
| 状态管理 | Zustand + persist middleware | 阅读进度/设置持久化到 IndexedDB |
| 导出格式 | ebooklib (epub) + 纯文本拼接 (txt) | 后端生成，前端触发下载 |
| 漫画渲染 | 虚拟滚动 (react-virtuoso) + 预加载 | 条漫长列表性能 |
| 部署 | Docker 单容器 | FastAPI serve 前端构建产物 |

## 前端架构设计（全阶段通用）

### 响应式断点

```
mobile:  < 768px   — 单栏，底部导航，手势操作为主
tablet:  768-1024px — 可选侧边栏，阅读区自适应
desktop: > 1024px  — 侧边栏常驻，阅读区居中最大宽度
```

### 阅读器组件架构

```
<ReaderShell>                    // 响应式容器 + 手势绑定
├── <ReaderToolbar>              // 顶部栏（书名、返回、设置）
├── <ReaderContent>              // 内容区（根据模式切换）
│   ├── <ScrollReader>           // 滚动模式（小说）
│   ├── <PageReader>             // 翻页模式（小说）
│   ├── <WebtoonReader>          // 条漫模式
│   └── <MangaPageReader>        // 页漫模式
├── <ReaderBottomBar>            // 底部栏（进度、章节跳转）
└── <ReaderSettings>             // 设置面板（字体/主题/模式切换）
```

### 小说阅读模式

**滚动模式**：
- 连续滚动，章节无缝衔接
- 滚动到底自动加载下一章
- 进度条显示当前位置百分比

**翻页模式**：
- 左右滑动 / 点击左右区域翻页
- 内容按屏幕尺寸分页（动态计算每页字数）
- 翻页动画（CSS transform，可选开关）
- 支持上下滑动呼出菜单

### 漫画阅读模式

**条漫模式（Webtoon）**：
- 图片垂直拼接，连续滚动
- react-virtuoso 虚拟滚动（只渲染可视区域 ± 预加载区域）
- 预加载当前位置前后 3-5 张图
- 双击放大

**页漫模式（Manga）**：
- 左右翻页（默认从右到左，可设置方向）
- 双页/单页模式（桌面端可选双页并排）
- 捏合缩放 + 双击放大
- 预加载前后 2 页

### 离线与缓存架构

```
┌─────────────────────────────────────────────┐
│                   前端                        │
│                                              │
│  IndexedDB                                   │
│  ├── chapters/    — 已缓存章节文本            │
│  ├── images/      — 已缓存漫画图片            │
│  ├── books/       — 已下载书籍元数据          │
│  └── progress/    — 阅读进度                  │
│                                              │
│  Service Worker                              │
│  ├── 静态资源缓存（App Shell）                │
│  ├── API 响应缓存（stale-while-revalidate）  │
│  └── 图片缓存（cache-first）                 │
└─────────────────────────────────────────────┘
         ↕ sync when online
┌─────────────────────────────────────────────┐
│                   后端                        │
│  ├── content cache (文件系统)                 │
│  ├── image proxy cache                       │
│  └── download queue (整本下载任务)            │
└─────────────────────────────────────────────┘
```

**缓存策略**：
- 已读章节：读完自动存入 IndexedDB，离线可重读
- 预加载：阅读时自动预缓存后续 3 章
- 整本下载：用户手动触发，后端逐章抓取存入服务端 cache，前端同步到 IndexedDB
- 图片：Service Worker cache-first 策略

### PWA 配置

```json
{
  "name": "Reader",
  "short_name": "Reader",
  "display": "standalone",
  "orientation": "any",
  "theme_color": "#1a1a2e",
  "background_color": "#1a1a2e",
  "start_url": "/",
  "scope": "/",
  "icons": [...]
}
```

- `display: standalone` — 隐藏浏览器 UI，像原生 App
- `orientation: any` — 支持横竖屏（漫画横屏阅读）
- 离线回退页面 — 无网络时显示已缓存内容

### 导出功能

**后端接口**：
- `POST /api/books/{id}/export?format=epub` — 生成 epub 文件
- `POST /api/books/{id}/export?format=txt` — 生成 txt 文件
- 异步任务：后端先抓取所有章节 → 拼接 → 生成文件 → 返回下载链接

**epub 生成**：
- 使用 `ebooklib` 库
- 包含：封面、目录、章节内容、元数据（书名、作者）
- 漫画导出为图片 epub

**txt 生成**：
- 按章节拼接纯文本
- UTF-8 编码，章节标题作为分隔

## 分阶段实施

### Phase 1：后端引擎 + 基础阅读（当前）

**目标**：能导入书源 → 搜索 → 阅读小说正文（滚动模式） + PWA 可安装

**后端**：
- FastAPI 基础设施 + SQLite
- 规则引擎（CSS/XPath/JSONPath/Regex/简单 JS）
- 书源管理 + 搜索聚合 + 内容获取 API
- 章节缓存（服务端文件缓存）

**前端**：
- Vite + React + TypeScript + Tailwind + Zustand
- PWA 基础配置（manifest + Service Worker 注册）
- 响应式布局骨架（移动优先）
- 搜索页 + 书源管理页
- 小说阅读器：**先实现滚动模式**（最简路径验证全流程）
- IndexedDB 缓存已读章节
- 基础阅读设置（字号、行间距、主题色）

**不含**：翻页模式、漫画、下载整本、导出、TTS

**验证标准**：
- 5 种书源端到端跑通
- 手机浏览器可安装为 PWA
- 离线可重读已缓存章节
- docker build 成功

### Phase 2：完整阅读体验

**目标**：翻页模式 + 漫画 + 下载 + 导出

- 小说翻页模式（手势 + 动画 + 分页算法）
- 漫画阅读器（条漫 + 页漫双模式）
- 整本下载（后端队列 + 前端进度）
- 导出 epub/txt
- 书架管理（收藏、分类、更新检测）
- 阅读进度同步（多设备通过服务端同步）

### Phase 3：TTS + 有声书 + RSS

- TTS 多后端（Edge/sherpa-onnx/自定义 API）
- WebSocket 流式音频 + 句子高亮
- 有声书源解析 + 播放器
- RSS 源管理 + 文章阅读
- 图片代理 + 防盗链处理增强

### Phase 4：打磨 + 高级功能

- 书源 JS bridge 完整实现（crypto/put/get）
- WebView 规则支持（可选 headless）
- 阅读统计
- 多用户支持（可选）
- 自动更新检测 + 通知

---

## Phase 1 详细技术方案

### 后端

#### 目录结构

```
backend/
├── __init__.py
├── main.py              # FastAPI 入口
├── config.py            # Pydantic Settings
├── database.py          # aiosqlite + 建表
├── requirements.txt
├── models/
│   ├── __init__.py
│   ├── source.py        # 书源模型
│   ├── book.py          # 书籍 + 章节
│   └── user.py          # 设置 + 进度
├── engine/
│   ├── __init__.py
│   ├── parser.py        # 规则调度器
│   ├── css_parser.py    # CSS/JSOUP
│   ├── xpath_parser.py  # XPath
│   ├── jsonpath_parser.py
│   ├── regex_parser.py
│   ├── js_engine.py     # QuickJS 沙盒
│   ├── rule_chain.py    # 规则链
│   ├── url_parser.py    # URL 构造
│   └── fetcher.py       # HTTP + 缓存 + 编码
├── services/
│   ├── __init__.py
│   ├── source_manager.py
│   ├── search.py        # 多源并发搜索
│   └── content.py       # 目录 + 正文
└── routers/
    ├── __init__.py
    ├── sources.py
    ├── search.py
    ├── books.py
    └── content.py
```

#### 核心依赖

```
fastapi>=0.104
uvicorn[standard]>=0.24
aiosqlite>=0.19
httpx>=0.25
beautifulsoup4>=4.12
lxml>=4.9
jsonpath-ng>=1.6
quickjs>=1.19  # pyquickjs
pydantic>=2.5
pydantic-settings>=2.1
charset-normalizer>=3.3
```

#### 规则引擎设计

引擎策略：读 Legado 格式，自建执行。

**parser.py 规则分发**：
```python
async def parse_rule(rule: str, content: str | dict, base_url: str, context: dict) -> str | list[str]:
    """
    rule 前缀决定解析器：
    - @css: / 无前缀 → css_parser (JSOUP 兼容)
    - // / @xpath:   → xpath_parser
    - $. / @json:    → jsonpath_parser
    - ##             → regex_parser
    - <js> / @js:    → js_engine
    - 含 && / ||     → rule_chain (组合)
    """
```

**js_engine.py 最小 bridge**：
```python
BRIDGE = {
    "java.ajax": async_http_get,
    "java.get": async_http_get,
    "java.post": async_http_post,
    "java.base64Encode": base64_encode,
    "java.base64Decode": base64_decode,
    "java.log": noop,
}
```

**fetcher.py 要点**：
- httpx.AsyncClient 连接池
- charset-normalizer 自动编码检测
- 文件系统缓存（configurable TTL）
- 自定义 UA / headers / proxy
- 重试策略（3 次指数退避）

#### API 设计

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/sources/import | 批量导入书源 JSON |
| GET | /api/sources | 书源列表 |
| PUT | /api/sources/{url}/toggle | 启用/禁用 |
| DELETE | /api/sources/{url} | 删除 |
| GET | /api/search?keyword= | 多源聚合搜索 |
| GET | /api/books/{id}/info | 书籍详情 |
| GET | /api/books/{id}/chapters | 章节列表 |
| GET | /api/content/{book_id}/{chapter_idx} | 章节正文 |

统一响应：`{ "code": 0, "message": "success", "data": {} }`

### 前端

#### 目录结构

```
frontend/
├── package.json
├── vite.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── index.html
├── public/
│   ├── manifest.json
│   └── icons/
└── src/
    ├── main.tsx
    ├── App.tsx
    ├── sw.ts                    # Service Worker
    ├── api/
    │   └── client.ts            # fetch 封装
    ├── components/
    │   ├── common/
    │   │   ├── Layout.tsx       # 响应式壳（顶部栏 + 底部导航）
    │   │   └── BottomNav.tsx    # 移动端底部导航
    │   └── reader/
    │       ├── ReaderShell.tsx   # 阅读器容器
    │       ├── ScrollReader.tsx  # 滚动模式
    │       └── ReaderSettings.tsx # 设置面板
    ├── pages/
    │   ├── Home.tsx             # 搜索入口
    │   ├── Search.tsx           # 搜索结果
    │   ├── BookDetail.tsx       # 书籍详情 + 章节列表
    │   ├── Read.tsx             # 阅读页
    │   └── Sources.tsx          # 书源管理
    ├── hooks/
    │   ├── useReadingProgress.ts
    │   └── useOfflineCache.ts
    └── stores/
        ├── bookStore.ts         # 搜索 + 书籍数据
        ├── readerStore.ts       # 阅读状态 + 设置
        └── cacheStore.ts        # 离线缓存状态
```

#### 核心依赖

```json
{
  "dependencies": {
    "react": "^18.3",
    "react-dom": "^18.3",
    "react-router-dom": "^6.20",
    "zustand": "^4.4",
    "idb-keyval": "^6.2",
    "@use-gesture/react": "^10.3",
    "react-virtuoso": "^4.6"
  },
  "devDependencies": {
    "vite": "^5.4",
    "vite-plugin-pwa": "^0.17",
    "tailwindcss": "^3.4",
    "typescript": "^5.3",
    "@types/react": "^18.2"
  }
}
```

#### Phase 1 前端范围

| 页面 | 功能 | 移动端 | 桌面端 |
|------|------|--------|--------|
| Home | 搜索框 + 最近阅读 | 全屏搜索框 | 居中搜索 + 侧边最近 |
| Search | 结果列表 | 卡片列表 | 网格 + 列表切换 |
| BookDetail | 详情 + 章节列表 | 全屏 | 左详情右章节 |
| Read | 滚动阅读 + 设置 | 全屏沉浸 | 居中阅读区（max-width） |
| Sources | 导入/列表/管理 | 列表 | 表格 |

#### 阅读设置（Phase 1）

- 字号：14-28px 可调
- 行间距：1.5-2.5 可调
- 主题：亮色 / 暗色 / 护眼（米黄底）
- 边距：小/中/大
- 字体：系统默认（后续可加自定义字体）

### Docker

```dockerfile
# Stage 1: Frontend build
FROM node:20-alpine AS frontend-build
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ .
RUN npm run build

# Stage 2: Runtime
FROM python:3.11-slim
WORKDIR /app
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY backend/ ./backend/
COPY --from=frontend-build /app/frontend/dist ./static/
EXPOSE 8080
VOLUME ["/app/data"]
CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8080"]
```

### 测试

#### 后端测试

```
tests/
├── conftest.py          # fixtures（测试书源、mock 响应）
├── test_css_parser.py
├── test_xpath_parser.py
├── test_jsonpath_parser.py
├── test_regex_parser.py
├── test_js_engine.py
├── test_rule_chain.py
├── test_url_parser.py
├── test_search.py       # 集成测试（真实书源）
└── test_content.py      # 集成测试
```

#### 验证书源类型

| # | 类型 | 规则特征 | 验证 |
|---|------|----------|------|
| 1 | 纯 CSS | JSOUP 选择器 | 搜索→目录→正文 |
| 2 | XPath | XPath 表达式 | 搜索→目录→正文 |
| 3 | JSON API | JSONPath | 搜索→目录→正文 |
| 4 | 带 JS | `<js>` 处理 | 搜索→目录→正文 |
| 5 | 正则 | `##regex` | 正文提取 |

#### Phase 1 完成标准

- [ ] 5 个测试书源搜索→阅读流程跑通
- [ ] pytest 覆盖引擎核心（单元测试）
- [ ] 手机浏览器可安装 PWA
- [ ] 离线可重读已缓存章节（IndexedDB）
- [ ] 响应式：手机端和桌面端布局正确
- [ ] docker build 成功 + 容器正常运行
- [ ] 搜索响应 < 10s

## 风险与对策

| 风险 | 概率 | 影响 | 对策 |
|------|------|------|------|
| pyquickjs 语法兼容性 | 中 | 部分 JS 书源不可用 | 备选 dukpy；Phase 1 只需简单 JS |
| JSOUP 语法适配 | 中 | CSS 书源解析失败 | 参考 Legado 源码写适配层 |
| 网站反爬 | 高 | 请求被拦截 | 自定义 UA/headers + 后续代理池 |
| 翻页分页算法 | 中 | Phase 2 难点 | Phase 1 不做翻页，Phase 2 专项攻克 |
| IndexedDB 存储上限 | 低 | 下载整本时空间不足 | 存储管理 + 用户提示 |
| epub 生成质量 | 低 | 格式/排版问题 | 使用成熟库 ebooklib |

## 文件变更清单（Phase 1）

新增约 35 个文件：

```
# 后端（19 个）
backend/__init__.py
backend/main.py
backend/config.py
backend/database.py
backend/requirements.txt
backend/models/__init__.py
backend/models/source.py
backend/models/book.py
backend/models/user.py
backend/engine/__init__.py
backend/engine/parser.py
backend/engine/css_parser.py
backend/engine/xpath_parser.py
backend/engine/jsonpath_parser.py
backend/engine/regex_parser.py
backend/engine/js_engine.py
backend/engine/rule_chain.py
backend/engine/url_parser.py
backend/engine/fetcher.py
backend/services/__init__.py
backend/services/source_manager.py
backend/services/search.py
backend/services/content.py
backend/routers/__init__.py
backend/routers/sources.py
backend/routers/search.py
backend/routers/books.py
backend/routers/content.py

# 前端（15 个）
frontend/package.json
frontend/vite.config.ts
frontend/tailwind.config.ts
frontend/tsconfig.json
frontend/index.html
frontend/public/manifest.json
frontend/src/main.tsx
frontend/src/App.tsx
frontend/src/sw.ts
frontend/src/api/client.ts
frontend/src/components/common/Layout.tsx
frontend/src/components/common/BottomNav.tsx
frontend/src/components/reader/ReaderShell.tsx
frontend/src/components/reader/ScrollReader.tsx
frontend/src/components/reader/ReaderSettings.tsx
frontend/src/pages/Home.tsx
frontend/src/pages/Search.tsx
frontend/src/pages/BookDetail.tsx
frontend/src/pages/Read.tsx
frontend/src/pages/Sources.tsx
frontend/src/hooks/useReadingProgress.ts
frontend/src/hooks/useOfflineCache.ts
frontend/src/stores/bookStore.ts
frontend/src/stores/readerStore.ts
frontend/src/stores/cacheStore.ts

# 部署 + 测试（3 个）
Dockerfile
tests/conftest.py
tests/test_engine.py
```
