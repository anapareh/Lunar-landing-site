/**
 * Condición del punto en un instante según dos hechos calculados: ¿se ve el Sol? ¿se ve la Tierra?
 * Es una clasificación descriptiva (no una puntuación): cuatro casos, sin pesos.
 */
import type { Vector3 } from "../types";
import { surfaceNormal } from "./geo";

export type Condition = "both" | "sun" | "earth" | "none";

export function conditionOf(sunVisible: boolean, earthVisible: boolean): Condition {
  return sunVisible ? (earthVisible ? "both" : "sun") : earthVisible ? "earth" : "none";
}

/**
 * Colores de cada categoría: tres tonos validados con dataviz/validate_palette.js sobre #0a0d12
 * (modo oscuro); "none" es el neutro de ausencia (noche sin Tierra), siempre con leyenda textual.
 */
export const CONDITION_COLOR: Record<Condition, string> = {
  both: "#1aa874",
  sun: "#c98500",
  earth: "#279ad0",
  none: "#262d3a",
};

export const CONDITION_LABEL: Record<Condition, string> = {
  both: "Sol y Tierra",
  sun: "Solo Sol",
  earth: "Solo Tierra",
  none: "Ni Sol ni Tierra",
};

/** Etiqueta corta en mayúsculas para la ficha del punto. */
export const CONDITION_TAG: Record<Condition, string> = {
  both: "SOL + TIERRA",
  sun: "SOL · SIN DTE",
  earth: "NOCHE · CON DTE",
  none: "NOCHE · SIN DTE",
};

/**
 * Condición con horizonte geométrico (Luna lisa) vista desde el centro lunar: para el mapa global.
 * Ignora el relieve, el tamaño del disco y la paralaje (≈ 0,26° para la Tierra): orientativo.
 */
export function geometricCondition(lat: number, lon: number, sunDir: Vector3, earthDir: Vector3): Condition {
  const n = surfaceNormal(lat, lon);
  const s = n[0] * sunDir[0] + n[1] * sunDir[1] + n[2] * sunDir[2];
  const e = n[0] * earthDir[0] + n[1] * earthDir[1] + n[2] * earthDir[2];
  return conditionOf(s > 0, e > 0);
}
