# Referencia de diseño

`estetica.html` es la **maqueta visual** que inspiró la interfaz HUD (colores, tipografías, paneles,
globo holográfico, radar del terminador, simulación y línea de tiempo).

> **Atención: sus datos y fórmulas NO son reales y no deben usarse.**
> Incluye coordenadas de sitios sin verificar, pendiente/rocas/hielo inventados, un "índice de misión"
> con pesos arbitrarios, irradiancia y temperatura aproximadas, un "bonus" de +1,15° en los polos,
> efemérides simplificadas y una textura lunar procedural.

La web solo toma el **aspecto**. Todos los números que muestra salen de `web/src/lib/` (con tests)
y de los datos del pipeline. Ver `docs/decisions.md` (D-014 a D-017).

Se abre directamente en el navegador; carga Tailwind, fuentes y three.js desde CDN.
