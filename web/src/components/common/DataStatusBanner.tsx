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
      <div className="banner banner-critical" role="alert">
        <span className="banner-icon" aria-hidden="true">✕</span>
        <span>
          <strong>Error de datos.</strong> {error}
        </span>
      </div>
    );
  }
  if (!synthetic) return null;
  return (
    <div className="banner banner-warning" role="status">
      <span className="banner-icon" aria-hidden="true">!</span>
      <span>
        <strong>Datos sintéticos de prueba.</strong> El Sol y la Tierra siguen un modelo simplificado para
        desarrollo; no representan su posición real. Se sustituirán por la efeméride calculada con SPICE.
      </span>
    </div>
  );
}
