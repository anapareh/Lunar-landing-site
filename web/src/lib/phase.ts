/**
 * Fase de la Luna vista desde la Tierra, a partir de los vectores centro Luna → Sol y → Tierra.
 *
 * - Ángulo de fase i = ángulo Sol–Luna–Tierra; fracción iluminada = (1 + cos i) / 2.
 * - Creciente o menguante: longitud del punto subsolar respecto al sub-terrestre
 *   (Δ = lon_sol − lon_tierra): luna nueva Δ ≈ ±180°, cuarto creciente +90°, llena 0°,
 *   cuarto menguante −90°. Fracción del ciclo = (180° − Δ) / 360°.
 */
import type { Vector3 } from "../types";
import { subPoint } from "./geo";
import { clamp, dot, norm } from "./vec";

export const PHASE_NAMES = [
  "Luna nueva",
  "Creciente",
  "Cuarto creciente",
  "Gibosa creciente",
  "Luna llena",
  "Gibosa menguante",
  "Cuarto menguante",
  "Menguante",
] as const;

export interface LunarPhase {
  /** 0 = nueva, 0,25 = cuarto creciente, 0,5 = llena, 0,75 = cuarto menguante. */
  cycle: number;
  /** Fracción del disco iluminada vista desde la Tierra (0..1). */
  illuminated: number;
  name: (typeof PHASE_NAMES)[number];
}

export function lunarPhase(sun: Vector3, earth: Vector3): LunarPhase {
  const i = Math.acos(clamp(dot(sun, earth) / (norm(sun) * norm(earth)), -1, 1));
  const ds = subPoint(sun).lon - subPoint(earth).lon;
  const delta = ((((ds + 180) % 360) + 360) % 360) - 180;
  const cycle = ((((180 - delta) / 360) % 1) + 1) % 1;
  const idx = Math.floor(((cycle + 1 / 16) % 1) * 8) % 8;
  return { cycle, illuminated: (1 + Math.cos(i)) / 2, name: PHASE_NAMES[idx] };
}
