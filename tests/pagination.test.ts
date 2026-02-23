import { describe, expect, it } from "vitest";

import { buildPaginationState, parsePageParam } from "../src/lib/pagination";

describe("pagination helpers", () => {
  it("normalizes invalid page values to 1", () => {
    expect(parsePageParam(undefined)).toBe(1);
    expect(parsePageParam(null)).toBe(1);
    expect(parsePageParam("0")).toBe(1);
    expect(parsePageParam("-5")).toBe(1);
    expect(parsePageParam("abc")).toBe(1);
  });

  it("builds page and offset state", () => {
    expect(buildPaginationState("1", 20)).toEqual({
      page: 1,
      pageSize: 20,
      offset: 0,
    });
    expect(buildPaginationState("3", 20)).toEqual({
      page: 3,
      pageSize: 20,
      offset: 40,
    });
  });
});
