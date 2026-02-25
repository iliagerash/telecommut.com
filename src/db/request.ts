import { getDb } from "@/db/runtime";

type RuntimeLocals = App.Locals & {
  runtime?: {
    env?: AppRuntime;
  };
};

export function getRequestDb(locals: App.Locals) {
  const runtimeEnv = (locals as RuntimeLocals).runtime?.env;
  const configuredClient = (import.meta.env.DB_CLIENT ?? process.env.DB_CLIENT ?? "")
    .trim()
    .toLowerCase();

  if (configuredClient === "sqlite") {
    return getDb({ client: "sqlite" });
  }

  if (configuredClient === "d1") {
    return getDb({
      d1: runtimeEnv?.DB,
      client: "d1",
    });
  }

  return getDb({
    d1: runtimeEnv?.DB,
    client: runtimeEnv?.DB ? "d1" : "sqlite",
  });
}
