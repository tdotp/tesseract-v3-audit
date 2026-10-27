# Fase 1 · A9 — Separación de interfaz, orquestación y manejadores de eventos: propuesta

Fecha: 2026-10-26 · Base: `3ea0d8a` (A8 + A8-CEP, validada en Illustrator real) · **Decisiones D-A9-1…16 APROBADAS (§17); Bloque 1 (A9.0a–A9.2) autorizado para un chat nuevo; Bloque 2 NO autorizado.** · Estado original: **SOLO DIAGNÓSTICO, ANÁLISIS Y PROPUESTA. No se ha tocado `src/`, `panel/`, `tests/`, `tools/`, goldens, huellas ni el plugin original. A9 no está autorizada: esperar las decisiones de §13.** Revisión del 2026-10-26: el usuario aceptó conceptualmente la arquitectura de 5 módulos; la matriz de decisiones está en §16. La implementación sigue **sin autorizar**.
Etiquetas: **[MEDIDO]** · **[CONFIRMADO]** · **[INFERENCIA]** · **[NO VERIFICADO]**. Lo marcado [MEDIDO] se comprobó hoy sobre el repositorio, solo con lecturas y la batería (que escribe en `tests/results/` y `.scratch/`, ignorados por git).

## 0. Resumen

`src/main.js` (830 líneas) conserva **29 funciones** en la clausura de `DOMContentLoaded` y **15 manejadores** de primer nivel. Son DOM, presentación, orquestación del flujo (extraer → validar → 3D → espesor/preset/base → arte → GLB), el selector por clic y la raíz de composición. La propuesta saca **25 de las 29 funciones** y **los 15 manejadores** a **5 módulos nuevos**, con el mismo método que A6–A8: el texto de las funciones queda idéntico salvo la sangría, las fábricas `createX(S, deps)` se cablean en `main.js` y las funciones conservan sus nombres. `main.js` queda como **shell y raíz de composición** (≈ 125 líneas [INFERENCIA]): consulta del DOM, `S`, `setStatus` (ancla del arnés), `log`, `clearLog`, `geometryEngine`, `__tessDebugView`, composición, guarda «UI mismatch» y secuencia de arranque.

Hay tres obstáculos reales. Ninguno se resuelve cambiando comportamiento:
1. **Ciclo escena → UI** (§3.3). Tres funciones de UI (`pickPanelFromEvent`, `pickCreaseFromEvent` y `updateSelectedCreaseVisuals`) se pasan a `createViewport` y `createCreaseVisuals` **cuando se crean**. Hoy funcionan solo porque son declaraciones elevadas (*hoisted*) de la clausura. Si salen a una fábrica posterior, esas fábricas recibirían `undefined` y fallarían solo al hacer Shift/Alt+clic o al plegar: el mismo patrón que KI-24. Propuesta: **3 envoltorios de enlace tardío** en la raíz de composición (D-A9-3).
2. **`lastData` es una sola variable reasignada.** La escribe el manejador «Extract» y la leen `validateGeometry`, `applyMaterialPreset` y otros 4 manejadores. Además, el texto de `validateGeometry` está fijado (`a6-validacion`) y el cargador de Node lo busca con 4 espacios de sangría o con 0. Todo ese grupo tiene que ir junto a un único módulo, `ui/controller.js`, con un ajuste mínimo del cargador (D-A9-5). Si no se aprueba, se queda en `main.js`.
3. **El arnés depende de la clausura.** El anclaje `function setStatus(m){ statusArea.textContent = m; }` y `__tessDebugView` deben seguir **en la clausura de `main.js`, con su texto**. La propuesta no los mueve: `tools/baseline/setup_harness.py`, `window.__dbg` y la vista de depuración **no cambian** en A9.

Fuera de A9: separar la orquestación de verdad, es decir, sacar la lógica de los manejadores a funciones con nombre y quitar la inicialización duplicada del plegado. Eso cambia el texto y le corresponde a F7 (rediseño UX) (D-A9-1).

## 1. Verificación previa (tarea 1) [MEDIDO]

| Comprobación | Resultado |
|---|---|
| Git | HEAD `3ea0d8a235340abb…`, **árbol limpio** (`git status --porcelain` vacío), 57 commits, autor único `Gerardo Calambas posada`, sin remoto |
| Aislamiento (`tools/verify-isolation.sh`) | **Verde** (exit 0): baseline = manifiesto, extensión instalada = baseline, `panel/` con las diferencias esperadas (`main.js`, sin `main.js.bak`), V3 no instalada |
| CEP de usuario | Solo `TesserArt_Validator` |
| Huella vigente | `dist/main.js` = `4addceb7fb8c6dd6…` = `tests/golden/dist-a8.SHA256SUMS` (13 archivos) |
| GLB reales de referencia (`docs/fase1/a8-real/glb/`) | plano `737bcd2312da1191…`, todas a 60° `87aa2e4c5cc39092…`, arte `b4973a54840cd0c1…`, diálogo real `737bcd23…` |
| Batería `tests/run-all.sh --mutations --soak` | **TODO EN VERDE, `EXIT=0`** (salida completa en `docs/fase1/a9/run-all-precheck-3ea0d8a.txt`) |

### 1.1 Resultado de la batería
| Batería | Resultado |
|---|---|
| Aislamiento · build (IIFE, chrome99) | verde |
| Node | **533** (532 + 1 omitida a propósito), 0 fallos |
| Navegador | `browser` **56** (con `--soak`) · `a7` **13** · `a8` **31** · Chromium-99 **4** · puente CEP **6** · `a5-observar` **3** · A4-CDP **7**, 0 fallos |
| Controles negativos | Node **57** · navegador **45** · bundle **6** = **108/108**, ninguno «NO APLICÓ» ni «NO DETECTADA» |
| Después de la batería | `verify-isolation.sh` verde; `dist/main.js` = `4addceb7…` (`dist-a8`); árbol sin cambios salvo esta propuesta y `docs/fase1/a9/` |
Es la misma cifra que al cierre de A8 más los 7 de `a8-cep-evidencia`: la base está sana para empezar A9.

## 2. Arquitectura vigente tras A8 [MEDIDO]
```
src/main.js        830 l.  clausura DOMContentLoaded: DOM (36 widgets), 9 variables de UI, 29 funciones, 15 manejadores, raíz de composición
src/app/state.js           S sellado (26 campos)                       src/config/look.js   constantes
src/host/*                 4 textos ExtendScript                         src/bridge/{cep,fs}.js  puente CEP y guardado
src/core/                  GeometryEngine v1 (legacy)                    src/scene/ (7) · src/fold/ (2) · src/export/ (4)  fábricas createX(S, deps)
```
`main.js` **no usa `THREE` ni `window`** (0 apariciones fuera de comentarios). Todo lo que queda es DOM, estado de UI y orquestación.

## 3. Responsabilidades y dependencias de `src/main.js` (tareas 2 y 3) [MEDIDO]

Método: análisis léxico de las funciones de primer nivel de la clausura (4 espacios), con identificadores sin comentarios ni cadenas. Lo cruza con los widgets, las 9 variables de UI, los campos `S.`, las 36 funciones que llegan de las fábricas y los imports. Las funciones de una línea y los manejadores se revisaron leyendo el código. Mapa completo: `docs/fase1/a9/mapa-dependencias-main-3ea0d8a.json`.

### 3.1 Inventario por responsabilidad

