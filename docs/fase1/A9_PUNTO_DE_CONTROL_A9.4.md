# A9 — Informe intermedio tras A9.3 y A9.4 (parada obligatoria antes de A9.5)

Fecha: 2026-10-27 · Autorización: aprobación del punto de control del Bloque 1 (`5d259ee`) y autorización **exclusiva** de A9.3 y A9.4 · Referencias: `A9_PROPUESTA.md`, `A9_HANDOFF.md`, `A9_PUNTO_DE_CONTROL.md`.
**Estado: A9.3 y A9.4 COMPLETADOS y en verde. A9.5 y A9.6 NO iniciados. `lastData`, `validateGeometry` y los 15 manejadores siguen en `main.js`. V3 NO instalada; F2 no iniciada.**
Etiquetas: [MEDIDO] · [CONFIRMADO] · [INFERENCIA] · [NO VERIFICADO].

## 1. Verificación inicial [MEDIDO]
HEAD `5d259ee`, árbol limpio, sin remoto; `verify-isolation.sh` verde; `dist/main.js` = `2ada5d6a…` = `dist-a9`; `dist-a8/a7/a6/a5/dist` intactas; CEP de usuario solo `TesserArt_Validator`. Evidencia final de A9.2: `run-all-A9.2.txt` con `EXIT=0` y 0 «NO APLICÓ/NO DETECTADA». `a9.test.mjs` (H1–H6 y soak) está en `run-all.sh` y en la precondición de `mutation-check-browser.sh`.
**Contratos de las tres referencias diferidas (lectura de `scene/viewport.js` y `scene/crease-visuals.js`):** `createViewport` y `createCreaseVisuals` desestructuran `deps` al crearse; `onUp` llama a `pickPanelFromEvent`/`pickCreaseFromEvent` solo tras un clic sin arrastre del botón 0, dentro de un `try/catch` que convierte cualquier excepción en `log('Pick error: …')`, y su valor devuelto solo decide un `return` final (no se ejecuta nada después); `rebuildCreaseVisuals` llama a `updateSelectedCreaseVisuals()` como última sentencia, tras su guarda. Ninguna de las tres se llama durante la composición.

## 2. Commits
| Paso | Commit | Contenido |
|---|---|---|
| A9.3 | `674520e` | `src/ui/fold-controls.js` (`createFoldControls`) + envoltorio de `updateSelectedCreaseVisuals` en la línea de `createCreaseVisuals`; `a9-bundle-eq.mjs`; 3 controles; `dist-a9` `8064eb63…` |
| A9.4 | ver `git log` | `src/ui/picking.js` (`createPicking`) + 2 envoltorios en la línea de `createViewport`; 4 controles (3 de navegador, 1 de `a9-limites`); `dist-a9` `9797a27c…` |
| Informe | este commit | Este documento, `HANDOFF.md`, `tests/README.md`, `KNOWN_ISSUES.md` (lagunas); sin cambios de código |

## 3. Módulos extraídos
```
src/main.js            419 l. (724 tras A9.2 → 454 tras A9.3)  shell + composición + lastData/problems + applyMaterialPreset, resetValidationUI, validateGeometry, render2D + 15 manejadores
src/ui/fold-controls.js 282 l. createFoldControls(S, { threeView, byId, geometryEngine, applyFolding, fitCamera3D, refreshPanelMaterials, signedDisplayAngle,
                               internalAngleFromDisplay, setInteractionMode, setStatus }) → updatePerCreaseRow, updateSelectedCreaseVisuals, syncSelectedCreaseUI,
                               selectFoldEdge, applySelectedCreaseAngle, setBasePanel, buildFoldUI  (+ 6 widgets privados; document solo en buildFoldUI)
src/ui/picking.js       47 l.  createPicking(S, { canvas3d, setBasePanel, selectFoldEdge, setActiveTab, setInteractionMode, setStatus }) → pickPanelFromEvent, pickCreaseFromEvent
```
- **Texto:** 7/7 (A9.3) y 2/2 (A9.4) idénticas byte a byte salvo −2 espacios por línea (`a9/texto-A9.3.txt`, `a9/texto-A9.4.txt`), incluida la línea mal sangrada de `pickPanelFromEvent` (rareza preservada, D-A9-10).
- **Envoltorios (exactamente 3, forma de §5.3, en su línea de composición; regla 8 de `a9-limites`):** `updateSelectedCreaseVisuals: function(){ return updateSelectedCreaseVisuals(); }` (en `createCreaseVisuals`), `pickPanelFromEvent: function(e){ return pickPanelFromEvent(e); }` y `pickCreaseFromEvent: function(e){ return pickCreaseFromEvent(e); }` (en `createViewport`). El nombre interior se resuelve al llamar, contra la variable de `main.js` que asignan después `createFoldControls` y `createPicking`.
- **Orden de composición:** … glb-builder → views → **fold-controls** → **picking** → actions. Ninguna fábrica tiene efectos al crearse (regla 5, que desde A9.3 salta los cuerpos de función).
- **Referencias vivas:** las fábricas reciben `S` y usan `S.<campo>` (regla 8 de `a7-limites` sobre `ui/`); `applyFolding`, `fitCamera3D`, `geometryEngine`, etc. llegan por `deps` (funciones creadas antes). Los controles «copia de `S`» de las dos fábricas (n.º 13 y el de `createPicking`) fallan, lo que demuestra que se usa el `S` compartido.

