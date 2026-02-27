import type { APIRoute } from "astro";
import { eq } from "drizzle-orm";

import { getAuth } from "@/auth";
import { getRequestDb } from "@/db/request";
import { authUsers } from "@/db/schema";
import { buildMediaUrlFromKey, extractMediaKeyFromUrl, resolveImageExtension } from "@/services/profile/images";

export const prerender = false;

const MAX_IMAGE_BYTES = 2 * 1024 * 1024;

type RuntimeLocals = App.Locals & {
  runtime?: {
    env?: AppRuntime;
  };
};

export const POST: APIRoute = async ({ request, locals }) => {
  const auth = getAuth(locals);
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.session?.id || !session.user?.id) {
    return new Response(JSON.stringify({ message: "Unauthorized" }), {
      status: 401,
      headers: { "content-type": "application/json" },
    });
  }

  const runtimeEnv = (locals as RuntimeLocals).runtime?.env;
  const bucket = runtimeEnv?.R2_BUCKET;
  if (!bucket) {
    return new Response(JSON.stringify({ message: "R2 bucket binding is not available." }), {
      status: 500,
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

  const timestamp = Date.now();
  const randomPart = crypto.randomUUID().replaceAll("-", "");
  const key = `profiles/${userId}/${timestamp}-${randomPart}.${extension}`;

  await bucket.put(key, await file.arrayBuffer(), {
    httpMetadata: {
      contentType,
      cacheControl: "public, max-age=31536000, immutable",
    },
  });

  if (previousKey && previousKey !== key) {
    await bucket.delete(previousKey).catch(() => undefined);
  }

  const imageUrl = buildMediaUrlFromKey(key);
  await db
    .update(authUsers)
    .set({
      image: imageUrl,
      updatedAt: Date.now(),
    })
    .where(eq(authUsers.id, userId));

  return new Response(JSON.stringify({ ok: true, imageUrl }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
};
