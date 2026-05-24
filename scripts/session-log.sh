#!/bin/bash
# Session 日志脚本（Stop hook）
# 每次 session 结束时自动运行，记录变更快照

PROJECT_NAME="${PWD##*/}"
LOG_DIR="dev-log"
DATE=$(date +"%Y-%m-%d")
TIME=$(date +"%H:%M")
WINDOW_MIN=120

SESSION_NUM=1
while [ -f "$LOG_DIR/${DATE}-session-${SESSION_NUM}.md" ]; do
    SESSION_NUM=$((SESSION_NUM + 1))
done
LOG_FILE="$LOG_DIR/${DATE}-session-${SESSION_NUM}.md"

mkdir -p "$LOG_DIR"

scan_changes() {
    local dir="$1"
    [ -d "$dir" ] || return 0
    find "$dir" -type f \( -name "*.md" -o -name "*.sh" -o -name "*.py" -o -name "*.json" \) \
        -mmin -"$WINDOW_MIN" 2>/dev/null | sort
}

MEMORY_CHANGES=$(scan_changes ".claude/memory")
AGENT_CHANGES=$(scan_changes ".claude/agents")
SKILL_CHANGES=$(scan_changes ".claude/skills")
HOOK_CHANGES=$(scan_changes ".claude/hooks")

count_lines() {
    [ -z "$1" ] && echo 0 || echo "$1" | grep -c "."
}

cat > "$LOG_FILE" << HEADER
## ${DATE} Session #${SESSION_NUM}
- **项目**: ${PROJECT_NAME}
- **结束时间**: ${TIME}
HEADER

write_section() {
    local title="$1"
    local files="$2"
    [ -z "$files" ] && return
    local count=$(count_lines "$files")
    {
        echo ""
        echo "### ${title} (${count})"
        echo "$files" | while read -r f; do
            [ -n "$f" ] && echo "- \`$f\`"
        done
    } >> "$LOG_FILE"
}

write_section "Memory 变更" "$MEMORY_CHANGES"
write_section "Agents 变更" "$AGENT_CHANGES"
write_section "Skills 变更" "$SKILL_CHANGES"
write_section "Hooks 变更" "$HOOK_CHANGES"

if git rev-parse --is-inside-work-tree &>/dev/null; then
    CURRENT_BRANCH=$(git branch --show-current 2>/dev/null || echo "unknown")
    UNCOMMITTED=$(git status --porcelain 2>/dev/null | wc -l | tr -d ' ')
    RECENT_COMMITS=$(git log --oneline --since="${WINDOW_MIN} minutes ago" 2>/dev/null)

    if [ -n "$RECENT_COMMITS" ] || [ "$UNCOMMITTED" -gt 0 ]; then
        {
            echo ""
            echo "### Git 状态"
            echo "- 分支: ${CURRENT_BRANCH}"
            echo "- 未提交: ${UNCOMMITTED} files"
            if [ -n "$RECENT_COMMITS" ]; then
                echo '```'
                echo "$RECENT_COMMITS"
                echo '```'
            fi
        } >> "$LOG_FILE"
    fi
fi

cat >> "$LOG_FILE" << FOOTER

### 下次继续
- [ ] （待填写）

---
*自动生成于 ${DATE} ${TIME}*
FOOTER

echo "📝 Session 日志已保存: ${LOG_FILE}"
