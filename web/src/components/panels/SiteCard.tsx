/**
 * Ficha del punto (maqueta "Selene"): flota junto al marcador del globo con una línea guía.
 * Solo métricas de lib/metrics.ts y la geometría de la efeméride: sin puntuaciones, irradiancias,
 * temperaturas ni geología.
 * - Simple: energía (disco solar visible), Tierra visible, tiempo de luz restante y un resumen.
 * - Avanzado: elevación/acimut del Sol y la Tierra, margen sobre el horizonte, enlace y cuenta
 *   atrás, punto subsolar, libración (punto sub-terrestre) y nivel de horizonte.
 */
import { useState, type ReactNode } from "react";
import type { SiteMetrics } from "../../types";
import type { AppMode } from "../../store/useAppStore";
import { CONDITION_TAG, type Condition } from "../../lib/conditions";
import { formatDeg, formatDuration, formatHours, formatPercent } from "../../lib/format";
import { summarize } from "../../lib/summary";

export interface SiteCardProps {
  title: string;
  coordsLabel: string;
  metrics: SiteMetrics | null;
  condition: Condition | null;
  mode: AppMode;
  subSolar: { lat: number; lon: number } | null;
  subEarth: { lat: number; lon: number } | null;
  horizonLabel: string;
}

const signed = (d: number) => `${d >= 0 ? "+" : ""}${formatDeg(d)}`;
const ll = (p: { lat: number; lon: number }) => `${signed(p.lat)} N / ${signed(p.lon)} E`;

