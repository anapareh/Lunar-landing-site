import { describe, expect, it } from "vitest";
import { summarize } from "./summary";
import en from "../i18n/en";
import type { BodyMetrics, SiteMetrics } from "../types";

const body = (o: Partial<BodyMetrics>): BodyMetrics => ({
  elevationNowDeg: 0,
  azimuthNowDeg: 0,
  clearanceNowDeg: 0,
  visibleFractionNow: 0,
  visibleNow: false,
  hoursToSet: null,
  hoursToRise: null,
  visibleHours: 0,
  maxElevationDeg: 0,
  ...o,
});

const metrics = (sun: Partial<BodyMetrics>, earth: Partial<BodyMetrics>): SiteMetrics => ({
  scenarioId: "s",
  siteId: "x",
  horizonLevel: "geometric",
  at: "2026-11-14T00:00:00Z",
  windowStart: "2026-11-14T00:00:00Z",
  windowEnd: "2026-12-13T12:00:00Z",
  windowHours: 708,
  sun: body(sun),
  earth: body(earth),
});

describe("summarize", () => {
  it("noche con amanecer y Tierra siempre visible", () => {
    const s = summarize(metrics({ hoursToRise: 39, visibleHours: 354 }, { visibleNow: true, visibleHours: 708 }));
    expect(s.sun).toBe("Es de noche: amanece en 1 d 15 h.");
    expect(s.light).toBe("Habrá sol el 50 % del próximo día lunar.");
    expect(s.earth).toMatch(/^La Tierra se ve todo el periodo/);
  });
  it("día con ocaso y Tierra que no sale nunca", () => {
    const s = summarize(metrics({ visibleNow: true, hoursToSet: 5, visibleHours: 5 }, {}));
    expect(s.sun).toBe("Es de día: el Sol se pone en 5 h.");
    expect(s.earth).toMatch(/satélite de retransmisión/);
  });
  it("sin luz en toda la ventana", () => {
    const s = summarize(metrics({}, { hoursToRise: 2 }));
    expect(s.sun).toBe("Es de noche y el Sol no sale en todo el periodo.");
    expect(s.light).toBe("No habrá luz solar en el próximo día lunar.");
    expect(s.earth).toBe("La Tierra no se ve ahora: sale en 2 h.");
  });
  it("en inglés", () => {
    const s = summarize(metrics({ hoursToRise: 39, visibleHours: 354 }, { visibleNow: true, visibleHours: 708 }), en.summary);
    expect(s.sun).toBe("It is night: sunrise in 1 d 15 h.");
    expect(s.earth).toMatch(/^Earth is visible the whole period/);
  });
});
