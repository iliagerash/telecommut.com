import type { APIRoute } from "astro";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { eq } from "drizzle-orm";

import { getAuth } from "@/auth";
import { getRequestDb } from "@/db/request";
import { authUsers } from "@/db/schema";
import {
  buildMediaUrlFromKey,
  extractMediaKeyFromUrl,
  resolveImageExtension,
  resolveMediaFilePath,
} from "@/services/profile/images";

export const prerender = false;

const MAX_IMAGE_BYTES = 2 * 1024 * 1024;

export const POST: APIRoute = async ({ request, locals }) => {
  const auth = getAuth(locals);
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.session?.id || !session.user?.id) {
    return new Response(JSON.stringify({ message: "Unauthorized" }), {
      status: 401,
      headers: { "content-type": "application/json" },
    });
  }

  const formData = await request.formData();
  const file = formData.get("image");
  if (!(file instanceof File)) {
    return new Response(JSON.stringify({ message: "Image file is required." }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  const contentType = file.type.trim().toLowerCase();
  const extension = resolveImageExtension(contentType);
  if (!extension) {
    return new Response(JSON.stringify({ message: "Invalid image format. Use PNG, JPG, GIF, or WebP." }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  if (file.size <= 0 || file.size > MAX_IMAGE_BYTES) {
    return new Response(JSON.stringify({ message: "Image size must be between 1 byte and 2 MB." }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  const userId = Number(session.user.id);
  const db = getRequestDb(locals);
  const [existingUser] = await db.select().from(authUsers).where(eq(authUsers.id, userId)).limit(1);
  const previousKey = extractMediaKeyFromUrl(existingUser?.image);
  const storedRole = String(existingUser?.role ?? session.user.role ?? "").trim().toLowerCase();
  const roleFolder = storedRole === "candidate" ? "images/candidates" : "images/employers";

  const timestamp = Date.now();
  const key = `${roleFolder}/${userId}-${timestamp}.${extension}`;
  const filePath = resolveMediaFilePath(key);
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, Buffer.from(await file.arrayBuffer()));

  if (previousKey && previousKey !== key) {
    const previousPath = resolveMediaFilePath(previousKey);
    await unlink(previousPath).catch(() => undefined);
  }

  const imageUrl = buildMediaUrlFromKey(key);
  await db
    .update(authUsers)
    .set({
      image: imageUrl,
      updatedAt: new Date(),
    })
    .where(eq(authUsers.id, userId));

  return new Response(JSON.stringify({ ok: true, imageUrl }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
};
