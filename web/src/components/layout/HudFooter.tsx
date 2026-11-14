/**
 * Pie de la consola: época UTC con atajos, simulación del ciclo, franja del día lunar y botón
 * del cajón "Análisis temporal". La fecha está limitada a la cobertura de la efeméride cargada.
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
    { label: "Hoy", iso: now },
    { label: "−1 día lunar", iso: addLunarDays(value, -1) },
    { label: "+1 día lunar", iso: addLunarDays(value, 1) },
    { label: "Fecha prevista", iso: plannedDate ?? null, title: "Elige un sitio con fecha prevista" },
  ];

  return (
    <footer className="relative z-20 console-panel border-x-0 border-b-0 px-3 sm:px-5 py-2 shrink-0">
      <div className="max-w-[1800px] mx-auto flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-2.5">
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <div className="flex items-center gap-1.5 bg-obsidian border border-borderline rounded px-2 py-1 focus-within:border-sky-400">
            <label htmlFor="when" className="text-[10px] font-mono text-steel">
              ÉPOCA UTC
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
              className="bg-transparent text-xs font-mono font-medium text-telemetry tabular-nums outline-none"
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
                className="btn-control px-2 py-1 rounded text-xs"
              >
                {s.label}
              </button>
            );
          })}

          <button
            type="button"
            onClick={onTogglePlay}
            aria-pressed={playing}
            className={`btn-control px-2.5 py-1 rounded text-xs font-medium flex items-center gap-1.5 ${
              playing ? "!text-amber-400 !border-amber-500/40" : "!text-emerald-400 !border-emerald-500/40"
            }`}
          >
            <span aria-hidden="true">{playing ? "⏸" : "▶"}</span>
            {playing ? "Pausar" : "Simular ciclo"}
          </button>
          <div className="flex items-center bg-obsidian rounded border border-borderline p-0.5 text-[11px] font-mono" role="group" aria-label="Velocidad de simulación">
            {SIM_SPEEDS.map((s) => (
              <button
                key={s.value}
                type="button"
                onClick={() => onSpeed(s.value)}
                aria-pressed={speed === s.value}
                className={`px-1.5 py-0.5 rounded ${
                  speed === s.value ? "bg-panel text-telemetry border border-slate-600" : "text-steel hover:text-telemetry border border-transparent"
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
          className="btn-control px-2.5 py-1 rounded text-xs font-medium shrink-0 self-start xl:self-auto"
        >
          {drawerOpen ? "▾" : "▴"} Análisis temporal
        </button>
      </div>
    </footer>
  );
}
