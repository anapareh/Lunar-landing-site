/**
 * Lista de sitios (sites.json). Los que no tienen coordenadas se muestran como
 * "pendiente de verificar" y no se pueden seleccionar.
 */
import { useEffect, useState } from "react";
import type { Site } from "../types";
import { loadSites } from "../data/loaders";

export interface SitesState {
  sites: Site[];
  loaded: boolean;
  error: string | null;
}

export function useSites(): SitesState {
  const [state, setState] = useState<SitesState>({ sites: [], loaded: false, error: null });
  useEffect(() => {
    let alive = true;
    loadSites()
      .then((f) => alive && setState({ sites: f?.sites ?? [], loaded: true, error: null }))
      .catch((e: unknown) => alive && setState({ sites: [], loaded: true, error: String(e) }));
    return () => {
      alive = false;
    };
  }, []);
  return state;
}

export const hasCoords = (s: Site): s is Site & { lat: number; lon: number } => s.lat !== null && s.lon !== null;
