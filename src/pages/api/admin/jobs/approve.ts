import type { APIRoute } from "astro";
import { inArray } from "drizzle-orm";

import { getAuth } from "@/auth";
import { getRequestDb } from "@/db/request";
import { jobs } from "@/db/schema";
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
  await db
    .update(jobs)
    .set({ status: 1, updatedAt: new Date() })
    .where(inArray(jobs.id, ids));

  return new Response(null, {
    status: 303,
    headers: { location: `/admin/jobs?success=${encodeURIComponent(`Approved ${ids.length} job(s).`)}` },
  });
};
