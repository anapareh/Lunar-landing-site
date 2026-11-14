/**
 * Indica qué horizonte se está aplicando. Debe acompañar a toda métrica (decisión de arquitectura).
 */
import type { HorizonLevel } from "../../types";

const TEXT: Record<HorizonLevel, { label: string; title: string; cls: string }> = {
  dem: {
    label: "HORIZONTE LOLA",
    title: "Perfil de horizonte calculado a partir del relieve LOLA",
    cls: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  },
  geometric: {
    label: "HORIZONTE GEOMÉTRICO",
    title: "Horizonte a 0°, como si la Luna fuera una esfera lisa. El relieve real puede adelantar el ocaso.",
    cls: "bg-obsidian text-steel border-borderline",
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
