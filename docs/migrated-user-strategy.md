# Migrated User Strategy

## Decision

Use **forced password reset** for all migrated legacy users at first login.

## Why

- Avoids risk from legacy hash algorithm differences between Laravel and Better Auth.
- Removes ambiguity about pepper/salt/history from the old stack.
- Creates a single modern credential baseline in the new auth system.

## Flow

1. Import legacy users with `email` and profile fields only.
2. Mark imported users as `emailVerified` based on legacy truth if available.
3. Do not allow legacy password login in production cutover.
4. Require `request-password-reset` on first login attempt.
5. User sets a new password through Better Auth reset flow.
6. Subsequent logins use normal `sign-in/email`.

## Operational Notes

- Reset token TTL is controlled by `BETTER_AUTH_RESET_TOKEN_TTL_SECONDS`.
- Verification token TTL is controlled by `BETTER_AUTH_VERIFY_TOKEN_TTL_SECONDS`.
- Keep `BETTER_AUTH_REQUIRE_EMAIL_VERIFICATION=true` in production.
- Support team runbook should include a manual resend-reset path.

## Non-Goals

- No direct legacy hash verification during initial cutover.
- No dual-auth compatibility window in phase 1.
