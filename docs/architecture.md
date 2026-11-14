# Arquitectura

## Objetivo

Herramienta web estática para comparar rápidamente **escenarios de aterrizaje (sitio + fecha)**,
con foco en el **polo sur lunar**. Muestra la posición del Sol y la Tierra respecto al
**horizonte local del relieve** para evaluar la **energía** (elevación solar, horas de luz,
tiempo hasta el ocaso) y la **comunicación directa con la Tierra** (ventanas de visibilidad,
tiempo hasta que se pone la Tierra). Público: planificadores de misión, educadores y público general.

Decisiones numeradas en [decisions.md](decisions.md). Formato de datos en [data-contract.md](data-contract.md).

## Flujo de datos

```
data-pipeline/ (local, Python)                              web/ (estática, navegador)
──────────────────────────────                              ──────────────────────────
raw/kernels ─▶ ephemeris.py (SpiceyPy, MOON_ME, LT+S) ─┐
raw/lola    ─▶ dem.py + horizon.py (360 acimuts)    ─┼─▶ export.py ─▶ web/public/data/ ─▶ loaders.ts
data/sites.json ─▶ sites.py (schema)                 ─┘                                    │
                                                                                            ▼
Horizons API ─▶ horizons_client.py (caché raw/) ─▶ validate_horizons.py      sunEarth.ts → horizon.ts → metrics.ts
                                                   └─▶ docs/validation.md          │
                                                                                    ▼
                                                                            gráficas, mapa, tabla
```

## Decisiones clave

### 1. Precalcular efemérides; convertir en el navegador
- La posición del Sol y la Tierra en el marco lunar fijo **no depende del sitio**. El pipeline
  calcula una serie temporal de vectores centro Luna → cuerpo (`ephemeris/<año>.json`).
- La web convierte, para cualquier lat/lon: posición del observador → base local Este-Norte-Arriba →
  elevación/acimut, interpolando entre muestras.
- Vectores **con distancia**: la paralaje de la Tierra (≈ 0,26°) exige restar la posición del observador.
- Marco `MOON_ME` (DE421) y corrección `LT+S`: el mismo modelo que usa Horizons para sitios
  lunares, de modo que la validación compara lo mismo. La libración queda incluida con los kernels
  de orientación PA/ME.
- Sin atmósfera: sin refracción.

### 2. Horizonte por niveles
1. **`dem`**: perfil de 360 acimuts precalculado desde LOLA para los sitios curados (y sus
   variantes cercanas en el polo sur).
2. **`geometric`**: horizonte esférico (0°) para las coordenadas libres.

El nivel aplicado se muestra **siempre** (tabla, gráfica, resumen), no solo en un aviso.

### 3. Sin backend
- Todo lo generado se commitea como JSON en `web/public/data/`; el despliegue no ejecuta el pipeline.
- La web nunca llama a Horizons ni a otros servicios. Horizons solo se usa desde scripts locales
  (validación y, como plan B, az/el de sitios concretos), con caché en `data-pipeline/raw/`.

### 4. Escenarios
- La comparación trabaja con escenarios `{siteId, date}` (máx. 4), así que admite "mismo sitio, otra
  fecha" (caso de un retraso de lanzamiento) y "otro sitio de la misma región".

## Validación
- `scripts/validate_horizons.py`: SPICE vs Horizons en 3–4 puntos de prueba → `docs/validation.md`.
- `golden.json`: TS vs la referencia de Python desde SPICE (vitest).
- Quickmap: coordenadas de los sitios (doble revisión) y comprobación puntual de los perfiles de horizonte.
