import { getDb } from "@/db/runtime";

type RuntimeLocals = App.Locals & {
  runtime?: {
    env?: AppRuntime;
  };
};

export function getRequestDb(locals: App.Locals) {
  const runtimeEnv = (locals as RuntimeLocals).runtime?.env;

  return getDb({
    d1: runtimeEnv?.DB,
    client: runtimeEnv?.DB ? "d1" : "sqlite",
  });
}
