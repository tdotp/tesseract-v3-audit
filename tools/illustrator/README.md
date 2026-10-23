# tools/illustrator — validación en Illustrator real (Nivel 0, sin instalar nada)

| Archivo | Qué es |
|---|---|
| `tesseract_doc_survey.jsx` · `tesseract_extract_check.jsx` · `tesseract_art_check.jsx` | Scripts del Nivel 0 (generados desde el baseline por `make-jsx.mjs`); con guardián de estado; escriben JSON en `~/Desktop/Tesseract_Nivel0/` |
| `docs-prueba/*.svg` + `expected.json` | 6 documentos de prueba **desechables** y sus expectativas (generados por `make-test-docs.mjs` desde `docs-prueba.mjs`) |
| `make-jsx.mjs` · `make-test-docs.mjs` | Regeneran los `.jsx` y los documentos |

Guía: `docs/fase1/NIVEL0_GUIA.md` · Revisión de seguridad: `docs/fase1/NIVEL0_REVISION_SCRIPTS.md` · Registro de diferencias: `docs/fase1/NIVEL0_DIFERENCIAS_MAQUETA_VS_REAL.md` · Analizador: `node tests/tools/nivel0-analizar.mjs ~/Desktop/Tesseract_Nivel0`.
