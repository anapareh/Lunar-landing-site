/**
 * Coordenadas libres: latitud planetocéntrica y longitud este positiva (convención del contrato).
 * Sin perfil de relieve: se aplica el horizonte geométrico y se avisa.
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

  return (
    <form className="card form" onSubmit={submit} noValidate>
      <h2 className="card-title">Coordenadas libres</h2>
      <div className="field">
        <label htmlFor="lat">Latitud (°)</label>
        <input
          id="lat"
          inputMode="decimal"
          value={lat}
          onChange={(e) => setLat(e.target.value)}
          aria-invalid={latV === null}
          aria-describedby="lat-help"
        />
        <small id="lat-help" className={latV === null ? "field-error" : "field-help"}>
          {latV === null ? "Entre −90 (polo sur) y 90 (polo norte)" : "Norte positivo"}
        </small>
      </div>
      <div className="field">
        <label htmlFor="lon">Longitud (°)</label>
        <input
          id="lon"
          inputMode="decimal"
          value={lon}
          onChange={(e) => setLon(e.target.value)}
          aria-invalid={lonV === null}
          aria-describedby="lon-help"
        />
        <small id="lon-help" className={lonV === null ? "field-error" : "field-help"}>
          {lonV === null ? "Entre −180 y 180" : "Este positivo"}
        </small>
      </div>
      <button type="submit" disabled={latV === null || lonV === null}>
        Ver este punto
      </button>
      <p className="note">Sin datos de relieve para coordenadas libres: se usa el horizonte geométrico.</p>
    </form>
  );
}
