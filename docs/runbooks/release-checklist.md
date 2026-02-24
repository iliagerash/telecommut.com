# Release Checklist

## Pre-Deploy

1. `npm run ci:check`
2. `npm run qa:data`
3. `npm run build`
4. Confirm required env vars are present in target environment.

## Deploy

1. `npx wrangler deploy`
2. Validate bindings in deploy output (`DB`, `R2_BUCKET`, `SESSION`).

## Post-Deploy Smoke

1. Public: `/`, `/search/jobs`, `/jobs/1`
2. Auth: `/api/auth/get-session`
3. Admin: `/admin/dashboard`
4. API: `/api/contact` (expect 400 for empty payload), moderation endpoint auth guard (`401` without token)

## Sign-off

- Record deploy version id.
- Record smoke test outcomes.
- Attach links to logs and dashboards.
