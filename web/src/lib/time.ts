/**
 * Utilidades de tiempo. Todo en UTC (milisegundos desde la época Unix).
 *
 * Nota: Date de JS no modela segundos intercalares. El instante de la muestra i se define como
 * `start + i·step` en UTC civil, así que el pipeline debe generar cada muestra a partir de su
 * hora UTC (str2et por muestra), no avanzando en ET. La diferencia sería de ≤ 1 s por año.
 */

export const MS_PER_MINUTE = 60_000;
export const MS_PER_HOUR = 3_600_000;
export const MS_PER_DAY = 86_400_000;

/** Mes sinódico medio (constante astronómica estándar): duración media de un día lunar. */
export const SYNODIC_MONTH_DAYS = 29.530588853;

const ISO_UTC_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?Z$/;

/** Convierte "YYYY-MM-DDTHH:MM[:SS[.sss]]Z" a ms. Exige la Z para evitar horas locales. */
export function parseUtc(iso: string): number {
  if (!ISO_UTC_RE.test(iso)) throw new RangeError(`Fecha no ISO 8601 UTC: "${iso}"`);
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) throw new RangeError(`Fecha inválida: "${iso}"`);
  return ms;
}

/** ms → "YYYY-MM-DDTHH:MM:SSZ" (sin milisegundos). */
export function toIsoUtc(ms: number): string {
  return new Date(ms).toISOString().replace(/\.\d{3}Z$/, "Z");
}

export function addDays(iso: string, days: number): string {
  return toIsoUtc(parseUtc(iso) + days * MS_PER_DAY);
}

/** Desplaza n días lunares (meses sinódicos medios). Atajo "+1 día lunar". */
export function addLunarDays(iso: string, n: number): string {
  return addDays(iso, n * SYNODIC_MONTH_DAYS);
}

/** Instante (ms) de la muestra i de una serie uniforme. */
export function sampleTimeMs(startMs: number, stepMinutes: number, i: number): number {
  return startMs + i * stepMinutes * MS_PER_MINUTE;
}

/** Índice fraccionario de un instante dentro de una serie uniforme (puede ser < 0 o > n−1). */
export function fractionalIndex(startMs: number, stepMinutes: number, tMs: number): number {
  return (tMs - startMs) / (stepMinutes * MS_PER_MINUTE);
}
