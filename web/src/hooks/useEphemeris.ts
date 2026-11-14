/**
 * Hooks de datos: qué conjunto hay disponible (real o sintético) y la efeméride de una ventana.
 */
import { useEffect, useState } from "react";
import type { Ephemeris, Manifest } from "../types";
import { type Coverage, loadEphemerisWindow, loadManifest, manifestCoverage, syntheticDataset } from "../data/loaders";

export type Dataset =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; synthetic: false; manifest: Manifest; coverage: Coverage }
  | { status: "ready"; synthetic: true; ephemeris: Ephemeris; coverage: Coverage };

/** Carga el manifest una vez; si no existe, prepara la efeméride sintética. */
export function useDataset(): Dataset {
  const [ds, setDs] = useState<Dataset>({ status: "loading" });
  useEffect(() => {
    let alive = true;
    loadManifest()
      .then((manifest) => {
        if (!alive) return;
        const coverage = manifest ? manifestCoverage(manifest) : null;
        if (manifest && coverage) setDs({ status: "ready", synthetic: false, manifest, coverage });
        else setDs({ status: "ready", synthetic: true, ...syntheticDataset() });
      })
      .catch((e: unknown) => alive && setDs({ status: "error", message: String(e) }));
    return () => {
      alive = false;
    };
  }, []);
  return ds;
}

export interface WindowEphemeris {
  ephemeris: Ephemeris | null;
  error: string | null;
}

/** Efeméride que cubre [start, end]: directa si es sintética, cargada por años si es real. */
export function useWindowEphemeris(ds: Dataset, start: string | null, end: string | null): WindowEphemeris {
  const [state, setState] = useState<WindowEphemeris>({ ephemeris: null, error: null });
  const manifest = ds.status === "ready" && !ds.synthetic ? ds.manifest : null;
  const synthetic = ds.status === "ready" && ds.synthetic ? ds.ephemeris : null;

  useEffect(() => {
    if (synthetic) {
      setState({ ephemeris: synthetic, error: null });
      return;
    }
    if (!manifest || !start || !end) return;
    let alive = true;
    loadEphemerisWindow(manifest, start, end)
      .then((ephemeris) => alive && setState({ ephemeris, error: null }))
      .catch((e: unknown) => alive && setState({ ephemeris: null, error: String(e) }));
    return () => {
      alive = false;
    };
  }, [manifest, synthetic, start, end]);

  return state;
}
