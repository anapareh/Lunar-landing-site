/**
 * Cabecera (maqueta "Selene"): identidad, coordenadas activas, origen de la efeméride,
 * comparativa y modo Simple / Avanzado.
 */
import { useAppStore, type AppMode } from "../../store/useAppStore";

export interface HudHeaderProps {
  /** true si se está usando la efeméride sintética de desarrollo. */
  synthetic: boolean;
  /** Coordenadas del punto evaluado, ya formateadas. */
  coordsLabel?: string;
}

export function HudHeader({ synthetic, coordsLabel }: HudHeaderProps) {
  const { mode, setMode, scenarios, setCompareOpen } = useAppStore();
  const modeBtn = (m: AppMode, label: string) => (
    <button
      type="button"
      onClick={() => setMode(m)}
      aria-pressed={mode === m}
      className={`px-2 sm:px-3 py-1 rounded border transition-all ${
        mode === m ? "bg-sky-500/20 text-sky-300 border-sky-500/50" : "text-steel hover:text-telemetry border-transparent"
      }`}
    >
      {label}
    </button>
  );

  return (
    <header className="relative z-20 pointer-events-auto console-panel rounded-md mx-2 sm:mx-3 mt-2 sm:mt-3 px-2.5 sm:px-3 py-1.5 sm:py-2 flex flex-wrap items-center justify-between gap-2 shrink-0">
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-slate-200 to-slate-500 shrink-0" aria-hidden="true" />
        <div className="min-w-0">
          <h1 className="text-sm font-semibold tracking-wide text-telemetry">
            SELENE<span className="hidden sm:inline"> · Sitios de Alunizaje</span>
          </h1>
          <p className="hidden sm:block text-[10px] font-mono text-steel truncate">
            {mode === "simple"
              ? "Explorador interactivo de sitios de alunizaje"
              : "Iluminación solar, enlace directo con la Tierra (DTE) y horizonte local"}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1.5 sm:gap-2">
        {coordsLabel && <span className="hidden md:inline text-[10px] font-mono text-sky-400 tabular-nums">{coordsLabel}</span>}
        <span
          className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
            synthetic ? "bg-amber-950/40 text-amber-300 border-amber-500/40" : "hidden sm:inline bg-obsidian text-steel border-borderline"
          }`}
          title={synthetic ? "Modelo simplificado de desarrollo: no son posiciones reales" : "Efeméride calculada con SPICE (NASA/JPL)"}
        >
          <span className="hidden sm:inline">EFEMÉRIDE </span>
          {synthetic ? "SINTÉTICA" : "SPICE"}
        </span>
        <button
          type="button"
          onClick={() => setCompareOpen(true)}
          className="btn-control px-2.5 py-1 rounded text-xs font-medium flex items-center gap-1.5"
          aria-haspopup="dialog"
        >
          <span className="hidden sm:inline">Comparar</span>
          <span className="sm:hidden">Comp.</span>
          <span className="px-1.5 bg-obsidian border border-borderline rounded font-mono text-[11px] text-sky-400 tabular-nums">
            {scenarios.length}
          </span>
        </button>
        <div className="flex items-center text-xs font-medium rounded border border-borderline bg-obsidian p-0.5 gap-0.5" role="group" aria-label="Nivel de detalle">
          {modeBtn("simple", "Simple")}
          {modeBtn("advanced", "Avanzado")}
        </div>
      </div>
    </header>
  );
}
