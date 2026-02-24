# Data QA Checklist

## Automated

1. Run migration + schema checks:
   - `npm run db:check`
2. Run integrity and permission QA checks:
   - `npm run qa:data`
3. Confirm `qa:data` exits with code `0`.

## Manual

1. Sample 10 job rows and verify owner user role is expected (`candidate`/`employer`/`company`/`admin`).
2. Sample 10 resume rows and verify visibility/moderation status matches policy.
3. Verify one banned job and one restored job from admin moderation endpoints in DB.
4. Verify no unexpected `status` values outside `{0,1}` for jobs/resumes.
5. Document anomalies with row IDs and remediation owner.

## Failure Handling

- If `qa:data` fails, stop deployment and fix data anomalies before proceeding.
- Re-run full checks after remediation:
  - `npm run ci:check`
  - `npm run qa:data`
