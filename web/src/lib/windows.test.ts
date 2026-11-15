import { describe, expect, it } from "vitest";
import { gapWindows, intersectWindows, longestWindow } from "./windows";
import type { VisibilityWindow } from "./metrics";

const w = (s: string, e: string, h: number, openStart = false, openEnd = false): VisibilityWindow => ({
  start: `2026-01-${s}:00:00Z`,
  end: `2026-01-${e}:00:00Z`,
  hours: h,
  openStart,
  openEnd,
});

describe("intersectWindows", () => {
  it("solapa intervalos y conserva si tocan el borde", () => {
    const sun = [w("01T00", "10T00", 216, true)];
    const earth = [w("05T00", "15T00", 240, false, true)];
    const r = intersectWindows(sun, earth);
    expect(r).toHaveLength(1);
    expect(r[0].start).toBe("2026-01-05T00:00:00Z");
    expect(r[0].end).toBe("2026-01-10T00:00:00Z");
    expect(r[0].hours).toBe(120);
    expect(r[0].openStart).toBe(false);
    expect(r[0].openEnd).toBe(false);
  });
  it("sin solape → vacío", () => {
    expect(intersectWindows([w("01T00", "02T00", 24)], [w("03T00", "04T00", 24)])).toEqual([]);
  });
});

describe("gapWindows", () => {
  it("devuelve los huecos, marcando los que tocan los bordes", () => {
    const g = gapWindows([w("03T00", "05T00", 48)], "2026-01-01T00:00:00Z", "2026-01-10T00:00:00Z");
    expect(g.map((x) => [x.hours, x.openStart, x.openEnd])).toEqual([
      [48, true, false],
      [120, false, true],
    ]);
  });
  it("sin ventanas → todo es hueco", () => {
    const g = gapWindows([], "2026-01-01T00:00:00Z", "2026-01-02T00:00:00Z");
    expect(g).toHaveLength(1);
    expect(g[0].hours).toBe(24);
  });
});

describe("longestWindow", () => {
  it("elige la más larga", () => {
    expect(longestWindow([w("01T00", "02T00", 24), w("03T00", "06T00", 72)])?.hours).toBe(72);
    expect(longestWindow([])).toBeNull();
  });
});
