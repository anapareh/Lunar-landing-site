/**
 * Comparativa de escenarios (sitio + fecha) lado a lado. Solo métricas calculadas en lib/.
 * Cada escenario se evalúa en su propia ventana de un día lunar desde su fecha.
 * Destaca el mejor valor en las filas donde "más es mejor" (horas de luz, de Tierra visible y
 * elevación solar máxima). Acciones por columna: ver en el globo, +1 día lunar, quitar.
 */
import { useEffect, useMemo, useRef, type ReactNode } from "react";
import type { Scenario } from "../../types";
import type { Dataset } from "../../hooks/useEphemeris";
import { useScenarioMetrics, type ScenarioResult } from "../../hooks/useScenarioMetrics";
import type { HorizonGrid } from "../../lib/horizonGrid";
import { bestIndices, shiftScenario } from "../../lib/compare";
import { formatDeg, formatDuration, formatHours, formatPercent, formatUtc } from "../../lib/format";
import { summarize } from "../../lib/summary";
import { MAX_SCENARIOS, useAppStore } from "../../store/useAppStore";
import { HorizonLevelBadge } from "../common/HorizonLevelBadge";
import { formatLatLon } from "../sites/FreeCoordinatesForm";
import { VisibilityStrip } from "./VisibilityStrip";
import { useT, type Dict } from "../../i18n";

type Ok = Extract<ScenarioResult, { status: "ok" }>;

interface RowDef {
  label: string;
  render: (r: Ok, s: Scenario) => ReactNode;
  /** Valor numérico para destacar el mejor (si procede). */
  num?: (r: Ok) => number | null;
  group?: "sun" | "earth";
}

const signed = (d: number) => `${d >= 0 ? "+" : ""}${formatDeg(d)}`;

/** Filas de la tabla (textos del idioma activo). */
function buildRows(t: Dict): RowDef[] {
  const c = t.compare;
  const countdown = (visible: boolean, toSet: number | null, toRise: number | null, set: (d: string) => string, rise: (d: string) => string) => {
    const h = visible ? toSet : toRise;
    return h === null ? (visible ? c.neverSets : c.neverRises) : (visible ? set : rise)(formatDuration(h));
  };
  return [
    {
      label: c.rows.summary,
      render: (r) => {
        const x = summarize(r.metrics, t.summary);
        return (
          <span className="font-sans text-[11px] text-slate-200 leading-snug whitespace-normal block">
            {x.sun} {x.light} {x.earth}
          </span>
        );
      },
    },
    { label: c.rows.horizon, render: (r) => <HorizonLevelBadge level={r.metrics.horizonLevel} /> },
    {
      label: c.rows.cycle,
      render: (r, s) => <VisibilityStrip sun={r.sun} earth={r.earth} label={c.stripAria(s.label)} />,
    },
    { group: "sun", label: c.rows.sunNow, render: (r) => signed(r.metrics.sun.elevationNowDeg) },
    { group: "sun", label: c.rows.diskNow, render: (r) => formatPercent(r.metrics.sun.visibleFractionNow) },
    {
      group: "sun",
      label: c.rows.sunNext,
      render: (r) => countdown(r.metrics.sun.visibleNow, r.metrics.sun.hoursToSet, r.metrics.sun.hoursToRise, c.sunSets, c.sunRises),
    },
    {
      group: "sun",
      label: c.rows.sunHours,
      render: (r) => `${formatHours(r.metrics.sun.visibleHours)} (${formatPercent(r.metrics.sun.visibleHours / r.metrics.windowHours)})`,
      num: (r) => r.metrics.sun.visibleHours,
    },
    { group: "sun", label: c.rows.sunMax, render: (r) => signed(r.metrics.sun.maxElevationDeg), num: (r) => r.metrics.sun.maxElevationDeg },
    {
      group: "earth",
      label: c.rows.earthNow,
      render: (r) => (
        <span className={r.metrics.earth.visibleNow ? "text-sky-400" : "text-red-400"}>
          {signed(r.metrics.earth.elevationNowDeg)} · {r.metrics.earth.visibleNow ? c.earthVisible : c.earthHidden}
        </span>
      ),
    },
    {
      group: "earth",
      label: c.rows.earthNext,
      render: (r) => countdown(r.metrics.earth.visibleNow, r.metrics.earth.hoursToSet, r.metrics.earth.hoursToRise, c.earthSets, c.earthRises),
    },
    {
      group: "earth",
      label: c.rows.earthHours,
      render: (r) => `${formatHours(r.metrics.earth.visibleHours)} (${formatPercent(r.metrics.earth.visibleHours / r.metrics.windowHours)})`,
      num: (r) => r.metrics.earth.visibleHours,
    },
  ];
}

export interface CompareModalProps {
  ds: Dataset;
  /** Rejilla LOLA del polo sur (si está cargada): aplica el horizonte del nodo. */
  grid?: HorizonGrid | null;
  /** Lleva un escenario al globo (coordenadas + fecha). */
  onLoad: (s: Scenario) => void;
}

