import { describe, expect, it } from "vitest";
import { columnSamples, fractionOf, timeAtFraction } from "./timeline";

describe("timeline", () => {
  it("fracción e instante son inversos y se recortan a la ventana", () => {
    expect(fractionOf(150, 100, 200)).toBe(0.5);
    expect(timeAtFraction(0.5, 100, 200)).toBe(150);
    expect(fractionOf(50, 100, 200)).toBe(0);
    expect(fractionOf(250, 100, 200)).toBe(1);
    expect(timeAtFraction(1.7, 100, 200)).toBe(200);
    expect(fractionOf(5, 100, 100)).toBe(0);
  });

  it("cada columna apunta a una muestra válida, en orden", () => {
    const idx = columnSamples(10, 4);
    expect(idx).toHaveLength(4);
    expect(idx.every((i) => i >= 0 && i <= 9)).toBe(true);
    expect([...idx].sort((a, b) => a - b)).toEqual(idx);
    expect(columnSamples(3, 100).at(-1)).toBe(2);
    expect(columnSamples(0, 10)).toEqual([]);
  });
});
