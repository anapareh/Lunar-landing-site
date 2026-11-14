/**
 * Cajón inferior "Análisis temporal": se despliega sobre el pie con la gráfica de elevación.
 */
import type { ReactNode } from "react";

export interface BottomDrawerProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}

export function BottomDrawer({ open, onClose, children }: BottomDrawerProps) {
  return (
    <section
      id="analysis-drawer"
      aria-label="Análisis temporal"
      hidden={!open}
      className="relative z-20 pointer-events-auto mx-2.5 sm:mx-3.5 mb-2 console-panel rounded-md p-3 pr-12"
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute top-2 right-2 btn-control px-2 py-0.5 rounded text-xs"
        aria-label="Cerrar análisis temporal"
      >
        ✕
      </button>
      {children}
    </section>
  );
}