| Grupo | Funciones (líneas en `3ea0d8a`) | Widgets / estado de UI | `S` | Llama a | Destino propuesto |
|---|---|---|---|---|---|
| **Shell / arnés** | `setStatus` 77 (**ancla**), `log` 78–81, `clearLog` 82, `__tessDebugView` 85 | `statusArea`, `logArea`, `debugDetails` | 18 *getters* (solo lectura) | — | **se quedan** en `main.js` |
| **Presentación** | `syncMaterialPresetUI` 99, `setInteractionMode` 105 (+ `interactionMode`), `ensureCep` 136, `showImport` 145, `show3D` 146, `setDebugVisible` 147, `setActiveTab` 149, `syncMaterialInputs` 160, `setArtStatus` 183 | 24 widgets (`errorMsg`, 6 botones, pestañas, píldoras, `viewportBadge`, `viewport3d`, …) | `currentThicknessMm` | `setStatus`, `getMaterialPreset`, `hasCep` | `ui/views.js` |
| **Controles de plegado** (vista + selección + base) | `updatePerCreaseRow` 320, `updateSelectedCreaseVisuals` 332, `syncSelectedCreaseUI` 348, `selectFoldEdge` 369, `applySelectedCreaseAngle` 381, `setBasePanel` 413, **`buildFoldUI` 428–610 (183 l., 7 escuchas)** | `threeView`, `byId`; privados: `currentBaseSelect` (solo se escribe), `currentCreaseRows`, `currentCreaseSliders`, `selectedCreaseLabelEl/SliderEl/NumberEl` | 11 campos de plegado | `geometryEngine` (3 ops), `applyFolding`, `fitCamera3D`, `refreshPanelMaterials`, ángulos, `setInteractionMode`, `setStatus` | `ui/fold-controls.js` |
| **Selección por clic** | `pickPanelFromEvent` 300, `pickCreaseFromEvent` 390 | `canvas3d` | raycaster, cámara, mallas | `setBasePanel`, `selectFoldEdge`, `setActiveTab`, `setInteractionMode`, `setStatus` | `ui/picking.js` |
| **Orquestadores sin estado propio** | `refreshArtwork` 195 (async; KI-26/27), `exportPNG` 612, `exportGLB` 619 (async) | — | arte, mallas, escena | `ensureCep`, `setArtStatus`, `log`, arte, `buildGLBBlobFromCurrentView`, `saveBlobWithDialog`, `evalScriptJSON` | `app/actions.js` |
| **Sesión del troquel** (validación, 2D, preset) | `resetValidationUI` 188, `validateGeometry` 231 (**texto fijado**), `render2D` 255, `applyMaterialPreset` 161 (**KI-24**) | `lastData`, `problems`, `validationStatus`, `problemsList`, `continueBtn`, `canvas2d`, `ctx2d` | preset, paneles | `geometryEngine.validate`, `build3DFromPanels`, `buildFoldUI`, … | `ui/controller.js` |
| **Manejadores** (15, anónimos) | 648–827: test, extract, preview, continue, thickness, back, export3d, exportGlb, preset, refreshArt, pestañas, modo ×2 (botones ausentes en `index.html`), `keydown`, debug | escriben `lastData` (extract) y lo leen (preview, continue, thickness) | — | casi todo | `ui/controller.js` (`bindEvents`) |
| **Arranque** | guarda «UI mismatch» 121–126 (después de la composición), `if(!ensureCep()) return;` 639, 6 llamadas 641–646 | — | — | — | se queda en `main.js` |

**Escuchas totales** [MEDIDO]: 15 de primer nivel + 7 en `buildFoldUI` (en elementos nuevos en cada reconstrucción) + 1 `li.onclick` por problema en `validateGeometry` + 9 en `init3D` (`viewport.js`, ya fuera) + el propio `DOMContentLoaded`. Los botones `mode-fold-btn` y `mode-base-btn` **no existen** en `index.html`: sus escuchas nunca se registran y `setInteractionMode` los trata como nulos. Se conserva tal cual.

### 3.2 Grafo de llamadas (solo aristas que cruzan los grupos propuestos)
```
manejadores ──► controller(applyMaterialPreset, validateGeometry, render2D, resetValidationUI)
     │                 └──► fold-controls.buildFoldUI ──► fold/folding.applyFolding ──► scene/crease-visuals.rebuildCreaseVisuals
     ├──► actions(refreshArtwork, exportPNG, exportGLB)                                          │
     ├──► views(show*, setActiveTab, syncMaterialInputs, setDebugVisible)                        ▼
     └──► scene(init3D, fitCamera3D, build3DFromPanels, applyArtworkToScene)        updateSelectedCreaseVisuals (fold-controls)  ◄── CICLO 1
scene/viewport.init3D (escuchas del lienzo) ──► picking.pickPanelFromEvent/pickCreaseFromEvent ──► fold-controls.setBasePanel/selectFoldEdge  ◄── CICLO 2
fold-controls ──► scene/viewport.fitCamera3D · fold/folding.applyFolding        picking/fold-controls ──► views.setActiveTab/setInteractionMode
```

### 3.3 El ciclo escena → UI (obstáculo principal) [MEDIDO por lectura]
- `createViewport(S, { …, pickPanelFromEvent, pickCreaseFromEvent })` (línea 90) y `createCreaseVisuals(S, { …, updateSelectedCreaseVisuals })` (92) **desestructuran `deps` al crearse** (`viewport.js:6`, `crease-visuals.js:8`). Funciona porque las tres son declaraciones de función elevadas de la clausura (definidas en 300, 390 y 332).
- `fold-controls` necesita `applyFolding` (de `createFolding`, línea 94) y `fitCamera3D` (de `createViewport`). `picking` necesita `setBasePanel` y `selectFoldEdge` (de `fold-controls`). Ningún orden de creación cumple todo con desestructuración inmediata.
- **Riesgo si se mueve sin más:** `deps.pickPanelFromEvent === undefined`. El bundle se construye y carga, y el error solo salta en el primer Shift+clic o al plegar. Es exactamente la clase de KI-24.

### 3.4 Estado y su dueño
| Estado | Escribe | Lee | Dueño propuesto |
|---|---|---|---|
| `S` (26 campos) | módulos y orquestadores | todos | sin cambios (`app/state.js`) |
| `lastData` | manejador Extract | `validateGeometry` (dentro del `onclick`), `applyMaterialPreset`, Preview, Continue, Thickness | privado de `ui/controller.js` (todos sus usos van juntos) |
| `problems` | `validateGeometry`, `resetValidationUI` | `render2D` | privado de `ui/controller.js` |
| `currentCreaseRows`, `currentCreaseSliders`, `selectedCrease*El` (3), `currentBaseSelect` | `buildFoldUI` | `updatePerCreaseRow`, `updateSelectedCreaseVisuals`, `syncSelectedCreaseUI`, `applySelectedCreaseAngle` | privados de `ui/fold-controls.js` (ningún uso fuera) |
| `interactionMode` | `setInteractionMode` | `setInteractionMode` | privado de `ui/views.js` |
Ninguna variable de UI entra en `S`. Ningún campo de `S` cambia.

### 3.5 Contratos con la escena, el motor, el plegado, el arte y la exportación
- **`GeometryEngine`:** se sigue usando solo vía `geometryEngine`: `validate` (controller), `buildPanels`/`defaultBaseIndex` (manejador Continue), `buildAdjacency`/`buildFoldTree`/`defaultBaseIndex` (fold-controls). Sale de `main.js` como dependencia inyectada. El contrato v1 y el log del motor (golden `a6-logs-golden`, doble llamada visible en T1) no cambian.
- **Escena y plegado:** las fábricas de A7 no cambian. Solo cambia la línea de composición de `createViewport` y `createCreaseVisuals` (envoltorios de §5.3).
- **Arte:** `refreshArtwork` (actions) usa `loadTextureFromPath`, `applyArtworkToScene` y `disposeCurrentArtTextures` sin cambios. Se conservan KI-26 (`Artwork load failed: undefined`) y KI-27.
- **Exportación:** `exportGLB` sigue construyendo el Blob **antes** de abrir el diálogo (I-X1), y el manejador mantiene KI-25. `src/export/` no cambia.

