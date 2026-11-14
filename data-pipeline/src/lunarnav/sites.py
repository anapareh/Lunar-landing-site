"""Carga de la lista de sitios (``data/sites.json``, contrato v1).

Propósito futuro:
- Leer ``data/sites.json``, validarlo contra ``docs/schemas/sites.schema.json`` y convertirlo
  en objetos ``Site``.
- Normalizar la longitud a −180..180 (este positiva).
- Filtrar los sitios sin coordenadas antes de calcular horizontes o exportar.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path
from typing import Literal

DEFAULT_SITES_PATH = Path(__file__).resolve().parents[2] / "data" / "sites.json"

Category = Literal["apollo", "clps", "commercial", "other_agency", "artemis", "other"]
Status = Literal["landed", "planned", "candidate", "failed"]
LocationKind = Literal["landing_point", "planned_target", "region_center"]


@dataclass
class SiteDate:
    """Fecha real o prevista con su precisión (todo None si se desconoce)."""

    value: str | None  # "YYYY", "YYYY-MM" o "YYYY-MM-DD"
    kind: Literal["actual", "planned"] | None
    precision: Literal["day", "month", "year"] | None


@dataclass
class Source:
    label: str
    url: str


@dataclass
class Site:
    """Sitio candidato. Campos según docs/data-contract.md (v1)."""

    id: str
    name: str
    mission: str | None
    agency: str | None
    category: Category
    status: Status
    location_kind: LocationKind
    lat: float | None
    lon: float | None
    date: SiteDate
    sources: list[Source] = field(default_factory=list)
    verified: bool = False
    verified_by: str | None = None
    verified_on: str | None = None
    notes: str | None = None


def load_sites(path: Path = DEFAULT_SITES_PATH) -> list[Site]:
    """Lee, valida contra el schema y construye la lista de ``Site``.

    TODO: parsear JSON, validar con jsonschema, normalizar la longitud y construir los objetos.
    """
    raise NotImplementedError("TODO: load_sites")


def usable_sites(sites: list[Site]) -> list[Site]:
    """Devuelve solo los sitios con coordenadas utilizables (lat/lon no nulos).

    TODO: decidir si además se exige ``verified`` para exportar a la web.
    """
    raise NotImplementedError("TODO: usable_sites")
