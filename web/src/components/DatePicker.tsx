/**
 * Selector de fecha/hora UTC, limitado al rango cubierto por ephemeris.json. TODO.
 */

export interface DatePickerProps {
  /** ISO 8601 UTC o null. */
  value: string | null;
  /** Límites del rango disponible (ISO 8601 UTC). */
  min?: string;
  max?: string;
  onChange: (value: string | null) => void;
}

export function DatePicker(_props: DatePickerProps) {
  return null; // TODO
}
