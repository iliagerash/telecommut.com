import type { APIRoute } from "astro";
import { and, eq } from "drizzle-orm";

import { getAuth } from "@/auth";
import { getRequestDb } from "@/db/request";
import { jobs } from "@/db/schema";
import { appendNotice, jobNow, resolveRelativeReturnTo } from "@/services/jobs/form";
import { resolveNormalizedUserRoleFromRecord } from "@/services/users/role-adapter";

export const prerender = false;

export const POST: APIRoute = async ({ request, locals }) => {
  const session = await getAuth(locals).api.getSession({ headers: request.headers });
  if (!session?.session?.id || !session.user?.id) {
    return new Response(null, {
      status: 302,
      headers: { location: "/login?next=/app/jobs/list" },
    });
  }

  if (resolveNormalizedUserRoleFromRecord(session.user) === "candidate") {
    return new Response(null, {
      status: 302,
      headers: { location: "/403" },
    });
  }

  const formData = await request.formData();
  const jobId = Number.parseInt(String(formData.get("job_id") ?? ""), 10);
  const returnTo = resolveRelativeReturnTo(String(formData.get("return_to") ?? ""), "/app/jobs/list");

  if (!Number.isFinite(jobId) || jobId <= 0) {
    return new Response(null, {
      status: 303,
      headers: { location: appendNotice(returnTo, "error", "Invalid job.") },
    });
  }

  const db = getRequestDb(locals);
  const updated = await db
    .update(jobs)
    .set({ updatedAt: jobNow() })
    .where(and(eq(jobs.id, jobId), eq(jobs.userId, Number(session.user.id))))
    .returning();

  if (updated.length === 0) {
    return new Response(null, {
      status: 303,
      headers: { location: appendNotice(returnTo, "error", "Job not found.") },
    });
  }

  return new Response(null, {
    status: 303,
    headers: { location: appendNotice(returnTo, "success", "Job renewed successfully.") },
  });
};
