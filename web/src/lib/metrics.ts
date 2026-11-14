/**
 * Métricas de energía y comunicación sobre series con el horizonte ya aplicado (horizon.ts).
 *
 * - Ventanas de visibilidad (inicio, fin, duración), con los instantes de orto y ocaso
 *   interpolados entre muestras a partir del margen de visibilidad.
 * - Cuenta atrás desde un instante: horas hasta el ocaso (si es visible) o hasta el orto.
 * - Horas visibles y elevación máxima en la ventana.
 *
 * La "ventana" es el intervalo que cubre la serie. Las series deben tener un paso uniforme y
 * estar ordenadas en el tiempo (computeSunEarthSeries las genera así).
 */
import type { BodyMetrics, HorizonProfile, HorizonSample, SiteMetrics, SunEarthSeries } from "../types";
import {
  EARTH_RADIUS_KM,
  SUN_RADIUS_KM,
  applyHorizon,
  horizonLevel,
  visibilityMargin,
  type VisibilityOptions,
} from "./horizon";
import { MS_PER_HOUR, parseUtc, toIsoUtc } from "./time";

export interface VisibilityWindow {
  start: string;
  end: string;
  hours: number;
  /** true si ya era visible al empezar la serie (el orto real es anterior). */
  openStart: boolean;
  /** true si sigue visible al acabar la serie (el ocaso real es posterior). */
  openEnd: boolean;
}

export interface Countdown {
  visibleNow: boolean;
  /** Horas hasta el ocaso si es visible ahora; null si no se pone dentro de la serie. */
  hoursToSet: number | null;
  /** Horas hasta el orto si no es visible ahora; null si no sale dentro de la serie. */
  hoursToRise: number | null;
}

/** Instante en que el margen cruza 0 entre (ta, ma) y (tb, mb), por interpolación lineal. */
function crossingMs(ta: number, ma: number, tb: number, mb: number): number {
  return ta + ((tb - ta) * ma) / (ma - mb);
}

function times(samples: HorizonSample[]): number[] {
  return samples.map((s) => parseUtc(s.time));
}

function makeWindow(startMs: number, endMs: number, openStart: boolean, openEnd: boolean): VisibilityWindow {
  return {
    start: toIsoUtc(startMs),
    end: toIsoUtc(endMs),
    hours: (endMs - startMs) / MS_PER_HOUR,
    openStart,
    openEnd,
  };
}

/** Intervalos en los que el cuerpo es visible según `opts`. */
export function visibilityWindows(samples: HorizonSample[], opts: VisibilityOptions = {}): VisibilityWindow[] {
  if (samples.length === 0) return [];
  const t = times(samples);
  const m = samples.map((s) => visibilityMargin(s, opts));
  const out: VisibilityWindow[] = [];
  let startMs: number | null = m[0] > 0 ? t[0] : null;
  let openStart = startMs !== null;

  for (let i = 1; i < samples.length; i++) {
    const was = m[i - 1] > 0;
    const is = m[i] > 0;
    if (!was && is) {
      startMs = crossingMs(t[i - 1], m[i - 1], t[i], m[i]);
      openStart = false;
    } else if (was && !is && startMs !== null) {
      out.push(makeWindow(startMs, crossingMs(t[i - 1], m[i - 1], t[i], m[i]), openStart, false));
      startMs = null;
    }
  }
  if (startMs !== null) out.push(makeWindow(startMs, t[t.length - 1], openStart, true));
  return out;
}

/** Horas totales de visibilidad dentro de la serie. */
export function visibleHours(samples: HorizonSample[], opts: VisibilityOptions = {}): number {
  return visibilityWindows(samples, opts).reduce((acc, w) => acc + w.hours, 0);
}

/** Índice k tal que t[k] ≤ tMs < t[k+1] (o el último). Lanza RangeError fuera de la serie. */
function locate(t: number[], tMs: number): number {
  if (t.length === 0 || tMs < t[0] || tMs > t[t.length - 1]) {
    throw new RangeError(`${toIsoUtc(tMs)} está fuera de la ventana calculada`);
  }
  let k = 0;
  while (k + 1 < t.length && t[k + 1] <= tMs) k++;
  return k;
}

