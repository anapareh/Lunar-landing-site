"""Exportación de resultados a JSON para la web.

Propósito futuro:
- Escribir ``manifest.json`` (índice de todo lo generado).
- Serializar ``EphemerisSeries`` -> ``ephemeris/<año>.json``.
- Serializar cada ``HorizonProfile`` -> ``horizons/<site_id>.json``.
- Copiar/enriquecer la lista de sitios -> ``sites.json``.
Todo en ``web/public/data/`` siguiendo docs/data-contract.md.
"""

from __future__ import annotations

from pathlib import Path

from .ephemeris import EphemerisSeries
from .horizon import HorizonProfile
from .sites import Site

DEFAULT_OUTPUT_DIR = Path(__file__).resolve().parents[3] / "web" / "public" / "data"


CONTRACT_VERSION = "1.0.0"


def write_manifest(out_dir: Path = DEFAULT_OUTPUT_DIR) -> Path:
    """Escribe ``manifest.json`` a partir de lo que haya en ``out_dir``. TODO."""
    raise NotImplementedError("TODO: write_manifest")


def write_ephemeris(series: EphemerisSeries, out_dir: Path = DEFAULT_OUTPUT_DIR) -> Path:
    """Escribe ``ephemeris/<año>.json`` (un archivo por año). TODO."""
    raise NotImplementedError("TODO: write_ephemeris")


def write_horizon(profile: HorizonProfile, out_dir: Path = DEFAULT_OUTPUT_DIR) -> Path:
    """Escribe ``horizons/<site_id>.json``. TODO."""
    raise NotImplementedError("TODO: write_horizon")


def write_sites(sites: list[Site], out_dir: Path = DEFAULT_OUTPUT_DIR) -> Path:
    """Escribe ``sites.json``. TODO."""
    raise NotImplementedError("TODO: write_sites")