## 4. Pruebas (`tests/run-all.sh --mutations --soak`, desacopladas, `EXIT=` comprobado)
| Paso | Node | Navegador (browser · a7 · a8 · a9 · Chromium-99 · puente · a5-observar · A4-CDP) | Controles | Resultado |
|---|---|---|---|---|
| A9.3 | 549 (548 + 1 omitida) | 56 · 13 · 31 · 36 · 4 · 6 · 3 · 7 | 64 + 68 + 6 = **138/138** | TODO EN VERDE, `EXIT=0` (`a9/run-all-A9.3.txt`) |
| A9.4 | 549 (548 + 1) | ídem | 65 + 71 + 6 = **142/142** | ver `a9/run-all-A9.4.txt` |
Antes de cada regeneración de la huella se verificaron en el bundle nuevo: A9 (36, con soak), inventario de escena A7 (13), A8 (31: N1 byte a byte, N3, E1–E6), puente CEP (6) y navegador (33: interacciones, materiales, arte, regresión, GLB, log del motor).

## 5. Controles negativos
- **Los 135 anteriores se conservan**, todos «detectada». Re-anclados sin cambiar la mutación ni la prueba que debe fallar (tras re-escanear los 135/138 patrones sobre el árbol movido, como se acordó tras A9.2): A9.3 — n.º 8 y soak (sangría −2), resaltado de H5 (la misma línea aparece en `syncSelectedCreaseUI`; se ancla con el cierre de `rebuildCreaseVisuals`); A9.4 — n.º 3 (antes «`pickPanelFromEvent: undefined`», ahora «sin envoltorio», captura `undefined`) y el de `a9-limites` de la regla 8 (antes añadía un envoltorio no previsto; con los 3 presentes, quita uno).
- **Nuevos:** A9.3 — n.º 1 (el envoltorio no llama a la función ⇒ H5: sin resaltado tras plegar), «`createCreaseVisuals` recibe `updateSelectedCreaseVisuals` sin envoltorio» (⇒ «3D error: updateSelectedCreaseVisuals is not a function», la clase de KI-24), n.º 13 (`createFoldControls` copia `S` ⇒ «Interacciones»). A9.4 — n.º 2 (el envoltorio de `pickPanelFromEvent` no la llama ⇒ H5: Shift+clic no cambia la base), n.º 19 (el envoltorio de `pickCreaseFromEvent` llama a `pickPanelFromEvent` ⇒ «Interacciones»), `createPicking` copia `S` (⇒ H5), n.º 20 (solo `a9-limites`).
- **Laguna nueva declarada (n.º 20):** que el envoltorio de pick **no devuelva** el resultado no es observable (tras el `return` de `onUp` no se ejecuta nada); ensayado contra H5 e «Interacciones»: «NO DETECTADA». Lo fija la regla 8 de `a9-limites` (forma exacta del envoltorio). Lagunas anteriores: n.º 7, `!S.foldRoot`, n.º 14.
- Pendientes (A9.5): n.º 15, 21, 22 y el n.º 9/10/16 sobre `bindEvents`.

## 6. Equivalencia de Shift+clic y Alt+clic [MEDIDO]
- **H5** (primer clic tras construir el 3D) en baseline, `panel/` y bundle de A9.3 y A9.4: Shift+clic sobre el panel mayor no base ⇒ base P2 (select = «2», pestaña Material, un solo «Base set to P2 …»); clic sin modificador ⇒ sin cambios; Alt+clic sobre la línea de C6 ⇒ **C1** y sobre C8 ⇒ **C5**, pestaña Creases, un solo «Crease C… selected»; tras plegar, la crease seleccionada en `#ffd166`/opacidad 1 y su fila en `rgba(255, 209, 102, 0.1)`; **ningún `Pick error`** en ningún objetivo. Idéntico al golden del baseline.
- **«Interacciones»** (Shift, Alt, órbita, pan, zoom, Esc) y **soak de UI** (25 ciclos con Shift+clic y Alt+clic: escuchas y nodos constantes, ningún `Pick error`, GPU sin crecimiento) idénticos.
- **Bundle:** las dos funciones de picking, idénticas a las de `3ea0d8a`.

## 7. KI-29
**Preservado tal cual, sin corregir:** Alt+clic sigue eligiendo la crease más cercana a la cámara dentro del umbral 40 (C6 ⇒ C1, C8 ⇒ C5), igual en baseline, `panel/` y bundle; `pickCreaseFromEvent` tiene el mismo texto y la misma posición en el bundle. Sigue [NO VERIFICADO] en CEP real.