const TONE: Record<Condition, { pill: string; text: string }> = {
  both: { pill: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40", text: "text-emerald-400" },
  sun: { pill: "bg-amber-500/20 text-amber-300 border-amber-500/40", text: "text-amber-400" },
  earth: { pill: "bg-sky-500/20 text-sky-300 border-sky-500/40", text: "text-sky-400" },
  none: { pill: "bg-red-500/20 text-red-300 border-red-500/40", text: "text-red-400" },
};

const STATUS: Record<Condition, string> = {
  both: "LUZ Y ENLACE DIRECTO",
  sun: "LUZ · SIN ENLACE DIRECTO",
  earth: "NOCHE · CON ENLACE",
  none: "NOCHE · SIN ENLACE",
};

function Cell({ label, children, cls = "text-telemetry" }: { label: string; children: ReactNode; cls?: string }) {
  return (
    <div className="bg-obsidian/85 border border-borderline rounded px-2 py-1">
      <div className="text-[9px] text-steel">{label}</div>
      <div className={`text-[11px] font-semibold tabular-nums ${cls}`}>{children}</div>
    </div>
  );
}

export function SiteCard({ title, coordsLabel, metrics, condition, mode, subSolar, subEarth, horizonLabel }: SiteCardProps) {
  const [open, setOpen] = useState(true);
  const tone = condition ? TONE[condition] : null;
  const sun = metrics?.sun;
  const earth = metrics?.earth;
  const summary = metrics ? summarize(metrics) : null;

  return (
    <div className="w-72 sm:w-80 max-lg:w-full rounded-md border border-sky-400/50 bg-[#0d141f]/90 backdrop-blur-md shadow-[0_12px_32px_rgba(0,0,0,0.65),0_0_18px_rgba(56,189,248,0.14)]">
      <div className="px-2.5 py-1.5 border-b border-sky-400/25 bg-sky-950/35 flex items-center justify-between gap-2 rounded-t-md">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" aria-hidden="true" />
          <span className="text-[11px] font-mono font-semibold text-telemetry truncate">{title}</span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {condition && tone && (
            <span className={`text-[10px] font-mono font-bold px-1.5 rounded border ${tone.pill}`}>{CONDITION_TAG[condition]}</span>
          )}
          <button
            type="button"
            onClick={() => setOpen(!open)}
            aria-expanded={open}
            title="Expandir / contraer"
            className="px-1.5 rounded bg-obsidian/80 hover:bg-panel border border-borderline text-[11px] font-mono text-sky-300"
          >
            {open ? "▾" : "▸"}
          </button>
        </div>
      </div>

      {open && (
        <div className="p-2.5 space-y-2 text-xs" aria-live="polite">
          <div className="flex items-center justify-between text-[10px] font-mono text-steel border-b border-borderline/70 pb-1.5 gap-2">
            <span className="text-sky-300 tabular-nums">{coordsLabel}</span>
            {condition && tone && <span className={`font-semibold ${tone.text}`}>{STATUS[condition]}</span>}
          </div>

          {!metrics || !sun || !earth || !summary ? (
            <p className="text-[11px] font-mono text-steel">Calculando…</p>
          ) : mode === "simple" ? (
            <div className="space-y-1.5">
              <div className="grid grid-cols-3 gap-1.5 text-center">
                <div className="bg-obsidian/80 border border-borderline rounded p-1.5" title="Parte del disco solar por encima del horizonte">
                  <div className="text-[9px] font-mono text-steel">SOL VISIBLE</div>
                  <div className={`text-xs font-mono font-bold tabular-nums mt-0.5 ${sun.visibleNow ? "text-amber-400" : "text-steel"}`}>
                    {formatPercent(sun.visibleFractionNow)}
                  </div>
                </div>
                <div className="bg-obsidian/80 border border-borderline rounded p-1.5">
                  <div className="text-[9px] font-mono text-steel">TIERRA</div>
                  <div className={`text-xs font-mono font-bold mt-0.5 ${earth.visibleNow ? "text-sky-400" : "text-red-400"}`}>
                    {earth.visibleNow ? "VISIBLE" : "OCULTA"}
                  </div>
                </div>
                <div className="bg-obsidian/80 border border-borderline rounded p-1.5" title={sun.visibleNow ? "Tiempo hasta el ocaso" : "Tiempo hasta el amanecer"}>
                  <div className="text-[9px] font-mono text-steel">{sun.visibleNow ? "LUZ REST." : "ALBA EN"}</div>
                  <div className={`text-xs font-mono font-bold tabular-nums mt-0.5 ${sun.visibleNow ? "text-emerald-400" : "text-slate-300"}`}>
                    {(sun.visibleNow ? sun.hoursToSet : sun.hoursToRise) === null ? "> ventana" : formatDuration(sun.visibleNow ? sun.hoursToSet : sun.hoursToRise)}
                  </div>
                </div>
              </div>
              <p className="text-[11px] text-slate-300 leading-snug">
                {summary.sun} {summary.light} {summary.earth}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-1.5 font-mono">
                <Cell label="SOL (ELEV / AZ)" cls="text-amber-400">
                  {signed(sun.elevationNowDeg)} <span className="text-steel font-normal">/ {formatDeg(sun.azimuthNowDeg)}</span>
                </Cell>
                <Cell label="TIERRA (ELEV / AZ)" cls="text-sky-400">
                  {signed(earth.elevationNowDeg)} <span className="text-steel font-normal">/ {formatDeg(earth.azimuthNowDeg)}</span>
                </Cell>
                <Cell label="DISCO SOLAR / MARGEN">
                  {formatPercent(sun.visibleFractionNow)} <span className="text-steel font-normal">/ {signed(sun.clearanceNowDeg)}</span>
                </Cell>
                <Cell label={sun.visibleNow ? "ENLACE / OCASO" : "ENLACE / ALBA"}>
                  <span className={earth.visibleNow ? "text-emerald-400" : "text-red-400"}>{earth.visibleNow ? "DTE" : "SIN DTE"}</span>{" "}
                  <span className="text-slate-300 font-normal">/ {formatDuration(sun.visibleNow ? sun.hoursToSet : sun.hoursToRise)}</span>
                </Cell>
              </div>
              <div className="text-[10px] font-mono text-steel space-y-0.5 bg-obsidian/65 border border-borderline/70 rounded px-2 py-1.5">
                <div className="flex justify-between gap-2"><span>Luz / Tierra en la ventana:</span><span className="text-telemetry tabular-nums">{formatHours(sun.visibleHours)} / {formatHours(earth.visibleHours)}</span></div>
                <div className="flex justify-between gap-2"><span>{earth.visibleNow ? "La Tierra se pone en:" : "La Tierra sale en:"}</span><span className="text-telemetry tabular-nums">{formatDuration(earth.visibleNow ? earth.hoursToSet : earth.hoursToRise)}</span></div>
                {subSolar && <div className="flex justify-between gap-2"><span>Punto subsolar:</span><span className="text-telemetry tabular-nums">{ll(subSolar)}</span></div>}
                {subEarth && <div className="flex justify-between gap-2"><span>Libración (sub-terrestre):</span><span className="text-telemetry tabular-nums">{ll(subEarth)}</span></div>}
                <div className="flex justify-between gap-2"><span>Horizonte:</span><span className="text-telemetry">{horizonLabel}</span></div>
              </div>
              <p className="text-[10px] text-steel">— = no ocurre en el día lunar calculado.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
