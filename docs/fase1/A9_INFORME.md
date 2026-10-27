# A9 — Informe de cierre (PC10): separación de interfaz, orquestación y manejadores de eventos

Fecha: 2026-10-27 · Base: `3ea0d8a` (A8 validada en CEP real) · Decisiones D-A9-1…16 aprobadas (`A9_PROPUESTA.md` §16–§17) · Autorizaciones: Bloque 1 (A9.0a–A9.2), A9.3–A9.4, y A9.5–A9.6 en este chat sin aprobaciones intermedias.
**Estado: A9.0a–A9.6 COMPLETADOS y en verde. Validación en CEP real (A9-CEP) PREPARADA, NO ejecutada. F1 no se declara cerrada hasta aprobar A9-CEP. V3 NO instalada; F2 no iniciada.**
Etiquetas: [MEDIDO] · [CONFIRMADO] · [INFERENCIA] · [NO VERIFICADO]. Informes intermedios: `A9_PUNTO_DE_CONTROL.md` (Bloque 1) y `A9_PUNTO_DE_CONTROL_A9.4.md`.

## 1. Commits
| Paso | Commit | Contenido |
|---|---|---|
| Propuesta y guía | `485deef` | `A9_PROPUESTA.md`, `A9_HANDOFF.md`, precheck en `3ea0d8a` |
| A9.0a | `4034b05` | Caracterización H1–H6 + soak de UI (`tests/browser/a9.test.mjs`, `tests/lib/a9.mjs`, golden `ui-a9` desde el baseline); 14 controles |
| A9.0b | `e3614d3` | `a9-texto-identico`, `a9-limites`, `dist-a9` (= `dist-a8`), HISTÓRICO A8, `a9-perf`, `a9-equivalencia`; 5 controles |
| A9.1 | `1b056f5` | `src/ui/views.js` (`createViews`) |
| A9.2 | `7c2ad11` | `src/app/actions.js` (`createActions`); ajustes A y B |
| PC Bloque 1 | `5d259ee` | `A9_PUNTO_DE_CONTROL.md` |
| A9.3 | `674520e` | `src/ui/fold-controls.js` + envoltorio de `updateSelectedCreaseVisuals`; `a9-bundle-eq.mjs` |
| A9.4 | `d462c79` | `src/ui/picking.js` + 2 envoltorios de pick |
| PC A9.4 | `c41e1a5` | `A9_PUNTO_DE_CONTROL_A9.4.md` |
| A9.5 | `a05c0f4` | `src/ui/controller.js` (`createController`, `bindEvents`), ajuste del cargador |
| A9.6 | este commit | Este informe, `A9_VALIDACION_CEP_PROCEDIMIENTO.md` + `tests/node/a9-cep-preparacion.test.mjs`, evidencia final, `HANDOFF.md`, `KNOWN_ISSUES.md`, `tests/README.md`; sin cambios de código |
Commits locales, autor único (`Gerardo Calambas posada`), sin trailers, sin remoto.

