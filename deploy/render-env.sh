#!/usr/bin/env bash
# Renders every parameter under $SSM_PATH (SecureString values decrypted) into
# an env file for docker compose: /teddy-support/prod/FOO -> FOO='value'.
set -euo pipefail

SSM_PATH="${SSM_PATH:?SSM_PATH is required, e.g. /teddy-support/prod/}"
OUT="${1:-.env.prod}"

umask 077
tmp="$(mktemp "${OUT}.XXXXXX")"
trap 'rm -f "$tmp"' EXIT

aws ssm get-parameters-by-path \
  --path "$SSM_PATH" \
  --recursive \
  --with-decryption \
  --output json \
  | jq -r '.Parameters[] | [.Name, .Value] | @tsv' \
  | while IFS=$'\t' read -r name value; do
      key="${name##*/}"
      # jq's @tsv escapes tabs/newlines/backslashes; those can't be expressed
      # in a single-quoted env_file value, so fail instead of mangling them.
      if [[ "$value" == *"'"* || "$value" == *'\'* ]]; then
        echo "render-env: $key contains a quote, backslash or newline" >&2
        exit 1
      fi
      # Single quotes: compose takes the value literally (no $ interpolation).
      printf "%s='%s'\n" "$key" "$value"
    done > "$tmp"

if [[ ! -s "$tmp" ]]; then
  echo "render-env: no parameters found under $SSM_PATH" >&2
  exit 1
fi

mv "$tmp" "$OUT"
trap - EXIT
echo "render-env: wrote $(wc -l < "$OUT" | tr -d " ") variables to $OUT"
