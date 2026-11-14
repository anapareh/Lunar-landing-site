/**
 * Estado global de la app (zustand): sitios seleccionados y fecha de referencia.
 * Futuro: ventana temporal, sitio activo para el detalle, datos cargados.
 */
import { create } from "zustand";

export interface AppState {
  /** ids de sites.json seleccionados para comparar. */
  selectedSiteIds: string[];
  /** Fecha de referencia (ISO 8601 UTC) o null si no se ha elegido. */
  date: string | null;
  setSelectedSiteIds: (ids: string[]) => void;
  setDate: (date: string | null) => void;
}

export const useAppStore = create<AppState>()((set) => ({
  selectedSiteIds: [],
  date: null,
  setSelectedSiteIds: (ids) => set({ selectedSiteIds: ids }),
  setDate: (date) => set({ date }),
}));
