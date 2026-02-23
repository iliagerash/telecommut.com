import { randomUUID } from "node:crypto";

import { defineMiddleware } from "astro:middleware";

import { auth } from "@/auth";
import { logError, logInfo } from "@/services/observability/logger";

const protectedPrefixes = ["/app", "/dashboard", "/admin"];

async function hasActiveSession(request: Request): Promise<boolean> {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    return Boolean(session?.session?.id);
  } catch {
    return false;
  }
}

export const onRequest = defineMiddleware(async (context, next) => {
  const start = Date.now();
  const requestId = randomUUID();

  context.locals.requestId = requestId;

  try {
    const isProtected = protectedPrefixes.some((prefix) =>
      context.url.pathname.startsWith(prefix),
    );

    if (isProtected) {
      const isAuthed = await hasActiveSession(context.request);
      if (!isAuthed) {
        const redirectUrl = new URL("/login", context.url);
        redirectUrl.searchParams.set("next", context.url.pathname);

        return context.redirect(redirectUrl.toString(), 302);
      }
    }

    const response = await next();

    logInfo("request.completed", {
      requestId,
      method: context.request.method,
      path: context.url.pathname,
      status: response.status,
      durationMs: Date.now() - start,
    });

    response.headers.set("x-request-id", requestId);
    return response;
  } catch (error) {
    logError("request.failed", {
      requestId,
      method: context.request.method,
      path: context.url.pathname,
      durationMs: Date.now() - start,
      error: error instanceof Error ? error.message : String(error),
    });

    throw error;
  }
});
