"""Genera la rejilla de horizontes LOLA del polo sur (web/public/data/horizon_grid/) y actualiza manifest.json.

Uso:
    python scripts/build_horizon_grid.py [--spacing-km 5] [--max-lat -85] [--workers N]
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import time
from concurrent.futures import ProcessPoolExecutor
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))
from lunarnav.config import LOLA_DIR, LOLA_JSON, WEB_DATA_DIR  # noqa: E402
from lunarnav.dem import open_polar_dem  # noqa: E402
from lunarnav.ephemeris import kernel_files  # noqa: E402
from lunarnav.export import write_manifest  # noqa: E402
from lunarnav.horizon import METHOD_VERSION, compute_horizon  # noqa: E402
from lunarnav.horizon_grid import GridSpec, grid_nodes, write_grid  # noqa: E402

OBSERVER_M = 2.0
MAX_KM = 300.0

_near = _far = None


def _init() -> None:
    global _near, _far
    _near = open_polar_dem(LOLA_DIR / "ldem_85s_40m.lbl")
    _far = open_polar_dem(LOLA_DIR / "ldem_75s_240m.lbl")


def _work(node: tuple[int, int, float, float]):
    i, j, lat, lon = node
    try:
        p = compute_horizon("g", lat, lon, _near, _far, max_distance_km=MAX_KM, observer_height_m=OBSERVER_M)
        return (i, j), (p.horizon_elevation_deg, p.surface_height_m)
    except ValueError:
        return (i, j), None


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--spacing-km", type=float, default=5.0)
    parser.add_argument("--max-lat", type=float, default=-85.0)
    parser.add_argument("--workers", type=int, default=max(1, (os.cpu_count() or 2) - 1))
    parser.add_argument("--out", type=Path, default=WEB_DATA_DIR)
    args = parser.parse_args()

    spec = GridSpec(id=f"south_{args.spacing_km:g}km", spacing_m=args.spacing_km * 1000, max_lat=args.max_lat)
    nodes = grid_nodes(spec)
    print(f"Rejilla {spec.id}: {len(nodes)} nodos ({spec.n}×{spec.n}), {args.workers} procesos", flush=True)
    t0 = time.perf_counter()
    results = {}
    with ProcessPoolExecutor(max_workers=args.workers, initializer=_init) as pool:
        for k, (key, value) in enumerate(pool.map(_work, nodes, chunksize=16), 1):
            if value is not None:
                results[key] = value
            if k % 250 == 0:
                print(f"  {k}/{len(nodes)} ({time.perf_counter() - t0:.0f} s)", flush=True)

    base = json.loads(LOLA_JSON.read_text(encoding="utf-8"))["base_url"]
    dem = {
        "product": "LDEM_85S_40M + LDEM_75S_240M",
        "resolution_m": 40,
        "source_url": f"{base}ldem_85s_40m.img ; {base}ldem_75s_240m.img",
    }
    jpath, bpath = write_grid(args.out, spec, results, 1.0, OBSERVER_M, MAX_KM, dem, METHOD_VERSION)
    print(f"{len(results)} perfiles en {time.perf_counter() - t0:.0f} s → {jpath.name} ({jpath.stat().st_size // 1024} KB), {bpath.name} ({bpath.stat().st_size // 1024} KB)")
    write_manifest(args.out, kernels=kernel_files())
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
