# Batería de caracterización (A2)

Fija el comportamiento **actual** del plugin y lo compara con golden masters generados solo desde el baseline. Objetivos: **baseline** congelado · **panel** = `panel/main.js`, referencia A1 congelada · **src** = fuente modular desde A5 (Node la lee como `main.js` + módulos) y **bundle** construido desde `src/` (navegador).
Cero dependencias: Node ≥ 22 (`node:test`) y Google Chrome instalado (para la batería de navegador). **Ninguna prueba modifica `panel/`, `reference/` ni la extensión instalada.**

```bash
tests/run-all.sh                    # aislamiento + Node + navegador (≈ 3 min)
tests/run-all.sh --mutations        # + controles negativos (mutaciones sobre copias; ≈ 5 min más)
tests/run-all.sh --soak             # + prueba larga de 25 ciclos de plegado
node --test 'tests/node/*.test.mjs' # solo la parte Node (≈ 2 s)
```
Variables útiles: `CHROME_BIN` (ruta de Chrome), `UPDATE_GOLDEN=1` (regenera `tests/golden/glb.golden.json` desde el baseline). Solo controles negativos: `TESS_SRC_DIR` (copia de `src/` para Node), `TESS_DIST_ENTRY` / `TESS_BUILD_ENTRY` (entrada de una copia de `src/` para el bundle), `TESS_DIST_FROM` (bundle desde una carpeta de plugin, p. ej. el baseline), `TESS_PANEL_MAIN` / `TESS_PANEL_DIR` (heredadas).
Huellas del bundle: `tests/golden/dist-a5.SHA256SUMS` es la **vigente** (se regenera solo en un paso aprobado); `tests/golden/dist.SHA256SUMS` es la **histórica** de A3/A4 y no se toca (`--src panel` la reproduce).

| Carpeta | Contenido |
|---|---|
| `node/` | `nivel0-analizador` (analizador de resultados del Nivel 0 y documentos de prueba, con controles negativos),  `build` (reproducible, huellas fijadas, manifiesto, script clásico, zonas protegidas), `chromium99-compat` (sintaxis y APIs/CSS posteriores a la 99), `install-dry-run` (instalador sin escribir; instalación real rechazada), `geometry-golden` (26 fixtures × 2 motores), `known-issues` (KI-04…09 con valores), `extraction` (script de extracción sobre maqueta de Illustrator), `artwork-script`, `glb-inspector`, `jsx-validation-scripts`, `isolation` (huellas, un solo autor, sin remoto) |
| `node/` (A5) | `host-scripts` (4 textos ExtendScript idénticos en baseline/panel/src), `bridge-cep` y `bridge-fs` (contratos del puente = funciones del baseline), `a5-limites` (reglas de importación y de acceso a window/document/THREE de `src/`) |
| `browser/` (A5) | `bridge.test.mjs`: 30 casos del puente CEP (errores de `evalScript`, extracción, arte, guardado, CEP ausente, KI-24/25/26) × baseline/panel/bundle |
| `browser/` | `chromium99.test.mjs` (flujo completo con las APIs posteriores a la 99 ELIMINADAS), `browser.test.mjs` (baseline · panel · **bundle**): GPU (ciclos repetidos), regresión baseline↔panel (píxeles, escena, GLB byte a byte), materiales/espesor/luces, arte (UV, offsets), GLB (estructura, unidades), interacciones, métricas |
| `lib/` | Cargador de funciones por nombre, maqueta de Illustrator, fixtures, inspector de GLB, análisis determinista |
| `fixtures/` | Troqueles reales (con procedencia) y generadores sintéticos |
| `golden/` | Golden masters (`geometry`, `constants`, `glb`), `panel.pins.json` (huellas de `panel/`), `metrics.base.json` (informativo) |
| `tools/` | `make-golden.mjs --update`, `mutation-check*.sh` (Node, navegador y bundle), `collect-metrics.mjs`, `analyze-dieline.mjs` (toma de datos de corpus), `compare-extraction.mjs`, `make-illustrator-fixture.mjs` |
| `results/` | Salidas de la última ejecución (ignoradas por git) |

Reglas: un golden **solo** se regenera desde el baseline y con aprobación; si una prueba de `known-issues` falla porque un defecto desapareció, no es una regresión: actualizar `docs/KNOWN_ISSUES.md` en una tarea aprobada. Límites: la maqueta de Illustrator y el puente CEP simulado no sustituyen una prueba en Illustrator real (ver `docs/fase1/PROCEDIMIENTO_VALIDACION_ILLUSTRATOR.md`).
