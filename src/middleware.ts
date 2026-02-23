import { randomUUID } from "node:crypto";

import { defineMiddleware } from "astro:middleware";

import { auth } from "@/auth";
import { getAllowedRolesForPath, hasRoleAccess, resolveUserRole } from "@/auth/authorization";
import { logError, logInfo } from "@/services/observability/logger";

async function getSession(request: Request) {
  try {
    return await auth.api.getSession({
      headers: request.headers,
    });
  } catch {
    return null;
  }
}

export const onRequest = defineMiddleware(async (context, next) => {
  const start = Date.now();
  const requestId = randomUUID();

  context.locals.requestId = requestId;

  try {
    const allowedRoles = getAllowedRolesForPath(context.url.pathname);
    if (allowedRoles) {
      const session = await getSession(context.request);
      if (!session?.session?.id) {
        const redirectUrl = new URL("/login", context.url);
        redirectUrl.searchParams.set("next", context.url.pathname);

        return context.redirect(redirectUrl.toString(), 302);
      }

      const userRecord = session.user as Record<string, unknown>;
      const role = resolveUserRole(userRecord.role ?? userRecord.type);

      if (!hasRoleAccess(context.url.pathname, role)) {
        logInfo("request.forbidden", {
          requestId,
          path: context.url.pathname,
          role,
          requiredRoles: allowedRoles,
        });

        return new Response("Forbidden", { status: 403 });
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
