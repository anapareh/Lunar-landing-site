/**
 * Terminador 2D: dónde es de día en la Luna en el instante mostrado.
 * - Proyección GLOBAL (equirectangular, lon 0 en el centro) o POLO SUR (azimutal equidistante,
 *   de 90° S a 60° S, lon 0 arriba y lon 90° E a la derecha, igual que la vista "Polo sur" del globo).
 * - Día/noche por el terminador geométrico (dirección real del Sol, sin relieve): orientativo a
 *   escala global. Las métricas del punto usan su horizonte (lib/horizon.ts).
 * - Marcas: punto subsolar (ámbar), punto sub-terrestre (azul), sitio (esmeralda). Clic para fijar.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import type { Vector3 } from "../../types";
import { subPoint, surfaceNormal } from "../../lib/geo";

export type RadarProjection = "global" | "south";

export interface RadarTerminatorProps {
  sunDir: Vector3 | null;
  earthDir: Vector3 | null;
  site: { lat: number; lon: number };
  onPick: (c: { lat: number; lon: number }) => void;
}

const W = 224; // px CSS
const H = 112;
const POLAR_SPAN = 30; // grados de colatitud mostrados en la vista polar

const DAY: [number, number, number] = [0x27, 0x31, 0x42]; // #273142
const NIGHT: [number, number, number] = [0x0d, 0x11, 0x18]; // #0d1118
const OUTSIDE: [number, number, number] = [0x0a, 0x0d, 0x12]; // #0a0d12

/** Lat/lon del punto (x, y) en px CSS, o null si cae fuera del mapa. */
function unproject(p: RadarProjection, x: number, y: number): { lat: number; lon: number } | null {
  if (p === "global") return { lat: 90 - (y / H) * 180, lon: (x / W) * 360 - 180 };
  const R = H / 2 - 4;
  const dx = x - W / 2;
  const dy = y - H / 2;
  const r = Math.hypot(dx, dy);
  if (r > R) return null;
  return { lat: -90 + (r / R) * POLAR_SPAN, lon: (Math.atan2(dx, -dy) * 180) / Math.PI };
}

/** Posición en px CSS de lat/lon, o null si no se ve en esta proyección. */
function project(p: RadarProjection, lat: number, lon: number): { x: number; y: number } | null {
  if (p === "global") return { x: ((lon + 180) / 360) * W, y: ((90 - lat) / 180) * H };
  const co = lat + 90;
  if (co > POLAR_SPAN) return null;
  const R = H / 2 - 4;
  const r = (co / POLAR_SPAN) * R;
  const a = (lon * Math.PI) / 180;
  return { x: W / 2 + r * Math.sin(a), y: H / 2 - r * Math.cos(a) };
}

/** Normales precalculadas por píxel de salida (NaN fuera del mapa). */
function buildGrid(p: RadarProjection, dpr: number) {
  const w = Math.round(W * dpr);
  const h = Math.round(H * dpr);
  const normals = new Float32Array(w * h * 3).fill(Number.NaN);
  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) {
      const ll = unproject(p, (i + 0.5) / dpr, (j + 0.5) / dpr);
      if (ll) normals.set(surfaceNormal(ll.lat, ll.lon), (j * w + i) * 3);
    }
  }
  return { w, h, normals };
}

