/**
 * Álgebra vectorial mínima para vectores 3D [x, y, z] y conversiones de ángulos.
 */
import type { Vector3 } from "../types";

export const DEG = Math.PI / 180;

export const deg2rad = (deg: number): number => deg * DEG;
export const rad2deg = (rad: number): number => rad / DEG;

/** Normaliza un ángulo a [0, 360). */
export function normalizeDeg360(deg: number): number {
  const r = deg % 360;
  return r < 0 ? r + 360 : r;
}

export const add = (a: Vector3, b: Vector3): Vector3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const sub = (a: Vector3, b: Vector3): Vector3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const scale = (a: Vector3, k: number): Vector3 => [a[0] * k, a[1] * k, a[2] * k];
export const dot = (a: Vector3, b: Vector3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

export const cross = (a: Vector3, b: Vector3): Vector3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];

export const norm = (a: Vector3): number => Math.hypot(a[0], a[1], a[2]);

export function normalize(a: Vector3): Vector3 {
  const n = norm(a);
  if (n === 0) throw new RangeError("normalize: vector nulo");
  return scale(a, 1 / n);
}

/** Interpolación lineal a + (b − a)·t. */
export const lerp = (a: Vector3, b: Vector3, t: number): Vector3 => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
  a[2] + (b[2] - a[2]) * t,
];

export const clamp = (x: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, x));
