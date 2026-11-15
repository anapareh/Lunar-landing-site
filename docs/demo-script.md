# Guion de la demo · Artemis Atlas (3 minutos, una persona)

> Antes de presentar, comprueba las cifras de la diapositiva del problema («<13 h», «−145 M$», «~50 %»):
> no están verificadas en este repositorio. El guion solo usa la duración de Athena.

| Tiempo | Diapositiva | Texto |
|---|---|---|
| 0:00 | Portada | Hola, soy Ana, del equipo HerTech. Os presento **Artemis Atlas**, un navegador para elegir dónde y cuándo aterrizar en la Luna, sobre todo en el polo sur. |
| 0:15 | Módulo volcado | *(Un segundo en silencio.)* Marzo de 2025. Un módulo llega al polo sur de la Luna… y algo sale mal. |
| 0:25 | El problema | Athena aterrizó cerca del polo sur, volcó dentro de un cráter en sombra y se quedó sin energía. Debía durar unos diez días y duró menos de trece horas. En el polo sur el Sol apenas asoma por el horizonte: una montaña o el borde de un cráter deciden si tus paneles reciben luz y si tu antena ve la Tierra. |
| 0:55 | La solución | **Eliges un punto y una fecha, y miras el cielo.** Globo 3D, un día lunar completo (29,5 días): horas de luz, cuándo se pone el Sol y si hay comunicación directa con la Tierra. Modo Simple, con frases; modo Avanzado, con ángulos, horizonte real y vista desde la superficie. Cada número es real: datos SPICE de la NASA, comprobados con JPL Horizons (una diezmilésima de grado), y relieve LOLA en el polo sur. A 15 km del polo, con una Luna lisa habría luz todo el mes; con el relieve real, la mitad. Incluimos más de 30 misiones reales y podemos ver el cielo del día exacto en que aterrizaron. Funciona en español y en inglés, también en el móvil. |
| 1:45 | El mercado | SPICE o STK son potentes pero exigen saber programar o pagar licencias; las visualizaciones de la NASA muestran datos fijos. Nosotras: **punto y fecha a elegir, en 3D y sin ser experto.** |
| 2:15 | Negocio | Fase 1: herramienta abierta y gratuita para Artemis (datos públicos, premios, ESA BIC). Fase 2: plan Pro para misiones comerciales (API, relieve de alta resolución). Fase 3: aulas y museos con el modo divulgativo. |
| 2:40 | Equipo | Vanessa (ingeniería informática y desarrollo), Lucía (datos y ciberseguridad) y yo, Ana (software y automatización). |
| 2:52 | Cierre | Athena se apagó a las pocas horas. Con Artemis Atlas queremos que la próxima misión sepa antes de despegar qué luz y qué señal va a tener. **Esta vez, la misión continúa.** Gracias. |

**Demo opcional (10 s, en la diapositiva de la solución):** `/app/?sitio=im-2` (sitio de Athena) o
`/app/?sitio=apollo-11` y pulsar «Ver el día del aterrizaje». La portada (`/`) tiene el botón Launch.

## Preguntas probables

**¿Cómo calculáis el Sol y la Tierra? ¿Es preciso?** SPICE (JPL), marco lunar estándar `MOON_ME`; contrastado con JPL Horizons: diferencias ≤ 0,0002° en 1969, 2025 y 2026.

**¿Qué es LOLA?** El altímetro láser del LRO. Trazamos el horizonte real de cada punto, grado a grado, hasta 300 km. En el polo hay puntos que pasan del 100 % de luz al 0 %.

**¿Por qué solo 85°–90° S con relieve?** Tiempo de cálculo en el hackathon: 2.885 puntos cada 5 km. Fuera usamos Luna lisa y la app lo indica siempre.

**¿Entre nodos?** Se evalúa el nodo más cercano (sin mezclar horizontes) y se muestra la distancia.

**¿Libración y paralaje?** Sí: la libración sale de la efeméride y calculamos desde la superficie (paralaje de la Tierra ≈ 0,26°).

**¿Cuándo hay "luz"?** Cuando asoma el borde superior del disco; además damos el % del disco visible.

**¿Por qué no una puntuación 0–100?** Habría que inventar pesos. Damos datos comprobables: horas de luz, de Tierra, mejor ventana y noche más larga.

**¿Las coordenadas de las misiones?** Tabla NSSDCA de la NASA, medidas en imágenes LROC; pendientes de la doble verificación en Quickmap. Las regiones de Artemis III no tienen coordenadas porque la NASA no publica su centro.

**¿Habría salvado a Athena?** No podemos afirmarlo: volcó al aterrizar. Mostramos de antemano la luz y la señal de un punto, que es una parte clave de elegir dónde aterrizar.

**¿Pendiente y rocas?** Todavía no; el siguiente paso es la pendiente, que también sale de LOLA.

**¿Relés de comunicaciones?** Solo línea directa; si no hay, la app avisa de que haría falta un satélite de retransmisión.

**Limitaciones:** relieve solo en 85°–90° S, rejilla de 5 km, panel a 2 m, sin seguridad del terreno.

**Si no sabes algo:** «Buena pregunta: no lo hemos medido todavía. Lo que sí sabemos es…».
