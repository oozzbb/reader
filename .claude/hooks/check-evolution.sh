#!/bin/bash
# Hook: SessionStart
# 检查 FEEDBACK-INDEX.md 是否有需要处理的 feedback

FEEDBACK_INDEX="$CLAUDE_PROJECT_DIR/.claude/feedback/FEEDBACK-INDEX.md"

if [ ! -f "$FEEDBACK_INDEX" ]; then
  exit 0
fi

COUNT=$(grep -c "^- \[" "$FEEDBACK_INDEX" 2>/dev/null)
COUNT=${COUNT:-0}
COUNT=$(echo "$COUNT" | tr -d '[:space:]')

if [ "$COUNT" -ge 3 ] 2>/dev/null; then
  echo "{\"additionalContext\": \"有 ${COUNT} 条 feedback 记录，可能有进化建议。输入 /evolve 查看。\"}"
fi

exit 0
