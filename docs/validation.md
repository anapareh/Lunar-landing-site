# Validación

Estado: **comprobación preliminar superada** (14 nov 2026). La validación completa (más puntos y un
mes entero contra JPL Horizons, con `scripts/validate_horizons.py` y caché) está pendiente.

## 1. Efeméride SPICE frente a JPL Horizons (comprobación puntual)

**Configuración**
- Nuestra efeméride: SpiceyPy, kernels de `data-pipeline/kernels.json` (`de440s.bsp` para posiciones,
  `moon_pa_de421_1900-2050.bpc` + `moon_080317.tf` para el marco), marco `MOON_ME`, corrección `LT+S`.
- Conversión a elevación/acimut: la misma fórmula que `web/src/lib/sunEarth.ts` (esfera de 1737,4 km,
  base Este-Norte-Arriba, vector observador → cuerpo).
- Horizons (API v1.2): `EPHEM_TYPE='OBSERVER'`, `CENTER='coord@301'`, `COORD_TYPE='GEODETIC'`,
  `SITE_COORD='<E-lon>,<lat>,0'`, `QUANTITIES='4'` (Apparent AZ & EL, airless), salida en grados.
- Fechas: 14 nov 2026, 00:00–02:00 UT, paso 1 h. Puntos: (0°, 0°) y (−89,5°, 45° E).

**Resultado**

| Punto | Cuerpo | Elevación (nuestra = Horizons) | Δ elevación | Δ acimut |
|---|---|---|---|---|
| 0°, 0° | Sol | −36,6023° → −35,5871° | 0,0000° | 0,0000° |
| 0°, 0° | Tierra | 85,4092° → 85,4581° | 0,0000° | ≤ 0,0001° |
| −89,5°, 45° E | Sol | 1,6294° → 1,6382° | 0,0000° | 0,0000° |
| −89,5°, 45° E | Tierra | −4,3024° → −4,2184° | 0,0000° | 0,0000° |

Diferencias en el límite de resolución de la salida de Horizons (4 decimales). Confirma el marco,
la corrección de aberración, las convenciones de coordenadas y la conversión topocéntrica de la web.
Cierra Q-103 (`de440s` para posiciones) y Q-107 (`CENTER='coord@301'`).

## 2. Error de interpolar la efeméride horaria (como hace la web)

Interpolación lineal de los vectores de la serie horaria frente a SPICE exacto cada 10 min,
del 1 al 31 de noviembre de 2026.

| Punto | Sol: error máx. de elevación | Tierra: error máx. de elevación |
|---|---|---|
| 0°, 0° | 0,000015° (0,05″) | 0,000125° (0,45″) |
| −89,5°, 45° E | 0,000015° (0,05″) | 0,000096° (0,35″) |
| 45°, −60° | 0,000015° (0,05″) | 0,000082° (0,30″) |

Despreciable frente al tamaño angular del Sol (~0,27° de radio). Cierra Q-101: paso de 60 min.

## 3. Horizonte LOLA

**Método** (`data-pipeline/src/lunarnav/horizon.py`): DEM `LDEM_85S_40M` (cerca, ≤ 20 km) y
`LDEM_75S_240M` (lejos, ≤ 300 km); 360 acimuts; ángulo de elevación con curvatura exacta
`atan2(r₁ cos θ − r₀, r₁ sin θ)`; observador a 2 m sobre el terreno.

**Comprobaciones automáticas** (`tests/test_horizon.py`)
- Luna lisa: el horizonte es la depresión geométrica `−acos(R/(R+h))` (≈ −0,087° para 2 m).
- Muro anular de 1 km a 5 km: ángulo analítico (≈ 11,2°) en todos los acimuts.
- Montaña solo al este: afecta solo a los acimuts del este.
- Polo exacto: perfil uniforme sobre terreno liso.
- Proyección estereográfica polar idéntica a la de GDAL en 20 puntos aleatorios. La descripción
  del `DSMAP_POLAR.CAT` (lon 0° arriba, 90° E a la derecha) coincide con GDAL; su fórmula directa
  tiene el signo de X cruzado y no se usa.

**Impacto** (día lunar desde el 14 nov 2026, efeméride SPICE, criterio "asoma el borde superior")

| Punto | Horizonte LOLA | Luz: geométrico → LOLA | Tierra: geométrico → LOLA |
|---|---|---|---|
| −89,5°, 45° E | −0,9° … 13,4° | 100 % → 51,3 % | 47,5 % → 44,5 % |
| −89,9°, 120° E | 4,2° … 34,0° | 100 % → 0,0 % | 45,7 % → 0,0 % |
| −88,0°, −60° | −2,0° … 16,9° | 84,4 % → 50,3 % | 51,2 % → 42,0 % |

**Pendiente:** comparar perfiles con los de Quickmap en 4–8 acimuts por sitio.

## 4. Pendiente

- Validación completa contra Horizons: 3–4 puntos (ecuatorial, limbo, polo sur, cara oculta),
  un mes, error máximo y medio, e instantes de orto/ocaso. Script: `data-pipeline/scripts/validate_horizons.py`.
- Golden test TS vs Python (`web/src/lib/__fixtures__/golden.json`).
- Horizonte LOLA frente a perfiles de Quickmap.
- Coordenadas de los sitios frente a Quickmap (doble revisión).
