/**
 * Panel derecho "Telemetría": iluminación solar y visibilidad de la Tierra (DTE).
 * Solo métricas calculadas en lib/ (sin índices, irradiancias, temperaturas ni geología inventadas).
 * En modo Divulgativo añade explicaciones (src/content/texts.es.json).
 */
import type { BodyMetrics, SiteMetrics } from "../../types";
import type { AppMode } from "../../store/useAppStore";
import { formatDeg, formatDuration, formatHours, formatPercent } from "../../lib/format";
import { HorizonLevelBadge } from "../common/HorizonLevelBadge";
import texts from "../../content/texts.es.json";

const signed = (deg: number) => `${deg >= 0 ? "+" : ""}${formatDeg(deg)}`;

function Cell({ label, value, sub, valueClass = "text-telemetry" }: { label: string; value: string; sub?: string; valueClass?: string }) {
  return (
    <div className="bg-surface p-2 rounded border border-borderline">
      <div className="text-[10px] font-mono text-steel">{label}</div>
      <div className={`text-sm font-mono font-bold tabular-nums mt-0.5 ${valueClass}`}>{value}</div>
      {sub && <div className="text-[10px] font-mono text-steel tabular-nums">{sub}</div>}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-steel">{label}</span>
      <span className="font-mono text-telemetry tabular-nums text-right whitespace-nowrap">{value}</span>
    </div>
  );
}

function countdown(b: BodyMetrics, set: string, rise: string): { label: string; value: string } {
  const h = b.visibleNow ? b.hoursToSet : b.hoursToRise;
  return { label: b.visibleNow ? set : rise, value: h === null ? "No ocurre en la ventana" : formatDuration(h) };
}

function EduBox({ tone, title, body }: { tone: "amber" | "sky" | "steel"; title: string; body: string }) {
  const titleCls = { amber: "text-amber-400", sky: "text-sky-400", steel: "text-telemetry" }[tone];
  return (
    <div className="bg-surface border border-borderline rounded p-2 text-[11px] text-slate-300 leading-relaxed">
      <strong className={titleCls}>{title}</strong> {body}
    </div>
  );
}

