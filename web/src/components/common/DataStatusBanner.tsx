/**
 * Aviso permanente sobre el origen de los datos. Si son sintéticos, debe verse siempre:
 * nunca se presentan como posiciones reales del Sol o la Tierra.
 */
export interface DataStatusBannerProps {
  synthetic: boolean;
  error?: string | null;
}

export function DataStatusBanner({ synthetic, error }: DataStatusBannerProps) {
  if (error) {
    return (
      <div role="alert" className="pointer-events-auto hud-box rounded-lg border-rose-500/70 bg-rose-950/60 px-3 py-1.5 text-xs font-mono text-rose-200 flex items-center gap-2">
        <span className="text-rose-400 font-bold" aria-hidden="true">✖</span>
        <span><strong className="text-rose-300">ERROR DE DATOS:</strong> {error}</span>
      </div>
    );
  }
  if (!synthetic) return null;
  return (
    <div role="status" className="pointer-events-auto rounded-lg border border-amber-400/60 bg-amber-950/70 backdrop-blur px-3 py-1.5 text-xs font-mono text-amber-100 flex items-center gap-2 shadow-[0_0_14px_rgba(255,170,0,0.2)]">
      <span className="text-amber-300 font-bold" aria-hidden="true">▲</span>
      <span>
        <strong className="text-amber-300">DATOS SINTÉTICOS DE PRUEBA.</strong> El Sol y la Tierra siguen un modelo
        simplificado; no representan su posición real. Se sustituirán por la efeméride calculada con SPICE.
      </span>
    </div>
  );
}
