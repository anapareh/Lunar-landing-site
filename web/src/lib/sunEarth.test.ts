/**
 * Tests con geometría de resultado conocido (sin datos reales).
 * Marco: +X = lat 0 / lon 0, +Y = lon 90° E, +Z = polo norte.
 */
import { describe, expect, it } from "vitest";
import type { Vector3 } from "../types";
import {
  AU_KM,
  SYNTHETIC_EARTH_DISTANCE_KM,
  makeSyntheticEphemeris,
} from "../data/fixtures/syntheticEphemeris";
import { addDays, SYNODIC_MONTH_DAYS } from "./time";
import {
  MOON_RADIUS_KM,
  computeSunEarthSeries,
  enuBasis,
  interpolateBody,
  observerPosition,
  positionsAt,
  topocentric,
} from "./sunEarth";
import { dot, norm } from "./vec";
import { parseUtc } from "./time";

const FAR = AU_KM;
const EQ0 = { lat: 0, lon: 0 };
/** Un cuerpo a distancia FAR en el horizonte geométrico del centro lunar queda a −atan(R/FAR) desde la superficie. */
const FAR_PARALLAX_DEG = -(Math.atan(MOON_RADIUS_KM / FAR) * 180) / Math.PI;

describe("observador y base local", () => {
  it("la posición del observador está sobre la esfera de referencia", () => {
    expect(norm(observerPosition({ lat: -89.5, lon: 123 }))).toBeCloseTo(MOON_RADIUS_KM, 9);
    expect(norm(observerPosition({ lat: 10, lon: 20, heightKm: 2 }))).toBeCloseTo(MOON_RADIUS_KM + 2, 9);
  });

  it("la base Este-Norte-Arriba es ortonormal", () => {
    for (const [lat, lon] of [[0, 0], [45, 30], [-89.9, -120], [12.3, 179]]) {
      const { east, north, up } = enuBasis(lat, lon);
      expect(dot(east, north)).toBeCloseTo(0, 12);
      expect(dot(east, up)).toBeCloseTo(0, 12);
      expect(dot(north, up)).toBeCloseTo(0, 12);
      expect(norm(east)).toBeCloseTo(1, 12);
      expect(norm(north)).toBeCloseTo(1, 12);
      expect(norm(up)).toBeCloseTo(1, 12);
    }
  });
});

describe("topocentric", () => {
  it("cuerpo en el cénit y en el nadir", () => {
    expect(topocentric([FAR, 0, 0], EQ0).elevation_deg).toBeCloseTo(90, 6);
    expect(topocentric([-FAR, 0, 0], EQ0).elevation_deg).toBeCloseTo(-90, 6);
  });

  it("acimut N=0, E=90, S=180, O=270", () => {
    const cases: [Vector3, number][] = [
      [[0, 0, FAR], 0],
      [[0, FAR, 0], 90],
      [[0, 0, -FAR], 180],
      [[0, -FAR, 0], 270],
    ];
    for (const [pos, az] of cases) {
      const t = topocentric(pos, EQ0);
      expect(t.azimuth_deg).toBeCloseTo(az, 6);
      expect(t.elevation_deg).toBeCloseTo(FAR_PARALLAX_DEG, 9); // horizonte, menos la paralaje solar
    }
  });

  it("desde el polo norte, el Sol en el plano ecuatorial está en el horizonte", () => {
    const t = topocentric([FAR, 0, 0], { lat: 90, lon: 0 });
    expect(t.elevation_deg).toBeCloseTo(FAR_PARALLAX_DEG, 9);
  });

  it("en el polo sur exacto, el 'norte' es el meridiano lon", () => {
    // Desde el polo sur, un cuerpo lejano hacia lon 0 está en la dirección del meridiano 0 → acimut 0.
    expect(topocentric([FAR, 0, 0], { lat: -90, lon: 0 }).azimuth_deg).toBeCloseTo(0, 6);
    // Con lon = 90 como referencia, el mismo cuerpo queda a 90° del meridiano de referencia.
    expect(topocentric([FAR, 0, 0], { lat: -90, lon: 90 }).azimuth_deg).toBeCloseTo(270, 6);
  });

  it("incluye la paralaje: la Tierra en el limbo queda bajo el horizonte geométrico", () => {
    // Observador en lon 90 E, Tierra en +X: desde el centro estaría en el horizonte exacto;
    // desde la superficie baja atan(R / D).
    const D = SYNTHETIC_EARTH_DISTANCE_KM;
    const t = topocentric([D, 0, 0], { lat: 0, lon: 90 });
    const expected = -(Math.atan(MOON_RADIUS_KM / D) * 180) / Math.PI;
    expect(t.elevation_deg).toBeCloseTo(expected, 9);
    expect(t.elevation_deg).toBeLessThan(-0.2); // no despreciable
    expect(t.distance_km).toBeCloseTo(Math.hypot(D, MOON_RADIUS_KM), 6);
  });
});

