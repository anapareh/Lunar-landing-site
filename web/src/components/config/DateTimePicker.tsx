/**
 * Fecha y hora en UTC, limitada a la cobertura de la efeméride, con atajos.
 * El <input type="datetime-local"> no tiene zona horaria: su valor se interpreta como UTC.
 */
import { addLunarDays, parseUtc, toIsoUtc } from "../../lib/time";

export interface DateTimePickerProps {
  /** ISO UTC. */
  value: string;
  min: string;
  max: string;
  /** Fecha prevista de la misión del sitio, si existe. */
  plannedDate?: string | null;
  onChange: (iso: string) => void;
}

const toInput = (iso: string) => iso.slice(0, 16); // "YYYY-MM-DDTHH:MM"
const fromInput = (v: string) => `${v}:00Z`;

export function DateTimePicker({ value, min, max, plannedDate, onChange }: DateTimePickerProps) {
  const inRange = (iso: string) => parseUtc(iso) >= parseUtc(min) && parseUtc(iso) <= parseUtc(max);
  const now = toIsoUtc(Math.floor(Date.now() / 60_000) * 60_000);
  const shortcuts: { label: string; iso: string | null }[] = [
    { label: "Ahora", iso: now },
    { label: "−1 día lunar", iso: addLunarDays(value, -1) },
    { label: "+1 día lunar", iso: addLunarDays(value, 1) },
    { label: "Fecha prevista", iso: plannedDate ?? null },
  ];

  return (
    <div className="card form">
      <h2 className="card-title">Fecha y hora</h2>
      <div className="field">
        <label htmlFor="when">Fecha de referencia (UTC)</label>
        <input
          id="when"
          type="datetime-local"
          value={toInput(value)}
          min={toInput(min)}
          max={toInput(max)}
          onChange={(e) => {
            if (!e.target.value) return;
            const iso = fromInput(e.target.value);
            if (inRange(iso)) onChange(iso);
          }}
        />
      </div>
      <div className="shortcuts" role="group" aria-label="Atajos de fecha">
        {shortcuts.map((s) => {
          const usable = s.iso !== null && inRange(s.iso);
          return (
            <button
              key={s.label}
              type="button"
              className="ghost"
              disabled={!usable}
              title={s.iso === null ? "Elige un sitio con fecha prevista" : usable ? undefined : "Fuera del rango de datos"}
              onClick={() => s.iso && onChange(s.iso)}
            >
              {s.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
