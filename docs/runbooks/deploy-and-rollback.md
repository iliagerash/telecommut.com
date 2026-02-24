# Deploy and Rollback Runbook

## Preconditions

- `npm run ci:check` is passing locally.
- `wrangler.jsonc` bindings are set to intended environment resources.
- D1 migrations already applied for target environment.

## Deploy (Production)

1. Build the project:
   - `npm run build`
2. Deploy Worker + assets:
   - `npx wrangler deploy`
3. Smoke-check critical routes:
   - `/`
   - `/search/jobs`
   - `/api/auth/get-session`
   - `/admin/dashboard` (authorized context)
4. Validate logs:
   - check for `request.failed` and unexpected `5xx` spikes.

## Rollback Criteria

Rollback immediately if any of the following happen:
- sustained error rate > 2% for 10 minutes;
- auth endpoints returning unexpected `5xx`;
- critical public routes failing (`/`, `/search/jobs`, `/jobs/{id}`).

## Rollback Procedure

1. Identify previous stable Worker version id.
2. Re-deploy previous release artifact/tag.
3. Re-run smoke checks.
4. Keep incident notes with request IDs and failing endpoints.

## Post-Rollback Follow-up

- Open incident ticket with root-cause owner.
- Add missing guard/test to prevent recurrence.
