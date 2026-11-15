/**
 * Carga perezosa de la rejilla de horizontes LOLA (v1.1): solo cuando hace falta (punto en el polo)
 * y una sola vez.
 */
import { useEffect, useState } from "react";
import type { Dataset } from "./useEphemeris";
import { loadHorizonGrid } from "../data/loaders";
import type { HorizonGrid } from "../lib/horizonGrid";

export interface GridState {
  grid: HorizonGrid | null;
  loading: boolean;
  error: string | null;
}

export function useHorizonGrid(ds: Dataset, needed: boolean): GridState {
  const [state, setState] = useState<GridState>({ grid: null, loading: false, error: null });
  const entry = ds.status === "ready" && !ds.synthetic ? ds.manifest.horizon_grids?.[0] ?? null : null;

  useEffect(() => {
    if (!needed || !entry || state.grid || state.loading || state.error) return;
    setState((s) => ({ ...s, loading: true }));
    loadHorizonGrid(entry)
      .then((grid) => setState({ grid, loading: false, error: null }))
      .catch((e: unknown) => setState({ grid: null, loading: false, error: String(e) }));
  }, [needed, entry, state.grid, state.loading, state.error]);

  return state;
}
