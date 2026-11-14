import { describe, expect, it } from "vitest";
import { elevationAxis } from "./chartScale";

describe("elevationAxis", () => {
  it("eje completo si los datos recorren mucho rango", () => {
    const a = elevationAxis([-80, 0, 85]);
    expect(a.domain).toEqual([-90, 90]);
    expect(a.zoomed).toBe(false);
  });

  it("ampliado cerca del horizonte, incluyendo siempre 0°", () => {
    const a = elevationAxis([1.2, 2.8, 4.9]);
    expect(a.zoomed).toBe(true);
    expect(a.domain[0]).toBeLessThanOrEqual(0);
    expect(a.domain[1]).toBeGreaterThanOrEqual(4.9);
    expect(a.ticks).toContain(0);
    expect(a.domain[1]).toBeLessThan(10);
  });

  it("valores diminutos (polo sur con datos sintéticos)", () => {
    const a = elevationAxis([-0.3, 0.1, 0.27]);
    expect(a.step).toBeLessThanOrEqual(0.25);
    expect(a.ticks[0]).toBe(a.domain[0]);
    expect(a.ticks.at(-1)).toBe(a.domain[1]);
  });

  it("no pasa de ±90 y tolera listas vacías", () => {
    const a = elevationAxis([-60, -2]);
    expect(a.domain[0]).toBeGreaterThanOrEqual(-90);
    expect(elevationAxis([]).domain).toEqual([-90, 90]);
  });
});
