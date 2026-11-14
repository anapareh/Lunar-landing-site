/**
 * Panel derecho: energía (Sol) y enlace directo con la Tierra (DTE).
 * Solo métricas calculadas en lib/metrics.ts; sin índices ni estimaciones inventadas.
 * En modo DIVULGATIVO añade explicaciones (src/content/texts.es.json).
 */
import type { BodyMetrics, SiteMetrics } from "../../types";
import type { AppMode } from "../../store/useAppStore";
import { formatDeg, formatDuration, formatHours, formatPercent } from "../../lib/format";
import { HorizonLevelBadge } from "../common/HorizonLevelBadge";
import texts from "../../content/texts.es.json";

const signed = (deg: number) => `${deg >= 0 ? "+" : ""}${formatDeg(deg)}`;

function Cell({ label, value, sub, valueClass = "text-white" }: { label: string; value: string; sub?: string; valueClass?: string }) {
  return (
    <div className="bg-slate-950/90 p-2 rounded border border-slate-800">
      <div className="text-[9px] text-slate-400">{label}</div>
      <div className={`text-sm font-bold ${valueClass}`}>{value}</div>
      {sub && <div className="text-[10px] text-slate-400">{sub}</div>}
    </div>
  );
}

function Row({ label, value, valueClass = "text-slate-200" }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-slate-400">{label}</span>
      <span className={`text-right font-semibold whitespace-nowrap ${valueClass}`}>{value}</span>
    </div>
  );
}

function countdown(b: BodyMetrics, set: string, rise: string): { label: string; value: string } {
  const h = b.visibleNow ? b.hoursToSet : b.hoursToRise;
  return {
    label: b.visibleNow ? set : rise,
    value: h === null ? "No ocurre en la ventana" : formatDuration(h),
  };
}

function EduBox({ tone, title, body }: { tone: "amber" | "cyan" | "slate"; title: string; body: string }) {
  const cls = {
    amber: "bg-amber-950/30 border-amber-500/30 text-amber-100",
    cyan: "bg-cyan-950/30 border-cyan-500/30 text-cyan-100",
    slate: "bg-slate-900/60 border-slate-600/60 text-slate-200",
  }[tone];
  return (
    <div className={`border rounded p-2 text-[12px] leading-snug ${cls}`}>
      <strong>{title}</strong> {body}
    </div>
  );
}

export interface AnalysisPanelProps {
  metrics: SiteMetrics | null;
  mode: AppMode;
  hidden?: boolean;
}

