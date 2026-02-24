# Schema Normalization Plan (Post-Parity / Wave 5)

Status: In progress. Phase C cutover started on February 24, 2026 by switching app reads to `users.role` only.

## Goals

- Normalize legacy naming and enum semantics after parity stabilization.
- Keep production behavior non-breaking during migration.
- Make final schema easier to reason about for auth, moderation, and analytics.

## Scope

Primary candidates:
- `users.type` -> `users.role`
- status columns represented as `0/1` -> explicit constrained role/status domain where applicable
- timestamp consistency (`created_at` / `updated_at` / nullable lifecycle fields)

Out of scope in first normalization pass:
- destructive column drops
- table splits/joins requiring downtime
- business logic rewrites unrelated to naming/compatibility

## Proposed Mapping

### Users

- Current: `users.type` (values include `admin`, `user`, `candidate`, `employer`, `company`)
- Target: `users.role` with normalized app roles:
  - `admin`
  - `candidate`
  - `employer`

Proposed mapping:
- `admin` -> `admin`
- `user` -> `candidate` (temporary compatibility alias until all producers fixed)
- `candidate` -> `candidate`
- `employer` -> `employer`
- `company` -> `employer`

## Compatibility Strategy

1. Add new columns non-destructively (`role`), keep `type`.
2. Backfill `role` from `type`.
3. Application dual-read:
   - read `role` first, fallback `type`.
4. Application dual-write:
   - write both `role` and `type` during transition.
5. Verify no reads from `type` remain.
6. Remove fallback read.
7. Drop legacy column only after stability window.

## Rollout Phases

### Phase A: Preparation

- Add migration for `users.role`.
- Add backfill script and report counts per mapped value.
- Add QA checks for null/unknown role values.

### Phase B: Dual Mode

- Deploy app with dual-read/dual-write adapters.
- Monitor moderation/auth/admin behavior for role-based access.

### Phase C: Cutover

- Switch all reads to `role` only.
- Keep writing both for one release cycle.

### Phase D: Cleanup

- Stop writing `type`.
- Drop `type` in a later migration after signoff.

## QA Gates

- No null roles after backfill.
- No unknown roles outside approved enum.
- Authorization tests pass using only `role`.
- `qa:data` includes role integrity checks for new schema.

## Rollback Plan

- During dual mode, rollback by restoring app reads to `type` fallback.
- Keep legacy column unchanged until final cleanup.

## Open Questions

- Should `user` map to `candidate` or be preserved as separate role?
- Do we need an explicit `moderator` role before cleanup?
- Should `company` remain distinct for reporting?