## 4. Lo que A9 no puede tocar (restricciones del arnés y de las pruebas) [MEDIDO]
- **C1 — ancla del arnés:** `setup_harness.py` exige exactamente una aparición de `function setStatus(m){ statusArea.textContent = m; }` e inserta delante `window.__dbg=(typeof __tessDebugView==='function')?__tessDebugView():{…}`. `__tessDebugView` tiene que resolverse **en ese mismo ámbito**. Si saliera de la clausura, el arnés usaría el objeto heredado, que lee `renderer3d` y otros nombres inexistentes: `ReferenceError` en todas las pruebas de navegador del bundle. ⇒ `setStatus` y `__tessDebugView` **se quedan**, sin cambios.
- **C2 — cargador de Node:** `tests/lib/legacy.mjs` `extractFunctions` acepta funciones con 4 espacios o 0, y `loadGeometry` evalúa `validateGeometry` con *stubs* de `problems`, `problemsList`, `validationStatus`, `continueBtn`, `document`, `lastData`, `render2D` y `geometryEngine`. `a6-validacion` compara **línea a línea con su sangría** la `validateGeometry` de `src/` con la de `panel/` más la línea del motor. Dentro de una fábrica (2 espacios) dejaría de encontrarse.
- **C3 — controles de texto:** los ~110 patrones de `mutation-check*.sh` buscan texto en **todos** los `.js` de una copia de `src/` y exigen que cambie exactamente una línea. Siguen funcionando si el texto movido es idéntico. Hay que reubicar o ajustar los que dependen de la sangría, de `main.js` o de una línea de composición: «ensureCep ya no deshabilita Back», KI-24, KI-25, «setBasePanel ya no llama a buildFoldTree», «A8.2/A8.4 cableado main.js». Se mide en A9.0b.
- **C4 — líneas sueltas:** `a7-texto-identico` y `a8-texto-identico` fijan las líneas de `main.js` fuera de funciones (`EXPECTED_RESIDUAL`). Cada paso las actualiza de forma explícita.
- **C5 — límites:** `a5-limites` (inventario de `src/`, imports de `main.js`, `document` solo en `main.js` y `triggerDownload`). `a7-limites` (regla 8 de `S.` en `main.js`). `a8-limites` (identificadores libres). Hay que extenderlas a `ui/` sin relajar las reglas de las capas existentes.

## 5. Módulos propuestos (tarea 4)

### 5.1 Patrón (igual que A7/A8)
Fábricas `createX(S, deps)`: el cuerpo solo desestructura `deps`, declara las variables privadas que hoy están en la clausura (sin efectos al crearse) y declara las funciones **con su texto idéntico salvo −2 espacios de sangría**. Los campos de `S` ya llevan `S.` desde A7. `main.js` desestructura el resultado con los nombres de siempre. Los imports de `host/`, `bridge/` y `config/` pasan al módulo que los usa (como `scene/artwork.js` con `bridge/cep.js`). `main.js` deja de importarlos.

### 5.2 Mapa final recomendado
```
src/main.js            ≈125 l.  shell + raíz de composición: imports de fábricas · IIFE · byId · DOMContentLoaded · consulta del DOM (36) ·
                                 S · setStatus (ancla) · log · clearLog · geometryEngine · __tessDebugView · composición (+3 envoltorios) ·
                                 guarda «UI mismatch» · if(!ensureCep()) return; · 6 llamadas de arranque · bindEvents()
src/ui/views.js        createViews(S, deps)        syncMaterialPresetUI, setInteractionMode, ensureCep, showImport, show3D, setDebugVisible,
                                                   setActiveTab, syncMaterialInputs, setArtStatus  (+ interactionMode privado)  importa bridge/cep (hasCep)
src/ui/fold-controls.js createFoldControls(S, deps) updatePerCreaseRow, updateSelectedCreaseVisuals, syncSelectedCreaseUI, selectFoldEdge,
                                                   applySelectedCreaseAngle, setBasePanel, buildFoldUI  (+ 6 variables privadas de widgets)
src/ui/picking.js      createPicking(S, deps)      pickPanelFromEvent, pickCreaseFromEvent
src/app/actions.js     createActions(S, deps)      refreshArtwork, exportPNG, exportGLB      importa host/art, bridge/cep (evalScriptJSON), bridge/fs (saveBlobWithDialog)
src/ui/controller.js   createController(S, deps)   resetValidationUI, validateGeometry, render2D, applyMaterialPreset, bindEvents()
                                                   (+ lastData y problems privados; bindEvents registra los 15 manejadores en el ORDEN de hoy)
                                                   importa host/extract, host/test-connection, bridge/cep (evalScript), config/look (MATERIAL_PRESETS)
```
**Orden de composición** (las fábricas A7/A8 no cambian de orden; las nuevas van al final, como en A8): `S` → materials → labels → angles → **viewport** (envoltorios de pick) → artwork → **crease-visuals** (envoltorio de `updateSelectedCreaseVisuals`) → panel-meshes → folding → glb-image → glb-scene → glb-builder → **views → fold-controls → picking → actions → controller**. Después vienen la guarda, el arranque y `bindEvents()`, en el punto donde hoy empiezan los `addEventListener`.

### 5.3 Enlace tardío para el ciclo escena → UI (D-A9-3, recomendada: A)
En la raíz de composición, y solo para las 3 retrollamadas que la escena captura al crearse:
```js
createViewport(S, { canvas3d, viewport3d, log, setStatus, pickPanelFromEvent: function(e){ return pickPanelFromEvent(e); }, pickCreaseFromEvent: function(e){ return pickCreaseFromEvent(e); } });
createCreaseVisuals(S, { getFoldHingeHex, signedDisplayAngle, updateSelectedCreaseVisuals: function(){ return updateSelectedCreaseVisuals(); } });
```
El nombre interior se resuelve **al llamar**, contra la variable de `main.js` que asigna después la fábrica de UI. Conserva argumentos, valor devuelto (`if(pickPanelFromEvent(e)) return;`) y excepciones, y solo añade un marco de pila. Es seguro porque ninguna de las tres se llama durante la composición. Las escuchas del lienzo se registran en `init3D` (clic en «Continue») y `rebuildCreaseVisuals` solo corre al plegar. Las dos cosas pasan después de que termine `DOMContentLoaded` [MEDIDO por lectura; lo fija la prueba H5].
Alternativas: **B** `U = createUiState()` sellado con los widgets de plegado (texto con prefijo `U.`, normalizable como `S.`; resuelve el ciclo 1 pero no el 2) · **C** dejar `pickPanelFromEvent`, `pickCreaseFromEvent`, `updateSelectedCreaseVisuals` y todo lo que comparte estado con ellas (los controles de plegado) en `main.js` (≈ 330 l.; separación incompleta, cero envoltorios).

### 5.4 Reglas de frontera (prueba nueva `a9-limites`)
1. Inventario exacto de `ui/` y `app/` por paso. Exports exactos por módulo.
2. `ui/` y `app/actions.js` **sin `THREE`** (hoy `main.js` tiene 0 usos) y **sin `window`**, salvo lo que ya existía en los textos movidos (ninguno [MEDIDO]).
3. `document` solo dentro de las funciones que hoy lo usan: `buildFoldUI`, `validateGeometry`, `exportPNG` y el manejador `keydown`.
4. Imports: hacia `host/`, `bridge/` y `config/` solo los previstos. Ninguno hacia `scene/`, `fold/`, `export/`, `core/` ni `main.js`. Ninguna fábrica importa otra: las cablea `main.js`.
5. Sin estado de módulo (ningún `var`/`let` de primer nivel). El cuerpo de cada fábrica solo desestructura, declara variables privadas y funciones, y devuelve (**sin efectos al crearse**: la guarda «UI mismatch» y el arranque siguen en `main.js`).
6. `lastData` y `problems` solo aparecen en `ui/controller.js`. Los 6 widgets privados de plegado solo en `ui/fold-controls.js`.
7. Identificadores libres: solo globales esperados. **Excepción declarada y única: `buildChildrenOfMap` (KI-24)**, que debe seguir sin resolverse para conservar el `ReferenceError`.
8. Exactamente 3 envoltorios de enlace tardío en `main.js`, con la forma de §5.3.
9. `main.js` conserva `setStatus` (ancla C1) y `__tessDebugView` con su texto, y no conserva ninguna otra función salvo `byId`, `log` y `clearLog`.

