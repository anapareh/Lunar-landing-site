# Contrato de datos v1 (pipeline → web)

**Versión: 1.0.0 (congelada).** Cualquier cambio se acuerda en el equipo, sube
`contract_version` y se anota en [decisions.md](decisions.md).

Todos los archivos se generan en local con `data-pipeline/` y se escriben en `web/public/data/`.
La web solo lee estos estáticos; nunca llama a servicios externos.

Los JSON Schema (draft 2020-12) de cada archivo están en [`docs/schemas/`](schemas/) y los tests
de `data-pipeline/tests/test_schemas.py` validan con ellos. Tipos equivalentes:
`web/src/types/dataContract.ts` (TS) y los dataclasses de `data-pipeline/src/lunarnav/` (Python).

## Convenciones

| Magnitud | Convención |
|----------|------------|
| Ángulos | grados |
| Latitud | **planetocéntrica**, −90..90, norte positivo |
| Longitud | **este positiva, −180..180** (LOLA y Horizons usan 0..360 → normalizar en el pipeline) |
| Acimut | desde el norte local, en sentido horario: N=0, E=90, S=180, O=270. En el polo exacto (lat = ±90) el "norte" se toma como la dirección del meridiano `lon` del punto |
| Elevación | respecto al plano perpendicular al cénit local |
| Tiempo | ISO 8601 UTC con `Z` (`YYYY-MM-DDTHH:MM:SSZ`) |
| Distancias | km (salvo campos con sufijo `_m`) |
| Marco | `MOON_ME` (mean Earth / polar axis, DE421), el mismo que usa Horizons para sitios lunares |

Todas las raíces llevan `contract_version` (semver).

## Estructura de `web/public/data/`

```
manifest.json
sites.json
ephemeris/<año>.json
horizons/<site_id>.json
basemaps/<archivo>          (imágenes; descritas en manifest.json)
```

---

## `manifest.json`

Índice de lo generado. La web lo carga primero.

```json
{
  "contract_version": "1.0.0",
  "generated_at": "<ISO UTC>",
  "pipeline_commit": "<git sha | null>",
  "frame": "<p. ej. MOON_ME>",
  "aberration_correction": "<p. ej. LT+S>",
  "kernels": ["<nombre de kernel>"],
  "ephemeris": [{ "file": "ephemeris/<año>.json", "start": "<ISO UTC>", "end": "<ISO UTC>" }],
  "horizons": ["<site_id>"],
  "basemaps": [
    { "id": "global | south_pole", "file": "basemaps/<archivo>", "projection": "<descripción>",
      "extent": [0, 0, 0, 0], "credit": "<fuente y licencia>" }
  ]
}
```

- `ephemeris[]`: rangos sin solape, ordenados por `start`.
- `horizons[]`: ids con `horizons/<id>.json` disponible. Si un sitio no aparece → horizonte `geometric`.
- `basemaps[].extent`: límites del raster en las unidades de su proyección (`[xmin, ymin, xmax, ymax]`).

## `ephemeris/<año>.json`

Vectores **centro de la Luna → cuerpo** en `frame`, con corrección `aberration_correction`.

```json
{
  "contract_version": "1.0.0",
  "frame": "<marco>",
  "aberration_correction": "<corrección>",
  "units": "km",
  "start": "<ISO UTC>",
  "step_minutes": 0,
  "count": 0,
  "sun":   [[0, 0, 0]],
  "earth": [[0, 0, 0]],
  "synthetic": false
}
```

- `sun.length === earth.length === count`.
- Instante de la muestra `i` = `start + i · step_minutes`.
- Vectores **con distancia** (no unitarios): la web resta la posición del observador
  (paralaje de la Tierra ≈ 0,26°, no despreciable).
- Redondeo a 0,1 km.
- `synthetic` (opcional, por defecto `false`): `true` solo en los fixtures de desarrollo/test;
  la interfaz muestra un aviso si se carga uno.

## `horizons/<site_id>.json`

Perfil de horizonte local (relieve) de un punto.

```json
{
  "contract_version": "1.0.0",
  "site_id": "<id>",
  "lat": 0,
  "lon": 0,
  "surface_height_m": null,
  "observer_height_m": 0,
  "azimuth_step_deg": 1,
  "horizon_elevation_deg": [0],
  "max_distance_km": 0,
  "dem": { "product": "<nombre>", "resolution_m": 0, "source_url": "<url>" },
  "method_version": "<semver del algoritmo>"
}
```

- `site_id` coincide con el nombre del archivo y con un `id` de `sites.json`
  (o con un id de variante cercana, ver `parent_site_id`).
- `horizon_elevation_deg.length === 360 / azimuth_step_deg`; índice 0 = norte, luego en sentido horario.
- `surface_height_m`: altura del terreno en el punto según el DEM (null si no se conoce).
- `observer_height_m`: altura del observador/panel sobre el suelo usada en el cálculo.
- `parent_site_id` (opcional): si es una **variante cercana** calculada, id del sitio curado de
  referencia. Estas variantes son puntos calculados, no sitios reales.

## `sites.json`

Fuente de verdad: `data-pipeline/data/sites.json` (la edita el equipo de contenido).
El pipeline la valida y la copia a `web/public/data/sites.json`.

```json
{
  "contract_version": "1.0.0",
  "sites": [
    {
      "id": "<slug>",
      "name": "<nombre>",
      "mission": "<misión | null>",
      "agency": "<agencia u operador | null>",
      "category": "apollo | clps | commercial | other_agency | artemis | other",
      "status": "landed | planned | candidate | failed",
      "location_kind": "landing_point | planned_target | region_center",
      "lat": null,
      "lon": null,
      "date": { "value": "YYYY[-MM[-DD]] | null", "kind": "actual | planned | null", "precision": "day | month | year | null" },
      "sources": [{ "label": "<texto>", "url": "<url>" }],
      "verified": false,
      "verified_by": null,
      "verified_on": null,
      "notes": "<texto | null>"
    }
  ]
}
```

| Campo | Notas |
|-------|-------|
| `id` | slug estable (`^[a-z0-9][a-z0-9-]*$`), nombre de archivo del horizonte |
| `category` | programa; alimenta los chips de filtro |
| `status` | el filtro "Históricas" = `landed` \| `failed` |
| `location_kind` | punto de aterrizaje exacto, objetivo planificado o centro de una región (área) |
| `lat`, `lon` | `null` = no utilizable (no seleccionable en la web) |
| `date` | fecha real (`actual`) o prevista (`planned`) con su precisión; todo `null` si se desconoce |
| `sources` | al menos una si `verified: true` |
| `verified` | `true` solo tras comprobar las coordenadas (Quickmap) con doble revisión; exige `lat`, `lon`, `verified_by`, `verified_on` (fecha `YYYY-MM-DD`) |
| `notes` | TODOs, "pendiente de verificar" (JSON no admite comentarios) |

Las coordenadas libres no van en este archivo: la web las crea en memoria con
`category: "other"`, `id: "custom-…"` y horizonte `geometric`.

## `golden.json` (solo tests)

`web/src/lib/__fixtures__/golden.json`, generado por `data-pipeline` directamente desde SPICE
para comprobar que la conversión en TS coincide con la referencia de Python.

```json
{
  "contract_version": "1.0.0",
  "frame": "<marco>",
  "cases": [
    { "lat": 0, "lon": 0, "time": "<ISO UTC>",
      "sun":   { "elevation_deg": 0, "azimuth_deg": 0 },
      "earth": { "elevation_deg": 0, "azimuth_deg": 0 } }
  ]
}
```
