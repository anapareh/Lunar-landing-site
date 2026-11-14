/**
 * Métricas sobre la efeméride sintética (Sol girando en el ecuador con el periodo sinódico,
 * Tierra fija en +X). Observador en lat 0 / lon 0 salvo que se indique otra cosa:
 * mediodía al inicio, ocaso por el oeste a 1/4 de día lunar y orto por el este a 3/4.
 * La elevación del Sol baja a un ritmo constante: RATE grados por hora.
 */
import { describe, expect, it } from "vitest";
import { makeSyntheticEphemeris } from "../data/fixtures/syntheticEphemeris";
import { makeSyntheticHorizon } from "../data/fixtures/syntheticHorizon";
import type { HorizonProfile } from "../types";
import { EARTH_RADIUS_KM, SUN_RADIUS_KM, angularRadiusDeg, applyHorizon } from "./horizon";
import { azimuthAt, computeSiteMetrics, countdown, visibilityWindows, visibleHours } from "./metrics";
import { computeSunEarthSeries, type Observer } from "./sunEarth";
import { SYNODIC_MONTH_DAYS, addDays } from "./time";

const eph = makeSyntheticEphemeris();
const START = eph.start;
const LUNAR_DAY_H = SYNODIC_MONTH_DAYS * 24;
const RATE = 360 / LUNAR_DAY_H; // grados por hora
const ONE_MINUTE_H = 1 / 60;
const EQ0: Observer = { lat: 0, lon: 0 };

function lunarDay(observer: Observer, profile: HorizonProfile | null = null) {
  const series = computeSunEarthSeries(eph, observer, {
    start: START,
    end: addDays(START, SYNODIC_MONTH_DAYS),
    stepMinutes: 10,
  });
  return {
    series,
    sun: applyHorizon(series.sun, profile, SUN_RADIUS_KM),
    earth: applyHorizon(series.earth, profile, EARTH_RADIUS_KM),
  };
}

const near = (actual: number | null, expected: number, tol: number) => {
  expect(actual).not.toBeNull();
  expect(Math.abs(actual! - expected)).toBeLessThan(tol);
};

describe("ocaso y orto con horizonte geométrico", () => {
  const { sun } = lunarDay(EQ0);

  it("criterio 'center': el ocaso es a 1/4 de día lunar", () => {
    const c = countdown(sun, START, { disk: "center" });
    expect(c.visibleNow).toBe(true);
    near(c.hoursToSet, LUNAR_DAY_H / 4, ONE_MINUTE_H);
  });

  it("criterio 'anyPart' (por defecto): el borde superior se pone más tarde, en radio/RATE horas", () => {
    const rSun = angularRadiusDeg(SUN_RADIUS_KM, 149_597_870.7);
    const c = countdown(sun, START);
    near(c.hoursToSet, LUNAR_DAY_H / 4 + rSun / RATE, ONE_MINUTE_H);
    expect(c.hoursToSet! - LUNAR_DAY_H / 4).toBeGreaterThan(0.4); // ≈ media hora: el disco importa
  });

  it("a medianoche no es visible y cuenta las horas hasta el orto", () => {
    const c = countdown(sun, addDays(START, SYNODIC_MONTH_DAYS / 2), { disk: "center" });
    expect(c.visibleNow).toBe(false);
    expect(c.hoursToSet).toBeNull();
    near(c.hoursToRise, LUNAR_DAY_H / 4, ONE_MINUTE_H);
  });

  it("un día lunar tiene dos ventanas abiertas por los extremos y ~medio día de luz", () => {
    const w = visibilityWindows(sun, { disk: "center" });
    expect(w).toHaveLength(2);
    expect(w[0].openStart).toBe(true);
    expect(w[0].openEnd).toBe(false);
    expect(w[1].openStart).toBe(false);
    expect(w[1].openEnd).toBe(true);
    near(w[0].hours, LUNAR_DAY_H / 4, ONE_MINUTE_H);
    near(visibleHours(sun, { disk: "center" }), LUNAR_DAY_H / 2, 5 * ONE_MINUTE_H);
  });

  it("fuera de la ventana calculada lanza RangeError", () => {
    expect(() => countdown(sun, "1999-12-31T00:00:00Z")).toThrow(RangeError);
  });
});

