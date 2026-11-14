/**
 * Tabla comparativa de métricas por sitio (horas de luz, tiempo a ocaso,
 * visibilidad de la Tierra, nivel de horizonte aplicado). TODO.
 */
import type { Site, SiteMetrics } from "../types";

export interface ComparisonTableProps {
  sites: Site[];
  metrics: SiteMetrics[];
  onSelectSite?: (id: string) => void;
}

export function ComparisonTable(_props: ComparisonTableProps) {
  return null; // TODO
}
