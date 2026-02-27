import type { APIRoute } from "astro";
import { and, eq, inArray } from "drizzle-orm";

import { getAuth } from "@/auth";
import { getRequestDb } from "@/db/request";
import { jobs } from "@/db/schema";
import { submitBingIndexNow, submitGoogleIndexing } from "@/lib/indexing.mjs";
import { resolveNormalizedUserRoleFromRecord } from "@/services/users/role-adapter";

export const prerender = false;

function parseIds(formData: FormData): number[] {
  const values = formData.getAll("job_ids");
  return values
    .map((value) => Number.parseInt(String(value), 10))
    .filter((value) => Number.isFinite(value) && value > 0);
}

export const POST: APIRoute = async ({ request, locals }) => {
  const session = await getAuth(locals).api.getSession({ headers: request.headers });
  if (!session?.session?.id || !session.user?.id) {
    return new Response(null, { status: 302, headers: { location: "/auth/login?next=/admin/jobs" } });
  }

  if (resolveNormalizedUserRoleFromRecord(session.user) !== "admin") {
    return new Response(null, { status: 302, headers: { location: "/errors/403" } });
  }

  const formData = await request.formData();
  const ids = parseIds(formData);
  if (ids.length === 0) {
    return new Response(null, { status: 303, headers: { location: "/admin/jobs?error=No+jobs+selected" } });
  }

  const db = getRequestDb(locals);

  const pendingRows = await db
    .select({ id: jobs.id })
    .from(jobs)
    .where(and(inArray(jobs.id, ids), eq(jobs.status, 0)));

  const approvedIds = pendingRows.map((row) => row.id);
  if (approvedIds.length === 0) {
    return new Response(null, { status: 303, headers: { location: "/admin/jobs?error=No+new+jobs+selected" } });
  }

  await db
    .update(jobs)
    .set({ status: 1, updatedAt: new Date() })
    .where(inArray(jobs.id, approvedIds));

  const baseUrlRaw = String(process.env.PUBLIC_APP_URL ?? "").trim();
  if (baseUrlRaw) {
    try {
      const baseUrl = new URL(baseUrlRaw).toString();
      const urls = approvedIds.map((id) => new URL(`/jobs/${id}`, baseUrl).toString());
      await submitGoogleIndexing(urls);
      await submitBingIndexNow(urls, baseUrl);
    } catch {
      // Keep approval successful even if indexing submission fails due URL/env/network issues.
    }
  }

  return new Response(null, {
    status: 303,
    headers: { location: `/admin/jobs?success=${encodeURIComponent(`Approved ${approvedIds.length} job(s).`)}` },
  });
};
