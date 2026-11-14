/**
 * Mini franja de solo lectura de un escenario: luz (arriba, ámbar) y Tierra visible (abajo, azul)
 * a lo largo de su día lunar. Mismo criterio de visibilidad que las métricas.
 */
import { useEffect, useRef } from "react";
import type { HorizonSample } from "../../types";
import { isVisible } from "../../lib/horizon";
import { columnSamples } from "../../lib/timeline";

export function VisibilityStrip({ sun, earth, label }: { sun: HorizonSample[]; earth: HorizonSample[]; label: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx || sun.length === 0) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const cols = Math.max(1, Math.floor(w));
    const colW = w / cols;
    columnSamples(sun.length, cols).forEach((i, c) => {
      const s = sun[i];
      ctx.fillStyle = isVisible(s) ? `rgba(245,158,11,${(0.35 + 0.65 * s.visible_fraction).toFixed(3)})` : "#0f141d";
      ctx.fillRect(c * colW, 0, colW + 0.6, h * 0.5);
      ctx.fillStyle = isVisible(earth[i]) ? "#0284c7" : "#2a1219";
      ctx.fillRect(c * colW, h * 0.56, colW + 0.6, h * 0.44);
    });
  }, [sun, earth]);

  return <canvas ref={ref} className="w-full h-4 block rounded border border-borderline bg-obsidian" role="img" aria-label={label} />;
}
