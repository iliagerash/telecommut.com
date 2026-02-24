# Wave 7 Cutover Freeze + Announcement Runbook

Use this runbook to execute `W7-1` (freeze legacy writes + announce cutover).

## Scope

- Applies to the final migration window from `telecommut.old` to Workers-hosted `telecommut.com`.
- Covers communication, freeze controls, and go/no-go checkpoints before `W7-2`.

## Inputs Required

- Planned freeze start/end timestamps (UTC and local timezone).
- Named incident commander and on-call engineer.
- Links to:
  - release branch/commit SHA
  - rollback plan (`docs/runbooks/deploy-and-rollback.md`)
  - smoke runbook (`docs/runbooks/release-checklist.md`)

## T-24h Checklist

1. Confirm cutover window and owner assignments.
2. Confirm `npx wrangler deploy` permissions for release owner.
3. Confirm D1 + R2 credentials for `telecommut-data-migrate`.
4. Confirm no pending schema migrations outside approved release set.
5. Share pre-announcement with internal stakeholders.

## T-2h Freeze Execution

1. Announce freeze start in engineering + ops channels.
2. Disable/suspend all legacy write entry points in `telecommut.old`:
   - account/profile mutations
   - posting/apply actions
   - admin moderation writes
3. Keep legacy reads online for user-facing continuity until cutover switch.
4. Record timestamp + owner in release notes.

## Communication Templates

### Internal Freeze Start

```
Subject: Telecommut Cutover Freeze Started

Legacy write freeze is now active as of <timestamp>.
Scope: telecommut.old write operations are suspended; read-only access remains available.
Incident Commander: <name>
Next checkpoint: W7-2 final delta import + integrity verification.
```

### Internal Cutover Start

```
Subject: Telecommut Production Cutover Started

We are starting production cutover to Workers-hosted telecommut.com.
Current stage: <W7-2/W7-3>
Rollback owner: <name>
Status updates every 30 minutes in <channel>.
```

### Internal Cutover Complete

```
Subject: Telecommut Production Cutover Complete

Cutover completed at <timestamp>. Primary traffic now served by telecommut.com on Workers.
Legacy write freeze remains in effect during hypercare.
Next stage: W7-4 smoke verification and W7-5 hypercare.
```

## Exit Criteria for W7-1

- Freeze window start communicated and logged.
- Legacy writes confirmed disabled.
- Named owners acknowledged for cutover and rollback.
- Evidence links added in `conversion_plan.md` notes for `W7-1`.
