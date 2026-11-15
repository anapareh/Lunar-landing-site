/**
 * Cobertura de la efeméride con huecos: tramos continuos (años consecutivos unidos).
 * Se usa para no pedir ventanas que crucen un hueco y para llevar una fecha sin datos al borde
 * del tramo más cercano.
 */
import { parseUtc, toIsoUtc } from "./time";

export interface CoverageRange {
  start: string;
  end: string;
}

/** Une los trozos (ordenados o no) cuyo inicio llega como mucho `maxGapMs` después del final anterior. */
export function mergeRanges(parts: CoverageRange[], maxGapMs: number): CoverageRange[] {
  const sorted = [...parts].sort((a, b) => parseUtc(a.start) - parseUtc(b.start));
  const out: CoverageRange[] = [];
  for (const p of sorted) {
    const last = out[out.length - 1];
    if (last && parseUtc(p.start) - parseUtc(last.end) <= maxGapMs) {
      if (parseUtc(p.end) > parseUtc(last.end)) last.end = p.end;
    } else out.push({ ...p });
  }
  return out;
}

/** Tramo que contiene el instante, o null si cae en un hueco. */
export function rangeContaining(ranges: CoverageRange[], iso: string): CoverageRange | null {
  const t = parseUtc(iso);
  return ranges.find((r) => t >= parseUtc(r.start) && t <= parseUtc(r.end)) ?? null;
}

/** El mismo instante si hay datos; si no, el borde del tramo más cercano. */
export function snapToCoverage(ranges: CoverageRange[], iso: string): string {
  if (ranges.length === 0 || rangeContaining(ranges, iso)) return iso;
  const t = parseUtc(iso);
  let best = ranges[0].start;
  let bestD = Infinity;
  for (const r of ranges) {
    for (const edge of [r.start, r.end]) {
      const d = Math.abs(parseUtc(edge) - t);
      if (d < bestD) {
        bestD = d;
        best = edge;
      }
    }
  }
  return toIsoUtc(parseUtc(best));
}
