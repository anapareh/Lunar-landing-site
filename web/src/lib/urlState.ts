/**
 * Estado inicial desde la URL, para compartir un escenario o preparar la demo:
 *   ?lat=-89.5&lon=45&fecha=2026-11-20T12:00:00Z&modo=avanzado&vista=local
 * En móvil, `panel=sitios|condiciones` abre esa hoja inferior.
 * Valores inválidos o fuera de rango se ignoran.
 */
export interface UrlState {
  lat?: number;
  lon?: number;
  date?: string;
  mode?: "simple" | "advanced";
  scene?: "globe" | "local";
  sheet?: "sites" | "cond";
}

const ISO_UTC_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?Z$/;

export function parseUrlState(search: string): UrlState {
  const q = new URLSearchParams(search);
  const out: UrlState = {};
  const num = (k: string, min: number, max: number) => {
    const raw = q.get(k);
    if (raw === null || raw.trim() === "") return undefined;
    const v = Number(raw.replace(",", "."));
    return Number.isFinite(v) && v >= min && v <= max ? v : undefined;
  };
  const lat = num("lat", -90, 90);
  const lon = num("lon", -180, 180);
  if (lat !== undefined && lon !== undefined) {
    out.lat = lat;
    out.lon = lon;
  }
  const date = q.get("fecha");
  if (date && ISO_UTC_RE.test(date) && !Number.isNaN(Date.parse(date))) out.date = date.length === 17 ? date.replace("Z", ":00Z") : date;
  const mode = q.get("modo");
  if (mode === "simple") out.mode = "simple";
  if (mode === "avanzado") out.mode = "advanced";
  const scene = q.get("vista");
  if (scene === "global") out.scene = "globe";
  if (scene === "local") out.scene = "local";
  const panel = q.get("panel");
  if (panel === "sitios") out.sheet = "sites";
  if (panel === "condiciones") out.sheet = "cond";
  return out;
}