describe("interpolateBody", () => {
  const eph = makeSyntheticEphemeris({ start: "2000-01-01T00:00:00Z", stepMinutes: 60, count: 5 });
  const t0 = parseUtc(eph.start);
  const H = 3_600_000;

  it("en una muestra exacta devuelve la muestra", () => {
    expect(interpolateBody(eph, "sun", t0 + 2 * H)).toEqual(eph.sun[2]);
    expect(interpolateBody(eph, "sun", t0 + 4 * H)).toEqual(eph.sun[4]);
  });

  it("entre muestras interpola linealmente", () => {
    const mid = interpolateBody(eph, "sun", t0 + 1.5 * H)!;
    for (let k = 0; k < 3; k++) expect(mid[k]).toBeCloseTo((eph.sun[1][k] + eph.sun[2][k]) / 2, 3);
  });

  it("fuera de la cobertura devuelve null", () => {
    expect(interpolateBody(eph, "sun", t0 - 1)).toBeNull();
    expect(interpolateBody(eph, "earth", t0 + 4 * H + 1000)).toBeNull();
  });
});

describe("computeSunEarthSeries (efeméride sintética)", () => {
  const eph = makeSyntheticEphemeris();

  it("sin ventana devuelve una muestra por cada muestra de la efeméride", () => {
    const s = computeSunEarthSeries(eph, EQ0);
    expect(s.sun).toHaveLength(eph.count);
    expect(s.earth).toHaveLength(eph.count);
    expect(s.sun[0].time).toBe(eph.start);
  });

  it("en lat 0 / lon 0: mediodía al inicio y ocaso por el oeste a 1/4 de día lunar", () => {
    const noon = positionsAt(eph, EQ0, eph.start)!;
    expect(noon.sun.elevation_deg).toBeCloseTo(90, 3);

    const quarter = addDays(eph.start, SYNODIC_MONTH_DAYS / 4);
    const sunset = positionsAt(eph, EQ0, quarter)!;
    expect(Math.abs(sunset.sun.elevation_deg)).toBeLessThan(0.05);
    expect(sunset.sun.azimuth_deg).toBeCloseTo(270, 1);

    const midnight = positionsAt(eph, EQ0, addDays(eph.start, SYNODIC_MONTH_DAYS / 2))!;
    expect(midnight.sun.elevation_deg).toBeLessThan(-89.9);
  });

  it("la Tierra sintética (fija en +X) está siempre en el cénit de lat 0 / lon 0", () => {
    const s = computeSunEarthSeries(eph, EQ0);
    for (const e of s.earth) expect(e.elevation_deg).toBeGreaterThan(89.99);
  });

  it("con ventana remuestrea al paso pedido, con extremos inclusivos", () => {
    const s = computeSunEarthSeries(eph, EQ0, {
      start: "2000-01-02T00:00:00Z",
      end: "2000-01-03T00:00:00Z",
      stepMinutes: 10,
    });
    expect(s.sun).toHaveLength(24 * 6 + 1);
    expect(s.sun[0].time).toBe("2000-01-02T00:00:00Z");
    expect(s.sun.at(-1)!.time).toBe("2000-01-03T00:00:00Z");
  });

  it("una ventana fuera de la cobertura lanza RangeError", () => {
    expect(() =>
      computeSunEarthSeries(eph, EQ0, { start: "1999-12-31T00:00:00Z", end: "2000-01-01T12:00:00Z" }),
    ).toThrow(RangeError);
  });
});
