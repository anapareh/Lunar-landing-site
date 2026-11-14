"""Perfil de horizonte local a partir de un DEM LOLA.

Propósito futuro:
- Abrir un DEM LOLA (GeoTIFF / PDS) con rasterio desde ``data-pipeline/raw/``.
- Para un punto (lat, lon), trazar rayos en 360 acimuts y obtener la elevación
  angular máxima del relieve en cada dirección (teniendo en cuenta la curvatura).
- Devolver un ``HorizonProfile`` que ``export.py`` serialice como
  ``horizons/<site_id>.json`` (ver docs/data-contract.md).

Decisiones pendientes: DEM/resolución, radio máximo de búsqueda, paso del rayo.
"""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Any


@dataclass
class HorizonProfile:
    """Elevación angular del horizonte por acimut (desde el norte, horario)."""

    site_id: str
    lat: float
    lon: float
    azimuth_step_deg: float
    horizon_elevation_deg: list[float]


def open_dem(dem_path: Path) -> Any:
    """Abre el DEM LOLA y devuelve el dataset de rasterio.

    TODO: abrir con rasterio y comprobar proyección/unidades.
    """
    raise NotImplementedError("TODO: open_dem")


def compute_horizon(
    dem: Any,
    site_id: str,
    lat: float,
    lon: float,
    azimuth_step_deg: float = 1.0,
    max_distance_km: float | None = None,
) -> HorizonProfile:
    """Calcula el perfil de horizonte para un punto.

    TODO: trazado de rayos sobre el DEM por cada acimut.
    """
    raise NotImplementedError("TODO: compute_horizon")
