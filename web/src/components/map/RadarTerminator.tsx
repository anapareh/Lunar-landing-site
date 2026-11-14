/**
 * Radar 2D del terminador: dónde es de día en la Luna en el instante mostrado.
 * - Proyección GLOBAL (equirectangular, lon 0 en el centro) o POLO SUR (azimutal equidistante,
 *   de 90° S a 60° S, lon 0 arriba y lon 90° E a la derecha, igual que la vista "Polo sur" del globo).
 * - Día/noche por el terminador geométrico (dirección real del Sol, sin relieve): orientativo a
 *   escala global. Las métricas del punto usan su horizonte (lib/horizon.ts).
 * - Marcas: punto subsolar (ámbar), punto sub-terrestre (cian), punto elegido (esmeralda).
 * - Clic para fijar coordenadas.
 * Fondo: textura NASA SVS (solo visual).
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
const TEXTURE_URL = `${import.meta.env.BASE_URL}textures/moon/lroc_color_2k.jpg`;
const SRC_W = 512;
const SRC_H = 256;

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

/** Normales y píxel de textura precalculados por píxel de salida. */
function buildGrid(p: RadarProjection, dpr: number) {
  const w = Math.round(W * dpr);
  const h = Math.round(H * dpr);
  const normals = new Float32Array(w * h * 3);
  const srcIdx = new Int32Array(w * h).fill(-1);
  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) {
      const ll = unproject(p, (i + 0.5) / dpr, (j + 0.5) / dpr);
      const k = j * w + i;
      if (!ll) continue;
      const n = surfaceNormal(ll.lat, ll.lon);
      normals.set(n, k * 3);
      const sx = Math.min(SRC_W - 1, Math.floor(((ll.lon + 180) / 360) * SRC_W));
      const sy = Math.min(SRC_H - 1, Math.floor(((90 - ll.lat) / 180) * SRC_H));
      srcIdx[k] = sy * SRC_W + sx;
    }
  }
  return { w, h, normals, srcIdx };
}

export function RadarTerminator({ sunDir, earthDir, site, onPick }: RadarTerminatorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [proj, setProj] = useState<RadarProjection>("global");
  const [src, setSrc] = useState<Uint8ClampedArray | null>(null);
  const dpr = Math.min(typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1, 2);
  const grid = useMemo(() => buildGrid(proj, dpr), [proj, dpr]);

  // Textura reducida a SRC_W×SRC_H para muestrear
  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement("canvas");
      c.width = SRC_W;
      c.height = SRC_H;
      const ctx = c.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(img, 0, 0, SRC_W, SRC_H);
      setSrc(ctx.getImageData(0, 0, SRC_W, SRC_H).data);
    };
    img.src = TEXTURE_URL;
  }, []);

  const sub = useMemo(() => (sunDir ? subPoint(sunDir) : null), [sunDir]);
  const subE = useMemo(() => (earthDir ? subPoint(earthDir) : null), [earthDir]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const { w, h, normals, srcIdx } = grid;
    canvas.width = w;
    canvas.height = h;
    const out = ctx.createImageData(w, h);
    const d = out.data;
    const s = sunDir ? Math.hypot(...sunDir) : 1;
    const sx = sunDir ? sunDir[0] / s : 0;
    const sy = sunDir ? sunDir[1] / s : 0;
    const sz = sunDir ? sunDir[2] / s : 0;
    for (let k = 0; k < w * h; k++) {
      const o = k * 4;
      const si = srcIdx[k];
      if (si < 0) {
        d[o] = 3; d[o + 1] = 6; d[o + 2] = 13; d[o + 3] = 255;
        continue;
      }
      const base = src ? src[si * 4] * 0.299 + src[si * 4 + 1] * 0.587 + src[si * 4 + 2] * 0.114 : 120;
      const lit = sunDir ? normals[k * 3] * sx + normals[k * 3 + 1] * sy + normals[k * 3 + 2] * sz > 0 : true;
      if (lit) {
        d[o] = base * 0.92; d[o + 1] = base; d[o + 2] = Math.min(255, base * 1.05 + 10);
      } else {
        d[o] = base * 0.16 + 4; d[o + 1] = base * 0.22 + 10; d[o + 2] = base * 0.32 + 24;
      }
      d[o + 3] = 255;
    }
    ctx.putImageData(out, 0, 0);

    // Superposiciones (px CSS escalados)
    ctx.save();
    ctx.scale(w / W, h / H);
    ctx.lineWidth = 1;
    if (proj === "global") {
      ctx.strokeStyle = "rgba(0,240,255,0.35)";
      ctx.setLineDash([2, 2]);
      for (const lon of [-90, 90]) {
        const x = ((lon + 180) / 360) * W;
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
      }
      ctx.setLineDash([]);
    } else {
      ctx.strokeStyle = "rgba(0,240,255,0.35)";
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
    dot(sub, "#ffaa00", 3);
    dot(subE, "#00f0ff", 2.5);
    const sp = project(proj, site.lat, site.lon);
    if (sp) {
      ctx.strokeStyle = "#00ff9d";
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(sp.x, sp.y, 4.5, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.restore();
  }, [grid, src, sunDir, sub, subE, site, proj]);

  const fmt = (ll: { lat: number; lon: number } | null) =>
    ll ? `${ll.lat.toFixed(1)}°, ${ll.lon.toFixed(1)}°` : "—";

  return (
    <div className="pointer-events-auto hud-box rounded-lg p-1.5 w-[236px] shrink-0">
      <div className="flex items-center justify-between text-[9px] font-mono text-cyan-300/80 px-1 mb-1">
        <span>RADAR TERMINADOR 2D</span>
        <button
          type="button"
          onClick={() => setProj(proj === "global" ? "south" : "global")}
          className="text-amber-300 hover:underline"
          aria-label={`Cambiar proyección (ahora: ${proj === "global" ? "global" : "polo sur"})`}
        >
          {proj === "global" ? "GLOBAL" : "POLO SUR"}
        </button>
      </div>
      <canvas
        ref={canvasRef}
        style={{ width: W, height: H }}
        className="block rounded border border-cyan-500/20 cursor-crosshair"
        role="img"
        aria-label={`Mapa de día y noche lunar (${proj === "global" ? "global" : "polo sur"}). Punto subsolar ${fmt(sub)}; punto sub-terrestre ${fmt(subE)}. Clic para fijar coordenadas.`}
        onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const ll = unproject(proj, ((e.clientX - rect.left) / rect.width) * W, ((e.clientY - rect.top) / rect.height) * H);
          if (ll) onPick({ lat: Math.round(ll.lat * 100) / 100, lon: Math.round(ll.lon * 100) / 100 });
        }}
      />
      <div className="mt-1 px-1 flex justify-between text-[9px] font-mono">
        <span className="text-amber-300">● SUBSOLAR {fmt(sub)}</span>
        <span className="text-cyan-300">● SUBTIERRA</span>
      </div>
    </div>
  );
}
