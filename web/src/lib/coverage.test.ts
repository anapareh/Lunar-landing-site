import { describe, expect, it } from "vitest";
import { mergeRanges, rangeContaining, snapToCoverage } from "./coverage";

const H = 3_600_000;
const years = [1969, 1970, 2026, 2027].map((y) => ({ start: `${y}-01-01T00:00:00Z`, end: `${y}-12-31T23:00:00Z` }));

describe("mergeRanges", () => {
  it("une años consecutivos y respeta los huecos", () => {
    expect(mergeRanges(years, H)).toEqual([
      { start: "1969-01-01T00:00:00Z", end: "1970-12-31T23:00:00Z" },
      { start: "2026-01-01T00:00:00Z", end: "2027-12-31T23:00:00Z" },
    ]);
  });
});

describe("rangeContaining / snapToCoverage", () => {
  const ranges = mergeRanges(years, H);
  it("encuentra el tramo", () => {
    expect(rangeContaining(ranges, "1969-07-20T00:00:00Z")?.end).toBe("1970-12-31T23:00:00Z");
    expect(rangeContaining(ranges, "1990-01-01T00:00:00Z")).toBeNull();
  });
  it("lleva una fecha sin datos al borde más cercano", () => {
    expect(snapToCoverage(ranges, "1975-01-01T00:00:00Z")).toBe("1970-12-31T23:00:00Z");
    expect(snapToCoverage(ranges, "2020-01-01T00:00:00Z")).toBe("2026-01-01T00:00:00Z");
    expect(snapToCoverage(ranges, "1969-07-20T00:00:00Z")).toBe("1969-07-20T00:00:00Z");
  });
});
