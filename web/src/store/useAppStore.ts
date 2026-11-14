/**
 * Estado global de la app (zustand).
 * - Escenario en edición: coordenadas libres + fecha de referencia (inicio de la ventana).
 * - Tiempo: `cursor` es el instante mostrado dentro de la ventana; la simulación lo hace avanzar.
 * - Interfaz HUD: modo técnico/divulgativo, paneles ocultos, cajón de análisis, vista del globo.
 * - Escenarios a comparar (sitio + fecha, máx. 4) y escenario activo.
 */
import { create } from "zustand";
import type { Scenario } from "../types";
import type { GlobeView } from "../components/map/LunarGlobe";

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

export type AppMode = "tech" | "edu";

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
  setMode: (m: AppMode) => void;
  hudCollapsed: boolean;
  toggleHud: () => void;
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
  customCoords: { lat: 0, lon: 0 },
  date: null,
  setCustomCoords: (customCoords) => set({ customCoords }),
  setDate: (date) => set({ date, cursor: null }),

  cursor: null,
  setCursor: (cursor) => set({ cursor }),
  playing: false,
  setPlaying: (playing) => set({ playing }),
  speed: SIM_SPEEDS[1].value,
  setSpeed: (speed) => set({ speed }),

  mode: "tech",
  setMode: (mode) => set({ mode }),
  hudCollapsed: false,
  toggleHud: () => set((s) => ({ hudCollapsed: !s.hudCollapsed })),
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
