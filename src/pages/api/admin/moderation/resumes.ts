import type { APIRoute } from "astro";

import { getRequestDb } from "@/db/request";
import {
  applyModerationAction,
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
  const entityId = parseEntityId(payload.resumeId);
  const action = parseModerationAction(payload.action);

  if (!entityId || !action) {
    return new Response(JSON.stringify({ error: "Invalid payload" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  const decision = buildModerationDecision(action);
  const runtimeDb = getRequestDb(locals);
  const runtimeEnv = (locals as { runtime?: { env?: AppRuntime } }).runtime?.env;
  const applyResult = await applyModerationAction("resumes", entityId, action, {
    d1: runtimeEnv?.DB,
    client: runtimeEnv?.DB ? "d1" : "sqlite",
    db: runtimeDb,
  });

  if (!applyResult.found) {
    return new Response(JSON.stringify({ error: "Resume not found" }), {
      status: 404,
      headers: { "content-type": "application/json" },
    });
  }

  logInfo("admin.moderation.resumes", {
    requestId: locals.requestId,
    resumeId: entityId,
    action,
    patch: decision.patch,
    beforeStatus: applyResult.beforeStatus,
    afterStatus: applyResult.afterStatus,
  });

  return new Response(
    JSON.stringify({
      ok: true,
      resumeId: entityId,
      action,
      decision,
      result: applyResult,
    }),
    {
      status: 202,
      headers: { "content-type": "application/json" },
    },
  );
};
