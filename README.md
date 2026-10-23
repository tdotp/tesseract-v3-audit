# Tesseract V3

Proyecto de trabajo de la versión 3 del plugin de Adobe Illustrator Tesseract (panel CEP + three.js).

**Estado:** Fase 0 (auditoría y preparación) completada y **a la espera de revisión**. No se ha iniciado la refactorización.

| Carpeta | Contenido |
|---|---|
| `docs/fase0/` | Informe de auditoría y entregables de la Fase 0 (empieza por `00_INFORME_AUDITORIA.md`) |
| `docs/fase0/08_DECISIONES_D1_D8.md`, `09_ESTIMACION_FASE1_REVISADA.md` | Decisiones pendientes con alternativas y el desglose de esfuerzo revisado |
| `tools/baseline/` | Scripts reproducibles de medición y sus resultados (`results/`); `glb_units_test/` = kit de calibración de unidades GLB |

## Referencias (fuera de esta carpeta, solo lectura)

- Base actual del proyecto: `../tesseract-instalado-copia/` (idéntica al plugin instalado en `/Library/Application Support/Adobe/CEP/extensions/tesseract`).
- Material de observación: `../tesseract-web/` (implementación web anterior, propietaria).
- Notas de diseño previas: `../TESSERACT_MEJORA/`.

## Restricciones vigentes

- No se modifica la extensión instalada ni los repos de referencia.
- Illustrator es el único editor vectorial; se conserva CEP/Chromium y three.js.
- Sin atribución de IA en commits (autor único); sin push sin autorización.
