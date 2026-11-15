import { describe, expect, it } from "vitest";
import { lunarPhase } from "./phase";

const AU = 1.496e8;
const EARTH: [number, number, number] = [384_400, 0, 0];
const sunAt = (lonDeg: number): [number, number, number] => [
  AU * Math.cos((lonDeg * Math.PI) / 180),
  AU * Math.sin((lonDeg * Math.PI) / 180),
  0,
];

describe("lunarPhase", () => {
  it("luna llena: Sol detrás de la Tierra", () => {
    const p = lunarPhase(sunAt(0), EARTH);
    expect(p.name).toBe("Luna llena");
    expect(p.illuminated).toBeCloseTo(1, 6);
  });
  it("luna nueva: Sol sobre la cara oculta", () => {
    const p = lunarPhase(sunAt(180), EARTH);
    expect(p.name).toBe("Luna nueva");
    expect(p.illuminated).toBeCloseTo(0, 6);
  });
  it("cuarto creciente: subsolar a 90° E", () => {
    const p = lunarPhase(sunAt(90), EARTH);
    expect(p.name).toBe("Cuarto creciente");
    expect(p.cycle).toBeCloseTo(0.25, 6);
    expect(p.illuminated).toBeCloseTo(0.5, 6);
  });
  it("cuarto menguante: subsolar a 90° O", () => {
    const p = lunarPhase(sunAt(-90), EARTH);
    expect(p.name).toBe("Cuarto menguante");
    expect(p.cycle).toBeCloseTo(0.75, 6);
  });
});
