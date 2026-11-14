"""Carga de la lista de sitios (``data/sites.json``, contrato v1).

- Lee ``data/sites.json`` (validado por tests/test_schemas.py contra docs/schemas/sites.schema.json).
- Normaliza la longitud a −180..180 (este positiva).
- ``usable_sites`` devuelve solo los que tienen coordenadas.
"""

from __future__ import annotations

import json
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


def normalize_lon(lon: float) -> float:
    """Longitud este positiva en −180..180."""
    v = ((lon + 180.0) % 360.0) - 180.0
    return 180.0 if v == -180.0 and lon > 0 else v


def load_sites(path: Path = DEFAULT_SITES_PATH) -> list[Site]:
    """Lee ``sites.json`` y construye la lista de ``Site`` (longitud normalizada)."""
    data = json.loads(path.read_text(encoding="utf-8"))
    out = []
    for s in data["sites"]:
        out.append(
            Site(
                id=s["id"],
                name=s["name"],
                mission=s["mission"],
                agency=s["agency"],
                category=s["category"],
                status=s["status"],
                location_kind=s["location_kind"],
                lat=s["lat"],
                lon=normalize_lon(s["lon"]) if s["lon"] is not None else None,
                date=SiteDate(**s["date"]),
                sources=[Source(**x) for x in s["sources"]],
                verified=s["verified"],
                verified_by=s["verified_by"],
                verified_on=s["verified_on"],
                notes=s["notes"],
            )
        )
    return out


def usable_sites(sites: list[Site]) -> list[Site]:
    """Sitios con coordenadas (lat y lon no nulos)."""
    return [s for s in sites if s.lat is not None and s.lon is not None]
