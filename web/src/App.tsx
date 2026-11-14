/**
 * Pantalla principal con estética HUD (referencia: web/estetica.html).
 *
 * - Fondo: globo lunar holográfico a pantalla completa, con el Sol y la Tierra en su dirección.
 * - Cabecera: marca, modo TÉCNICO/DIVULGATIVO, ocultar paneles.
 * - Izquierda: objetivo (coordenadas libres; sitios curados más adelante).
 * - Centro: objetivo activo, vistas, alerta de enlace con la Tierra, aviso de datos, radar 2D.
 * - Derecha: análisis de energía y comunicación (solo métricas reales de lib/metrics.ts).
 * - Pie: fecha UTC, simulación, franja del día lunar; cajón ANÁLISIS TEMPORAL con la gráfica.
 *
 * Tiempo: la ventana es un día lunar desde la fecha elegida (se calcula una vez). `cursor` es el
 * instante mostrado dentro de ella; la simulación y la franja lo mueven.
 */
import { Suspense, lazy, useDeferredValue, useMemo } from "react";
import { DataStatusBanner } from "./components/common/DataStatusBanner";
import { ElevationChart } from "./components/detail/ElevationChart";
import { BottomDrawer } from "./components/layout/BottomDrawer";
import { HudFooter } from "./components/layout/HudFooter";
import { HudHeader } from "./components/layout/HudHeader";
import type { GlobeView } from "./components/map/LunarGlobe";
import { RadarTerminator } from "./components/map/RadarTerminator";
import { AnalysisPanel } from "./components/panels/AnalysisPanel";
import { TargetPanel } from "./components/panels/TargetPanel";
import { formatLatLon } from "./components/sites/FreeCoordinatesForm";
import { SynodicTimeline } from "./components/timeline/SynodicTimeline";
import { useDataset, useWindowEphemeris } from "./hooks/useEphemeris";
import { useSimulation } from "./hooks/useSimulation";
import { formatUtc } from "./lib/format";
import { EARTH_RADIUS_KM, SUN_RADIUS_KM, applyHorizon } from "./lib/horizon";
import { computeSiteMetrics } from "./lib/metrics";
import { computeSunEarthSeries, interpolateBody } from "./lib/sunEarth";
import { subPoint } from "./lib/geo";
import { addLunarDays, parseUtc, toIsoUtc } from "./lib/time";
import { useAppStore } from "./store/useAppStore";

// three.js es pesado: el globo se descarga aparte, después de la primera pintura.
const LunarGlobe = lazy(() => import("./components/map/LunarGlobe"));

const CHART_STEP_MINUTES = 20;

const VIEWS: [GlobeView, string][] = [
  ["site", "Centrar"],
  ["southPole", "Polo sur"],
  ["nearside", "Cara visible"],
];

function clampIso(iso: string, min: string, max: string): string {
  return toIsoUtc(Math.min(Math.max(parseUtc(iso), parseUtc(min)), parseUtc(max)));
}