export function CompareModal({ ds, grid = null, onLoad }: CompareModalProps) {
  const { compareOpen, setCompareOpen, scenarios, removeScenario, addScenario, notify } = useAppStore();
  const results = useScenarioMetrics(ds, scenarios, compareOpen, grid);
  const closeRef = useRef<HTMLButtonElement>(null);
  const t = useT();
  const c = t.compare;
  const rows = useMemo(() => buildRows(t), [t]);

  useEffect(() => {
    if (!compareOpen) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setCompareOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [compareOpen, setCompareOpen]);

  if (!compareOpen) return null;

  const addLater = (s: Scenario) => {
    const r = addScenario(shiftScenario(s, 1));
    notify(r === "added" ? t.toasts.addedLater : r === "full" ? t.toasts.max(MAX_SCENARIOS) : t.toasts.already);
  };

  const okAt = (s: Scenario): Ok | null => {
    const r = results[s.id];
    return r && r.status === "ok" ? r : null;
  };

  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && setCompareOpen(false)}
    >
      <div role="dialog" aria-modal="true" aria-labelledby="compare-title" className="console-panel rounded-lg max-w-5xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        <div className="p-4 border-b border-borderline flex items-center justify-between gap-3 bg-panel">
          <div>
            <h2 id="compare-title" className="text-sm sm:text-base font-semibold text-telemetry">
              {c.title}
            </h2>
            <p className="text-xs text-steel mt-0.5">
              {c.subtitle}
            </p>
          </div>
          <button ref={closeRef} type="button" onClick={() => setCompareOpen(false)} className="btn-control px-2.5 py-1 rounded text-xs font-medium">
            {c.close}
          </button>
        </div>

        <div className="p-4 overflow-auto flex-1">
          {scenarios.length === 0 ? (
            <p className="text-sm text-steel">
              {c.emptyBefore} <strong className="text-telemetry">{c.emptyButton}</strong> {c.emptyAfter(MAX_SCENARIOS)}
            </p>
          ) : (
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-borderline align-top">
                  <th scope="col" className="py-2.5 px-3 w-44 text-steel font-mono text-[11px] font-normal">{c.parameter}</th>
                  {scenarios.map((s, i) => (
                    <th key={s.id} scope="col" className="py-2.5 px-3 min-w-[190px] font-normal">
                      <div className="text-[10px] font-mono text-steel">{c.scenario(String(i + 1).padStart(2, "0"))}</div>
                      <div className="text-telemetry font-semibold">{s.label}</div>
                      <div className="font-mono text-sky-400 tabular-nums">{formatLatLon(s)}</div>
                      <div className="font-mono text-steel tabular-nums">{formatUtc(s.date)}</div>
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        <button type="button" onClick={() => onLoad(s)} className="btn-control px-1.5 py-0.5 rounded text-[11px]">
                          {c.view}
                        </button>
                        <button type="button" onClick={() => addLater(s)} className="btn-control px-1.5 py-0.5 rounded text-[11px]" title={c.plusLunarTitle}>
                          {c.plusLunar}
                        </button>
                        <button
                          type="button"
                          onClick={() => removeScenario(s.id)}
                          className="btn-control px-1.5 py-0.5 rounded text-[11px] !text-red-300"
                          aria-label={c.remove(i + 1)}
                        >
                          ✕
                        </button>
                      </div>
                      {okAt(s)?.truncated && <div className="text-[10px] text-amber-400 mt-1">{c.truncated}</div>}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-borderline/70">
                {rows.map((row) => {
                  const best = row.num ? bestIndices(scenarios.map((s) => (okAt(s) ? row.num!(okAt(s)!) : null))) : [];
                  return (
                    <tr key={row.label} className="hover:bg-panel/50">
                      <th scope="row" className="py-2 px-3 font-normal text-steel">
                        {row.group === "sun" && <span className="text-amber-400" aria-hidden="true">☀ </span>}
                        {row.group === "earth" && <span className="text-sky-400" aria-hidden="true">📡 </span>}
                        {row.label}
                      </th>
                      {scenarios.map((s, i) => {
                        const r = results[s.id];
                        const isBest = best.includes(i);
                        return (
                          <td key={s.id} className={`py-2 px-3 font-mono tabular-nums ${isBest ? "text-emerald-400 font-semibold" : "text-telemetry"}`}>
                            {!r ? (
                              <span className="text-steel">{c.calculating}</span>
                            ) : r.status === "error" ? (
                              <span className="text-red-300">{r.message}</span>
                            ) : (
                              <>
                                {row.render(r, s)}
                                {isBest && <span className="ml-1 text-emerald-400" aria-label={c.best}>▲</span>}
                              </>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        <div className="p-3 border-t border-borderline bg-obsidian/80 text-xs text-steel">
          <span className="inline-flex items-center gap-1 mr-3"><i className="w-3 h-2 inline-block bg-amber-500/80" aria-hidden="true" /> {c.legendSun}</span>
          <span className="inline-flex items-center gap-1 mr-3"><i className="w-3 h-2 inline-block bg-sky-600" aria-hidden="true" /> {c.legendEarth}</span>
          {c.footer}
        </div>
      </div>
    </div>
  );
}
