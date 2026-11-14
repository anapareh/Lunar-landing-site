/**
 * Indica qué horizonte se está aplicando. Debe acompañar a toda métrica (decisión de arquitectura).
 */
import type { HorizonLevel } from "../../types";

const TEXT: Record<HorizonLevel, { label: string; title: string }> = {
  dem: { label: "Horizonte con relieve (LOLA)", title: "Perfil de horizonte calculado a partir del relieve LOLA" },
  geometric: {
    label: "Horizonte geométrico (sin relieve)",
    title: "Horizonte a 0°, como si la Luna fuera una esfera lisa. El relieve real puede adelantar el ocaso.",
  },
};

export function HorizonLevelBadge({ level }: { level: HorizonLevel }) {
  const t = TEXT[level];
  return (
    <span className={`badge badge-${level}`} title={t.title}>
      {t.label}
    </span>
  );
}
