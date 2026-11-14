"""Efemérides del Sol y la Tierra en el marco lunar fijo (SpiceyPy).

- Carga los kernels listados en ``kernels.json`` desde ``raw/kernels/`` (scripts/fetch_kernels.py).
- Calcula, para una serie temporal uniforme en UTC, los vectores centro Luna -> Sol y
  centro Luna -> Tierra en ``MOON_ME`` con corrección ``LT+S`` (posición aparente), en km.
- ``export.py`` los escribe como ``ephemeris/<año>.json`` (docs/data-contract.md).

Convención de tiempo (contrato y web/src/lib/time.ts): la muestra i está en ``start + i·paso`` en
UTC civil; cada instante se convierte a ET por separado con el LSK.
"""

from __future__ import annotations

import json
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from pathlib import Path

import numpy as np
import spiceypy as spice

from .config import ABERRATION, FRAME, KERNEL_DIR, KERNELS_JSON

Vector3 = tuple[float, float, float]


@dataclass
class EphemerisSeries:
    """Serie temporal de vectores centro Luna -> Sol/Tierra en el marco lunar fijo (km). Contrato v1."""

    frame: str  # MOON_ME (D-003)
    aberration_correction: str  # LT+S (D-003)
    start: datetime
    step_minutes: float
    sun: list[Vector3]
    earth: list[Vector3]

    @property
    def count(self) -> int:
        return len(self.sun)

    @property
    def end(self) -> datetime:
        return self.start + timedelta(minutes=self.step_minutes * (self.count - 1))


def kernel_files(kernels_json: Path = KERNELS_JSON) -> list[str]:
    """Nombres de los kernels en el orden de carga."""
    return [k["file"] for k in json.loads(kernels_json.read_text(encoding="utf-8"))["kernels"]]


def load_kernels(kernel_dir: Path = KERNEL_DIR, kernels_json: Path = KERNELS_JSON) -> list[str]:
    """Carga (furnsh) todos los kernels. Lanza FileNotFoundError si falta alguno."""
    files = kernel_files(kernels_json)
    missing = [f for f in files if not (kernel_dir / f).exists()]
    if missing:
        raise FileNotFoundError(f"Faltan kernels en {kernel_dir}: {missing}. Ejecuta scripts/fetch_kernels.py")
    spice.kclear()
    for f in files:
        spice.furnsh(str(kernel_dir / f))
    return files


def utc_samples(start: datetime, end: datetime, step_minutes: float) -> list[datetime]:
    """Instantes UTC start, start+paso, … hasta end (incluido si cae en la rejilla)."""
    if start.tzinfo is None or end.tzinfo is None:
        raise ValueError("Las fechas deben ser conscientes de zona horaria (UTC)")
    n = int((end - start) / timedelta(minutes=step_minutes)) + 1
    return [start + timedelta(minutes=step_minutes * i) for i in range(n)]


def compute_series(
    start: datetime,
    end: datetime,
    step_minutes: float,
    frame: str = FRAME,
    abcorr: str = ABERRATION,
) -> EphemerisSeries:
    """Vectores Sol y Tierra (km) entre ``start`` y ``end``. Requiere los kernels cargados."""
    times = utc_samples(start, end, step_minutes)
    ets = [spice.str2et(t.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S")) for t in times]
    sun, _ = spice.spkpos("SUN", ets, frame, abcorr, "MOON")
    earth, _ = spice.spkpos("EARTH", ets, frame, abcorr, "MOON")
    sun = np.atleast_2d(sun)
    earth = np.atleast_2d(earth)
    return EphemerisSeries(
        frame=frame,
        aberration_correction=abcorr,
        start=times[0],
        step_minutes=step_minutes,
        sun=[tuple(map(float, v)) for v in sun],
        earth=[tuple(map(float, v)) for v in earth],
    )


def year_series(year: int, step_minutes: float, frame: str = FRAME, abcorr: str = ABERRATION) -> EphemerisSeries:
    """Serie de un año natural: del 1 de enero 00:00 UTC a la última muestra antes del año siguiente."""
    start = datetime(year, 1, 1, tzinfo=timezone.utc)
    end = datetime(year + 1, 1, 1, tzinfo=timezone.utc) - timedelta(minutes=step_minutes)
    return compute_series(start, end, step_minutes, frame, abcorr)
