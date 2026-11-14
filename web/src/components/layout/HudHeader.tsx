/**
 * Cabecera del HUD: marca, conmutador TÉCNICO / DIVULGATIVO y botón para ocultar los paneles.
 */
import { useAppStore } from "../../store/useAppStore";

export function HudHeader() {
  const { mode, setMode, hudCollapsed, toggleHud } = useAppStore();
  const modeBtn = (m: "tech" | "edu", label: string, active: string) => (
    <button
      type="button"
      onClick={() => setMode(m)}
      aria-pressed={mode === m}
      className={`px-2 py-1 rounded font-semibold transition-all ${
        mode === m ? active : "text-slate-400 hover:text-white border border-transparent"
      }`}
    >
      {label}
    </button>
  );

  return (
    <header className="relative z-20 hud-box border-x-0 border-t-0 px-3 sm:px-5 py-2 flex flex-wrap items-center justify-between gap-2 shrink-0">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded bg-cyan-500/10 border border-cyan-400/60 flex items-center justify-center text-cyan-300 shadow-[0_0_15px_rgba(0,240,255,0.3)]">
          <svg className="w-5 h-5 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="12" r="9" strokeWidth="1.5" strokeDasharray="4 2" />
            <circle cx="12" cy="12" r="4" strokeWidth="1.8" />
            <path strokeLinecap="round" strokeWidth="1.5" d="M12 1v3M12 20v3M1 12h3M20 12h3" />
          </svg>
        </div>
        <div>
          <h1 className="font-display text-sm sm:text-base font-extrabold tracking-widest text-white glow-cyan">
            LUNAR<span className="text-cyan-400">//</span>NAVIGATOR
          </h1>
          <p className="text-[11px] font-mono text-cyan-200/60 hidden sm:block">
            LANDING SITE NAVIGATOR · SOL Y TIERRA SOBRE EL HORIZONTE LUNAR
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="bg-void/90 p-1 rounded border border-slate-700/80 flex items-center text-xs font-mono" role="group" aria-label="Nivel de detalle">
          {modeBtn("tech", "TÉCNICO", "bg-cyan-500/20 text-cyan-300 border border-cyan-400/50")}
          {modeBtn("edu", "DIVULGATIVO", "bg-emerald-500/20 text-emerald-300 border border-emerald-400/50")}
        </div>
        <button
          type="button"
          onClick={toggleHud}
          aria-pressed={hudCollapsed}
          title={hudCollapsed ? "Mostrar paneles laterales" : "Ocultar paneles laterales"}
          className="hidden lg:flex px-2 py-1.5 rounded btn-sci text-xs font-mono items-center gap-1"
        >
          <span aria-hidden="true">◫</span>
          <span className="sr-only">{hudCollapsed ? "Mostrar paneles" : "Ocultar paneles"}</span>
        </button>
      </div>
    </header>
  );
}
