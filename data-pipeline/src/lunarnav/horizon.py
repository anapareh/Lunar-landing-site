"""Perfil de horizonte local a partir de DEM LOLA.

Para cada acimut (desde el norte, horario; misma base Este-Norte-Arriba que web/src/lib/sunEarth.ts,
también en el polo exacto) se recorre la superficie por el círculo máximo y se toma el máximo ángulo
de elevación del terreno visto desde el observador, con la curvatura lunar exacta:

    elevación = atan2(r₁·cos θ − r₀, r₁·sin θ)

r₀ = R + altura del terreno en el sitio + altura del observador; r₁ = R + altura del punto;
θ = ángulo central (distancia / R). Dos niveles de DEM: el fino cerca y el grueso lejos.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Protocol

import numpy as np

from .dem import R_M

METHOD_VERSION = "1.0.0"


class HeightSource(Protocol):
    name: str
    scale_m_per_px: float

    def height_at(self, lat: np.ndarray, lon: np.ndarray) -> np.ndarray: ...


@dataclass
class DemInfo:
    """Procedencia del DEM usado para el perfil."""

    product: str
    resolution_m: float
    source_url: str | None


@dataclass
class HorizonProfile:
    """Elevación angular del horizonte por acimut (desde el norte, horario). Contrato v1."""

    site_id: str
    lat: float
    lon: float
    surface_height_m: float | None
    observer_height_m: float
    azimuth_step_deg: float
    horizon_elevation_deg: list[float]
    max_distance_km: float
    dem: DemInfo
    method_version: str
    parent_site_id: str | None = None  # solo en variantes cercanas calculadas


def enu_basis(lat: float, lon: float) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    """Base local Este-Norte-Arriba (en el polo, 'norte' = dirección del meridiano lon)."""
    p, l = np.radians(lat), np.radians(lon)
    east = np.array([-np.sin(l), np.cos(l), 0.0])
    north = np.array([-np.sin(p) * np.cos(l), -np.sin(p) * np.sin(l), np.cos(p)])
    up = np.array([np.cos(p) * np.cos(l), np.cos(p) * np.sin(l), np.sin(p)])
    return east, north, up


def ray_points(lat: float, lon: float, azimuths_deg: np.ndarray, distances_m: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    """Lat/lon (grados) de los puntos a cada distancia sobre el círculo máximo de cada acimut.
    Devuelve matrices (n_acimuts, n_distancias)."""
    east, north, up = enu_basis(lat, lon)
    az = np.radians(azimuths_deg)[:, None, None]
    t = np.cos(az) * north + np.sin(az) * east  # (A, 1, 3)
    theta = (distances_m / R_M)[None, :, None]
    p = np.cos(theta) * up + np.sin(theta) * t  # (A, D, 3)
    lat_out = np.degrees(np.arcsin(np.clip(p[..., 2], -1, 1)))
    lon_out = np.degrees(np.arctan2(p[..., 1], p[..., 0]))
    return lat_out, lon_out


def elevation_angles(h0_m: float, observer_m: float, heights_m: np.ndarray, distances_m: np.ndarray) -> np.ndarray:
    """Ángulo de elevación (grados) de cada punto del terreno visto desde el observador."""
    r0 = R_M + h0_m + observer_m
    r1 = R_M + heights_m
    theta = distances_m / R_M
    return np.degrees(np.arctan2(r1 * np.cos(theta) - r0, r1 * np.sin(theta)))


def compute_horizon(
    site_id: str,
    lat: float,
    lon: float,
    near: HeightSource,
    far: HeightSource | None = None,
    near_limit_km: float = 20.0,
    max_distance_km: float = 300.0,
    azimuth_step_deg: float = 1.0,
    observer_height_m: float = 2.0,
    source_url: str | None = None,
) -> HorizonProfile:
    """Perfil de horizonte. Cerca usa `near` (paso = su resolución) hasta `near_limit_km`; más allá
    `far` hasta `max_distance_km`. Los puntos sin datos (fuera de cobertura) se ignoran."""
    az = np.arange(0.0, 360.0, azimuth_step_deg)
    h0 = float(near.height_at(np.array([lat]), np.array([lon]))[0])
    if np.isnan(h0) and far is not None:
        h0 = float(far.height_at(np.array([lat]), np.array([lon]))[0])
    if np.isnan(h0):
        raise ValueError(f"({lat}, {lon}) está fuera de la cobertura de los DEM")

    best = np.full(az.shape, -90.0)
    tiers: list[tuple[HeightSource, float, float]] = [(near, near.scale_m_per_px, near_limit_km * 1000 if far else max_distance_km * 1000)]
    if far is not None:
        tiers.append((far, far.scale_m_per_px, max_distance_km * 1000))
    start = 0.0
    for source, step, stop in tiers:
        d = np.arange(start + step, stop + step / 2, step)
        if d.size == 0:
            continue
        la, lo = ray_points(lat, lon, az, d)
        h = source.height_at(la, lo)
        ang = elevation_angles(h0, observer_height_m, h, d[None, :])
        ang = np.where(np.isnan(ang), -90.0, ang)
        best = np.maximum(best, ang.max(axis=1))
        start = stop

    resolution = near.scale_m_per_px
    product = near.name if far is None else f"{near.name} + {far.name}"
    return HorizonProfile(
        site_id=site_id,
        lat=lat,
        lon=lon,
        surface_height_m=round(h0, 1),
        observer_height_m=observer_height_m,
        azimuth_step_deg=azimuth_step_deg,
        horizon_elevation_deg=[round(float(v), 3) for v in best],
        max_distance_km=max_distance_km,
        dem=DemInfo(product=product, resolution_m=resolution, source_url=source_url),
        method_version=METHOD_VERSION,
    )
