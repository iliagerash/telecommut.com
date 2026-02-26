import type { APIRoute } from "astro";

export const prerender = false;

type RuntimeLocals = App.Locals & {
  runtime?: {
    env?: AppRuntime;
  };
};

function normalizeKey(raw: string): string | null {
  if (!raw || raw.trim() === "") {
    return null;
  }

  const normalized = raw
    .split("/")
    .map((segment) => segment.trim())
    .filter(Boolean)
    .join("/");

  if (!normalized || normalized.includes("..") || normalized.includes("\\")) {
    return null;
  }

  return normalized;
}

export const GET: APIRoute = async ({ params, locals }) => {
  const rawKey = params.key ?? "";
  const key = normalizeKey(rawKey);
  if (!key) {
    return new Response("Not Found", { status: 404 });
  }

  const runtimeEnv = (locals as RuntimeLocals).runtime?.env;
  const bucket = runtimeEnv?.R2_BUCKET;
  if (!bucket) {
    return new Response("Storage not configured", { status: 500 });
  }

  const object = await bucket.get(key);
  if (!object) {
    return new Response("Not Found", { status: 404 });
  }

  const headers = new Headers();
  headers.set("content-type", object.httpMetadata?.contentType ?? "application/octet-stream");
  headers.set("cache-control", object.httpMetadata?.cacheControl ?? "public, max-age=86400");
  if (object.etag) {
    headers.set("etag", object.etag);
  }

  return new Response(object.body, {
    status: 200,
    headers,
  });
};
