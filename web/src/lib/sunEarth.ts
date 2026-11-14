/**
 * Efemérides (marco lunar fijo) → elevación y acimut topocéntricos para un punto de la superficie.
 *
 * Marco lunar fijo (MOON_ME): +X hacia lat 0 / lon 0, +Z hacia el polo norte, +Y hacia lon 90° E.
 * Luna esférica de radio MOON_RADIUS_KM (latitud planetocéntrica).
 *
 * Pasos: posición del observador → vector observador→cuerpo (incluye la paralaje, importante para
 * la Tierra) → base local Este-Norte-Arriba → elevación = asin(d·arriba), acimut = atan2(d·este, d·norte).
 * Horizonte geométrico: el relieve se aplica después, en horizon.ts.
 *
 * Polos exactos (lat = ±90): el "norte" local queda indefinido; por convención se toma la dirección
 * del meridiano `lon`. Los perfiles de horizonte deben usar la misma convención.
 */
import type { Ephemeris, SunEarthSeries, TopocentricSample, Vector3 } from "../types";
import { clamp, deg2rad, dot, lerp, norm, normalizeDeg360, rad2deg, sub } from "./vec";
import { fractionalIndex, parseUtc, sampleTimeMs, toIsoUtc } from "./time";

/** Radio de la esfera de referencia lunar (km), el mismo que deben usar el pipeline y los DEM. */
export const MOON_RADIUS_KM = 1737.4;

export type Body = "sun" | "earth";

export interface Observer {
  /** Latitud planetocéntrica (grados). */
  lat: number;
  /** Longitud este positiva (grados). */
  lon: number;
  /** Altura sobre la esfera de referencia, en km (por defecto 0). */
  heightKm?: number;
}

export interface Topocentric {
  elevation_deg: number;
  azimuth_deg: number;
  distance_km: number;
}

export interface Enu {
  east: Vector3;
  north: Vector3;
  up: Vector3;
}

/** Posición del observador en el marco lunar fijo (km). */
export function observerPosition(o: Observer): Vector3 {
  const r = MOON_RADIUS_KM + (o.heightKm ?? 0);
  const phi = deg2rad(o.lat);
  const lam = deg2rad(o.lon);
  return [r * Math.cos(phi) * Math.cos(lam), r * Math.cos(phi) * Math.sin(lam), r * Math.sin(phi)];
}

/** Base local Este-Norte-Arriba (unitaria) en el marco lunar fijo. */
export function enuBasis(latDeg: number, lonDeg: number): Enu {
  const phi = deg2rad(latDeg);
  const lam = deg2rad(lonDeg);
  const sp = Math.sin(phi);
  const cp = Math.cos(phi);
  const sl = Math.sin(lam);
  const cl = Math.cos(lam);
  return {
    east: [-sl, cl, 0],
    north: [-sp * cl, -sp * sl, cp],
    up: [cp * cl, cp * sl, sp],
  };
}

/** Elevación/acimut de un cuerpo (posición centro Luna → cuerpo, km) visto desde el observador. */
export function topocentric(bodyPos: Vector3, o: Observer): Topocentric {
  const d = sub(bodyPos, observerPosition(o));
  const r = norm(d);
  const { east, north, up } = enuBasis(o.lat, o.lon);
  return {
    elevation_deg: rad2deg(Math.asin(clamp(dot(d, up) / r, -1, 1))),
    azimuth_deg: normalizeDeg360(rad2deg(Math.atan2(dot(d, east), dot(d, north)))),
    distance_km: r,
  };
}

const EPS = 1e-9;

/**
 * Vector centro Luna → cuerpo en el instante tMs, interpolando linealmente entre muestras.
 * Devuelve null si el instante cae fuera de la cobertura de la efeméride.
 */
export function interpolateBody(eph: Ephemeris, body: Body, tMs: number): Vector3 | null {
  const samples = eph[body];
  const n = samples.length;
  let f = fractionalIndex(parseUtc(eph.start), eph.step_minutes, tMs);
  if (f < -EPS || f > n - 1 + EPS) return null;
  f = clamp(f, 0, n - 1);
  if (n === 1) return samples[0];
  const i = Math.min(Math.floor(f), n - 2);
  return lerp(samples[i], samples[i + 1], f - i);
}

/** Instante de la muestra i de la efeméride. */
export function sampleTime(ephemeris: Ephemeris, index: number): Date {
  return new Date(sampleTimeMs(parseUtc(ephemeris.start), ephemeris.step_minutes, index));
}

/** Posición del Sol y la Tierra en un instante, o null si está fuera de la cobertura. */
export function positionsAt(
  eph: Ephemeris,
  observer: Observer,
  iso: string,
): { sun: TopocentricSample; earth: TopocentricSample } | null {
  const t = parseUtc(iso);
  const sun = interpolateBody(eph, "sun", t);
  const earth = interpolateBody(eph, "earth", t);
  if (!sun || !earth) return null;
  const time = toIsoUtc(t);
  return { sun: { time, ...topocentric(sun, observer) }, earth: { time, ...topocentric(earth, observer) } };
}

export interface SeriesWindow {
  /** ISO 8601 UTC, inclusive. */
  start: string;
  /** ISO 8601 UTC, inclusive. */
  end: string;
  /** Paso de salida; por defecto el de la efeméride. */
  stepMinutes?: number;
}

/**
 * Serie temporal de elevación/acimut del Sol y la Tierra para un observador.
 * Sin ventana: una muestra por cada muestra de la efeméride (sin interpolar).
 * Con ventana: remuestrea con interpolación; lanza RangeError si la ventana sale de la cobertura.
 */
export function computeSunEarthSeries(
  ephemeris: Ephemeris,
  observer: Observer,
  window?: SeriesWindow,
): SunEarthSeries {
  const startMs = parseUtc(ephemeris.start);
  const sun: TopocentricSample[] = [];
  const earth: TopocentricSample[] = [];

  if (!window) {
    for (let i = 0; i < ephemeris.count; i++) {
      const time = toIsoUtc(sampleTimeMs(startMs, ephemeris.step_minutes, i));
      sun.push({ time, ...topocentric(ephemeris.sun[i], observer) });
      earth.push({ time, ...topocentric(ephemeris.earth[i], observer) });
    }
    return { sun, earth };
  }

  const w0 = parseUtc(window.start);
  const w1 = parseUtc(window.end);
  const step = window.stepMinutes ?? ephemeris.step_minutes;
  if (!(step > 0)) throw new RangeError("stepMinutes debe ser > 0");
  if (w1 < w0) throw new RangeError("La ventana termina antes de empezar");

  for (let i = 0; ; i++) {
    const t = sampleTimeMs(w0, step, i);
    if (t > w1) break;
    const s = interpolateBody(ephemeris, "sun", t);
    const e = interpolateBody(ephemeris, "earth", t);
    if (!s || !e) {
      throw new RangeError(`${toIsoUtc(t)} está fuera del rango de la efeméride cargada`);
    }
    const time = toIsoUtc(t);
    sun.push({ time, ...topocentric(s, observer) });
    earth.push({ time, ...topocentric(e, observer) });
  }
  return { sun, earth };
}
