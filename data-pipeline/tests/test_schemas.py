"""Valida el contrato de datos v1: los schemas son válidos y los datos los cumplen.

- data-pipeline/data/sites.json (fuente de verdad)
- todo lo que haya generado en web/public/data/ (manifest, sites, ephemeris/*, horizons/*)
Además comprueba las invariantes que JSON Schema no puede expresar.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest
from jsonschema import Draft202012Validator

REPO = Path(__file__).resolve().parents[2]
SCHEMAS = REPO / "docs" / "schemas"
WEB_DATA = REPO / "web" / "public" / "data"
SOURCE_SITES = REPO / "data-pipeline" / "data" / "sites.json"


def _load(path: Path) -> object:
    return json.loads(path.read_text(encoding="utf-8"))


def _validator(name: str) -> Draft202012Validator:
    schema = _load(SCHEMAS / f"{name}.schema.json")
    Draft202012Validator.check_schema(schema)
    return Draft202012Validator(schema)


def _assert_valid(name: str, path: Path) -> object:
    data = _load(path)
    errors = sorted(_validator(name).iter_errors(data), key=lambda e: list(e.path))
    assert not errors, f"{path.relative_to(REPO)}: " + "; ".join(
        f"{'/'.join(map(str, e.path)) or '<raíz>'}: {e.message}" for e in errors
    )
    return data


@pytest.mark.parametrize("name", ["manifest", "sites", "ephemeris", "horizon", "horizon_grid"])
def test_schema_is_valid(name: str) -> None:
    _validator(name)


def test_source_sites_valid() -> None:
    data = _assert_valid("sites", SOURCE_SITES)
    ids = [s["id"] for s in data["sites"]]
    assert len(ids) == len(set(ids)), "ids de sitio duplicados"


def _generated(pattern: str) -> list[Path]:
    return sorted(WEB_DATA.glob(pattern))


@pytest.mark.parametrize("path", _generated("manifest.json"), ids=str)
def test_generated_manifest(path: Path) -> None:
    data = _assert_valid("manifest", path)
    for entry in data["ephemeris"]:
        assert (WEB_DATA / entry["file"]).exists(), f"falta {entry['file']}"
    for site_id in data["horizons"]:
        assert (WEB_DATA / "horizons" / f"{site_id}.json").exists(), f"falta horizonte {site_id}"


@pytest.mark.parametrize("path", _generated("sites.json"), ids=str)
def test_generated_sites(path: Path) -> None:
    _assert_valid("sites", path)


@pytest.mark.parametrize("path", _generated("ephemeris/*.json"), ids=str)
def test_generated_ephemeris(path: Path) -> None:
    data = _assert_valid("ephemeris", path)
    assert len(data["sun"]) == len(data["earth"]) == data["count"]


@pytest.mark.parametrize("path", _generated("horizons/*.json"), ids=str)
def test_generated_horizon(path: Path) -> None:
    data = _assert_valid("horizon", path)
    assert path.stem == data["site_id"]
    expected = 360 / data["azimuth_step_deg"]
    assert expected == int(expected), "azimuth_step_deg debe dividir 360"
    assert len(data["horizon_elevation_deg"]) == int(expected)


@pytest.mark.parametrize("path", _generated("horizon_grid/*.json"), ids=str)
def test_generated_horizon_grid(path: Path) -> None:
    data = _assert_valid("horizon_grid", path)
    n = 2 * data["half_size"] + 1
    assert len(data["surface_height_m"]) == n * n
    n_az = round(360 / data["azimuth_step_deg"])
    bin_path = WEB_DATA / data["data_file"]
    assert bin_path.stat().st_size == n * n * n_az * 2  # int16
    assert data["node_count"] == sum(h is not None for h in data["surface_height_m"])
