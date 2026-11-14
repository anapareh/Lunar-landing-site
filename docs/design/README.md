# Referencia de diseño

`estetica.html` es la **maqueta visual** de la interfaz: consola de "dinámica de vuelo" sobria
(Inter + JetBrains Mono, paleta obsidiana/acero, solar ámbar y Tierra azul), globo 3D con retícula
selenográfica, terminador 2D, simulación del ciclo y franja sinódica.

> **Atención: sus datos y fórmulas NO son reales y no deben usarse.**
> Incluye coordenadas de sitios sin verificar, pendiente/rocas/hielo inventados, un "índice de
> viabilidad" con pesos arbitrarios, irradiancia y temperatura aproximadas, retardo RF fijo, un
> "bonus" de +1,15° en los polos, efemérides simplificadas y una textura lunar procedural.

La web solo toma el **aspecto**. Todos los números que muestra salen de `web/src/lib/` (con tests)
y de los datos del pipeline. Ver `docs/decisions.md` (D-014 a D-018).

Se abre directamente en el navegador; carga Tailwind, fuentes y three.js desde CDN.
