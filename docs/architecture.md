# Arquitectura

## Objetivo

Permitir comparar rápidamente sitios y fechas de aterrizaje lunar según la elevación del
Sol y la visibilidad de la Tierra, teniendo en cuenta el horizonte del relieve.

## Decisiones

### 1. Precalcular efemérides (offline)

- El pipeline Python calcula una única serie temporal con los vectores Sol y Tierra
  **en el marco lunar fijo** (body-fixed), centrados en la Luna.
- La web convierte esos vectores en elevación/acimut para cualquier lat/lon con
  trigonometría sencilla. Así no hace falta recalcular efemérides por sitio.
- Motivo: librerías como SPICE/Skyfield no corren en el navegador y el coste de
  precalcular es bajo comparado con el beneficio.
- Pendiente de decidir: marco exacto (p. ej. `MOON_ME` vs `MOON_PA`), rango temporal y
  `step_minutes` (compromiso tamaño de JSON / resolución).

### 2. Horizonte por niveles

1. **Nivel 0 – geométrico**: horizonte a 0° (esfera). Disponible para cualquier punto.
2. **Nivel 1 – perfil desde DEM**: 360 acimuts con la elevación angular del relieve,
   calculados en el pipeline desde un DEM LOLA para los sitios de `sites.json`.
3. (Futuro) mayor resolución o radio de búsqueda variable si el tiempo lo permite.

La web usa el mejor nivel disponible para cada sitio y debe indicar cuál está aplicando.

### 3. Sin backend

- Todo lo que genera el pipeline se escribe como JSON estático en `web/public/data/`.
- La web es estática (Vite build) y se puede desplegar en cualquier hosting estático.
- Consecuencia: los sitios con horizonte DEM son solo los precalculados; para puntos
  arbitrarios se usa el horizonte geométrico.

## Flujo

```
raw/ (LOLA, kernels) ─▶ ephemeris.py ─┐
                       horizon.py   ─┼─▶ export.py ─▶ web/public/data/*.json ─▶ web
data/sites.json ─────▶ sites.py     ─┘
```

## Validación

`scripts/validate_horizons.py` comparará elevación/acimut del Sol y la Tierra para
puntos de prueba contra la API de JPL Horizons.
