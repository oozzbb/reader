---
name: project-tts-backends
description: TTS 多后端方案：Edge TTS 主力 + sherpa-onnx 离线 + 自定义 API 扩展
metadata:
  type: project
---

TTS 朗读是核心差异化功能，采用多后端可切换架构。

后端优先级：
1. Edge TTS（主力）：免费、中文质量好（晓晓/云扬等声音），通过 WebSocket 流式获取
2. sherpa-onnx（离线）：纯本地执行，隐私需求场景
3. 自定义 API：兼容 OpenAI TTS 接口格式，用户可对接任何第三方服务

前端播放：WebSocket 推流 + Web Audio API，支持倍速/跳句/句子高亮

**Why:** 单一 TTS 方案不可靠（Edge TTS 是非官方接口可能失效），需要可降级。
**How to apply:** TTS 模块设计为抽象接口 + 多实现，新增后端只需实现接口即可接入。
