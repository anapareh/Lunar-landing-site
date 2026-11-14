"""Carga de la lista de sitios (``data/sites.json``).

Propósito futuro:
- Leer ``data/sites.json`` y convertirlo en objetos ``Site``.
- Validar campos obligatorios y rangos de lat/lon.
- Filtrar los sitios sin coordenadas (``lat``/``lon`` null) o no verificados antes
  de calcular horizontes o exportar.
"""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

DEFAULT_SITES_PATH = Path(__file__).resolve().parents[2] / "data" / "sites.json"


@dataclass
class Site:
    """Sitio candidato. Campos según docs/data-contract.md."""

    id: str
    name: str
    agency: str | None
    type: str | None
    lat: float | None
    lon: float | None
    verified: bool = False
    notes: str | None = None


def load_sites(path: Path = DEFAULT_SITES_PATH) -> list[Site]:
    """Lee y valida ``sites.json``.

    TODO: parsear JSON, validar y construir la lista de ``Site``.
    """
    raise NotImplementedError("TODO: load_sites")


def usable_sites(sites: list[Site]) -> list[Site]:
    """Devuelve solo los sitios con coordenadas utilizables.

    TODO: definir criterio (¿exigir ``verified``?).
    """
    raise NotImplementedError("TODO: usable_sites")
