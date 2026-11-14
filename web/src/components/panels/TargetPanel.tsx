/**
 * Panel izquierdo: objetivo (coordenadas libres) y, más adelante, la lista de sitios curados.
 */
import type { Coords } from "../../store/useAppStore";
import { FreeCoordinatesForm } from "../sites/FreeCoordinatesForm";

export interface TargetPanelProps {
  coords: Coords;
  onCoords: (c: Coords) => void;
  hidden?: boolean;
}

export function TargetPanel({ coords, onCoords, hidden }: TargetPanelProps) {
  return (
    <aside
      aria-label="Objetivo"
      className={`pointer-events-auto w-full lg:w-80 xl:w-[340px] hud-box hud-corners rounded-lg flex flex-col max-h-[420px] lg:max-h-full transition-all duration-300 shrink-0 ${
        hidden ? "lg:opacity-0 lg:pointer-events-none lg:-translate-x-8" : ""
      }`}
    >
      <div className="px-3 py-2 border-b border-cyan-500/25 flex items-center justify-between bg-cyan-950/20">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" aria-hidden="true" />
          <h2 className="font-display text-xs font-bold tracking-wider text-cyan-300">OBJETIVOS LUNARES</h2>
        </div>
        <span className="text-[10px] font-mono text-cyan-400/70">CLIC EN EL GLOBO</span>
      </div>

      <FreeCoordinatesForm value={coords} onChange={onCoords} />

      <div className="flex-1 overflow-y-auto p-2.5">
        <div className="text-[10px] font-mono font-bold text-cyan-400/80 tracking-widest mb-1 px-1">SITIOS CURADOS</div>
        <p className="px-1 text-xs text-slate-400 leading-snug">
          Próximamente: Apollo, CLPS, misiones comerciales y de otras agencias, con su horizonte LOLA. Solo se
          mostrarán con coordenadas verificadas.
        </p>
      </div>
    </aside>
  );
}
