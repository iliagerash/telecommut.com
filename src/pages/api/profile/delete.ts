import type { APIRoute } from "astro";
import { unlink } from "node:fs/promises";
import { eq } from "drizzle-orm";

import { getAuth } from "@/auth";
import { getRequestDb } from "@/db/request";
import { authAccounts, authSessions, authUsers, authVerifications, jobs, resumes } from "@/db/schema";
import { extractMediaKeyFromUrl, resolveMediaFilePath } from "@/services/profile/images";

export const prerender = false;

export const POST: APIRoute = async ({ request, locals }) => {
  const auth = getAuth(locals);
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.session?.id || !session.user?.id) {
    return new Response(JSON.stringify({ message: "Unauthorized" }), {
      status: 401,
      headers: { "content-type": "application/json" },
    });
  }

  const userId = Number(session.user.id);
  const email = String(session.user.email ?? "").trim().toLowerCase();
  const db = getRequestDb(locals);

  const [existingUser] = await db.select().from(authUsers).where(eq(authUsers.id, userId)).limit(1);
  const existingImageKey = extractMediaKeyFromUrl(existingUser?.image);
  if (existingImageKey) {
    const existingImagePath = resolveMediaFilePath(existingImageKey);
    await unlink(existingImagePath).catch(() => undefined);
  }

  await db.delete(resumes).where(eq(resumes.userId, userId));
  await db.delete(jobs).where(eq(jobs.userId, userId));
  await db.delete(authAccounts).where(eq(authAccounts.userId, userId));
  await db.delete(authSessions).where(eq(authSessions.userId, userId));
  if (email.length > 0) {
    await db.delete(authVerifications).where(eq(authVerifications.identifier, email));
  }
  await db.delete(authUsers).where(eq(authUsers.id, userId));

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
};
