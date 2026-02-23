# telecommut.com

Greenfield migration target for `telecommut.old`.

Stack:
- Astro + React islands
- TailwindCSS + shadcn/ui
- Cloudflare Workers runtime
- Drizzle ORM
- D1 (production) + SQLite (local dev/tests)

## Quick Start

```bash
npm install
cp .env.example .env
npm run db:migrate:sqlite
npm run dev
```

## Database Workflow

- Generate SQL migration files from schema changes:

```bash
npm run db:generate
```

- Apply migrations to local SQLite (`.local/telecommut.db`):

```bash
npm run db:migrate:sqlite
```

- Apply migrations to D1 local simulator:

```bash
npm run db:migrate:d1:local
```

- Apply migrations to remote D1:

```bash
npm run db:migrate:d1:remote
```

## Config Notes

- `wrangler.jsonc` contains placeholder IDs for `D1`, `KV`, and `R2`; replace them before deploy.
- `.env.example` defines the baseline contract for DB, auth, Mailgun, and cron job security.
