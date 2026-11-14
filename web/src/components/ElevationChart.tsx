/**
 * Gráfico de elevación del Sol y la Tierra frente al tiempo (recharts),
 * con el horizonte local como referencia. TODO.
 */
import type { HorizonProfile, SunEarthSeries } from "../types";

export interface ElevationChartProps {
  siteId: string;
  series: SunEarthSeries;
  horizon: HorizonProfile | null;
}

export function ElevationChart(_props: ElevationChartProps) {
  return null; // TODO
}
