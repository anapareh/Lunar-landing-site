/**
 * Rejilla de horizontes LOLA (contrato v1.1) para coordenadas libres en el polo sur.
 *
 * Nodos regulares en el plano estereográfico polar sur (igual que data-pipeline/src/lunarnav/horizon_grid.py):
 *   X = r·sin(lon), Y = r·cos(lon), r = 2·R·tan((90 − |lat|)/2);  nodo (i, j) ↔ X = i·s, Y = j·s.
 * Se evalúa el NODO más cercano (sin interpolar horizontes entre nodos) y se informa de la distancia.
 */
import type { HorizonGridMeta, HorizonProfile } from "../types";
import { CONTRACT_VERSION } from "../types";

export interface HorizonGrid {
  meta: HorizonGridMeta;
  /** int16, (2K+1)² celdas × n_az valores. */
  data: Int16Array;
}

export interface GridSnap {
  i: number;
  j: number;
  lat: number;
  lon: number;
  profile: HorizonProfile;
  /** Distancia del punto pedido al nodo (km). */
  distanceKm: number;
}

const DEG = Math.PI / 180;

export function nodeLatLon(i: number, j: number, spacing: number, radius: number): { lat: number; lon: number } {
  const x = i * spacing;
  const y = j * spacing;
  const r = Math.hypot(x, y);
  return { lat: -90 + (2 * Math.atan(r / (2 * radius))) / DEG, lon: r > 0 ? Math.atan2(x, y) / DEG : 0 };
}

export function nearestNode(lat: number, lon: number, spacing: number, radius: number): { i: number; j: number } {
  const r = 2 * radius * Math.tan(((90 - Math.abs(lat)) * DEG) / 2);
  return { i: Math.round((r * Math.sin(lon * DEG)) / spacing), j: Math.round((r * Math.cos(lon * DEG)) / spacing) };
}

/** Distancia de círculo máximo (km) sobre una esfera de radio `radiusKm`. */
export function greatCircleKm(lat1: number, lon1: number, lat2: number, lon2: number, radiusKm: number): number {
  const p1 = lat1 * DEG;
  const p2 = lat2 * DEG;
  const a = Math.sin((p2 - p1) / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(((lon2 - lon1) * DEG) / 2) ** 2;
  return 2 * radiusKm * Math.asin(Math.min(1, Math.sqrt(a)));
}

/** Perfil del nodo (i, j), o null si no existe o está fuera de cobertura. */
export function profileAt(grid: HorizonGrid, i: number, j: number): HorizonProfile | null {
  const { meta, data } = grid;
  const k = meta.half_size;
  if (Math.abs(i) > k || Math.abs(j) > k) return null;
  const n = 2 * k + 1;
  const nAz = Math.round(360 / meta.azimuth_step_deg);
  const idx = (j + k) * n + (i + k);
  const raw = data.subarray(idx * nAz, (idx + 1) * nAz);
  if (raw.length < nAz || raw[0] === meta.missing_value) return null;
  const { lat, lon } = nodeLatLon(i, j, meta.spacing_m, meta.sphere_radius_m);
  return {
    contract_version: CONTRACT_VERSION,
    site_id: `grid-${meta.id}-${i}_${j}`,
    lat,
    lon,
    surface_height_m: meta.surface_height_m[idx] ?? null,
    observer_height_m: meta.observer_height_m,
    azimuth_step_deg: meta.azimuth_step_deg,
    horizon_elevation_deg: Array.from(raw, (v) => v * meta.value_scale_deg),
    max_distance_km: meta.max_distance_km,
    dem: meta.dem,
    method_version: meta.method_version,
  };
}

/** Nodo más cercano con perfil para (lat, lon), o null si el punto está fuera de la rejilla. */
export function snapToGrid(grid: HorizonGrid, lat: number, lon: number): GridSnap | null {
  const { meta } = grid;
  if (lat > meta.max_lat) return null;
  const { i, j } = nearestNode(lat, lon, meta.spacing_m, meta.sphere_radius_m);
  const profile = profileAt(grid, i, j);
  if (!profile) return null;
  return {
    i,
    j,
    lat: profile.lat,
    lon: profile.lon,
    profile,
    distanceKm: greatCircleKm(lat, lon, profile.lat, profile.lon, meta.sphere_radius_m / 1000),
  };
}
