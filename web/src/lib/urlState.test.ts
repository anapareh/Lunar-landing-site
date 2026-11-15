import { describe, expect, it } from "vitest";
import { parseUrlState } from "./urlState";

describe("parseUrlState", () => {
  it("lee coordenadas, fecha, modo y vista", () => {
    expect(parseUrlState("?lat=-89.5&lon=45&fecha=2026-11-20T12:00Z&modo=avanzado&vista=local")).toEqual({
      lat: -89.5,
      lon: 45,
      date: "2026-11-20T12:00:00Z",
      mode: "advanced",
      scene: "local",
    });
  });
  it("lee el panel móvil", () => {
    expect(parseUrlState("?panel=condiciones")).toEqual({ sheet: "cond" });
    expect(parseUrlState("?sitio=apollo-11")).toEqual({ siteId: "apollo-11" });
    expect(parseUrlState("?sitio=../x")).toEqual({});
    expect(parseUrlState("?lang=en")).toEqual({ lang: "en" });
    expect(parseUrlState("?lang=fr")).toEqual({});
  });
  it("ignora valores fuera de rango o mal formados", () => {
    expect(parseUrlState("?lat=-95&lon=10&fecha=ayer&modo=x")).toEqual({});
    expect(parseUrlState("?lat=10")).toEqual({});
  });
});
