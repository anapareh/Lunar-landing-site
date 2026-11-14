"""Genera perfiles de horizonte LOLA (web/public/data/horizons/<id>.json) y actualiza manifest.json.

Puntos: los sitios de data/sites.json con coordenadas dentro de la cobertura de los DEM polares
(75° S – 90° S) y los indicados con --point. Requiere los DEM (python scripts/fetch_lola.py).

Uso:
    python scripts/build_horizons.py [--point ID LAT LON ...] [--observer 2] [--max-km 300]
"""

from __future__ import annotations

import argparse
import json
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))
from lunarnav.config import LOLA_DIR, LOLA_JSON, WEB_DATA_DIR  # noqa: E402
from lunarnav.dem import open_polar_dem  # noqa: E402
from lunarnav.ephemeris import kernel_files  # noqa: E402
from lunarnav.export import write_horizon, write_manifest  # noqa: E402
from lunarnav.horizon import compute_horizon  # noqa: E402
from lunarnav.sites import load_sites, usable_sites  # noqa: E402

COVERAGE_MAX_LAT = -75.0


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--point", nargs=3, action="append", metavar=("ID", "LAT", "LON"), default=[])
    parser.add_argument("--observer", type=float, default=2.0, help="altura del observador sobre el suelo (m)")
    parser.add_argument("--max-km", type=float, default=300.0, help="distancia máxima de búsqueda (km)")
    parser.add_argument("--out", type=Path, default=WEB_DATA_DIR)
    args = parser.parse_args()

    base = json.loads(LOLA_JSON.read_text(encoding="utf-8"))["base_url"]
    near = open_polar_dem(LOLA_DIR / "ldem_85s_40m.lbl", base + "ldem_85s_40m.img")
    far = open_polar_dem(LOLA_DIR / "ldem_75s_240m.lbl", base + "ldem_75s_240m.img")

    points = [(s.id, s.lat, s.lon) for s in usable_sites(load_sites()) if s.lat is not None and s.lat <= COVERAGE_MAX_LAT]
    points += [(pid, float(lat), float(lon)) for pid, lat, lon in args.point]
    if not points:
        print("No hay puntos: ningún sitio verificado en la cobertura polar y no se indicó --point.")
    for pid, lat, lon in points:
        t0 = time.perf_counter()
        prof = compute_horizon(
            pid, lat, lon, near, far,
            max_distance_km=args.max_km, observer_height_m=args.observer,
            source_url=f"{near.source_url} ; {far.source_url}",
        )
        path = write_horizon(prof, args.out)
        h = prof.horizon_elevation_deg
        print(f"{pid}: ({lat}, {lon}) altura {prof.surface_height_m} m · horizonte {min(h):.2f}°…{max(h):.2f}° → {path.name} ({time.perf_counter() - t0:.1f} s)")
    write_manifest(args.out, kernels=kernel_files())
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