## 6. Preservación de eventos, inicialización, mensajes y errores (tareas 5 y 6)
- **Arranque, en el mismo orden:** consulta del DOM → ocultar botones de modo → `S` → `setStatus`/`log`/motor/vista → composición (sin efectos) → guarda «UI mismatch» → `ensureCep` → `showImport` → `resetValidationUI` → `setDebugVisible(debugToggle.checked)` → `syncMaterialInputs` → `setArtStatus(…)` → `setInteractionMode('fold', false)` → `bindEvents()` (15 escuchas, mismo orden y mismas opciones). Sin CEP: no se registra ninguna escucha, como hoy.
- **Manejadores:** el texto de cada función anónima se conserva salvo la sangría. No se convierten en funciones con nombre ni se reparten entre varios módulos (D-A9-6). `refreshArtwork()` sigue sin `await` en Continue. `exportGLB` sigue con `await`, y el manejador sobrescribe el mensaje (KI-25).
- **Mensajes y errores:** ninguna cadena cambia. Se preservan «UI mismatch - missing elements», «CEP bridge not found.», los `Error:`/`Parse error:`, «3D init failed», «No 3D panels…», «Thickness must be greater than 0», el estado de espesor con `toFixed(1)` (KI-14), «Material preset error», KI-24, KI-25, KI-26 y KI-27.
- **Controles:** mismos IDs, mismas clases, mismos estilos en línea y el mismo DOM dinámico (`#fold-panel` se reemplaza en cada `buildFoldUI` y sus 7 escuchas van en elementos nuevos). La tecla Escape solo actúa con la vista 3D visible y fuera de campos de texto.
- **Rarezas que se conservan** (D-A9-10): `currentBaseSelect` solo se escribe; la línea mal sangrada de `pickPanelFromEvent` (`setInteractionMode('fold', false);` a 4 espacios); el `var debugDetails` local de `buildFoldUI` que oculta el widget; la consulta repetida de `byId('log-area')`; los botones de modo ausentes; las funciones desestructuradas y no usadas (`hasArtworkLoaded`, `getFoldHingeRadius`); el doble `applyArtworkToScene` al cambiar el espesor.
- **`window.__dbg` y la vista de depuración:** sin cambios en el producto ni en el arnés (C1). `a7-arnes` y `a7-vista-depuracion` deben seguir en verde sin tocarlos.

## 7. Secuencia incremental con commits reversibles (tarea 7)
Cada paso es un commit propio y revertible con `git revert`. En cada uno: `tests/run-all.sh --mutations --soak` en verde (≈ 50 min, desacoplado), rendimiento leído **antes** del commit, bundle función a función frente a `3ea0d8a`, y huella `dist-a9` regenerada solo después de verificar.

| Paso | Contenido | `src/` | Riesgo |
|---|---|---|---|
| **A9.0a** | Caracterización (§8.1: H1–H6) y sus controles negativos, sin mover nada. Golden solo desde el baseline | no | bajo |
| **A9.0b** | Andamiaje: `a9-texto-identico` (referencia `src/` de `3ea0d8a`), `a9-limites`, `dist-a9` vigente (= `dist-a8` en ese paso), `HISTÓRICO A8` en `build.test` (reconstruye `3ea0d8a` y exige `dist-a8`), `a9-perf`, `a9-equivalencia.sh`, inventario de patrones de mutación afectados | no | bajo |
| **A9.1** | `ui/views.js` (9 funciones, `interactionMode` privado; `hasCep` importado) | sí | bajo |
| **A9.2** | `app/actions.js` (`refreshArtwork`, `exportPNG`, `exportGLB`; imports de `host/art`, `bridge/cep`, `bridge/fs`) | sí | medio (asíncrono, KI-25/26/27) |
| **A9.3** | `ui/fold-controls.js` (7 funciones, 6 widgets privados) + envoltorio de `updateSelectedCreaseVisuals` | sí | **alto** (183 l., ciclo 1, 7 escuchas dinámicas) |
| **A9.4** | `ui/picking.js` + 2 envoltorios de pick | sí | medio (ciclo 2; Shift/Alt+clic) |
| **A9.5** | `ui/controller.js` (validación, 2D, preset, `lastData`/`problems`, `bindEvents` con los 15 manejadores) + ajuste del cargador (§8.4) | sí | **alto** (`lastData`, texto fijado, todos los manejadores) |
| **A9.6** | Cierre: informe PC10, procedimiento A9-CEP **preparado, no ejecutado**, `KNOWN_ISSUES`, `tests/README`, `HANDOFF` | no | — |
**Puntos de parada:** propongo un punto de control después de A9.2 y antes de A9.3. A9.3 y A9.5 son los pasos de riesgo alto. Si A9.5 no se aprueba (D-A9-5 = B), A9 termina en A9.4 con el grupo `lastData` en `main.js` (≈ 330 l.) y todo lo demás separado. **Reversión:** cada paso deshace su commit. `dist-a8` y las huellas anteriores no se tocan nunca, y `build.test` reconstruye `3ea0d8a` en cada batería.

## 8. Pruebas (tarea 8)

### 8.1 Caracterización nueva (A9.0a, antes de mover nada; baseline = `panel/` = bundle)
| ID | Qué fija | Cómo |
|---|---|---|
| **H1** | **Inventario de escuchas**: por elemento (id/selector), tipo, opciones (`capture`/`passive`), número y orden, tras arranque, extraer, 3D, cambiar la base, reconstruir por espesor y preset, y Back. Con CEP ausente: 0 escuchas de UI | *init script* que envuelve `EventTarget.prototype.addEventListener`/`removeEventListener` y los `on*` asignados; golden solo desde el baseline. Entre el bundle de `3ea0d8a` y el actual también se compara el texto del manejador (mismo impresor de esbuild) |
| **H2** | **Historial de mensajes** de `#status-area`, `#art-status`, `#art-source-pill`, `#validation-status`, `#interaction-status`, `#viewport-badge`, `#material-pill` y `#error-msg` (visibilidad) en todos los flujos, incluidos los de error | `MutationObserver` (como `a7`/`a8`); amplía los 30 casos de `bridge.test` con extracción con problemas, `onclick` de un problema, Preview sin datos, espesor inválido, preset antes de 3D (KI-24), «UI mismatch» |
| **H3** | **Estado inicial y de arranque**: `display` de las vistas, `disabled` de botones, textos, valor del select y del espesor, pestaña activa y `aria-selected`, botones de modo ocultos, en 3 arranques: normal, sin CEP y con un elemento requerido ausente | lectura del DOM tras `DOMContentLoaded` |
| **H4** | **DOM dinámico** de `#fold-panel` (estructura, atributos, `style.cssText`, textos) y de `#problems-list` tras construir, cambiar la base, mover deslizadores, ALL, Reset y seleccionar una crease; hash de los píxeles de `#preview-canvas` (2D, con y sin resaltado de problema) | serialización determinista del subárbol |
| **H5** | **Enlace tardío**: Shift+clic y Alt+clic **inmediatamente** después del primer 3D; resaltado de la crease seleccionada tras plegar (material `#ffd166` y fila del DOM) | eventos sintéticos, como «Interacciones» |
| **H6** | **Teclado y foco**: Escape en 3D, en la vista de importación y con el foco en un `input` | `KeyboardEvent` |
Se mantiene todo lo existente: píxeles, escena e inventario ordenado (A7), L1–L3, log del motor (A6), N1 byte a byte (`737bcd23…`/`87aa2e4c…`), N2, N3 estructural + 0 píxeles, N4, E1–E6, puente CEP (30 casos), Chromium-99 con APIs reducidas, `a5-observar`, A4-CDP.

### 8.2 Equivalencia de texto y de bundle
- **`a9-texto-identico`:** las 29 funciones de la clausura de `3ea0d8a` existen **una sola vez** en `src/` con el mismo texto salvo la sangría. Los 15 manejadores, comparados como bloques, son idénticos salvo la sangría dentro de `bindEvents`. Las líneas sueltas de `main.js` cambian solo como prevé cada paso. Solo se añaden las 5 fábricas, `bindEvents` y los 3 envoltorios.
- **Bundle:** `a9-equivalencia.sh` (como `a8-equivalencia.sh`) compara las 144 funciones del bundle de `3ea0d8a` [INFERENCIA: 141 + 3 de A8; se mide en A9.0b]. Criterio: 0 distintas, 0 duplicadas, 0 perdidas.

### 8.3 Soak y rendimiento
- **Soak de GPU** (el de siempre): 25 ciclos de plegado con Δ=0 en `panel/` y bundle (caja e ill, con y sin arte). El baseline sigue como control positivo de KI-01.
- **Soak de UI (nuevo):** 25 reconstrucciones alternando espesor, preset y base. Número de escuchas en elementos persistentes **constante** (H1), un solo `#fold-panel`, nodos del DOM constantes tras el ciclo 1, GPU Δ=0. Heap JS solo informativo.
- **Rendimiento:** `a9-perf` (sobre `a8-perf`) frente al bundle de `3ea0d8a`, intercalado en la misma sesión, ≥ 10 corridas (20 si hay que investigar). Métricas de A8 más latencia deslizador → fotograma, tiempo de `buildFoldUI`, extraer → validar → 2D, y clic → estado en Shift/Alt+clic. **Umbral: > +10 % investigar, > +25 % detener** (D-A7-13). Ruido de referencia: ±5 %.

