import type { APIRoute } from "astro";
import { and, eq } from "drizzle-orm";

import { getAuth } from "@/auth";
import { getRequestDb } from "@/db/request";
import { resumes } from "@/db/schema";
import { appendNotice, resolveRelativeReturnTo } from "@/services/resumes/form";
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
  const resumeId = Number.parseInt(String(formData.get("resume_id") ?? ""), 10);
  const returnTo = resolveRelativeReturnTo(String(formData.get("return_to") ?? ""), "/app/resumes/list");
  if (!Number.isFinite(resumeId) || resumeId <= 0) {
    return new Response(null, {
      status: 303,
      headers: { location: appendNotice(returnTo, "error", "Invalid resume.") },
    });
  }

  const db = getRequestDb(locals);
  const deleted = await db
    .delete(resumes)
    .where(and(eq(resumes.id, resumeId), eq(resumes.userId, String(session.user.id))))
    .returning();
  if (deleted.length === 0) {
    return new Response(null, {
      status: 303,
      headers: { location: appendNotice(returnTo, "error", "Resume not found.") },
    });
  }

  return new Response(null, {
    status: 303,
    headers: { location: appendNotice(returnTo, "success", "Resume deleted successfully.") },
  });
};
