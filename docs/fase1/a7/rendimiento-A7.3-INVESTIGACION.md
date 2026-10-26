# A7.3 — Investigación de rendimiento (umbral D-A7-13 alcanzado en la exportación GLB)

**Qué pasó.** La medición de cierre de A7.3 (`rendimiento-A7.3.json`, 5 corridas intercaladas) dio en `glb_export_ms` **2.4 → 3.0 ms (+25 %)**, con el veredicto «DETENER (> 25 %)». Las demás métricas quedaron dentro del ruido.
**Error de proceso propio:** el commit de A7.3 (`2336ef6`) se encadenó en el mismo comando que la medición, así que se hizo **antes de leer** el resultado. Es local y reversible. **No se avanzó a A7.4** hasta cerrar esta investigación.

**Hipótesis.** La medida del GLB esperaba el estado final sondeando con `setTimeout(1)`. Chrome sube los temporizadores anidados a unos 4 ms, así que una exportación de 2–3 ms se mide en saltos de ~1–4 ms. Además, A7.3 **no tocó** el código de exportación (`buildExportSceneMeshes`, `buildGLBBlobFromCurrentView` y `exportGLB` siguen en `main.js` con el mismo texto; `a7-bundle-eq` da 136/136 funciones idénticas).

**Comprobación [MEDIDO].** `tests/tools/a7-perf.mjs` mide ahora el GLB con un `MutationObserver` sobre `#status-area` (sin sondeo), con 9 exportaciones por corrida y la mediana:
| Comparación | Corridas | `glb_export_ms` | Resto de métricas |
|---|---|---|---|
| A6 (`2939dbc`) → A7.3 | 10 + 10 | 5.8 → 5.9 (**+1.7 %**) | todas ≤ +2.2 % (`rendimiento-A7.3-investigacion.json`) |
| A7.3 → A7.3 (mismo bundle: ruido) | 10 + 10 | 5.85 → 5.55 (−5.1 %) | hasta ±2.4 % (`rendimiento-A7.3-ruido-mismo-bundle.json`) |

**Conclusión.** No hay degradación: el +25 % era cuantización de la medida antigua. Con la medida precisa, A7.3 está dentro del ruido (±5 % entre bundles idénticos). Desde aquí, todas las mediciones de A7 usan la herramienta corregida y 10 corridas. Las cifras absolutas del GLB cambian de escala (~5.8 ms frente a ~2.4 ms) porque la medida nueva espera de verdad el último mensaje de estado; solo son comparables entre sí.
