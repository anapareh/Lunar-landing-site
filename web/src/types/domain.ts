/**
 * Tipos internos de la web (derivados del contrato, no serializados).
 */

/** Posición aparente de un cuerpo desde un punto de la superficie lunar. */
export interface TopocentricSample {
  /** ISO 8601 UTC. */
  time: string;
  elevation_deg: number;
  azimuth_deg: number;
}

/** Serie temporal de elevación/acimut de Sol y Tierra para un sitio. */
export interface SunEarthSeries {
  sun: TopocentricSample[];
  earth: TopocentricSample[];
}

/** Nivel de horizonte aplicado (ver docs/architecture.md). */
export type HorizonLevel = "geometric" | "dem";

/** Métricas resumidas de un sitio en una ventana temporal. */
export interface SiteMetrics {
  siteId: string;
  horizonLevel: HorizonLevel;
  sunlightHours: number | null;
  hoursToSunset: number | null;
  earthVisibleHours: number | null;
}
