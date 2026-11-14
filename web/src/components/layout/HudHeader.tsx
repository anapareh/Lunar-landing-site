/**
 * Cabecera de la consola: identidad, origen de los datos, vista del globo, retícula,
 * modo Ingeniería / Divulgativo y botón para ocultar los paneles.
 */
import { useAppStore } from "../../store/useAppStore";

export interface HudHeaderProps {
  /** true si se está usando la efeméride sintética de desarrollo. */
  synthetic: boolean;
}

export function HudHeader({ synthetic }: HudHeaderProps) {
  const { mode, setMode, hudCollapsed, toggleHud, showGrid, toggleGrid } = useAppStore();
  const modeBtn = (m: "tech" | "edu", label: string) => (
    <button
      type="button"
      onClick={() => setMode(m)}
      aria-pressed={mode === m}
      className={`px-2.5 py-1 rounded transition-colors ${
        mode === m ? "bg-panel text-telemetry border border-slate-600" : "text-steel hover:text-telemetry border border-transparent"
      }`}
    >
      {label}
    </button>
  );

  return (
    <header className="relative z-20 console-panel border-x-0 border-t-0 px-3 sm:px-5 py-2 flex flex-wrap items-center justify-between gap-2 shrink-0">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded bg-panel border border-borderline flex items-center justify-center text-sky-400">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="12" r="8" strokeWidth="1.75" />
            <ellipse cx="12" cy="12" rx="11" ry="4" transform="rotate(-22 12 12)" strokeWidth="1.25" strokeDasharray="3 2" />
            <circle cx="12" cy="12" r="1.5" fill="currentColor" />
          </svg>
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-sm font-semibold tracking-tight text-telemetry">LUNAR-FDS</h1>
            <span
              className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                synthetic ? "bg-amber-950/40 text-amber-300 border-amber-500/40" : "bg-panel text-steel border-borderline"
              }`}
              title={synthetic ? "Modelo simplificado de desarrollo: no son posiciones reales" : "Efeméride calculada con SPICE"}
            >
              {synthetic ? "EFEMÉRIDE SINTÉTICA" : "EFEMÉRIDE SPICE"}
            </span>
          </div>
          <p className="text-[11px] text-steel hidden sm:block">
            Evaluación de sitios de alunizaje: iluminación solar y enlace directo con la Tierra (DTE)
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="flex items-center bg-obsidian p-0.5 rounded border border-borderline text-xs font-medium" role="group" aria-label="Vista">
          <button type="button" aria-pressed="true" className="btn-control px-2.5 py-1 rounded">
            Globo lunar 3D
          </button>
          <button
            type="button"
            disabled
            title="Próximamente: horizonte real con perfiles de relieve LOLA"
            className="btn-control px-2.5 py-1 rounded ml-0.5"
          >
            Horizonte local
          </button>
        </div>
        <button
          type="button"
          onClick={toggleGrid}
          aria-pressed={showGrid}
          title="Mostrar u ocultar la retícula selenográfica"
          className="btn-control px-2.5 py-1 rounded text-xs font-mono hidden sm:inline-flex items-center gap-1"
        >
          # GRID
        </button>
      </div>

      <div className="flex items-center gap-2">
        <div className="bg-obsidian p-0.5 rounded border border-borderline flex items-center text-xs font-medium" role="group" aria-label="Nivel de detalle">
          {modeBtn("tech", "Ingeniería")}
          {modeBtn("edu", "Divulgativo")}
        </div>
        <button
          type="button"
          onClick={toggleHud}
          aria-pressed={hudCollapsed}
          title={hudCollapsed ? "Mostrar paneles laterales" : "Ocultar paneles laterales"}
          className="hidden lg:flex btn-control px-2 py-1.5 rounded text-xs font-mono items-center"
        >
          <span aria-hidden="true">◫</span>
          <span className="sr-only">{hudCollapsed ? "Mostrar paneles" : "Ocultar paneles"}</span>
        </button>
      </div>
    </header>
  );
}
