/**
 * Aplicación del horizonte local (relieve) a las series de elevación.
 *
 * Futuro: interpolar el perfil de horizons/<site_id>.json en el acimut de cada
 * muestra y decidir si el cuerpo está por encima del relieve. Si no hay perfil,
 * usar el horizonte geométrico (0°) e indicarlo con HorizonLevel = "geometric".
 */
import type { HorizonLevel, HorizonProfile, TopocentricSample } from "../types";

/** TODO: elevación del horizonte (grados) en un acimut dado, interpolando el perfil. */
export function horizonElevationAt(_profile: HorizonProfile | null, _azimuthDeg: number): number {
  throw new Error("TODO: horizonElevationAt");
}

/** TODO: ¿está la muestra por encima del horizonte (relieve o geométrico)? */
export function isAboveHorizon(_sample: TopocentricSample, _profile: HorizonProfile | null): boolean {
  throw new Error("TODO: isAboveHorizon");
}

/** TODO: nivel de horizonte disponible para un sitio. */
export function horizonLevel(_profile: HorizonProfile | null): HorizonLevel {
  throw new Error("TODO: horizonLevel");
}
