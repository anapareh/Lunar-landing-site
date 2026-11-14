"""Lectura de los DEM polares de LOLA (PDS3, estereográfica polar, alturas int16 × 0,5 m).

Proyección (DSMAP_POLAR.CAT del volumen LOLA GDR; orientación contrastada con GDAL):
- Polo sur en el centro; longitud 0° hacia arriba y 90° E hacia la derecha.
- r = 2·R·tan((90 − |lat|)/2), con R = 1 737 400 m (esfera del producto).
- columna (0-based) = r·sin(lon)/escala + N/2 − 0,5
- fila    (0-based) = −r·cos(lon)/escala + N/2 − 0,5
Las alturas son relativas a la esfera de 1737,4 km (la misma que usa la web).
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from pathlib import Path

import numpy as np

R_M = 1_737_400.0


@dataclass
class PolarDem:
    """DEM polar sur en memoria (memmap) con interpolación bilineal en lat/lon."""

    name: str
    heights: np.ndarray  # int16 (DN); altura en m = DN · scale
    scale_m_per_px: float
    dn_scale: float
    max_lat: float  # borde de cobertura aproximado (p. ej. −85)
    source_url: str | None = None

    @property
    def n(self) -> int:
        return self.heights.shape[0]

    def latlon_to_pixel(self, lat: np.ndarray, lon: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
        """(fila, columna) fraccionarias, 0-based."""
        lat = np.asarray(lat, dtype=float)
        lon = np.radians(np.asarray(lon, dtype=float))
        r = 2 * R_M * np.tan(np.radians(90 - np.abs(lat)) / 2)
        col = r * np.sin(lon) / self.scale_m_per_px + self.n / 2 - 0.5
        row = -r * np.cos(lon) / self.scale_m_per_px + self.n / 2 - 0.5
        return row, col

    def height_at(self, lat: np.ndarray, lon: np.ndarray) -> np.ndarray:
        """Altura (m) sobre la esfera de referencia; NaN fuera del DEM."""
        row, col = self.latlon_to_pixel(lat, lon)
        n = self.n
        r0 = np.floor(row).astype(int)
        c0 = np.floor(col).astype(int)
        inside = (r0 >= 0) & (c0 >= 0) & (r0 < n - 1) & (c0 < n - 1) & (np.asarray(lat) < 0)
        out = np.full(row.shape, np.nan)
        if not inside.any():
            return out
        r0i, c0i = r0[inside], c0[inside]
        fr, fc = row[inside] - r0i, col[inside] - c0i
        h = self.heights
        h00 = h[r0i, c0i].astype(float)
        h01 = h[r0i, c0i + 1].astype(float)
        h10 = h[r0i + 1, c0i].astype(float)
        h11 = h[r0i + 1, c0i + 1].astype(float)
        out[inside] = ((h00 * (1 - fc) + h01 * fc) * (1 - fr) + (h10 * (1 - fc) + h11 * fc) * fr) * self.dn_scale
        return out


def _label_value(text: str, key: str) -> str:
    m = re.search(rf"^\s*{key}\s*=\s*\"?([^\"\n<]+)", text, re.MULTILINE)
    if not m:
        raise ValueError(f"Falta {key} en la etiqueta")
    return m.group(1).strip()


def open_polar_dem(lbl_path: Path, source_url: str | None = None) -> PolarDem:
    """Abre un DEM LOLA polar sur a partir de su etiqueta .lbl (el .img al lado, en minúsculas)."""
    text = lbl_path.read_text(encoding="latin-1")
    if "POLAR STEREOGRAPHIC" not in text or float(_label_value(text, "CENTER_LATITUDE")) != -90:
        raise ValueError(f"{lbl_path.name}: no es un DEM estereográfico polar sur")
    if _label_value(text, "SAMPLE_TYPE") != "LSB_INTEGER" or int(_label_value(text, "SAMPLE_BITS")) != 16:
        raise ValueError(f"{lbl_path.name}: formato de muestra no soportado")
    lines = int(_label_value(text, "LINES"))
    samples = int(_label_value(text, "LINE_SAMPLES"))
    if lines != samples:
        raise ValueError("Se esperaba una imagen cuadrada")
    img = lbl_path.with_suffix(".img")
    heights = np.memmap(img, dtype="<i2", mode="r", shape=(lines, samples))
    return PolarDem(
        name=lbl_path.stem.upper(),
        heights=heights,
        scale_m_per_px=float(_label_value(text, "MAP_SCALE")),
        dn_scale=float(_label_value(text, "SCALING_FACTOR")),
        max_lat=float(_label_value(text, "MAXIMUM_LATITUDE")),
        source_url=source_url,
    )