## 2. Arquitectura final de la interfaz [MEDIDO]
```
src/main.js          156 l. (830 en 3ea0d8a)  shell: IIFE, byId, DOMContentLoaded, consulta del DOM (36 widgets), S, setStatus (ancla del arnés), log, clearLog,
                                               geometryEngine, __tessDebugView, raíz de composición con 3 envoltorios de enlace tardío, guarda «UI mismatch»,
                                               if(!ensureCep()) return;, 6 llamadas de arranque y bindEvents()
src/ui/views.js       66 l.  createViews(S, deps)        presentación: 9 funciones; interactionMode privado                       importa hasCep (bridge/cep)
src/ui/fold-controls.js 282 l. createFoldControls(S, deps) controles de plegado: 7 funciones; 6 widgets privados; document solo en buildFoldUI
src/ui/picking.js     47 l.  createPicking(S, deps)      Shift+clic / Alt+clic: 2 funciones (KI-29 sin corregir)
src/app/actions.js    69 l.  createActions(S, deps)      refreshArtwork, exportPNG, exportGLB; document solo en exportPNG       importa host/art, bridge/cep, bridge/fs
src/ui/controller.js 284 l.  createController(S, deps)   lastData y problems privados; applyMaterialPreset (KI-24), resetValidationUI, validateGeometry, render2D,
                                                          bindEvents (los 15 manejadores en el orden de hoy); document solo en validateGeometry y bindEvents
                                                          importa MATERIAL_PRESETS (config/look), EXTRACT_SCRIPT, TEST_CONNECTION_SCRIPT, evalScript (bridge/cep)
```
**Orden de composición:** `S` → materials → labels → angles → viewport (2 envoltorios de pick) → artwork → crease-visuals (envoltorio de `updateSelectedCreaseVisuals`) → panel-meshes → folding → glb-image → glb-scene → glb-builder → views → fold-controls → picking → actions → controller. Ninguna fábrica tiene efectos al crearse; ninguna importa a otra; `bindEvents()` se llama una vez, después de la guarda, de `ensureCep` y de las 6 llamadas de arranque. `window.__dbg`, `__tessDebugView` y `tools/baseline/setup_harness.py`: **sin cambios**.

## 3. Equivalencia funcional [MEDIDO]
- **Texto** (`a9/equivalencia-final-texto.txt`): las **25** funciones movidas son idénticas byte a byte a las de `3ea0d8a` salvo −2 espacios por línea (9 + 3 + 7 + 2 + 4), incluida la línea mal sangrada de `pickPanelFromEvent`; los **15 manejadores** son idénticos **con su sangría** y en el mismo orden dentro de `bindEvents`. Lo fijan `a7/a8/a9-texto-identico` (definición única, solo funciones nuevas previstas —las 5 fábricas y `bindEvents`—, líneas sueltas de `main.js` exactas) y `a6-validacion` (`validateGeometry` con normalización uniforme de la sangría).
- **Bundle** (`a9/equivalencia-final.json`): 144 funciones de `3ea0d8a` ⇒ **143 idénticas + 1 renombrado de esbuild declarado** (`buildFoldUI`: `debugDetails2` → `debugDetails`, porque su variable local ya no oculta al widget de la clausura), 0 distintas, 0 duplicadas, 0 perdidas; **las 170 líneas de los 15 manejadores del bundle = cuerpo de `bindEvents`** (`a9-manejadores-bundle.mjs`).
- **Eventos:** H1 — las 15 escuchas (16 registros: las pestañas en 4 botones) **una sola vez y en el orden de hoy**, mismas opciones y destino, en 9 flujos; sin CEP y con «UI mismatch», ninguna; mismo texto de manejador que el bundle de `3ea0d8a`; 0 duplicados en 25 ciclos de soak.
- **Estado y DOM:** H2 (línea de tiempo de mensajes y estado visible en 8 flujos, incluidos los de error), H3 (4 arranques), H4 (`#fold-panel` y `#problems-list` en 12 acciones, píxeles 2D con y sin resaltado), H6 (teclado): baseline = `panel/` = bundle; golden del baseline sin cambios.
- **Shift+clic y Alt+clic** (H5, primer clic tras el 3D; «Interacciones»; soak): base P2; Alt sobre C6 ⇒ C1 y sobre C8 ⇒ C5 (**KI-29 tal cual**); resaltado `#ffd166` tras plegar; **ningún `Pick error`**.
- **Escena y GPU:** inventario de escena A7 y L1–L3 idénticos; soak de GPU Δ=0 (`panel/` y bundle); soak de UI sin crecimiento.
- **Registros:** log del motor (A6), puente CEP (30 casos), `a5-observar`, A4-CDP y Chromium-99 sin cambios.
- **GLB** (`a9/glb-A9.5.json`): sin arte **byte a byte** con los archivos reales (`737bcd23…` 33 436 B, `87aa2e4c…` 54 224 B); con arte, **estructuralmente idéntico** (esqueleto JSON, orden de claves, 26 vistas, 0 vistas no-imagen distintas) y **0 píxeles distintos**. La igualdad **binaria** con `b4973a54…` no es comparable en Chrome headless (codificador PNG) y queda para A9-CEP (V-4). No se presenta la estructural como binaria.

