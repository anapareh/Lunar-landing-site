"""Configuración del pipeline: rutas, marco, corrección de aberración y paso de la efeméride."""

from __future__ import annotations

from pathlib import Path

PIPELINE_DIR = Path(__file__).resolve().parents[2]
REPO_DIR = PIPELINE_DIR.parent
KERNELS_JSON = PIPELINE_DIR / "kernels.json"
KERNEL_DIR = PIPELINE_DIR / "raw" / "kernels"
LOLA_JSON = PIPELINE_DIR / "lola.json"
LOLA_DIR = PIPELINE_DIR / "raw" / "lola"
WEB_DATA_DIR = REPO_DIR / "web" / "public" / "data"

#: Marco lunar fijo: mean Earth / polar axis (DE421), el que usa Horizons para sitios lunares (D-003).
FRAME = "MOON_ME"
#: Posición aparente: tiempo de luz + aberración estelar (D-003).
ABERRATION = "LT+S"
#: Paso de la efeméride en minutos (Q-101: revisar tras la validación contra Horizons).
STEP_MINUTES = 60
#: Años generados por defecto.
DEFAULT_YEARS = (2026, 2027, 2028)
#: Decimales de los vectores (0,1 km, contrato v1).
VECTOR_DECIMALS = 1
