/**
 * Coordenadas libres: latitud planetocéntrica y longitud este positiva (convención del contrato).
 * Sin perfil de relieve: se aplica el horizonte geométrico.
 */
import { useEffect, useState, type FormEvent } from "react";
import type { Coords } from "../../store/useAppStore";

export interface FreeCoordinatesFormProps {
  value: Coords;
  onChange: (c: Coords) => void;
}

function parse(text: string, min: number, max: number): number | null {
  const v = Number(text.trim().replace(",", "."));
  return text.trim() !== "" && Number.isFinite(v) && v >= min && v <= max ? v : null;
}

export function formatLatLon({ lat, lon }: Coords): string {
  return `${Math.abs(lat).toFixed(2)}°${lat >= 0 ? "N" : "S"} ${Math.abs(lon).toFixed(2)}°${lon >= 0 ? "E" : "O"}`;
}

export function FreeCoordinatesForm({ value, onChange }: FreeCoordinatesFormProps) {
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

  const field = (
    id: string,
    label: string,
    v: string,
    set: (s: string) => void,
    ok: boolean,
    hint: string,
  ) => (
    <div className={`bg-void/90 border rounded px-2 py-1 ${ok ? "border-cyan-500/30" : "border-rose-500/70"}`}>
      <label htmlFor={id} className="block text-[9px] font-mono text-slate-400">
        {label}
      </label>
      <input
        id={id}
        inputMode="decimal"
        value={v}
        onChange={(e) => set(e.target.value)}
        aria-invalid={!ok}
        aria-describedby={`${id}-hint`}
        className="w-full bg-transparent text-xs font-mono font-bold text-cyan-200 outline-none"
      />
      <span id={`${id}-hint`} className={`block text-[9px] font-mono ${ok ? "text-slate-500" : "text-rose-300"}`}>
        {hint}
      </span>
    </div>
  );

  return (
    <form onSubmit={submit} noValidate className="p-2.5 border-b border-cyan-500/20 bg-void/60">
      <div className="flex items-center justify-between text-[10px] font-mono text-cyan-300/80 mb-1.5">
        <span>COORDENADAS SELENOGRÁFICAS</span>
        <span className="text-emerald-300">{formatLatLon(value)}</span>
      </div>
      <div className="grid grid-cols-2 gap-2 mb-2">
        {field("lat", "LATITUD (−90/+90)", lat, setLat, latV !== null, latV === null ? "Fuera de rango" : "Norte +")}
        {field("lon", "LONGITUD (−180/+180)", lon, setLon, lonV !== null, lonV === null ? "Fuera de rango" : "Este +")}
      </div>
      <button
        type="submit"
        disabled={latV === null || lonV === null}
        className="w-full btn-sci py-1 px-2 rounded text-xs font-mono font-semibold"
      >
        ⌖ FIJAR PUNTO
      </button>
      <p className="mt-1.5 text-[10px] font-mono text-slate-500 leading-snug">
        Coordenadas libres: sin relieve, se usa el horizonte geométrico.
      </p>
    </form>
  );
}
