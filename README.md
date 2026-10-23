# Tesseract V3

Proyecto de trabajo de la versión 3 del plugin de Adobe Illustrator Tesseract (panel CEP + three.js).

**Estado (2026-10-23):** Fase 0 completada. Fase 1: A0, A1, A2 y A3 entregados y **aprobados** (PC1–PC3). **Nivel 0 (validación en Illustrator real, sin instalar nada) preparado y pendiente de ejecución:** `docs/fase1/NIVEL0_GUIA.md`. **Nada está instalado en CEP.** A4 y la refactorización estructural **no iniciados ni autorizados**. Para retomar el trabajo (otro agente/chat): `HANDOFF.md`. Documento rector: `docs/PLAN_MAESTRO_V3.md`.

| Carpeta | Contenido |
|---|---|
| `docs/PLAN_MAESTRO_V3.md`, `docs/KNOWN_ISSUES.md`, `docs/fase1/` | Plan rector, registro de defectos conocidos e informes de entrega de la Fase 1 |
| `reference/`, `panel/` | Baseline congelado (solo lectura, con huellas) y copia de trabajo aislada |
| `docs/fase0/` | Informe de auditoría y entregables de la Fase 0 (empieza por `00_INFORME_AUDITORIA.md`) |
| `docs/fase0/08_DECISIONES_D1_D8.md`, `09_ESTIMACION_FASE1_REVISADA.md` | Decisiones pendientes con alternativas y el desglose de esfuerzo revisado |
| `tests/` | Batería de caracterización (`tests/run-all.sh`), golden masters, fixtures reales y sintéticos |
| `tools/build/`, `tools/install.sh` | Build del bundle IIFE (`node tools/build/build.mjs` → `dist/`) e instalador **solo dry-run** (`docs/fase1/A3_BUILD_Y_ROLLBACK.md`) |
| `tools/illustrator/` | Scripts `.jsx` para validar en Illustrator real sin instalar nada |
| `tools/baseline/` | Scripts reproducibles de medición y sus resultados (`results/`); `glb_units_test/` = kit de calibración de unidades GLB |

## Referencias (fuera de esta carpeta, solo lectura)

- Base actual del proyecto: `../tesseract-instalado-copia/` (idéntica al plugin instalado en `/Library/Application Support/Adobe/CEP/extensions/tesseract`).
- Material de observación: `../tesseract-web/` (implementación web anterior, propietaria).
- Notas de diseño previas: `../TESSERACT_MEJORA/`.

## Restricciones vigentes

- No se modifica la extensión instalada ni los repos de referencia.
- Illustrator es el único editor vectorial; se conserva CEP/Chromium y three.js.
- Sin atribución de IA en commits (autor único); sin push sin autorización.
