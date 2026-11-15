import { describe, expect, it } from "vitest";
import { conditionOf, geometricCondition } from "./conditions";

describe("conditionOf", () => {
  it("clasifica los cuatro casos", () => {
    expect(conditionOf(true, true)).toBe("both");
    expect(conditionOf(true, false)).toBe("sun");
    expect(conditionOf(false, true)).toBe("earth");
    expect(conditionOf(false, false)).toBe("none");
  });
});

describe("geometricCondition", () => {
  const sun: [number, number, number] = [0, 1.5e8, 0]; // Sol sobre lon 90° E
  const earth: [number, number, number] = [384_400, 0, 0]; // Tierra sobre lon 0
  it("cara visible al este: Sol y Tierra", () => expect(geometricCondition(0, 45, sun, earth)).toBe("both"));
  it("cara oculta al este: solo Sol", () => expect(geometricCondition(0, 135, sun, earth)).toBe("sun"));
  it("cara visible al oeste: solo Tierra", () => expect(geometricCondition(0, -45, sun, earth)).toBe("earth"));
  it("cara oculta al oeste: ninguno", () => expect(geometricCondition(0, -135, sun, earth)).toBe("none"));
});
