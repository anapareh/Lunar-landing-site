/**
 * Panel izquierdo (maqueta "Selene"): sitios candidatos y coordenadas personalizadas.
 * - El punto evaluado aparece arriba con su condición actual (Sol / Tierra).
 * - Sitios de sites.json: con coordenadas verificadas se pueden seleccionar; sin ellas se muestran
 *   como "pendiente de verificar" (nunca se inventan coordenadas).
 */
import type { Site } from "../../types";
import type { Coords } from "../../store/useAppStore";
import { CONDITION_COLOR, CONDITION_LABEL, type Condition } from "../../lib/conditions";
import { FreeCoordinatesForm, formatLatLon } from "../sites/FreeCoordinatesForm";

export interface SitesPanelProps {
  sites: Site[];
  sitesLoaded: boolean;
  /** Condición actual (horizonte geométrico) de los sitios con coordenadas. */
  siteConditions: Record<string, Condition>;
  selectedSiteId: string | null;
  onSelectSite: (s: Site & { lat: number; lon: number }) => void;
  current: { label: string; coords: Coords; condition: Condition | null };
  coords: Coords;
  onCoords: (c: Coords) => void;
  onAddCompare: () => void;
  /** Móvil: el panel se muestra como hoja inferior solo si está abierto. */
  sheetOpen: boolean;
}

const Dot = ({ c }: { c: Condition | null }) => (
  <span
    className="w-2.5 h-2.5 rounded-full shrink-0 border border-white/15"
    style={{ background: c ? CONDITION_COLOR[c] : "#7d8ba1" }}
    title={c ? CONDITION_LABEL[c] : undefined}
    aria-hidden="true"
  />
);

export function SitesPanel(props: SitesPanelProps) {
  const { sites, sitesLoaded, siteConditions, selectedSiteId, onSelectSite, current, coords, onCoords, onAddCompare, sheetOpen } = props;
  const usable = sites.filter((s): s is Site & { lat: number; lon: number } => s.lat !== null && s.lon !== null);
  const pending = sites.filter((s) => s.lat === null || s.lon === null);

  return (
    <aside
      id="sites-panel"
      aria-label="Sitios candidatos"
      className={`pointer-events-auto console-panel rounded-md w-full lg:w-64 flex flex-col lg:max-h-full shrink-0 max-lg:fixed max-lg:inset-x-2 max-lg:w-auto max-lg:z-40 max-lg:bottom-[calc(var(--foot-h,110px)+16px)] max-lg:max-h-[50vh] ${sheetOpen ? "" : "max-lg:hidden"}`}
    >
      <div className="px-3 py-2 border-b border-borderline bg-panel/60">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-telemetry">Sitios candidatos</h2>
        <p className="text-[10px] text-steel">Clic para evaluar y centrar · o clic en el globo / mapa</p>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1.5 min-h-0">
        {/* Punto evaluado */}
        {!selectedSiteId && (
          <div className="site-row sel rounded px-2 py-1.5 flex items-center gap-2" aria-current="true">
            <Dot c={current.condition} />
            <div className="min-w-0 flex-1">
              <div className="text-[11px] font-semibold text-telemetry truncate">{current.label}</div>
              <div className="text-[9px] font-mono text-steel truncate tabular-nums">{formatLatLon(current.coords)}</div>
            </div>
            {current.condition && <span className="text-[9px] font-mono text-slate-300 text-right leading-tight">{CONDITION_LABEL[current.condition]}</span>}
          </div>
        )}

        {usable.map((s) => {
          const c = siteConditions[s.id] ?? null;
          const sel = s.id === selectedSiteId;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => onSelectSite(s)}
              aria-current={sel || undefined}
              className={`site-row w-full text-left rounded px-2 py-1.5 flex items-center gap-2 ${sel ? "sel" : ""}`}
            >
              <Dot c={c} />
              <div className="min-w-0 flex-1">
                <div className="text-[11px] font-semibold text-telemetry truncate">{s.name}</div>
                <div className="text-[9px] font-mono text-steel truncate">{[s.mission, s.agency].filter(Boolean).join(" · ") || formatLatLon(s)}</div>
              </div>
              {c && <span className="text-[9px] font-mono text-slate-300">{CONDITION_LABEL[c]}</span>}
            </button>
          );
        })}

        {pending.length > 0 && (
          <div className="pt-1">
            <div className="text-[9px] font-mono text-steel uppercase tracking-wider px-1 mb-1">Pendientes de verificar</div>
            {pending.map((s) => (
              <div key={s.id} className="rounded px-2 py-1.5 mb-1 flex items-center gap-2 border border-dashed border-borderline opacity-70" title={s.notes ?? undefined}>
                <span className="w-2.5 h-2.5 rounded-full shrink-0 border border-steel" aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <div className="text-[11px] font-semibold text-slate-300 truncate">{s.name}</div>
                  <div className="text-[9px] font-mono text-steel truncate">
                    {[s.mission, s.agency].filter(Boolean).join(" · ")} · sin coordenadas
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {sitesLoaded && sites.length === 0 && <p className="text-[11px] text-steel px-1">Aún no hay lista de sitios.</p>}
        {usable.length === 0 && sitesLoaded && (
          <p className="text-[10px] text-steel px-1 leading-snug">
            Las coordenadas de los sitios se están verificando en Quickmap; mientras, elige un punto en el globo o en el mapa.
          </p>
        )}
      </div>

      <FreeCoordinatesForm value={coords} onChange={onCoords} onAddCompare={onAddCompare} />
    </aside>
  );
}
