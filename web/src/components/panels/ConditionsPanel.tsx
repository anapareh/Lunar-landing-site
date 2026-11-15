/**
 * Panel derecho (maqueta "Selene"): "Mapa de condiciones y tiempo".
 * 1. Mapa de dónde se ven el Sol y la Tierra ahora (horizonte geométrico).
 * 2. Evolución del punto durante un día lunar: condición, luz y Tierra; mejor ventana (la más
 *    larga con Sol y Tierra a la vez) y peor condición (la noche más larga). Reglas explícitas,
 *    sin puntuaciones.
 * 3. Horizonte local: perfil LOLA (polo sur) o geométrico, con las trayectorias del Sol y la Tierra.
 */
import { useMemo, type ReactNode } from "react";
import type { HorizonProfile, HorizonSample, SiteMetrics, Vector3 } from "../../types";
import type { AppMode } from "../../store/useAppStore";
import { visibilityWindows, type VisibilityWindow } from "../../lib/metrics";
import { gapWindows, intersectWindows, longestWindow } from "../../lib/windows";
import { formatDate, formatDeg, formatDuration, formatNumber1, formatShortDateTime, formatUtc, currentLocale } from "../../lib/format";
import { ConditionsMap } from "../map/ConditionsMap";
import { SynodicTimeline } from "../timeline/SynodicTimeline";
import { HorizonProfileChart } from "../detail/HorizonProfileChart";
import { useEduTexts, useT } from "../../i18n";

export interface ConditionsPanelProps {
  mode: AppMode;
  sunDir: Vector3 | null;
  earthDir: Vector3 | null;
  site: { lat: number; lon: number };
  onPick: (c: { lat: number; lon: number }) => void;
  sun: HorizonSample[];
  earth: HorizonSample[];
  windowStart: string;
  windowEnd: string;
  cursor: string;
  onScrub: (iso: string) => void;
  /** Lleva el instante al inicio de la mejor ventana. */
  onBest: (iso: string) => void;
  metrics: SiteMetrics | null;
  profile: HorizonProfile | null;
  /** Distancia del nodo LOLA al punto elegido (km), si se usa la rejilla. */
  nodeDistanceKm: number | null;
  /** Móvil: el panel se muestra como hoja inferior solo si está abierto. */
  sheetOpen: boolean;
}

const dur = (w: VisibilityWindow) => `${w.openStart || w.openEnd ? "≥ " : ""}${formatDuration(w.hours)}`;

function Card({ title, sub, right, children }: { title: string; sub?: string; right?: ReactNode; children: ReactNode }) {
  return (
    <section className="bg-obsidian/80 border border-borderline rounded-md p-2.5 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h3 className="text-xs font-semibold text-telemetry">{title}</h3>
          {sub && <p className="text-[10px] text-steel">{sub}</p>}
        </div>
        {right}
      </div>
      {children}
    </section>
  );
}

