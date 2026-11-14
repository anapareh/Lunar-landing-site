/**
 * Elevación del Sol y la Tierra frente al tiempo (recharts), con el horizonte como referencia.
 * - Horizonte geométrico: línea en 0°.
 * - Horizonte con relieve: línea discontinua del horizonte en el acimut de cada cuerpo.
 * - Eje vertical ampliado cuando todo ocurre cerca del horizonte (lib/chartScale.ts).
 * Colores de serie validados (--color-series-sun / --color-series-earth). Leyenda y tabla accesibles.
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
  /** Instante mostrado (ISO UTC), marcado con una línea vertical. */
  cursor?: string | null;
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
    <div className="console-panel rounded-md px-2.5 py-1.5 text-xs font-mono">
      <div className="text-steel mb-1 tabular-nums">{formatUtc(label)}</div>
      {SERIES.map((s) => {
        const v = get(s.key);
        const h = get(`${s.key}Horizon`);
        return v === undefined ? null : (
          <div key={s.key} className="flex items-center gap-2">
            <span className={`key key-${s.key}`} aria-hidden="true" />
            <strong className="text-telemetry tabular-nums">{formatDeg(v)}</strong>
            <span className="text-steel">
              {s.name}
              {h !== undefined && ` · horizonte ${formatDeg(h)}`}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export function ElevationChart({ series, profile, at, cursor }: ElevationChartProps) {
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
  const cursorMs = cursor ? parseUtc(cursor) : null;

  return (
    <figure className="m-0">
      <figcaption className="flex flex-wrap items-center justify-between gap-2 mb-1">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-telemetry">Elevación del Sol y la Tierra</h2>
          <p className="text-[11px] text-steel">
            Un día lunar desde el {formatUtc(at)}
            {axis.zoomed && (
              <>
                {" · "}
                <strong className="text-amber-400 font-semibold">Eje ampliado</strong> ({tickFormat.format(axis.domain[0])}° a{" "}
                {tickFormat.format(axis.domain[1])}°): todo ocurre cerca del horizonte
              </>
            )}
          </p>
        </div>
        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-300 list-none m-0 p-0" aria-label="Leyenda">
          {SERIES.map((s) => (
            <li key={s.key} className="flex items-center gap-1.5">
              <span className={`key key-${s.key}`} aria-hidden="true" /> {s.name}
            </li>
          ))}
          <li className="flex items-center gap-1.5">
            <span className={`key key-horizon${profile ? " key-dashed" : ""}`} aria-hidden="true" />
            {profile ? "Horizonte en el acimut de cada cuerpo" : "Horizonte (0°)"}
          </li>
        </ul>
      </figcaption>

      <div className="h-56 sm:h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={rows} margin={{ top: 8, right: 16, bottom: 4, left: 0 }}>
            <CartesianGrid vertical={false} />
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
              width={52}
              tickLine={false}
              axisLine={false}
            />
            {!profile && <ReferenceLine y={0} ifOverflow="extendDomain" />}
            {cursorMs !== null && cursorMs >= t0 && cursorMs <= t1 && <ReferenceLine x={cursorMs} className="ref-cursor" />}
            <Tooltip
              content={(p) => <ChartTooltip active={p.active} label={p.label} payload={p.payload} />}
              cursor={{ className: "chart-cursor" }}
              isAnimationActive={false}
            />
            {profile &&
              SERIES.map((s) => (
                <Line
                  key={`${s.key}Horizon`}
                  dataKey={`${s.key}Horizon`}
                  className={s.className}
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

      <details className="mt-1 text-xs font-mono">
        <summary className="cursor-pointer text-steel hover:text-telemetry">Ver los datos en una tabla (cada 6 h)</summary>
        <div className="max-h-48 overflow-auto mt-1">
          <table className="w-full border-collapse tabular-nums">
            <thead>
              <tr className="text-steel border-b border-borderline">
                <th scope="col" className="text-left py-1 px-2">Fecha (UTC)</th>
                <th scope="col" className="text-left py-1 px-2">Sol</th>
                <th scope="col" className="text-left py-1 px-2">Tierra</th>
              </tr>
            </thead>
            <tbody>
              {tableRows.map((r) => (
                <tr key={r.t} className="border-b border-borderline/70 text-telemetry">
                  <td className="py-1 px-2">{formatUtc(r.t)}</td>
                  <td className="py-1 px-2">{formatDeg(r.sun)}</td>
                  <td className="py-1 px-2">{formatDeg(r.earth)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </figure>
  );
}
