# Contrato de datos (pipeline → web)

Todos los archivos se generan en `web/public/data/` y se sirven como estáticos.
Codificación UTF-8, JSON estándar. Los tipos TypeScript equivalentes están en
`web/src/types/dataContract.ts`; las estructuras Python en `data-pipeline/src/lunarnav/`.

Convenciones generales:

- Ángulos en **grados**.
- Latitud: −90 a +90 (norte positivo). Longitud: convención pendiente de fijar
  (−180..180 este positivo, propuesta) — debe ser la misma en todos los archivos.
- Acimut: medido desde el **norte** local, sentido **horario** (hacia el este).
- Fechas en ISO 8601 UTC (`"YYYY-MM-DDTHH:MM:SSZ"`).

---

## `ephemeris.json`

Serie temporal de posiciones del Sol y la Tierra en el marco lunar fijo.

```json
{
  "frame": "string",
  "start": "ISO 8601 UTC",
  "step_minutes": 0,
  "sun":   [[0, 0, 0], ...],
  "earth": [[0, 0, 0], ...]
}
```

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `frame` | string | Nombre del marco lunar fijo usado (p. ej. identificador SPICE). |
| `start` | string | Instante de la primera muestra (UTC). |
| `step_minutes` | number | Intervalo entre muestras consecutivas. |
| `sun` | number[3][] | Vector centro Luna → Sol `[x, y, z]` en `frame`. Unidades: km (propuesta). |
| `earth` | number[3][] | Vector centro Luna → Tierra `[x, y, z]` en `frame`. Mismas unidades. |

Restricciones: `sun.length === earth.length`. El instante de la muestra `i` es
`start + i * step_minutes`.

---

## `horizons/<site_id>.json`

Perfil de horizonte local de un sitio.

```json
{
  "site_id": "string",
  "lat": 0,
  "lon": 0,
  "azimuth_step_deg": 0,
  "horizon_elevation_deg": [0, ...]
}
```

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `site_id` | string | Debe coincidir con `id` en `sites.json` y con el nombre del archivo. |
| `lat` | number | Latitud del punto para el que se calculó el perfil. |
| `lon` | number | Longitud del punto. |
| `azimuth_step_deg` | number | Paso entre acimuts (1 → 360 valores). |
| `horizon_elevation_deg` | number[] | Elevación angular del horizonte para acimut `i * azimuth_step_deg`, empezando en 0° (norte). |

Restricciones: `horizon_elevation_deg.length === 360 / azimuth_step_deg`.

---

## `sites.json`

Lista de sitios candidatos. Fuente de verdad: `data-pipeline/data/sites.json`; el
pipeline la copia/enriquece a `web/public/data/sites.json`.

```json
[
  {
    "id": "string",
    "name": "string",
    "agency": "string | null",
    "type": "string | null",
    "lat": "number | null",
    "lon": "number | null",
    "verified": false,
    "notes": "string (opcional)"
  }
]
```

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | string | Identificador estable (slug), usado en `horizons/<id>.json`. |
| `name` | string | Nombre legible. |
| `agency` | string \| null | Agencia o programa asociado. |
| `type` | string \| null | Tipo de sitio (p. ej. región candidata, sitio histórico…). |
| `lat`, `lon` | number \| null | Coordenadas; `null` mientras no estén verificadas. |
| `verified` | boolean | `true` solo cuando las coordenadas se han contrastado con una fuente (Quickmap). |
| `notes` | string | Opcional. Comentarios / TODOs (JSON no admite comentarios). |

Sitios con `lat`/`lon` a `null` no deben exportarse a la web (o deben marcarse como
no seleccionables).
