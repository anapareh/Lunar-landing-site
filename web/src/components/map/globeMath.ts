/**
 * Conversión entre el marco lunar fijo (MOON_ME) y las coordenadas de three.js, y orientaciones
 * de las vistas del globo. Sin dependencias de three para poder testearlo aislado.
 *
 * Marco lunar: +X = lat 0 / lon 0, +Y = lon 90° E, +Z = polo norte.
 * three.js:    +X derecha, +Y arriba, +Z hacia la cámara.
 * La textura (centrada en lon 0) sobre SphereGeometry deja lon 0 en +X y lon 90° E en −Z, así que:
 *   three = (x, z, −y)   (rotación propia, determinante +1).
 */
import type { Vector3 } from "../../types";

export type V3 = [number, number, number];

export const bodyToThree = (v: Vector3): V3 => [v[0], v[2], -v[1]];
export const threeToBody = (v: V3): Vector3 => [v[0], -v[2], v[1]];

const DEG = Math.PI / 180;

/** Punto de la esfera unidad (coordenadas three) para lat/lon en grados. */
export function latLonToThree(lat: number, lon: number, r = 1): V3 {
  const p = lat * DEG;
  const l = lon * DEG;
  return bodyToThree([r * Math.cos(p) * Math.cos(l), r * Math.cos(p) * Math.sin(l), r * Math.sin(p)]);
}

/** Lat/lon (grados, lon −180..180) de un punto en coordenadas three locales del globo. */
export function threeToLatLon(v: V3): { lat: number; lon: number } {
  const [x, y, z] = threeToBody(v);
  const r = Math.hypot(x, y, z);
  return { lat: Math.asin(z / r) / DEG, lon: Math.atan2(y, x) / DEG };
}

/** Cuaternión [x, y, z, w] de una rotación de `angle` rad alrededor de un eje unitario. */
function axisAngle(axis: V3, angle: number): [number, number, number, number] {
  const s = Math.sin(angle / 2);
  return [axis[0] * s, axis[1] * s, axis[2] * s, Math.cos(angle / 2)];
}

/** Producto de cuaterniones a·b (aplica b y luego a). */
function qmul(a: number[], b: number[]): [number, number, number, number] {
  const [ax, ay, az, aw] = a;
  const [bx, by, bz, bw] = b;
  return [
    aw * bx + ax * bw + ay * bz - az * by,
    aw * by - ax * bz + ay * bw + az * bx,
    aw * bz + ax * by - ay * bx + az * bw,
    aw * bw - ax * bx - ay * by - az * bz,
  ];
}

/**
 * Orientación del globo que pone el punto (lat, lon) frente a la cámara (+Z) con el norte arriba:
 * primero gira alrededor de Y para traer esa longitud al frente, después inclina alrededor de X.
 */
export function quatFacing(lat: number, lon: number): [number, number, number, number] {
  const qy = axisAngle([0, 1, 0], -Math.PI / 2 - lon * DEG);
  const qx = axisAngle([1, 0, 0], lat * DEG);
  return qmul(qx, qy);
}

/** Vista del polo sur, con lon 0 hacia arriba de la pantalla. */
export const QUAT_SOUTH_POLE = quatFacing(-90, 0);
/** Vista de la cara visible (centro en lat 0 / lon 0). */
export const QUAT_NEARSIDE = quatFacing(0, 0);

/** Aplica un cuaternión a un vector (para tests). */
export function rotate(q: number[], v: V3): V3 {
  const p = qmul(qmul(q, [v[0], v[1], v[2], 0]), [-q[0], -q[1], -q[2], q[3]]);
  return [p[0], p[1], p[2]];
}