### 8.4 Ajustes de pruebas existentes (mecánicos, sin reducir la detección; D-A9-9)
- `tests/lib/legacy.mjs`: `extractFunctions` acepta también 2 espacios **solo para el objetivo `src`**, y sigue exigiendo una definición única. `a6-validacion` compara `validateGeometry` con la sangría normalizada de forma uniforme, no línea por línea con espacios. Solo en A9.5.
- `a5-limites` (inventario y prefijos `ui/`), `a7-limites` (regla 8 aplicada también a `ui/` y `app/actions.js`), `a7`/`a8-texto-identico` (líneas sueltas esperadas), `a6-limites` (imports del motor), `build.test` (`dist-a9`, `HISTÓRICO A8`).
- Reubicar los patrones de mutación que dependan de la sangría o de la composición. Regla: el patrón reubicado tiene que fallar **la misma** prueba que antes.
- **No cambian:** `setup_harness.py`, `harness.mjs`, goldens, `fixtures.pins.json`, `panel.pins.json`, huellas históricas, `reference/`.

### 8.5 Controles negativos nuevos (≥ 16; cada uno debe hacer fallar al menos una prueba de comportamiento, o se declara laguna)
| # | Mutación | Debe detectarla |
|---|---|---|
| 1 | El envoltorio de `updateSelectedCreaseVisuals` no llama a la función | H5, inventario A7 |
| 2 | El envoltorio de `pickPanelFromEvent` devuelve `undefined` (Shift+clic cae en la órbita) | H5, Interacciones |
| 3 | `createViewport` recibe `pickPanelFromEvent` sin envoltorio (captura `undefined`) | H5 |
| 4 | `bindEvents` registra dos veces la escucha de Extract | H1 |
| 5 | `bindEvents` omite la de `debug-toggle` | H1, H3 |
| 6 | `keydown` en `window` en lugar de `document` | H1 |
| 7 | `setActiveTab` con clave por defecto `'artwork'` | H3 |
| 8 | `buildFoldUI` deja de reiniciar `currentCreaseRows = [];` | H4, H5 |
| 9 | Una copia sombra de `lastData` en el manejador Preview | H2 |
| 10 | El `onclick` de un problema llama a `render2D(null, …)` | H4 (píxeles 2D) |
| 11 | `bindEvents()` se llama **antes** de `ensureCep` (registro sin CEP) | H1 (CEP ausente) |
| 12 | `ensureCep` deja de mostrar `#error-msg` | H3 |
| 13 | `createFoldControls` copia `S` (`Object.assign({}, S)`) | Interacciones, A7 |
| 14 | `ui/views.js` usa `THREE` | solo `a9-limites` (laguna declarada) |
| 15 | `buildChildrenOfMap` declarado en `controller.js` (KI-24 «corregido» sin tarea) | puente CEP (control existente reubicado) |
| 16 | `refreshArtwork()` con `await` en Continue (cambia la secuencia de mensajes) | H2 |
| 17 | La guarda «UI mismatch» se mueve después de `ensureCep` | H3 |
| 18 | Una fábrica de UI con efecto al crearse (`setStatus` en la fábrica) | H2 / H3 |
Se conservan los 108 controles vigentes, reubicados donde haga falta (C3).

## 9. Riesgos (tarea 9)
| # | Riesgo | Prob. | Impacto | Mitigación |
|---|---|---|---|---|
| R1 | Cableado tardío mal hecho: falla solo en su ruta (clase KI-24) | media | alto | Solo 3 envoltorios, forma fija (`a9-limites` 8), H5, controles 1–3, identificadores libres |
| R2 | `lastData` desdoblado (dos variables con el mismo nombre) | media en A9.5 | alto | Todo su grupo en una fábrica; regla 6; control 9; H2 |
| R3 | Debilitar sin querer las pruebas al ajustar el cargador o `a6-validacion` | media | alto | Solo normalización uniforme de la sangría y solo para `src`; control de A6 «los id de problema empiezan en P0» y uno nuevo sobre `validateGeometry` |
| R4 | Cambio en el orden o el momento del registro de escuchas | baja | medio | Un solo `bindEvents` con el orden de hoy, llamado en el mismo punto; H1 con y sin CEP; controles 4, 5, 6 y 11 |
| R5 | Arnés: ancla o vista de depuración desplazadas o renombradas por esbuild | baja | alto | No se mueven; pruebas existentes (`function __tessDebugView(` sin renombrar en el bundle, `a7-arnes`) |
| R6 | Renombrados de esbuild por nombres nuevos de primer nivel (pasó con `log` → `log2`) | baja | medio | `a9-equivalencia` a cualquier sangría; revisar el bundle en A9.0b |
| R7 | Efectos al crear las fábricas (antes de la guarda) | baja | medio | Regla 5; controles 17 y 18; H3 con «UI mismatch» |
| R8 | Acumulación de escuchas o nodos en reconstrucciones | baja | medio | Soak de UI (H1 + nodos) |
| R9 | Orden asíncrono (arte sin `await`, GLB con `await`, KI-25) | baja | medio | E4/E5, puente CEP, H2, control 16 |
| R10 | Rendimiento (marco de pila extra; carga de módulos) | muy baja | bajo | `a9-perf` con umbral |
| R11 | Chromium 99 del CEP | muy baja | alto | El texto no cambia; `chromium99-compat` y la batería con APIs reducidas; A9-CEP |
| R12 | Expansión de alcance (corregir KI-24/25/14/12 «de paso») | media | alto | Controles existentes de KI-24/25; nada de UX nueva; reservado a F7 |
| R13 | **Shift+clic y Alt+clic nunca se han probado en CEP real** (pendiente desde A4) y A9 mueve justo ese cableado | — | alto | Incluirlos en el procedimiento A9-CEP, hechos por el usuario a mano (D-A9-12) |
| R14 | Coste de tiempo: 5 pasos × ≈ 50 min de batería | alta | bajo | Lanzarla desacoplada; parada en el punto de control |

## 10. Qué NO se toca (repetido para el cierre)
Algoritmos geométricos, `GeometryEngine`, plegado, materiales, escena, arte, exportación GLB (bytes), three r132, defectos conocidos (KI-02…KI-28, incluidos KI-24, KI-25, KI-14 y KI-12), textos, IDs, clases y estilos de la UI, `window.__dbg`, `__tessDebugView`, `setup_harness.py`, goldens, fixtures, huellas históricas, `reference/`, `panel/`, el plugin original y la extensión instalada. Nada se instala en Illustrator. No se inicia F2.

## 11. Condiciones de aceptación propuestas para PC10
1. Texto idéntico demostrado (`a9-texto-identico`), líneas sueltas solo con los cambios previstos y bundle función a función sin distintas, duplicadas ni perdidas frente a `3ea0d8a`.
2. `run-all.sh --mutations --soak` en verde tras cada paso. Todos los controles detectados (vigentes reubicados + nuevos), ninguno «NO APLICÓ» ni «NO DETECTADA».
3. H1–H6 idénticas entre baseline, `panel/` y bundle. GLB sin arte byte a byte (`737bcd23…`/`87aa2e4c…`), con arte estructural y 0 píxeles distintos. E1–E6, L1–L3, inventario de escena y log del motor sin cambios.
4. Soak de GPU Δ=0 y soak de UI estable. Rendimiento dentro de +10 % o investigado y explicado.
5. `main.js` reducido a las responsabilidades de §5.2 (shell + composición), `setup_harness.py` sin cambios, `a7-arnes` y `a7-vista-depuracion` en verde.
6. `dist-a9` regenerada solo tras verificar. `dist-a8` y las huellas anteriores intactas y reproducibles. Aislamiento verde. V3 sin instalar.
7. Defectos conocidos reproducidos tal cual y `KNOWN_ISSUES` actualizado (sin defectos nuevos, o registrados sin corregir).
8. Procedimiento A9-CEP preparado y fijado por una prueba, **no ejecutado**.

## 12. Estimación [INFERENCIA]
A9.0a ≈ 1 día (H1–H6 + controles) · A9.0b ≈ 0,5 · A9.1–A9.2 ≈ 0,5 cada uno · A9.3 ≈ 1 · A9.4 ≈ 0,5 · A9.5 ≈ 1 · A9.6 ≈ 0,5. Total ≈ 5–6 días de trabajo, más ≈ 50 min de batería por paso.

