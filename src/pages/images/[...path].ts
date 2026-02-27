import type { APIRoute } from "astro";
import { readFile } from "node:fs/promises";

import { resolveMediaFilePath } from "@/services/profile/images";

export const prerender = false;

const CONTENT_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
};

export const GET: APIRoute = async ({ params }) => {
  const pathParam = String(params.path ?? "").trim();
  if (!pathParam) {
    return new Response("Not found", { status: 404 });
  }

  const normalized = pathParam
    .split("/")
    .map((segment) => segment.trim())
    .filter(Boolean)
    .join("/");

  // Restrict serving to profile image folders only.
  if (!normalized.startsWith("candidates/") && !normalized.startsWith("employers/")) {
    return new Response("Not found", { status: 404 });
  }

  try {
    const filePath = resolveMediaFilePath(`images/${normalized}`);
    const content = await readFile(filePath);
    const extension = normalized.split(".").pop()?.toLowerCase() ?? "";
    const contentType = CONTENT_TYPES[extension] ?? "application/octet-stream";

    return new Response(content, {
      status: 200,
      headers: {
        "content-type": contentType,
        "cache-control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
};
