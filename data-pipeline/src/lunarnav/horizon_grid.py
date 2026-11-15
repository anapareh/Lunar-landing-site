"""Rejilla de perfiles de horizonte LOLA para coordenadas libres en el polo sur (contrato v1.1).

Nodos regulares en el plano estereográfico polar sur (misma proyección que los DEM LOLA):
    X = r·sin(lon), Y = r·cos(lon),  r = 2·R·tan((90 − |lat|)/2)
    nodo (i, j) ↔ X = i·s, Y = j·s, con i, j ∈ [−K, K]
Inversa: lat = −90 + 2·atan(r / 2R), lon = atan2(X, Y).
La web localiza el nodo más cercano con la misma fórmula y evalúa ese nodo exacto (sin interpolar).

Datos: int16 little-endian, índice = ((j + K)·(2K+1) + (i + K))·n_az + k, valor = elevación / escala;
`missing_value` para nodos fuera de cobertura.
"""

from __future__ import annotations

import json
import math
from dataclasses import dataclass
from pathlib import Path

import numpy as np

from .dem import R_M

MISSING = -32768
VALUE_SCALE_DEG = 0.01


@dataclass
class GridSpec:
    id: str
    spacing_m: float
    max_lat: float  # p. ej. −85: solo nodos con latitud ≤ max_lat

    @property
    def r_max(self) -> float:
        return 2 * R_M * math.tan(math.radians(90 - abs(self.max_lat)) / 2)

    @property
    def half_size(self) -> int:
        return int(math.floor(self.r_max / self.spacing_m))

    @property
    def n(self) -> int:
        return 2 * self.half_size + 1


def node_latlon(i: int, j: int, spacing_m: float) -> tuple[float, float]:
    x, y = i * spacing_m, j * spacing_m
    r = math.hypot(x, y)
    lat = -90 + math.degrees(2 * math.atan(r / (2 * R_M)))
    lon = math.degrees(math.atan2(x, y)) if r > 0 else 0.0
    return lat, lon


def nearest_node(lat: float, lon: float, spacing_m: float) -> tuple[int, int]:
    r = 2 * R_M * math.tan(math.radians(90 - abs(lat)) / 2)
    x, y = r * math.sin(math.radians(lon)), r * math.cos(math.radians(lon))
    return round(x / spacing_m), round(y / spacing_m)


def grid_nodes(spec: GridSpec) -> list[tuple[int, int, float, float]]:
    """(i, j, lat, lon) de los nodos dentro de la cobertura (r ≤ r_max)."""
    k = spec.half_size
    out = []
    for j in range(-k, k + 1):
        for i in range(-k, k + 1):
            if math.hypot(i, j) * spec.spacing_m <= spec.r_max:
                lat, lon = node_latlon(i, j, spec.spacing_m)
                out.append((i, j, lat, lon))
    return out


def node_index(i: int, j: int, spec: GridSpec) -> int:
    k = spec.half_size
    return (j + k) * spec.n + (i + k)


def write_grid(
    out_dir: Path,
    spec: GridSpec,
    results: dict[tuple[int, int], tuple[list[float], float | None]],
    azimuth_step_deg: float,
    observer_height_m: float,
    max_distance_km: float,
    dem: dict,
    method_version: str,
    contract_version: str = "1.1.0",
) -> tuple[Path, Path]:
    """Escribe horizon_grid/<id>.bin (int16) y horizon_grid/<id>.json (metadatos)."""
    n_az = int(round(360 / azimuth_step_deg))
    data = np.full((spec.n * spec.n, n_az), MISSING, dtype="<i2")
    heights: list[float | None] = [None] * (spec.n * spec.n)
    for (i, j), (profile, h0) in results.items():
        idx = node_index(i, j, spec)
        data[idx] = np.clip(np.round(np.asarray(profile) / VALUE_SCALE_DEG), -32767, 32767).astype("<i2")
        heights[idx] = None if h0 is None else round(h0, 1)
    gdir = out_dir / "horizon_grid"
    gdir.mkdir(parents=True, exist_ok=True)
    bin_path = gdir / f"{spec.id}.bin"
    data.tofile(bin_path)
    meta = {
        "contract_version": contract_version,
        "id": spec.id,
        "projection": "polar_stereographic_south",
        "sphere_radius_m": R_M,
        "spacing_m": spec.spacing_m,
        "half_size": spec.half_size,
        "max_lat": spec.max_lat,
        "azimuth_step_deg": azimuth_step_deg,
        "value_scale_deg": VALUE_SCALE_DEG,
        "missing_value": MISSING,
        "data_file": f"horizon_grid/{spec.id}.bin",
        "node_count": len(results),
        "observer_height_m": observer_height_m,
        "max_distance_km": max_distance_km,
        "dem": dem,
        "method_version": method_version,
        "surface_height_m": heights,
    }
    json_path = gdir / f"{spec.id}.json"
    json_path.write_text(json.dumps(meta, separators=(",", ":"), ensure_ascii=False), encoding="utf-8")
    return json_path, bin_path
