import type { APIRoute } from "astro";
import { and, eq } from "drizzle-orm";

import { getAuth } from "@/auth";
import { getRequestDb } from "@/db/request";
import { contracts, jobs } from "@/db/schema";
import { appendNotice, jobNow, parseJobForm, resolveRelativeReturnTo } from "@/services/jobs/form";
import { resolveNormalizedUserRoleFromRecord } from "@/services/users/role-adapter";

export const prerender = false;

export const POST: APIRoute = async ({ request, locals }) => {
  const session = await getAuth(locals).api.getSession({ headers: request.headers });
  if (!session?.session?.id || !session.user?.id) {
    return new Response(null, {
      status: 302,
      headers: { location: "/auth/login?next=/app/jobs/list" },
    });
  }

  if (resolveNormalizedUserRoleFromRecord(session.user) === "candidate") {
    return new Response(null, {
      status: 302,
      headers: { location: "/errors/403" },
    });
  }

  const formData = await request.formData();
  const jobIdRaw = String(formData.get("job_id") ?? "");
  const jobId = Number.parseInt(jobIdRaw, 10);
  const fallback = Number.isFinite(jobId) && jobId > 0 ? `/app/jobs/edit/${jobId}` : "/app/jobs/list";
  const returnTo = resolveRelativeReturnTo(String(formData.get("return_to") ?? ""), fallback);

  if (!Number.isFinite(jobId) || jobId <= 0) {
    return new Response(null, {
      status: 303,
      headers: { location: appendNotice(returnTo, "error", "Invalid job.") },
    });
  }

  const { payload, errors } = parseJobForm(formData);
  if (!payload || errors.length > 0) {
    return new Response(null, {
      status: 303,
      headers: { location: appendNotice(returnTo, "error", errors[0] ?? "Invalid form data.") },
    });
  }

  const db = getRequestDb(locals);
  const [existingJob] = await db
    .select()
    .from(jobs)
    .where(and(eq(jobs.id, jobId), eq(jobs.userId, Number(session.user.id))))
    .limit(1);

  if (!existingJob) {
    return new Response(null, {
      status: 302,
      headers: { location: "/errors/404" },
    });
  }

  const [contract] = await db
    .select()
    .from(contracts)
    .where(eq(contracts.code, payload.contractCode))
    .limit(1);

  if (!contract) {
    return new Response(null, {
      status: 303,
      headers: { location: appendNotice(returnTo, "error", "Employment type is invalid.") },
    });
  }

  await db
    .update(jobs)
    .set({
      companyName: payload.companyName,
      position: payload.position,
      categoryId: payload.categoryId,
      countryId: payload.countryId,
      countryGroups: payload.countryGroups,
      salaryMin: payload.salaryMin,
      salaryMax: payload.salaryMax,
      salaryPeriod: payload.salaryPeriod,
      currency: payload.currency,
      contractCode: payload.contractCode,
      skills: payload.skills,
      description: payload.description,
      applyText: payload.applyText,
      updatedAt: jobNow(),
    })
    .where(and(eq(jobs.id, jobId), eq(jobs.userId, Number(session.user.id))));

  return new Response(null, {
    status: 303,
    headers: { location: appendNotice("/app/jobs/list", "success", "Job updated successfully.") },
  });
};
