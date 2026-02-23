# Architecture Boundaries

- `src/domain`: pure business rules and entities.
- `src/db`: Drizzle schema, query modules, and DB adapters.
- `src/auth`: Better Auth configuration and auth guards.
- `src/services`: external integrations (Mailgun, R2, cron jobs).
- `src/ui`: reusable presentation-only modules.

Rules:
- Route/page files orchestrate, but do not embed business logic.
- `domain` must not import framework/runtime-specific code.
- `services` may depend on infra SDKs but are isolated behind typed interfaces.
