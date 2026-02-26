import type { APIRoute } from "astro";
import { eq } from "drizzle-orm";

import { getAuth } from "@/auth";
import { getRequestDb } from "@/db/request";
import { contracts, jobs } from "@/db/schema";
import { appendNotice, jobExpiresInDays, jobNow, parseJobForm, resolveRelativeReturnTo } from "@/services/jobs/form";
import { resolveNormalizedUserRoleFromRecord } from "@/services/users/role-adapter";

export const prerender = false;

export const POST: APIRoute = async ({ request, locals }) => {
  const session = await getAuth(locals).api.getSession({ headers: request.headers });
  if (!session?.session?.id || !session.user?.id) {
    return new Response(null, {
      status: 302,
      headers: { location: "/login?next=/app/jobs/create" },
    });
  }

  if (resolveNormalizedUserRoleFromRecord(session.user) === "candidate") {
    return new Response(null, {
      status: 302,
      headers: { location: "/403" },
    });
  }

  const formData = await request.formData();
  const returnTo = resolveRelativeReturnTo(String(formData.get("return_to") ?? ""), "/app/jobs/list");
  const { payload, errors } = parseJobForm(formData);

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

  const now = jobNow();
  await db.insert(jobs).values({
    userId: String(session.user.id),
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
    status: 0,
    published: now,
    expires: jobExpiresInDays(30),
    createdAt: now,
    updatedAt: now,
  });

  return new Response(null, {
    status: 303,
    headers: { location: appendNotice(returnTo, "success", "Job created successfully.") },
  });
};
