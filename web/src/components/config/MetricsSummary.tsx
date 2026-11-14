/**
 * Resumen de métricas del escenario: la elevación solar es la cifra principal (energía);
 * después, la cuenta atrás hasta el ocaso del Sol y la visibilidad de la Tierra (comunicación).
 */
import type { BodyMetrics, SiteMetrics } from "../../types";
import { formatDeg, formatDuration, formatHours, formatPercent } from "../../lib/format";
import { HorizonLevelBadge } from "../common/HorizonLevelBadge";

function Tile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="tile">
      <span className="tile-label">{label}</span>
      <span className="tile-value">{value}</span>
      {sub && <span className="tile-sub">{sub}</span>}
    </div>
  );
}

function countdownTile(b: BodyMetrics, names: { set: string; rise: string }) {
  const hours = b.visibleNow ? b.hoursToSet : b.hoursToRise;
  return (
    <Tile
      label={b.visibleNow ? names.set : names.rise}
      value={formatDuration(hours)}
      sub={hours === null ? "No ocurre dentro de la ventana calculada" : undefined}
    />
  );
}

export function MetricsSummary({ metrics }: { metrics: SiteMetrics }) {
  const { sun, earth } = metrics;
  return (
    <section className="card metrics" aria-label="Resumen de métricas" aria-live="polite">
      <div className="card-head">
        <h2 className="card-title">Resumen</h2>
        <HorizonLevelBadge level={metrics.horizonLevel} />
      </div>

      <div className="hero">
        <span className="tile-label">Elevación solar</span>
        <span className="hero-value">{formatDeg(sun.elevationNowDeg)}</span>
        <span className="tile-sub">
          {sun.visibleNow
            ? `Sol sobre el horizonte · ${formatPercent(sun.visibleFractionNow)} del disco visible`
            : "Sol bajo el horizonte: sin generación solar"}
        </span>
      </div>

      <h3 className="group-title">
        <span className="key key-sun" aria-hidden="true" /> Energía
      </h3>
      <div className="tiles">
        {countdownTile(sun, { set: "Tiempo hasta el ocaso", rise: "Tiempo hasta el orto" })}
        <Tile label="Horas de luz en la ventana" value={formatHours(sun.visibleHours)} sub={`de ${formatHours(metrics.windowHours)}`} />
      </div>

      <h3 className="group-title">
        <span className="key key-earth" aria-hidden="true" /> Comunicación directa con la Tierra
      </h3>
      <div className="tiles">
        <Tile
          label="Tierra ahora"
          value={earth.visibleNow ? "Visible" : "No visible"}
          sub={`Elevación ${formatDeg(earth.elevationNowDeg)}`}
        />
        {countdownTile(earth, { set: "Tiempo hasta que se pone la Tierra", rise: "Tiempo hasta que sale la Tierra" })}
        <Tile label="Horas con la Tierra visible" value={formatHours(earth.visibleHours)} sub={`de ${formatHours(metrics.windowHours)}`} />
      </div>

      <p className="note">
        Se cuenta como visible mientras asome el borde superior del disco. Ventana: un día lunar desde la fecha elegida.
      </p>
    </section>
  );
}
