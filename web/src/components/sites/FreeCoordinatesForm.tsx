/**
 * Coordenadas libres: latitud planetocéntrica y longitud este positiva (convención del contrato).
 * Sin perfil de relieve: se aplica el horizonte geométrico.
 */
import { useEffect, useState, type FormEvent } from "react";
import type { Coords } from "../../store/useAppStore";

export interface FreeCoordinatesFormProps {
  value: Coords;
  onChange: (c: Coords) => void;
  /** Añade el punto (ya fijado) y la fecha actual a la comparativa. */
  onAddCompare?: () => void;
}

function parse(text: string, min: number, max: number): number | null {
  const v = Number(text.trim().replace(",", "."));
  return text.trim() !== "" && Number.isFinite(v) && v >= min && v <= max ? v : null;
}

export function formatLatLon({ lat, lon }: Coords): string {
  return `${Math.abs(lat).toFixed(2)}°${lat >= 0 ? "N" : "S"} ${Math.abs(lon).toFixed(2)}°${lon >= 0 ? "E" : "O"}`;
}

export function FreeCoordinatesForm({ value, onChange, onAddCompare }: FreeCoordinatesFormProps) {
  const [lat, setLat] = useState(String(value.lat));
  const [lon, setLon] = useState(String(value.lon));
  useEffect(() => {
    setLat(String(value.lat));
    setLon(String(value.lon));
  }, [value.lat, value.lon]);

  const latV = parse(lat, -90, 90);
  const lonV = parse(lon, -180, 180);

  function submit(e: FormEvent) {
    e.preventDefault();
    if (latV !== null && lonV !== null) onChange({ lat: latV, lon: lonV });
  }

  const field = (id: string, label: string, v: string, set: (s: string) => void, ok: boolean, hint: string) => (
    <div
      className={`bg-obsidian border rounded px-2 py-1 transition-colors focus-within:border-sky-400 ${
        ok ? "border-borderline" : "border-red-500/70"
      }`}
    >
      <label htmlFor={id} className="block text-[10px] font-mono text-steel">
        {label}
      </label>
      <input
        id={id}
        inputMode="decimal"
        value={v}
        onChange={(e) => set(e.target.value)}
        aria-invalid={!ok}
        aria-describedby={`${id}-hint`}
        className="w-full bg-transparent text-xs font-mono font-semibold text-telemetry tabular-nums outline-none"
      />
      <span id={`${id}-hint`} className={`block text-[9px] font-mono ${ok ? "text-slate-500" : "text-red-300"}`}>
        {hint}
      </span>
    </div>
  );

  return (
    <form onSubmit={submit} noValidate className="p-2.5 border-b border-borderline bg-obsidian/50">
      <div className="flex items-center justify-between text-[11px] mb-1.5">
        <span className="text-steel font-medium">Coordenadas selenográficas</span>
        <span className="font-mono text-telemetry tabular-nums">{formatLatLon(value)}</span>
      </div>
      <div className="grid grid-cols-2 gap-2 mb-2">
        {field("lat", "LAT (−90° / +90°)", lat, setLat, latV !== null, latV === null ? "Fuera de rango" : "Norte +")}
        {field("lon", "LON (−180° / +180°)", lon, setLon, lonV !== null, lonV === null ? "Fuera de rango" : "Este +")}
      </div>
      <div className="flex gap-1.5">
        <button
          type="submit"
          disabled={latV === null || lonV === null}
          className="flex-1 btn-control py-1.5 px-2.5 rounded text-xs font-medium text-telemetry"
        >
          Fijar coordenadas
        </button>
        {onAddCompare && (
          <button
            type="button"
            onClick={onAddCompare}
            title="Añadir el punto fijado y la fecha actual a la comparativa"
            className="btn-control px-2.5 py-1.5 rounded text-xs font-mono !text-sky-400 hover:!text-sky-300"
          >
            + Comparar
          </button>
        )}
      </div>
      <p className="mt-1.5 text-[11px] text-steel leading-snug">
        Coordenadas libres: sin relieve, se usa el horizonte geométrico.
      </p>
    </form>
  );
}
