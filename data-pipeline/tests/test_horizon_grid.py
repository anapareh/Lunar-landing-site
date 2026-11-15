import json
import math

import numpy as np
import pytest

from lunarnav.horizon_grid import MISSING, GridSpec, grid_nodes, nearest_node, node_index, node_latlon, write_grid


def test_node_latlon_roundtrip_and_orientation() -> None:
    s = 5000.0
    assert node_latlon(0, 0, s) == (-90.0, 0.0)
    lat, lon = node_latlon(1, 0, s)  # +X = lon 90° E
    assert lon == pytest.approx(90.0)
    assert lat == pytest.approx(-90 + math.degrees(2 * math.atan(s / (2 * 1_737_400))))
    assert node_latlon(0, 1, s)[1] == pytest.approx(0.0)  # +Y = lon 0°
    for i, j in [(3, -7), (-12, 5), (20, 20)]:
        lat, lon = node_latlon(i, j, s)
        assert nearest_node(lat, lon, s) == (i, j)


def test_grid_covers_only_inside_max_lat() -> None:
    spec = GridSpec("t", 5000.0, -85.0)
    nodes = grid_nodes(spec)
    assert all(lat <= -85.0 + 1e-9 for _, _, lat, _ in nodes)
    assert 2500 < len(nodes) < 3300  # ≈ π·(151,7 km)² / (5 km)²


def test_write_grid_layout(tmp_path) -> None:
    spec = GridSpec("t", 50_000.0, -85.0)  # rejilla gruesa para el test
    prof = [float(k % 10) for k in range(360)]
    jpath, bpath = write_grid(tmp_path, spec, {(1, 2): (prof, -123.4)}, 1.0, 2.0, 300.0, {"product": "X", "resolution_m": 40, "source_url": None}, "1.0.0")
    meta = json.loads(jpath.read_text(encoding="utf-8"))
    data = np.fromfile(bpath, dtype="<i2").reshape(spec.n * spec.n, 360)
    idx = node_index(1, 2, spec)
    np.testing.assert_allclose(data[idx] * meta["value_scale_deg"], prof)
    assert meta["surface_height_m"][idx] == -123.4
    assert (data[node_index(0, 0, spec)] == MISSING).all()
    assert meta["half_size"] == spec.half_size and meta["node_count"] == 1
