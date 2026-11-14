/**
 * Panel izquierdo: sitios de alunizaje (coordenadas libres; lista curada más adelante).
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
      aria-label="Sitios de alunizaje"
      className={`pointer-events-auto w-full lg:w-80 xl:w-[336px] console-panel rounded-md flex flex-col max-h-[420px] lg:max-h-full transition-all duration-200 shrink-0 ${
        hidden ? "lg:opacity-0 lg:pointer-events-none lg:-translate-x-6" : ""
      }`}
    >
      <div className="px-3 py-2 border-b border-borderline flex items-center justify-between bg-panel/60">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-telemetry">Sitios de alunizaje</h2>
        <span className="text-[10px] font-mono text-steel">Clic en el globo o el radar</span>
      </div>

      <FreeCoordinatesForm value={coords} onChange={onCoords} />

      <div className="flex-1 overflow-y-auto p-2.5">
        <div className="text-[10px] font-mono font-semibold text-steel uppercase tracking-wider mb-1.5 px-1">Sitios curados</div>
        <p className="px-1 text-xs text-slate-400 leading-relaxed">
          Próximamente: Apollo, CLPS, misiones comerciales y de otras agencias, con su horizonte LOLA. Solo se mostrarán con
          coordenadas verificadas.
        </p>
      </div>
    </aside>
  );
}
