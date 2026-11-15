/**
 * Mapa de condiciones en el instante mostrado: para cada punto de la Luna, ¿se ve el Sol? ¿y la
 * Tierra? (lib/conditions.ts, horizonte geométrico desde el centro lunar: orientativo).
 * - Proyección GLOBAL (equirectangular, lon 0 en el centro) o POLO SUR (azimutal equidistante de
 *   90° S a 60° S, lon 0 arriba, lon 90° E a la derecha, como la vista "Polo sur" del globo).
 * - Marcas: punto subsolar (ámbar), sub-terrestre (azul), sitio (cruz blanca). Clic para fijar el punto.
 * Las métricas del punto sí usan su horizonte (relieve LOLA en el polo sur).
 */
import { useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import type { Vector3 } from "../../types";
import { subPoint, surfaceNormal } from "../../lib/geo";
import { CONDITION_COLOR, CONDITION_ORDER, conditionOf, geometricCondition, type Condition } from "../../lib/conditions";
import { useT } from "../../i18n";

export type MapProjection = "global" | "south";

export interface ConditionsMapProps {
  sunDir: Vector3 | null;
  earthDir: Vector3 | null;
  site: { lat: number; lon: number };
  onPick: (c: { lat: number; lon: number }) => void;
}

const POLAR_SPAN = 30; // grados de colatitud en la vista polar

const hexRgb = (h: string): [number, number, number] => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const RGB: Record<Condition, [number, number, number]> = {
  both: hexRgb(CONDITION_COLOR.both),
  sun: hexRgb(CONDITION_COLOR.sun),
  earth: hexRgb(CONDITION_COLOR.earth),
  none: hexRgb(CONDITION_COLOR.none),
};
const OUTSIDE: [number, number, number] = [0x0a, 0x0d, 0x12];

function unproject(p: MapProjection, x: number, y: number, W: number, H: number): { lat: number; lon: number } | null {
  if (p === "global") return { lat: 90 - (y / H) * 180, lon: (x / W) * 360 - 180 };
  const R = H / 2 - 4;
  const dx = x - W / 2;
  const dy = y - H / 2;
  const r = Math.hypot(dx, dy);
  if (r > R) return null;
  return { lat: -90 + (r / R) * POLAR_SPAN, lon: (Math.atan2(dx, -dy) * 180) / Math.PI };
}

function project(p: MapProjection, lat: number, lon: number, W: number, H: number): { x: number; y: number } | null {
  if (p === "global") return { x: ((lon + 180) / 360) * W, y: ((90 - lat) / 180) * H };
  const co = lat + 90;
  if (co > POLAR_SPAN) return null;
  const R = H / 2 - 4;
  const r = (co / POLAR_SPAN) * R;
  const a = (lon * Math.PI) / 180;
  return { x: W / 2 + r * Math.sin(a), y: H / 2 - r * Math.cos(a) };
}

const fmtLL = (ll: { lat: number; lon: number }, west: string) =>
  `${Math.abs(ll.lat).toFixed(1)}°${ll.lat >= 0 ? "N" : "S"} ${Math.abs(ll.lon).toFixed(1)}°${ll.lon >= 0 ? "E" : west}`;

export function ConditionsMap({ sunDir, earthDir, site, onPick }: ConditionsMapProps) {
  const t = useT();
  const m = t.map;
  const boxRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [proj, setProj] = useState<MapProjection>("global");
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [hover, setHover] = useState<{ x: number; y: number; text: string } | null>(null);
  const sub = useMemo(() => (sunDir ? subPoint(sunDir) : null), [sunDir]);
  const subE = useMemo(() => (earthDir ? subPoint(earthDir) : null), [earthDir]);

  useEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    const ro = new ResizeObserver(() => setSize({ w: box.clientWidth, h: box.clientHeight }));
    ro.observe(box);
    return () => ro.disconnect();
  }, []);

  // Normales por píxel (dependen solo del tamaño y la proyección)
  const grid = useMemo(() => {
    const dpr = Math.min(typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1, 2);
    const w = Math.round(size.w * dpr);
    const h = Math.round(size.h * dpr);
    const normals = new Float32Array(w * h * 3).fill(Number.NaN);
    for (let j = 0; j < h; j++) {
      for (let i = 0; i < w; i++) {
        const ll = unproject(proj, (i + 0.5) / dpr, (j + 0.5) / dpr, size.w, size.h);
        if (ll) normals.set(surfaceNormal(ll.lat, ll.lon), (j * w + i) * 3);
      }
    }
    return { w, h, normals };
  }, [size, proj]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    const { w, h, normals } = grid;
    if (!canvas || !ctx || w === 0 || h === 0) return;
    canvas.width = w;
    canvas.height = h;
    const out = ctx.createImageData(w, h);
    const d = out.data;
    const s = sunDir ?? [0, 0, 0];
    const e = earthDir ?? [0, 0, 0];
    for (let k = 0; k < w * h; k++) {
      const nx = normals[k * 3];
      const ny = normals[k * 3 + 1];
      const nz = normals[k * 3 + 2];
      const c = Number.isNaN(nx)
        ? OUTSIDE
        : RGB[conditionOf(nx * s[0] + ny * s[1] + nz * s[2] > 0, nx * e[0] + ny * e[1] + nz * e[2] > 0)];
      const o = k * 4;
      d[o] = c[0];
      d[o + 1] = c[1];
      d[o + 2] = c[2];
      d[o + 3] = 255;
    }
    ctx.putImageData(out, 0, 0);

    const W = size.w;
    const H = size.h;
    ctx.save();
    ctx.scale(w / W, h / H);
    ctx.strokeStyle = "rgba(255,255,255,0.12)";
    ctx.lineWidth = 0.75;
    if (proj === "global") {
      for (const lat of [-45, 0, 45]) {
        const y = ((90 - lat) / 180) * H;
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
      }
      for (const lon of [-90, 0, 90]) {
        const x = ((lon + 180) / 360) * W;
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
      }
    } else {
      const R = H / 2 - 4;
      for (const f of [1 / 3, 2 / 3, 1]) {
        ctx.beginPath(); ctx.arc(W / 2, H / 2, R * f, 0, Math.PI * 2); ctx.stroke();
      }
    }
    const dot = (ll: { lat: number; lon: number } | null, color: string, r: number) => {
      const pt = ll && project(proj, ll.lat, ll.lon, W, H);
      if (!pt) return;
      ctx.fillStyle = color;
      ctx.strokeStyle = "#0a0d12";
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(pt.x, pt.y, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    };
    dot(sub, "#fef08a", 3.5);
    dot(subE, "#7dd3fc", 3);
    const sp = project(proj, site.lat, site.lon, W, H);
    if (sp) {
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(sp.x, sp.y, 4.5, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(sp.x - 8, sp.y); ctx.lineTo(sp.x + 8, sp.y); ctx.moveTo(sp.x, sp.y - 8); ctx.lineTo(sp.x, sp.y + 8); ctx.stroke();
    }
    ctx.restore();
  }, [grid, sunDir, earthDir, sub, subE, site, proj, size]);

  const at = (e: MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    return { x, y, ll: unproject(proj, x, y, rect.width, rect.height) };
  };

  return (
    <div>
      <div ref={boxRef} className="relative rounded overflow-hidden border border-borderline bg-obsidian h-36 sm:h-40">
        <canvas
          ref={canvasRef}
          className="w-full h-full block cursor-crosshair"
          role="img"
          aria-label={m.aria(proj === "global" ? m.global : m.south)}
          onClick={(e) => {
            const { ll } = at(e);
            if (ll) onPick({ lat: Math.round(ll.lat * 100) / 100, lon: Math.round(ll.lon * 100) / 100 });
          }}
          onMouseMove={(e) => {
            const { x, y, ll } = at(e);
            if (!ll || !sunDir || !earthDir) return setHover(null);
            setHover({ x, y, text: `${fmtLL(ll, m.west)} · ${t.conditions.label[geometricCondition(ll.lat, ll.lon, sunDir, earthDir)]}` });
          }}
          onMouseLeave={() => setHover(null)}
        />
        <button
          type="button"
          onClick={() => setProj(proj === "global" ? "south" : "global")}
          className="absolute top-1 left-1.5 px-1.5 py-0.5 rounded bg-obsidian/85 border border-borderline text-[9px] font-mono text-sky-300 hover:border-sky-400"
          aria-label={m.toggleAria(proj === "global" ? m.global : m.south)}
        >
          {proj === "global" ? m.toggleGlobal : m.toggleSouth}
        </button>
        {hover && (
          <div
            className="absolute pointer-events-none px-1.5 py-0.5 rounded bg-obsidian/95 border border-borderline text-[10px] font-mono text-telemetry whitespace-nowrap"
            style={{ left: Math.min(hover.x + 10, size.w - 170), top: Math.max(hover.y - 24, 2) }}
          >
            {hover.text}
          </div>
        )}
        <div className="absolute bottom-1 right-1.5 px-1.5 py-0.5 rounded bg-obsidian/85 text-[9px] font-mono text-steel pointer-events-none">
          {m.clickHint}
        </div>
      </div>
      <ul className="grid grid-cols-2 gap-1.5 text-[10px] font-mono pt-2" aria-label={m.legendAria}>
        {CONDITION_ORDER.map((c) => (
          <li key={c} className="flex items-center gap-1.5 bg-surface px-2 py-1 rounded border border-borderline">
            <span className="w-2.5 h-2.5 rounded-sm shrink-0 border border-white/10" style={{ background: CONDITION_COLOR[c] }} aria-hidden="true" />
            <span className="text-slate-200">{t.conditions.label[c]}</span>
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[9px] font-mono text-steel mt-1.5">
        <span className="flex items-center gap-1"><i className="w-1.5 h-1.5 rounded-full bg-yellow-200 inline-block" aria-hidden="true" />{m.subsolar}</span>
        <span className="flex items-center gap-1"><i className="w-1.5 h-1.5 rounded-full bg-sky-300 inline-block" aria-hidden="true" />{m.subEarth}</span>
        <span>{m.geometric}</span>
      </div>
    </div>
  );
}
