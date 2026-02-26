import type { APIRoute } from "astro";
import { and, eq } from "drizzle-orm";

import { getAuth } from "@/auth";
import { getRequestDb } from "@/db/request";
import { contracts, resumes } from "@/db/schema";
import { appendNotice, parseResumeForm, resolveRelativeReturnTo, resumeNow } from "@/services/resumes/form";
import { resolveNormalizedUserRoleFromRecord } from "@/services/users/role-adapter";

export const prerender = false;

export const POST: APIRoute = async ({ request, locals }) => {
  const session = await getAuth(locals).api.getSession({ headers: request.headers });
  if (!session?.session?.id || !session.user?.id) {
    return new Response(null, {
      status: 302,
      headers: { location: "/login?next=/app/resumes/list" },
    });
  }

  if (resolveNormalizedUserRoleFromRecord(session.user) === "employer") {
    return new Response(null, {
      status: 302,
      headers: { location: "/403" },
    });
  }

  const formData = await request.formData();
  const resumeIdRaw = String(formData.get("resume_id") ?? "");
  const resumeId = Number.parseInt(resumeIdRaw, 10);
  const fallback = Number.isFinite(resumeId) && resumeId > 0 ? `/app/resumes/edit/${resumeId}` : "/app/resumes/list";
  const returnTo = resolveRelativeReturnTo(String(formData.get("return_to") ?? ""), fallback);

  if (!Number.isFinite(resumeId) || resumeId <= 0) {
    return new Response(null, {
      status: 303,
      headers: { location: appendNotice(returnTo, "error", "Invalid resume.") },
    });
  }

  const { payload, errors } = parseResumeForm(formData);
  if (!payload || errors.length > 0) {
    return new Response(null, {
      status: 303,
      headers: { location: appendNotice(returnTo, "error", errors[0] ?? "Invalid form data.") },
    });
  }

  const db = getRequestDb(locals);
  const [existingResume] = await db
    .select()
    .from(resumes)
    .where(and(eq(resumes.id, resumeId), eq(resumes.userId, String(session.user.id))))
    .limit(1);
  if (!existingResume) {
    return new Response(null, {
      status: 302,
      headers: { location: "/404" },
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
    .update(resumes)
    .set({
      position: payload.position,
      categoryId: payload.categoryId,
      countryId: payload.countryId,
      salaryMin: payload.salaryMin,
      salaryPeriod: payload.salaryPeriod,
      currency: payload.currency,
      contractCode: payload.contractCode,
      skills: payload.skills,
      description: payload.description,
      updatedAt: resumeNow(),
    })
    .where(and(eq(resumes.id, resumeId), eq(resumes.userId, String(session.user.id))));

  return new Response(null, {
    status: 303,
    headers: { location: appendNotice("/app/resumes/list", "success", "Resume updated successfully.") },
  });
};
