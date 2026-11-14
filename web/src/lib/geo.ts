/**
 * Geometría a escala global de la Luna (sin relieve), para el radar del terminador.
 * Marco lunar fijo: +X = lat 0 / lon 0, +Y = lon 90° E, +Z = polo norte.
 */
import type { Vector3 } from "../types";
import { normalizeDeg360, rad2deg } from "./vec";

/** Punto de la superficie bajo un cuerpo (subsolar, sub-terrestre): lat/lon de su dirección. */
export function subPoint(v: Vector3): { lat: number; lon: number } {
  const r = Math.hypot(v[0], v[1], v[2]);
  const lon = normalizeDeg360(rad2deg(Math.atan2(v[1], v[0])));
  return { lat: rad2deg(Math.asin(v[2] / r)), lon: lon > 180 ? lon - 360 : lon };
}

/** Normal unitaria de la esfera en lat/lon (grados). */
export function surfaceNormal(lat: number, lon: number): Vector3 {
  const p = (lat * Math.PI) / 180;
  const l = (lon * Math.PI) / 180;
  return [Math.cos(p) * Math.cos(l), Math.cos(p) * Math.sin(l), Math.sin(p)];
}

/**
 * ¿Está iluminado el punto según el terminador geométrico (vista desde el centro lunar, sin relieve
 * ni tamaño del disco)? Solo para la vista global; las métricas del sitio usan lib/horizon.ts.
 */
export function isLitGeometric(lat: number, lon: number, sunDir: Vector3): boolean {
  const n = surfaceNormal(lat, lon);
  return n[0] * sunDir[0] + n[1] * sunDir[1] + n[2] * sunDir[2] > 0;
}
