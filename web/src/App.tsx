/**
 * Layout principal con 3 zonas vacías.
 *
 * Futuro:
 * - Zona "selector": <SiteSelector /> + <DatePicker />
 * - Zona "comparación": <ComparisonTable /> + <ElevationChart />
 * - Zona "detalle": <HorizonView /> + <SiteMap /> del sitio activo
 * Los datos se cargarán desde /data/*.json (ver docs/data-contract.md).
 */
export default function App() {
  return (
    <div className="app">
      <header className="app-header">
        <h1>Lunar Landing Site Navigator</h1>
      </header>
      <main className="app-layout">
        <section className="zone zone-selector" aria-label="Selector de sitios y fechas">
          {/* TODO: SiteSelector, DatePicker */}
        </section>
        <section className="zone zone-comparison" aria-label="Comparación">
          {/* TODO: ComparisonTable, ElevationChart */}
        </section>
        <section className="zone zone-detail" aria-label="Detalle">
          {/* TODO: HorizonView, SiteMap */}
        </section>
      </main>
    </div>
  );
}
