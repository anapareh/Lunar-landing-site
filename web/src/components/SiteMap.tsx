/**
 * Mapa de los sitios (proyección polar/estereográfica con d3). TODO.
 */
import type { Site } from "../types";

export interface SiteMapProps {
  sites: Site[];
  selectedIds: string[];
  activeId?: string | null;
  onSelect?: (id: string) => void;
}

export function SiteMap(_props: SiteMapProps) {
  return null; // TODO
}
