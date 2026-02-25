import { createAuth } from "@/auth/config";
import { getRequestDb } from "@/db/request";

let singletonAuth: ReturnType<typeof createAuth> | null = null;

export function getAuth(locals?: App.Locals) {
  if (locals) {
    return createAuth({ db: getRequestDb(locals) });
  }

  if (!singletonAuth) {
    singletonAuth = createAuth();
  }

  return singletonAuth;
}
