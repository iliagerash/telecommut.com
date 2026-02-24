import { describe, expect, it } from "vitest";

import {
  getAllowedRolesForPath,
  hasRoleAccess,
  resolveUserRoleFromRecord,
  resolveUserRole,
} from "../src/auth/authorization";

describe("authorization policy", () => {
  it("maps protected paths to expected role sets", () => {
    expect(getAllowedRolesForPath("/admin/jobs")).toEqual(["admin"]);
    expect(getAllowedRolesForPath("/app/profile")).toEqual(["user", "admin"]);
    expect(getAllowedRolesForPath("/dashboard")).toEqual(["user", "admin"]);
    expect(getAllowedRolesForPath("/public/about")).toBeNull();
  });

  it("normalizes role aliases from legacy user types", () => {
    expect(resolveUserRole("admin")).toBe("admin");
    expect(resolveUserRole("candidate")).toBe("user");
    expect(resolveUserRole("employer")).toBe("user");
    expect(resolveUserRole("company")).toBe("user");
    expect(resolveUserRole("unknown")).toBeNull();
  });

  it("resolves role from role column only during cutover", () => {
    expect(resolveUserRoleFromRecord({ role: "employer", type: "admin" })).toBe("user");
    expect(resolveUserRoleFromRecord({ role: "admin", type: "candidate" })).toBe("admin");
    expect(resolveUserRoleFromRecord({ type: "company" })).toBeNull();
    expect(resolveUserRoleFromRecord({ role: "unknown", type: "unknown" })).toBeNull();
  });

  it("enforces block-by-default behavior on protected areas", () => {
    expect(hasRoleAccess("/admin/jobs", "admin")).toBe(true);
    expect(hasRoleAccess("/admin/jobs", "user")).toBe(false);
    expect(hasRoleAccess("/admin/jobs", null)).toBe(false);
    expect(hasRoleAccess("/app/profile", "user")).toBe(true);
    expect(hasRoleAccess("/app/profile", "admin")).toBe(true);
    expect(hasRoleAccess("/app/profile", null)).toBe(false);
    expect(hasRoleAccess("/public/about", null)).toBe(true);
  });
});
