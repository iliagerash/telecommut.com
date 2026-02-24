import type { APIRoute } from "astro";

import { isSchedulableCommand, parseJobCommand } from "@/services/jobs/commands";
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

  if (!isSchedulableCommand(command)) {
    return new Response(JSON.stringify({ error: "Command is manual-only" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  logInfo("job.cron.invoke", {
    requestId: locals.requestId,
    command,
    schedule: payload.schedule ?? null,
  });

  return new Response(
    JSON.stringify({
      ok: true,
      command,
      acceptedAt: new Date().toISOString(),
      note: "Cron command accepted. Execution internals are scaffolded.",
    }),
    {
      status: 202,
      headers: { "content-type": "application/json" },
    },
  );
};
