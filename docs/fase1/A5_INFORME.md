# Fase 1 · A5 — Refactorización estructural controlada: informe (punto de control PC6)

Fecha: 2026-10-24 · Autorización: el usuario aprobó `A5_PROPUESTA.md` y la ejecución de A5.0a–A5.5 (2026-10-23) · Base: `fac94bb` · Cierre: commit de A5.5 (ver `git log`).
Estado: **A5 completada dentro del alcance aprobado. A6, F2 e instalación en CEP NO iniciadas.** Etiquetas: **[MEDIDO]** · **[CONFIRMADO]** · **[INFERENCIA]** · **[NO VERIFICADO]**.

## 1. Resumen
El plugin se construye ahora desde una fuente modular `src/` (módulos ES que esbuild empaqueta en un único IIFE para Chromium 99). Se extrajeron, en el orden aprobado y con un commit por paso, las partes **sin estado de escena**: constantes visuales, textos ExtendScript, puente CEP y guardado de archivos. La geometría, la topología, el plegado, el renderer, el arte, la exportación GLB y la interfaz siguen **sin cambios** dentro de `src/main.js`. En cada paso, baseline, referencia A1 y bundle dieron el mismo resultado en todas las pruebas (píxeles, escena, GLB byte a byte, interacciones, puente CEP, GPU Δ=0), y todas las mutaciones de control se detectaron.

**Excepción documentada (no es igualdad byte a byte):** el primer build desde `src/` (A5.0b) **no** es idéntico byte a byte al bundle validado en A4. Difiere en una sola línea: el comentario de ruta que esbuild inserta (`// src/main.js` en lugar de `// panel/main.js`, línea 3). Con esa línea normalizada, el SHA-256 coincide exactamente con el de A4 (`bc260695…b5bd`), y los otros 12 archivos de `dist/` son idénticos. Evidencia: `docs/fase1/a5/A5_0b_equivalencia.txt`; salida completa de la batería de cierre: `docs/fase1/a5/run-all-cierre-A5.txt`. esbuild no tiene opción para suprimir ese comentario, y alterarlo después habría ocultado la diferencia en vez de explicarla.

## 2. Commits
| Commit | Paso | Contenido |
|---|---|---|
| `bafe4d3` | — | Propuesta aprobada (`A5_PROPUESTA.md`) |
| `eda0ed5` | **A5.0a** | `tests/browser/bridge.test.mjs`: 30 casos del puente CEP × 3 versiones; KI-24 reproducido; KI-25 y KI-26 nuevos; 7 mutaciones nuevas |
| `ab21f5e` | **A5.0b** | `src/main.js` = copia exacta; build desde `src/`; huella vigente `dist-a5`; cargador, arnés y mutaciones apuntando a `src/`; excepción binaria documentada |
| `584282b` | **A5.1** | `src/config/look.js` (15 constantes visuales y de material) |
| `23a1e3d` | **A5.2** | `src/host/` (4 textos ExtendScript como cadenas idénticas) + `host-scripts.test.mjs` |
| `5825452` | **A5.3** | `src/bridge/cep.js` + `src/package.json` + `bridge-cep.test.mjs` |
| `2d8ad55` | **A5.4** | `src/bridge/fs.js` + `bridge-fs.test.mjs` |
| (A5.5) | **A5.5** | `a5-limites.test.mjs`, este informe, `KNOWN_ISSUES`, `tests/README`, `HANDOFF` |
Todos los commits tienen un solo autor y ningún trailer de IA.

## 3. Mapa de módulos al cierre de A5
```
src/
  package.json            "type": "module" (solo para importar desde Node; el bundle es idéntico con y sin él)
  main.js        2440 l.  raíz: DOM, estado, geometría (TOLERANCE_MM, GRAPH_EPS), escena, plegado, arte, GLB, UI, cableado  ← sin cambios de lógica
  config/look.js   17 l.  DEFAULT_THICKNESS_MM, MATERIAL_PRESETS, CREASE_HINGE_*, FOLD_BRIDGE_*, CREASE_LINE_Z_OFFSET, ART_*
  host/extract.js  95 l.  EXTRACT_SCRIPT (5536 B)          host/art.js 64 l.  buildArtworkExportScript() (5677 B)
  host/test-connection.js  TEST_CONNECTION_SCRIPT (48 B)   host/save-dialog.js  SAVE_GLB_DIALOG_SCRIPT (188 B)
  bridge/cep.js    30 l.  hasCep(), evalScript(script, cb), evalScriptJSON(script), pathToFileURL(path)
  bridge/fs.js     59 l.  triggerDownload, blobToBase64, askSavePathViaIllustrator, saveBlobWithDialog
panel/                    estáticos del paquete CEP; panel/main.js CONGELADO = referencia A1 (no se empaqueta)
```
**Contratos y dependencias** (verificados por `tests/node/a5-limites.test.mjs`): `main.js` solo importa `config/`, `host/` y `bridge/` · `config/`, `host/` y `bridge/cep.js` no importan nada · `bridge/fs.js` solo importa `host/save-dialog.js` · fuera de `main.js` nadie usa THREE · `document` solo aparece en `triggerDownload` · `bridge/cep.js` solo toca `window.__adobe_cep__`, y lo lee en cada llamada, nunca al cargar (todos los módulos se cargan en Node sin `window`) · `window.cep` solo en `saveBlobWithDialog`.

