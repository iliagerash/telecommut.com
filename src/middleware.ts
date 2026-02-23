import { randomUUID } from "node:crypto";

import { defineMiddleware } from "astro:middleware";

import { logError, logInfo } from "@/services/observability/logger";

export const onRequest = defineMiddleware(async (context, next) => {
  const start = Date.now();
  const requestId =
    context.request.headers.get("x-request-id") ??
    context.request.headers.get("cf-ray") ??
    randomUUID();

  context.locals.requestId = requestId;

  try {
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
