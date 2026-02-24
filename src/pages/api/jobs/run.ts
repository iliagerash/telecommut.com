import type { APIRoute } from "astro";

import { parseJobCommand, requiresIdempotencyKey } from "@/services/jobs/commands";
import { recordIdempotencyKey } from "@/services/jobs/idempotency";
import { logInfo } from "@/services/observability/logger";

export const prerender = false;

function requiredEnv(name: string): string {
  const value = import.meta.env[name];
  if (!value || value.trim() === "") {
    throw new Error(`Missing required env var: ${name}`);
  }

  return value;
}

function isAuthorized(request: Request): boolean {
  return request.headers.get("x-cron-secret") === requiredEnv("CRON_SECRET");
}

export const POST: APIRoute = async ({ request, locals }) => {
  if (!isAuthorized(request)) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "content-type": "application/json" },
    });
  }

  const payload = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const command = parseJobCommand(payload.command);

  if (!command) {
    return new Response(JSON.stringify({ error: "Unknown command" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  let idempotencyResult: { accepted: boolean; retryAfterSeconds: number } | null = null;
  if (requiresIdempotencyKey(command)) {
    const key = request.headers.get("idempotency-key") ?? "";
    if (!key.trim()) {
      return new Response(JSON.stringify({ error: "Missing Idempotency-Key header" }), {
        status: 400,
        headers: { "content-type": "application/json" },
      });
    }

    idempotencyResult = recordIdempotencyKey({
      key,
      command,
    });

    if (!idempotencyResult.accepted) {
      return new Response(JSON.stringify({ error: "Duplicate invocation" }), {
        status: 409,
        headers: {
          "content-type": "application/json",
          "retry-after": String(idempotencyResult.retryAfterSeconds),
        },
      });
    }
  }

  logInfo("job.invoke", {
    requestId: locals.requestId,
    command,
    mode: payload.mode ?? null,
    timeWindow: payload.time_window ?? null,
    idempotent: Boolean(idempotencyResult),
  });

  return new Response(
    JSON.stringify({
      ok: true,
      command,
      acceptedAt: new Date().toISOString(),
      mode: payload.mode ?? null,
      timeWindow: payload.time_window ?? null,
      note: "Execution handlers are scaffolded; command internals will be implemented incrementally.",
    }),
    {
      status: 202,
      headers: { "content-type": "application/json" },
    },
  );
};
