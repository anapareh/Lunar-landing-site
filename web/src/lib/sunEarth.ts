/**
 * Conversión de la serie de efemérides (marco lunar fijo) a elevación/acimut
 * locales para un punto (lat, lon) de la superficie lunar.
 *
 * Futuro: para cada muestra de ephemeris.json, restar la posición del observador,
 * proyectar sobre la base local Este-Norte-Arriba y obtener elevación/acimut
 * (acimut desde el norte, horario). Horizonte geométrico; el relieve se aplica en horizon.ts.
 */
import type { Ephemeris, SunEarthSeries } from "../types";

export interface Observer {
  lat: number;
  lon: number;
  /** Altura sobre el radio de referencia, en km (opcional). */
  heightKm?: number;
}

/** TODO: serie temporal -> elevación/acimut de Sol y Tierra para el observador. */
export function computeSunEarthSeries(_ephemeris: Ephemeris, _observer: Observer): SunEarthSeries {
  throw new Error("TODO: computeSunEarthSeries");
}

/** TODO: instante (Date) de la muestra i de la serie. */
export function sampleTime(_ephemeris: Ephemeris, _index: number): Date {
  throw new Error("TODO: sampleTime");
}
