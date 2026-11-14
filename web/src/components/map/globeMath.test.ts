import { describe, expect, it } from "vitest";
import {
  QUAT_NEARSIDE,
  QUAT_SOUTH_POLE,
  bodyToThree,
  latLonToThree,
  quatFacing,
  rotate,
  threeToBody,
  threeToLatLon,
} from "./globeMath";

const close = (a: number[], b: number[], d = 9) => a.forEach((v, i) => expect(v).toBeCloseTo(b[i], d));

describe("marco lunar ↔ three.js", () => {
  it("ejes: lon 0 → +X, lon 90 E → −Z, polo norte → +Y", () => {
    close(latLonToThree(0, 0), [1, 0, 0]);
    close(latLonToThree(0, 90), [0, 0, -1]);
    close(latLonToThree(90, 0), [0, 1, 0]);
    close(latLonToThree(-90, 0), [0, -1, 0]);
  });

  it("ida y vuelta", () => {
    close(threeToBody(bodyToThree([1, 2, 3])), [1, 2, 3]);
    for (const [lat, lon] of [[-89.5, 120], [10, -45], [45, 179]]) {
      const ll = threeToLatLon(latLonToThree(lat, lon));
      expect(ll.lat).toBeCloseTo(lat, 9);
      expect(ll.lon).toBeCloseTo(lon, 9);
    }
  });
});

describe("orientaciones de las vistas", () => {
  const CAMERA: [number, number, number] = [0, 0, 1];

  it("quatFacing pone el punto frente a la cámara", () => {
    for (const [lat, lon] of [[0, 0], [-89.5, 45], [30, -120], [-45, 170]]) {
      close(rotate(quatFacing(lat, lon), latLonToThree(lat, lon)), CAMERA);
    }
  });

  it("con el norte hacia arriba de la pantalla", () => {
    const q = quatFacing(20, 60);
    const north = rotate(q, latLonToThree(25, 60)); // un punto algo más al norte
    expect(north[1]).toBeGreaterThan(0);
    expect(Math.abs(north[0])).toBeLessThan(1e-9);
  });

  it("cara visible y polo sur", () => {
    close(rotate(QUAT_NEARSIDE, latLonToThree(0, 0)), CAMERA);
    close(rotate(QUAT_SOUTH_POLE, latLonToThree(-90, 0)), CAMERA);
    // En la vista del polo sur, lon 0 queda arriba.
    expect(rotate(QUAT_SOUTH_POLE, latLonToThree(-80, 0))[1]).toBeGreaterThan(0);
  });
});
