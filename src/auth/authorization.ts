export type AppRole = "admin" | "user";

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
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim().toLowerCase();
  if (normalized === "admin") {
    return "admin";
  }

  if (
    normalized === "user"
    || normalized === "candidate"
    || normalized === "employer"
    || normalized === "company"
  ) {
    return "user";
  }

  return null;
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