## 4. Pruebas (`tests/run-all.sh --mutations --soak`, desacopladas, marcador `EXIT=` comprobado)
| Paso | Node | Navegador (browser · a7 · a8 · a9 · Chromium-99 · puente · a5-observar · A4-CDP) | Controles (Node + navegador + bundle) | Resultado |
|---|---|---|---|---|
| Precheck `3ea0d8a` | 533 (1 omitida) | 56 · 13 · 31 · — · 4 · 6 · 3 · 7 | 57 + 45 + 6 = 108 | verde |
| A9.0a | 533 | … · **36** · … | 57 + 59 + 6 = 122 | verde |
| A9.0b | 549 | ídem | 62 + 59 + 6 = 127 | verde |
| A9.1 | 549 | ídem | 63 + 62 + 6 = 131 | verde |
| A9.2 | 549 | ídem | 64 + 65 + 6 = 135 | 1.ª `EXIT=1` (patrón A8.3 no único, §8) · 2.ª verde |
| A9.3 | 549 | ídem | 64 + 68 + 6 = 138 | verde |
| A9.4 | 549 | ídem | 65 + 71 + 6 = 142 | verde |
| A9.5 | 552 | ídem | 67 + 75 + 6 = **148** | verde |
| A9.6 (cierre) | 558 (557 + 1 omitida; + `a9-cep-preparacion`) | ídem | 67 + 75 + 6 = 148 | **TODO EN VERDE, `EXIT=0`** (`a9/run-all-A9.6.txt`) |
Evidencia de cada batería en `docs/fase1/a9/run-all-*.txt`. Aislamiento verde antes y después de cada una.

## 5. Controles negativos
- **108 → 148** (+40), todos «detectada» en la batería final de cada paso. Los 108 previos se conservan; se re-anclaron, sin cambiar la mutación ni la prueba que debe fallar, los que el movimiento dejó sin aplicar o duplicados (n.º 8, 11, soak, resaltado de H5, «A8.3 · glb-scene: no refresca matrixWorld», regla 6 de `a9-limites`) y se re-apuntaron con la misma intención el n.º 3 y el de la regla 8.
- **Numerados de la propuesta (§8.5/§16.2.7):** 1, 2, 3, 4, 5, 6, 8, 9, 10, 11, 12, 13, 15, 16, 17, 18, 19, 21, 22 detectados por pruebas de comportamiento (H1–H5, «Interacciones», «Escena/materiales», puente CEP) o por el guarda del cargador (22); 14 y 20 solo por `a9-limites` (lagunas de comportamiento declaradas); 7 **laguna** (rama inalcanzable). Extra (cada uno demuestra que una prueba nueva detecta una alteración): 3 de H5, soak de UI, 5 de A9.0b, cableados de cada fábrica (copia de `S` ×5, `materialPill`/`artSourcePill`, `setStatus`/`setArtStatus`, `show3D`/`showImport`, captura sin envoltorio), `refreshArtwork` sin liberar texturas, `document` fuera de `exportPNG`, línea de `validateGeometry` vista por el cargador.
- **Lagunas declaradas (no forzadas):** n.º 7 (rama por defecto de `setActiveTab`), cláusula `!S.foldRoot` de `exportGLB` (solo alcanzable con escena y 0 paneles), n.º 14 (`THREE` en `views.js`) y n.º 20 (valor devuelto del envoltorio de pick: `onUp` no hace nada tras el `return`). Detalle en `KNOWN_ISSUES.md`.

