/**
 * Estado global de la app (zustand).
 * - Escenario en edición: coordenadas libres + fecha de referencia.
 * - Escenarios a comparar (sitio + fecha, máx. 4) y escenario activo para el detalle.
 * Futuro: sitio curado seleccionado, ventana configurable, vista activa, instante de la animación.
 */
import { create } from "zustand";
import type { Scenario } from "../types";

export const MAX_SCENARIOS = 4;

export interface Coords {
  lat: number;
  lon: number;
}

export interface AppState {
  /** Coordenadas libres en edición (horizonte geométrico). */
  customCoords: Coords;
  /** Fecha de referencia ISO UTC; null = "ahora" (ajustado a la cobertura de datos). */
  date: string | null;
  setCustomCoords: (c: Coords) => void;
  setDate: (iso: string | null) => void;

  scenarios: Scenario[];
  activeScenarioId: string | null;
  /** Ignora la petición si ya hay MAX_SCENARIOS o el id existe. TODO: avisar en la UI. */
  addScenario: (scenario: Scenario) => void;
  removeScenario: (id: string) => void;
  setActiveScenario: (id: string | null) => void;
}

export const useAppStore = create<AppState>()((set) => ({
  customCoords: { lat: 0, lon: 0 },
  date: null,
  setCustomCoords: (customCoords) => set({ customCoords }),
  setDate: (date) => set({ date }),

  scenarios: [],
  activeScenarioId: null,
  addScenario: (scenario) =>
    set((s) =>
      s.scenarios.length >= MAX_SCENARIOS || s.scenarios.some((x) => x.id === scenario.id)
        ? s
        : { scenarios: [...s.scenarios, scenario] },
    ),
  removeScenario: (id) =>
    set((s) => ({
      scenarios: s.scenarios.filter((x) => x.id !== id),
      activeScenarioId: s.activeScenarioId === id ? null : s.activeScenarioId,
    })),
  setActiveScenario: (id) => set({ activeScenarioId: id }),
}));
