# Registro de decisiones

Formato: `D-NNN` decisión tomada · `Q-NNN` pregunta abierta. Al cerrar una pregunta, se mueve a
decisiones con fecha y motivo. Plan completo acordado: ver README y `architecture.md`.

## Decisiones tomadas

| Id | Fecha | Decisión | Motivo |
|----|-------|----------|--------|
| D-001 | 2026-11-14 | Sin backend: el pipeline se ejecuta en local y commitea JSON estáticos en `web/public/data/` | Requisito del reto / simplicidad de despliegue |
| D-002 | 2026-11-14 | La web nunca llama a Horizons; sin proxy | Horizons solo se usa desde scripts locales (validación y plan B) |
| D-003 | 2026-11-14 | Efemérides con SpiceyPy en `MOON_ME` (DE421), corrección `LT+S` | Es el modelo que usa Horizons para sitios lunares → validación comparable |
| D-004 | 2026-11-14 | Se elimina `skyfield` de las dependencias | Duplica la vía SpiceyPy sin aportar |
| D-005 | 2026-11-14 | Contrato de datos v1.0.0 congelado (`data-contract.md` + `schemas/`) | Permite trabajar en paralelo; CI valida el formato |
| D-006 | 2026-11-14 | Longitud este positiva −180..180; latitud planetocéntrica; acimut N→E | Convención única en todos los archivos |
| D-007 | 2026-11-14 | Efemérides troceadas por año, con `manifest.json` y carga perezosa | Cubrir años históricos y futuros sin descargar todo |
| D-008 | 2026-11-14 | Unidad de comparación = escenario (sitio + fecha), máx. 4 | El enunciado pide evaluar fechas alternativas en el mismo sitio |
| D-009 | 2026-11-14 | Mapa: fondo estático pregenerado + marcadores con `d3-geo`; WMTS de Moon Trek solo como extra | Las proyecciones polares en WMTS son complejas y el CORS no está confirmado |
| D-010 | 2026-11-14 | Despliegue en Vercel (root `web/`); las cargas usan `BASE_URL` para poder pasar a GitHub Pages | Previsualizaciones por PR |
| D-011 | 2026-11-14 | Mapa principal = **globo lunar 3D** (three.js, carga diferida) iluminado desde la dirección del Sol, con marcadores de Sol/Tierra y selección por clic. Sustituye al mapa 2D estático de D-009 como vista principal | Más visual (objetivo 5) y sirve también para elegir coordenadas |
| D-012 | 2026-11-14 | Textura del globo: `lroc_color_2k.jpg` del CGI Moon Kit (NASA SVS, mosaico LROC WAC de ASU), con crédito visible. Solo visual: los cálculos no la usan | La propia fuente avisa de que está "optimizada para la estética, no para ciencia" |
| D-013 | 2026-11-14 | La gráfica de elevación amplía el eje vertical cuando todo ocurre cerca del horizonte, y lo indica | En el polo sur el Sol se mueve en pocos grados; con −90..90 la gráfica es una línea plana |
| D-014 | 2026-11-14 | Interfaz con la **estética HUD de `web/estetica.html`** (Tailwind v4, fuentes empaquetadas, solo tema oscuro), copiando **solo el aspecto**: sin índice de misión, irradiancia, temperatura, geología, "bonus" polar ni sitios sin verificar | Decisión de la usuaria; cada número mostrado sale de `lib/` y tiene tests |
| D-015 | 2026-11-14 | Globo holográfico: Sol y Tierra como esferas en su dirección real (no a escala), rayo solar si el Sol es visible desde el punto y enlace DTE cian/rojo según la visibilidad calculada. Retícula, borde, estrellas y anillos son decorativos | Representación de la referencia, alimentada con datos propios |
| D-016 | 2026-11-14 | **Simulación** del paso del tiempo (1 h/s, 6 h/s, 1 d/s) moviendo un cursor dentro de la ventana; franja del día lunar arrastrable; **radar del terminador** 2D (global / polo sur) con terminador geométrico | Objetivo 6 del reto; el radar es orientativo a escala global, las métricas usan el horizonte del punto |
| D-017 | 2026-11-14 | Líneas de la gráfica en tonos validados (Sol `#c98500`, Tierra `#0fa3c2`); los neón de la referencia solo en decoración | Los neón fallan la banda de luminosidad del validador de paleta sobre el fondo void |

## Pendiente de medir / decidir durante el evento

| Id | Tema | Propuesta | Se decide en |
|----|------|-----------|--------------|
| Q-101 | Paso de la efeméride (`step_minutes`) | 30–60 min con interpolación en el navegador | Hito M2 (tras validar) |
| Q-102 | Tolerancia frente a Horizons | < 0,05° en elevación (a ajustar) | Hito M2 |
| Q-103 | SPK de posiciones: `de421.bsp` o `de440.bsp` | El que deje menor error frente a Horizons | Hito M2 |
| Q-104 | Producto y resolución del DEM LOLA; radio máximo del horizonte | Dos niveles (fino cerca, grueso lejos) | B2–B3 |
| Q-105 | Altura del observador/panel sobre el suelo | Parámetro en `horizons/*.json` | B3 |
| Q-106 | Radios y número de puntos de las "variantes cercanas" | Según el coste de cálculo | B4–B5 |
| Q-107 | Formato de `CENTER` en Horizons (`coord@301`) | Confirmar con una llamada de prueba | B1 |

## Preguntas abiertas (no asumidas)

| Id | Pregunta |
|----|----------|
| Q-001 | ¿Qué incluye la pestaña **Resources** del reto (lista de sitios, productos LOLA, datos precalculados)? |
| Q-002 | Hora límite de entrega y zona horaria; entregables obligatorios (vídeo, URL, repo público) |
| Q-003 | ¿Se permite preparación previa antes del inicio oficial? |
| Q-004 | Idioma de la entrega y de la interfaz |
| Q-005 | ¿Las regiones candidatas de Artemis cuentan como sitios? ¿Con qué punto representativo? |
| Q-006 | Visibilidad de la Tierra: ¿elevación mínima configurable para la antena? **Implementado como parámetro** (`minClearanceDeg` en `web/src/lib/horizon.ts`), por defecto 0°. Falta decidir si se expone en la interfaz |
| Q-007 | Definición de ocaso y de luz. **Por defecto provisional: `anyPart`** (visible mientras asome el borde superior; ocaso = 0 % del disco). También se puede elegir `center` o `full`. La fracción visible del disco se calcula siempre |
| Q-008 | Rango de fechas: ¿también recrear los aterrizajes históricos? ¿Uno o varios años para las "estaciones"? |
| Q-009 | Una misión CLPS que ya aterrizó: ¿aparece en "CLPS" y en "Históricas"? (propuesta: sí; filtros = categoría + estado) |

## Pendiente de verificar (no confirmado)

- Nombres exactos y rango de cobertura de los kernels NAIF (`moon_pa_de421_1900-2050.bpc`, `moon_080317.tf`, `naif0012.tls`, `pck00011.tpc`, `de421.bsp`/`de440.bsp`).
- Versión del marco ME en la que se publican los productos LOLA.
- Identificadores de las capas polares del WMTS de Moon Trek y su CORS; si Quickmap tiene una API incrustable.
- Créditos y licencia de las imágenes del mapa base.
- Definición de UT de Horizons para fechas anteriores a 1972.
