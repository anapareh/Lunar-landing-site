import { describe, expect, it } from "vitest";
import { makeSyntheticEphemeris } from "./fixtures/syntheticEphemeris";
import { manifestCoverage, mergeEphemerides, syntheticDataset } from "./loaders";
import type { Manifest } from "../types";

describe("mergeEphemerides", () => {
  const a = makeSyntheticEphemeris({ start: "2026-01-01T00:00:00Z", stepMinutes: 60, count: 24 });

  it("une trozos contiguos", () => {
    const b = makeSyntheticEphemeris({ start: "2026-01-02T00:00:00Z", stepMinutes: 60, count: 24 });
    const m = mergeEphemerides([b, a]); // el orden de entrada no importa
    expect(m.start).toBe(a.start);
    expect(m.count).toBe(48);
    expect(m.sun).toHaveLength(48);
    expect(m.earth).toHaveLength(48);
  });

  it("descarta la muestra repetida en la frontera", () => {
    const b = makeSyntheticEphemeris({ start: "2026-01-01T23:00:00Z", stepMinutes: 60, count: 25 });
    expect(mergeEphemerides([a, b]).count).toBe(48);
  });

  it("rechaza huecos, pasos distintos y desalineados", () => {
    const gap = makeSyntheticEphemeris({ start: "2026-01-03T00:00:00Z", stepMinutes: 60, count: 2 });
    const step = makeSyntheticEphemeris({ start: "2026-01-02T00:00:00Z", stepMinutes: 30, count: 2 });
    const off = makeSyntheticEphemeris({ start: "2026-01-02T00:30:00Z", stepMinutes: 60, count: 2 });
    expect(() => mergeEphemerides([a, gap])).toThrow(RangeError);
    expect(() => mergeEphemerides([a, step])).toThrow(RangeError);
    expect(() => mergeEphemerides([a, off])).toThrow(RangeError);
  });
});

describe("cobertura", () => {
  it("del manifest: del primer inicio al último final", () => {
    const m = {
      ephemeris: [
        { file: "ephemeris/2027.json", start: "2027-01-01T00:00:00Z", end: "2027-12-31T23:00:00Z" },
        { file: "ephemeris/2026.json", start: "2026-01-01T00:00:00Z", end: "2026-12-31T23:00:00Z" },
      ],
    } as Manifest;
    expect(manifestCoverage(m)).toEqual({
      start: "2026-01-01T00:00:00Z",
      end: "2027-12-31T23:00:00Z",
      ranges: [{ start: "2026-01-01T00:00:00Z", end: "2027-12-31T23:00:00Z" }],
    });
    expect(manifestCoverage({ ephemeris: [] } as unknown as Manifest)).toBeNull();
  });

  it("del manifest con años sueltos: tramos separados por huecos", () => {
    const m = {
      ephemeris: [
        { file: "ephemeris/1969.json", start: "1969-01-01T00:00:00Z", end: "1969-12-31T23:00:00Z" },
        { file: "ephemeris/2026.json", start: "2026-01-01T00:00:00Z", end: "2026-12-31T23:00:00Z" },
      ],
    } as Manifest;
    expect(manifestCoverage(m)?.ranges).toEqual([
      { start: "1969-01-01T00:00:00Z", end: "1969-12-31T23:00:00Z" },
      { start: "2026-01-01T00:00:00Z", end: "2026-12-31T23:00:00Z" },
    ]);
  });

  it("del conjunto sintético: incluye el instante actual y está marcado como sintético", () => {
    const now = Date.UTC(2026, 10, 14, 10, 0);
    const { ephemeris, coverage } = syntheticDataset(now);
    expect(ephemeris.synthetic).toBe(true);
    expect(Date.parse(coverage.start)).toBeLessThan(now);
    expect(Date.parse(coverage.end)).toBeGreaterThan(now + 2 * 29 * 86_400_000);
  });
});
