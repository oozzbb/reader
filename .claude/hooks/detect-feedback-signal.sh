#!/bin/bash
# Hook: UserPromptSubmit
# 检测用户 prompt 中的修正/犯错信号，分两级：
# - Level 2（严重）：用户要求回滚/明确说效果差/做错了 → 提醒保存"结构化复盘 memory" + 派发 feedback-observer
# - Level 1（一般）：纠正做法但不至于回滚 → 仅派发 feedback-observer

INPUT=$(cat)
PROMPT=$(echo "$INPUT" | jq -r '.prompt // empty' 2>/dev/null)

if [ -z "$PROMPT" ]; then
  exit 0
fi

# Level 2：严重犯错——回滚/撤回/明确表达效果差/全删重来
if echo "$PROMPT" | grep -qE "回滚|撤回|还原|改回去|恢复原来|太丑|好丑|太烂|做错了|搞砸了|全删|重来|废了|不能用"; then
  echo '{"additionalContext": "⚠️ 检测到严重犯错信号。处理完用户请求后：1) 保存犯错复盘到 memory（type: feedback，含现象/Why/How to apply）2) 派发 feedback-observer 记录。"}'
  exit 0
fi

# Level 1：一般修正——纠正做法但不至于需要回滚
if echo "$PROMPT" | grep -qE "不是这样|别这样做|你搞错|搞错了|你错了|不应该|你漏了|你忘了|不合理|你理解错|我说的不是|没有执行|没有生效|你又忘|强调了|说过了|提醒过|每次都|我不是让你|不要这样"; then
  echo '{"additionalContext": "检测到修正信号。处理完用户请求后派发 feedback-observer 记录。"}'
  exit 0
fi

exit 0
