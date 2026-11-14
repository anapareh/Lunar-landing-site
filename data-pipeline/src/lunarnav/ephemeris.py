"""Efemérides del Sol y la Tierra en el marco lunar fijo.

Propósito futuro:
- Cargar kernels SPICE (o efemérides de Skyfield) desde ``data-pipeline/raw/``.
- Calcular, para una serie temporal uniforme, los vectores centro Luna -> Sol y
  centro Luna -> Tierra expresados en el marco lunar fijo (body-fixed).
- Devolver una estructura que ``export.py`` serialice como ``ephemeris.json``
  (ver docs/data-contract.md).

Decisiones pendientes: marco exacto (MOON_ME / MOON_PA), unidades, rango y paso.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from pathlib import Path

Vector3 = tuple[float, float, float]


@dataclass
class EphemerisSeries:
    """Serie temporal de vectores centro Luna -> Sol/Tierra en el marco lunar fijo (km). Contrato v1."""

    frame: str  # MOON_ME (D-003)
    aberration_correction: str  # LT+S (D-003)
    start: datetime
    step_minutes: float
    sun: list[Vector3]
    earth: list[Vector3]


def load_kernels(kernel_dir: Path) -> None:
    """Carga los kernels SPICE necesarios desde ``kernel_dir``.

    TODO: decidir lista de kernels (LSK, PCK, SPK, FK lunar) y cargarlos.
    """
    raise NotImplementedError("TODO: load_kernels")


def compute_series(
    start: datetime,
    end: datetime,
    step_minutes: float,
    frame: str,
) -> EphemerisSeries:
    """Calcula los vectores Sol y Tierra entre ``start`` y ``end``.

    TODO: muestrear el intervalo y obtener posiciones en ``frame``.
    """
    raise NotImplementedError("TODO: compute_series")
