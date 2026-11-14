from lunarnav.sites import load_sites, normalize_lon, usable_sites


def test_normalize_lon() -> None:
    assert normalize_lon(0) == 0
    assert normalize_lon(359.5) == -0.5
    assert normalize_lon(190) == -170
    assert normalize_lon(-190) == 170
    assert normalize_lon(180) == 180


def test_load_sites_and_usable() -> None:
    sites = load_sites()
    assert len(sites) >= 1
    # Las entradas sin verificar tienen coordenadas nulas y no son utilizables
    assert all(s.lat is not None for s in usable_sites(sites))