export function AnalysisPanel({ metrics, mode, hidden }: AnalysisPanelProps) {
  const sun = metrics?.sun;
  const earth = metrics?.earth;
  const sunCd = sun && countdown(sun, "Hasta el ocaso", "Hasta el orto");
  const earthCd = earth && countdown(earth, "Hasta que se pone", "Hasta que sale");

  return (
    <aside
      aria-label="Análisis de energía y comunicación"
      aria-live="polite"
      className={`pointer-events-auto w-full lg:w-80 xl:w-[350px] hud-box hud-corners rounded-lg flex flex-col max-h-[520px] lg:max-h-full transition-all duration-300 shrink-0 ${
        hidden ? "lg:opacity-0 lg:pointer-events-none lg:translate-x-8" : ""
      }`}
    >
      <div className="px-3 py-2 border-b border-cyan-500/25 flex items-center justify-between gap-2 bg-cyan-950/20">
        <h2 className="font-display text-xs font-bold tracking-wider text-cyan-300 flex items-center gap-1.5">
          <span aria-hidden="true">⚡</span> ANÁLISIS
        </h2>
        {metrics && <HorizonLevelBadge level={metrics.horizonLevel} />}
      </div>

      {!metrics || !sun || !earth || !sunCd || !earthCd ? (
        <p className="p-3 text-xs font-mono text-slate-400">Calculando…</p>
      ) : (
        <div className="flex-1 overflow-y-auto p-2.5 space-y-2.5">
          {/* ENERGÍA */}
          <section className="bg-void/75 border border-amber-500/30 rounded-lg p-2.5 space-y-2" aria-label="Energía solar">
            <div className="flex items-center justify-between border-b border-amber-500/20 pb-1">
              <h3 className="font-display text-[11px] font-bold text-amber-300 tracking-wider glow-amber">☀ ENERGÍA SOLAR</h3>
              <span
                className={`text-[10px] font-mono px-1.5 rounded border ${
                  sun.visibleNow ? "bg-amber-500/20 text-amber-200 border-amber-400/50" : "bg-slate-800 text-slate-400 border-slate-700"
                }`}
              >
                {sun.visibleNow ? "SOL VISIBLE" : "SOL OCULTO"}
              </span>
            </div>

            <div>
              <div className="text-[10px] font-mono text-slate-400">ELEVACIÓN SOLAR</div>
              <div className={`font-display text-4xl font-bold leading-tight ${sun.visibleNow ? "text-amber-300 glow-amber" : "text-slate-400"}`}>
                {signed(sun.elevationNowDeg)}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 font-mono">
              <Cell label="ACIMUT" value={formatDeg(sun.azimuthNowDeg)} />
              <Cell label="DISCO VISIBLE" value={formatPercent(sun.visibleFractionNow)} valueClass={sun.visibleNow ? "text-amber-300" : "text-slate-400"} />
            </div>

            <div className="text-xs font-mono space-y-1 pt-0.5">
              <Row label={sunCd.label} value={sunCd.value} valueClass="text-amber-200" />
              <Row label="Luz en la ventana" value={`${formatHours(sun.visibleHours)} / ${formatHours(metrics.windowHours)}`} />
              {mode === "tech" && <Row label="Elevación máxima" value={signed(sun.maxElevationDeg)} />}
              {mode === "tech" && <Row label="Sobre el horizonte local" value={signed(sun.clearanceNowDeg)} />}
            </div>

            {mode === "edu" && <EduBox tone="amber" title={texts.sun.title} body={texts.sun.body} />}
          </section>

          {/* ENLACE TIERRA */}
          <section className="bg-void/75 border border-cyan-500/30 rounded-lg p-2.5 space-y-2" aria-label="Comunicación directa con la Tierra">
            <div className="flex items-center justify-between border-b border-cyan-500/20 pb-1">
              <h3 className="font-display text-[11px] font-bold text-cyan-300 tracking-wider glow-cyan">📡 ENLACE TIERRA (DTE)</h3>
              <span
                className={`text-[10px] font-mono px-1.5 rounded border ${
                  earth.visibleNow ? "bg-cyan-500/20 text-cyan-200 border-cyan-400/50" : "bg-rose-500/20 text-rose-300 border-rose-500/50"
                }`}
              >
                {earth.visibleNow ? "TIERRA VISIBLE" : "SIN LÍNEA DE VISIÓN"}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 font-mono">
              <Cell label="ELEVACIÓN TIERRA" value={signed(earth.elevationNowDeg)} valueClass={earth.visibleNow ? "text-cyan-300" : "text-rose-300"} />
              <Cell label="ACIMUT" value={formatDeg(earth.azimuthNowDeg)} />
            </div>

            <div className="text-xs font-mono space-y-1 pt-0.5">
              <Row label={earthCd.label} value={earthCd.value} valueClass="text-cyan-200" />
              <Row label="Tierra visible en la ventana" value={`${formatHours(earth.visibleHours)} / ${formatHours(metrics.windowHours)}`} />
              {mode === "tech" && <Row label="Sobre el horizonte local" value={signed(earth.clearanceNowDeg)} />}
            </div>

            {mode === "edu" && <EduBox tone="cyan" title={texts.earth.title} body={texts.earth.body} />}
          </section>

          {mode === "edu" && <EduBox tone="slate" title={texts.horizon.title} body={texts.horizon.body} />}

          <p className="text-[10px] font-mono text-slate-500 leading-snug">
            Visible = asoma el borde superior del disco sobre el horizonte. Ventana: un día lunar desde la fecha elegida.
          </p>
        </div>
      )}
    </aside>
  );
}
