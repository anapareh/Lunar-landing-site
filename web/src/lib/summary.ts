/**
 * Resumen en lenguaje claro de las métricas de un escenario (ficha del punto y comparativa).
 * Solo reformula valores calculados en lib/metrics.ts; no añade cifras ni valoraciones.
 */
import type { SiteMetrics } from "../types";
import { formatDuration, formatPercent } from "./format";

export interface SiteSummary {
  sun: string;
  light: string;
  earth: string;
}

export function summarize(m: SiteMetrics): SiteSummary {
  const { sun, earth } = m;
  const sunText = sun.visibleNow
    ? sun.hoursToSet === null
      ? "Es de día y el Sol no se pone en todo el periodo."
      : `Es de día: el Sol se pone en ${formatDuration(sun.hoursToSet)}.`
    : sun.hoursToRise === null
      ? "Es de noche y el Sol no sale en todo el periodo."
      : `Es de noche: amanece en ${formatDuration(sun.hoursToRise)}.`;

  const share = m.windowHours > 0 ? sun.visibleHours / m.windowHours : 0;
  const light =
    sun.visibleHours <= 0
      ? "No habrá luz solar en el próximo día lunar."
      : `Habrá sol el ${formatPercent(share)} del próximo día lunar.`;

  const earthText = earth.visibleNow
    ? earth.hoursToSet === null
      ? "La Tierra se ve todo el periodo: enlace directo posible en todo momento."
      : `La Tierra se ve ahora (enlace directo posible) y se pone en ${formatDuration(earth.hoursToSet)}.`
    : earth.hoursToRise === null
      ? "La Tierra no se ve en todo el periodo: sin enlace directo; haría falta un satélite de retransmisión."
      : `La Tierra no se ve ahora: sale en ${formatDuration(earth.hoursToRise)}.`;

  return { sun: sunText, light, earth: earthText };
}