export default function App() {
  const ds = useDataset();
  const {
    customCoords, date, setCustomCoords, setDate,
    cursor, setCursor, playing, setPlaying, speed, setSpeed,
    mode, hudCollapsed, showGrid, drawerOpen, setDrawerOpen, globeView, requestGlobeView,
  } = useAppStore();
  const coverage = ds.status === "ready" ? ds.coverage : null;

  const at = coverage ? clampIso(date ?? toIsoUtc(Math.floor(Date.now() / 60_000) * 60_000), coverage.start, coverage.end) : null;
  const windowEnd = coverage && at ? clampIso(addLunarDays(at, 1), at, coverage.end) : null;
  const truncated = coverage && at && windowEnd ? parseUtc(windowEnd) < parseUtc(addLunarDays(at, 1)) - 60_000 : false;
  const now = at && windowEnd ? clampIso(cursor ?? at, at, windowEnd) : null;

  useSimulation(at, windowEnd, coverage?.end ?? null);
  const { ephemeris, error: loadError } = useWindowEphemeris(ds, at, windowEnd);

  // Serie de la ventana (una vez por ventana y punto)
  const windowData = useMemo(() => {
    if (!ephemeris || !at || !windowEnd) return null;
    try {
      const series = computeSunEarthSeries(ephemeris, customCoords, { start: at, end: windowEnd, stepMinutes: CHART_STEP_MINUTES });
      return {
        series,
        sun: applyHorizon(series.sun, null, SUN_RADIUS_KM),
        earth: applyHorizon(series.earth, null, EARTH_RADIUS_KM),
        error: null,
      };
    } catch (e) {
      return { series: null, sun: [], earth: [], error: String(e) };
    }
  }, [ephemeris, customCoords, at, windowEnd]);

  // Métricas en el instante mostrado
  const metrics = useMemo(() => {
    if (!windowData?.series || !now) return null;
    try {
      return computeSiteMetrics({
        scenarioId: "draft",
        siteId: `custom-${customCoords.lat}-${customCoords.lon}`,
        series: windowData.series,
        profile: null,
        at: now,
      });
    } catch {
      return null;
    }
  }, [windowData, customCoords, now]);

  const bodies = useMemo(() => {
    if (!ephemeris || !now) return { sun: null, earth: null };
    const t = parseUtc(now);
    return { sun: interpolateBody(ephemeris, "sun", t), earth: interpolateBody(ephemeris, "earth", t) };
  }, [ephemeris, now]);

  // Libración: punto de la Luna bajo la Tierra
  const subEarth = useMemo(() => (bodies.earth ? subPoint(bodies.earth) : null), [bodies.earth]);

  // La gráfica (pesada) sigue al cursor con menos prioridad
  const chartCursor = useDeferredValue(now);

  const error = ds.status === "error" ? ds.message : (loadError ?? windowData?.error ?? null);
  const synthetic = ds.status === "ready" && ds.synthetic;

  const scrub = (iso: string) => {
    setPlaying(false);
    setCursor(iso);
  };

  return (
    <div className="font-sans antialiased text-telemetry flex flex-col min-h-screen lg:h-screen lg:overflow-hidden selection:bg-sky-500/30 selection:text-white">
      {/* Escenario 3D a pantalla completa */}
      <div className="fixed inset-0 z-0 bg-obsidian">
        <Suspense fallback={<p className="p-6 font-mono text-xs text-steel">Cargando globo 3D…</p>}>
          <LunarGlobe
            sunDir={bodies.sun}
            earthDir={bodies.earth}
            site={customCoords}
            sunVisible={metrics?.sun.visibleNow ?? null}
            earthVisible={metrics?.earth.visibleNow ?? null}
            showGrid={showGrid}
            onPick={setCustomCoords}
            viewRequest={globeView}
          />
        </Suspense>
      </div>

      <HudHeader synthetic={synthetic} />

      {ds.status === "loading" && <p className="relative z-10 p-4 font-mono text-xs text-steel">Cargando datos…</p>}

      {coverage && at && now && (
        <>
          <main className="relative z-10 flex-1 flex flex-col lg:flex-row justify-between p-2.5 sm:p-3.5 gap-3 pointer-events-none overflow-y-auto lg:overflow-hidden min-h-0">
            <TargetPanel coords={customCoords} onCoords={setCustomCoords} hidden={hudCollapsed} />

            {/* Capas centrales */}
            <div className="order-first lg:order-none flex-1 flex flex-col justify-between gap-2 min-h-[55vh] lg:min-h-0 pointer-events-none">
              <div className="flex flex-col gap-2">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="pointer-events-auto console-panel rounded-md px-3 py-2 flex flex-wrap items-center gap-3">
                    <div>
                      <div className="text-[10px] font-mono uppercase tracking-wider text-steel tabular-nums">
                        Objetivo seleccionado · {formatUtc(now)}
                      </div>
                      <div className="text-xs sm:text-sm font-semibold text-telemetry flex flex-wrap items-center gap-2 mt-0.5">
                        <span>Coordenadas libres</span>
                        <span className="text-xs font-mono text-sky-400 tabular-nums">{formatLatLon(customCoords)}</span>
                      </div>
                    </div>
                    <div className="flex gap-1" role="group" aria-label="Vista del globo">
                      {VIEWS.map(([v, label]) => (
                        <button key={v} type="button" onClick={() => requestGlobeView(v)} className="btn-control px-2.5 py-1 rounded text-xs font-medium">
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {metrics && !metrics.earth.visibleNow && (
                    <div role="status" className="pointer-events-auto bg-red-950/90 border border-red-500/70 text-red-100 px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-2 shadow-lg">
                      <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" aria-hidden="true" />
                      Tierra bajo el horizonte local — sin enlace directo (DTE) en este instante
                    </div>
                  )}
                </div>
                <DataStatusBanner synthetic={synthetic} error={error} />
                {truncated && windowEnd && (
                  <p className="pointer-events-auto self-start console-panel rounded-md px-2 py-1 text-[11px] font-mono text-amber-300">
                    Ventana recortada: los datos cargados terminan el {formatUtc(windowEnd)}.
                  </p>
                )}
              </div>

              <div className="flex flex-wrap items-end justify-between gap-2">
                <RadarTerminator sunDir={bodies.sun} earthDir={bodies.earth} site={customCoords} onPick={setCustomCoords} />
                <div className="hidden sm:flex pointer-events-auto console-panel rounded-md px-3 py-1.5 text-[11px] text-steel items-center gap-3">
                  <span>Arrastrar: rotar</span>
                  <span className="text-borderline">|</span>
                  <span>Rueda: zoom</span>
                  <span className="text-borderline">|</span>
                  <span>Clic en la esfera: fijar punto</span>
                </div>
              </div>
            </div>

            <AnalysisPanel metrics={metrics} mode={mode} subEarth={subEarth} hidden={hudCollapsed} />
          </main>

          <BottomDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)}>
            {drawerOpen && windowData?.series && (
              <ElevationChart series={windowData.series} profile={null} at={at} cursor={chartCursor} />
            )}
          </BottomDrawer>

          <HudFooter
            value={at}
            min={coverage.start}
            max={coverage.end}
            plannedDate={null}
            onChange={setDate}
            playing={playing}
            onTogglePlay={() => setPlaying(!playing)}
            speed={speed}
            onSpeed={setSpeed}
            drawerOpen={drawerOpen}
            onToggleDrawer={() => setDrawerOpen(!drawerOpen)}
            timeline={
              windowData && windowData.sun.length > 0 ? (
                <SynodicTimeline sun={windowData.sun} earth={windowData.earth} cursor={now} onScrub={scrub} />
              ) : null
            }
          />
        </>
      )}

      <p className="sr-only">
        Textura del globo y del radar: NASA's Scientific Visualization Studio (mosaico LROC WAC de ASU), solo como referencia visual.
      </p>
    </div>
  );
}
