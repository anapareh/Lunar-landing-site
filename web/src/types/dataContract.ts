/**
 * Tipos TypeScript del contrato de datos v1 (pipeline -> web).
 * Fuente de verdad: docs/data-contract.md y docs/schemas/*.schema.json. Mantener sincronizado.
 */

export const CONTRACT_VERSION = "1.1.0";

/** Vector [x, y, z] en km, en el marco lunar fijo. */
export type Vector3 = [number, number, number];

/** manifest.json */
export interface Manifest {
  contract_version: string;
  generated_at: string;
  pipeline_commit: string | null;
  frame: string;
  aberration_correction: string;
  kernels: string[];
  ephemeris: { file: string; start: string; end: string }[];
  /** ids con horizons/<id>.json disponible. */
  horizons: string[];
  /** v1.1: rejillas de horizontes para coordenadas libres (p. ej. polo sur). */
  horizon_grids?: { id: string; file: string }[];
  basemaps: Basemap[];
}

/** v1.1: metadatos de horizon_grid/<id>.json (los perfiles van en un binario int16 aparte). */
export interface HorizonGridMeta {
  contract_version: string;
  id: string;
  projection: "polar_stereographic_south";
  sphere_radius_m: number;
  spacing_m: number;
  /** Nodos de −K a K en cada eje: (2K+1)² celdas. */
  half_size: number;
  /** Solo hay nodos con latitud ≤ max_lat. */
  max_lat: number;
  azimuth_step_deg: number;
  value_scale_deg: number;
  missing_value: number;
  data_file: string;
  node_count: number;
  observer_height_m: number;
  max_distance_km: number;
  dem: { product: string; resolution_m: number; source_url: string | null };
  method_version: string;
  /** Altura del terreno por celda (null fuera de cobertura). */
  surface_height_m: (number | null)[];
}

export interface Basemap {
  id: "global" | "south_pole";
  file: string;
  projection: string;
  /** [xmin, ymin, xmax, ymax] en unidades de la proyección. */
  extent: [number, number, number, number];
  credit: string;
}

/** ephemeris/<año>.json */
export interface Ephemeris {
  contract_version: string;
  frame: string;
  aberration_correction: string;
  units: "km";
  /** ISO 8601 UTC de la primera muestra. */
  start: string;
  step_minutes: number;
  count: number;
  /** Vectores centro Luna -> Sol. */
  sun: Vector3[];
  /** Vectores centro Luna -> Tierra. */
  earth: Vector3[];
  /** true solo en fixtures de desarrollo; la UI muestra un aviso. */
  synthetic?: boolean;
}

/** horizons/<site_id>.json */
export interface HorizonProfile {
  contract_version: string;
  site_id: string;
  /** Solo en variantes cercanas calculadas: sitio curado de referencia. */
  parent_site_id?: string;
  lat: number;
  lon: number;
  surface_height_m: number | null;
  observer_height_m: number;
  azimuth_step_deg: number;
  /** Elevación del horizonte para acimut i * azimuth_step_deg (desde el norte, horario). */
  horizon_elevation_deg: number[];
  max_distance_km: number;
  dem: { product: string; resolution_m: number; source_url: string | null };
  method_version: string;
}

export type SiteCategory = "apollo" | "clps" | "commercial" | "other_agency" | "artemis" | "other";
export type SiteStatus = "landed" | "planned" | "candidate" | "failed";
export type LocationKind = "landing_point" | "planned_target" | "region_center";

export interface SiteDate {
  /** "YYYY", "YYYY-MM" o "YYYY-MM-DD". */
  value: string | null;
  kind: "actual" | "planned" | null;
  precision: "day" | "month" | "year" | null;
}

/** Elemento de sites.json */
export interface Site {
  id: string;
  name: string;
  mission: string | null;
  agency: string | null;
  category: SiteCategory;
  status: SiteStatus;
  location_kind: LocationKind;
  lat: number | null;
  lon: number | null;
  date: SiteDate;
  sources: { label: string; url: string }[];
  verified: boolean;
  verified_by: string | null;
  verified_on: string | null;
  notes: string | null;
}

/** sites.json */
export interface SitesFile {
  contract_version: string;
  sites: Site[];
}

/** web/src/lib/__fixtures__/golden.json (solo tests) */
export interface GoldenFile {
  contract_version: string;
  frame: string;
  cases: {
    lat: number;
    lon: number;
    time: string;
    sun: { elevation_deg: number; azimuth_deg: number };
    earth: { elevation_deg: number; azimuth_deg: number };
  }[];
}
