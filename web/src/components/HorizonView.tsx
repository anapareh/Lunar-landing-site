/**
 * Vista del perfil de horizonte (acimut vs elevación, d3) con la trayectoria
 * del Sol y la Tierra superpuesta. TODO.
 */
import type { HorizonProfile, SunEarthSeries } from "../types";

export interface HorizonViewProps {
  horizon: HorizonProfile | null;
  series?: SunEarthSeries;
}

export function HorizonView(_props: HorizonViewProps) {
  return null; // TODO
}
