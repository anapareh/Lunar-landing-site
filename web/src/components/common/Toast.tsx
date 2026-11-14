/**
 * Aviso breve en la parte superior (p. ej. "Añadido a la comparativa"). Se oculta solo.
 */
import { useEffect, useState } from "react";
import { useAppStore } from "../../store/useAppStore";

const VISIBLE_MS = 2600;

export function Toast() {
  const toast = useAppStore((s) => s.toast);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!toast) return;
    setVisible(true);
    const t = setTimeout(() => setVisible(false), VISIBLE_MS);
    return () => clearTimeout(t);
  }, [toast]);

  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed top-14 left-1/2 -translate-x-1/2 z-50 transition-all duration-200 pointer-events-none ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-3"
      }`}
    >
      {toast && (
        <div className="console-panel px-3.5 py-1.5 rounded-md text-xs font-mono text-telemetry flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-sky-400" aria-hidden="true" />
          {toast.message}
        </div>
      )}
    </div>
  );
}
