import type { APIRoute } from "astro";
import { and, eq } from "drizzle-orm";

import { getAuth } from "@/auth";
import { getRequestDb } from "@/db/request";
import { authUsers, jobs, resumes } from "@/db/schema";
import { resolveNormalizedUserRoleFromRecord } from "@/services/users/role-adapter";

export const prerender = false;

export const POST: APIRoute = async ({ request, locals }) => {
  const session = await getAuth(locals).api.getSession({ headers: request.headers });
  if (!session?.session?.id || !session.user?.id) {
    return new Response(null, { status: 302, headers: { location: "/login?next=/admin/users" } });
  }

  if (resolveNormalizedUserRoleFromRecord(session.user) !== "admin") {
    return new Response(null, { status: 302, headers: { location: "/403" } });
  }

  const formData = await request.formData();
  const userIdRaw = String(formData.get("user_id") ?? "").trim();
  const returnTo = String(formData.get("return_to") ?? "/admin/users").trim() || "/admin/users";
  const userId = Number.parseInt(userIdRaw, 10);
  if (!Number.isFinite(userId) || userId <= 0) {
    return new Response(null, { status: 303, headers: { location: `${returnTo}?error=Invalid+user` } });
  }

  const db = getRequestDb(locals);
  const [targetUser] = await db.select().from(authUsers).where(eq(authUsers.id, userId)).limit(1);
  if (!targetUser) {
    return new Response(null, { status: 303, headers: { location: `${returnTo}?error=User+not+found` } });
  }

  const role = (targetUser.role ?? "").toLowerCase();
  if (role === "admin") {
    return new Response(null, { status: 303, headers: { location: `${returnTo}?error=Cannot+ban+admin+user` } });
  }

  if (role === "employer") {
    await db.delete(jobs).where(eq(jobs.userId, userId));
  } else if (role === "candidate") {
    await db.delete(resumes).where(eq(resumes.userId, userId));
  }

  await db.delete(authUsers).where(and(eq(authUsers.id, userId), eq(authUsers.role, targetUser.role)));

  return new Response(null, {
    status: 303,
    headers: { location: `${returnTo}?success=User+banned+and+data+removed` },
  });
};
