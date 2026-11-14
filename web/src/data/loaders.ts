/**
 * Carga de los JSON estáticos de web/public/data (contrato v1).
 *
 * - manifest.json dice qué años de efeméride y qué horizontes hay.
 * - Las efemérides se cargan por año, solo las que cubren la ventana pedida, y se unen.
 * - Si no hay manifest (el pipeline aún no ha generado datos), la app usa la efeméride
 *   sintética y muestra un aviso: nunca se presentan datos sintéticos como reales.
 */
import type { Ephemeris, HorizonProfile, Manifest } from "../types";
import { addLunarDays, fractionalIndex, parseUtc, toIsoUtc } from "../lib/time";
import { makeSyntheticEphemeris } from "./fixtures/syntheticEphemeris";

export interface Coverage {
  start: string;
  end: string;
}

function dataUrl(path: string): string {
  return `${import.meta.env.BASE_URL}data/${path}`;
}

/** Descarga un JSON; null si no existe. (El servidor de Vite devuelve index.html para rutas desconocidas.) */
async function fetchJson<T>(path: string): Promise<T | null> {
  const res = await fetch(dataUrl(path));
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Error ${res.status} al cargar ${path}`);
  if (!(res.headers.get("content-type") ?? "").includes("json")) return null;
  return (await res.json()) as T;
}

export function loadManifest(): Promise<Manifest | null> {
  return fetchJson<Manifest>("manifest.json");
}

export function manifestCoverage(manifest: Manifest): Coverage | null {
  if (manifest.ephemeris.length === 0) return null;
  const sorted = [...manifest.ephemeris].sort((a, b) => parseUtc(a.start) - parseUtc(b.start));
  return { start: sorted[0].start, end: sorted[sorted.length - 1].end };
}

const ephemerisCache = new Map<string, Promise<Ephemeris>>();

function loadEphemerisFile(file: string): Promise<Ephemeris> {
  let p = ephemerisCache.get(file);
  if (!p) {
    p = fetchJson<Ephemeris>(file.replace(/^\/?/, "")).then((e) => {
      if (!e) throw new Error(`Falta ${file}`);
      return e;
    });
    ephemerisCache.set(file, p);
  }
  return p;
}

/** Carga y une los años de efeméride que cubren [start, end]. */
export async function loadEphemerisWindow(manifest: Manifest, start: string, end: string): Promise<Ephemeris> {
  const s = parseUtc(start);
  const e = parseUtc(end);
  const files = manifest.ephemeris.filter((f) => parseUtc(f.end) >= s && parseUtc(f.start) <= e);
  if (files.length === 0) throw new RangeError(`No hay efeméride para ${start} – ${end}`);
  return mergeEphemerides(await Promise.all(files.map((f) => loadEphemerisFile(f.file))));
}

/**
 * Une trozos contiguos (mismo marco y paso). Se admite que un trozo repita la última muestra
 * del anterior; un hueco entre trozos es un error.
 */
export function mergeEphemerides(chunks: Ephemeris[]): Ephemeris {
  if (chunks.length === 0) throw new RangeError("mergeEphemerides: sin trozos");
  const sorted = [...chunks].sort((a, b) => parseUtc(a.start) - parseUtc(b.start));
  const first = sorted[0];
  const out: Ephemeris = { ...first, sun: [...first.sun], earth: [...first.earth] };
  const t0 = parseUtc(first.start);

  for (const c of sorted.slice(1)) {
    if (c.frame !== out.frame || c.step_minutes !== out.step_minutes || c.aberration_correction !== out.aberration_correction) {
      throw new RangeError(`Trozo incompatible (${c.start}): marco, paso o corrección distintos`);
    }
    const fi = fractionalIndex(t0, out.step_minutes, parseUtc(c.start));
    const k = Math.round(fi);
    if (Math.abs(fi - k) > 1e-6) throw new RangeError(`Trozo desalineado con el paso (${c.start})`);
    if (k > out.count) throw new RangeError(`Hueco en la efeméride antes de ${c.start}`);
    const skip = out.count - k; // muestras repetidas al principio del trozo
    out.sun.push(...c.sun.slice(skip));
    out.earth.push(...c.earth.slice(skip));
    out.count = out.sun.length;
    out.synthetic = Boolean(out.synthetic || c.synthetic);
  }
  return out;
}

export function loadHorizon(siteId: string): Promise<HorizonProfile | null> {
  return fetchJson<HorizonProfile>(`horizons/${siteId}.json`);
}

/** Efeméride sintética desde un día lunar antes de `now` hasta tres después. */
export function syntheticDataset(nowMs: number = Date.now()): { ephemeris: Ephemeris; coverage: Coverage } {
  const today = toIsoUtc(Math.floor(nowMs / 86_400_000) * 86_400_000);
  const start = addLunarDays(today, -1);
  const ephemeris = makeSyntheticEphemeris({ start, stepMinutes: 60, count: Math.ceil(4 * 29.530588853 * 24) + 1 });
  const end = toIsoUtc(parseUtc(start) + (ephemeris.count - 1) * 3_600_000);
  return { ephemeris, coverage: { start, end } };
}