## 6. Ajustes de pruebas (D-A9-9), con su justificación de «no reduce la detección»
| Ajuste | Por qué no debilita |
|---|---|
| `a7-limites`: regla de `app/` limitada a `state.js` (ajuste A); regla 8 de `S.` ampliada a `ui/` y `app/actions.js` | `app/actions.js` lo rige `a9-limites`, más estricto (`document` solo en `exportPNG`; control dedicado) |
| `a8-texto-identico` (ajuste B y A9.5) | Sigue exigiendo una sola definición de `exportPNG`/`exportGLB` (ahora en `app/actions.js`) y el texto del manejador de «Export GLB» con la misma expresión regular (ahora en `bindEvents`) |
| `a5-limites`: inventario y prefijos `ui/`; `document` de `app/actions.js`, `ui/fold-controls.js` y `ui/controller.js` regido por `a9-limites` | `a9-limites` fija exactamente en qué funciones puede aparecer |
| `a7/a8/a9-texto-identico`: funciones nuevas y `EXPECTED_RESIDUAL` por paso | Recalculados con un verificador que solo escribe si la diferencia coincide con la intención declarada del paso |
| Cargador (`tests/lib/legacy.mjs`): sangría 2 (y entrada en el cuerpo de las fábricas `createX`) **solo para `src`** | Definición única exigida igual; guarda en `a9-limites` + control n.º 22; el control sobre la línea `problems=geometryEngine.validate(data).problems;` sigue fallando `a6-validacion` y «los id de problema empiezan en P0» sigue detectado |
| `a6-validacion`: normalización **uniforme** de la sangría | Toda línea debe empezar por la sangría de la primera; la secuencia de líneas se compara entera |
| `a9-equivalencia`: renombrados de esbuild declarados (`a9-bundle-eq`) y manejadores del bundle | Solo `x ↔ xN` biyectivos; un cambio real en la misma función sigue fallando (control); los manejadores, línea a línea (control) |

## 7. Rendimiento (`a9-perf`: 12 métricas, 10 corridas intercaladas frente al bundle de `3ea0d8a`, Chrome headless)
| Lectura | Resultado |
|---|---|
| Ruido (3ea0d8a contra sí mismo) | −1,5 % … +5,1 % |
| A9.1 | 10 corridas: 2 «investigar» por mediana bimodal → 20 corridas: todo OK (`rendimiento-A9.1-INVESTIGACION.md`) |
| A9.2 | OK (máx. +6,9 %) |
| A9.3 | OK (máx. +4,2 %) |
| A9.4 | 10 corridas: OK, `clic_alt_ms` +9,4 % (métrica cuantizada, ruta del envoltorio) → 20 corridas: −3,2 % (`rendimiento-A9.4-NOTA.md`) |
| A9.5 | OK (máx. +3,9 %; `construir_ms` −9,8 %) |
Ninguna lectura > +25 %; los envoltorios y las fábricas no tienen coste medible. Chrome 155/M1 Max es un piso optimista frente a Chromium 99.

## 8. Incidencias y desviaciones (todas sin cambio de producto)
1. **A9.2 — primera batería `EXIT=1`:** el patrón vigente «A8.3 · glb-scene: no refresca matrixWorld» dejó de ser único al bajar `exportGLB` a 4 espacios; se re-ancló y se adoptó **re-escanear todos los patrones tras cada movimiento** (`.scratch/inv-patterns.sh`, inventario en `a9/inventario-patrones-mutacion.md`).
2. **A9.3 — `a9-equivalencia` dio `buildFoldUI` distinta:** renombrado de esbuild, no cambio de texto ni de comportamiento; herramienta ampliada con controles (`a9/equivalencia-A9.3-*`).
3. **A9.4:** un comentario de cabecera citaba código buscado por un patrón; se detectó al re-escanear la copia ensayada y se reformuló antes de aplicar.
4. **A9.5 — fallo del arnés corregido antes del commit:** el cargador con sangría 2 se saltaba el cuerpo de `createController`; se acotó la entrada a las fábricas `createX`.
5. **A9.5 — mensaje de commit inexacto:** dice «main.js 419 → 239 l.»; el valor real es **156** líneas. No se reescribió el historial; se corrige aquí.
6. Desviaciones del Bloque 1 (n.º 4 y 16 implementados con la misma intención en una línea; soak de GPU por estado; H2 con fixture inyectado; H1 sin el texto de `DOMContentLoaded`; píxeles 2D de una copia): `A9_PUNTO_DE_CONTROL.md` §10.
7. **Deuda de formato (F7):** en `main.js` quedan los comentarios de cabecera de secciones cuyo código salió («CEP BRIDGE», «VALIDATION», «2D PREVIEW», «3D ENGINE», «APPLY FOLDING»…) y el comentario de `S` que dice «Aquí quedan lastData, problems…» (ya no es cierto: están en `ui/controller.js`). Se dejaron para no cambiar líneas sueltas fuera de lo previsto; también se conservan las rarezas de D-A9-10 (`pathToFileURL` importado sin uso, constantes de `config/look` importadas sin uso en `main.js`, línea mal sangrada de `pickPanelFromEvent`, `currentBaseSelect` solo escrito, botones de modo ausentes).

