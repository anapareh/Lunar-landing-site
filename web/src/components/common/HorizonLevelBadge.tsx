/**
 * Indica qué horizonte se está aplicando. Debe acompañar a toda métrica (decisión de arquitectura).
 */
import type { HorizonLevel } from "../../types";

const TEXT: Record<HorizonLevel, { label: string; title: string; cls: string }> = {
  dem: {
    label: "HORIZONTE LOLA",
    title: "Perfil de horizonte calculado a partir del relieve LOLA",
    cls: "bg-emerald-500/15 text-emerald-200 border-emerald-400/50",
  },
  geometric: {
    label: "HORIZONTE GEOMÉTRICO",
    title: "Horizonte a 0°, como si la Luna fuera una esfera lisa. El relieve real puede adelantar el ocaso.",
    cls: "bg-slate-800/80 text-slate-300 border-slate-600",
  },
};

export function HorizonLevelBadge({ level }: { level: HorizonLevel }) {
  const t = TEXT[level];
  return (
    <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border whitespace-nowrap ${t.cls}`} title={t.title}>
      {t.label}
    </span>
  );
}
