# Release Checklist

## Pre-Deploy

1. `npm run ci:check`
2. `npm run qa:data`
3. `npm run build`
4. Confirm required env vars are present in target environment.
5. Execute freeze/announcement prep from `docs/runbooks/wave7-cutover-freeze.md`.
6. Execute final delta plan from `docs/runbooks/wave7-delta-import.md`.

## Deploy

1. `npx wrangler deploy`
2. Validate bindings in deploy output (`DB`, `R2_BUCKET`, `SESSION`).
3. `npm run qa:cutover-config`
4. Execute DNS/route switch steps from `docs/runbooks/wave7-dns-cutover.md`.

## Post-Deploy Smoke

1. `SMOKE_BASE_URL=https://telecommut.iliagerash.workers.dev npm run qa:cutover-smoke`
2. Public: `/`, `/search/jobs`, `/jobs/1`
3. Auth: `/api/auth/get-session`
4. Admin: `/admin/dashboard`
5. API: `/api/contact` (expect 400 for empty payload), moderation endpoint auth guard (`401` without token)
6. Run Wave 6 manual checks from `docs/runbooks/wave6-accessibility-social-checklist.md`.

## Sign-off

- Record deploy version id.
- Record smoke test outcomes.
- Attach links to logs and dashboards.
