"""Test de humo: el paquete se instala e importa. Añadir tests reales junto a cada módulo."""


def test_package_imports() -> None:
    import lunarnav
    from lunarnav import ephemeris, export, horizon, sites  # noqa: F401

    assert lunarnav.__version__
