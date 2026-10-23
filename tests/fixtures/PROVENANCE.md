# Procedencia de los fixtures reales

| Archivo | Origen | Notas |
|---|---|---|
| `real/caja-botanica-real.dieline.json` | `tesseract-web/packages/core/src/__tests__/fixtures/caja-botanica-real.json` (HEAD `c0aeb34`) | Salida del extractor del plugin (DielineV1) de un troquel real (Caja Botánica). 69 puntos de contorno, 12 creases |
| `real/caja-botanica-illustrator-export.svg` | `tesseract-web/.../caja-botanica-illustrator-export.svg` | **Exportación real de Illustrator** del mismo troquel (extremos de crease a ~0.375 mm, creases que sobresalen) |
| `real/caja-botanica-illustrator-export.dieline.json` | Derivado del SVG anterior con `tests/tools/make-illustrator-fixture.mjs` | Formato DielineV1; generado, no editar a mano |

Los casos sintéticos se generan por código (`tests/lib/fixtures.mjs`), de forma determinista.

**Nota (Nivel 0, 2026-10-23):** `real/caja-botanica-illustrator-export.dieline.json` se derivó del SVG interpretando 1 px = 1 px CSS (0.2646 mm), es decir **a escala ×0.75 respecto del tamaño real**. Illustrator real reabre ese SVG con 1 px = 1 pt y la extracción (175.0 × 223.5 mm) coincide con `real/caja-botanica-real.dieline.json`. El fixture se conserva sin cambios (sus golden/pruebas siguen siendo válidos como caso a ×0.75: 13 paneles); a escala real el motor vigente da 11 (KI-22, KI-04). Evidencia: `docs/fase1/nivel0-real/` y `tests/node/nivel0-evidencia.test.mjs`.
