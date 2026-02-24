import { resolveAccessRoleFromRoleColumn, resolveNormalizedUserRole, type AppAccessRole } from "@/services/users/role-adapter";

export type AppRole = AppAccessRole;

type RolePolicy = {
  pathPrefix: string;
  allowedRoles: AppRole[];
};

const rolePolicies: RolePolicy[] = [
  {
    pathPrefix: "/admin",
    allowedRoles: ["admin"],
  },
  {
    pathPrefix: "/app",
    allowedRoles: ["user", "admin"],
  },
  {
    pathPrefix: "/dashboard",
    allowedRoles: ["user", "admin"],
  },
];

export function getAllowedRolesForPath(pathname: string): AppRole[] | null {
  for (const policy of rolePolicies) {
    if (pathname.startsWith(policy.pathPrefix)) {
      return policy.allowedRoles;
    }
  }

  return null;
}

export function resolveUserRole(value: unknown): AppRole | null {
  const normalized = resolveNormalizedUserRole(value);
  if (!normalized) {
    return null;
  }

  return normalized === "admin" ? "admin" : "user";
}

export function resolveUserRoleFromRecord(record: { role?: unknown; type?: unknown } | null | undefined): AppRole | null {
  return resolveAccessRoleFromRoleColumn(record);
}

export function hasRoleAccess(pathname: string, role: AppRole | null): boolean {
  const allowedRoles = getAllowedRolesForPath(pathname);
  if (!allowedRoles) {
    return true;
  }

  if (!role) {
    return false;
  }

  return allowedRoles.includes(role);
}
