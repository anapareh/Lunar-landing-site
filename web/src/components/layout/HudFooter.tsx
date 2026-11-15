/**
 * Pie (maqueta "Selene"): simulación, época UTC con atajos (±1 día, hoy y, en Avanzado,
 * ±1 día lunar), fase lunar calculada con la efeméride y, en Avanzado, franja del ciclo y botón
 * del cajón "Análisis temporal". La fecha está limitada a la cobertura de la efeméride cargada.
 */
import { useEffect, useRef, type ReactNode } from "react";
import { MS_PER_DAY, addLunarDays, parseUtc, toIsoUtc } from "../../lib/time";
import type { LunarPhase } from "../../lib/phase";
import { formatPercent } from "../../lib/format";
import { SIM_SPEEDS, useAppStore, type AppMode, type Sheet } from "../../store/useAppStore";
import { useT } from "../../i18n";

export interface HudFooterProps {
  /** ISO UTC. */
  value: string;
  min: string;
  max: string;
  onChange: (iso: string) => void;
  mode: AppMode;
  playing: boolean;
  onTogglePlay: () => void;
  speed: number;
  onSpeed: (s: number) => void;
  drawerOpen: boolean;
  onToggleDrawer: () => void;
  phase: LunarPhase | null;
  /** Franja del ciclo (solo Avanzado). */
  timeline?: ReactNode;
  /** Móvil: hoja inferior abierta y conmutador. */
  sheet: Sheet;
  onToggleSheet: (s: Exclude<Sheet, null>) => void;
}

const toInput = (iso: string) => iso.slice(0, 16); // "YYYY-MM-DDTHH:MM"
const fromInput = (v: string) => `${v}:00Z`;

export function HudFooter(props: HudFooterProps) {
  const { value, min, max, onChange, mode, playing, onTogglePlay, speed, onSpeed, drawerOpen, onToggleDrawer, phase, timeline, sheet, onToggleSheet } = props;
  const footRef = useRef<HTMLElement>(null);
  const t = useT();
  const f = t.footer;
  const lang = useAppStore((s) => s.lang);
  const setLang = useAppStore((s) => s.setLang);

  // Altura del pie como variable CSS: las hojas inferiores y la ficha móvil se colocan encima
  useEffect(() => {
    const el = footRef.current;
    if (!el) return;
    const set = () => document.documentElement.style.setProperty("--foot-h", `${el.offsetHeight}px`);
    set();
    const ro = new ResizeObserver(set);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const adv = mode === "advanced";
  const inRange = (iso: string) => parseUtc(iso) >= parseUtc(min) && parseUtc(iso) <= parseUtc(max);
  const shift = (ms: number) => toIsoUtc(parseUtc(value) + ms);
  const shortcuts: { label: string; iso: string; title?: string; desktopOnly?: boolean }[] = [
    ...(adv ? [{ label: f.minusLunar, iso: addLunarDays(value, -1), desktopOnly: true }] : []),
    { label: f.minusDay, iso: shift(-MS_PER_DAY), title: f.minusDayTitle },
    { label: f.plusDay, iso: shift(MS_PER_DAY), title: f.plusDayTitle },
    ...(adv ? [{ label: f.plusLunar, iso: addLunarDays(value, 1), desktopOnly: true }] : []),
    { label: f.today, iso: toIsoUtc(Math.floor(Date.now() / 60_000) * 60_000), title: f.todayTitle },
  ];

  return (
    <footer ref={footRef} id="app-footer" className="relative z-20 pointer-events-auto console-panel rounded-md mx-2 sm:mx-3 mb-2 sm:mb-3 px-3 py-2 flex flex-col gap-1.5 shrink-0">
      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        <button
          type="button"
          onClick={onTogglePlay}
          aria-pressed={playing}
          className={`order-1 btn-control px-3 py-1 rounded text-xs font-medium w-24 ${playing ? "active" : ""}`}
        >
          {playing ? f.pause : f.play}
        </button>
        <div className="order-2 lg:hidden flex gap-2 flex-1 justify-end" role="group" aria-label={f.panelsAria}>
          <button
            type="button"
            onClick={() => onToggleSheet("sites")}
            aria-expanded={sheet === "sites"}
            aria-controls="sites-panel"
            className={`btn-control px-3 py-1 rounded text-xs font-medium ${sheet === "sites" ? "active" : ""}`}
          >
            {f.sites}
          </button>
          <button
            type="button"
            onClick={() => onToggleSheet("cond")}
            aria-expanded={sheet === "cond"}
            aria-controls="conditions-panel"
            className={`btn-control px-3 py-1 rounded text-xs font-medium ${sheet === "cond" ? "active" : ""}`}
          >
            {f.conditions}
          </button>
          {/* En móvil estrecho el idioma va aquí (no cabe en la cabecera) */}
          <button
            type="button"
            onClick={() => setLang(lang === "es" ? "en" : "es")}
            title={t.header.langTitle}
            aria-label={t.header.langTitle}
            className="sm:hidden btn-control px-2 py-1 rounded text-xs font-mono font-semibold"
          >
            {t.header.langButton}
          </button>
        </div>
        <div className="order-3 basis-full h-0 lg:hidden" aria-hidden="true" />
        {adv && (
          <div className="order-4 flex items-center bg-obsidian rounded border border-borderline p-0.5 text-[11px] font-mono" role="group" aria-label={f.speedAria}>
            {SIM_SPEEDS.map((s) => (
              <button
                key={s.value}
                type="button"
                onClick={() => onSpeed(s.value)}
                aria-pressed={speed === s.value}
                className={`px-1.5 py-0.5 rounded border ${
                  speed === s.value ? "bg-panel text-telemetry border-slate-600" : "text-steel hover:text-telemetry border-transparent"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        )}
        <label className="order-4 flex items-center gap-1.5 text-[10px] font-mono text-steel max-lg:flex-[1_1_140px] max-lg:min-w-0">
          <span className="sr-only sm:not-sr-only">{f.utc}</span>
          <input
            type="datetime-local"
            value={toInput(value)}
            min={toInput(min)}
            max={toInput(max)}
            title={f.dateTitle}
            onChange={(e) => {
              if (!e.target.value) return;
              const iso = fromInput(e.target.value);
              if (inRange(iso)) onChange(iso);
            }}
            className="date-input max-lg:w-full max-lg:min-h-[30px] max-lg:text-xs"
          />
        </label>
        {shortcuts.map((s) => {
          const usable = inRange(s.iso);
          return (
            <button
              key={s.label}
              type="button"
              disabled={!usable}
              title={usable ? s.title : f.outOfRange}
              onClick={() => onChange(s.iso)}
              className={`order-4 btn-control px-2 py-1 rounded text-xs ${s.desktopOnly ? "hidden lg:inline-block" : ""}`}
            >
              {s.label}
            </button>
          );
        })}
        {phase && (
          <span className="order-5 hidden lg:inline text-[11px] font-mono text-sky-300" title={f.phaseTitle}>
            {adv ? f.phaseAdvanced(t.phases[phase.index], formatPercent(phase.illuminated)) : f.phaseSimple(t.phases[phase.index])}
          </span>
        )}
        {adv && (
          <button
            type="button"
            onClick={onToggleDrawer}
            aria-expanded={drawerOpen}
            aria-controls="analysis-drawer"
            className={`order-5 btn-control px-2.5 py-1 rounded text-xs font-medium lg:ml-auto ${drawerOpen ? "active" : ""}`}
          >
            {drawerOpen ? "▾" : "▴"} {f.analysis}
          </button>
        )}
      </div>
      {adv && timeline}
    </footer>
  );
}
