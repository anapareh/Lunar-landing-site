# Lunar Landing Site Navigator

Proyecto para el reto **NASA Space Apps – "Lunar Landing Site Navigator"**.

Una herramienta web para comparar rápidamente sitios y fechas de aterrizaje lunar según
la **elevación del Sol** y la **visibilidad de la Tierra**, teniendo en cuenta el
**horizonte local del relieve** (no solo el horizonte geométrico).

> Estado: **esqueleto**. Solo hay estructura y configuración; no hay lógica de cálculo,
> visualizaciones ni pipelines implementados.

## Arquitectura

```
┌──────────────────────────┐   JSON estáticos    ┌──────────────────────────┐
│ data-pipeline/ (Python)  │ ──────────────────▶ │ web/ (Vite+React+TS)     │
│ - efemérides Sol/Tierra  │  web/public/data/   │ - elevación/acimut local │
│ - horizontes desde LOLA  │                     │ - aplica horizonte       │
│ - exporta JSON           │                     │ - métricas y gráficos    │
└──────────────────────────┘                     └──────────────────────────┘
```

- **Sin backend**: el pipeline precalcula todo offline y la web es estática.
- Las efemérides se precalculan una vez en el marco lunar fijo; la web deriva
  elevación/acimut para cualquier lat/lon.
- El horizonte se obtiene por niveles (geométrico → perfil desde DEM LOLA).

Detalles en [docs/architecture.md](docs/architecture.md) y el formato de los datos en
[docs/data-contract.md](docs/data-contract.md).

## Estructura

```
data-pipeline/   Python 3.11+: efemérides, horizontes, exportación a JSON
  raw/           (gitignored) descargas LOLA y kernels SPICE
  src/lunarnav/  paquete Python
  scripts/       utilidades (validación contra JPL Horizons)
  data/          sites.json (fuente de verdad de los sitios)
  tests/
web/             Vite + React + TypeScript
  src/types/     tipos del data-contract
  src/lib/       cálculos en cliente (Sol/Tierra, horizonte, métricas)
  src/components/
  src/store/     estado global (zustand)
  public/data/   JSON generados por el pipeline
docs/            arquitectura y contrato de datos
```

## Cómo arrancar

Requisitos: Python 3.11+, Node 20+ (probado con Node 24), git.

```bash
# Pipeline de datos
cd data-pipeline
python -m venv .venv
# Windows: .venv\Scripts\activate   |  Unix: source .venv/bin/activate
pip install -e ".[dev]"
python scripts/fetch_kernels.py      # descarga los kernels SPICE (~35 MB) a raw/kernels/
python scripts/build_ephemeris.py    # genera web/public/data/ephemeris/<año>.json + manifest.json
pytest

# Web
cd web
npm install
npm run dev
```

El `Makefile` tiene los targets `setup`, `data`, `web-dev`, `web-build`, `validate`
(de momento solo imprimen un TODO).

## Reparto de trabajo (propuesta)

| Área | Responsable | Archivos principales |
|------|-------------|----------------------|
| Efemérides (Sol/Tierra en marco lunar) | _TBD_ | `data-pipeline/src/lunarnav/ephemeris.py` |
| Horizonte desde DEM LOLA | _TBD_ | `data-pipeline/src/lunarnav/horizon.py` |
| Sitios y exportación | _TBD_ | `sites.py`, `export.py`, `data/sites.json` |
| Validación (JPL Horizons) | _TBD_ | `scripts/validate_horizons.py` |
| Cálculo en cliente | _TBD_ | `web/src/lib/*` |
| UI y visualizaciones | _TBD_ | `web/src/components/*`, `App.tsx` |

## Fuentes de datos previstas

- LOLA (Lunar Orbiter Laser Altimeter) – DEM, vía PDS / LROC Quickmap.
- Kernels SPICE de NAIF (efemérides planetarias y orientación lunar).
- JPL Horizons como referencia de validación.

## Créditos

- Textura del globo lunar (`web/public/textures/moon/lroc_color_2k.jpg`): CGI Moon Kit,
  NASA's Scientific Visualization Studio (https://svs.gsfc.nasa.gov/4720), a partir del mosaico de color
  LROC WAC (Arizona State University). Uso solo visual.
