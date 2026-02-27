import type { APIRoute } from "astro";
import { unlink } from "node:fs/promises";
import { eq } from "drizzle-orm";

import { getAuth } from "@/auth";
import { getRequestDb } from "@/db/request";
import { authUsers } from "@/db/schema";
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
  const db = getRequestDb(locals);
  const [existingUser] = await db.select().from(authUsers).where(eq(authUsers.id, userId)).limit(1);

  const previousKey = extractMediaKeyFromUrl(existingUser?.image);
  if (previousKey) {
    const previousPath = resolveMediaFilePath(previousKey);
    await unlink(previousPath).catch(() => undefined);
  }

  await db
    .update(authUsers)
    .set({
      image: "",
      updatedAt: Date.now(),
    })
    .where(eq(authUsers.id, userId));

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
};
