#!/usr/bin/env bash
# PreToolUse(Edit|Write|MultiEdit): block changes to migrations already committed to git.
input=$(cat)
file=$(jq -r '.tool_input.file_path // empty' <<<"$input")
[[ "$file" == */src/database/migrations/* || "$file" == src/database/migrations/* ]] || exit 0

cd "${CLAUDE_PROJECT_DIR:-.}" || exit 0
if git ls-files --error-unmatch -- "$file" >/dev/null 2>&1; then
  cat >&2 <<MSG
Blocked: $file is a committed migration and may already be applied.
Create a new migration instead:
  npm run migration:generate -- src/database/migrations/<Name>
MSG
  exit 2
fi
exit 0
