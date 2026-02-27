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

export const POST: APIRoute = async ({ request, locals }) => {
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
  const runtimeDb = getRequestDb(locals);
  const applyResult = await applyModerationAction("jobs", entityId, action, {
    db: runtimeDb,
  });

  if (!applyResult.found) {
    return new Response(JSON.stringify({ error: "Job not found" }), {
      status: 404,
      headers: { "content-type": "application/json" },
    });
  }

  logInfo("admin.moderation.jobs", {
    requestId: locals.requestId,
    jobId: entityId,
    action,
    patch: decision.patch,
    beforeStatus: applyResult.beforeStatus,
    afterStatus: applyResult.afterStatus,
  });

  return new Response(
    JSON.stringify({
      ok: true,
      jobId: entityId,
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
