/**
 * Comparativa de escenarios (sitio + fecha) lado a lado. Solo métricas calculadas en lib/.
 * Cada escenario se evalúa en su propia ventana de un día lunar desde su fecha.
 * Destaca el mejor valor en las filas donde "más es mejor" (horas de luz, de Tierra visible y
 * elevación solar máxima). Acciones por columna: ver en el globo, +1 día lunar, quitar.
 */
import { useEffect, useRef, type ReactNode } from "react";
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

type Ok = Extract<ScenarioResult, { status: "ok" }>;

interface RowDef {
  label: string;
  render: (r: Ok, s: Scenario) => ReactNode;
  /** Valor numérico para destacar el mejor (si procede). */
  num?: (r: Ok) => number | null;
  group?: "sun" | "earth";
}

const signed = (d: number) => `${d >= 0 ? "+" : ""}${formatDeg(d)}`;
const countdown = (visible: boolean, toSet: number | null, toRise: number | null, set: string, rise: string) => {
  const h = visible ? toSet : toRise;
  return h === null ? (visible ? "no se pone en todo el periodo" : "no sale en todo el periodo") : `${visible ? set : rise} ${formatDuration(h)}`;
};

const ROWS: RowDef[] = [
  {
    label: "En resumen",
    render: (r) => {
      const t = summarize(r.metrics);
      return (
        <span className="font-sans text-[11px] text-slate-200 leading-snug whitespace-normal block">
          {t.sun} {t.light} {t.earth}
        </span>
      );
    },
  },
  { label: "Relieve usado", render: (r) => <HorizonLevelBadge level={r.metrics.horizonLevel} /> },
  {
    label: "Los 29,5 días (luz / Tierra)",
    render: (r, s) => <VisibilityStrip sun={r.sun} earth={r.earth} label={`Luz y visibilidad de la Tierra durante el día lunar de ${s.label}`} />,
  },
  { group: "sun", label: "Altura del Sol al aterrizar", render: (r) => signed(r.metrics.sun.elevationNowDeg) },
  { group: "sun", label: "Parte del Sol visible al aterrizar", render: (r) => formatPercent(r.metrics.sun.visibleFractionNow) },
  {
    group: "sun",
    label: "Próximo ocaso o amanecer",
    render: (r) => countdown(r.metrics.sun.visibleNow, r.metrics.sun.hoursToSet, r.metrics.sun.hoursToRise, "se pone en", "amanece en"),
  },
  {
    group: "sun",
    label: "Horas de sol en los 29,5 días",
    render: (r) => `${formatHours(r.metrics.sun.visibleHours)} (${formatPercent(r.metrics.sun.visibleHours / r.metrics.windowHours)})`,
    num: (r) => r.metrics.sun.visibleHours,
  },
  { group: "sun", label: "Altura máxima del Sol", render: (r) => signed(r.metrics.sun.maxElevationDeg), num: (r) => r.metrics.sun.maxElevationDeg },
  {
    group: "earth",
    label: "Tierra al aterrizar",
    render: (r) => (
      <span className={r.metrics.earth.visibleNow ? "text-sky-400" : "text-red-400"}>
        {signed(r.metrics.earth.elevationNowDeg)} · {r.metrics.earth.visibleNow ? "visible: enlace directo" : "oculta: sin enlace directo"}
      </span>
    ),
  },
  {
    group: "earth",
    label: "Cuándo se pone o sale la Tierra",
    render: (r) => countdown(r.metrics.earth.visibleNow, r.metrics.earth.hoursToSet, r.metrics.earth.hoursToRise, "se pone en", "sale en"),
  },
  {
    group: "earth",
    label: "Horas con la Tierra a la vista",
    render: (r) => `${formatHours(r.metrics.earth.visibleHours)} (${formatPercent(r.metrics.earth.visibleHours / r.metrics.windowHours)})`,
    num: (r) => r.metrics.earth.visibleHours,
  },
];

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
    notify(r === "added" ? "Añadido el mismo sitio un día lunar después" : r === "full" ? `Máximo ${MAX_SCENARIOS} escenarios` : "Ese escenario ya está en la tabla");
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
              Comparativa de escenarios de alunizaje
            </h2>
            <p className="text-xs text-steel mt-0.5">
              Cada columna es un lugar y una fecha de aterrizaje; se simulan los 29,5 días siguientes (un día lunar). ▲ = mejor valor de la fila.
            </p>
          </div>
          <button ref={closeRef} type="button" onClick={() => setCompareOpen(false)} className="btn-control px-2.5 py-1 rounded text-xs font-medium">
            Cerrar ✕
          </button>
        </div>

        <div className="p-4 overflow-auto flex-1">
          {scenarios.length === 0 ? (
            <p className="text-sm text-steel">
              Aún no hay escenarios. Usa <strong className="text-telemetry">+ Comparar</strong> en el panel de sitios para añadir el
              punto y la fecha actuales (hasta {MAX_SCENARIOS}).
            </p>
          ) : (
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-borderline align-top">
                  <th scope="col" className="py-2.5 px-3 w-44 text-steel font-mono text-[11px] font-normal">PARÁMETRO</th>
                  {scenarios.map((s, i) => (
                    <th key={s.id} scope="col" className="py-2.5 px-3 min-w-[190px] font-normal">
                      <div className="text-[10px] font-mono text-steel">ESCENARIO {String(i + 1).padStart(2, "0")}</div>
                      <div className="text-telemetry font-semibold">{s.label}</div>
                      <div className="font-mono text-sky-400 tabular-nums">{formatLatLon(s)}</div>
                      <div className="font-mono text-steel tabular-nums">{formatUtc(s.date)}</div>
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        <button type="button" onClick={() => onLoad(s)} className="btn-control px-1.5 py-0.5 rounded text-[11px]">
                          Ver
                        </button>
                        <button type="button" onClick={() => addLater(s)} className="btn-control px-1.5 py-0.5 rounded text-[11px]" title="Mismo sitio, un día lunar más tarde">
                          +1 día lunar
                        </button>
                        <button
                          type="button"
                          onClick={() => removeScenario(s.id)}
                          className="btn-control px-1.5 py-0.5 rounded text-[11px] !text-red-300"
                          aria-label={`Quitar escenario ${i + 1}`}
                        >
                          ✕
                        </button>
                      </div>
                      {okAt(s)?.truncated && <div className="text-[10px] text-amber-400 mt-1">Ventana recortada por los datos</div>}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-borderline/70">
                {ROWS.map((row) => {
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
                              <span className="text-steel">Calculando…</span>
                            ) : r.status === "error" ? (
                              <span className="text-red-300">{r.message}</span>
                            ) : (
                              <>
                                {row.render(r, s)}
                                {isBest && <span className="ml-1 text-emerald-400" aria-label="(mejor)">▲</span>}
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
          <span className="inline-flex items-center gap-1 mr-3"><i className="w-3 h-2 inline-block bg-amber-500/80" aria-hidden="true" /> luz solar</span>
          <span className="inline-flex items-center gap-1 mr-3"><i className="w-3 h-2 inline-block bg-sky-600" aria-hidden="true" /> Tierra a la vista</span>
          Polo sur (85°–90° S): relieve LOLA del nodo de la rejilla. Resto: Luna lisa; el relieve real puede cambiar las horas de luz y de Tierra visible.
        </div>
      </div>
    </div>
  );
}
