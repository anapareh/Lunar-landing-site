/**
 * Utilidades de la comparación de escenarios (sitio + fecha).
 */
import type { Scenario } from "../types";
import { addLunarDays } from "./time";

/** Id estable de un escenario: coordenadas redondeadas + fecha. */
export function scenarioId(lat: number, lon: number, date: string): string {
  return `${lat.toFixed(2)},${lon.toFixed(2)}@${date}`;
}

export function makeScenario(lat: number, lon: number, date: string, label = "Coordenadas libres"): Scenario {
  return { id: scenarioId(lat, lon, date), siteId: `custom-${lat}-${lon}`, label, lat, lon, date };
}

/** El mismo escenario desplazado n días lunares (caso "retraso del lanzamiento"). */
export function shiftScenario(s: Scenario, lunarDays: number): Scenario {
  const date = addLunarDays(s.date, lunarDays);
  return { ...s, id: scenarioId(s.lat, s.lon, date), date };
}

/**
 * Índices de los mejores valores de una fila (puede haber empate). Ignora null.
 * Devuelve [] si no hay al menos dos valores distintos (no hay nada que destacar).
 */
export function bestIndices(values: (number | null)[], higherIsBetter = true): number[] {
  const nums = values.filter((v): v is number => v !== null && Number.isFinite(v));
  if (nums.length < 2 || Math.max(...nums) - Math.min(...nums) < 1e-9) return [];
  const best = higherIsBetter ? Math.max(...nums) : Math.min(...nums);
  return values.flatMap((v, i) => (v !== null && Math.abs(v - best) < 1e-9 ? [i] : []));
}
