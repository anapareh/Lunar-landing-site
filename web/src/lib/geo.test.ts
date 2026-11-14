import { describe, expect, it } from "vitest";
import { isLitGeometric, subPoint, surfaceNormal } from "./geo";

describe("geo", () => {
  it("subPoint: ejes del marco lunar", () => {
    expect(subPoint([10, 0, 0])).toEqual({ lat: 0, lon: 0 });
    const e = subPoint([0, 5, 0]);
    expect(e.lat).toBeCloseTo(0, 12);
    expect(e.lon).toBeCloseTo(90, 12);
    expect(subPoint([0, 0, 3]).lat).toBeCloseTo(90, 12);
    expect(subPoint([-1, -1e-9, 0]).lon).toBeCloseTo(-180, 6);
    expect(subPoint([0, -2, 0]).lon).toBeCloseTo(-90, 12);
  });

  it("surfaceNormal es unitaria y coherente con subPoint", () => {
    const n = surfaceNormal(-45, 120);
    expect(Math.hypot(...n)).toBeCloseTo(1, 12);
    const p = subPoint(n);
    expect(p.lat).toBeCloseTo(-45, 9);
    expect(p.lon).toBeCloseTo(120, 9);
  });

  it("terminador geométrico", () => {
    const sun: [number, number, number] = [1, 0, 0];
    expect(isLitGeometric(0, 0, sun)).toBe(true);
    expect(isLitGeometric(0, 180, sun)).toBe(false);
    expect(isLitGeometric(0, 89, sun)).toBe(true);
    expect(isLitGeometric(0, 91, sun)).toBe(false);
    expect(isLitGeometric(-89.5, 0, sun)).toBe(true); // por poco
  });
});
