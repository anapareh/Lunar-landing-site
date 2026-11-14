/**
 * Selector de sitios (lista de sites.json). TODO: multiselección, filtrar sitios sin coordenadas.
 */
import type { Site } from "../types";

export interface SiteSelectorProps {
  sites: Site[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}

export function SiteSelector(_props: SiteSelectorProps) {
  return null; // TODO
}
