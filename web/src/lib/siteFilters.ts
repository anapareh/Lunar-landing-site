/**
 * Filtros de la lista de sitios (chips del panel izquierdo). También deciden qué balizas se ven en
 * el globo. "Polo sur" = latitud ≤ −60°.
 */
import type { Site } from "../types";

export type SiteFilter = "all" | "south" | "apollo" | "robotic" | "clps" | "failed";

/** Orden de los chips. Los textos están en i18n (dict.sites.filters). */
export const SITE_FILTERS: SiteFilter[] = ["all", "south", "apollo", "robotic", "clps", "failed"];

export const SOUTH_LAT = -60;

export function matchesFilter(s: Site, f: SiteFilter): boolean {
  switch (f) {
    case "all":
      return true;
    case "south":
      return s.lat !== null && s.lat <= SOUTH_LAT;
    case "apollo":
      return s.category === "apollo";
    case "robotic":
      return s.status !== "failed" && (s.category === "other" || s.category === "other_agency");
    case "clps":
      return s.status !== "failed" && (s.category === "clps" || s.category === "commercial");
    case "failed":
      return s.status === "failed";
  }
}

/** Año de la fecha del sitio ("1969"), o null. */
export const siteYear = (s: Site): string | null => s.date.value?.slice(0, 4) ?? null;