export function RadarTerminator({ sunDir, earthDir, site, onPick }: RadarTerminatorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [proj, setProj] = useState<RadarProjection>("global");
  const dpr = Math.min(typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1, 2);
  const grid = useMemo(() => buildGrid(proj, dpr), [proj, dpr]);
  const sub = useMemo(() => (sunDir ? subPoint(sunDir) : null), [sunDir]);
  const subE = useMemo(() => (earthDir ? subPoint(earthDir) : null), [earthDir]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const { w, h, normals } = grid;
    canvas.width = w;
    canvas.height = h;
    const out = ctx.createImageData(w, h);
    const d = out.data;
    const s = sunDir ? Math.hypot(...sunDir) : 1;
    const [sx, sy, sz] = sunDir ? [sunDir[0] / s, sunDir[1] / s, sunDir[2] / s] : [0, 0, 0];
    for (let k = 0; k < w * h; k++) {
      const nx = normals[k * 3];
      const c = Number.isNaN(nx)
        ? OUTSIDE
        : !sunDir || nx * sx + normals[k * 3 + 1] * sy + normals[k * 3 + 2] * sz > 0
          ? DAY
          : NIGHT;
      const o = k * 4;
      d[o] = c[0]; d[o + 1] = c[1]; d[o + 2] = c[2]; d[o + 3] = 255;
    }
    ctx.putImageData(out, 0, 0);

    ctx.save();
    ctx.scale(w / W, h / H);
    ctx.lineWidth = 1;
    if (proj === "global") {
      ctx.strokeStyle = "rgba(139, 155, 180, 0.35)";
      ctx.setLineDash([2, 2]);
      for (const lon of [-90, 90]) {
        const x = ((lon + 180) / 360) * W;
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
      }
      ctx.setLineDash([]);
    } else {
      ctx.strokeStyle = "#242f40";
      const R = H / 2 - 4;
      for (const f of [1 / 3, 2 / 3, 1]) {
        ctx.beginPath(); ctx.arc(W / 2, H / 2, R * f, 0, Math.PI * 2); ctx.stroke();
      }
    }
    const dot = (ll: { lat: number; lon: number } | null, color: string, r: number) => {
      const pt = ll && project(proj, ll.lat, ll.lon);
      if (!pt) return;
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.arc(pt.x, pt.y, r, 0, Math.PI * 2); ctx.fill();
    };
    dot(sub, "#f59e0b", 3);
    dot(subE, "#38bdf8", 2.5);
    const sp = project(proj, site.lat, site.lon);
    if (sp) {
      ctx.strokeStyle = "#10b981";
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(sp.x, sp.y, 4, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.restore();
  }, [grid, sunDir, sub, subE, site, proj]);

  const fmt = (ll: { lat: number; lon: number } | null) => (ll ? `${ll.lat.toFixed(1)}°, ${ll.lon.toFixed(1)}°` : "—");

  return (
    <div className="pointer-events-auto console-panel rounded-md p-2 w-[240px] shrink-0">
      <div className="flex items-center justify-between text-[10px] font-mono text-steel mb-1.5">
        <span>TERMINADOR 2D</span>
        <button
          type="button"
          onClick={() => setProj(proj === "global" ? "south" : "global")}
          className="text-sky-400 hover:underline font-semibold"
          aria-label={`Cambiar proyección (ahora: ${proj === "global" ? "global" : "polo sur"})`}
        >
          {proj === "global" ? "GLOBAL" : "POLO SUR"}
        </button>
      </div>
      <canvas
        ref={canvasRef}
        style={{ width: W, height: H }}
        className="block rounded bg-obsidian border border-borderline cursor-crosshair"
        role="img"
        aria-label={`Mapa de día y noche lunar (${proj === "global" ? "global" : "polo sur"}). Punto subsolar ${fmt(sub)}; punto sub-terrestre ${fmt(subE)}. Clic para fijar coordenadas.`}
        onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const ll = unproject(proj, ((e.clientX - rect.left) / rect.width) * W, ((e.clientY - rect.top) / rect.height) * H);
          if (ll) onPick({ lat: Math.round(ll.lat * 100) / 100, lon: Math.round(ll.lon * 100) / 100 });
        }}
      />
      <div className="flex items-center justify-between text-[9px] font-mono text-steel mt-1">
        <span className="flex items-center gap-1" title={`Punto subsolar: ${fmt(sub)}`}>
          <i className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" aria-hidden="true" />Subsolar
        </span>
        <span className="flex items-center gap-1" title={`Punto sub-terrestre: ${fmt(subE)}`}>
          <i className="w-1.5 h-1.5 rounded-full bg-sky-400 inline-block" aria-hidden="true" />Subterrestre
        </span>
        <span className="flex items-center gap-1">
          <i className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" aria-hidden="true" />Sitio
        </span>
      </div>
    </div>
  );
}
