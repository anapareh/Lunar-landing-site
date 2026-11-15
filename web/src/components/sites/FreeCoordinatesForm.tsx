/**
 * Coordenadas personalizadas (compacto, maqueta "Selene"): latitud planetocéntrica y longitud
 * este positiva (convención del contrato). En 85°–90° S se evalúa el nodo LOLA más cercano;
 * en el resto, horizonte geométrico.
 */
import { useEffect, useState, type FormEvent } from "react";
import type { Coords } from "../../store/useAppStore";
import { useT } from "../../i18n";
import { currentLocale } from "../../lib/format";

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
  const west = currentLocale() === "en-GB" ? "W" : "O";
  return `${Math.abs(lat).toFixed(2)}°${lat >= 0 ? "N" : "S"} ${Math.abs(lon).toFixed(2)}°${lon >= 0 ? "E" : west}`;
}

export function FreeCoordinatesForm({ value, onChange, onAddCompare }: FreeCoordinatesFormProps) {
  const t = useT();
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

  const input = (id: string, label: string, v: string, set: (s: string) => void, ok: boolean, hint: string) => (
    <label htmlFor={id} className="flex flex-col gap-0.5">
      <span className="text-[9px] font-mono text-steel">{label}</span>
      <input
        id={id}
        inputMode="decimal"
        value={v}
        onChange={(e) => set(e.target.value)}
        aria-invalid={!ok}
        title={hint}
        className={`coord-input w-full ${ok ? "" : "!border-red-500/70"}`}
      />
    </label>
  );

  return (
    <form onSubmit={submit} noValidate className="p-2 border-t border-borderline space-y-1.5">
      <div className="text-[10px] font-mono text-steel uppercase">{t.coords.title}</div>
      <div className="grid grid-cols-[1fr_1fr_auto] items-end gap-1.5">
        {input("lat", t.coords.lat, lat, setLat, latV !== null, t.coords.latHint)}
        {input("lon", t.coords.lon, lon, setLon, lonV !== null, t.coords.lonHint)}
        <button type="submit" disabled={latV === null || lonV === null} className="btn-control px-2 py-1 rounded text-[11px]">
          {t.coords.apply}
        </button>
      </div>
      {onAddCompare && (
        <button
          type="button"
          onClick={onAddCompare}
          title={t.coords.addCompareTitle}
          className="w-full btn-control px-2 py-1 rounded text-[11px] font-mono !text-sky-400"
        >
          {t.coords.addCompare}
        </button>
      )}
      <p className="text-[10px] text-steel leading-snug">{t.coords.note}</p>
    </form>
  );
}
