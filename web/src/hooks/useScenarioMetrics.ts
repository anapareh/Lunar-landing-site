/**
 * Calcula, para cada escenario (sitio + fecha), la serie de su ventana (un día lunar) y sus métricas.
 * Cada escenario puede caer en otro año: carga los trozos de efeméride que necesite.
 */
import { useEffect, useState } from "react";
import type { HorizonSample, Scenario, SiteMetrics } from "../types";
import type { Dataset } from "./useEphemeris";
import { loadEphemerisWindow } from "../data/loaders";
import { EARTH_RADIUS_KM, SUN_RADIUS_KM, applyHorizon } from "../lib/horizon";
import { computeSiteMetrics } from "../lib/metrics";
import { computeSunEarthSeries } from "../lib/sunEarth";
import { addLunarDays, parseUtc, toIsoUtc } from "../lib/time";

export type ScenarioResult =
  | { status: "ok"; metrics: SiteMetrics; sun: HorizonSample[]; earth: HorizonSample[]; truncated: boolean }
  | { status: "error"; message: string };

const STEP_MINUTES = 20;

export function useScenarioMetrics(ds: Dataset, scenarios: Scenario[], enabled: boolean): Record<string, ScenarioResult> {
  const [results, setResults] = useState<Record<string, ScenarioResult>>({});

  useEffect(() => {
    if (!enabled || ds.status !== "ready") return;
    let alive = true;
    (async () => {
      const out: Record<string, ScenarioResult> = {};
      for (const sc of scenarios) {
        try {
          const fullEnd = addLunarDays(sc.date, 1);
          const end = toIsoUtc(Math.min(parseUtc(fullEnd), parseUtc(ds.coverage.end)));
          if (parseUtc(sc.date) < parseUtc(ds.coverage.start) || parseUtc(sc.date) >= parseUtc(end)) {
            throw new RangeError("La fecha está fuera del rango de datos cargados");
          }
          const eph = ds.synthetic ? ds.ephemeris : await loadEphemerisWindow(ds.manifest, sc.date, end);
          const series = computeSunEarthSeries(eph, { lat: sc.lat, lon: sc.lon }, { start: sc.date, end, stepMinutes: STEP_MINUTES });
          out[sc.id] = {
            status: "ok",
            metrics: computeSiteMetrics({ scenarioId: sc.id, siteId: sc.siteId, series, profile: null, at: sc.date }),
            sun: applyHorizon(series.sun, null, SUN_RADIUS_KM),
            earth: applyHorizon(series.earth, null, EARTH_RADIUS_KM),
            truncated: end !== fullEnd,
          };
        } catch (e) {
          out[sc.id] = { status: "error", message: e instanceof Error ? e.message : String(e) };
        }
      }
      if (alive) setResults(out);
    })();
    return () => {
      alive = false;
    };
  }, [ds, scenarios, enabled]);

  return results;
}