## 8. Equivalencia de bundle, DOM, píxeles y GLB
- **Bundle** (`a9-equivalencia`, `a9/equivalencia-A9.3.json` y `-A9.4.json`): de las 144 funciones de `3ea0d8a`, **143 idénticas + 1 renombrado de esbuild declarado** (`buildFoldUI`: `debugDetails2` → `debugDetails`), 0 distintas, 0 duplicadas, 0 perdidas; nuevas: `createViews`, `createFoldControls`, `createPicking`, `createActions`.
- **Incidencia de A9.3 (diagnosticada y corregida en la herramienta, no en el producto):** la primera ejecución de `a9-equivalencia` dio `buildFoldUI` «distinta» (`a9/equivalencia-A9.3-fallo-1.json`). Causa [MEDIDO]: el `var debugDetails` local de `buildFoldUI` ocultaba al widget `debugDetails` de la clausura de `main.js` y esbuild lo imprimía `debugDetails2`; dentro de `createFoldControls` ya no oculta nada y esbuild conserva el nombre. El texto fuente es idéntico y el comportamiento también (es una variable local en ambos casos). Corrección: `tests/tools/a9-bundle-eq.mjs` acepta **solo** renombrados `x ↔ xN` biyectivos y consistentes en toda la función y los **declara**; cualquier otra diferencia sigue fallando. Control: la misma función con el renombrado **y** un cambio real (`byId('debug-details')` → `byId('log-area')`) queda en «distintas» y sale con 1 (`a9/equivalencia-A9.3-control.txt`). Primer intento de ese control mal aplicado (sangría equivocada, no cambió nada): repetido y verificado («líneas cambiadas: 1»).
- **Eventos, DOM y píxeles:** H1 (escuchas, incluidas las 7 de `#fold-panel` y su texto frente al bundle de `3ea0d8a`), H2, H3, H4 (`#fold-panel` serializado en 12 acciones, píxeles 2D) y H6, idénticos.
- **GLB** (`a9/glb-A9.3.json`, `a9/glb-A9.4.json`): sin arte, **byte a byte** con los reales (`737bcd23…`, `87aa2e4c…`); con arte, estructural idéntico y 0 píxeles distintos (binario solo en CEP real).

## 9. Rendimiento (`a9-perf`, intercalado frente a `3ea0d8a`)
| Paso | Resultado |
|---|---|
| A9.3, 10 corridas | Todo OK; máximo `construir_ms` +4,2 % |
| A9.4, 10 corridas | Todo OK; máximo `clic_alt_ms` +9,4 % (0,160 → 0,175 ms), justo la ruta del envoltorio |
| A9.4, 20 corridas | Todo OK: `clic_alt_ms` −3,2 %, `clic_shift_ms` −0,7 % (ambas distribuciones en 0,11–0,20 ms; métrica cuantizada a 0,01 ms) — `a9/rendimiento-A9.4-NOTA.md` |

## 10. Riesgos para A9.5
1. **El paso más arriesgado:** mueve `lastData` (1 escritura, 6 lecturas), `problems`, `validateGeometry` (texto fijado; el cargador `tests/lib/legacy.mjs` solo acepta 4/0 espacios ⇒ ajuste aprobado del cargador y de `a6-validacion`, solo para `src`), `render2D`, `applyMaterialPreset` (KI-24) y los **15 manejadores** a `bindEvents`.
2. **Patrones a re-anclar** (sangría de los manejadores dentro de `bindEvents`): n.º 4, 5, 6, 9, 16, KI-25, n.º 11 (arranque), y los de `a9-texto-identico` (`HANDLERS_FILE`, sangría de los bloques). Re-escanear todos los patrones tras mover.
3. **`bindEvents` debe llamarse una vez, en el punto de hoy** (después de `if(!ensureCep()) return;`): H1 (sin CEP y «UI mismatch» ⇒ 0 escuchas), controles 11 y 21.
4. **KI-24** debe seguir lanzando `ReferenceError: buildChildrenOfMap is not defined` (excepción única de la regla 7).
5. Renombrados de esbuild: los manejadores leen nombres que hoy son de la clausura (`log2`, `debugDetails`…); al moverlos, el impresor puede cambiar nombres ⇒ revisar con `a9-bundle-eq` (los declara) y con el texto de manejadores de H1.
6. A9-CEP (Shift/Alt+clic reales, KI-29 en real) sigue pendiente de autorización aparte.

## 11. Árbol Git y huellas
- Commits locales, autor único, sin trailers, sin remoto; árbol limpio tras el commit del informe.
- `dist-a9` vigente: `main.js` `9797a27c2d8c0f8f…` (A9.4); `8064eb63…` tras A9.3. `dist-a8` (`4addceb7…`, reconstruida desde `3ea0d8a` por HISTÓRICO A8), `dist-a7`, `dist-a6`, `dist-a5` y `dist` intactas. Aislamiento verde; V3 no instalada.

## 12. Qué NO se verificó
Nada en Illustrator ni en CEP real (no autorizado). Chrome 155 headless es un piso optimista frente a Chromium 99.
