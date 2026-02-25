#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SQL_FILE="$ROOT_DIR/scripts/reset-remote-db.sql"
CONFIG_FILE="$ROOT_DIR/wrangler.jsonc"

echo "Resetting remote D1 database (telecommut-db)..."
npx wrangler d1 execute telecommut-db --remote --config "$CONFIG_FILE" --file "$SQL_FILE"

echo "Verifying remaining tables..."
npx wrangler d1 execute telecommut-db --remote --config "$CONFIG_FILE" --command \
  "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;"
