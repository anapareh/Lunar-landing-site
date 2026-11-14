"""Genera web/public/data/ephemeris/<año>.json y manifest.json con SpiceyPy.

Requiere los kernels (python scripts/fetch_kernels.py).

Uso:
    python scripts/build_ephemeris.py [--years 2026 2027 2028] [--step 60]
"""

from __future__ import annotations

import argparse
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))
from lunarnav.config import DEFAULT_YEARS, STEP_MINUTES, WEB_DATA_DIR  # noqa: E402
from lunarnav.ephemeris import load_kernels, year_series  # noqa: E402
from lunarnav.export import write_ephemeris, write_manifest  # noqa: E402


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--years", type=int, nargs="+", default=list(DEFAULT_YEARS))
    parser.add_argument("--step", type=float, default=STEP_MINUTES, help="paso en minutos")
    parser.add_argument("--out", type=Path, default=WEB_DATA_DIR)
    args = parser.parse_args()

    kernels = load_kernels()
    for year in args.years:
        t0 = time.perf_counter()
        series = year_series(year, args.step)
        path = write_ephemeris(series, args.out)
        size_kb = path.stat().st_size / 1024
        print(f"{year}: {series.count} muestras → {path.relative_to(args.out.parent.parent)} ({size_kb:.0f} KB, {time.perf_counter() - t0:.1f} s)")
    manifest = write_manifest(args.out, kernels=kernels)
    print(f"manifest → {manifest}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
