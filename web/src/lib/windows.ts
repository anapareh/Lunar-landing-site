/**
 * Operaciones con ventanas de visibilidad (lib/metrics.ts): intersección (Sol y Tierra a la vez),
 * huecos (noches) y la más larga. Una ventana "abierta" toca un borde de la serie: su duración
 * real puede ser mayor que la calculada.
 */
import type { VisibilityWindow } from "./metrics";
import { MS_PER_HOUR, parseUtc, toIsoUtc } from "./time";

function make(s: number, e: number, openStart: boolean, openEnd: boolean): VisibilityWindow {
  return { start: toIsoUtc(s), end: toIsoUtc(e), hours: (e - s) / MS_PER_HOUR, openStart, openEnd };
}

/** Intervalos en los que se cumplen a la vez `a` y `b`. */
export function intersectWindows(a: VisibilityWindow[], b: VisibilityWindow[]): VisibilityWindow[] {
  const out: VisibilityWindow[] = [];
  for (const x of a) {
    for (const y of b) {
      const s = Math.max(parseUtc(x.start), parseUtc(y.start));
      const e = Math.min(parseUtc(x.end), parseUtc(y.end));
      if (e > s) {
        const openStart = (parseUtc(x.start) === s && x.openStart) || (parseUtc(y.start) === s && y.openStart);
        const openEnd = (parseUtc(x.end) === e && x.openEnd) || (parseUtc(y.end) === e && y.openEnd);
        out.push(make(s, e, openStart, openEnd));
      }
    }
  }
  return out.sort((p, q) => parseUtc(p.start) - parseUtc(q.start));
}

/** Huecos entre ventanas dentro de [start, end] (p. ej. las noches a partir de las ventanas de luz). */
export function gapWindows(ws: VisibilityWindow[], start: string, end: string): VisibilityWindow[] {
  const t0 = parseUtc(start);
  const t1 = parseUtc(end);
  const out: VisibilityWindow[] = [];
  let cur = t0;
  for (const w of [...ws].sort((p, q) => parseUtc(p.start) - parseUtc(q.start))) {
    const s = parseUtc(w.start);
    if (s > cur) out.push(make(cur, s, cur === t0, false));
    cur = Math.max(cur, parseUtc(w.end));
  }
  if (t1 > cur) out.push(make(cur, t1, cur === t0, true));
  return out;
}

/** La ventana más larga (la primera si empatan), o null. */
export function longestWindow(ws: VisibilityWindow[]): VisibilityWindow | null {
  return ws.reduce<VisibilityWindow | null>((best, w) => (!best || w.hours > best.hours ? w : best), null);
}
