export type NormalizedUserRole = "admin" | "candidate" | "employer";
export type AppAccessRole = "admin" | "user";

type RoleRecord = {
  role?: unknown;
  type?: unknown;
};

function normalizeRoleValue(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim().toLowerCase();
  return normalized.length > 0 ? normalized : null;
}

function mapLegacyRoleAlias(value: string | null): NormalizedUserRole | null {
  if (!value) {
    return null;
  }

  if (value === "admin") {
    return "admin";
  }

  if (value === "candidate" || value === "user") {
    return "candidate";
  }

  if (value === "employer" || value === "company") {
    return "employer";
  }

  return null;
}

export function resolveNormalizedUserRole(input: unknown): NormalizedUserRole | null {
  return mapLegacyRoleAlias(normalizeRoleValue(input));
}

export function resolveNormalizedUserRoleFromRoleColumn(record: RoleRecord | null | undefined): NormalizedUserRole | null {
  return mapLegacyRoleAlias(normalizeRoleValue(record?.role));
}

export function resolveNormalizedUserRoleFromRecord(record: RoleRecord | null | undefined): NormalizedUserRole | null {
  const role = resolveNormalizedUserRoleFromRoleColumn(record);
  if (role) {
    return role;
  }

  return mapLegacyRoleAlias(normalizeRoleValue(record?.type));
}

export function resolveAccessRoleFromRoleColumn(record: RoleRecord | null | undefined): AppAccessRole | null {
  const normalizedRole = resolveNormalizedUserRoleFromRoleColumn(record);
  if (!normalizedRole) {
    return null;
  }

  return normalizedRole === "admin" ? "admin" : "user";
}

export function resolveAccessRoleFromRecord(record: RoleRecord | null | undefined): AppAccessRole | null {
  const normalizedRole = resolveNormalizedUserRoleFromRecord(record);
  if (!normalizedRole) {
    return null;
  }

  return normalizedRole === "admin" ? "admin" : "user";
}

export function toLegacyTypeFromNormalizedRole(role: NormalizedUserRole): "admin" | "candidate" | "employer" {
  if (role === "admin") {
    return "admin";
  }

  if (role === "candidate") {
    return "candidate";
  }

  return "employer";
}

export function buildCompatibleUserRoleWrite(input: unknown): { role: NormalizedUserRole; type: "admin" | "candidate" | "employer" } | null {
  const normalizedRole = resolveNormalizedUserRole(input);
  if (!normalizedRole) {
    return null;
  }

  return {
    role: normalizedRole,
    type: toLegacyTypeFromNormalizedRole(normalizedRole),
  };
}
