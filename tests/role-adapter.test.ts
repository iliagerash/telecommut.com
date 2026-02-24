import { describe, expect, it } from "vitest";

import {
  resolveAccessRoleFromRoleColumn,
  buildUserRoleWrite,
  resolveAccessRoleFromRecord,
  resolveNormalizedUserRole,
  resolveNormalizedUserRoleFromRoleColumn,
  resolveNormalizedUserRoleFromRecord,
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

  it("supports role-column-only reads for cutover", () => {
    expect(resolveNormalizedUserRoleFromRoleColumn({ role: "candidate", type: "admin" })).toBe("candidate");
    expect(resolveNormalizedUserRoleFromRoleColumn({ type: "company" })).toBeNull();
    expect(resolveAccessRoleFromRoleColumn({ role: "admin", type: "candidate" })).toBe("admin");
    expect(resolveAccessRoleFromRoleColumn({ type: "company" })).toBeNull();
  });

  it("builds role-only write payloads", () => {
    expect(buildUserRoleWrite("user")).toEqual({ role: "candidate" });
    expect(buildUserRoleWrite("company")).toEqual({ role: "employer" });
    expect(buildUserRoleWrite("invalid")).toBeNull();
  });
});
