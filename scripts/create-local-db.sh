#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="$ROOT_DIR/.env"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing .env at $ENV_FILE"
  exit 1
fi

LOCAL_SQLITE_PATH=""
while IFS= read -r line; do
  line="${line#"${line%%[![:space:]]*}"}"
  [[ -z "$line" || "${line:0:1}" == "#" ]] && continue
  if [[ "$line" == LOCAL_SQLITE_PATH=* ]]; then
    value="${line#LOCAL_SQLITE_PATH=}"
    value="${value%\"}"
    value="${value#\"}"
    value="${value%\'}"
    value="${value#\'}"
    LOCAL_SQLITE_PATH="$value"
    break
  fi
done < "$ENV_FILE"

if [[ -z "$LOCAL_SQLITE_PATH" ]]; then
  echo "LOCAL_SQLITE_PATH is required in .env"
  exit 1
fi

mkdir -p "$(dirname "$LOCAL_SQLITE_PATH")"
touch "$LOCAL_SQLITE_PATH"

echo "Local DB file ensured at: $LOCAL_SQLITE_PATH"
