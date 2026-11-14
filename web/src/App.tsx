/**
 * Pantalla principal (primera versión): coordenadas libres + fecha → gráfica y métricas.
 *
 * Zonas: izquierda = sitios (de momento, coordenadas libres), centro = gráfica (el mapa irá aquí),
 * derecha = fecha y resumen de métricas. Ventana de cálculo: un día lunar desde la fecha elegida,
 * recortada a la cobertura de la efeméride.
 * Futuro: lista de sitios curados con su horizonte LOLA, mapa, comparación de escenarios, detalle.
 */
import { Suspense, lazy, useMemo } from "react";
import { DataStatusBanner } from "./components/common/DataStatusBanner";
import { DateTimePicker } from "./components/config/DateTimePicker";
import { MetricsSummary } from "./components/config/MetricsSummary";
import { ElevationChart } from "./components/detail/ElevationChart";
import { FreeCoordinatesForm } from "./components/sites/FreeCoordinatesForm";
import { useDataset, useWindowEphemeris } from "./hooks/useEphemeris";
import { computeSiteMetrics } from "./lib/metrics";
import { computeSunEarthSeries, interpolateBody } from "./lib/sunEarth";
import { formatUtc } from "./lib/format";
import { addLunarDays, parseUtc, toIsoUtc } from "./lib/time";
import { useAppStore } from "./store/useAppStore";

// three.js es pesado: el globo se descarga aparte, después de la primera pintura.
const LunarGlobe = lazy(() => import("./components/map/LunarGlobe"));

const CHART_STEP_MINUTES = 20;

function clampIso(iso: string, min: string, max: string): string {
  return toIsoUtc(Math.min(Math.max(parseUtc(iso), parseUtc(min)), parseUtc(max)));
}

export default function App() {
  const ds = useDataset();
  const { customCoords, date, setCustomCoords, setDate } = useAppStore();
  const coverage = ds.status === "ready" ? ds.coverage : null;

  const at = coverage ? clampIso(date ?? toIsoUtc(Math.floor(Date.now() / 60_000) * 60_000), coverage.start, coverage.end) : null;
  const windowEnd = coverage && at ? clampIso(addLunarDays(at, 1), at, coverage.end) : null;
  const truncated = coverage && at && windowEnd ? parseUtc(windowEnd) < parseUtc(addLunarDays(at, 1)) - 60_000 : false;

  const { ephemeris, error: loadError } = useWindowEphemeris(ds, at, windowEnd);

  const result = useMemo(() => {
    if (!ephemeris || !at || !windowEnd) return null;
    try {
      const series = computeSunEarthSeries(ephemeris, customCoords, { start: at, end: windowEnd, stepMinutes: CHART_STEP_MINUTES });
      const metrics = computeSiteMetrics({
        scenarioId: "draft",
        siteId: `custom-${customCoords.lat}-${customCoords.lon}`,
        series,
        profile: null,
        at,
      });
      return { series, metrics, error: null };
    } catch (e) {
      return { series: null, metrics: null, error: String(e) };
    }
  }, [ephemeris, customCoords, at, windowEnd]);

  const bodies = useMemo(() => {
    if (!ephemeris || !at) return { sun: null, earth: null };
    const t = parseUtc(at);
    return { sun: interpolateBody(ephemeris, "sun", t), earth: interpolateBody(ephemeris, "earth", t) };
  }, [ephemeris, at]);

  const error = ds.status === "error" ? ds.message : (loadError ?? result?.error ?? null);
  const synthetic = ds.status === "ready" && ds.synthetic;

  return (
    <div className="app">
      <header className="app-header">
        <h1>Lunar Landing Site Navigator</h1>
        <p className="subtitle">Sol y Tierra sobre el horizonte lunar: energía y comunicación por sitio y fecha</p>
      </header>

      <DataStatusBanner synthetic={synthetic} error={error} />

      {ds.status === "loading" && <p className="loading">Cargando datos…</p>}

      {coverage && at && (
        <main className="app-layout">
          <section className="zone zone-selector" aria-label="Sitio">
            <FreeCoordinatesForm value={customCoords} onChange={setCustomCoords} />
            <div className="card placeholder">
              <h2 className="card-title">Sitios curados</h2>
              <p className="note">Próximamente: Apollo, CLPS, misiones comerciales y de otras agencias, con su horizonte LOLA.</p>
            </div>
          </section>

          <section className="zone zone-comparison" aria-label="Globo y gráfica">
            <Suspense fallback={<div className="card globe-card"><p className="note">Cargando el globo 3D…</p></div>}>
              <LunarGlobe sunDir={bodies.sun} earthDir={bodies.earth} site={customCoords} onPick={setCustomCoords} />
            </Suspense>
            {result?.series && <ElevationChart series={result.series} profile={null} at={at} />}
            {truncated && windowEnd && (
              <p className="note">La ventana se recorta: los datos cargados terminan el {formatUtc(windowEnd)}.</p>
            )}
          </section>

          <section className="zone zone-detail" aria-label="Fecha y métricas">
            <DateTimePicker value={at} min={coverage.start} max={coverage.end} onChange={setDate} plannedDate={null} />
            {result?.metrics && <MetricsSummary metrics={result.metrics} />}
          </section>
        </main>
      )}
    </div>
  );
}