## 9. Defectos conocidos
Ninguno cambia (KI-01…KI-28 tal cual: KI-24 sigue lanzando `ReferenceError: buildChildrenOfMap is not defined`, KI-25 sigue sobrescribiendo el mensaje del GLB, KI-26, KI-27, KI-14). **KI-29** registrado en A9.0a (Alt+clic elige la crease más cercana a la cámara dentro del umbral 40), preservado y **no corregido**.

## 10. Huellas, aislamiento y Git
- `dist-a9` final: `main.js` **`e5902a3cc3deccf19f07c236a8fd4d6b98834baae30c564dfc367350406f9d46`** (A9.6 no cambia `src/`). Historia de la huella: = `dist-a8` (A9.0b) → `ea8529eb…` (A9.1) → `2ada5d6a…` (A9.2) → `8064eb63…` (A9.3) → `9797a27c…` (A9.4) → `e5902a3c…` (A9.5).
- `dist-a8` (`4addceb7…`, reconstruida desde `3ea0d8a` por HISTÓRICO A8), `dist-a7`, `dist-a6`, `dist-a5` y `dist` intactas; goldens (incluido `ui-a9`) y fixtures sin cambios; `panel/` y `reference/` intactos.
- `verify-isolation.sh` verde; CEP de usuario solo `TesserArt_Validator`; plugin original e instalación intactos; V3 **no instalada**.

## 11. Validación en CEP real (A9-CEP) — PREPARADA, NO EJECUTADA
`docs/fase1/A9_VALIDACION_CEP_PROCEDIMIENTO.md`, fijado por `tests/node/a9-cep-preparacion.test.mjs` (referencias reales de A8, comparador sin falsos positivos A7↔A8, hashes de los GLB reales, huella `dist-a9` citada completa). Comparación automática con la evidencia real de A8 (paridad caja y arte, GLB en 2 poses, **GLB con arte byte a byte**, diálogo real con KI-25, GPU) y **comprobaciones a mano del usuario** (D-A9-12): Shift+clic y Alt+clic como primer clic tras el 3D, KI-29 anotado, deslizadores, ALL, Reset Flat, base, pestañas, Escape, espesor, preset y Debug, con `cdp-run console` capturando la consola (0 errores, ningún `[Tesseract] Pick error`). Requiere autorización **expresa y fechada**. **F1 no se declara cerrada hasta aprobarla.**

## 12. Riesgos pendientes
| # | Riesgo | Estado |
|---|---|---|
| R13 | Shift+clic y Alt+clic nunca probados en CEP real | Cubierto por V-6 de A9-CEP (pendiente de autorización) |
| — | GLB con arte binario en Chromium 99 | V-4 de A9-CEP |
| KI-29 | Alt+clic puede seleccionar otra crease | Registrado; decisión de producto (F7) |
| — | Escuchas (H1) no medibles en real sin instrumentar la carga | Se valida su efecto y la consola; declarado en el procedimiento §8 |
| — | Deuda de formato en `main.js` (§8.7) | F7 |
| — | Chrome headless ≠ Chromium 99 | A9-CEP |

## 13. Qué NO se verificó [NO VERIFICADO]
Nada en Illustrator ni en CEP real (no autorizado). Rendimiento real/FPS en CEP. Windows. Troqueles de trabajo distintos de los fixtures y de N0-A/N0-B.
