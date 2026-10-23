# Batería de caracterización (A2)

Fija el comportamiento **actual** del plugin (baseline congelado y copia de trabajo `panel/`) y lo compara con golden masters generados solo desde el baseline.
Cero dependencias: Node ≥ 22 (`node:test`) y Google Chrome instalado (para la batería de navegador). **Ninguna prueba modifica `panel/`, `reference/` ni la extensión instalada.**

```bash
tests/run-all.sh                    # aislamiento + Node + navegador (≈ 3 min)
tests/run-all.sh --mutations        # + controles negativos (mutaciones sobre copias; ≈ 5 min más)
tests/run-all.sh --soak             # + prueba larga de 25 ciclos de plegado
node --test 'tests/node/*.test.mjs' # solo la parte Node (≈ 2 s)
```
Variables útiles: `CHROME_BIN` (ruta de Chrome), `UPDATE_GOLDEN=1` (regenera `tests/golden/glb.golden.json` desde el baseline), `TESS_PANEL_MAIN` / `TESS_PANEL_DIR` (solo controles negativos).

| Carpeta | Contenido |
|---|---|
| `node/` | `geometry-golden` (26 fixtures × 2 motores), `known-issues` (KI-04…09 con valores), `extraction` (script de extracción sobre maqueta de Illustrator), `artwork-script`, `glb-inspector`, `jsx-validation-scripts`, `isolation` (huellas, un solo autor, sin remoto) |
| `browser/` | `browser.test.mjs`: GPU (ciclos repetidos), regresión baseline↔panel (píxeles, escena, GLB byte a byte), materiales/espesor/luces, arte (UV, offsets), GLB (estructura, unidades), interacciones, métricas |
| `lib/` | Cargador de funciones por nombre, maqueta de Illustrator, fixtures, inspector de GLB, análisis determinista |
| `fixtures/` | Troqueles reales (con procedencia) y generadores sintéticos |
| `golden/` | Golden masters (`geometry`, `constants`, `glb`), `panel.pins.json` (huellas de `panel/`), `metrics.base.json` (informativo) |
| `tools/` | `make-golden.mjs --update`, `mutation-check*.sh`, `collect-metrics.mjs`, `analyze-dieline.mjs` (toma de datos de corpus), `compare-extraction.mjs`, `make-illustrator-fixture.mjs` |
| `results/` | Salidas de la última ejecución (ignoradas por git) |

Reglas: un golden **solo** se regenera desde el baseline y con aprobación; si una prueba de `known-issues` falla porque un defecto desapareció, no es una regresión: actualizar `docs/KNOWN_ISSUES.md` en una tarea aprobada. Límites: la maqueta de Illustrator y el puente CEP simulado no sustituyen una prueba en Illustrator real (ver `docs/fase1/PROCEDIMIENTO_VALIDACION_ILLUSTRATOR.md`).
