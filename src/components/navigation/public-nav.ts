export type HeaderUserType = "guest" | "candidate" | "employer" | "admin";

export function normalizeHeaderUserType(record: {
  role?: unknown;
  type?: unknown;
} | null | undefined): HeaderUserType {
  const raw = String(record?.role ?? record?.type ?? "").trim().toLowerCase();

  if (raw === "admin") return "admin";
  if (raw === "employer") return "employer";
  if (raw === "candidate") return "candidate";

  return record ? "candidate" : "guest";
}

export function shouldShowPostResume(userType: HeaderUserType): boolean {
  return userType === "guest" || userType === "candidate";
}

export function shouldShowEmployerLinks(userType: HeaderUserType): boolean {
  return userType === "guest" || userType === "employer";
}
