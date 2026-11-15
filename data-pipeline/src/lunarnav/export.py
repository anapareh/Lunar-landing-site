"""Exportación de resultados a JSON para la web (contrato v1, docs/data-contract.md).

- ``ephemeris/<año>.json``: vectores Sol/Tierra de un año.
- ``manifest.json``: índice de todo lo que hay en ``web/public/data/``.
- ``horizons/<site_id>.json``: perfil de horizonte de un sitio.
- ``sites.json``: copia de ``data/sites.json`` (los sitios sin coordenadas siguen sin ellas).
"""

from __future__ import annotations

import json
import subprocess
from dataclasses import asdict
from datetime import datetime, timedelta, timezone
from pathlib import Path

from .config import ABERRATION, FRAME, REPO_DIR, VECTOR_DECIMALS, WEB_DATA_DIR
from .ephemeris import EphemerisSeries
from .horizon import HorizonProfile
from .sites import Site

DEFAULT_OUTPUT_DIR = WEB_DATA_DIR
CONTRACT_VERSION = "1.1.0"


def iso_utc(t: datetime) -> str:
    return t.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def _parse_iso(s: str) -> datetime:
    return datetime.strptime(s, "%Y-%m-%dT%H:%M:%SZ").replace(tzinfo=timezone.utc)


def _round(v: tuple[float, float, float]) -> list[float]:
    return [round(x, VECTOR_DECIMALS) for x in v]


def _dump(path: Path, data: object) -> Path:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, separators=(",", ":"), ensure_ascii=False), encoding="utf-8")
    return path


def ephemeris_payload(series: EphemerisSeries) -> dict:
    return {
        "contract_version": CONTRACT_VERSION,
        "frame": series.frame,
        "aberration_correction": series.aberration_correction,
        "units": "km",
        "start": iso_utc(series.start),
        "step_minutes": series.step_minutes,
        "count": series.count,
        "sun": [_round(v) for v in series.sun],
        "earth": [_round(v) for v in series.earth],
    }


def write_ephemeris(series: EphemerisSeries, out_dir: Path = DEFAULT_OUTPUT_DIR) -> Path:
    """Escribe ``ephemeris/<año de inicio>.json``."""
    return _dump(out_dir / "ephemeris" / f"{series.start.year}.json", ephemeris_payload(series))


def _git_commit() -> str | None:
    try:
        out = subprocess.run(["git", "rev-parse", "--short", "HEAD"], cwd=REPO_DIR, capture_output=True, text=True, check=True)
        return out.stdout.strip() or None
    except (OSError, subprocess.CalledProcessError):
        return None


def write_manifest(
    out_dir: Path = DEFAULT_OUTPUT_DIR,
    kernels: list[str] | None = None,
    frame: str = FRAME,
    aberration_correction: str = ABERRATION,
) -> Path:
    """Escribe ``manifest.json`` a partir de lo que haya en ``out_dir``."""
    eph = []
    for p in sorted((out_dir / "ephemeris").glob("*.json")):
        d = json.loads(p.read_text(encoding="utf-8"))
        start = _parse_iso(d["start"])
        end = start + timedelta(minutes=d["step_minutes"] * (d["count"] - 1))
        eph.append({"file": f"ephemeris/{p.name}", "start": d["start"], "end": iso_utc(end)})
    eph.sort(key=lambda e: e["start"])
    horizons = sorted(p.stem for p in (out_dir / "horizons").glob("*.json"))
    grids = [{"id": p.stem, "file": f"horizon_grid/{p.name}"} for p in sorted((out_dir / "horizon_grid").glob("*.json"))]
    manifest = {
        "contract_version": CONTRACT_VERSION,
        "generated_at": iso_utc(datetime.now(timezone.utc).replace(microsecond=0)),
        "pipeline_commit": _git_commit(),
        "frame": frame,
        "aberration_correction": aberration_correction,
        "kernels": kernels or [],
        "ephemeris": eph,
        "horizons": horizons,
        "horizon_grids": grids,
        "basemaps": [],
    }
    path = out_dir / "manifest.json"
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    return path


def horizon_payload(p: HorizonProfile) -> dict:
    payload = {
        "contract_version": CONTRACT_VERSION,
        "site_id": p.site_id,
        "lat": p.lat,
        "lon": p.lon,
        "surface_height_m": p.surface_height_m,
        "observer_height_m": p.observer_height_m,
        "azimuth_step_deg": p.azimuth_step_deg,
        "horizon_elevation_deg": p.horizon_elevation_deg,
        "max_distance_km": p.max_distance_km,
        "dem": {"product": p.dem.product, "resolution_m": p.dem.resolution_m, "source_url": p.dem.source_url},
        "method_version": p.method_version,
    }
    if p.parent_site_id:
        payload["parent_site_id"] = p.parent_site_id
    return payload


def write_horizon(profile: HorizonProfile, out_dir: Path = DEFAULT_OUTPUT_DIR) -> Path:
    """Escribe ``horizons/<site_id>.json``."""
    return _dump(out_dir / "horizons" / f"{profile.site_id}.json", horizon_payload(profile))


def sites_payload(sites: list[Site]) -> dict:
    """Raíz de ``sites.json`` (mismos campos que la fuente, longitud ya normalizada)."""
    return {"contract_version": CONTRACT_VERSION, "sites": [asdict(s) for s in sites]}


def write_sites(sites: list[Site], out_dir: Path = DEFAULT_OUTPUT_DIR) -> Path:
    """Escribe ``sites.json`` para la web (copia validada de ``data/sites.json``)."""
    return _dump(out_dir / "sites.json", sites_payload(sites))
