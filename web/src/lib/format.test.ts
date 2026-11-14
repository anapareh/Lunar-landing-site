import { describe, expect, it } from "vitest";
import { formatDeg, formatDuration, formatHours, formatPercent, formatUtc } from "./format";

describe("format", () => {
  it("duraciones", () => {
    expect(formatDuration(null)).toBe("—");
    expect(formatDuration(0.005)).toBe("< 1 min");
    expect(formatDuration(0.2)).toBe("12 min");
    expect(formatDuration(5.2)).toBe("5 h 12 min");
    expect(formatDuration(3)).toBe("3 h");
    expect(formatDuration(76)).toBe("3 d 4 h");
    expect(formatDuration(48)).toBe("2 d");
  });

  it("números en es-ES", () => {
    expect(formatDeg(12.345)).toBe("12,3°");
    expect(formatDeg(-0.26)).toBe("-0,3°");
    expect(formatHours(354.25)).toBe("354,3 h");
    expect(formatPercent(0.374)).toBe("37 %");
  });

  it("fechas siempre en UTC", () => {
    expect(formatUtc("2026-11-14T09:30:00Z")).toMatch(/14 nov 2026.*09:30 UTC/);
  });
});
