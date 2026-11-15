/**
 * Panel izquierdo (maqueta "Selene"): sitios candidatos y coordenadas personalizadas.
 * - El punto evaluado aparece arriba con su condición actual (Sol / Tierra).
 * - Sitios de sites.json con filtros (también filtran las balizas del globo). Las coordenadas de
 *   las misiones vienen de la tabla NSSDCA de NASA (posiciones medidas en imágenes LROC) y siguen
 *   pendientes de la doble verificación del equipo en Quickmap. Sin coordenadas = no seleccionable
 *   (p. ej. las regiones candidatas de Artemis III, cuyo centro la NASA no publica).
 */
import type { Site } from "../../types";
import type { Coords } from "../../store/useAppStore";
import { CONDITION_COLOR, type Condition } from "../../lib/conditions";
import { SITE_FILTERS, matchesFilter, siteYear, type SiteFilter } from "../../lib/siteFilters";
import { useT } from "../../i18n";
import { FreeCoordinatesForm, formatLatLon } from "../sites/FreeCoordinatesForm";

export interface SitesPanelProps {
  sites: Site[];
  sitesLoaded: boolean;
  /** Condición actual (horizonte geométrico) de los sitios con coordenadas. */
  siteConditions: Record<string, Condition>;
  selectedSiteId: string | null;
  onSelectSite: (s: Site & { lat: number; lon: number }) => void;
  filter: SiteFilter;
  onFilter: (f: SiteFilter) => void;
  current: { label: string; coords: Coords; condition: Condition | null };
  coords: Coords;
  onCoords: (c: Coords) => void;
  onAddCompare: () => void;
  /** Móvil: el panel se muestra como hoja inferior solo si está abierto. */
  sheetOpen: boolean;
}

export function SitesPanel(props: SitesPanelProps) {
  const { sites, sitesLoaded, siteConditions, selectedSiteId, onSelectSite, filter, onFilter, current, coords, onCoords, onAddCompare, sheetOpen } = props;
  const t = useT();
  const usable = sites.filter((s): s is Site & { lat: number; lon: number } => s.lat !== null && s.lon !== null);
  const shown = usable.filter((s) => matchesFilter(s, filter));
  const noCoords = sites.filter((s) => s.lat === null || s.lon === null);
  const source = usable.find((s) => s.sources.length > 0)?.sources[0];

  const Dot = ({ c }: { c: Condition | null }) => (
    <span
      className="w-2.5 h-2.5 rounded-full shrink-0 border border-white/15"
      style={{ background: c ? CONDITION_COLOR[c] : "#7d8ba1" }}
      title={c ? t.sites.dotTitle(t.conditions.label[c]) : undefined}
      aria-hidden="true"
    />
  );

  return (
    <aside
      id="sites-panel"
      aria-label={t.sites.title}
      className={`pointer-events-auto console-panel rounded-md w-full lg:w-64 flex flex-col lg:max-h-full shrink-0 max-lg:fixed max-lg:inset-x-2 max-lg:w-auto max-lg:z-40 max-lg:bottom-[calc(var(--foot-h,110px)+16px)] max-lg:max-h-[50vh] ${sheetOpen ? "" : "max-lg:hidden"}`}
    >
      <div className="px-3 py-2 border-b border-borderline bg-panel/60">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-telemetry">{t.sites.title}</h2>
        <p className="text-[10px] text-steel">{t.sites.hint}</p>
      </div>

      {usable.length > 0 && (
        <div className="px-2 pt-2 flex flex-wrap gap-1" role="group" aria-label={t.sites.filterAria}>
          {SITE_FILTERS.map((f) => {
            const n = usable.filter((s) => matchesFilter(s, f)).length;
            return (
              <button
                key={f}
                type="button"
                onClick={() => onFilter(f)}
                aria-pressed={filter === f}
                disabled={n === 0}
                className="btn-control !min-h-0 px-1.5 py-0.5 rounded text-[10px] font-mono"
              >
                {t.sites.filters[f]} <span className="text-steel">{n}</span>
              </button>
            );
          })}
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-2 space-y-1.5 min-h-0">
        {/* Punto evaluado (si no es un sitio de la lista) */}
        {!selectedSiteId && (
          <div className="site-row sel rounded px-2 py-1.5 flex items-center gap-2" aria-current="true">
            <Dot c={current.condition} />
            <div className="min-w-0 flex-1">
              <div className="text-[11px] font-semibold text-telemetry truncate">{current.label}</div>
              <div className="text-[9px] font-mono text-steel truncate tabular-nums">{formatLatLon(current.coords)}</div>
            </div>
            {current.condition && (
              <span className="text-[9px] font-mono text-slate-300 text-right leading-tight">{t.conditions.label[current.condition]}</span>
            )}
          </div>
        )}

        {shown.map((s) => {
          const c = siteConditions[s.id] ?? null;
          const sel = s.id === selectedSiteId;
          const failed = s.status === "failed";
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => onSelectSite(s)}
              aria-current={sel || undefined}
              title={s.notes ?? undefined}
              className={`site-row w-full text-left rounded px-2 py-1.5 flex items-center gap-2 ${sel ? "sel" : ""}`}
            >
              <Dot c={c} />
              <div className="min-w-0 flex-1">
                <div className="text-[11px] font-semibold text-telemetry truncate">
                  {s.name}
                  {failed && <span className="ml-1 text-[9px] font-mono text-red-300">{t.sites.failed}</span>}
                </div>
                <div className="text-[9px] font-mono text-steel truncate">
                  {[s.agency ? t.sites.agency(s.agency) : null, siteYear(s), formatLatLon(s)].filter(Boolean).join(" · ")}
                </div>
              </div>
            </button>
          );
        })}

        {source && (
          <p className="text-[9px] text-steel px-1 leading-snug">
            {t.sites.sourcePrefix}{" "}
            <a href={source.url} target="_blank" rel="noreferrer" className="text-sky-400 hover:underline">
              NASA NSSDCA
            </a>{" "}
            {t.sites.sourceSuffix}
          </p>
        )}

        {noCoords.length > 0 && (filter === "all" || filter === "south") && (
          <div className="pt-1">
            <div className="text-[9px] font-mono text-steel uppercase tracking-wider px-1 mb-1">{t.sites.noCoordsTitle}</div>
            {noCoords.map((s) => (
              <div key={s.id} className="rounded px-2 py-1.5 mb-1 flex items-center gap-2 border border-dashed border-borderline opacity-70" title={s.notes ?? undefined}>
                <span className="w-2.5 h-2.5 rounded-full shrink-0 border border-steel" aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <div className="text-[11px] font-semibold text-slate-300 truncate">{s.name}</div>
                  <div className="text-[9px] font-mono text-steel truncate">
                    {[s.mission, s.agency ? t.sites.agency(s.agency) : null].filter(Boolean).join(" · ")} · {t.sites.noCoordsSub}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {sitesLoaded && sites.length === 0 && <p className="text-[11px] text-steel px-1">{t.sites.empty}</p>}
      </div>

      <FreeCoordinatesForm value={coords} onChange={onCoords} onAddCompare={onAddCompare} />
    </aside>
  );
}
