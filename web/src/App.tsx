/**
 * Pantalla principal con la estética de la maqueta "Selene" (mockup/), solo con datos propios.
 *
 * - Fondo: globo lunar 3D a pantalla completa (o, en Avanzado, la vista local desde la superficie).
 *   La ficha del punto flota junto al marcador con una línea guía.
 * - Cabecera: marca, coordenadas, origen de la efeméride, comparativa, modo Simple / Avanzado.
 * - Izquierda: sitios candidatos (sites.json; sin coordenadas = pendiente de verificar) y coordenadas.
 * - Centro: sitio seleccionado, vistas, alerta de enlace con la Tierra, aviso de datos.
 * - Derecha: mapa de Sol y Tierra, evolución en el día lunar (mejor ventana / noche más larga) y
 *   horizonte local.
 * - Pie: simulación, fecha UTC, atajos, fase lunar; en Avanzado, franja del ciclo y gráfica.
 *
 * Tiempo: la ventana es un día lunar desde la fecha elegida (se calcula una vez). `cursor` es el
 * instante mostrado dentro de ella; la simulación, la franja y "Mejor ventana" lo mueven.
 */
import { Suspense, lazy, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { DataStatusBanner } from "./components/common/DataStatusBanner";
import { Toast } from "./components/common/Toast";
import { CompareModal } from "./components/compare/CompareModal";
import { ElevationChart } from "./components/detail/ElevationChart";
import { BottomDrawer } from "./components/layout/BottomDrawer";
import { HudFooter } from "./components/layout/HudFooter";
import { HudHeader } from "./components/layout/HudHeader";
import type { Beacon } from "./components/map/LunarGlobe";
import type { SkyBody } from "./components/map/LocalHorizonView";
import { ConditionsPanel } from "./components/panels/ConditionsPanel";
import { SiteCard } from "./components/panels/SiteCard";
import { SitesPanel } from "./components/panels/SitesPanel";
import { formatLatLon } from "./components/sites/FreeCoordinatesForm";
import { SynodicTimeline } from "./components/timeline/SynodicTimeline";
import { useDataset, useWindowEphemeris } from "./hooks/useEphemeris";
import { useHorizonGrid } from "./hooks/useHorizonGrid";
import { useSimulation } from "./hooks/useSimulation";
import { hasCoords, useSites } from "./hooks/useSites";
import { useIsMobile } from "./hooks/useIsMobile";
import { makeScenario } from "./lib/compare";
import { conditionOf, type Condition } from "./lib/conditions";
import { formatDate, formatNumber1, formatUtc } from "./lib/format";
import { subPoint } from "./lib/geo";
import { EARTH_RADIUS_KM, SUN_RADIUS_KM, applyHorizon } from "./lib/horizon";
import { snapToGrid } from "./lib/horizonGrid";
import { computeSiteMetrics } from "./lib/metrics";
import { lunarPhase } from "./lib/phase";
import { rangeContaining, snapToCoverage } from "./lib/coverage";
import { matchesFilter, type SiteFilter } from "./lib/siteFilters";
import { parseUrlState } from "./lib/urlState";
import { computeSunEarthSeries, interpolateBody, positionsAt } from "./lib/sunEarth";
import { addLunarDays, parseUtc, toIsoUtc } from "./lib/time";
import { useAppStore, type Coords } from "./store/useAppStore";
import { useT } from "./i18n";
import type { HorizonSample, Scenario, Site } from "./types";

// three.js es pesado: el globo y la vista local se descargan aparte, después de la primera pintura.
const LunarGlobe = lazy(() => import("./components/map/LunarGlobe"));
const LocalHorizonView = lazy(() => import("./components/map/LocalHorizonView"));

const CHART_STEP_MINUTES = 20;
/** Latitud a partir de la cual se carga la rejilla LOLA del polo sur (cubre hasta 85° S). */
const POLAR_GRID_LAT = -84.5;

function clampIso(iso: string, min: string, max: string): string {
  return toIsoUtc(Math.min(Math.max(parseUtc(iso), parseUtc(min)), parseUtc(max)));
}

/** Muestra más cercana a un instante (para el radio angular del disco). */
function sampleNear(samples: HorizonSample[], iso: string): HorizonSample | null {
  if (samples.length === 0) return null;
  const t0 = parseUtc(samples[0].time);
  const t1 = parseUtc(samples[samples.length - 1].time);
  const f = t1 > t0 ? (parseUtc(iso) - t0) / (t1 - t0) : 0;
  return samples[Math.min(samples.length - 1, Math.max(0, Math.round(f * (samples.length - 1))))];
}

export default function App() {
  const ds = useDataset();
  const { sites, loaded: sitesLoaded } = useSites();
  const {
    customCoords, date, setCustomCoords, setDate,
    cursor, setCursor, playing, setPlaying, speed, setSpeed,
    mode, scene, setScene, showGrid, toggleGrid, drawerOpen, setDrawerOpen, globeView, requestGlobeView,
    addScenario, setCompareOpen, notify, sheet, toggleSheet, closeSheet,
  } = useAppStore();
  const mobile = useIsMobile();
  const t = useT();
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null);
  const [siteFilter, setSiteFilter] = useState<SiteFilter>("all");
  const adv = mode === "advanced";
  const coverage = ds.status === "ready" ? ds.coverage : null;

  // Fecha de referencia dentro de un tramo con efeméride (hay huecos entre años)
  const requested = coverage ? clampIso(date ?? toIsoUtc(Math.floor(Date.now() / 60_000) * 60_000), coverage.start, coverage.end) : null;
  const at = coverage && requested ? snapToCoverage(coverage.ranges, requested) : null;
  const range = coverage && at ? rangeContaining(coverage.ranges, at) : null;
  const windowEnd = range && at ? clampIso(addLunarDays(at, 1), at, range.end) : null;
  const truncated = at && windowEnd ? parseUtc(windowEnd) < parseUtc(addLunarDays(at, 1)) - 60_000 : false;
  const now = at && windowEnd ? clampIso(cursor ?? at, at, windowEnd) : null;

  useSimulation(at, windowEnd, range?.end ?? null);

  // Fecha elegida en un año sin efeméride: se lleva al tramo más cercano (con un día lunar completo) y se avisa
  useEffect(() => {
    if (!coverage || !date || rangeContaining(coverage.ranges, date)) return;
    const snapped = snapToCoverage(coverage.ranges, date);
    const r = rangeContaining(coverage.ranges, snapped);
    const lunarMs = parseUtc(addLunarDays(snapped, 1)) - parseUtc(snapped);
    const start = r && parseUtc(snapped) === parseUtc(r.end) ? toIsoUtc(Math.max(parseUtc(r.start), parseUtc(r.end) - lunarMs)) : snapped;
    setDate(start);
    notify(t.toasts.noEphemeris(formatUtc(start)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, coverage]);
  const { ephemeris, error: loadError } = useWindowEphemeris(ds, at, windowEnd);

  // Horizonte LOLA en el polo sur: se evalúa el nodo de la rejilla más cercano (sin interpolar)
  const { grid, loading: gridLoading } = useHorizonGrid(ds, customCoords.lat <= POLAR_GRID_LAT);
  const snap = useMemo(() => (grid ? snapToGrid(grid, customCoords.lat, customCoords.lon) : null), [grid, customCoords]);
  const evalCoords = useMemo(() => (snap ? { lat: snap.lat, lon: snap.lon } : customCoords), [snap, customCoords]);
  const profile = snap?.profile ?? null;

  const selectedSite = sites.find((s) => s.id === selectedSiteId) ?? null;
  const pointLabel = selectedSite?.name ?? (snap ? t.point.node : t.point.custom);

  // Serie de la ventana (una vez por ventana y punto)
  const windowData = useMemo(() => {
    if (!ephemeris || !at || !windowEnd) return null;
    try {
      const series = computeSunEarthSeries(ephemeris, evalCoords, { start: at, end: windowEnd, stepMinutes: CHART_STEP_MINUTES });
      return {
        series,
        sun: applyHorizon(series.sun, profile, SUN_RADIUS_KM),
        earth: applyHorizon(series.earth, profile, EARTH_RADIUS_KM),
        error: null,
      };
    } catch (e) {
      return { series: null, sun: [], earth: [], error: String(e) };
    }
  }, [ephemeris, evalCoords, profile, at, windowEnd]);

  // Métricas en el instante mostrado
  const metrics = useMemo(() => {
    if (!windowData?.series || !now) return null;
    try {
      return computeSiteMetrics({
        scenarioId: "draft",
        siteId: profile?.site_id ?? `custom-${evalCoords.lat}-${evalCoords.lon}`,
        series: windowData.series,
        profile,
        at: now,
      });
    } catch {
      return null;
    }
  }, [windowData, evalCoords, profile, now]);
  const condition: Condition | null = metrics ? conditionOf(metrics.sun.visibleNow, metrics.earth.visibleNow) : null;

  const bodies = useMemo(() => {
    if (!ephemeris || !now) return { sun: null, earth: null };
    const t = parseUtc(now);
    return { sun: interpolateBody(ephemeris, "sun", t), earth: interpolateBody(ephemeris, "earth", t) };
  }, [ephemeris, now]);
  const subSolar = useMemo(() => (bodies.sun ? subPoint(bodies.sun) : null), [bodies.sun]);
  const subEarth = useMemo(() => (bodies.earth ? subPoint(bodies.earth) : null), [bodies.earth]);
  const phase = useMemo(() => (bodies.sun && bodies.earth ? lunarPhase(bodies.sun, bodies.earth) : null), [bodies]);

  // Sitios verificados: balizas en el globo y condición actual (horizonte geométrico) en la lista
  const usableSites = useMemo(() => sites.filter(hasCoords), [sites]);
  // Balizas: sitios del filtro activo (el seleccionado ya lleva el marcador y la ficha)
  const beacons = useMemo<Beacon[]>(
    () =>
      usableSites
        .filter((s) => matchesFilter(s, siteFilter) && s.id !== selectedSiteId)
        .map((s) => ({ id: s.id, name: s.name, lat: s.lat, lon: s.lon })),
    [usableSites, siteFilter, selectedSiteId],
  );
  const siteConditions = useMemo(() => {
    const out: Record<string, Condition> = {};
    if (!ephemeris || !now) return out;
    for (const s of usableSites) {
      const p = positionsAt(ephemeris, { lat: s.lat, lon: s.lon }, now);
      if (p) out[s.id] = conditionOf(p.sun.elevation_deg > 0, p.earth.elevation_deg > 0);
    }
    return out;
  }, [ephemeris, now, usableSites]);

  // Vista local: posición y tamaño angular del Sol y la Tierra
  const sky = useMemo(() => {
    if (!metrics || !windowData || !now) return { sun: null, earth: null };
    const s = sampleNear(windowData.sun, now);
    const e = sampleNear(windowData.earth, now);
    const body = (m: typeof metrics.sun, x: HorizonSample | null): SkyBody | null =>
      x ? { az: m.azimuthNowDeg, el: m.elevationNowDeg, radiusDeg: x.angular_radius_deg } : null;
    return { sun: body(metrics.sun, s), earth: body(metrics.earth, e) };
  }, [metrics, windowData, now]);

  // La gráfica (pesada) sigue al cursor con menos prioridad
  const chartCursor = useDeferredValue(now);

  const error = ds.status === "error" ? ds.message : (loadError ?? windowData?.error ?? null);
  const synthetic = ds.status === "ready" && ds.synthetic;

  const scrub = (iso: string) => {
    setPlaying(false);
    setCursor(iso);
  };
  const pickPoint = (c: Coords) => {
    setSelectedSiteId(null);
    setCustomCoords(c);
  };
  const selectSite = (s: Site & { lat: number; lon: number }) => {
    setSelectedSiteId(s.id);
    setCustomCoords({ lat: s.lat, lon: s.lon });
    requestGlobeView("site");
    closeSheet();
  };
  // ?sitio=<id>: selecciona ese sitio cuando llega sites.json (una vez)
  const urlSiteDone = useRef(false);
  useEffect(() => {
    if (urlSiteDone.current || !sitesLoaded) return;
    urlSiteDone.current = true;
    const id = parseUrlState(window.location.search).siteId;
    const s = id ? usableSites.find((x) => x.id === id) : undefined;
    if (s) selectSite(s);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo al cargar la lista
  }, [sitesLoaded, usableSites]);

  const jumpBest = (iso: string) => {
    scrub(iso);
    notify(t.toasts.best(formatUtc(iso)));
  };

  // Comparativa: añadir el punto y la fecha actuales; cargar un escenario en el globo
  const addCurrentToCompare = () => {
    if (!at) return;
    const r = addScenario(makeScenario(evalCoords.lat, evalCoords.lon, at, pointLabel));
    const n = useAppStore.getState().scenarios.length;
    notify(
      r === "added"
        ? t.toasts.added(n)
        : r === "duplicate"
          ? t.toasts.duplicate
          : t.toasts.full,
    );
  };
  const loadScenario = (s: Scenario) => {
    setPlaying(false);
    setSelectedSiteId(null);
    setCustomCoords({ lat: s.lat, lon: s.lon });
    setDate(s.date);
    setCompareOpen(false);
    requestGlobeView("site");
  };

  // Alerta de enlace: distingue relieve, momento y "nunca en el día lunar"
  const earthAlert = (() => {
    if (!metrics || metrics.earth.visibleNow) return null;
    if (metrics.earth.visibleHours <= 0) return t.alerts.earthNever;
    if (metrics.earth.elevationNowDeg > 0) return t.alerts.earthBlocked;
    return t.alerts.earthBelow;
  })();

  // Día del aterrizaje del sitio seleccionado (si su fecha tiene precisión de día y hay efeméride)
  const landingIso = selectedSite?.date.value && selectedSite.date.precision === "day" ? `${selectedSite.date.value}T00:00:00Z` : null;
  const landing =
    landingIso && coverage && rangeContaining(coverage.ranges, landingIso)
      ? {
          dateLabel: formatDate(landingIso),
          active: at === landingIso,
          onGo: () => {
            setPlaying(false);
            setDate(landingIso);
            notify(t.toasts.landing);
          },
        }
      : null;

  const horizonLabel = snap ? t.card.horizonLola(formatNumber1(snap.distanceKm)) : t.card.horizonGeometric;
  const card = (
    <SiteCard
      title={pointLabel}
      coordsLabel={formatLatLon(evalCoords)}
      metrics={metrics}
      condition={condition}
      mode={mode}
      subSolar={subSolar}
      subEarth={subEarth}
      horizonLabel={horizonLabel}
      landing={landing}
    />
  );
  const localScene = adv && scene === "local";

  return (
    <div className="font-sans antialiased text-telemetry flex flex-col h-[100dvh] overflow-hidden selection:bg-sky-500/30 selection:text-white">
      {/* Escenario 3D a pantalla completa */}
      <div className="fixed inset-0 z-0 bg-obsidian">
        <Suspense fallback={<p className="p-6 font-mono text-xs text-steel">{t.center.loadingGlobe}</p>}>
          <LunarGlobe
            sunDir={bodies.sun}
            earthDir={bodies.earth}
            site={evalCoords}
            sunVisible={metrics?.sun.visibleNow ?? null}
            earthVisible={metrics?.earth.visibleNow ?? null}
            showGrid={adv && showGrid}
            onPick={pickPoint}
            viewRequest={globeView}
            card={localScene ? undefined : card}
            cardHidden={mobile && sheet !== null}
            onInteract={closeSheet}
            beacons={beacons}
            onBeacon={(id) => {
              const s = usableSites.find((x) => x.id === id);
              if (s) selectSite(s);
            }}
          />
        </Suspense>
        {localScene && (
          <div className="absolute inset-0 z-[1]">
            <Suspense fallback={<p className="p-6 font-mono text-xs text-steel">{t.center.loadingLocal}</p>}>
              <LocalHorizonView profile={profile} sun={sky.sun} earth={sky.earth} sunVisible={metrics?.sun.visibleNow ?? false} />
            </Suspense>
          </div>
        )}
      </div>

      <HudHeader synthetic={synthetic} coordsLabel={formatLatLon(evalCoords)} />

      {ds.status === "loading" && <p className="relative z-10 p-4 font-mono text-xs text-steel">{t.center.loadingData}</p>}

      {coverage && at && now && windowEnd && (
        <>
          <main className="relative z-10 flex-1 flex flex-col lg:flex-row gap-2 p-2 sm:px-3 pointer-events-none overflow-hidden min-h-0">
            <SitesPanel
              sites={sites}
              sitesLoaded={sitesLoaded}
              siteConditions={siteConditions}
              selectedSiteId={selectedSiteId}
              onSelectSite={selectSite}
              filter={siteFilter}
              onFilter={setSiteFilter}
              current={{ label: pointLabel, coords: evalCoords, condition }}
              coords={customCoords}
              onCoords={pickPoint}
              onAddCompare={addCurrentToCompare}
              sheetOpen={sheet === "sites"}
            />

            {/* Capas centrales */}
            <div className="flex-1 flex flex-col justify-between gap-2 min-h-0 pointer-events-none relative">
              <div className="flex flex-col gap-2">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="pointer-events-auto console-panel rounded-md px-2 lg:px-3 py-1.5 lg:py-2 flex flex-wrap items-center gap-2 lg:gap-3">
                    <div className="hidden lg:block">
                      <div className="text-[10px] font-mono uppercase tracking-wider text-steel tabular-nums">
                        {t.center.selected} · {formatUtc(now)}
                      </div>
                      <div className="text-xs sm:text-sm font-semibold text-telemetry flex flex-wrap items-center gap-2 mt-0.5">
                        <span>{pointLabel}</span>
                        <span className="text-xs font-mono text-sky-400 tabular-nums">{formatLatLon(evalCoords)}</span>
                      </div>
                      {snap && (
                        <div className="text-[11px] text-emerald-300 mt-0.5">
                          {t.center.nodeNote(grid ? grid.meta.spacing_m / 1000 : 0, formatNumber1(snap.distanceKm))}
                        </div>
                      )}
                      {!snap && gridLoading && <div className="text-[11px] text-steel mt-0.5">{t.center.loadingGrid}</div>}
                    </div>
                    <div className="flex flex-wrap gap-1" role="group" aria-label={t.center.viewAria}>
                      <button
                        type="button"
                        onClick={() => {
                          setScene("globe");
                          requestGlobeView("site");
                        }}
                        title={t.center.centerTitle}
                        className="btn-control px-2.5 py-1 rounded text-xs font-medium"
                      >
                        {t.center.center}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setScene("globe");
                          requestGlobeView("southPole");
                        }}
                        className="btn-control px-2.5 py-1 rounded text-xs font-medium"
                      >
                        {t.center.southPole}
                      </button>
                      {adv && (
                        <button
                          type="button"
                          onClick={() => setScene(localScene ? "globe" : "local")}
                          aria-pressed={localScene}
                          title={t.center.localTitle}
                          className="btn-control px-2.5 py-1 rounded text-xs font-medium"
                        >
                          {localScene ? t.center.global : t.center.local}
                        </button>
                      )}
                      {adv && !localScene && (
                        <button type="button" onClick={toggleGrid} aria-pressed={showGrid} className="btn-control px-2.5 py-1 rounded text-xs font-medium">
                          {t.center.grid}
                        </button>
                      )}
                    </div>
                  </div>

                  {earthAlert && (
                    <div role="status" className="pointer-events-auto bg-red-950/90 border border-red-500/70 text-red-100 px-2.5 lg:px-3 py-1 lg:py-1.5 rounded-md text-[11px] lg:text-xs font-medium flex items-center gap-2 shadow-lg max-w-md">
                      <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" aria-hidden="true" />
                      {earthAlert}
                    </div>
                  )}
                </div>
                <DataStatusBanner synthetic={synthetic} error={error} />
                {truncated && (
                  <p className="pointer-events-auto self-start console-panel rounded-md px-2 py-1 text-[11px] font-mono text-amber-300">
                    {t.center.truncated(formatUtc(windowEnd))}
                  </p>
                )}
                {localScene && (
                  <div className="pointer-events-auto self-start">
                    {card}
                    <p className="mt-1.5 console-panel rounded-md px-2 py-1 text-[10px] text-steel max-w-80">
                      {t.center.localNote(!!profile)}
                    </p>
                  </div>
                )}
              </div>

              <div className="flex items-end justify-center gap-2 mt-auto pt-2">
                <div className="hidden lg:flex pointer-events-auto console-panel rounded-md px-3 py-1.5 text-[11px] text-steel items-center gap-3">
                  {localScene ? (
                    <>
                      <span>{t.center.helpLocal[0]}</span>
                      <span className="text-borderline">|</span>
                      <span>{t.center.helpLocal[1]}</span>
                    </>
                  ) : (
                    <>
                      <span>{t.center.helpGlobe[0]}</span>
                      <span className="text-borderline">|</span>
                      <span>{t.center.helpGlobe[1]}</span>
                      <span className="text-borderline">|</span>
                      <span>{t.center.helpGlobe[2]}</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <ConditionsPanel
              mode={mode}
              sunDir={bodies.sun}
              earthDir={bodies.earth}
              site={evalCoords}
              onPick={pickPoint}
              sun={windowData?.sun ?? []}
              earth={windowData?.earth ?? []}
              windowStart={at}
              windowEnd={windowEnd}
              cursor={now}
              onScrub={scrub}
              onBest={jumpBest}
              metrics={metrics}
              profile={profile}
              nodeDistanceKm={snap?.distanceKm ?? null}
              sheetOpen={sheet === "cond"}
            />
          </main>

          {adv && (
            <BottomDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)}>
              {drawerOpen && windowData?.series && (
                <ElevationChart series={windowData.series} profile={profile} at={at} cursor={chartCursor} />
              )}
            </BottomDrawer>
          )}

          <HudFooter
            value={at}
            min={coverage.start}
            max={coverage.end}
            onChange={setDate}
            mode={mode}
            playing={playing}
            onTogglePlay={() => setPlaying(!playing)}
            speed={speed}
            onSpeed={setSpeed}
            drawerOpen={drawerOpen}
            onToggleDrawer={() => setDrawerOpen(!drawerOpen)}
            phase={phase}
            sheet={sheet}
            onToggleSheet={toggleSheet}
            timeline={
              windowData && windowData.sun.length > 0 ? (
                <SynodicTimeline sun={windowData.sun} earth={windowData.earth} cursor={now} onScrub={scrub} heightClass="h-10" dateLabels />
              ) : null
            }
          />
        </>
      )}

      <CompareModal ds={ds} grid={grid} onLoad={loadScenario} />
      <Toast />

      <p className="sr-only">
        {t.credit}
      </p>
    </div>
  );

}
