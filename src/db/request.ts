import { getDb } from "@/db/runtime";

export function getRequestDb(_locals: App.Locals) {
  void _locals;
  return getDb();
}
