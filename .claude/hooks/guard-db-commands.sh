#!/usr/bin/env bash
# PreToolUse(Bash): require user confirmation for destructive database commands.
input=$(cat)
cmd=$(jq -r '.tool_input.command // empty' <<<"$input")

if grep -Eq 'schema:drop|migration:(run|revert)|seed:run|typeorm[^|;&]*(schema:drop|migration:run|migration:revert)|docker compose[^|;&]* down[^|;&]*(-v|--volumes)|dropDatabase|DROP (TABLE|DATABASE|SCHEMA)' <<<"$cmd"; then
  jq -n --arg c "$cmd" '{
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "ask",
      permissionDecisionReason: ("Destructive database command — confirm before running: " + $c)
    }
  }'
fi
exit 0
