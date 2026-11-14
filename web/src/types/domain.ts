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

/** Muestra con el horizonte local aplicado. */
export interface HorizonSample extends TopocentricSample {
  /** Elevación del horizonte (relieve o 0° geométrico) en el acimut del cuerpo. */
  horizon_deg: number;
  /** elevation_deg − horizon_deg: altura del centro del disco sobre el horizonte local. */
  clearance_deg: number;
  /** Radio angular del disco del cuerpo visto desde el sitio. */
  angular_radius_deg: number;
  /** Fracción del disco por encima del horizonte local (0..1). Indicador de energía para el Sol. */
  visible_fraction: number;
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

/** Métricas de un cuerpo (Sol o Tierra) en un escenario. */
export interface BodyMetrics {
  /** Elevación del centro en el instante de referencia (horizonte geométrico). */
  elevationNowDeg: number;
  /** Altura del centro sobre el horizonte local en el instante de referencia. */
  clearanceNowDeg: number;
  /** Fracción del disco visible en el instante de referencia (0..1). */
  visibleFractionNow: number;
  visibleNow: boolean;
  /** Horas hasta el ocaso (si es visible ahora); null si no se pone dentro de la ventana. */
  hoursToSet: number | null;
  /** Horas hasta el orto (si no es visible ahora); null si no sale dentro de la ventana. */
  hoursToRise: number | null;
  /** Horas visibles dentro de la ventana. */
  visibleHours: number;
  /** Elevación máxima del centro en la ventana. */
  maxElevationDeg: number;
}

/** Métricas resumidas de un escenario en una ventana temporal. */
export interface SiteMetrics {
  scenarioId: string;
  siteId: string;
  horizonLevel: HorizonLevel;
  /** Instante de referencia (ISO UTC). */
  at: string;
  windowStart: string;
  windowEnd: string;
  windowHours: number;
  sun: BodyMetrics;
  earth: BodyMetrics;
}
