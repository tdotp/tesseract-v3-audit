# Procedencia de los fixtures reales

| Archivo | Origen | Notas |
|---|---|---|
| `real/caja-botanica-real.dieline.json` | `tesseract-web/packages/core/src/__tests__/fixtures/caja-botanica-real.json` (HEAD `c0aeb34`) | Salida del extractor del plugin (DielineV1) de un troquel real (Caja Botánica). 69 puntos de contorno, 12 creases |
| `real/caja-botanica-illustrator-export.svg` | `tesseract-web/.../caja-botanica-illustrator-export.svg` | **Exportación real de Illustrator** del mismo troquel (extremos de crease a ~0.375 mm, creases que sobresalen) |
| `real/caja-botanica-illustrator-export.dieline.json` | Derivado del SVG anterior con `tests/tools/make-illustrator-fixture.mjs` | Formato DielineV1; generado, no editar a mano |

Los casos sintéticos se generan por código (`tests/lib/fixtures.mjs`), de forma determinista.

**Nota (Nivel 0, 2026-10-23):** `real/caja-botanica-illustrator-export.dieline.json` se derivó del SVG interpretando 1 px = 1 px CSS (0.2646 mm), es decir **a escala ×0.75 respecto del tamaño real**. Illustrator real reabre ese SVG con 1 px = 1 pt y la extracción (175.0 × 223.5 mm) coincide con `real/caja-botanica-real.dieline.json`. El fixture se conserva sin cambios (sus golden/pruebas siguen siendo válidos como caso a ×0.75: 13 paneles); a escala real el motor vigente da 11 (KI-22, KI-04). Evidencia: `docs/fase1/nivel0-real/` y `tests/node/nivel0-evidencia.test.mjs`.

**Corrección (F2A-0, 2026-10-27; la nota anterior se conserva):** la extracción real y `caja-botanica-real` coinciden en tamaño y en topología (mismos 13 paneles candidatos del oráculo, mismas 12 creases en el mismo orden), **no** en vértices (56 frente a 69 en el contorno), origen/sentido de Y ni ruido (≤ 0,005 mm frente a 0); sus áreas por panel difieren ≤ 0,23 mm² (diferencia de **representación**). El histórico ×0,75 tiene además las creases en otro orden y Y invertida. Evidencia: `docs/fase2/evidencia/f2a0-matriz-correspondencia.md`, `tests/node/f2-caja-botanica.test.mjs`.


## Familia `illustrator-real/` (añadida tras el Nivel 0; 2026-10-23)
Extracciones hechas por **Illustrator 30.8.2 real** (1 px del SVG = 1 pt, escala ×1,0). Generadas de forma determinista por `tests/tools/make-illustrator-real-fixtures.mjs` desde la evidencia `docs/fase1/nivel0-real/*__extract.json` (cada golden guarda el SHA-256 de su fuente). **No sustituyen ni modifican** los fixtures/goldens históricos: estos quedan congelados por `tests/golden/fixtures.pins.json`.
| Archivo | Origen | Notas |
|---|---|---|
| `illustrator-real/ill-real-caja-botanica.dieline.json` | N0-A: SVG exportado por Illustrator del troquel real, reabierto en Illustrator | 175.0 × 223.5 mm; el motor vigente da **11** paneles (el histórico a ×0.75 da 13: KI-22) |
| `illustrator-real/ill-real-caja-simple.dieline.json` · `ill-real-compuesto…` · `ill-real-curvas…` | N0-B / N0-F / N0-G: SVG sintéticos (`tools/illustrator/docs-prueba.mjs`) extraídos por Illustrator real | Casos pequeños con hueco, trazado compuesto y Bézier |