/** Interpola linealmente un valor de las muestras en el instante tMs. */
function valueAt(t: number[], values: number[], tMs: number): number {
  const k = locate(t, tMs);
  if (k === t.length - 1) return values[k];
  return values[k] + ((values[k + 1] - values[k]) * (tMs - t[k])) / (t[k + 1] - t[k]);
}

/** Cuenta atrás hasta el ocaso o el orto desde `fromIso`. */
export function countdown(samples: HorizonSample[], fromIso: string, opts: VisibilityOptions = {}): Countdown {
  const t = times(samples);
  const m = samples.map((s) => visibilityMargin(s, opts));
  const from = parseUtc(fromIso);
  const k = locate(t, from);
  const m0 = valueAt(t, m, from);
  const visibleNow = m0 > 0;

  let hours: number | null = null;
  let prevT = from;
  let prevM = m0;
  for (let j = k + 1; j < t.length; j++) {
    if (m[j] > 0 !== visibleNow) {
      hours = (crossingMs(prevT, prevM, t[j], m[j]) - from) / MS_PER_HOUR;
      break;
    }
    prevT = t[j];
    prevM = m[j];
  }
  return visibleNow
    ? { visibleNow, hoursToSet: hours, hoursToRise: null }
    : { visibleNow, hoursToSet: null, hoursToRise: hours };
}

/** Elevación máxima del centro en la serie. */
export function maxElevation(samples: HorizonSample[]): number {
  return samples.reduce((acc, s) => Math.max(acc, s.elevation_deg), -Infinity);
}

/** Métricas de un cuerpo en el instante `at` y en toda la ventana. */
export function bodyMetrics(samples: HorizonSample[], at: string, opts: VisibilityOptions = {}): BodyMetrics {
  const t = times(samples);
  const atMs = parseUtc(at);
  const c = countdown(samples, at, opts);
  return {
    elevationNowDeg: valueAt(t, samples.map((s) => s.elevation_deg), atMs),
    clearanceNowDeg: valueAt(t, samples.map((s) => s.clearance_deg), atMs),
    visibleFractionNow: valueAt(t, samples.map((s) => s.visible_fraction), atMs),
    visibleNow: c.visibleNow,
    hoursToSet: c.hoursToSet,
    hoursToRise: c.hoursToRise,
    visibleHours: visibleHours(samples, opts),
    maxElevationDeg: maxElevation(samples),
  };
}

export interface SiteMetricsInput {
  scenarioId: string;
  siteId: string;
  series: SunEarthSeries;
  profile: HorizonProfile | null;
  /** Instante de referencia (fecha del escenario), dentro de la serie. */
  at: string;
  sunVisibility?: VisibilityOptions;
  earthVisibility?: VisibilityOptions;
}

/** Agrega todas las métricas de un escenario. */
export function computeSiteMetrics(input: SiteMetricsInput): SiteMetrics {
  const { series, profile } = input;
  if (series.sun.length === 0) throw new RangeError("Serie vacía");
  const sun = applyHorizon(series.sun, profile, SUN_RADIUS_KM);
  const earth = applyHorizon(series.earth, profile, EARTH_RADIUS_KM);
  const windowStart = series.sun[0].time;
  const windowEnd = series.sun[series.sun.length - 1].time;
  return {
    scenarioId: input.scenarioId,
    siteId: input.siteId,
    horizonLevel: horizonLevel(profile),
    at: input.at,
    windowStart,
    windowEnd,
    windowHours: (parseUtc(windowEnd) - parseUtc(windowStart)) / MS_PER_HOUR,
    sun: bodyMetrics(sun, input.at, input.sunVisibility),
    earth: bodyMetrics(earth, input.at, input.earthVisibility),
  };
}
