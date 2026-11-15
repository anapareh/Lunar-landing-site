/**
 * Aviso permanente sobre el origen de los datos. Si son sintéticos, debe verse siempre:
 * nunca se presentan como posiciones reales del Sol o la Tierra.
 */
import { useT } from "../../i18n";

export interface DataStatusBannerProps {
  synthetic: boolean;
  error?: string | null;
}

export function DataStatusBanner({ synthetic, error }: DataStatusBannerProps) {
  const b = useT().banner;
  if (error) {
    return (
      <div role="alert" className="pointer-events-auto bg-red-950/90 border border-red-500/70 text-red-100 px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-2 shadow-lg">
        <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" aria-hidden="true" />
        <span>
          <strong>{b.error}</strong> {error}
        </span>
      </div>
    );
  }
  if (!synthetic) return null;
  return (
    <div role="status" className="pointer-events-auto bg-amber-950/80 border border-amber-500/50 text-amber-100 px-3 py-1.5 rounded-md text-xs flex items-center gap-2 shadow-lg backdrop-blur">
      <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" aria-hidden="true" />
      <span>
        <strong className="font-semibold text-amber-300">{b.syntheticTitle}</strong> {b.syntheticBody}
      </span>
    </div>
  );
}
