import type { APIRoute } from "astro";
import { eq } from "drizzle-orm";

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
      headers: { location: "/login?next=/app/resumes/create" },
    });
  }

  if (resolveNormalizedUserRoleFromRecord(session.user) === "employer") {
    return new Response(null, {
      status: 302,
      headers: { location: "/403" },
    });
  }

  const formData = await request.formData();
  const returnTo = resolveRelativeReturnTo(String(formData.get("return_to") ?? ""), "/app/resumes/list");
  const { payload, errors } = parseResumeForm(formData);
  if (!payload || errors.length > 0) {
    return new Response(null, {
      status: 303,
      headers: { location: appendNotice(returnTo, "error", errors[0] ?? "Invalid form data.") },
    });
  }

  const db = getRequestDb(locals);
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

  const now = resumeNow();
  await db.insert(resumes).values({
    userId: String(session.user.id),
    position: payload.position,
    categoryId: payload.categoryId,
    countryId: payload.countryId,
    salaryMin: payload.salaryMin,
    salaryPeriod: payload.salaryPeriod,
    currency: payload.currency,
    contractCode: payload.contractCode,
    skills: payload.skills,
    description: payload.description,
    status: 1,
    createdAt: now,
    updatedAt: now,
  });

  return new Response(null, {
    status: 303,
    headers: { location: appendNotice(returnTo, "success", "Resume created successfully.") },
  });
};
