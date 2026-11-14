"""Descarga los DEM polares de LOLA listados en data-pipeline/lola.json a data-pipeline/raw/lola/.

Uso:
    python scripts/fetch_lola.py [--verify-only]
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))
from lunarnav.config import LOLA_DIR, LOLA_JSON  # noqa: E402
from lunarnav.download import fetch_manifest  # noqa: E402


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--verify-only", action="store_true", help="no descargar; solo comprobar")
    args = parser.parse_args()
    return 0 if fetch_manifest(LOLA_JSON, "dems", LOLA_DIR, args.verify_only) else 1


if __name__ == "__main__":
    raise SystemExit(main())
