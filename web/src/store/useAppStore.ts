/**
 * Estado global de la app (zustand).
 * - Escenario en edición: coordenadas libres + fecha de referencia (inicio de la ventana).
 * - Tiempo: `cursor` es el instante mostrado dentro de la ventana; la simulación lo hace avanzar.
 * - Interfaz: modo Simple/Avanzado, escena (globo o horizonte local), cajón de análisis, vista del globo.
 * - Escenarios a comparar (sitio + fecha, máx. 4) y escenario activo.
 */
import { create } from "zustand";
import type { Scenario } from "../types";
import type { GlobeView } from "../components/map/LunarGlobe";
import { parseUrlState } from "../lib/urlState";
import { setFormatLocale } from "../lib/format";

/** Estado inicial opcional desde la URL (?lat=&lon=&fecha=&modo=&vista=). */
const initial = parseUrlState(typeof window !== "undefined" ? window.location.search : "");

const LANG_KEY = "apollo-atlas-lang";
/** Idioma inicial: URL (?lang=) → recordado en el navegador → español. */
function initialLang(): Lang {
  if (initial.lang) return initial.lang;
  try {
    const v = window.localStorage.getItem(LANG_KEY);
    if (v === "es" || v === "en") return v;
  } catch {
    /* almacenamiento no disponible */
  }
  return "es";
}
function applyLang(lang: Lang) {
  setFormatLocale(lang);
  if (typeof document !== "undefined") document.documentElement.lang = lang;
}
const startLang = typeof window !== "undefined" ? initialLang() : "es";
applyLang(startLang);

export const MAX_SCENARIOS = 4;

/** Velocidades de simulación: segundos simulados por segundo real. */
export const SIM_SPEEDS = [
  { label: "1 h/s", value: 3_600 },
  { label: "6 h/s", value: 21_600 },
  { label: "1 d/s", value: 86_400 },
] as const;

export interface Coords {
  lat: number;
  lon: number;
}

export type AppMode = "simple" | "advanced";
export type SceneMode = "globe" | "local";
export type Sheet = "sites" | "cond" | null;
export type Lang = "es" | "en";

export interface AppState {
  /** Coordenadas libres en edición (horizonte geométrico). */
  customCoords: Coords;
  /** Fecha de referencia ISO UTC; null = "ahora" (ajustado a la cobertura de datos). */
  date: string | null;
  setCustomCoords: (c: Coords) => void;
  /** Cambia la fecha de referencia y devuelve el cursor al inicio de la nueva ventana. */
  setDate: (iso: string | null) => void;

  /** Instante mostrado (ISO UTC) dentro de la ventana; null = la fecha de referencia. */
  cursor: string | null;
  setCursor: (iso: string | null) => void;
  playing: boolean;
  setPlaying: (p: boolean) => void;
  speed: number;
  setSpeed: (s: number) => void;

  mode: AppMode;
  /** Cambia el modo; en Simple vuelve a la vista de globo. */
  setMode: (m: AppMode) => void;
  /** Escena principal: globo 3D u horizonte local (vista desde la superficie). */
  scene: SceneMode;
  setScene: (s: SceneMode) => void;
  /** Móvil: hoja inferior abierta (panel de sitios o de condiciones). */
  sheet: Sheet;
  /** Idioma de la interfaz. */
  lang: Lang;
  setLang: (l: Lang) => void;
  toggleSheet: (s: Exclude<Sheet, null>) => void;
  closeSheet: () => void;
  /** Retícula selenográfica del globo. */
  showGrid: boolean;
  toggleGrid: () => void;
  drawerOpen: boolean;
  setDrawerOpen: (open: boolean) => void;
  /** Petición de vista para el globo; `n` cambia en cada petición. */
  globeView: { view: GlobeView; n: number };
  requestGlobeView: (view: GlobeView) => void;

  scenarios: Scenario[];
  activeScenarioId: string | null;
  /** Añade si hay hueco y no está repetido; devuelve qué ha pasado. */
  addScenario: (scenario: Scenario) => "added" | "duplicate" | "full";
  removeScenario: (id: string) => void;
  setActiveScenario: (id: string | null) => void;
  compareOpen: boolean;
  setCompareOpen: (open: boolean) => void;

  /** Aviso breve; `n` cambia en cada aviso para reiniciar el temporizador. */
  toast: { message: string; n: number } | null;
  notify: (message: string) => void;
}

export const useAppStore = create<AppState>()((set, get) => ({
  customCoords: initial.lat !== undefined && initial.lon !== undefined ? { lat: initial.lat, lon: initial.lon } : { lat: 0, lon: 0 },
  date: initial.date ?? null,
  setCustomCoords: (customCoords) => set({ customCoords }),
  setDate: (date) => set({ date, cursor: null }),

  cursor: null,
  setCursor: (cursor) => set({ cursor }),
  playing: false,
  setPlaying: (playing) => set({ playing }),
  speed: SIM_SPEEDS[1].value,
  setSpeed: (speed) => set({ speed }),

  mode: initial.mode ?? "simple",
  setMode: (mode) => set((s) => ({ mode, scene: mode === "simple" ? "globe" : s.scene })),
  scene: initial.mode === "advanced" ? initial.scene ?? "globe" : "globe",
  setScene: (scene) => set({ scene }),
  sheet: initial.sheet ?? null,
  lang: startLang,
  setLang: (lang) => {
    applyLang(lang);
    try {
      window.localStorage.setItem(LANG_KEY, lang);
    } catch {
      /* almacenamiento no disponible */
    }
    set({ lang });
  },
  toggleSheet: (sheet) => set((s) => ({ sheet: s.sheet === sheet ? null : sheet })),
  closeSheet: () => set((s) => (s.sheet ? { sheet: null } : s)),
  showGrid: true,
  toggleGrid: () => set((s) => ({ showGrid: !s.showGrid })),
  drawerOpen: false,
  setDrawerOpen: (drawerOpen) => set({ drawerOpen }),
  globeView: { view: "site", n: 0 },
  requestGlobeView: (view) => set((s) => ({ globeView: { view, n: s.globeView.n + 1 } })),

  scenarios: [],
  activeScenarioId: null,
  addScenario: (scenario) => {
    const { scenarios } = get();
    if (scenarios.some((x) => x.id === scenario.id)) return "duplicate";
    if (scenarios.length >= MAX_SCENARIOS) return "full";
    set({ scenarios: [...scenarios, scenario] });
    return "added";
  },
  removeScenario: (id) =>
    set((s) => ({
      scenarios: s.scenarios.filter((x) => x.id !== id),
      activeScenarioId: s.activeScenarioId === id ? null : s.activeScenarioId,
    })),
  setActiveScenario: (id) => set({ activeScenarioId: id }),
  compareOpen: false,
  setCompareOpen: (compareOpen) => set({ compareOpen }),

  toast: null,
  notify: (message) => set((s) => ({ toast: { message, n: (s.toast?.n ?? 0) + 1 } })),
}));
