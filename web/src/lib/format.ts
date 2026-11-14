/**
 * Formato de números, ángulos, duraciones y fechas para la interfaz (es-ES, siempre UTC).
 */

const nf1 = new Intl.NumberFormat("es-ES", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const nf0 = new Intl.NumberFormat("es-ES", { maximumFractionDigits: 0 });

const dateTimeUtc = new Intl.DateTimeFormat("es-ES", {
  timeZone: "UTC",
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const dayMonthUtc = new Intl.DateTimeFormat("es-ES", { timeZone: "UTC", day: "numeric", month: "short" });

/** 12,3° */
export function formatDeg(deg: number): string {
  return `${nf1.format(deg)}°`;
}

/** 0,37 → "37 %" */
export function formatPercent(fraction: number): string {
  return `${nf0.format(fraction * 100)} %`;
}

/** 354,3 h */
export function formatHours(hours: number): string {
  return `${nf1.format(hours)} h`;
}

/** Duración legible: "3 d 4 h", "5 h 12 min", "12 min", "< 1 min"; null → "—". */
export function formatDuration(hours: number | null): string {
  if (hours === null) return "—";
  if (hours < 1 / 60) return "< 1 min";
  const totalMin = Math.round(hours * 60);
  const d = Math.floor(totalMin / 1440);
  const h = Math.floor((totalMin % 1440) / 60);
  const m = totalMin % 60;
  if (d > 0) return h > 0 ? `${d} d ${h} h` : `${d} d`;
  if (h > 0) return m > 0 ? `${h} h ${m} min` : `${h} h`;
  return `${m} min`;
}

/** "14 nov 2026, 09:30 UTC" */
export function formatUtc(msOrIso: number | string): string {
  const d = typeof msOrIso === "number" ? new Date(msOrIso) : new Date(msOrIso);
  return `${dateTimeUtc.format(d)} UTC`;
}

/** "14 nov" (para ejes) */
export function formatDayMonth(ms: number): string {
  return dayMonthUtc.format(new Date(ms));
}
