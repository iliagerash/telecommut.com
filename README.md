# telecommut.com

Astro + React application for Telecommut, with MySQL + Drizzle ORM and a set of Node `.mjs` maintenance scripts.

## Stack

- Astro 5 + React islands (`@astrojs/react`)
- Node adapter (`@astrojs/node`)
- Tailwind CSS + shadcn/ui
- MySQL + Drizzle ORM
- Better Auth
- Vitest + ESLint + Astro check

## Project Layout

- `src/` app pages, components, services, API routes
- `src/db/` Drizzle schema and db helpers
- `src/lib/indexing.mjs` shared Google Indexing + Bing IndexNow helpers
- `scripts/` operational/cron scripts
- `public/` static assets and generated sitemap XML files
- `drizzle/` SQL migrations + metadata
- `logs/` generated reports/log artifacts

## Quick Start

```bash
npm install
cp .env.example .env
npm run db:migrate
npm run dev
```

## App Commands

- `npm run dev` start dev server
- `npm run build` build production bundle
- `npm run start` run Node server from `dist`
- `npm run preview` Astro preview
- `npm run typecheck` Astro + TS checks
- `npm run lint` ESLint
- `npm run test` Vitest
- `npm run ci:check` typecheck + lint + test
- `npm run db:generate` generate Drizzle migration SQL
- `npm run db:migrate` apply migrations
- `npm run db:studio` open Drizzle Studio

## Configuration

Copy `.env.example` to `.env` and fill in values for your environment.

## Operational Scripts (Node, no package.json wrappers)

Run from project root with `node scripts/<name>.mjs`.

- `scripts/import.mjs [--dry-run]`
  - Imports jobs from AGG source DBs (`usa`, `canada`) into local `jobs`.
  - Maps categories/contracts, stores export markers, downloads/stores employer logos, updates `job_logos`.
  - Submits newly imported URLs to Google Indexing + Bing IndexNow only when `PUBLIC_APP_URL` is set and valid.
- `scripts/process.mjs [--dry-run]`
  - Finds duplicate jobs (`position`, `company_name`, `category_id`) and expires them.
- `scripts/daily.mjs`
  - Moves expired jobs to `job_removals`, removes redirect rows (if table exists), deletes expired jobs.
  - Sends Google `URL_DELETED` notifications for removed job URLs when `PUBLIC_APP_URL` is set.
- `scripts/weekly.mjs`
  - Cleans stale `job_logos` rows and removes orphan employer logo files from `public/images/employers`.
- `scripts/cloudflare.mjs`
  - Pulls Cloudflare firewall events for the last 12-hour window and upserts into `cloudflare_events`.
  - Filters by `MAIN_DOMAIN`.
- `scripts/analyze.mjs [--log-file=/var/log/nginx/<host>-access.log.1]`
  - Parses nginx access logs + Cloudflare events, computes bypass/false-positive analysis, writes `direct_traffic`.
  - Inserts crawler metrics to remote AGG analyze DB when AGG connection vars are present.
  - Default log file: `/var/log/nginx/<MAIN_DOMAIN>-access.log.1`.
- `scripts/google.mjs [-t6] [info]`
  - Google resubmission flow for recent jobs.
  - Supports only compact `-t` format (`-t6`) and positional `info`.
  - Without `info`, submits uncrawled URLs via Google Indexing (requires valid `PUBLIC_APP_URL`).
- `scripts/bing.mjs [-t6] [info]`
  - Bing resubmission flow for recent jobs.
  - Supports only compact `-t` format (`-t6`) and positional `info`.
  - Without `info`, submits uncrawled URLs via Bing IndexNow (requires valid `PUBLIC_APP_URL` and production/API key conditions in helper).
- `scripts/seo.mjs [bing]`
  - Default mode: Google URL Inspection for `seo_pages` and high-volume `categories`, updates coverage/crawl fields.
  - `bing` mode: Bing Webmaster `GetUrlInfo`, updates Bing crawl timestamps.
  - Uses batched Google inspections and `MAIN_DOMAIN`-derived base URL.
- `scripts/reindex.mjs [bing]`
  - Default mode: finds low-performing SEO pages/categories and resubmits to Google + Bing.
  - `bing` mode: Bing-only reindex set.
- `scripts/sitemap.mjs`
  - Generates two sitemap files in `public/`: main + categories.
  - Uses `MAIN_DOMAIN` for URL generation.
  - Filenames from `SITEMAP_MAIN` and `SITEMAP_CATEGORIES`.
  - Pings Google/Bing after generation (Google gated by `GOOGLE_SERVICE_ENABLED`).
- `scripts/migrate-data.mjs [--dry-run] [--batch-size=100] [--report=./path.json]`
  - One-time/utility MySQL-to-MySQL data migration and backfill report generator.

## Admin Panel Indexing Hook

Job approval endpoint (`src/pages/api/admin/jobs/approve.ts`) submits approved job URLs to:

- Google Indexing API
- Bing IndexNow

Submission runs only if `PUBLIC_APP_URL` is configured with a valid URL.

## Recommended Cron Schedule

- `18,48 * * * *` -> `node scripts/import.mjs`
- `45 4,12,20 * * *` -> `node scripts/sitemap.mjs`
- `58 1 * * *` -> `node scripts/daily.mjs`
- `58 5 * * 0` -> `node scripts/weekly.mjs`
- `8 2 * * *` -> `node scripts/analyze.mjs`
- `18 2 * * *` -> `node scripts/seo.mjs`
- `8 0,12 * * *` -> `node scripts/cloudflare.mjs`

## Notes

- `.env` is ignored in git; keep secrets only there.
- `google_indexing.json` is ignored in git.
- `public/*.xml` is ignored in git (generated sitemap files).
- User/employer images are stored under `public/images/`.
