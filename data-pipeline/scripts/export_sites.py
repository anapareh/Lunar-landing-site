"""Copia data/sites.json (fuente de verdad) a web/public/data/sites.json.

Uso: python scripts/export_sites.py
Los tests (tests/test_schemas.py) validan ambos archivos contra docs/schemas/sites.schema.json.
"""

from __future__ import annotations

from lunarnav.export import write_sites
from lunarnav.sites import load_sites, usable_sites


def main() -> None:
    sites = load_sites()
    path = write_sites(sites)
    print(f"{path}: {len(sites)} sitios ({len(usable_sites(sites))} con coordenadas)")


if __name__ == "__main__":
    main()