describe("relieve: un muro de 10° al oeste adelanta el ocaso", () => {
  const wallWest = makeSyntheticHorizon((az) => (az >= 180 ? 10 : 0));
  const { sun } = lunarDay(EQ0, wallWest);

  it("el Sol se oculta cuando su elevación baja a 10°", () => {
    const c = countdown(sun, START, { disk: "center" });
    near(c.hoursToSet, (90 - 10) / RATE, ONE_MINUTE_H);
  });

  it("hay menos horas de luz que con el horizonte geométrico", () => {
    const flat = lunarDay(EQ0).sun;
    expect(visibleHours(sun)).toBeLessThan(visibleHours(flat) - 10);
  });
});

describe("Tierra", () => {
  it("en lat 0 / lon 0 (Tierra en el cénit) es visible toda la ventana y no se pone", () => {
    const { earth } = lunarDay(EQ0);
    const c = countdown(earth, START);
    expect(c).toEqual({ visibleNow: true, hoursToSet: null, hoursToRise: null });
    // La serie (paso de 10 min) acaba en la última muestra antes del final exacto del día lunar.
    const spanH = (Date.parse(earth.at(-1)!.time) - Date.parse(earth[0].time)) / 3_600_000;
    expect(visibleHours(earth)).toBeCloseTo(spanH, 9);
  });

  it("en el limbo (lon 90): el centro queda bajo el horizonte pero parte del disco se ve", () => {
    const { earth } = lunarDay({ lat: 0, lon: 90 });
    const s = earth[0];
    expect(s.clearance_deg).toBeLessThan(0); // paralaje
    expect(countdown(earth, START, { disk: "center" }).visibleNow).toBe(false);
    expect(countdown(earth, START, { disk: "anyPart" }).visibleNow).toBe(true);
    expect(s.visible_fraction).toBeGreaterThan(0);
    expect(s.visible_fraction).toBeLessThan(0.5);
  });

  it("una máscara de antena de 1° la deja sin visibilidad en el limbo", () => {
    const { earth } = lunarDay({ lat: 0, lon: 90 });
    expect(visibleHours(earth, { disk: "center", minClearanceDeg: 1 })).toBe(0);
  });
});

describe("azimuthAt", () => {
  const t = [0, 1000, 2000];
  it("interpola por el camino corto al cruzar el norte", () => {
    expect(azimuthAt(t, [350, 10, 30], 500)).toBeCloseTo(0, 9);
    expect(azimuthAt(t, [350, 10, 30], 250)).toBeCloseTo(355, 9);
    expect(azimuthAt(t, [10, 350, 330], 500)).toBeCloseTo(0, 9);
  });
  it("interpola normal sin cruce y devuelve la última muestra en el extremo", () => {
    expect(azimuthAt(t, [90, 100, 110], 1500)).toBeCloseTo(105, 9);
    expect(azimuthAt(t, [90, 100, 110], 2000)).toBe(110);
  });
});

describe("computeSiteMetrics", () => {
  it("agrega Sol y Tierra para un escenario", () => {
    const { series } = lunarDay(EQ0);
    const m = computeSiteMetrics({ scenarioId: "s1", siteId: "custom-0-0", series, profile: null, at: START });
    expect(m.horizonLevel).toBe("geometric");
    expect(m.windowStart).toBe(START);
    near(m.windowHours, LUNAR_DAY_H, 10 * ONE_MINUTE_H);
    expect(m.sun.visibleNow).toBe(true);
    expect(m.sun.elevationNowDeg).toBeCloseTo(90, 3);
    expect(m.sun.azimuthNowDeg).toBeGreaterThanOrEqual(0);
    expect(m.sun.azimuthNowDeg).toBeLessThan(360);
    expect(m.sun.maxElevationDeg).toBeCloseTo(90, 3);
    expect(m.sun.visibleFractionNow).toBe(1);
    expect(m.earth.visibleNow).toBe(true);
    expect(m.earth.hoursToSet).toBeNull();
  });
});
