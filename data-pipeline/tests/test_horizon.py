"""Horizonte sobre terrenos sintéticos (resultado conocido) y, si hay DEM descargados, sobre LOLA real."""

from __future__ import annotations

import math
from dataclasses import dataclass
from typing import Callable

import numpy as np
import pytest

from lunarnav.config import LOLA_DIR
from lunarnav.dem import R_M, open_polar_dem
from lunarnav.horizon import compute_horizon, elevation_angles, enu_basis, ray_points


@dataclass
class FnSource:
    """Fuente de alturas sintética: h = fn(lat, lon) en metros."""

    fn: Callable[[np.ndarray, np.ndarray], np.ndarray]
    scale_m_per_px: float = 40.0
    name: str = "SYNTHETIC"

    def height_at(self, lat: np.ndarray, lon: np.ndarray) -> np.ndarray:
        return self.fn(np.asarray(lat, float), np.asarray(lon, float))


def unit(lat, lon):
    p, l = np.radians(lat), np.radians(lon)
    return np.stack([np.cos(p) * np.cos(l), np.cos(p) * np.sin(l), np.sin(p)], axis=-1)


def distance_from(lat0, lon0):
    u0 = unit(lat0, lon0)
    return lambda lat, lon: R_M * np.arccos(np.clip(unit(lat, lon) @ u0, -1, 1))


def test_ray_points_follow_azimuth_and_distance() -> None:
    la, lo = ray_points(0.0, 0.0, np.array([0.0, 90.0]), np.array([R_M * math.radians(1)]))
    assert la[0, 0] == pytest.approx(1.0, abs=1e-9) and lo[0, 0] == pytest.approx(0.0, abs=1e-9)  # norte
    assert la[1, 0] == pytest.approx(0.0, abs=1e-9) and lo[1, 0] == pytest.approx(1.0, abs=1e-9)  # este


def test_enu_at_south_pole_uses_meridian_as_north() -> None:
    east, north, up = enu_basis(-90.0, 0.0)
    np.testing.assert_allclose(north, [1, 0, 0], atol=1e-12)  # hacia el meridiano 0
    np.testing.assert_allclose(up, [0, 0, -1], atol=1e-12)


def test_flat_moon_horizon_is_the_geometric_dip() -> None:
    flat = FnSource(lambda la, lo: np.zeros_like(la))
    prof = compute_horizon("t", -45.0, 30.0, flat, max_distance_km=20, observer_height_m=2.0)
    dip = -math.degrees(math.acos(R_M / (R_M + 2.0)))  # ≈ −0,087°
    assert np.allclose(prof.horizon_elevation_deg, dip, atol=0.002)
    assert len(prof.horizon_elevation_deg) == 360


def test_ring_wall_gives_the_analytic_angle() -> None:
    dist = distance_from(-60.0, 10.0)
    wall = FnSource(lambda la, lo: np.where((dist(la, lo) > 4_980) & (dist(la, lo) < 6_000), 1_000.0, 0.0))
    prof = compute_horizon("t", -60.0, 10.0, wall, max_distance_km=10, observer_height_m=2.0)
    expected = float(elevation_angles(0.0, 2.0, np.array(1000.0), np.array(5_000.0)))
    assert np.allclose(prof.horizon_elevation_deg, expected, atol=0.05)
    assert expected > 10  # un muro de 1 km a 5 km tapa unos 11°


def test_mountain_to_the_east_only_affects_eastern_azimuths() -> None:
    lat0, lon0 = 20.0, 0.0
    east, _, _ = enu_basis(lat0, lon0)
    dist = distance_from(lat0, lon0)
    mountain = FnSource(lambda la, lo: np.where((unit(la, lo) @ east > 0.001) & (dist(la, lo) > 3_000) & (dist(la, lo) < 4_000), 2_000.0, 0.0))
    h = compute_horizon("t", lat0, lon0, mountain, max_distance_km=10).horizon_elevation_deg
    assert h[90] > 20  # este
    assert h[270] < 0  # oeste: horizonte geométrico
    assert h[0] < h[90] and h[180] < h[90]


def test_works_at_the_exact_pole() -> None:
    flat = FnSource(lambda la, lo: np.zeros_like(la))
    prof = compute_horizon("t", -90.0, 0.0, flat, max_distance_km=10)
    assert np.ptp(prof.horizon_elevation_deg) < 1e-6


def test_outside_coverage_raises() -> None:
    nothing = FnSource(lambda la, lo: np.full_like(la, np.nan))
    with pytest.raises(ValueError):
        compute_horizon("t", 0.0, 0.0, nothing)


# ---- DEM LOLA reales (se saltan si no están descargados) ----

NEAR = LOLA_DIR / "ldem_85s_40m.lbl"
FAR = LOLA_DIR / "ldem_75s_240m.lbl"
needs_dem = pytest.mark.skipif(not (NEAR.exists() and FAR.exists()), reason="faltan DEM: python scripts/fetch_lola.py")


@needs_dem
def test_projection_matches_gdal() -> None:
    rasterio = pytest.importorskip("rasterio")
    from rasterio.warp import transform

    dem = open_polar_dem(NEAR)
    rng = np.random.default_rng(0)
    lat = rng.uniform(-89.9, -85.5, 20)
    lon = rng.uniform(-180, 180, 20)
    row, col = dem.latlon_to_pixel(lat, lon)
    with rasterio.open(NEAR) as ds:
        xs, ys = transform("+proj=longlat +R=1737400 +no_defs", ds.crs, lon.tolist(), lat.tolist())
        for i in range(20):
            gcol, grow = ~ds.transform @ (xs[i], ys[i])  # coordenadas de píxel continuas (borde = 0)
            assert row[i] == pytest.approx(grow - 0.5, abs=1e-6)
            assert col[i] == pytest.approx(gcol - 0.5, abs=1e-6)


@needs_dem
def test_real_dem_profile_is_sane() -> None:
    near, far = open_polar_dem(NEAR), open_polar_dem(FAR)
    prof = compute_horizon("t", -89.5, 45.0, near, far)
    h = np.array(prof.horizon_elevation_deg)
    assert h.shape == (360,)
    assert -5 < h.min() and h.max() < 40
    assert prof.surface_height_m is not None and abs(prof.surface_height_m) < 11_000
