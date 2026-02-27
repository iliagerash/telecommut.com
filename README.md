# telecommut.com

Astro + React app for Telecommut.

## Stack

- Astro + React islands
- TailwindCSS + shadcn/ui
- Drizzle ORM (MySQL)
- Cloudflare Workers adapter

## Quick Start

```bash
npm install
cp .env.example .env
npm run db:migrate
npm run dev
```

## Scripts

- `npm run dev` - start dev server
- `npm run build` - production build
- `npm run typecheck` - Astro/TS checks
- `npm run lint` - ESLint
- `npm run test` - Vitest
- `npm run db:generate` - generate SQL migrations from schema
- `npm run db:migrate` - apply migrations to `DATABASE_URL`
- `npm run db:backfill:categories` - backfill category metadata in MySQL DB

## Notes

- `DATABASE_URL` is required for DB operations.
- `wrangler.jsonc` contains your D1/KV/R2 bindings for deployment.