## 13. Decisiones que requieren aprobación
| # | Decisión | Recomendación | Alternativas y riesgo |
|---|---|---|---|
| **D-A9-1** | Nivel de A9: **mecánico** (texto idéntico; los manejadores se mueven tal cual) | **Mecánico** | Estructural (orquestadores con nombre, deduplicar la inicialización de plegado de `buildFoldUI`/`setBasePanel`): cambia el texto y mezcla A9 con F7 |
| **D-A9-2** | Los 5 módulos de §5.2 | **Aprobar** | Menos módulos (fusionar `picking` en `fold-controls`): menos ficheros, la misma complejidad de cableado |
| **D-A9-3** | Ciclo escena → UI | **A: 3 envoltorios de enlace tardío** | B: objeto `U` con prefijo `U.` (más texto cambiado; no resuelve el ciclo 2) · C: dejar esas funciones y los controles de plegado en `main.js` |
| **D-A9-4** | `pickPanelFromEvent`/`pickCreaseFromEvent` | **Mover a `ui/picking.js`** (A9.4) | Dejarlos en `main.js` como adaptadores elevados: 0 envoltorios para ellos y 35 líneas más en `main.js` |
| **D-A9-5** | Grupo `lastData` (validación, 2D, preset, 15 manejadores) | **A: `ui/controller.js` + ajuste del cargador** (A9.5) | B: se queda en `main.js` y A9 termina en A9.4 (cargador y `a6-validacion` intactos) |
| **D-A9-6** | Manejadores | **Un solo `bindEvents`, orden de hoy** | Repartirlos por módulo: el orden entre elementos distintos no es observable [INFERENCIA], pero añade una diferencia sin necesidad |
| **D-A9-7** | Shell en `main.js`: consulta del DOM, `setStatus`, `log`, `clearLog`, `byId`, `__tessDebugView` | **Se quedan** | Sacar la consulta del DOM a `ui/dom.js`: solo cambia líneas sueltas y acerca la guarda a la consulta sin ganar nada |
| **D-A9-8** | Imports de `host/`, `bridge/` y `config/` | **En el módulo que los usa** (como `scene/artwork`) | Inyectarlos todos desde `main.js`: listas de `deps` más largas |
| **D-A9-9** | Ajustes de herramientas de prueba (§8.4) | **Aprobar** (mismo criterio que D-A7-7: no reducir la detección) | Sin ellos, A9.5 no puede pasar la batería |
| **D-A9-10** | Código muerto y rarezas (§6) | **Preservarlas** (como D-A7-8) | Retirarlas: cambia el bundle; es tarea de F7 |
| **D-A9-11** | Huellas: `dist-a9` vigente desde A9.0b; `dist-a8` congelada y reproducible desde `3ea0d8a` | **Aprobar** | — |
| **D-A9-12** | A9-CEP | **Preparar en A9.6, no ejecutar**. Incluir Shift+clic, Alt+clic, pestañas, Escape, deslizadores, ALL/Reset, base, espesor, preset, arte y GLB con diálogo, hechos por el usuario | Ejecutarla requiere autorización fechada aparte |
| **D-A9-13** | Modo de ejecución | **A9.0a–A9.2 autónomo**, punto de control antes de A9.3, después A9.3–A9.6 con parada si algo falla | Paso a paso con aprobación entre pasos |
| **D-A9-14** | Umbral de rendimiento | **> +10 % investigar, > +25 % detener**, ≥ 10 corridas intercaladas (20 si hay que investigar) | Solo informativo |
| **D-A9-15** | Versionado de esta propuesta | Commit **tras tu aprobación**, con las decisiones anotadas (como en A6–A8) | — |
| **D-A9-16** | Quién implementa | **Opus High en un chat nuevo** con `HANDOFF.md` actualizado (política del proyecto) | — |

## 14. Qué NO se verificó [NO VERIFICADO]
- El mapa de §3 sale de un análisis léxico con revisión manual, sin instrumentar la ejecución. Que la llamada de los envoltorios sea siempre posterior a la composición es [MEDIDO por lectura] y lo cubrirá H5.
- Las cifras de §5.2 (≈ 125 líneas) y de §12 son estimaciones. El número de funciones del bundle se mide en A9.0b.
- Que el orden de registro entre elementos distintos no sea observable se basa en la semántica del DOM [INFERENCIA]; D-A9-6 lo evita de todos modos.
- Nada de esta propuesta se probó en Illustrator ni en CEP real. Shift+clic y Alt+clic en CEP real siguen sin probarse desde A4.

## 15. Método
Lectura completa de `HANDOFF.md`, `PLAN_MAESTRO_V3.md`, `A8_INFORME.md`, `A8_VALIDACION_CEP_INFORME.md`, `KNOWN_ISSUES.md`, `tests/README.md` y `src/main.js`; lectura de `setup_harness.py`, `tests/browser/harness.mjs`, `tests/lib/{legacy,a7}.mjs`, `a6-validacion`, `a5/a7/a8-limites`, `mutation-check*.sh` y de las cabeceras de las fábricas de `scene/`, `fold/` y `export/`. Mapa de dependencias generado con un script de solo lectura (no versionado) cuyo resultado se guarda en `docs/fase1/a9/`. Batería completa en el árbol limpio de `3ea0d8a`.

## 16. Revisión del usuario (2026-10-26): matriz de decisiones
**Estado:** el usuario **acepta conceptualmente** la arquitectura de cinco módulos (§5.2). **No autoriza todavía A9.0a–A9.6.** La ejecución, cuando se autorice, será incremental, con un **punto de control obligatorio antes de A9.3**. Esta sección no cambia la propuesta: detalla cada decisión. Hallazgos nuevos de esta revisión, [MEDIDO por lectura]:
- **H-R1:** en `viewport.js` (`onUp`), las llamadas a `pickPanelFromEvent`/`pickCreaseFromEvent` van dentro de `try{…}catch(ex){ log('Pick error: '+ex.message); }`. Una retrollamada mal cableada **no rompe el panel**: el clic no hace nada y deja `Pick error: … is not a function` en el registro. Hoy ninguna prueba vigila ese texto: «Interacciones» detecta el efecto (la base no cambia), no la causa.
- **H-R2:** `rebuildCreaseVisuals` llama a `updateSelectedCreaseVisuals()` solo después de su guarda (`if(!S.panelGroupMap.length || !S.foldTree.length) return;`). Sin modelo 3D no se llama nunca, así que un fallo de cableado solo aparece al plegar.
- **H-R3:** no hay destrucción de componentes. `init3D` se ejecuta una sola vez (guarda `if(S.renderer3d) return true;`) y registra 9 escuchas en el *overlay* y 1 en `window`. `bindEvents` correrá una sola vez por carga. `#fold-panel` se **reemplaza** en cada `buildFoldUI` (`existing.remove()`) y sus 7 escuchas desaparecen con los elementos. «Back» solo oculta la vista. A9 **no añade** desmontaje ni `removeEventListener` (sería funcionalidad nueva).

### 16.1 Matriz (las 16 decisiones de §13)
«Autorización expresa»: **Sí** = hay que nombrarla explícitamente al autorizar A9 · **Aparte** = necesita además una autorización separada y fechada · **Incluida** = basta con aprobar la propuesta.

