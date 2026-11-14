"""Valida nuestras efemérides contra la API de JPL Horizons.

Propósito futuro:
- Para un conjunto de puntos de prueba en la superficie lunar y varios instantes,
  pedir a JPL Horizons (https://ssd.jpl.nasa.gov/api/horizons.api) la elevación y
  el acimut del Sol y de la Tierra.
- Calcular lo mismo con nuestros datos (ephemeris.json + conversión local).
- Informar de las diferencias y fallar si superan una tolerancia.

Uso previsto:
    python scripts/validate_horizons.py [--tolerance-deg X]
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime


@dataclass
class Comparison:
    """Diferencia entre nuestro cálculo y JPL Horizons para un punto/instante."""

    lat: float
    lon: float
    time: datetime
    body: str  # "sun" | "earth"
    d_elevation_deg: float
    d_azimuth_deg: float


def query_horizons(body: str, lat: float, lon: float, start: datetime, stop: datetime, step: str) -> list[dict]:
    """Consulta JPL Horizons para un observador en la superficie lunar. TODO."""
    raise NotImplementedError("TODO: query_horizons")


def compare(tolerance_deg: float) -> list[Comparison]:
    """Compara nuestros resultados con JPL Horizons. TODO."""
    raise NotImplementedError("TODO: compare")


def main() -> int:
    """Punto de entrada CLI. TODO: argparse, ejecutar ``compare`` e informar."""
    print("TODO: validate_horizons no implementado")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
