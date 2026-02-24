import { describe, expect, it } from "vitest";

import {
  buildModerationDecision,
  computeModerationSideEffects,
  parseEntityId,
  parseModerationAction,
} from "../src/services/admin/moderation";

describe("moderation helpers", () => {
  it("parses supported actions and entity ids", () => {
    expect(parseModerationAction("approve")).toBe("approve");
    expect(parseModerationAction("ban")).toBe("ban");
    expect(parseModerationAction("restore")).toBe("restore");
    expect(parseModerationAction("delete")).toBeNull();

    expect(parseEntityId("10")).toBe(10);
    expect(parseEntityId(22)).toBe(22);
    expect(parseEntityId("0")).toBeNull();
  });

  it("returns deterministic moderation patches", () => {
    const approve = buildModerationDecision("approve");
    const ban = buildModerationDecision("ban");
    const restore = buildModerationDecision("restore");

    expect(approve.status).toBe(1);
    expect(approve.patch.status).toBe(1);
    expect(ban.status).toBe(0);
    expect("deletedAt" in ban.patch).toBe(false);
    expect(restore.status).toBe(1);
    expect("deletedAt" in restore.patch).toBe(false);
  });

  it("declares expected side effects by entity/action", () => {
    expect(computeModerationSideEffects("jobs", "ban")).toEqual(["job_removals.insert"]);
    expect(computeModerationSideEffects("jobs", "restore")).toEqual(["job_removals.resolve"]);
    expect(computeModerationSideEffects("jobs", "approve")).toEqual([]);
    expect(computeModerationSideEffects("resumes", "ban")).toEqual([]);
  });
});
