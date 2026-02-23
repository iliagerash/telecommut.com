import { createAuthClient } from "better-auth/react";

const baseURL = import.meta.env.PUBLIC_APP_URL ?? "http://localhost:4321";

export const authClient = createAuthClient({
  baseURL,
});
