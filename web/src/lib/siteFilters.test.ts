import { describe, expect, it } from "vitest";
import { matchesFilter, siteYear } from "./siteFilters";
import type { Site } from "../types";

const site = (o: Partial<Site>): Site => ({
  id: "x",
  name: "X",
  mission: null,
  agency: null,
  category: "other",
  status: "landed",
  location_kind: "landing_point",
  lat: 0,
  lon: 0,
  date: { value: "1969-07-20", kind: "actual", precision: "day" },
  sources: [],
  verified: false,
  verified_by: null,
  verified_on: null,
  notes: null,
  ...o,
});

describe("matchesFilter", () => {
  it("separa Apollo, robóticas, comerciales y fallidos", () => {
    expect(matchesFilter(site({ category: "apollo" }), "apollo")).toBe(true);
    expect(matchesFilter(site({ category: "other_agency" }), "robotic")).toBe(true);
    expect(matchesFilter(site({ category: "other_agency", status: "failed" }), "robotic")).toBe(false);
    expect(matchesFilter(site({ category: "clps" }), "clps")).toBe(true);
    expect(matchesFilter(site({ category: "commercial", status: "failed" }), "failed")).toBe(true);
  });
  it("polo sur por latitud", () => {
    expect(matchesFilter(site({ lat: -80.13 }), "south")).toBe(true);
    expect(matchesFilter(site({ lat: -45 }), "south")).toBe(false);
    expect(matchesFilter(site({ lat: null }), "south")).toBe(false);
  });
  it("año", () => expect(siteYear(site({}))).toBe("1969"));
});
