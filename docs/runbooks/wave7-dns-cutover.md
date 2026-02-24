# Wave 7 DNS + Route Cutover Runbook

Use this runbook to execute `W7-3`.

## Goal

- Switch production traffic to Workers-hosted `telecommut.com`.
- Keep rollback path immediate and testable.

## Preconditions

1. `W7-1` freeze active.
2. `W7-2` delta import verified.
3. `npm run qa:cutover-config` passes.
4. `npx wrangler deploy` completed successfully and version id recorded.

## Cutover Steps

1. In Cloudflare DNS, point apex/`www` records for `telecommut.com` to the Worker route strategy used by your zone setup.
2. In Cloudflare Workers routes, ensure target host patterns are bound to Worker `telecommut`.
3. Wait for propagation and verify with:
   - `dig telecommut.com`
   - `curl -I https://telecommut.com`
4. Confirm response headers and status are from Worker deployment (record version id).

## Immediate Verification

1. `SMOKE_BASE_URL=https://telecommut.com npm run qa:cutover-smoke`
2. `WAVE6_BASE_URL=https://telecommut.com npm run qa:wave6-social`
3. Validate auth and admin checks from `docs/runbooks/release-checklist.md`.

## Rollback

If smoke fails on critical paths:

1. Revert DNS/routes to previous target.
2. Re-run smoke against restored target.
3. Log failure window and request IDs.
4. Escalate to incident runbook: `docs/runbooks/incident-response.md`.

## Exit Criteria for W7-3

- DNS/routes switched to Worker target.
- Smoke checks pass on production domain.
- Rollback path tested or explicitly validated by dry-run procedure.
