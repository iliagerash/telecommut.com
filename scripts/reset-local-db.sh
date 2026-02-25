#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="$ROOT_DIR/.env"

echo "Resetting local DB state..."

# Load LOCAL_SQLITE_PATH from .env if present.
LOCAL_SQLITE_PATH=""
if [[ -f "$ENV_FILE" ]]; then
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
fi

if [[ -n "$LOCAL_SQLITE_PATH" ]]; then
  if [[ -f "$LOCAL_SQLITE_PATH" ]]; then
    rm -f "$LOCAL_SQLITE_PATH"
    echo "Deleted LOCAL_SQLITE_PATH DB: $LOCAL_SQLITE_PATH"
  else
    echo "LOCAL_SQLITE_PATH not found (skip): $LOCAL_SQLITE_PATH"
  fi
fi

DEFAULT_DB_PATH="$ROOT_DIR/db/telecommut.db"
if [[ -f "$DEFAULT_DB_PATH" ]]; then
  rm -f "$DEFAULT_DB_PATH"
  echo "Deleted default DB: $DEFAULT_DB_PATH"
fi

# Legacy cleanup in case an old root-level DB still exists.
if [[ -f "$ROOT_DIR/telecommut.db" ]]; then
  rm -f "$ROOT_DIR/telecommut.db"
  echo "Deleted legacy fallback DB: $ROOT_DIR/telecommut.db"
fi

if [[ -d "$ROOT_DIR/.wrangler/state/v3/d1" ]]; then
  rm -rf "$ROOT_DIR/.wrangler/state/v3/d1"
  echo "Deleted local Wrangler D1 state: $ROOT_DIR/.wrangler/state/v3/d1"
fi

echo "Local DB reset complete."
