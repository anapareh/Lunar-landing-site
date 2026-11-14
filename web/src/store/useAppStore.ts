/**
 * Estado global de la app (zustand).
 * Escenarios a comparar (sitio + fecha, máx. 4) y escenario activo para el detalle.
 * Futuro: ventana temporal, coordenadas libres, vista activa, instante de la animación.
 */
import { create } from "zustand";
import type { Scenario } from "../types";

export const MAX_SCENARIOS = 4;

export interface AppState {
  scenarios: Scenario[];
  activeScenarioId: string | null;
  /** Ignora la petición si ya hay MAX_SCENARIOS o el id existe. TODO: avisar en la UI. */
  addScenario: (scenario: Scenario) => void;
  removeScenario: (id: string) => void;
  setActiveScenario: (id: string | null) => void;
}

export const useAppStore = create<AppState>()((set) => ({
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
