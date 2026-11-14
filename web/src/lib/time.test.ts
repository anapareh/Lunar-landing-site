import { describe, expect, it } from "vitest";
import {
  MS_PER_HOUR,
  SYNODIC_MONTH_DAYS,
  addDays,
  addLunarDays,
  fractionalIndex,
  parseUtc,
  sampleTimeMs,
  toIsoUtc,
} from "./time";

describe("time", () => {
  it("parseUtc acepta ISO UTC y rechaza horas sin Z", () => {
    expect(parseUtc("2000-01-01T00:00:00Z")).toBe(Date.UTC(2000, 0, 1));
    expect(parseUtc("2000-01-01T12:30Z")).toBe(Date.UTC(2000, 0, 1, 12, 30));
    expect(() => parseUtc("2000-01-01T00:00:00")).toThrow(RangeError);
    expect(() => parseUtc("2000-01-01T00:00:00+02:00")).toThrow(RangeError);
    expect(() => parseUtc("ayer")).toThrow(RangeError);
  });

  it("toIsoUtc es la inversa de parseUtc y quita los milisegundos", () => {
    const iso = "1969-07-20T20:17:00Z";
    expect(toIsoUtc(parseUtc(iso))).toBe(iso);
    expect(toIsoUtc(Date.UTC(2026, 10, 14, 1, 2, 3, 456))).toBe("2026-11-14T01:02:03Z");
  });

  it("sumar días y días lunares", () => {
    expect(addDays("2026-02-28T00:00:00Z", 1)).toBe("2026-03-01T00:00:00Z");
    const t0 = parseUtc("2026-01-01T00:00:00Z");
    const t1 = parseUtc(addLunarDays("2026-01-01T00:00:00Z", 1));
    expect((t1 - t0) / 86_400_000).toBeCloseTo(SYNODIC_MONTH_DAYS, 4);
  });

  it("índice fraccionario y tiempo de muestra son inversos", () => {
    const start = parseUtc("2026-01-01T00:00:00Z");
    expect(sampleTimeMs(start, 60, 3)).toBe(start + 3 * MS_PER_HOUR);
    expect(fractionalIndex(start, 60, start + 90 * 60_000)).toBe(1.5);
    expect(fractionalIndex(start, 30, start - 30 * 60_000)).toBe(-1);
  });
});
