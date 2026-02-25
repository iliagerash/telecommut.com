#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="$ROOT_DIR/.env"

echo "Resetting local DB state..."

# Load LOCAL_SQLITE_PATH from .env.
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

if [[ "$LOCAL_SQLITE_PATH" = /* ]]; then
  DB_PATH="$LOCAL_SQLITE_PATH"
else
  DB_PATH="$ROOT_DIR/$LOCAL_SQLITE_PATH"
fi

if [[ -f "$DB_PATH" ]]; then
  rm -f "$DB_PATH"
  echo "Deleted LOCAL_SQLITE_PATH DB: $DB_PATH"
else
  echo "LOCAL_SQLITE_PATH not found (skip): $DB_PATH"
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

mkdir -p "$(dirname "$DB_PATH")"
touch "$DB_PATH"
echo "Created local DB file: $DB_PATH"

echo "Local DB reset complete."
