/**
 * Perfiles de horizonte SINTÉTICOS para desarrollo y tests (no son relieve real).
 */
import { CONTRACT_VERSION, type HorizonProfile } from "../../types";

/** Perfil con elevación `fn(acimut)` para cada acimut múltiplo de `stepDeg`. */
export function makeSyntheticHorizon(fn: (azimuthDeg: number) => number, stepDeg = 1): HorizonProfile {
  const n = Math.round(360 / stepDeg);
  return {
    contract_version: CONTRACT_VERSION,
    site_id: "synthetic",
    lat: 0,
    lon: 0,
    surface_height_m: null,
    observer_height_m: 0,
    azimuth_step_deg: stepDeg,
    horizon_elevation_deg: Array.from({ length: n }, (_, i) => fn(i * stepDeg)),
    max_distance_km: 1,
    dem: { product: "SYNTHETIC", resolution_m: 1, source_url: null },
    method_version: "0.0.0",
  };
}
