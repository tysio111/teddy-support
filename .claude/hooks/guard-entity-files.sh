#!/usr/bin/env bash
# PreToolUse(Write): block hand-writing new TypeORM entities / Mongoose schemas.
input=$(cat)
file=$(jq -r '.tool_input.file_path // empty' <<<"$input")
[[ -z "$file" ]] && exit 0

if [[ "$file" =~ /infrastructure/persistence/relational/entities/[^/]+\.entity\.ts$ ||
      "$file" =~ /infrastructure/persistence/document/entities/[^/]+\.schema\.ts$ ]] &&
   [[ ! -e "$file" ]]; then
  cat >&2 <<MSG
Blocked: do not hand-write new entity/schema files ($file).
Use the project generators instead (see the generate skill, .claude/skills/generate/SKILL.md):
  npm run generate:resource:{relational|document|all-db}
  npm run add:property:to-{relational|document|all-db}
MSG
  exit 2
fi
exit 0
