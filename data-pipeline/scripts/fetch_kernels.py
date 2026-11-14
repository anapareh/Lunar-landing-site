"""Descarga los kernels SPICE listados en data-pipeline/kernels.json a data-pipeline/raw/kernels/.

Uso:
    python scripts/fetch_kernels.py [--verify-only]
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))
from lunarnav.config import KERNEL_DIR, KERNELS_JSON  # noqa: E402
from lunarnav.download import fetch_manifest  # noqa: E402


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--verify-only", action="store_true", help="no descargar; solo comprobar")
    args = parser.parse_args()
    return 0 if fetch_manifest(KERNELS_JSON, "kernels", KERNEL_DIR, args.verify_only) else 1


if __name__ == "__main__":
    raise SystemExit(main())
