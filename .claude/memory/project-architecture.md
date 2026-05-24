---
name: project-architecture
description: 阅读器项目技术选型和部署方案
metadata:
  type: project
---

全栈自托管阅读器，支持小说/漫画/有声书/RSS + TTS 朗读。

技术栈：
- 后端：Python 3.11+ / FastAPI / aiosqlite / httpx
- 前端：React 18 + TypeScript + Vite + Zustand
- 数据库：SQLite（单文件，NAS 友好）
- JS 沙盒：pyquickjs（书源规则中的 JS 执行）
- 部署：单容器 Docker

**Why:** 用户试过多个现有方案（hectorqin/reader 等），普遍存在功能不全、UI 粗糙、TTS 缺失等问题。
**How to apply:** 所有架构决策围绕"单容器 + NAS 资源受限"约束展开，不引入重型依赖。
