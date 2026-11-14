"""Comprobaciones físicas de la efeméride SPICE (se saltan si no hay kernels descargados).

No sustituyen a la validación contra JPL Horizons (scripts/validate_horizons.py); detectan errores
groseros de marco, cuerpo, unidades o tiempo.
"""

from __future__ import annotations

import json
import math
from datetime import datetime, timedelta, timezone

import numpy as np
import pytest

from lunarnav.config import KERNEL_DIR
from lunarnav.ephemeris import compute_series, kernel_files, load_kernels, utc_samples, year_series
from lunarnav.export import ephemeris_payload

HAVE_KERNELS = all((KERNEL_DIR / f).exists() for f in kernel_files())
needs_kernels = pytest.mark.skipif(not HAVE_KERNELS, reason="faltan kernels: python scripts/fetch_kernels.py")

AU_KM = 149_597_870.7


def test_utc_samples_grid() -> None:
    t0 = datetime(2026, 1, 1, tzinfo=timezone.utc)
    s = utc_samples(t0, t0 + timedelta(hours=3), 60)
    assert [t.hour for t in s] == [0, 1, 2, 3]
    with pytest.raises(ValueError):
        utc_samples(datetime(2026, 1, 1), datetime(2026, 1, 2), 60)


@pytest.fixture(scope="module")
def month():
    load_kernels()
    t0 = datetime(2026, 11, 1, tzinfo=timezone.utc)
    return compute_series(t0, t0 + timedelta(days=30), 60)


@needs_kernels
def test_distances_are_physical(month) -> None:
    earth = np.linalg.norm(np.array(month.earth), axis=1)
    sun = np.linalg.norm(np.array(month.sun), axis=1)
    # Distancia Tierra-Luna entre perigeo y apogeo (≈ 356 000 – 407 000 km)
    assert earth.min() > 350_000 and earth.max() < 410_000
    # El Sol, a ≈ 1 ua (la órbita terrestre varía ±1,7 % y la Luna añade < 0,3 %)
    assert (sun / AU_KM).min() > 0.97 and (sun / AU_KM).max() < 1.03


@needs_kernels
def test_earth_stays_near_mean_earth_direction(month) -> None:
    """En MOON_ME, +X apunta a la Tierra media: solo la libración la aparta unos grados."""
    e = np.array(month.earth)
    angle = np.degrees(np.arccos(e[:, 0] / np.linalg.norm(e, axis=1)))
    assert angle.max() < 12
    assert angle.max() > 1  # sí hay libración


@needs_kernels
def test_sun_goes_round_once_per_synodic_month(month) -> None:
    """La longitud subsolar recorre los 360° en un mes sinódico (≈ 29,5 días)."""
    s = np.array(month.sun)
    lon = np.unwrap(np.arctan2(s[:, 1], s[:, 0]))
    turns = abs(lon[-1] - lon[0]) / (2 * math.pi)
    assert 0.95 < turns * 29.530588853 / 30 < 1.05


@needs_kernels
def test_year_payload_matches_contract() -> None:
    load_kernels()
    series = year_series(2026, 60)
    p = ephemeris_payload(series)
    assert p["count"] == 8760 == len(p["sun"]) == len(p["earth"])
    assert p["start"] == "2026-01-01T00:00:00Z"
    assert p["frame"] == "MOON_ME" and p["aberration_correction"] == "LT+S"
    json.dumps(p)  # serializable
