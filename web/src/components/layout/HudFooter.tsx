/**
 * Pie del HUD: fecha de referencia (UTC) con atajos, simulación del paso del tiempo,
 * franja del ciclo del día lunar y botón del cajón ANÁLISIS TEMPORAL.
 * La fecha está limitada a la cobertura de la efeméride cargada.
 */
import type { ReactNode } from "react";
import { addLunarDays, parseUtc, toIsoUtc } from "../../lib/time";
import { SIM_SPEEDS } from "../../store/useAppStore";

export interface HudFooterProps {
  /** ISO UTC. */
  value: string;
  min: string;
  max: string;
  plannedDate?: string | null;
  onChange: (iso: string) => void;
  playing: boolean;
  onTogglePlay: () => void;
  speed: number;
  onSpeed: (s: number) => void;
  drawerOpen: boolean;
  onToggleDrawer: () => void;
  /** Franja del ciclo (SynodicTimeline). */
  timeline?: ReactNode;
}

const toInput = (iso: string) => iso.slice(0, 16); // "YYYY-MM-DDTHH:MM"
const fromInput = (v: string) => `${v}:00Z`;

export function HudFooter(props: HudFooterProps) {
  const { value, min, max, plannedDate, onChange, playing, onTogglePlay, speed, onSpeed, drawerOpen, onToggleDrawer, timeline } = props;
  const inRange = (iso: string) => parseUtc(iso) >= parseUtc(min) && parseUtc(iso) <= parseUtc(max);
  const now = toIsoUtc(Math.floor(Date.now() / 60_000) * 60_000);
  const shortcuts: { label: string; iso: string | null; title?: string }[] = [
    { label: "HOY", iso: now },
    { label: "−1 DÍA LUNAR", iso: addLunarDays(value, -1) },
    { label: "+1 DÍA LUNAR", iso: addLunarDays(value, 1) },
    { label: "FECHA PREVISTA", iso: plannedDate ?? null, title: "Elige un sitio con fecha prevista" },
  ];

  return (
    <footer className="relative z-20 hud-box border-x-0 border-b-0 px-3 sm:px-5 py-2 shrink-0">
      <div className="max-w-[1800px] mx-auto flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-2.5">
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <div className="flex items-center gap-1.5 bg-void/90 border border-cyan-500/35 rounded px-2 py-1">
            <label htmlFor="when" className="text-[10px] font-mono text-cyan-400">
              UTC:
            </label>
            <input
              id="when"
              type="datetime-local"
              value={toInput(value)}
              min={toInput(min)}
              max={toInput(max)}
              onChange={(e) => {
                if (!e.target.value) return;
                const iso = fromInput(e.target.value);
                if (inRange(iso)) onChange(iso);
              }}
              className="bg-transparent text-xs font-mono font-semibold text-white outline-none"
            />
          </div>
          {shortcuts.map((s) => {
            const usable = s.iso !== null && inRange(s.iso);
            return (
              <button
                key={s.label}
                type="button"
                disabled={!usable}
                title={s.iso === null ? s.title : usable ? undefined : "Fuera del rango de datos"}
                onClick={() => s.iso && onChange(s.iso)}
                className="btn-sci px-2 py-1 rounded text-[11px] font-mono"
              >
                {s.label}
              </button>
            );
          })}

          <button
            type="button"
            onClick={onTogglePlay}
            aria-pressed={playing}
            className={`px-2.5 py-1 rounded text-xs font-mono font-bold flex items-center gap-1.5 transition-all border ${
              playing
                ? "bg-amber-500/20 hover:bg-amber-500/30 border-amber-400/60 text-amber-300"
                : "bg-emerald-500/15 hover:bg-emerald-500/25 border-emerald-400/60 text-emerald-300 shadow-[0_0_12px_rgba(0,255,157,0.2)]"
            }`}
          >
            <span aria-hidden="true">{playing ? "⏸" : "▶"}</span>
            {playing ? "PAUSAR" : "SIMULAR ÓRBITA"}
          </button>
          <div className="flex items-center bg-void/90 rounded border border-slate-700 p-0.5 text-[10px] font-mono" role="group" aria-label="Velocidad de simulación">
            {SIM_SPEEDS.map((s) => (
              <button
                key={s.value}
                type="button"
                onClick={() => onSpeed(s.value)}
                aria-pressed={speed === s.value}
                className={`px-1.5 py-0.5 rounded ${
                  speed === s.value ? "bg-cyan-500/25 text-cyan-200 border border-cyan-400/50" : "text-slate-400 hover:text-white border border-transparent"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {timeline}

        <button
          type="button"
          onClick={onToggleDrawer}
          aria-expanded={drawerOpen}
          aria-controls="analysis-drawer"
          aria-pressed={drawerOpen}
          className="btn-sci px-2.5 py-1 rounded text-xs font-mono font-semibold shrink-0 self-start xl:self-auto"
        >
          {drawerOpen ? "▾" : "▴"} ANÁLISIS TEMPORAL
        </button>
      </div>
    </footer>
  );
}
