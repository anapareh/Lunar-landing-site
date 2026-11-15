/**
 * Indica qué horizonte se está aplicando. Debe acompañar a toda métrica (decisión de arquitectura).
 */
import type { HorizonLevel } from "../../types";
import { useT } from "../../i18n";

const CLS: Record<HorizonLevel, string> = {
  dem: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  geometric: "bg-obsidian text-steel border-borderline",
};

export function HorizonLevelBadge({ level }: { level: HorizonLevel }) {
  const b = useT().badge;
  const label = level === "dem" ? b.demLabel : b.geometricLabel;
  const title = level === "dem" ? b.demTitle : b.geometricTitle;
  return (
    <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border whitespace-nowrap ${CLS[level]}`} title={title}>
      {label}
    </span>
  );
}
