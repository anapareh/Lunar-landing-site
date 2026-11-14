/**
 * Tipos TypeScript del contrato de datos pipeline -> web.
 * Fuente de verdad: docs/data-contract.md. Mantener sincronizado.
 */

/** Vector [x, y, z] en el marco lunar fijo. */
export type Vector3 = [number, number, number];

/** ephemeris.json */
export interface Ephemeris {
  frame: string;
  /** ISO 8601 UTC de la primera muestra. */
  start: string;
  step_minutes: number;
  /** Vectores centro Luna -> Sol. */
  sun: Vector3[];
  /** Vectores centro Luna -> Tierra. */
  earth: Vector3[];
}

/** horizons/<site_id>.json */
export interface HorizonProfile {
  site_id: string;
  lat: number;
  lon: number;
  azimuth_step_deg: number;
  /** Elevación del horizonte para acimut i * azimuth_step_deg (desde el norte, horario). */
  horizon_elevation_deg: number[];
}

/** Elemento de sites.json */
export interface Site {
  id: string;
  name: string;
  agency: string | null;
  type: string | null;
  lat: number | null;
  lon: number | null;
  verified: boolean;
  notes?: string;
}
