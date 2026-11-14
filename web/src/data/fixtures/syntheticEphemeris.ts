/**
 * Efeméride SINTÉTICA para desarrollo y tests. NO representa la geometría real Sol-Tierra-Luna.
 *
 * Modelo deliberadamente simple, con resultados conocidos a mano:
 * - Sol en el plano ecuatorial lunar, a 1 ua, en +X en el instante inicial, girando hacia −Y
 *   (hacia el oeste visto desde lon 0) con el periodo sinódico medio.
 * - Tierra fija en +X (sin libración), a una distancia media redondeada.
 * Lleva `synthetic: true` para que la interfaz muestre un aviso si se carga.
 */
import { CONTRACT_VERSION, type Ephemeris, type Vector3 } from "../../types";
import { MS_PER_DAY, MS_PER_MINUTE, SYNODIC_MONTH_DAYS, parseUtc } from "../../lib/time";

/** Unidad astronómica (definición IAU 2012), km. */
export const AU_KM = 149_597_870.7;
/** Distancia Tierra-Luna media redondeada (km). Solo para el modelo sintético. */
export const SYNTHETIC_EARTH_DISTANCE_KM = 384_400;

export interface SyntheticOptions {
  start?: string;
  stepMinutes?: number;
  /** Número de muestras; por defecto, un día lunar completo. */
  count?: number;
}

/** Vector del Sol sintético a `days` días del inicio. */
export function syntheticSunAt(days: number): Vector3 {
  const theta = (-2 * Math.PI * days) / SYNODIC_MONTH_DAYS;
  return [AU_KM * Math.cos(theta), AU_KM * Math.sin(theta), 0];
}

export function makeSyntheticEphemeris(opts: SyntheticOptions = {}): Ephemeris {
  const start = opts.start ?? "2000-01-01T00:00:00Z";
  const stepMinutes = opts.stepMinutes ?? 60;
  const count = opts.count ?? Math.ceil((SYNODIC_MONTH_DAYS * MS_PER_DAY) / (stepMinutes * MS_PER_MINUTE)) + 1;
  parseUtc(start); // valida el formato

  const sun: Vector3[] = [];
  const earth: Vector3[] = [];
  for (let i = 0; i < count; i++) {
    const days = (i * stepMinutes * MS_PER_MINUTE) / MS_PER_DAY;
    sun.push(syntheticSunAt(days));
    earth.push([SYNTHETIC_EARTH_DISTANCE_KM, 0, 0]);
  }

  return {
    contract_version: CONTRACT_VERSION,
    frame: "SYNTHETIC",
    aberration_correction: "NONE",
    units: "km",
    start,
    step_minutes: stepMinutes,
    count,
    sun,
    earth,
    synthetic: true,
  };
}
