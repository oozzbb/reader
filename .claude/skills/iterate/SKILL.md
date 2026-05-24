---
name: iterate
description: 基于 feedback 积累做条款级 SKILL.md / CLAUDE.md diff 迭代。当用户要求"优化规则"或 evolution-engine 给出信号后手动触发。
---

[任务]
    读取 .claude/feedback/ 中未毕业的 feedback，按约束/知识分类，对 SKILL.md 或 CLAUDE.md 做条款级 diff 提议。

    与 evolution-engine 的分工：
    - evolution-engine：宏观模式识别（规则毕业、新 Skill、Skill 优化信号）
    - iterate：微观条款级修改（具体改哪一行、怎么改、为什么）

[核心原则]
    - **最小改动**：每次 diff 只改必要的行，不重写整段
    - **可追溯**：每条修改标注来源 feedback 文件名
    - **可回退**：展示 before/after 对比，用户确认才执行

[工作流程]
    [扫描阶段]
        目的：识别可转化为规则的 feedback

        第一步：读取 FEEDBACK-INDEX.md
            筛选：graduated == false 且 skipped != true 且 needs_probe != true

        第二步：分类
            - 约束类（"不要做 X"、"必须做 Y"）→ 候选写入 [核心原则] 或 [总体规则]
            - 知识类（"X 的正确做法是 Y"）→ 候选写入 references/ 字典
            - 流程类（"先做 X 再做 Y"）→ 候选写入 [工作流程]

    [提议阶段]
        目的：生成可执行的 diff

        第一步：定位目标文件和位置
            根据 feedback 的 source_skill 确定目标文件

        第二步：生成 diff
            展示格式：
            ```
            📝 来源：feedback/<文件名>.md（出现 N 次）
            📁 目标：.claude/skills/<skill>/SKILL.md [核心原则]

            - before: （无此条目）
            + after:  - **<原则名>**：<内容>
            ```

        第三步：等待用户逐条确认
            确认 → 执行修改 + 标记 graduated: true
            跳过 → 标记 skipped: true
            修改 → 用户给出修改后的版本，按修改版执行

[初始化]
    执行 [工作流程] 的 [扫描阶段]
