/**
 * Franja del ciclo (un día lunar desde la fecha elegida) para el punto seleccionado, en tres filas:
 * 1. condición (Sol y Tierra / solo Sol / solo Tierra / ninguno; lib/conditions.ts);
 * 2. luz solar (ámbar, más intensa cuanto más alto está el Sol y más disco se ve);
 * 3. visibilidad de la Tierra.
 * Mismo criterio de visibilidad que las métricas (lib/horizon.ts). Se arrastra o se mueve con el
 * teclado (←/→ 1 h, RePág/AvPág 1 día, Inicio/Fin). Se usa grande en el panel derecho y fina en el pie.
 */
import { useEffect, useRef } from "react";
import type { HorizonSample } from "../../types";
import { isVisible } from "../../lib/horizon";
import { CONDITION_COLOR, conditionOf } from "../../lib/conditions";
import { formatDayMonth, formatUtc } from "../../lib/format";
import { columnSamples, fractionOf, timeAtFraction } from "../../lib/timeline";
import { MS_PER_DAY, MS_PER_HOUR, parseUtc, toIsoUtc } from "../../lib/time";
import { useT } from "../../i18n";

export interface SynodicTimelineProps {
  sun: HorizonSample[];
  earth: HorizonSample[];
  cursor: string;
  onScrub: (iso: string) => void;
  /** Clase de altura del lienzo (p. ej. "h-24" o "h-10"). */
  heightClass?: string;
  /** Fechas de inicio y fin dentro del lienzo. */
  dateLabels?: boolean;
  label?: string;
}

const SUN_DARK = "#161b26";
const EARTH_ON = CONDITION_COLOR.earth;
const EARTH_OFF = "#3f151d";

export function SynodicTimeline({ sun, earth, cursor, onScrub, heightClass = "h-10", dateLabels = false, label }: SynodicTimelineProps) {
  const t = useT();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const t0 = sun.length ? parseUtc(sun[0].time) : 0;
  const t1 = sun.length ? parseUtc(sun[sun.length - 1].time) : 0;
  const cursorMs = parseUtc(cursor);

  useEffect(() => {
    const canvas = canvasRef.current;
    const box = boxRef.current;
    if (!canvas || !box || sun.length === 0) return;
    const draw = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = box.clientWidth;
      const h = box.clientHeight;
      if (w === 0 || h === 0) return;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = "#0a0d12";
      ctx.fillRect(0, 0, w, h);
      const cols = Math.max(1, Math.floor(w));
      const idx = columnSamples(sun.length, cols);
      const colW = w / cols;
      const r1 = h * 0.48;
      const r2 = h * 0.24;
      const gap = 2;
      idx.forEach((i, c) => {
        const s = sun[i];
        const lit = isVisible(s);
        const seen = isVisible(earth[i]);
        ctx.fillStyle = CONDITION_COLOR[conditionOf(lit, seen)];
        ctx.fillRect(c * colW, 0, colW + 0.6, r1);
        const strength = 0.45 + 0.55 * Math.min(1, Math.max(0, s.elevation_deg) / 45);
        ctx.fillStyle = lit ? `rgba(251,191,36,${(Math.max(0.25, s.visible_fraction) * strength).toFixed(3)})` : SUN_DARK;
        ctx.fillRect(c * colW, r1 + gap, colW + 0.6, r2 - gap);
        ctx.fillStyle = seen ? EARTH_ON : EARTH_OFF;
        ctx.fillRect(c * colW, r1 + r2 + gap, colW + 0.6, h - r1 - r2 - gap);
      });
      // Marcas de día (cada 24 h desde el inicio)
      ctx.fillStyle = "rgba(10,13,18,0.5)";
      for (let t = t0 + MS_PER_DAY; t < t1; t += MS_PER_DAY) ctx.fillRect(fractionOf(t, t0, t1) * w, 0, 1, h);
      if (dateLabels) {
        ctx.font = "9px 'JetBrains Mono', ui-monospace, monospace";
        ctx.fillStyle = "rgba(255,255,255,0.85)";
        ctx.textBaseline = "top";
        ctx.fillText(formatDayMonth(t0), 4, 3);
        ctx.textAlign = "right";
        ctx.fillText(formatDayMonth(t1), w - 4, 3);
        ctx.textAlign = "left";
      }
      // Cabezal
      const x = fractionOf(cursorMs, t0, t1) * w;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(x - 1, 0, 2, h);
    };
    draw();
    const ro = new ResizeObserver(draw);
    ro.observe(box);
    return () => ro.disconnect();
  }, [sun, earth, t0, t1, cursorMs, dateLabels]);

  const scrubAt = (clientX: number) => {
    const rect = boxRef.current?.getBoundingClientRect();
    if (!rect) return;
    onScrub(toIsoUtc(timeAtFraction((clientX - rect.left) / rect.width, t0, t1)));
  };
  const step = (ms: number) => onScrub(toIsoUtc(Math.min(t1, Math.max(t0, cursorMs + ms))));

  return (
    <div
      ref={boxRef}
      role="slider"
      tabIndex={0}
      aria-label={label ?? t.timeline.aria}
      aria-valuemin={0}
      aria-valuemax={Math.round((t1 - t0) / MS_PER_HOUR)}
      aria-valuenow={Math.round((cursorMs - t0) / MS_PER_HOUR)}
      aria-valuetext={formatUtc(cursorMs)}
      className={`relative w-full ${heightClass} bg-obsidian rounded border border-borderline overflow-hidden cursor-ew-resize touch-none`}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        scrubAt(e.clientX);
      }}
      onPointerMove={(e) => {
        if (e.currentTarget.hasPointerCapture(e.pointerId)) scrubAt(e.clientX);
      }}
      onKeyDown={(e) => {
        const map: Record<string, () => void> = {
          ArrowLeft: () => step(-MS_PER_HOUR),
          ArrowRight: () => step(MS_PER_HOUR),
          PageDown: () => step(-MS_PER_DAY),
          PageUp: () => step(MS_PER_DAY),
          Home: () => onScrub(toIsoUtc(t0)),
          End: () => onScrub(toIsoUtc(t1)),
        };
        if (map[e.key]) {
          e.preventDefault();
          map[e.key]();
        }
      }}
    >
      <canvas ref={canvasRef} className="w-full h-full block" aria-hidden="true" />
    </div>
  );
}
