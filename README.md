# telecommut.com

Astro + React app for Telecommut.

## Stack

- Astro + React islands
- TailwindCSS + shadcn/ui
- Drizzle ORM (SQLite locally, D1 remotely)
- Cloudflare Workers adapter

## Quick Start

```bash
npm install
cp .env.example .env
bash ./scripts/reset-local-db.sh
npm run db:migrate:local
npm run dev
```

## Scripts

- `npm run dev` - start dev server
- `npm run build` - production build
- `npm run typecheck` - Astro/TS checks
- `npm run lint` - ESLint
- `npm run test` - Vitest
- `npm run db:generate` - generate SQL migrations from schema
- `npm run db:migrate:local` - apply migrations to `LOCAL_SQLITE_PATH`
- `npm run db:migrate:remote` - apply migrations to remote D1
- `npm run db:backfill:categories:local` - backfill category metadata in local DB
- `npm run db:backfill:categories:remote` - backfill category metadata in remote D1

## Notes

- `LOCAL_SQLITE_PATH` is required for local DB operations.
- `wrangler.jsonc` contains your D1/KV/R2 bindings for deployment.
