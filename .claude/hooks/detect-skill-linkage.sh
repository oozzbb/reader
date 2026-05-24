#!/bin/bash
# Hook: PostToolUse (matcher: Skill)
# 噪音预算原则：hook 输出 ≤ 1 行；详细联动规则在 posttooluse-checklist.md。

INPUT=$(cat)
SKILL=$(echo "$INPUT" | jq -r '.tool_input.skill // empty' 2>/dev/null)

if [ -z "$SKILL" ]; then
  exit 0
fi

CHECKLIST="${CLAUDE_PROJECT_DIR:-.}/.claude/hooks/posttooluse-checklist.md"
[ -f "$CHECKLIST" ] || exit 0

if grep -qE "^## ${SKILL}\b" "$CHECKLIST" 2>/dev/null; then
  echo "{\"additionalContext\": \"【联动】/${SKILL} 完成。如有新增需要同步 → Read .claude/hooks/posttooluse-checklist.md #${SKILL} 段；无新增则跳过。\"}"
fi

exit 0
