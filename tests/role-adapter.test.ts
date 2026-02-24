import { describe, expect, it } from "vitest";

import {
  buildCompatibleUserRoleWrite,
  resolveAccessRoleFromRecord,
  resolveNormalizedUserRole,
  resolveNormalizedUserRoleFromRecord,
  toLegacyTypeFromNormalizedRole,
} from "../src/services/users/role-adapter";

describe("role adapter", () => {
  it("normalizes legacy and modern role values", () => {
    expect(resolveNormalizedUserRole("admin")).toBe("admin");
    expect(resolveNormalizedUserRole("user")).toBe("candidate");
    expect(resolveNormalizedUserRole("candidate")).toBe("candidate");
    expect(resolveNormalizedUserRole("company")).toBe("employer");
    expect(resolveNormalizedUserRole("unknown")).toBeNull();
  });

  it("dual-reads role first, then falls back to type", () => {
    expect(resolveNormalizedUserRoleFromRecord({ role: "candidate", type: "admin" })).toBe("candidate");
    expect(resolveNormalizedUserRoleFromRecord({ role: " ", type: "employer" })).toBe("employer");
    expect(resolveNormalizedUserRoleFromRecord({ type: "company" })).toBe("employer");
  });

  it("maps normalized roles to access roles", () => {
    expect(resolveAccessRoleFromRecord({ role: "admin" })).toBe("admin");
    expect(resolveAccessRoleFromRecord({ role: "candidate" })).toBe("user");
    expect(resolveAccessRoleFromRecord({ type: "company" })).toBe("user");
    expect(resolveAccessRoleFromRecord({ role: "unknown" })).toBeNull();
  });

  it("builds dual-write payloads", () => {
    expect(toLegacyTypeFromNormalizedRole("admin")).toBe("admin");
    expect(toLegacyTypeFromNormalizedRole("candidate")).toBe("candidate");
    expect(toLegacyTypeFromNormalizedRole("employer")).toBe("employer");
    expect(buildCompatibleUserRoleWrite("user")).toEqual({ role: "candidate", type: "candidate" });
    expect(buildCompatibleUserRoleWrite("company")).toEqual({ role: "employer", type: "employer" });
    expect(buildCompatibleUserRoleWrite("invalid")).toBeNull();
  });
});
