#!/usr/bin/env bash
# PostToolUse(Edit|Write|MultiEdit): prettier + eslint --fix on the edited .ts file.
input=$(cat)
file=$(jq -r '.tool_input.file_path // empty' <<<"$input")
[[ "$file" == *.ts && -f "$file" ]] || exit 0

root="${CLAUDE_PROJECT_DIR:-.}"
rel="${file#"$root"/}"
[[ "$rel" == src/* || "$rel" == test/* ]] || exit 0

cd "$root" || exit 0
./node_modules/.bin/prettier --write --log-level warn "$rel" >/dev/null 2>&1
if ! out=$(./node_modules/.bin/eslint --fix "$rel" 2>&1); then
  echo "ESLint errors remain in $rel after --fix:" >&2
  echo "$out" >&2
  exit 2
fi
exit 0
