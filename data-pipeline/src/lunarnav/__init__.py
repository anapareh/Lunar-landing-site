"""lunarnav: pipeline de datos de Lunar Landing Site Navigator.

Módulos:
- ephemeris: vectores Sol/Tierra en el marco lunar fijo (serie temporal).
- horizon:   perfiles de horizonte local desde un DEM LOLA.
- sites:     carga y validación de data/sites.json.
- export:    escritura de los JSON definidos en docs/data-contract.md.
"""

__version__ = "0.0.1"
