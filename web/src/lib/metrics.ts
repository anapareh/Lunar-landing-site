/**
 * Métricas resumidas para comparar sitios/fechas.
 *
 * Futuro: horas de luz solar en una ventana, tiempo hasta el ocaso desde una fecha
 * dada, horas con la Tierra visible; todo respetando el horizonte (horizon.ts).
 */
import type { HorizonProfile, SiteMetrics, SunEarthSeries } from "../types";

export interface MetricsWindow {
  /** ISO 8601 UTC. */
  start: string;
  /** ISO 8601 UTC. */
  end: string;
}

/** TODO: horas con el Sol por encima del horizonte en la ventana. */
export function sunlightHours(_series: SunEarthSeries, _profile: HorizonProfile | null, _window: MetricsWindow): number {
  throw new Error("TODO: sunlightHours");
}

/** TODO: horas desde `from` hasta que el Sol cae bajo el horizonte. */
export function hoursToSunset(_series: SunEarthSeries, _profile: HorizonProfile | null, _from: string): number | null {
  throw new Error("TODO: hoursToSunset");
}

/** TODO: horas con la Tierra por encima del horizonte en la ventana. */
export function earthVisibleHours(_series: SunEarthSeries, _profile: HorizonProfile | null, _window: MetricsWindow): number {
  throw new Error("TODO: earthVisibleHours");
}

/** TODO: agrega todas las métricas de un sitio. */
export function computeSiteMetrics(
  _siteId: string,
  _series: SunEarthSeries,
  _profile: HorizonProfile | null,
  _window: MetricsWindow,
): SiteMetrics {
  throw new Error("TODO: computeSiteMetrics");
}
