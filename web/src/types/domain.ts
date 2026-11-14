/**
 * Tipos internos de la web (derivados del contrato, no serializados).
 */

/** Posición aparente de un cuerpo desde un punto de la superficie lunar. */
export interface TopocentricSample {
  /** ISO 8601 UTC. */
  time: string;
  elevation_deg: number;
  azimuth_deg: number;
  /** Distancia observador → cuerpo (km); sirve para el tamaño angular del disco. */
  distance_km: number;
}

/** Serie temporal de elevación/acimut de Sol y Tierra para un sitio. */
export interface SunEarthSeries {
  sun: TopocentricSample[];
  earth: TopocentricSample[];
}

/** Nivel de horizonte aplicado (ver docs/architecture.md). */
export type HorizonLevel = "geometric" | "dem";

/** Escenario de comparación: un sitio (curado o coordenadas libres) en una fecha (D-008). */
export interface Scenario {
  id: string;
  siteId: string;
  /** Fecha de referencia ISO 8601 UTC. */
  date: string;
}

/** Métricas resumidas de un escenario en una ventana temporal. */
export interface SiteMetrics {
  scenarioId: string;
  siteId: string;
  horizonLevel: HorizonLevel;
  sunlightHours: number | null;
  hoursToSunset: number | null;
  earthVisibleHours: number | null;
}
