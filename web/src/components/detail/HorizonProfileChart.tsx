/**
 * Panorama del horizonte local: elevación del horizonte (relieve LOLA o 0° geométrico) frente al
 * acimut, con la trayectoria del Sol y de la Tierra durante la ventana y su posición actual.
 * Muestra por qué el relieve decide si hay luz: en el polo sur el Sol se desliza rozando el horizonte.
 */
import { useMemo, useState } from "react";
import type { HorizonProfile, HorizonSample } from "../../types";
import { formatDeg } from "../../lib/format";
import { useT } from "../../i18n";

export interface HorizonProfileChartProps {
  profile: HorizonProfile | null;
  sun: HorizonSample[];
  earth: HorizonSample[];
  sunNow: { az: number; el: number } | null;
  earthNow: { az: number; el: number } | null;
}

const W = 320;
const H = 120;
const M = { l: 28, r: 6, t: 8, b: 16 };
const SUN = "#c98500";
const EARTH = "#279ad0";

/** Trazo SVG de una trayectoria (az, el), cortado donde el acimut salta de 360° a 0°. */
function pathOf(samples: HorizonSample[], x: (a: number) => number, y: (e: number) => number): string {
  let d = "";
  let prev: number | null = null;
  for (const s of samples) {
    const cmd = prev === null || Math.abs(s.azimuth_deg - prev) > 180 ? "M" : "L";
    d += `${cmd}${x(s.azimuth_deg).toFixed(1)},${y(s.elevation_deg).toFixed(1)}`;
    prev = s.azimuth_deg;
  }
  return d;
}

export function HorizonProfileChart({ profile, sun, earth, sunNow, earthNow }: HorizonProfileChartProps) {
  const t = useT();
  const hc = t.horizonChart;
  const [hover, setHover] = useState<{ az: number; x: number } | null>(null);
  const values = profile?.horizon_elevation_deg ?? null;
  const step = profile?.azimuth_step_deg ?? 1;

  const { lo, hi } = useMemo(() => {
    const all = [0, ...(values ?? []), ...sun.map((s) => s.elevation_deg), ...earth.map((s) => s.elevation_deg)];
    const mn = Math.min(...all);
    const mx = Math.max(...all);
    const pad = Math.max(0.5, (mx - mn) * 0.08);
    return { lo: Math.max(-90, mn - pad), hi: Math.min(90, mx + pad) };
  }, [values, sun, earth]);

  const x = (az: number) => M.l + (az / 360) * (W - M.l - M.r);
  const y = (el: number) => M.t + ((hi - el) / (hi - lo)) * (H - M.t - M.b);
  const horizonAt = (az: number) => {
    if (!values) return 0;
    const f = (((az % 360) + 360) % 360) / step;
    const i0 = Math.floor(f) % values.length;
    const i1 = (i0 + 1) % values.length;
    return values[i0] + (values[i1] - values[i0]) * (f - Math.floor(f));
  };

  const terrain = useMemo(() => {
    const pts: string[] = [];
    for (let az = 0; az <= 360; az += step) pts.push(`${x(az).toFixed(1)},${y(horizonAt(az)).toFixed(1)}`);
    return `M${x(0)},${H - M.b} L${pts.join(" L")} L${x(360)},${H - M.b} Z`;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [values, lo, hi]);

  const ticksY = [lo, 0, hi].filter((v, i, a) => a.findIndex((w) => Math.abs(w - v) < (hi - lo) * 0.12) === i);
  const card: [number, string][] = [0, 90, 180, 270, 360].map((az, i) => [az, hc.cardinals[i]]);

  return (
    <figure className="m-0">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-auto block"
        role="img"
        aria-label={hc.aria(!!profile, formatDeg(lo), formatDeg(hi))}
        onMouseMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          const px = ((e.clientX - r.left) / r.width) * W;
          const az = ((px - M.l) / (W - M.l - M.r)) * 360;
          setHover(az >= 0 && az <= 360 ? { az, x: px } : null);
        }}
        onMouseLeave={() => setHover(null)}
      >
        {ticksY.map((v) => (
          <g key={v}>
            <line x1={M.l} x2={W - M.r} y1={y(v)} y2={y(v)} stroke={v === 0 ? "#3b4d6b" : "#1f2a3a"} strokeWidth={1} />
            <text x={M.l - 3} y={y(v) + 3} textAnchor="end" className="fill-steel" fontSize={8} fontFamily="JetBrains Mono, monospace">
              {Math.round(v)}°
            </text>
          </g>
        ))}
        {card.map(([az, l]) => (
          <text key={az} x={x(az)} y={H - 4} textAnchor="middle" className="fill-steel" fontSize={8} fontFamily="JetBrains Mono, monospace">
            {l}
          </text>
        ))}
        <path d={terrain} fill="#3a4252" stroke="#8b9bb4" strokeWidth={1} />
        <path d={pathOf(earth, x, y)} fill="none" stroke={EARTH} strokeWidth={1.5} strokeDasharray="2 2" />
        <path d={pathOf(sun, x, y)} fill="none" stroke={SUN} strokeWidth={1.5} strokeDasharray="2 2" />
        {earthNow && <circle cx={x(earthNow.az)} cy={y(earthNow.el)} r={4} fill={EARTH} stroke="#0d141f" strokeWidth={2} />}
        {sunNow && <circle cx={x(sunNow.az)} cy={y(sunNow.el)} r={4.5} fill={SUN} stroke="#0d141f" strokeWidth={2} />}
        {hover && (
          <g pointerEvents="none">
            <line x1={hover.x} x2={hover.x} y1={M.t} y2={H - M.b} stroke="#8b9bb4" strokeWidth={1} />
            <rect x={Math.min(hover.x + 4, W - 92)} y={M.t} width={88} height={14} rx={2} fill="#0a0d12" stroke="#1f2a3a" />
            <text x={Math.min(hover.x + 8, W - 88)} y={M.t + 10} fontSize={8} fontFamily="JetBrains Mono, monospace" className="fill-telemetry">
              {hc.hover(Math.round(hover.az), formatDeg(horizonAt(hover.az)))}
            </text>
          </g>
        )}
      </svg>
      <figcaption className="flex flex-wrap gap-x-3 gap-y-0.5 text-[9px] font-mono text-steel mt-1">
        <span className="flex items-center gap-1"><i className="w-3 h-2 inline-block bg-[#3a4252] border border-[#8b9bb4]" aria-hidden="true" />{hc.horizon}</span>
        <span className="flex items-center gap-1"><i className="key key-sun key-dashed" aria-hidden="true" />{hc.sunPath}</span>
        <span className="flex items-center gap-1"><i className="key key-earth key-dashed" aria-hidden="true" />{hc.earthPath}</span>
        <span>{hc.now}</span>
      </figcaption>
    </figure>
  );
}
