import { randomUUID } from "node:crypto";

import { defineMiddleware } from "astro:middleware";

import { getAuth } from "@/auth";
import { getAllowedRolesForPath, hasRoleAccess, resolveUserRoleFromRecord } from "@/auth/authorization";
import { logError, logInfo } from "@/services/observability/logger";

async function getSession(request: Request, locals: App.Locals) {
  try {
    const auth = getAuth(locals);
    return await auth.api.getSession({
      headers: request.headers,
    });
  } catch {
    return null;
  }
}

const JOB_AGGREGATOR_BOTS = [
  "Jobrapido",
  "Jooble",
  "Indeed",
  "Careerjet",
  "Adzuna",
  "Jora",
  "BeBee",
];

const ALLOWED_BOTS = ["Mediapartners-Google"];

const DISABLED_AD_PATHS = [/^\/jobs\//, /^\/categories\//];

const DISABLED_AD_ASNS = [32934, 16509];

function shouldShowAds(request: Request, pathname: string): boolean {
  const adsEnabled = ["1", "true", "yes", "on"].includes(
    String(import.meta.env.SHOW_ADS ?? "").trim().toLowerCase(),
  );
  if (!adsEnabled) return false;

  const ua = request.headers.get("user-agent") ?? "";

  for (const bot of JOB_AGGREGATOR_BOTS) {
    if (ua.toLowerCase().includes(bot.toLowerCase())) return false;
  }

  const asn = Number(request.headers.get("x-client-asn"));
  if (DISABLED_AD_ASNS.includes(asn)) return false;

  const isAllowedBot = ALLOWED_BOTS.some((bot) =>
    ua.toLowerCase().includes(bot.toLowerCase()),
  );

  if (
    !isAllowedBot &&
    DISABLED_AD_PATHS.some((pattern) => pattern.test(pathname)) &&
    !request.headers.get("referer") &&
    !new URL(request.url).searchParams.has("utm_source")
  ) {
    return false;
  }

  return true;
}

export const onRequest = defineMiddleware(async (context, next) => {
  const start = Date.now();
  const requestId = randomUUID();

  context.locals.requestId = requestId;
  context.locals.showAds = shouldShowAds(context.request, context.url.pathname);

  try {
    const allowedRoles = getAllowedRolesForPath(context.url.pathname);
    if (allowedRoles) {
      const session = await getSession(context.request, context.locals);
      if (!session?.session?.id) {
        const redirectUrl = new URL("/auth/login", context.url);
        redirectUrl.searchParams.set("next", context.url.pathname);

        return context.redirect(redirectUrl.toString(), 302);
      }

      const userRecord = session.user as Record<string, unknown>;
      const role = resolveUserRoleFromRecord(userRecord);

      if (!hasRoleAccess(context.url.pathname, role)) {
        logInfo("request.forbidden", {
          requestId,
          path: context.url.pathname,
          role,
          requiredRoles: allowedRoles,
        });

        return context.redirect("/errors/403", 302);
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
    if (error instanceof Response) {
      error.headers.set("x-request-id", requestId);
      return error;
    }

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
