---
name: project-cicd
description: CI/CD 流程：GitHub Actions 构建 → Docker Hub 推送 → SSH NAS 部署
metadata:
  type: project
---

部署流水线：
1. 代码 push 到 GitHub
2. GitHub Actions 执行：lint → pytest → 前端测试 → docker build & push
3. 镜像上传到 Docker Hub
4. SSH 登录 NAS，pull 新镜像并重启容器

**Why:** 用户的 NAS 是生产环境，需要可靠的自动化部署避免手动操作出错。
**How to apply:** Dockerfile 和 CI 配置在 Phase 1 就搭好骨架，后续每个功能开发完直接走流水线验证。
