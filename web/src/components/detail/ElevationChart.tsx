/**
 * Elevación del Sol y la Tierra frente al tiempo (recharts), con el horizonte como referencia.
 * - Horizonte geométrico: línea en 0°.
 * - Horizonte con relieve: línea discontinua del horizonte en el acimut de cada cuerpo.
 * Colores por rol (CSS): --series-sun, --series-earth. Leyenda siempre visible y tabla accesible.
 */
import { useMemo } from "react";
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { HorizonProfile, SunEarthSeries } from "../../types";
import { horizonElevationAt } from "../../lib/horizon";
import { elevationAxis } from "../../lib/chartScale";
import { formatDayMonth, formatDeg, formatUtc } from "../../lib/format";
import { MS_PER_DAY, parseUtc } from "../../lib/time";

export interface ElevationChartProps {
  series: SunEarthSeries;
  profile: HorizonProfile | null;
  /** Fecha de referencia (ISO UTC): inicio de la ventana representada. */
  at: string;
}

interface Row {
  t: number;
  sun: number;
  earth: number;
  sunHorizon?: number;
  earthHorizon?: number;
}

const SERIES = [
  { key: "sun", name: "Sol", className: "line-sun" },
  { key: "earth", name: "Tierra", className: "line-earth" },
] as const;

/** Marcas a medianoche UTC, cada N días para no pasar de ~7. */
function dayTicks(t0: number, t1: number): number[] {
  const first = Math.ceil(t0 / MS_PER_DAY) * MS_PER_DAY;
  const days = (t1 - first) / MS_PER_DAY;
  const every = [1, 2, 5, 7, 10, 14].find((n) => days / n <= 7) ?? 30;
  const ticks: number[] = [];
  for (let t = first; t <= t1; t += every * MS_PER_DAY) ticks.push(t);
  return ticks;
}

interface TooltipProps {
  active?: boolean;
  label?: unknown;
  payload?: ReadonlyArray<{ dataKey?: unknown; value?: unknown }>;
}

function ChartTooltip({ active, label, payload }: TooltipProps) {
  if (!active || !payload?.length || typeof label !== "number") return null;
  const get = (k: string) => payload.find((p) => p.dataKey === k)?.value as number | undefined;
  return (
    <div className="chart-tooltip">
      <div className="tooltip-time">{formatUtc(label)}</div>
      {SERIES.map((s) => {
        const v = get(s.key);
        const h = get(`${s.key}Horizon`);
        return v === undefined ? null : (
          <div key={s.key} className="tooltip-row">
            <span className={`key key-${s.key}`} aria-hidden="true" />
            <strong>{formatDeg(v)}</strong>
            <span className="tooltip-name">
              {s.name}
              {h !== undefined && ` · horizonte ${formatDeg(h)}`}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export function ElevationChart({ series, profile, at }: ElevationChartProps) {
  const rows = useMemo<Row[]>(
    () =>
      series.sun.map((s, i) => {
        const e = series.earth[i];
        const row: Row = { t: parseUtc(s.time), sun: s.elevation_deg, earth: e.elevation_deg };
        if (profile) {
          row.sunHorizon = horizonElevationAt(profile, s.azimuth_deg);
          row.earthHorizon = horizonElevationAt(profile, e.azimuth_deg);
        }
        return row;
      }),
    [series, profile],
  );
  if (rows.length === 0) return null;
  const t0 = rows[0].t;
  const t1 = rows[rows.length - 1].t;
  const axis = elevationAxis(rows.flatMap((r) => [r.sun, r.earth, r.sunHorizon ?? 0, r.earthHorizon ?? 0]));
  const decimals = axis.step < 0.25 ? 1 : axis.step < 1 ? 2 : 0;
  const tickFormat = new Intl.NumberFormat("es-ES", { maximumFractionDigits: decimals });
  const tableRows = rows.filter((r) => (r.t - t0) % (6 * 3_600_000) === 0);

  return (
    <figure className="card chart-card">
      <figcaption className="card-head">
        <h2 className="card-title">Elevación del Sol y la Tierra</h2>
        <ul className="legend" aria-label="Leyenda">
          {SERIES.map((s) => (
            <li key={s.key}>
              <span className={`key key-${s.key}`} aria-hidden="true" /> {s.name}
            </li>
          ))}
          <li>
            <span className={`key key-horizon${profile ? " key-dashed" : ""}`} aria-hidden="true" />
            {profile ? "Horizonte en el acimut de cada cuerpo" : "Horizonte (0°)"}
          </li>
        </ul>
      </figcaption>
      <p className="chart-caption">
        Un día lunar desde el {formatUtc(at)}
        {axis.zoomed && (
          <>
            {" · "}
            <strong>Eje vertical ampliado</strong> ({tickFormat.format(axis.domain[0])}° a {tickFormat.format(axis.domain[1])}°): el Sol y
            la Tierra se mueven cerca del horizonte
          </>
        )}
      </p>

      <div className="chart-box">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={rows} margin={{ top: 8, right: 16, bottom: 4, left: 0 }}>
            <CartesianGrid className="chart-grid" vertical={false} />
            <XAxis
              dataKey="t"
              type="number"
              scale="time"
              domain={[t0, t1]}
              ticks={dayTicks(t0, t1)}
              tickFormatter={formatDayMonth}
              className="chart-axis"
              tickLine={false}
            />
            <YAxis
              domain={axis.domain}
              ticks={axis.ticks}
              allowDataOverflow
              tickFormatter={(v: number) => `${tickFormat.format(v)}°`}
              className="chart-axis"
              width={48}
              tickLine={false}
              axisLine={false}
            />
            {!profile && <ReferenceLine y={0} className="ref-horizon" ifOverflow="extendDomain" />}
            <Tooltip content={(p) => <ChartTooltip active={p.active} label={p.label} payload={p.payload} />} cursor={{ className: "chart-cursor" }} isAnimationActive={false} />
            {profile &&
              SERIES.map((s) => (
                <Line
                  key={`${s.key}Horizon`}
                  dataKey={`${s.key}Horizon`}
                  className={`${s.className} line-horizon`}
                  stroke="currentColor"
                  strokeWidth={1}
                  strokeDasharray="4 3"
                  dot={false}
                  activeDot={false}
                  isAnimationActive={false}
                />
              ))}
            {SERIES.map((s) => (
              <Line
                key={s.key}
                dataKey={s.key}
                name={s.name}
                className={s.className}
                stroke="currentColor"
                strokeWidth={2}
                strokeLinejoin="round"
                strokeLinecap="round"
                dot={false}
                activeDot={{ r: 4, strokeWidth: 2, className: "active-dot" }}
                isAnimationActive={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      <details className="table-view">
        <summary>Ver los datos en una tabla (cada 6 h)</summary>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th scope="col">Fecha (UTC)</th>
                <th scope="col">Sol</th>
                <th scope="col">Tierra</th>
              </tr>
            </thead>
            <tbody>
              {tableRows.map((r) => (
                <tr key={r.t}>
                  <td>{formatUtc(r.t)}</td>
                  <td>{formatDeg(r.sun)}</td>
                  <td>{formatDeg(r.earth)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </figure>
  );
}