export function ConditionsPanel(props: ConditionsPanelProps) {
  const { mode, sunDir, earthDir, site, onPick, sun, earth, windowStart, windowEnd, cursor, onScrub, onBest, metrics, profile, nodeDistanceKm, sheetOpen } = props;
  const t = useT();
  const p = t.panel;
  const texts = useEduTexts();

  const { best, worst } = useMemo(() => {
    const sw = visibilityWindows(sun);
    const ew = visibilityWindows(earth);
    return { best: longestWindow(intersectWindows(sw, ew)), worst: longestWindow(gapWindows(sw, windowStart, windowEnd)) };
  }, [sun, earth, windowStart, windowEnd]);

  const maxH = profile ? profile.horizon_elevation_deg.reduce((a, v, i) => (v > a.v ? { v, i } : a), { v: -Infinity, i: 0 }) : null;
  const sunNow = metrics ? { az: metrics.sun.azimuthNowDeg, el: metrics.sun.elevationNowDeg } : null;
  const earthNow = metrics ? { az: metrics.earth.azimuthNowDeg, el: metrics.earth.elevationNowDeg } : null;

  return (
    <aside
      id="conditions-panel"
      aria-label={p.title}
      className={`pointer-events-auto w-full lg:w-80 xl:w-[368px] console-panel rounded-md flex flex-col lg:max-h-full shrink-0 max-lg:fixed max-lg:inset-x-2 max-lg:w-auto max-lg:z-40 max-lg:bottom-[calc(var(--foot-h,110px)+16px)] max-lg:max-h-[50vh] ${sheetOpen ? "" : "max-lg:hidden"}`}
    >
      <div className="px-3 py-2 border-b border-borderline flex items-center justify-between bg-panel/60">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-telemetry">{p.title}</h2>
          <p className="text-[10px] text-steel">{p.subtitle}</p>
        </div>
        <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded bg-obsidian border border-borderline ${mode === "simple" ? "text-sky-400" : "text-amber-400"}`}>
          {mode === "simple" ? p.badgeSimple : p.badgeAdvanced}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-2.5 space-y-2.5">
        <Card
          title={p.mapTitle}
          right={<span className="text-[10px] font-mono text-sky-400 tabular-nums uppercase">{formatDate(cursor)}</span>}
        >
          <ConditionsMap sunDir={sunDir} earthDir={earthDir} site={site} onPick={onPick} />
        </Card>

        <Card
          title={p.evolutionTitle}
          sub={p.evolutionSub}
          right={
            <button
              type="button"
              disabled={!best}
              onClick={() => best && onBest(best.start)}
              title={p.bestTitle}
              className="btn-control px-2 py-1 rounded text-[11px] font-medium !text-emerald-400 shrink-0"
            >
              {p.best}
            </button>
          }
        >
          {sun.length > 0 && (
            <SynodicTimeline sun={sun} earth={earth} cursor={cursor} onScrub={onScrub} heightClass="h-24" dateLabels label={p.evolutionAria} />
          )}
          <div className="flex flex-wrap items-center justify-between gap-x-2 text-[10px] font-mono text-steel">
            <span>{p.row1}</span>
            <span>{p.rows23}</span>
          </div>
          <div className="grid grid-cols-2 gap-2 pt-0.5">
            <div className="bg-emerald-950/25 border border-emerald-500/35 rounded p-2">
              <div className="text-[10px] font-mono text-emerald-400 uppercase font-semibold">{p.bestLabel}</div>
              <div className="text-xs font-mono font-bold text-telemetry tabular-nums mt-0.5">{best ? formatShortDateTime(best.start) : "—"}</div>
              <div className="text-[10px] text-slate-300 mt-0.5 leading-tight">
                {best ? p.bestDesc(dur(best)) : p.bestNone}
              </div>
            </div>
            <div className="bg-red-950/25 border border-red-500/35 rounded p-2">
              <div className="text-[10px] font-mono text-red-400 uppercase font-semibold">{p.worstLabel}</div>
              <div className="text-xs font-mono font-bold text-telemetry tabular-nums mt-0.5">{worst ? formatShortDateTime(worst.start) : "—"}</div>
              <div className="text-[10px] text-slate-300 mt-0.5 leading-tight">
                {worst ? p.worstDesc(dur(worst)) : p.worstNone}
              </div>
            </div>
          </div>
          {mode === "advanced" && (best?.openEnd || worst?.openEnd || best?.openStart || worst?.openStart) && (
            <p className="text-[10px] text-steel">{p.openNote}</p>
          )}
        </Card>

        <Card
          title={p.horizonTitle}
          right={
            <span className={`text-[10px] font-mono ${profile ? "text-emerald-300" : "text-steel"}`}>{profile ? p.lolaBadge : p.geometricBadge}</span>
          }
        >
          <HorizonProfileChart profile={profile} sun={sun} earth={earth} sunNow={sunNow} earthNow={earthNow} />
          <p className="text-xs text-slate-300 leading-relaxed">
            {profile && maxH ? (
              p.horizonLola(
                nodeDistanceKm !== null ? formatNumber1(nodeDistanceKm) : null,
                formatDeg(maxH.v),
                maxH.i * profile.azimuth_step_deg,
                profile.surface_height_m !== null ? Math.round(profile.surface_height_m).toLocaleString(currentLocale()) : null,
              )
            ) : (
              p.horizonGeometric
            )}
          </p>
          {mode === "advanced" && profile && (
            <p className="text-[10px] font-mono text-steel">
              {p.demMeta(profile.dem.product, profile.observer_height_m, profile.max_distance_km)}
            </p>
          )}
        </Card>

        {mode === "simple" && (
          <details className="bg-obsidian/70 border border-borderline rounded-md p-2.5 text-[11px] text-slate-300 leading-relaxed">
            <summary className="cursor-pointer text-xs font-semibold text-telemetry">{p.whatTitle}</summary>
            <p className="mt-1.5"><strong className="text-amber-400">{texts.sun.title}</strong> {texts.sun.body}</p>
            <p className="mt-1.5"><strong className="text-sky-400">{texts.earth.title}</strong> {texts.earth.body}</p>
            <p className="mt-1.5"><strong className="text-telemetry">{texts.horizon.title}</strong> {texts.horizon.body}</p>
          </details>
        )}

        <p className="text-[10px] text-steel leading-snug">
          {p.visibleNote(formatUtc(windowStart), formatUtc(windowEnd))}
        </p>
      </div>
    </aside>
  );
}
