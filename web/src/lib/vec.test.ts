import { describe, expect, it } from "vitest";
import { cross, dot, lerp, norm, normalize, normalizeDeg360, rad2deg, deg2rad, sub } from "./vec";

describe("vec", () => {
  it("producto escalar y vectorial", () => {
    expect(dot([1, 2, 3], [4, 5, 6])).toBe(32);
    expect(cross([1, 0, 0], [0, 1, 0])).toEqual([0, 0, 1]);
    expect(cross([0, 1, 0], [1, 0, 0])).toEqual([0, 0, -1]);
  });

  it("norma, normalización y resta", () => {
    expect(norm([3, 4, 12])).toBe(13);
    const u = normalize([0, 0, 5]);
    expect(u).toEqual([0, 0, 1]);
    expect(sub([5, 5, 5], [1, 2, 3])).toEqual([4, 3, 2]);
    expect(() => normalize([0, 0, 0])).toThrow(RangeError);
  });

  it("interpolación lineal", () => {
    expect(lerp([0, 0, 0], [10, -10, 4], 0.5)).toEqual([5, -5, 2]);
    expect(lerp([1, 1, 1], [3, 3, 3], 0)).toEqual([1, 1, 1]);
    expect(lerp([1, 1, 1], [3, 3, 3], 1)).toEqual([3, 3, 3]);
  });

  it("ángulos", () => {
    expect(rad2deg(deg2rad(123.4))).toBeCloseTo(123.4, 12);
    expect(normalizeDeg360(-90)).toBe(270);
    expect(normalizeDeg360(360)).toBe(0);
    expect(normalizeDeg360(725)).toBe(5);
  });
});
