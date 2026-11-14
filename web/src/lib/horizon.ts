/**
 * Horizonte local: aplica el perfil de relieve (horizons/<site_id>.json) a una serie topocéntrica.
 *
 * Niveles (ver docs/architecture.md):
 * - "dem": perfil de 360/paso acimuts precalculado desde LOLA, interpolado linealmente y de forma
 *   circular (el último acimut enlaza con el primero).
 * - "geometric": sin perfil, horizonte a 0° (esfera). Se usa con las coordenadas libres.
 *
 * El disco del Sol o la Tierra no es puntual: se calcula su radio angular y la fracción visible
 * sobre el horizonte, suponiendo que el horizonte es una recta horizontal a la altura del perfil en
 * el acimut del centro. Es una buena aproximación para discos pequeños; ignora la pendiente del
 * horizonte dentro del propio disco.
 */
import type { HorizonLevel, HorizonProfile, HorizonSample, TopocentricSample } from "../types";
import { clamp, normalizeDeg360, rad2deg } from "./vec";

/** Radio solar nominal (IAU 2015), km. */
export const SUN_RADIUS_KM = 695_700;
/** Radio medio de la Tierra, km. */
export const EARTH_RADIUS_KM = 6_371.0;

export function horizonLevel(profile: HorizonProfile | null): HorizonLevel {
  return profile ? "dem" : "geometric";
}

/** Elevación del horizonte (grados) en un acimut, interpolando el perfil; 0 si no hay perfil. */
export function horizonElevationAt(profile: HorizonProfile | null, azimuthDeg: number): number {
  if (!profile) return 0;
  const values = profile.horizon_elevation_deg;
  const n = values.length;
  const x = normalizeDeg360(azimuthDeg) / profile.azimuth_step_deg;
  const base = Math.floor(x);
  const i0 = base % n;
  const i1 = (i0 + 1) % n;
  return values[i0] + (values[i1] - values[i0]) * (x - base);
}

/** Radio angular (grados) de una esfera de radio `radiusKm` vista a `distanceKm`. */
export function angularRadiusDeg(radiusKm: number, distanceKm: number): number {
  return rad2deg(Math.asin(clamp(radiusKm / distanceKm, 0, 1)));
}

/**
 * Fracción del área de un disco por encima de una recta horizontal.
 * `clearanceDeg` = altura del centro sobre la recta; `radiusDeg` = radio angular del disco.
 */
export function visibleDiskFraction(clearanceDeg: number, radiusDeg: number): number {
  if (radiusDeg <= 0) return clearanceDeg > 0 ? 1 : 0;
  const x = clamp(clearanceDeg / radiusDeg, -1, 1);
  return 1 - (Math.acos(x) - x * Math.sqrt(1 - x * x)) / Math.PI;
}

/** Aplica el horizonte a cada muestra de una serie de un cuerpo de radio `bodyRadiusKm`. */
export function applyHorizon(
  samples: TopocentricSample[],
  profile: HorizonProfile | null,
  bodyRadiusKm: number,
): HorizonSample[] {
  return samples.map((s) => {
    const horizon_deg = horizonElevationAt(profile, s.azimuth_deg);
    const clearance_deg = s.elevation_deg - horizon_deg;
    const angular_radius_deg = angularRadiusDeg(bodyRadiusKm, s.distance_km);
    return {
      ...s,
      horizon_deg,
      clearance_deg,
      angular_radius_deg,
      visible_fraction: visibleDiskFraction(clearance_deg, angular_radius_deg),
    };
  });
}

/**
 * Criterio de visibilidad (pendiente de cerrar: Q-006, Q-007 en docs/decisions.md):
 * - disk: qué parte del disco debe estar sobre el horizonte local:
 *   "anyPart" = borde superior (por defecto), "center" = centro, "full" = disco entero.
 * - minClearanceDeg: margen adicional sobre el relieve (p. ej. máscara de elevación de una antena).
 */
export type DiskCriterion = "anyPart" | "center" | "full";

export interface VisibilityOptions {
  disk?: DiskCriterion;
  minClearanceDeg?: number;
}

/**
 * Margen de visibilidad en grados: > 0 visible, ≤ 0 no visible. Es continuo en el tiempo, así
 * que permite interpolar el instante exacto de orto y ocaso entre muestras.
 */
export function visibilityMargin(s: HorizonSample, opts: VisibilityOptions = {}): number {
  const disk = opts.disk ?? "anyPart";
  const diskOffset = disk === "anyPart" ? -s.angular_radius_deg : disk === "full" ? s.angular_radius_deg : 0;
  return s.clearance_deg - diskOffset - (opts.minClearanceDeg ?? 0);
}

export function isVisible(s: HorizonSample, opts: VisibilityOptions = {}): boolean {
  return visibilityMargin(s, opts) > 0;
}
