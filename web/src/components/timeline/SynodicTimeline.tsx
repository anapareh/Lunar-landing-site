/**
 * Franja del ciclo (un día lunar desde la fecha elegida) para el punto seleccionado:
 * - arriba, luz solar (ámbar; más intensa cuanto más alto está el Sol y más disco se ve);
 * - abajo, visibilidad de la Tierra (cian = visible, rojo oscuro = no visible).
 * Mismo criterio de visibilidad que las métricas (lib/horizon.ts). Se puede arrastrar o mover con
 * el teclado (←/→ 1 h, RePág/AvPág 1 día, Inicio/Fin).
 */
import { useEffect, useRef } from "react";
import type { HorizonSample } from "../../types";
import { isVisible } from "../../lib/horizon";
import { formatUtc } from "../../lib/format";
import { columnSamples, fractionOf, timeAtFraction } from "../../lib/timeline";
import { MS_PER_DAY, MS_PER_HOUR, SYNODIC_MONTH_DAYS, parseUtc, toIsoUtc } from "../../lib/time";

export interface SynodicTimelineProps {
  sun: HorizonSample[];
  earth: HorizonSample[];
  cursor: string;
  onScrub: (iso: string) => void;
}

const nf1 = new Intl.NumberFormat("es-ES", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

export function SynodicTimeline({ sun, earth, cursor, onScrub }: SynodicTimelineProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const t0 = sun.length ? parseUtc(sun[0].time) : 0;
  const t1 = sun.length ? parseUtc(sun[sun.length - 1].time) : 0;
  const cursorMs = parseUtc(cursor);

  // Dibujo
  useEffect(() => {
    const canvas = canvasRef.current;
    const box = boxRef.current;
    if (!canvas || !box || sun.length === 0) return;
    const draw = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = box.clientWidth;
      const h = box.clientHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      const cols = Math.max(1, Math.floor(w));
      const idx = columnSamples(sun.length, cols);
      const colW = w / cols;
      idx.forEach((i, c) => {
        const s = sun[i];
        const lit = isVisible(s);
        const strength = 0.4 + 0.6 * Math.min(1, Math.max(0, s.elevation_deg) / 45);
        ctx.fillStyle = lit ? `rgba(255,170,0,${(s.visible_fraction * strength).toFixed(3)})` : "#060a14";
        ctx.fillRect(c * colW, 0, colW + 0.6, h * 0.5);
        ctx.fillStyle = isVisible(earth[i]) ? "rgba(0,240,255,0.8)" : "#2a0a14";
        ctx.fillRect(c * colW, h * 0.56, colW + 0.6, h * 0.44);
      });
      // Marcas de día (cada 24 h desde el inicio)
      ctx.fillStyle = "rgba(3,5,10,0.55)";
      for (let t = t0 + MS_PER_DAY; t < t1; t += MS_PER_DAY) {
        ctx.fillRect(fractionOf(t, t0, t1) * w, 0, 1, h);
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
  }, [sun, earth, t0, t1, cursorMs]);

  const scrubAt = (clientX: number) => {
    const rect = boxRef.current?.getBoundingClientRect();
    if (!rect) return;
    onScrub(toIsoUtc(timeAtFraction((clientX - rect.left) / rect.width, t0, t1)));
  };
  const step = (ms: number) => onScrub(toIsoUtc(Math.min(t1, Math.max(t0, cursorMs + ms))));

  const offsetDays = (cursorMs - t0) / MS_PER_DAY;
  const totalHours = Math.round((t1 - t0) / MS_PER_HOUR);

  return (
    <div className="flex-1 flex flex-col justify-center min-w-[240px]">
      <div className="flex flex-wrap items-center justify-between gap-x-3 text-[10px] font-mono mb-1">
        <span className="text-slate-400">
          CICLO DE UN DÍA LUNAR · <span className="text-amber-300">■ LUZ</span> · <span className="text-cyan-300">■ TIERRA VISIBLE</span>
        </span>
        <span className="text-amber-300 font-semibold">
          DÍA {nf1.format(offsetDays)} DE {nf1.format(SYNODIC_MONTH_DAYS)}
        </span>
      </div>
      <div
        ref={boxRef}
        role="slider"
        tabIndex={0}
        aria-label="Instante dentro del día lunar"
        aria-valuemin={0}
        aria-valuemax={totalHours}
        aria-valuenow={Math.round((cursorMs - t0) / MS_PER_HOUR)}
        aria-valuetext={formatUtc(cursorMs)}
        className="relative h-6 bg-void rounded border border-cyan-500/35 overflow-hidden cursor-ew-resize touch-none"
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
    </div>
  );
}