const Badge = ({ ok, on, off, tone }: { ok: boolean; on: string; off: string; tone: "amber" | "sky" }) => (
  <span
    className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
      ok
        ? tone === "amber"
          ? "bg-amber-500/15 text-amber-300 border-amber-500/30"
          : "bg-sky-500/15 text-sky-300 border-sky-500/30"
        : tone === "amber"
          ? "bg-obsidian text-steel border-borderline"
          : "bg-red-500/15 text-red-300 border-red-500/30"
    }`}
  >
    {ok ? on : off}
  </span>
);

export interface AnalysisPanelProps {
  metrics: SiteMetrics | null;
  mode: AppMode;
  /** Punto de la Luna bajo la Tierra (libración), de la efeméride. */
  subEarth?: { lat: number; lon: number } | null;
  hidden?: boolean;
}

export function AnalysisPanel({ metrics, mode, subEarth, hidden }: AnalysisPanelProps) {
  const sun = metrics?.sun;
  const earth = metrics?.earth;
  const sunCd = sun && countdown(sun, "Tiempo hasta el ocaso", "Tiempo hasta el alba");
  const earthCd = earth && countdown(earth, "Tiempo hasta que se pone", "Tiempo hasta que sale");

  return (
    <aside
      aria-label="Telemetría de iluminación y comunicación"
      aria-live="polite"
      className={`pointer-events-auto w-full lg:w-80 xl:w-[348px] console-panel rounded-md flex flex-col max-h-[520px] lg:max-h-full transition-all duration-200 shrink-0 ${
        hidden ? "lg:opacity-0 lg:pointer-events-none lg:translate-x-6" : ""
      }`}
    >
      <div className="px-3 py-2 border-b border-borderline flex items-center justify-between gap-2 bg-panel/60">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-telemetry">Telemetría</h2>
        <div className="flex items-center gap-1.5">
          {metrics && <HorizonLevelBadge level={metrics.horizonLevel} />}
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-obsidian text-steel border border-borderline">
            {mode === "tech" ? "INGENIERÍA" : "DIVULGATIVO"}
          </span>
        </div>
      </div>

      {!metrics || !sun || !earth || !sunCd || !earthCd ? (
        <p className="p-3 text-xs font-mono text-steel">Calculando…</p>
      ) : (
        <div className="flex-1 overflow-y-auto p-2.5 space-y-2.5">
          {/* ILUMINACIÓN SOLAR */}
          <section className="bg-obsidian/75 border border-borderline rounded-md p-2.5 space-y-2" aria-label="Iluminación solar">
            <div className="flex items-center justify-between border-b border-borderline pb-1.5">
              <h3 className="text-xs font-semibold text-amber-400 flex items-center gap-1.5">
                <span aria-hidden="true">☀</span> Iluminación solar
              </h3>
              <Badge ok={sun.visibleNow} on="DÍA LUNAR" off="NOCHE LUNAR" tone="amber" />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Cell
                label="ELEVACIÓN SOLAR"
                value={signed(sun.elevationNowDeg)}
                sub={`AZ: ${formatDeg(sun.azimuthNowDeg)}`}
                valueClass={sun.visibleNow ? "text-telemetry text-base" : "text-steel text-base"}
              />
              <Cell
                label="DISCO VISIBLE"
                value={formatPercent(sun.visibleFractionNow)}
                sub="sobre el horizonte"
                valueClass={sun.visibleNow ? "text-amber-400" : "text-steel"}
              />
            </div>

            <div className="text-xs space-y-1 pt-0.5">
              <Row label={sunCd.label} value={sunCd.value} />
              <Row label="Luz en la ventana" value={`${formatHours(sun.visibleHours)} / ${formatHours(metrics.windowHours)}`} />
              {mode === "tech" && <Row label="Elevación máxima" value={signed(sun.maxElevationDeg)} />}
              {mode === "tech" && <Row label="Margen sobre el horizonte" value={signed(sun.clearanceNowDeg)} />}
            </div>

            {mode === "edu" && <EduBox tone="amber" title={texts.sun.title} body={texts.sun.body} />}
          </section>

          {/* VISIBILIDAD TIERRA */}
          <section className="bg-obsidian/75 border border-borderline rounded-md p-2.5 space-y-2" aria-label="Visibilidad de la Tierra">
            <div className="flex items-center justify-between border-b border-borderline pb-1.5">
              <h3 className="text-xs font-semibold text-sky-400 flex items-center gap-1.5">
                <span aria-hidden="true">📡</span> Visibilidad Tierra (DTE)
              </h3>
              <Badge ok={earth.visibleNow} on="LOS ACTIVO" off="SIN LOS" tone="sky" />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Cell
                label="ELEVACIÓN TIERRA"
                value={signed(earth.elevationNowDeg)}
                sub={`AZ: ${formatDeg(earth.azimuthNowDeg)}`}
                valueClass={earth.visibleNow ? "text-sky-400" : "text-red-400"}
              />
              <Cell
                label="ENLACE"
                value={earth.visibleNow ? "DIRECTO DTE" : "SIN LÍNEA DIRECTA"}
                sub={subEarth ? `LIB ${signed(subEarth.lat)} / ${signed(subEarth.lon)}` : undefined}
                valueClass={`text-xs ${earth.visibleNow ? "text-emerald-400" : "text-red-400"}`}
              />
            </div>

            <div className="text-xs space-y-1 pt-0.5">
              <Row label="Margen sobre el horizonte" value={signed(earth.clearanceNowDeg)} />
              <Row label={earthCd.label} value={earthCd.value} />
              <Row label="Tierra visible en la ventana" value={`${formatHours(earth.visibleHours)} / ${formatHours(metrics.windowHours)}`} />
            </div>

            {mode === "edu" && <EduBox tone="sky" title={texts.earth.title} body={texts.earth.body} />}
          </section>

          {mode === "edu" && <EduBox tone="steel" title={texts.horizon.title} body={texts.horizon.body} />}

          <p className="text-[11px] text-steel leading-relaxed">
            Visible = asoma el borde superior del disco sobre el horizonte. Ventana: un día lunar desde la fecha elegida.
            {mode === "tech" && " LIB = lat / lon del punto de la Luna bajo la Tierra (libración)."}
          </p>
        </div>
      )}
    </aside>
  );
}