| ID | Alternativas | Recomendación técnica | Riesgo de cada alternativa | Impacto sobre equivalencia funcional | Pruebas que la respaldan | Autorización expresa |
|---|---|---|---|---|---|---|
| **D-A9-1** Nivel | **M** mecánico (texto idéntico) · **E** estructural (orquestadores con nombre, deduplicar la inicialización de plegado) | **M** | M: bajo (muchos pasos de prueba). E: alto (cambia texto: `a7/a8/a9-texto-identico` dejan de probar nada; mezcla A9 con F7) | M: ninguno (mismo texto, mismo orden). E: equivalencia solo por comportamiento, sin garantía de texto | `a9-texto-identico`, `a9-equivalencia` (bundle), toda la batería | **Sí** |
| **D-A9-2** Módulos | **A** los 5 de §5.2 · **B** 4 (`picking` dentro de `fold-controls`) · **C** 3 (sin `controller`) | **A** (aceptada conceptualmente) | A: cableado de 5 fábricas. B: módulo de controles más grande, mismo ciclo. C: `main.js` ≈ 330 l. | Ninguno en A/B/C si el texto es idéntico | `a9-limites` (inventario, exports), H1–H6 | **Incluida** (ya aceptada) |
| **D-A9-3** Resolución diferida de las 3 retrollamadas del visor | **A** 3 envoltorios de enlace tardío en la raíz de composición · **B** objeto `U` con prefijo `U.` · **C** dejar esas 3 funciones (y los controles de plegado) en `main.js` | **A** | A: envoltorio mal escrito ⇒ el clic no hace nada y deja `Pick error` en el registro (H-R1), o no hay resaltado al plegar (H-R2). B: cambia muchas líneas de `buildFoldUI` (`U.`) y **no resuelve el ciclo 2** (pick). C: sin riesgo de cableado, separación incompleta | A: un marco de pila más; argumentos, valor devuelto y excepciones iguales; nunca se llama durante la composición (§5.3). B: igual, con más texto normalizado. C: ninguno | H5 (clic inmediato tras el 3D, resaltado tras plegar, **registro sin `Pick error`**), «Interacciones», inventario A7, `a9-limites` regla 8, controles 1–3 y 19–20 (§16.2.7) | **Sí** (cambia la ruta de llamada) |
| **D-A9-4** Picking | **A** a `ui/picking.js` con 2 envoltorios · **B** se queda en `main.js` como función elevada | **A** | A: lo mismo que D-A9-3 A para Shift/Alt+clic. B: ninguno nuevo; deja lógica de UI en `main.js` | Ninguno en ambas | «Interacciones» (Shift+clic: base, select, estado; Alt+clic: crease, pestaña, estado), H5, control vigente «Shift+clic ya no cambia la base» | **Sí** (va con D-A9-3) |
| **D-A9-5** `lastData` y `validateGeometry` | **A** todo el grupo a `ui/controller.js` + ajuste del cargador · **B** el grupo se queda en `main.js` (A9 acaba en A9.4) · **C** `lastData`/`problems` en `S` o `U` | **A**, en su propio paso (A9.5) | A: `lastData` desdoblado si algo queda fuera; debilitar sin querer el cargador o `a6-validacion`. B: ninguno; separación incompleta. C: cambia el texto **fijado** de `validateGeometry` (rechazado ya en A7) | A: ninguno si las 6 lecturas y la escritura comparten una sola variable. B: ninguno. C: riesgo de alias desfasado (`lastData` se reasigna) | `a6-validacion` (normalizado), `geometry-golden`, `a6-logs-golden`, puente CEP (30), H2 (`onclick` del problema), H4 (píxeles 2D), `a9-limites` regla 6, controles 9–10 | **Sí** (toca una herramienta de prueba fijada) |
| **D-A9-6** Orden y unicidad de los 15 manejadores | **A** un solo `bindEvents`, orden de hoy, una llamada · **B** un enlazador por módulo | **A** | A: llamarlo dos veces o en otro punto. B: cambia el orden entre elementos (no observable según el DOM [INFERENCIA]) y abre la puerta a duplicados | A: ninguno (mismo orden, mismas opciones, mismo momento: después de `ensureCep`). B: diferencia teórica de orden | H1 (inventario por elemento: tipo, opciones, número, orden; sin CEP = 0), H3, controles 4, 5, 6, 11 | **Sí** |
| **D-A9-7** Shell en `main.js` | **A** se quedan consulta del DOM, `setStatus`, `log`, `clearLog`, `byId`, `__tessDebugView` · **B** consulta del DOM a `ui/dom.js` | **A** | A: ninguno. B: separa la consulta de la guarda «UI mismatch» sin ganar nada | Ninguno | `a7-arnes`, `a7-vista-depuracion`, H3 («UI mismatch») | **Incluida** |
| **D-A9-8** Imports | **A** en el módulo que los usa · **B** todo inyectado desde `main.js` | **A** | A: un import olvidado ⇒ `ReferenceError` solo en esa ruta. B: listas de `deps` largas, con el mismo riesgo de cableado | Ninguno | `a9-limites` (imports previstos, identificadores libres), `host-scripts`, puente CEP, `a5-observar` | **Incluida** |
| **D-A9-9** Ajustes de herramientas de prueba | **A** solo los de §8.4 (normalización uniforme, solo para `src`) · **B** ninguno | **A** | A: debilitar la detección sin darse cuenta. B: A9.5 no puede pasar la batería | Ninguno en el producto | Cada ajuste se acompaña de un control que **sigue fallando** igual que antes (§16.2.7) | **Sí** (toca pruebas fijadas) |
| **D-A9-10** Código muerto y rarezas | **A** preservarlas · **B** retirarlas | **A** | A: ninguno. B: cambia el bundle, roza «corregir defectos» | A: ninguno. B: el bundle deja de ser comparable función a función | `a9-texto-identico`, `a9-equivalencia` | **Incluida** |
| **D-A9-11** Huellas | **A** `dist-a9` vigente desde A9.0b; `dist-a8` congelada y reproducible · **B** regenerar `dist-a8` | **A** | A: carrera de `ensureDist()` mientras la huella no coincide (conocida; regenerar solo tras verificar). B: destruye la referencia validada en CEP real | Ninguno | `build.test` (`HISTÓRICO A8` reconstruye `3ea0d8a`), `a8-cep-evidencia` | **Sí** |
| **D-A9-12** A9-CEP | **A** preparar en A9.6 sin ejecutar · **B** no prepararla | **A** | A: ninguno. B: Shift/Alt+clic siguen sin probarse en real (R13) | — | Prueba que fija el procedimiento (como `a8-cep-preparacion`) | **Aparte y fechada** para ejecutarla |
| **D-A9-13** Ejecución | **A** incremental, parada obligatoria antes de A9.3 (y si algo falla) · **B** paso a paso con aprobación entre todos | **A** (confirmada por el usuario) | A: acumula A9.0a–A9.2 sin revisión intermedia. B: más lento | Ninguno | Batería completa por paso | **Sí** (fija el alcance autorizado) |
| **D-A9-14** Rendimiento | **A** > +10 % investigar, > +25 % detener, ≥ 10 corridas (20 si hay que investigar) · **B** solo informativo | **A** | A: falsos «investigar» (mediana bimodal, A8.3). B: una degradación real pasaría | — | `a9-perf` intercalado frente a `3ea0d8a` | **Incluida** |
| **D-A9-15** Versionado de la propuesta | **A** commit tras la aprobación, con las decisiones anotadas · **B** sin commit | **A** | — | — | — | **Sí** (es un commit) |
| **D-A9-16** Quién implementa | **A** Opus High en un chat nuevo con `HANDOFF.md` · **B** este chat | **A** | A: pérdida de contexto (se compensa con `HANDOFF.md`). B: contexto largo | — | — | **Incluida** (política del proyecto) |

### 16.2 Puntos de especial atención

**16.2.1 Resolución diferida de las tres funciones del visor (D-A9-3/4).**
- Hoy: `createViewport` y `createCreaseVisuals` copian `pickPanelFromEvent`, `pickCreaseFromEvent` y `updateSelectedCreaseVisuals` de `deps` al crearse. Las tres son declaraciones elevadas de la clausura.
- Tras A9: tres envoltorios fijos en la composición (§5.3). Dentro de cada uno, el nombre se resuelve contra la variable de `main.js` que asigna después `createPicking`/`createFoldControls`.
- **Condiciones que se comprobarán:**
  1. Ninguna de las tres se llama durante la composición. Las escuchas del lienzo nacen en `init3D` (clic en Continue) y `rebuildCreaseVisuals` corre tras su guarda (H-R2).
  2. El envoltorio de pick **devuelve** el resultado (`if(pickPanelFromEvent(e)) return;`).
  3. Exactamente 3 envoltorios con forma fija (`a9-limites` regla 8).
  4. H5 comprueba Shift+clic y Alt+clic **en el primer clic tras el 3D**, el resaltado `#ffd166` y la fila del DOM tras plegar, y **que el registro no contenga `Pick error`** (H-R1).

