#!/usr/bin/env bash
# PostToolUse(Edit|Write|MultiEdit|Bash): remind to generate a migration after relational schema changes.
# DATABASE_SYNCHRONIZE=false, so migrations are the only way schema reaches Postgres.
input=$(cat)
tool=$(jq -r '.tool_name // empty' <<<"$input")
reason=""

if [[ "$tool" == "Bash" ]]; then
  cmd=$(jq -r '.tool_input.command // empty' <<<"$input")
  if grep -Eq 'generate:resource:(relational|all-db)|add:property:to-(relational|all-db)' <<<"$cmd"; then
    reason="A generator just changed relational entities."
  fi
else
  file=$(jq -r '.tool_input.file_path // empty' <<<"$input")
  if [[ "$file" =~ /persistence/relational/entities/[^/]+\.entity\.ts$ ]]; then
    reason="A TypeORM entity was modified ($file)."
  fi
fi

[[ -z "$reason" ]] && exit 0
jq -n --arg r "$reason" '{
  hookSpecificOutput: {
    hookEventName: "PostToolUse",
    additionalContext: ($r + " DATABASE_SYNCHRONIZE=false, so a migration is required once entity changes are done: npm run migration:generate -- src/database/migrations/<Name> (then consider the migration-reviewer agent). Skip if this change does not affect the DB schema or a migration was already generated for it.")
  }
}'
exit 0
