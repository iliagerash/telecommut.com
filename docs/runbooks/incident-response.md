# Incident Response

## Trigger Conditions

- Elevated `5xx` rate (>2% sustained 10 minutes)
- Authentication failures across multiple endpoints
- Data integrity regression detected by `qa:data`

## Immediate Actions

1. Freeze deployments.
2. Collect request IDs from failing requests.
3. Determine blast radius (public/auth/admin/api).
4. If required, execute rollback via `deploy-and-rollback.md`.

## Communication

- Open incident channel/ticket.
- Post timeline updates every 15 minutes until stabilized.
- Capture final root cause + prevention tasks.

## Recovery Validation

1. Re-run smoke checklist from `release-checklist.md`.
2. Re-run `npm run qa:data`.
3. Verify no regression in logs for 30 minutes.
