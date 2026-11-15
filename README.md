# Apollo Atlas · Lunar Landing Site Navigator

NASA Space Apps Challenge 2026 · challenge **"Lunar Landing Site Navigator"** · team **HerTech**.

**Live app:** _pending deployment (Vercel)_ · UI in **English and Spanish** (button in the header, or `?lang=en`).

---

## English summary

Apollo Atlas is a static web app to compare lunar landing sites and dates by **sunlight** (power)
and **direct line of sight to Earth** (communications), taking the **real local horizon** into account
at the lunar south pole.

Pick any point on a 3D Moon (or one of 31 real landing sites) and a date, and the app shows:

- where the Sun and Earth are in the local sky (elevation / azimuth), and how much of the solar disk is visible;
- the next sunset or sunrise, when Earth sets or rises, and the hours of light and of Earth visibility over one lunar day (≈ 29.5 days);
- the **best window** (longest interval with both Sun and Earth) and the **longest night**;
- a global Sun/Earth map, the local horizon profile, and a first-person view from the surface (Advanced mode);
- a side-by-side comparison of up to 4 scenarios (site + date), e.g. a launch delay;
- for each historic mission, a button to see its **actual landing day**.

**Data, all computed or published — no invented scores:**

| What | Source | Check |
|---|---|---|
| Sun and Earth positions | NASA/JPL SPICE kernels (`de440s`, `moon_pa_de421`, frame `MOON_ME`, `LT+S`), years 1966–1976, 2013, 2019–2020, 2023–2028 | Matches JPL Horizons to ≤ 0.0002° (1969, 2025, 2026 checks) |
| South-pole terrain horizon (85°–90° S) | LRO **LOLA** DEMs (`LDEM_85S_40M`, `LDEM_75S_240M`), ray-traced to 300 km on a 5 km grid | Analytic tests + projection checked against GDAL |
| 31 landing sites | NASA NSSDCA table of spacecraft on the Moon (positions measured on LROC images) | Pending the team's double check in Quickmap |
| Artemis III candidate regions | NASA release 24-136 (28 Oct 2024) | NASA does not publish region centers: no coordinates |

Simple mode explains everything in plain sentences; Advanced mode shows the raw angles. Works on mobile.
No backend: everything is precomputed and runs in the browser.

---

## Qué es (español)

Herramienta web estática para comparar sitios y fechas de alunizaje según la **luz solar** (energía) y la
**visibilidad directa de la Tierra** (comunicaciones), con el **horizonte real del relieve** en el polo sur.

- **Globo 3D** con el Sol y la Tierra en su dirección real; clic para elegir punto.
- **Ficha del punto** junto al marcador: en Simple, frases claras; en Avanzado, ángulos, márgenes, punto subsolar y libración.
- **Mapa de Sol y Tierra** (global o polo sur), **evolución durante un día lunar** con mejor ventana y noche más larga, y **perfil del horizonte**.
- **Vista local** desde la superficie: horizonte real y Sol y Tierra a su tamaño angular real.
- **Comparativa** de hasta 4 escenarios (sitio + fecha) con resumen en frases.
- **31 misiones reales** con filtros (polo sur, Apollo, robóticas, CLPS, fallidas) y botón «Ver el día del aterrizaje».
- **Simulación** del paso del tiempo, versión **móvil** e interfaz **ES / EN**.

## Parámetros de URL

| Parámetro | Ejemplo | Efecto |
|---|---|---|
| `sitio` | `?sitio=apollo-11` | Selecciona un sitio de `sites.json` |
| `lat`, `lon` | `?lat=-89.5&lon=45` | Coordenadas (lat planetocéntrica, lon este +) |
| `fecha` | `?fecha=1969-07-20T00:00Z` | Fecha de referencia (UTC) |
| `modo` | `?modo=avanzado` | `simple` o `avanzado` |
| `vista` | `?vista=local` | Vista local (en modo avanzado) |
| `panel` | `?panel=condiciones` | En móvil, abre la hoja `sitios` o `condiciones` |
| `lang` | `?lang=en` | Idioma `es` o `en` |

## Arquitectura

```
┌──────────────────────────┐   JSON estáticos    ┌──────────────────────────┐
│ data-pipeline/ (Python)  │ ──────────────────▶ │ web/ (Vite+React+TS)     │
│ - efemérides SPICE       │  web/public/data/   │ - elevación/acimut local │
│ - horizontes LOLA        │                     │ - aplica el horizonte    │
│ - sitios (NSSDCA)        │                     │ - métricas, 3D, gráficas │
└──────────────────────────┘                     └──────────────────────────┘
```

Sin backend. Contrato de datos en [docs/data-contract.md](docs/data-contract.md), decisiones en
[docs/decisions.md](docs/decisions.md), validación en [docs/validation.md](docs/validation.md) y guion de
la demo en [docs/demo-script.md](docs/demo-script.md).

## Cómo arrancar

Requisitos: Python 3.11+, Node 20+.

```bash
# Web (los datos ya están generados en web/public/data/)
cd web
npm install
npm run dev          # http://localhost:5173
npm test && npm run build

# Pipeline de datos (solo para regenerar)
cd data-pipeline
python -m venv .venv
# Windows: .venv\Scripts\activate   |  Unix: source .venv/bin/activate
pip install -e ".[dev]"
python scripts/fetch_kernels.py                      # kernels SPICE (~35 MB) a raw/kernels/
python scripts/build_ephemeris.py --years 1969 2026  # web/public/data/ephemeris/<año>.json + manifest
python scripts/fetch_lola.py                         # DEM LOLA del polo sur a raw/lola/
python scripts/build_horizon_grid.py                 # rejilla de horizontes (≈ 45 min)
python scripts/export_sites.py                       # data/sites.json → web/public/data/sites.json
pytest
```

## Despliegue

Vercel: importar el repositorio, **Root Directory `web`**, framework Vite. Cada push a `main` vuelve a desplegar.

## Créditos

- Efemérides: NASA/JPL NAIF SPICE. Validación: JPL Horizons.
- Relieve: LRO LOLA (NASA PDS Geosciences Node).
- Sitios: NASA NSSDCA, posiciones medidas con LROC (NASA/GSFC/Arizona State University).
- Textura del globo (`web/public/textures/moon/lroc_color_2k.jpg`): CGI Moon Kit, NASA's Scientific
  Visualization Studio (https://svs.gsfc.nasa.gov/4720), a partir del mosaico LROC WAC (ASU). Uso solo visual.
