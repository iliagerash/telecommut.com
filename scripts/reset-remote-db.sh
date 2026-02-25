#!/usr/bin/env bash
set -euo pipefail

npx wrangler d1 execute telecommut-db --remote --file ./scripts/reset-remote-db.sql
