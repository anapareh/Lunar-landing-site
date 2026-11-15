/**
 * Resumen en lenguaje claro de las métricas de un escenario (ficha del punto y comparativa).
 * Solo reformula valores calculados en lib/metrics.ts; no añade cifras ni valoraciones.
 */
import type { SiteMetrics } from "../types";
import type { Dict } from "../i18n/es";
import es from "../i18n/es";
import { formatDuration, formatPercent } from "./format";

export interface SiteSummary {
  sun: string;
  light: string;
  earth: string;
}

export function summarize(m: SiteMetrics, t: Dict["summary"] = es.summary): SiteSummary {
  const { sun, earth } = m;
  const sunText = sun.visibleNow
    ? sun.hoursToSet === null
      ? t.dayNoSet
      : t.daySet(formatDuration(sun.hoursToSet))
    : sun.hoursToRise === null
      ? t.nightNoRise
      : t.nightRise(formatDuration(sun.hoursToRise));

  const share = m.windowHours > 0 ? sun.visibleHours / m.windowHours : 0;
  const light =
    sun.visibleHours <= 0
      ? t.noLight
      : t.light(formatPercent(share));

  const earthText = earth.visibleNow
    ? earth.hoursToSet === null
      ? t.earthAlways
      : t.earthSets(formatDuration(earth.hoursToSet))
    : earth.hoursToRise === null
      ? t.earthNever
      : t.earthRises(formatDuration(earth.hoursToRise));

  return { sun: sunText, light, earth: earthText };
}
