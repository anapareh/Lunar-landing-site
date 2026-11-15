/**
 * Formato de números, ángulos, duraciones y fechas para la interfaz (siempre UTC).
 * El locale sigue al idioma de la interfaz (es-ES por defecto, en-GB en inglés): `setFormatLocale`.
 */

type Lang = "es" | "en";

let lang: Lang = "es";
let nf1 = new Intl.NumberFormat("es-ES", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
let nf0 = new Intl.NumberFormat("es-ES", { maximumFractionDigits: 0 });
let dateTimeUtc = new Intl.DateTimeFormat("es-ES", { timeZone: "UTC", day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
let dayMonthUtc = new Intl.DateTimeFormat("es-ES", { timeZone: "UTC", day: "numeric", month: "short" });
let dateUtc = new Intl.DateTimeFormat("es-ES", { timeZone: "UTC", day: "numeric", month: "short", year: "numeric" });
let shortDateTimeUtc = new Intl.DateTimeFormat("es-ES", { timeZone: "UTC", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

/** Cambia el locale de todos los formatos (lo llama el store al cambiar de idioma). */
export function setFormatLocale(next: Lang): void {
  lang = next;
  const loc = next === "en" ? "en-GB" : "es-ES";
  nf1 = new Intl.NumberFormat(loc, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  nf0 = new Intl.NumberFormat(loc, { maximumFractionDigits: 0 });
  dateTimeUtc = new Intl.DateTimeFormat(loc, { timeZone: "UTC", day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  dayMonthUtc = new Intl.DateTimeFormat(loc, { timeZone: "UTC", day: "numeric", month: "short" });
  dateUtc = new Intl.DateTimeFormat(loc, { timeZone: "UTC", day: "numeric", month: "short", year: "numeric" });
  shortDateTimeUtc = new Intl.DateTimeFormat(loc, { timeZone: "UTC", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

/** Locale de Intl activo ("es-ES" | "en-GB"). */
export const currentLocale = () => (lang === "en" ? "en-GB" : "es-ES");

/** 12,3° (es) · 12.3° (en) */
export function formatDeg(deg: number): string {
  return `${nf1.format(deg)}°`;
}

/** 0,37 → "37 %" (es) · "37%" (en) */
export function formatPercent(fraction: number): string {
  return lang === "en" ? `${nf0.format(fraction * 100)}%` : `${nf0.format(fraction * 100)} %`;
}

/** 354,3 h */
export function formatHours(hours: number): string {
  return `${nf1.format(hours)} h`;
}

/** Número con un decimal según el locale ("1,0" / "1.0"). */
export function formatNumber1(v: number): string {
  return nf1.format(v);
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

/** "20 jul 1969" */
export function formatDate(msOrIso: number | string): string {
  return dateUtc.format(new Date(msOrIso));
}

/** "20 jul, 00:00" */
export function formatShortDateTime(msOrIso: number | string): string {
  return shortDateTimeUtc.format(new Date(msOrIso));
}