**16.2.2 Traslado de `lastData` y `validateGeometry` (D-A9-5).**
- Una sola escritura (`lastData = parsed` en Extract, dos ramas) y seis lecturas: el `onclick` de `validateGeometry`, `applyMaterialPreset`, Preview, Continue (×2) y Thickness.
- Todas van al mismo cuerpo de `createController`. `a9-limites` regla 6 falla si `lastData` aparece en otro archivo; el control 9 crea una copia sombra y debe fallar H2.
- `validateGeometry` conserva su texto. Solo cambia la sangría, y el cargador (solo para `src`) y `a6-validacion` la normalizan **uniformemente**: se sigue exigiendo una definición única y la misma secuencia de líneas.
- Control de no debilitamiento: el patrón vigente «los id de problema empiezan en P0» y uno nuevo sobre la línea `problems=geometryEngine.validate(data).problems;` deben seguir fallando tras el ajuste.

**16.2.3 Orden y unicidad de los 15 manejadores (D-A9-6).**
- Un solo `bindEvents`, llamado **una vez**, justo después del arranque y de `if(!ensureCep()) return;`, con los 15 `addEventListener` en el orden de §3.1. Los 2 de modo y el de pestañas siguen dentro de sus `if`.
- H1 registra por elemento: tipo, opciones, número y orden, en baseline, `panel/` y bundle, y compara el texto de cada manejador con el bundle de `3ea0d8a`.
- Unicidad: una escucha por botón (cada clic produce un solo cambio de estado, visible en H2). Sin CEP, 0 escuchas de UI. Tras 25 reconstrucciones, el número de escuchas en elementos persistentes no cambia.

**16.2.4 Preservación de `window.__dbg` y `__tessDebugView`.**
- Ninguna de las dos cambia. `setStatus` (ancla) y `__tessDebugView` se quedan en la clausura de `main.js`, con su texto y en su sitio. `setup_harness.py` no se toca.
- Pruebas vigentes: `a7-arnes` (la línea inyectada usa la vista si existe), `a7-vista-depuracion` (una sola, indentación 4, 18 *getters*, solo lectura, nunca llamada, nombre sin renombrar en el bundle) y el control «vista de depuración: `baseIndex` devuelve otro campo».
- Riesgo residual: que esbuild renombre `__tessDebugView` por un nombre nuevo de primer nivel. Lo cubre la prueba del bundle.

**16.2.5 Inicialización, reentrada y destrucción.**
- *Inicialización:* las fábricas nuevas no tienen efectos al crearse (`a9-limites` regla 5; controles 17–18). Se conserva el orden guarda → `ensureCep` → 6 llamadas → `bindEvents`. H3 cubre los arranques normal, sin CEP y con «UI mismatch».
- *Reentrada:* cadenas que hoy se reentran y se conservan tal cual:
  - `setBasePanel` → `buildFoldUI` → `applyFolding`, y después otra vez `applyFolding` + `fitCamera3D`.
  - El `change` del select de base llama a `setBasePanel`, que **elimina el `#fold-panel` cuya escucha se está ejecutando**.
  - `applyMaterialPreset`/espesor → `build3DFromPanels` + `buildFoldUI` (el arte se aplica dos veces con el espesor).
  - `init3D` se protege con `if(S.renderer3d)`.
  - H4 y el soak de UI ejercitan cada cadena varias veces seguidas. El log del motor (`a6-logs-golden`) fija la doble llamada de adyacencia y árbol.
- *Destrucción:* no hay desmontaje (H-R3) y A9 no lo añade. La liberación de recursos de escena sigue en A1/A7 (L1–L3, GPU Δ=0).

**16.2.6 Shift+clic y Alt+clic.**
- Rutas: `onUp` del *overlay* (`viewport.js`) → envoltorio → `pickPanelFromEvent` (Shift: `setBasePanel(idx,true,true)`, pestaña Material, modo fold, «Base set to P…») o `pickCreaseFromEvent` (Alt: `selectFoldEdge`, pestaña Creases, «Crease C… selected»).
- Hoy en headless: «Interacciones» en los 3 objetivos (base, select, estado, pestaña) y el control «Shift+clic ya no cambia la base».
- Nuevo en H5: primer clic tras el 3D, registro sin `Pick error`, un solo cambio de estado por clic.
- **En CEP real nunca se han probado** (A4–A8). La propuesta los incluye en A9-CEP, hechos a mano por el usuario (D-A9-12), con autorización aparte.

**16.2.7 Cobertura de mutaciones y soak de interfaz.**
- *Controles negativos:* los **108** vigentes se conservan. Los que dependen de la sangría, de `main.js` o de una línea de composición se reubican, y cada uno debe fallar **la misma** prueba que antes. Se suman los 18 de §8.5 y estos 4:
  - **19:** el envoltorio de `pickCreaseFromEvent` llama a `pickPanelFromEvent` → «Interacciones».
  - **20:** el envoltorio de pick no devuelve el resultado (`return` quitado) → H5: tras la selección, el clic sigue a la órbita.
  - **21:** `bindEvents()` se llama dos veces → H1, H2.
  - **22:** la normalización del cargador acepta cualquier sangría también para baseline/`panel/` → `a9-limites`/control del cargador.
- Objetivo: **≥ 130 controles**, todos «detectada». Si una mutación no la detecta ninguna prueba de comportamiento, se declara **laguna** (como el control 14).
- *Soak de interfaz:* 25 ciclos alternando espesor, preset, cambio de base por select y por Shift+clic, y selección por Alt+clic. Criterios:
  - escuchas en elementos persistentes constantes (H1);
  - exactamente un `#fold-panel`;
  - nodos del DOM constantes desde el ciclo 1;
  - GPU Δ=0 (contadores de `leak_cycles.js`);
  - mensajes finales iguales en baseline, `panel/` y bundle;
  - heap JS solo informativo.
  El soak de GPU de 25 ciclos de plegado se mantiene, con el baseline como control positivo de KI-01.

### 16.3 Lo que queda pendiente
Nada de A9.0a–A9.6 empieza sin una autorización que cite las decisiones aprobadas (sobre todo las marcadas **Sí**). La ejecución en CEP real (A9-CEP) necesita además una autorización **aparte y fechada**. No se instala V3, no se modifica el plugin original, no se corrigen defectos conocidos y no se inicia F2.

## 17. Decisiones del usuario (2026-10-26)
El usuario **aprobó D-A9-1 a D-A9-16 tal como se recomiendan en §16.1**: mecánico · 5 módulos · 3 envoltorios de enlace tardío · `ui/picking.js` · `ui/controller.js` con ajuste del cargador · un solo `bindEvents` en el orden de hoy · shell en `main.js` · imports en el módulo que los usa · ajustes mínimos de pruebas · rarezas preservadas · `dist-a9` nueva con `dist-a8` congelada · A9-CEP preparada y no ejecutada · ejecución incremental · umbral +10 %/+25 % · commit de esta propuesta · Opus High en un chat nuevo.

**Autorización por bloques:**
| Bloque | Pasos | Estado |
|---|---|---|
| **1** | A9.0a, A9.0b, A9.1 (`ui/views.js`), A9.2 (`app/actions.js`) | **Autorizado para un chat nuevo de Opus High**. Batería completa y mutaciones tras cada etapa; **parada obligatoria antes de A9.3** con evidencia para revisión |
| **2** | A9.3 (`ui/fold-controls.js` + 1 envoltorio), A9.4 (`ui/picking.js` + 2 envoltorios), A9.5 (`ui/controller.js`, `lastData`, `validateGeometry`, 15 manejadores), A9.6 (cierre) | **NO autorizado**; requiere autorización posterior |

**Garantías obligatorias (las fija el usuario):**
- Registro único y ordenado de los 15 manejadores.
- Efecto observable de Shift+clic y Alt+clic preservado; **no se aceptan `Pick error` silenciosos**.
- Una sola instancia de `lastData`.
- `validateGeometry` equivalente en función y en texto según el normalizador aprobado.
- `window.__dbg`, `__tessDebugView` y el arnés preservados.
- Equivalencia binaria de los GLB.
- Los 108 controles negativos se conservan y los 22 propuestos se añaden progresivamente.
- `dist-a9` nueva, sin modificar las huellas históricas.
- Sin cambios en geometría, plegado, escena, materiales, artwork ni three.js r132.
- Sin corregir defectos conocidos, sin instalar V3 en Illustrator y sin iniciar F2.

Guía operacional: `docs/fase1/A9_HANDOFF.md`. Evidencia de partida: `docs/fase1/a9/run-all-precheck-3ea0d8a.txt` (batería verde) y `docs/fase1/a9/mapa-dependencias-main-3ea0d8a.json`.
