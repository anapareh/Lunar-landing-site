import { describe, expect, it } from "vitest";
import { makeSyntheticHorizon } from "../data/fixtures/syntheticHorizon";
import type { HorizonSample, TopocentricSample } from "../types";
import {
  SUN_RADIUS_KM,
  angularRadiusDeg,
  applyHorizon,
  horizonElevationAt,
  horizonLevel,
  isVisible,
  visibilityMargin,
  visibleDiskFraction,
} from "./horizon";

describe("horizonElevationAt", () => {
  it("sin perfil el horizonte es geométrico (0°)", () => {
    expect(horizonElevationAt(null, 123)).toBe(0);
    expect(horizonLevel(null)).toBe("geometric");
    expect(horizonLevel(makeSyntheticHorizon(() => 0))).toBe("dem");
  });

  it("interpola linealmente entre acimuts", () => {
    const p = makeSyntheticHorizon((az) => az / 10); // 0°, 0,1°, 0,2°…
    expect(horizonElevationAt(p, 45)).toBeCloseTo(4.5, 12);
    expect(horizonElevationAt(p, 45.5)).toBeCloseTo(4.55, 12);
  });

  it("enlaza el último acimut con el primero (359° → 0°)", () => {
    const p = makeSyntheticHorizon((az) => (az === 0 ? 10 : az === 359 ? 2 : 0));
    expect(horizonElevationAt(p, 359.5)).toBeCloseTo(6, 12);
    expect(horizonElevationAt(p, 360)).toBeCloseTo(10, 12);
    expect(horizonElevationAt(p, -0.5)).toBeCloseTo(6, 12);
  });

  it("funciona con pasos distintos de 1°", () => {
    const p = makeSyntheticHorizon((az) => (az === 90 ? 5 : 0), 10);
    expect(p.horizon_elevation_deg).toHaveLength(36);
    expect(horizonElevationAt(p, 85)).toBeCloseTo(2.5, 12);
    expect(horizonElevationAt(p, 90)).toBeCloseTo(5, 12);
  });
});

describe("disco y fracción visible", () => {
  it("radio angular = asin(R / d)", () => {
    expect(angularRadiusDeg(1, 2)).toBeCloseTo(30, 12);
    expect(angularRadiusDeg(SUN_RADIUS_KM, 149_597_870.7)).toBeCloseTo(
      (Math.asin(SUN_RADIUS_KM / 149_597_870.7) * 180) / Math.PI,
      12,
    );
  });

  it("fracción del disco sobre una recta", () => {
    expect(visibleDiskFraction(0, 0.25)).toBeCloseTo(0.5, 12); // centro en el horizonte
    expect(visibleDiskFraction(0.25, 0.25)).toBe(1); // borde inferior en el horizonte
    expect(visibleDiskFraction(-0.25, 0.25)).toBe(0); // borde superior en el horizonte
    expect(visibleDiskFraction(3, 0.25)).toBe(1);
    expect(visibleDiskFraction(-3, 0.25)).toBe(0);
  });

  it("es simétrica y creciente", () => {
    let prev = -1;
    for (let c = -0.3; c <= 0.3; c += 0.01) {
      const f = visibleDiskFraction(c, 0.25);
      expect(f + visibleDiskFraction(-c, 0.25)).toBeCloseTo(1, 12);
      expect(f).toBeGreaterThanOrEqual(prev);
      prev = f;
    }
  });
});

describe("applyHorizon y criterio de visibilidad", () => {
  const base: TopocentricSample = { time: "2000-01-01T00:00:00Z", elevation_deg: 3, azimuth_deg: 270, distance_km: 149_597_870.7 };
  const wallWest = makeSyntheticHorizon((az) => (az >= 180 ? 10 : 0));

  it("resta el relieve en el acimut del cuerpo", () => {
    const [s] = applyHorizon([base], wallWest, SUN_RADIUS_KM);
    expect(s.horizon_deg).toBe(10);
    expect(s.clearance_deg).toBe(-7);
    expect(s.visible_fraction).toBe(0);
    const [e] = applyHorizon([{ ...base, azimuth_deg: 90 }], wallWest, SUN_RADIUS_KM);
    expect(e.clearance_deg).toBe(3);
    expect(e.visible_fraction).toBe(1);
  });

  it("anyPart / center / full / margen de antena", () => {
    const s: HorizonSample = {
      ...base, horizon_deg: 0, clearance_deg: -0.1, angular_radius_deg: 0.25, visible_fraction: 0.37,
    };
    expect(isVisible(s)).toBe(true); // por defecto basta con el borde superior
    expect(isVisible(s, { disk: "center" })).toBe(false);
    expect(isVisible({ ...s, clearance_deg: 0.2 }, { disk: "full" })).toBe(false);
    expect(isVisible({ ...s, clearance_deg: 0.3 }, { disk: "full" })).toBe(true);
    expect(visibilityMargin({ ...s, clearance_deg: 5 }, { disk: "center", minClearanceDeg: 2 })).toBeCloseTo(3, 12);
  });
});
