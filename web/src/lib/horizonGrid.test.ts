import { describe, expect, it } from "vitest";
import type { HorizonGridMeta } from "../types";
import { greatCircleKm, nearestNode, nodeLatLon, profileAt, snapToGrid, type HorizonGrid } from "./horizonGrid";

const R = 1_737_400;
const S = 5000;

function tinyGrid(): HorizonGrid {
  const k = 2;
  const n = 2 * k + 1;
  const nAz = 360;
  const data = new Int16Array(n * n * nAz).fill(-32768);
  const idx = (1 + k) * n + (0 + k); // nodo (i=0, j=1)
  for (let a = 0; a < nAz; a++) data[idx * nAz + a] = a; // 0,00° … 3,59°
  const meta: HorizonGridMeta = {
    contract_version: "1.1.0", id: "t", projection: "polar_stereographic_south", sphere_radius_m: R, spacing_m: S,
    half_size: k, max_lat: -89, azimuth_step_deg: 1, value_scale_deg: 0.01, missing_value: -32768, data_file: "x",
    node_count: 1, observer_height_m: 2, max_distance_km: 300, dem: { product: "T", resolution_m: 40, source_url: null },
    method_version: "1.0.0", surface_height_m: Array.from({ length: n * n }, (_, c) => (c === idx ? -321.5 : null)),
  };
  return { meta, data };
}

describe("horizonGrid", () => {
  it("orientación de los nodos: +X = lon 90° E, +Y = lon 0°", () => {
    expect(nodeLatLon(0, 0, S, R)).toEqual({ lat: -90, lon: 0 });
    expect(nodeLatLon(1, 0, S, R).lon).toBeCloseTo(90, 9);
    expect(nodeLatLon(0, 1, S, R).lon).toBeCloseTo(0, 9);
    expect(nodeLatLon(0, -1, S, R).lon).toBeCloseTo(180, 9);
  });

  it("ida y vuelta nodo ↔ lat/lon", () => {
    for (const [i, j] of [[3, -7], [-12, 5], [20, 20]]) {
      const { lat, lon } = nodeLatLon(i, j, S, R);
      expect(nearestNode(lat, lon, S, R)).toEqual({ i, j });
    }
  });

  it("distancia de círculo máximo", () => {
    expect(greatCircleKm(0, 0, 0, 1, 1737.4)).toBeCloseTo((1737.4 * Math.PI) / 180, 6);
  });

  it("perfil del nodo, nodos vacíos y fuera de rango", () => {
    const g = tinyGrid();
    const p = profileAt(g, 0, 1)!;
    expect(p.horizon_elevation_deg).toHaveLength(360);
    expect(p.horizon_elevation_deg[100]).toBeCloseTo(1, 9);
    expect(p.surface_height_m).toBe(-321.5);
    expect(profileAt(g, 0, 0)).toBeNull();
    expect(profileAt(g, 9, 0)).toBeNull();
  });

  it("snapToGrid: ajusta al nodo con datos y respeta la cobertura", () => {
    const g = tinyGrid();
    const node = nodeLatLon(0, 1, S, R);
    const snap = snapToGrid(g, node.lat - 0.001, node.lon + 1)!;
    expect(snap.i).toBe(0);
    expect(snap.j).toBe(1);
    expect(snap.distanceKm).toBeGreaterThan(0);
    expect(snap.distanceKm).toBeLessThan(S / 1000);
    expect(snapToGrid(g, -80, 0)).toBeNull(); // fuera de max_lat
    expect(snapToGrid(g, -90, 0)).toBeNull(); // nodo sin datos
  });
});
