import { describe, expect, it } from "vitest";
import { bestIndices, makeScenario, scenarioId, shiftScenario } from "./compare";
import { SYNODIC_MONTH_DAYS, parseUtc } from "./time";

describe("compare", () => {
  it("id estable con coordenadas redondeadas", () => {
    expect(scenarioId(-89.5, 45, "2026-11-14T00:00:00Z")).toBe("-89.50,45.00@2026-11-14T00:00:00Z");
    expect(makeScenario(-89.5, 45, "2026-11-14T00:00:00Z").id).toBe(scenarioId(-89.5, 45, "2026-11-14T00:00:00Z"));
  });

  it("desplazar un día lunar cambia fecha e id, no el sitio", () => {
    const s = makeScenario(10, 20, "2026-11-14T00:00:00Z");
    const t = shiftScenario(s, 1);
    expect(t.lat).toBe(10);
    expect(t.id).not.toBe(s.id);
    expect((parseUtc(t.date) - parseUtc(s.date)) / 86_400_000).toBeCloseTo(SYNODIC_MONTH_DAYS, 3);
  });

  it("mejores valores de una fila", () => {
    expect(bestIndices([3, 7, 7, null])).toEqual([1, 2]);
    expect(bestIndices([3, 7, 1], false)).toEqual([2]);
    expect(bestIndices([5, 5])).toEqual([]); // sin diferencias, nada que destacar
    expect(bestIndices([5, null])).toEqual([]); // un solo valor
  });
});
