import { createAuth } from "@/auth/config";
import { getRequestDb } from "@/db/request";

let singletonAuth: ReturnType<typeof createAuth> | null = null;

function getRuntimeEnv(locals: App.Locals | undefined): Record<string, unknown> | undefined {
  if (!locals || typeof locals !== "object") {
    return undefined;
  }

  const runtime = (locals as { runtime?: { env?: Record<string, unknown> } }).runtime;
  return runtime?.env;
}

export function getAuth(locals?: App.Locals) {
  if (locals) {
    return createAuth({
      db: getRequestDb(locals),
      env: getRuntimeEnv(locals),
    });
  }

  if (!singletonAuth) {
    singletonAuth = createAuth();
  }

  return singletonAuth;
}
