import type { APIRoute } from "astro";

import {
  buildModerationDecision,
  parseEntityId,
  parseModerationAction,
} from "@/services/admin/moderation";
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
  const provided = request.headers.get("x-admin-token");
  return provided === requiredEnv("ADMIN_API_TOKEN");
}

export const POST: APIRoute = async ({ request, locals }) => {
  if (!isAuthorized(request)) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "content-type": "application/json" },
    });
  }

  const payload = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const entityId = parseEntityId(payload.jobId);
  const action = parseModerationAction(payload.action);

  if (!entityId || !action) {
    return new Response(JSON.stringify({ error: "Invalid payload" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  const decision = buildModerationDecision(action);

  logInfo("admin.moderation.jobs", {
    requestId: locals.requestId,
    jobId: entityId,
    action,
    patch: decision.patch,
  });

  return new Response(
    JSON.stringify({
      ok: true,
      jobId: entityId,
      action,
      decision,
      note: "DB mutation wiring pending in W4-2 follow-up.",
    }),
    {
      status: 202,
      headers: { "content-type": "application/json" },
    },
  );
};
