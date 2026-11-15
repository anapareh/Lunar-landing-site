/**
 * Idioma de la interfaz (ES / EN). `useT()` devuelve el diccionario activo; el idioma vive en el
 * store (por defecto español, `?lang=en` en la URL, recordado en localStorage).
 */
import { useAppStore } from "../store/useAppStore";
import es, { type Dict } from "./es";
import en from "./en";
import textsEs from "../content/texts.es.json";
import textsEn from "../content/texts.en.json";

export type Lang = "es" | "en";
export type { Dict };

export const DICTS: Record<Lang, Dict> = { es, en };

export function useT(): Dict {
  return DICTS[useAppStore((s) => s.lang)];
}

/** Textos divulgativos (los mantiene el equipo de contenido). */
export function useEduTexts() {
  return useAppStore((s) => s.lang) === "en" ? textsEn : textsEs;
}
