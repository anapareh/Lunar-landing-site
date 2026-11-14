/**
 * Utilidades de la franja del ciclo (línea de tiempo del pie): instante ↔ posición, y
 * qué muestra de la serie representa cada columna de píxeles.
 */

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

/** Fracción [0, 1] de un instante dentro de [t0, t1]. */
export function fractionOf(tMs: number, t0: number, t1: number): number {
  return t1 > t0 ? clamp01((tMs - t0) / (t1 - t0)) : 0;
}

/** Instante en la fracción f de [t0, t1]. */
export function timeAtFraction(f: number, t0: number, t1: number): number {
  return t0 + clamp01(f) * (t1 - t0);
}

/** Índice de muestra (0..n−1) que representa cada una de `columns` columnas. */
export function columnSamples(n: number, columns: number): number[] {
  if (n <= 0 || columns <= 0) return [];
  return Array.from({ length: columns }, (_, c) =>
    Math.min(n - 1, Math.round(((c + 0.5) / columns) * (n - 1))),
  );
}
