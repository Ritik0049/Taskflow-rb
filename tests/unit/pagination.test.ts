import { describe, it, expect } from "vitest";
import { parsePagination, toSkipTake, buildPage } from "../../src/lib/pagination";

describe("pagination helper", () => {
  it("defaults to page 1, limit 20", () => {
    expect(parsePagination({})).toEqual({ page: 1, limit: 20 });
  });

  it("clamps limit to a maximum of 100", () => {
    expect(parsePagination({ limit: 5000 }).limit).toBe(100);
  });

  it("rejects page numbers below 1", () => {
    expect(parsePagination({ page: -3 }).page).toBe(1);
  });

  it("converts page and limit into skip and take", () => {
    expect(toSkipTake({ page: 3, limit: 10 })).toEqual({ skip: 20, take: 10 });
  });

  it("builds the response envelope required by the brief", () => {
    expect(buildPage([1, 2], 57, { page: 2, limit: 20 })).toEqual({
      data: [1, 2],
      total: 57,
      page: 2,
      limit: 20,
    });
  });
});