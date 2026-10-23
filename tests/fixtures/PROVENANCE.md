# Procedencia de los fixtures reales

| Archivo | Origen | Notas |
|---|---|---|
| `real/caja-botanica-real.dieline.json` | `tesseract-web/packages/core/src/__tests__/fixtures/caja-botanica-real.json` (HEAD `c0aeb34`) | Salida del extractor del plugin (DielineV1) de un troquel real (Caja Botánica). 69 puntos de contorno, 12 creases |
| `real/caja-botanica-illustrator-export.svg` | `tesseract-web/.../caja-botanica-illustrator-export.svg` | **Exportación real de Illustrator** del mismo troquel (extremos de crease a ~0.375 mm, creases que sobresalen) |
| `real/caja-botanica-illustrator-export.dieline.json` | Derivado del SVG anterior con `tests/tools/make-illustrator-fixture.mjs` | Formato DielineV1; generado, no editar a mano |

Los casos sintéticos se generan por código (`tests/lib/fixtures.mjs`), de forma determinista.
