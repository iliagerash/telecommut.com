# Intermediate Parity Audit (telecommut.old vs telecommut.com)

Run this audit before production DNS cutover.

## Objective

- Verify functional parity for critical legacy surfaces.
- Identify P0/P1 blockers that must be closed before `W7-3`.

## Inputs

- Legacy map: `legacy_view_matrix.md`
- New app preview URL (Workers): `https://telecommut.iliagerash.workers.dev`
- Legacy app URL (current production/old)

## 1) Automated Baseline

From `telecommut.com`:

1. `npm run ci:check`
2. `SMOKE_BASE_URL=https://telecommut.iliagerash.workers.dev npm run qa:cutover-smoke`
3. `WAVE6_BASE_URL=https://telecommut.iliagerash.workers.dev npm run qa:wave6-social`

Record pass/fail outputs.

## 2) Functional Parity Sweep (Manual Side-by-Side)

For each row in `legacy_view_matrix.md` with Priority `P0` or `P1`:

1. Open legacy and new URLs side-by-side.
2. Compare:
   - route availability/status behavior
   - critical content blocks
   - form behavior (if present)
   - auth/authorization behavior
   - SEO-critical metadata where applicable
3. Record one of:
   - `PARITY_OK`
   - `PARITY_GAP_NON_BLOCKING`
   - `PARITY_GAP_BLOCKING`

## 3) Minimum Required Coverage Before W7-3

Must be explicitly validated:

- Public: home, jobs search, resumes search, contact, help, legal pages
- Auth: sign up/sign in/reset/verify endpoints and user-facing flows
- Core entities: job detail, resume detail
- Admin: dashboard/jobs/resumes/users/seo/traffic route access behavior
- Jobs API controls: cron/manual command auth + idempotency behavior

## 4) Blocking Criteria

`W7-3` remains blocked if any of the following is true:

- Any `PARITY_GAP_BLOCKING` exists on a `P0` item.
- Any critical auth flow is unverified.
- Any required route returns unexpected 5xx or broken access control behavior.

## 5) Audit Output Artifact

Create `docs/audits/intermediate-parity-audit-YYYY-MM-DD.md` containing:

- environment URLs tested
- command outputs (automated baseline)
- P0/P1 checklist with status per item
- blocker list with owner + ETA
- explicit go/no-go recommendation for `W7-3`
