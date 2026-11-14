/**
 * Eje vertical de elevación: completo (−90..90) cuando los datos recorren mucho rango, y ampliado
 * cuando todo ocurre cerca del horizonte (típico del polo sur, donde el Sol roza el horizonte).
 * Siempre incluye 0° (el horizonte geométrico).
 */

export interface ElevationAxis {
  domain: [number, number];
  ticks: number[];
  /** Paso entre marcas (para decidir decimales). */
  step: number;
  /** true si no es el eje completo −90..90. */
  zoomed: boolean;
}

const FULL: ElevationAxis = { domain: [-90, 90], ticks: [-90, -45, 0, 45, 90], step: 45, zoomed: false };
const STEPS = [0.1, 0.2, 0.25, 0.5, 1, 2, 5, 10, 15, 20, 30];

export function elevationAxis(values: number[]): ElevationAxis {
  const finite = values.filter(Number.isFinite);
  if (finite.length === 0) return FULL;
  let lo = 0;
  let hi = 0;
  for (const v of finite) {
    if (v < lo) lo = v;
    if (v > hi) hi = v;
  }
  if (hi - lo > 60) return FULL;

  const span = Math.max(hi - lo, 0.5);
  const step = STEPS.find((s) => s >= span / 4) ?? 30;
  const pad = span * 0.1;
  const min = Math.max(-90, Math.floor((lo - pad) / step) * step);
  const max = Math.min(90, Math.ceil((hi + pad) / step) * step);
  const ticks: number[] = [];
  for (let i = 0; min + i * step <= max + 1e-9; i++) ticks.push(Math.round((min + i * step) * 1000) / 1000);
  return { domain: [min, max], ticks, step, zoomed: true };
}