## 4. Pruebas [MEDIDO]
| Batería | Antes de A5 (`fac94bb`) | Al cierre de A5 |
|---|---|---|
| Node | 233 | **330** (+72 del objetivo `src` en las pruebas existentes y +1 del build histórico en A5.0b; +5 `host-scripts`; +4 `bridge-cep`; +10 `bridge-fs`; +5 `a5-limites`) |
| Navegador | 44 | 44 (el objetivo «bundle» ahora se construye desde `src/`) |
| Puente CEP (nuevo) | — | **6** (30 casos × baseline/panel/bundle + comportamientos documentados) |
| Chromium-99 con APIs reducidas | 4 | 4 |
| A4-CDP | 7 | 7 |
| Controles negativos | 26 (11 + 10 + 5) | **36** (14 Node + 16 navegador + 6 bundle), todos aplicados ahora a copias de `src/` |
Cada paso se cerró con `tests/run-all.sh --mutations` en verde, antes de su commit; el cierre añade `--soak` (ver §9). En cada paso, `verify-isolation.sh` estuvo en verde, el baseline 15/15, `panel/` 14/14 y la huella vigente coincidió, sin cambios en goldens, fixtures, `reference/` ni `panel/`.

**Equivalencia funcional por paso:** diff del bundle revisado en cada extracción (`docs/fase1/a5/diff-bundle-A5.{1,2,3,4}.txt`): solo reubicaciones con el mismo código impreso. Única diferencia impresa: esbuild elimina `CREASE_HINGE_SEGMENTS`, declarada y nunca usada desde el baseline; no tiene efecto. Los dos ganchos del arnés de navegador (`__dbg` junto a `setStatus` y `pathToFileURL`) siguieron aplicándose en cada paso.

## 5. Huellas
| Huella | Estado |
|---|---|
| `tests/golden/dist.SHA256SUMS` (histórica A3/A4, `main.js` `bc260695…b5bd`) | **Intacta**. Prueba permanente: construir con `--src panel` la reproduce exactamente |
| `tests/golden/panel.pins.json` (referencia A1) | **Intacta** (14/14) |
| `reference/legacy-baseline.SHA256SUMS` | **Intacta** (15/15) |
| `tests/golden/dist-a5.SHA256SUMS` (**vigente**, nueva) | Regenerada a propósito en cada paso, solo en la línea de `main.js`. Al cierre: `main.js` = `70de82a82f90c91b3f794bc62fa02f34d86d06d11dfe0c77af4ed8d660e70701`; los demás archivos, idénticos a A4 |
| Goldens `geometry`, `constants`, `glb`, `illustrator-real`, `fixtures.pins` | Sin cambios |

## 6. Defectos
- **KI-24** (stock antes de 3D ⇒ `ReferenceError`), **KI-25** (el mensaje final del GLB sobrescribe el resultado, también al cancelar) y **KI-26** («Artwork load failed: undefined»): **preservados**. Una corrección no autorizada se detecta por mutación.
- KI-01: corrección **preservada**. GPU Δ=0 en el bundle en todos los pasos; la mutación que revierte A1 se detecta.
- KI-02…KI-23: sin cambios (A5 no toca geometría, tolerancias, plegado, renderer, GLB, arte ni UI). KI-22 sigue siendo el defecto crítico para F2.

## 7. Diferencias, regresiones y comportamientos no reproducibles
| # | Tipo | Detalle |
|---|---|---|
| 1 | Diferencia documentada | Bundle de A5.0b ≠ A4 byte a byte solo por el comentario de ruta de esbuild (§1) |
| 2 | Diferencia sin efecto | esbuild elimina `CREASE_HINGE_SEGMENTS`, que no se usa |
| 3 | Cambio de herramientas | Las mutaciones que antes actuaban sobre `panel/` actúan ahora sobre copias de `src/` (bundle). `panel/` es la referencia congelada |
| — | Regresiones | **Ninguna** detectada |
| — | No reproducible | Ninguno nuevo. KI-02 y KI-15 siguen sin reproducirse (igual que antes) |

## 8. Qué NO se verificó [NO VERIFICADO]
El bundle de A5 **no se cargó en Illustrator/CEP real** (no autorizado). El puente CEP se ejercitó con el *shim* del arnés y con pruebas de contrato en Node, no con `__adobe_cep__` real. Lo más expuesto a esa diferencia: el diálogo «Save GLB» real, `cep.fs.writeFile` real y la exportación de arte real (son justo los módulos movidos). La equivalencia con A4 se apoya en: textos ExtendScript idénticos (cadena y SHA-256), código impreso idéntico de las funciones movidas y los mismos resultados del puente en baseline, referencia A1 y bundle. Si se autoriza, una recarga corta tipo A4 (P-0, P-1, P-7, P-8) cerraría esta reserva.

## 9. Batería de cierre
`tests/run-all.sh --mutations --soak` sobre el estado final: **TODO EN VERDE: Node 330/330 · navegador 48/48 con --soak · puente CEP 6/6 · Chromium-99 4/4 · A4-CDP 7/7 · controles negativos 36/36 (14 + 16 + 6)** [MEDIDO].

## 10. Siguiente punto de control (PC6) — decisiones del usuario
1. Aceptar A5 con la excepción binaria de §1 y las reservas de §8.
2. Si se quiere validar en CEP real el bundle de A5 antes de A6 (requiere autorización expresa de instalación y recarga).
3. Orden siguiente: A6 (`core/legacy` + `GeometryEngine` con solo `legacy`, puerta G2) o F2/2A (KI-22). **Ninguno se inicia sin nueva autorización.**
