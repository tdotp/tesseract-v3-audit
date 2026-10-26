# Fase 1 · A7 — Propuesta: separación del estado de aplicación, la escena Three.js y el plegado (para revisión)

Fecha: 2026-10-25 · Base: `2939dbc` (A6 validada en CEP real y revertida) · Autor: Opus, chat nuevo, contexto reconstruido solo desde el repositorio.
Estado: **solo análisis, diagnóstico y propuesta. No se modificó código de producto, pruebas, goldens, fixtures, huellas ni `panel/`.** Únicos archivos nuevos: este documento y la salida de la batería previa (`docs/fase1/a7/`). Sin commit.
Etiquetas: **[MEDIDO]** · **[CONFIRMADO]** · **[INFERENCIA]** · **[NO VERIFICADO]**.

## 0. Resumen

`src/main.js` (1 857 líneas) concentra hoy, en una sola clausura, DOM, estado, visor, malla de paneles, arte, plegado, pliegues visuales, GLB y cableado de eventos. Hay **37 variables de estado** compartidas por nombre entre **71 funciones** de la clausura. A7 propone separar tres capas **sin cambiar el comportamiento** y conservando la corrección de la fuga GPU (A1):

1. **Estado de aplicación**: un objeto plano y sellado `S` (`src/app/state.js`) con los **26 campos de dominio**. `lastData`, la validación y los campos de widgets del DOM se quedan en `main.js` hasta A9. El estado privado de un solo módulo (`labelCache`, `creaseLinesGroup`) va a la clausura de ese módulo.
2. **Escena**: 6 módulos en `src/scene/` (visor, materiales, etiquetas, utilidades, malla de paneles, arte y pliegues visuales).
3. **Plegado**: 2 módulos en `src/fold/` (ángulos de presentación y jerarquía de pivotes `applyFolding`).

Se mueven **35 funciones**. Su texto es **idéntico salvo el prefijo `S.`** en los campos compartidos, y lo comprueba una prueba estática que deshace ese prefijo y compara con `panel/main.js`, con el mismo rigor que T2 en A6. Los orquestadores (`buildFoldUI`, `setBasePanel`, `applyMaterialPreset`, `refreshArtwork`, selección por clic y manejadores), la UI y el GLB **se quedan en `main.js`** (A8/A9).

**Bloqueo que hay que resolver primero:** el arnés inyecta `window.__dbg` con *getters* que leen **por nombre** 19 variables de la clausura. En cuanto el estado salga de la clausura, las pruebas de navegador dejan de funcionar. Propongo una costura de depuración explícita e inerte (`__tessDebugView`) y una inyección única en el arnés, neutra para baseline y `panel/` (§7).

La implementación se hace en 8 pasos reversibles (A7.0a–A7.7). Cada paso se valida con la batería completa, `bundle-eq` y GLB byte a byte. `ResourceTracker` en modo observación queda como paso opcional (D-A7-6). **Decisiones pendientes: D-A7-1…13 (§12).**

## 1. Verificación previa [MEDIDO]

| Comprobación | Resultado |
|---|---|
| Git | `HEAD` = `2939dbc459f24fbf5b51b8d88e6a4a5dcfa2049d` («A6-CEP: validación real…»), árbol **limpio** antes de este análisis, sin remoto |
| Aislamiento (`verify-isolation.sh`, dentro de `run-all.sh`) | baseline = manifiesto; extensión instalada = baseline; `panel/` con las diferencias esperadas; **V3 no instalada** |
| Build | `dist/` reconstruido = `tests/golden/dist-a6.SHA256SUMS` (13 archivos, `main.js` 124 447 B); dry-run del instalador correcto |
| Node | **416 pruebas: 415 en verde + 1 omitida a propósito** (igual que tras A6-CEP) |
| Navegador, Chromium-99, puente, a5-observar, A4-CDP, controles negativos, soak | ver §1.1 |

### 1.1 Resultado de la batería

`tests/run-all.sh --mutations --soak` sobre `2939dbc`, lanzada desacoplada; salida completa en `docs/fase1/a7/run-all-precheck-2939dbc.txt`.
**TODO EN VERDE (`EXIT=0`), idéntico al cierre de A6:**

| Batería | Resultado |
|---|---|
| Node | 416: **415 en verde + 1 omitida a propósito** |
| Navegador `browser` con `--soak` | **56/56** (GPU Δ=0 tras 25 ciclos en `panel/` y bundle; el control positivo del baseline crece) |
| Chromium-99 · puente CEP · `a5-observar` · A4-CDP | 4/4 · 6/6 · 3/3 · 7/7 |
| Controles negativos | **46/46** (Node 22 · navegador 18 · bundle 6) |
| Aislamiento | en verde (baseline = manifiesto, instalada = baseline, V3 no instalada) |

La batería tardó unos 40 min, sin incidencias (Chrome headless vivo durante toda la corrida).

Entorno: macOS 26.6.2, Node v24.12, **Chrome headless 155.0.8059.85** (HANDOFF citaba 152: el navegador se actualizó solo; los resultados de navegador siguen siendo un piso optimista frente al Chromium 99 de CEP).

## 2. Arquitectura vigente tras A6

```
src/main.js            1857 l.  clausura DOMContentLoaded: DOM, estado (37 variables), visor, malla, arte, plegado, pliegues visuales, GLB, UI, cableado
src/core/engine.js       48 l.  GeometryEngine v1 (solo 'legacy')          src/core/legacy/*  8 módulos del motor (texto idéntico)
src/config/look.js · src/host/* · src/bridge/{cep,fs}.js          (A5)
```
`main.js` importa de `core/` solo `createLegacyEngine` y `getPolyCentroid` (excepción temporal D-A6-7, «hasta A7»).

## 3. Mapa de dependencias de `src/main.js` [MEDIDO]

Medido con un análisis estático de las 71 funciones de la clausura (sangría de 4 espacios): lecturas y escrituras de cada variable de estado y llamadas entre funciones. Se revisaron a mano los falsos positivos.

### 3.1 Inventario por responsabilidad

| Grupo | Funciones (línea) | Toca | Destino A7 |
|---|---|---|---|
| Arranque | referencias DOM (17–52), estado (56–77), `setStatus` 79, `log` 80, `clearLog` 84, `geometryEngine` 85 | DOM | `main.js` (`setStatus` **no se toca**: es el anclaje del arnés) |
| Materiales | `getMaterialPreset` 91, `getPanelShellHex` 101, `getEdgeLineHex` 106, `getFoldHingeHex` 110, `getFoldHingeRadius` 114 (muerta), `refreshPanelMaterials` 706 | estado | **`scene/materials.js`** |
| Materiales (UI) | `syncMaterialPresetUI` 95, `syncMaterialInputs` 225, `applyMaterialPreset` 226 (orquestador; **KI-24**) | DOM | `main.js` |
| Etiquetas | `makeLabelCanvas` 133, `roundRect` 146, `getLabelResources` 159, `disposeLabelCache` 171, `makePanelLabelSprite` 179 + `labelCache` | THREE, canvas | **`scene/labels.js`** (`labelCache` privado) |
| Puente y UI general | `ensureCep` 201, `showImport`, `show3D`, `setDebugVisible`, `setActiveTab` 214, `setInteractionMode` 118, `setArtStatus` 248, `resetValidationUI` 253 | DOM, CEP | `main.js` |
| Arte | `hasArtworkLoaded` 87 (muerta), `loadTextureFromPath` 260, `disposeArtOverlays` 279, `applyArtUVs` 289, `addArtworkOverlay` 304, `applyArtworkToScene` 322, `disposeCurrentArtTextures` 336 | THREE, estado | **`scene/artwork.js`** |
| Arte (orquestador) | `refreshArtwork` 345 | CEP, UI, estado | `main.js` |
| Validación y 2D | `validateGeometry` 381 (presentación A6.5), `render2D` 405 | DOM, motor | `main.js` (sin cambios: el cargador de Node la lee por texto) |
| Visor | `resize3D` 457, `updateCameraFromOrbit` 471, `init3D` 479 (120 l.: renderer, luces, rejilla, ejes, capa de órbita/pan/zoom, bucle de render), `fitCamera3D` 737 | THREE, DOM del visor | **`scene/viewport.js`** |
| Malla de paneles | `clearAllMeshes` 600, `build3DFromPanels` 643 | THREE, estado | **`scene/panel-meshes.js`** |
| Utilidades Three | `shapeFromVerts` 634, `disposeObject3D` 781 | THREE (sin estado) | **`scene/three-utils.js`** |
| Selección por clic | `pickPanelFromEvent` 719, `pickCreaseFromEvent` 1068 | raycaster, UI | `main.js` (llaman a orquestadores y a UI) |
| Plegado: ángulos | `signedDisplayAngle` 762, `internalAngleFromDisplay` 767 | `foldSigns` | **`fold/angles.js`** |
| Plegado: jerarquía | `applyFolding` 1090 (95 l.) | THREE, estado | **`fold/folding.js`** |
| Plegado: orquestación y UI | `setBasePanel` 1186, `buildFoldUI` 1201 (183 l., inicializa el estado de plegado y construye el DOM), `selectFoldEdge` 1047, `applySelectedCreaseAngle` 1059, `updatePerCreaseRow` 772, `syncSelectedCreaseUI` 1026, `updateSelectedCreaseVisuals` 1010 (escena + filas DOM) | DOM, motor, estado | `main.js` (A9) |
| Pliegues visuales | `disposeCreaseVisuals` 798, `projectInsetDir` 809, `buildRibbonStripGeometry` 824, `makeBridgeRowsForEdge` 865, `addFoldBridgeVisual` 902, `rebuildCreaseVisuals` 947 | THREE, estado | **`scene/crease-visuals.js`** |
| Exportación | `exportPNG` 1385, `bytesFromDataURL`, `textureToImageBytes`, `padBytes`, `toUint8View`, `typedArrayFromList`, `buildExportSceneMeshes` 1446, `materialKey`, `buildGLBBlobFromCurrentView` 1511 (134 l.), `exportGLB` 1646 | THREE, escena, CEP | `main.js` (**A8**) |
| Cableado | 1666–1855: 15 de los 32 `addEventListener` (los demás: 9 dentro de `init3D`, 7 dentro de `buildFoldUI` y el `DOMContentLoaded`) | todo | `main.js` |

Total: **35 funciones salen** de `main.js` hacia 8 módulos y **36 se quedan**. `main.js` bajaría a unas 1 150 líneas [INFERENCIA, estimación].

### 3.2 Grafo de llamadas entre los grupos que se mueven
```
materials ◄── artwork ◄── panel-meshes ──► labels
    ▲            │             │  └──► crease-visuals ──► angles
    │            ▼             ▼            │  └──► (UI) updateSelectedCreaseVisuals
    │        three-utils ◄─────┴────────────┘
folding ──► labels · materials · crease-visuals
viewport ──► (UI) pickPanelFromEvent / pickCreaseFromEvent ; usa setStatus, log
```
El único ciclo potencial (`applyArtworkToScene → refreshPanelMaterials` y `build3DFromPanels → applyArtworkToScene`) **desaparece** al poner `refreshPanelMaterials` en `materials`. El resultado es un grafo acíclico.

### 3.3 Código muerto y rarezas que se preservan tal cual [MEDIDO]
- `hasArtworkLoaded` y `getFoldHingeRadius` no tienen llamadas. `CREASE_HINGE_SEGMENTS` se importa sin usarse. `creaseLinesGroup` nunca recibe un valor distinto de `null`, aunque `clearAllMeshes` lo limpia. `currentBaseSelect` solo se escribe.
- `mesh.userData.center` (de `getPolyCentroid`) se calcula y **nadie lo lee**. Ninguna prueba lo observa: es una laguna de cobertura (§9.4).
- Con espesor nuevo, `applyArtworkToScene` corre **dos veces** (dentro de `build3DFromPanels` y otra en el manejador).
- **KI-24**: `applyMaterialPreset` con `rebuild` falso o sin modelo llama primero a `refreshPanelMaterials()` y luego lanza `ReferenceError` al evaluar `buildChildrenOfMap()`. Ese orden se conserva (el orquestador se queda en `main.js`).

## 4. Mapa de estado

### 4.1 Las 37 variables: quién escribe, quién lee, adónde van [MEDIDO]

| Variable | Escriben | Leen (además de los escritores) | Dominio | Destino |
|---|---|---|---|---|
| `lastData` | manejador Extraer | continuar, espesor, preset, `validateGeometry` (el `onclick` de cada problema llama a `render2D(lastData,…)`), vista 2D; **ningún módulo que se mueve lo lee** (`build3DFromPanels` lo recibe como parámetro `data` y no lo usa) | extracción | `main.js` (con la validación y la vista 2D, A9) |
| `currentPanelData` | continuar, `buildFoldUI` | `makeBridgeRowsForEdge`, `applyFolding`, `setBasePanel`, preset, espesor | motor | **S** |
| `currentAdjEdges` | `buildFoldUI` | `setBasePanel`, `__dbg` | motor | **S** |
| `currentBasePanelIndex` | continuar, `buildFoldUI`, `setBasePanel` | `build3DFromPanels`, `refreshPanelMaterials`, `applyFolding`, `__dbg` | plegado | **S** |
| `baseSelectionConfirmed` | `setBasePanel` | `applyFolding` (etiquetas) | plegado | **S** |
| `foldTree`, `foldSigns`, `foldAngles`, `foldCenter` | `buildFoldUI`, `setBasePanel`; ángulos también los deslizadores y `applySelectedCreaseAngle` | `applyFolding`, pliegues visuales, ángulos, filas de UI, `__dbg` | plegado | **S** |
| `selectedFoldEdgeIdx` | `selectFoldEdge`, `setBasePanel`, `buildFoldUI` | `updateSelectedCreaseVisuals`, `syncSelectedCreaseUI`, `__dbg` | plegado (selección) | **S** |
| `foldRoot`, `panelGroupMap`, `panelLabelSprites` | `applyFolding`, `clearAllMeshes` | `fitCamera3D`, pliegues visuales, `exportGLB` | escena de plegado | **S** |
| `renderer3d`, `scene3d`, `camera3d`, `raycaster3d`, `pointer3d` | `init3D` | casi todo el 3D, picking, GLB, PNG, `__dbg` | visor | **S** |
| `orbitState` | `fitCamera3D` | `init3D` (manejadores y bucle), `updateCameraFromOrbit`, `__dbg` | visor | **S** |
| `panelMeshes`, `foldData` | `build3DFromPanels`, `clearAllMeshes` | arte, materiales, plegado, encuadre, picking, `refreshArtwork`, `__dbg` | malla | **S** |
| `creasePickables`, `creaseVisuals`, `foldBridgeGroup` | `rebuildCreaseVisuals`, `addFoldBridgeVisual`, `clearAllMeshes` | `pickCreaseFromEvent`, `updateSelectedCreaseVisuals`, `__dbg` | pliegues visuales | **S** |
| `creaseLinesGroup` | nadie le asigna un valor distinto de `null` | solo `clearAllMeshes` (código muerto) | — | **privada de `scene/panel-meshes.js`** (mismo nombre, texto idéntico) |
| `currentThicknessMm` | manejador de espesor | malla, arte, puentes, líneas, cajas de selección, etiquetas, estado | material | **S** |
| `currentMaterialPreset` | `applyMaterialPreset` | `getMaterialPreset`, `__dbg` | material | **S** |
| `currentArtState` | `refreshArtwork` | arte, puentes con textura, `__dbg` | arte | **S** |
| `labelCache` | `getLabelResources`, `disposeLabelCache` | — | etiquetas | **privada de `scene/labels.js`** |
| `problems` | `validateGeometry`, `resetValidationUI` | `render2D` | UI de validación | `main.js` (el cargador de Node la sustituye por un *stub* y `a6-validacion` fija el texto de `validateGeometry`) |
| `interactionMode`, `currentBaseSelect`, `currentCreaseRows`, `currentCreaseSliders`, `selectedCreaseLabelEl`, `selectedCreaseSliderEl`, `selectedCreaseNumberEl` | UI | UI | widgets DOM | `main.js` (A9) |

Recuento: **26 a `S`** + 2 privadas (`labelCache`, `creaseLinesGroup`) + 9 en `main.js` (`lastData`, `problems` y 7 de widgets) = 37. `geometryEngine` y las ~36 referencias DOM se quedan en `main.js`.

### 4.2 Estado compartido por dominio
- **Extracción → motor:** `lastData` (JSON de ExtendScript, sin copiar) → `geometryEngine.buildPanels` → `currentPanelData` → `buildAdjacency` → `currentAdjEdges` → `buildFoldTree` → `foldTree`. Los alias entre entrada y salida (invariante I4 de A6) siguen igual: `S` guarda **las mismas referencias**, sin clonar.
- **Escena:** `renderer3d`/`scene3d`/`camera3d` viven todo lo que vive el panel. `panelMeshes`/`foldData` duran hasta la siguiente reconstrucción. `foldRoot`, los grupos y las etiquetas se rehacen en **cada** `applyFolding`.
- **Plegado:** `foldTree`, `foldSigns`, `foldAngles` y `foldCenter` se reinician **siempre juntos** (en `buildFoldUI` y en `setBasePanel`, con código duplicado). `foldAngles` es el único que cambia por tick.
- **Arte:** `currentArtState.{front,back}.texture` está **compartida** por los overlays de todos los paneles y por los puentes. La libera solo `disposeCurrentArtTextures`.
- **Materiales:** `currentMaterialPreset` y `currentThicknessMm` se leen en el momento de construir. Un cambio exige reconstruir (espesor) o refrescar colores (preset).
- **Exportación:** `buildExportSceneMeshes` recorre `scene3d` tal como está (pose actual). El GLB depende del **orden de los hijos de la escena** (§7.4).

### 4.3 Qué invalida qué (ciclo de vida del estado)
| Evento | Efecto |
|---|---|
| Extraer | `lastData` nuevo; validación y 2D; no toca 3D |
| Continuar a 3D | `init3D` (solo la primera vez) → `buildPanels` → base por defecto si hace falta → `build3DFromPanels` (limpia todo) → `buildFoldUI` (adyacencia, árbol, signos, ángulos a 0, DOM) → `applyFolding` → encuadre → `refreshArtwork` (asíncrono) |
| Espesor | `build3DFromPanels` + `buildFoldUI` (los ángulos vuelven a 0) + encuadre + arte otra vez |
| Preset (con modelo) | igual que espesor, sin el segundo arte; (sin modelo) KI-24 |
| Base (select o Shift+clic) | `setBasePanel` → árbol nuevo, ángulos a 0 → `buildFoldUI` (que **vuelve a calcular** adyacencia y árbol: la doble llamada se ve en el log, T1) → `applyFolding` → encuadre |
| Deslizador, ALL o Reset | `foldAngles` → `applyFolding` (jerarquía, etiquetas, pliegues visuales y materiales rehechos) |
| Refresh Artwork | texturas nuevas → se liberan las anteriores → overlays rehechos |

## 5. Fronteras de módulos propuestas

### 5.1 Patrón
- **Fábricas con estado explícito.** Cada módulo con estado exporta `createX(S, deps)` y devuelve sus funciones. Las funciones se escriben **dentro** de la fábrica con **el mismo texto** que hoy. Solo cambian dos cosas: los campos compartidos llevan el prefijo `S.`, y las dependencias de otros módulos se desestructuran al principio de la fábrica con **el mismo nombre** (`var { refreshPanelMaterials } = deps;`). Así, las llamadas internas no cambian de texto.
- **Estado privado = clausura del módulo, con el mismo nombre** (p. ej. `labelCache`): no cambia ni una letra.
- **Módulos sin estado** (`three-utils`): funciones `export function` de primer nivel, como en `core/legacy/`.
- **`main.js` es la raíz de composición:** crea `S` y las fábricas en orden topológico y desestructura sus funciones con los nombres actuales (`var { build3DFromPanels, clearAllMeshes } = createPanelMeshes(S, {...});`). Las llamadas desde los orquestadores **no cambian de texto**. Las dependencias hacia la UI (`log`, `setStatus`, `pickPanelFromEvent`, `pickCreaseFromEvent`, `updateSelectedCreaseVisuals`) se inyectan. Funcionan porque son declaraciones de función, que la clausura eleva (*hoisting*).
- **Por qué no estado de módulo** (`export let scene3d`): los *bindings* importados no se pueden asignar desde fuera, impide varias instancias en las pruebas y va contra la regla «sin estado de módulo» que se fijó en A6.

### 5.2 Módulos al cierre de A7
```
src/
  app/state.js            createAppState(): objeto plano SELLADO (Object.seal) con los 26 campos y los MISMOS valores iniciales; sin THREE ni DOM   importa: config/look (DEFAULT_THICKNESS_MM)
  scene/three-utils.js    shapeFromVerts, disposeObject3D (export function; sin estado)
  scene/materials.js      createMaterials(S): getMaterialPreset, getPanelShellHex, getEdgeLineHex, getFoldHingeHex, getFoldHingeRadius, refreshPanelMaterials     config/look
  scene/labels.js         createLabels(): makeLabelCanvas, roundRect, getLabelResources, disposeLabelCache, makePanelLabelSprite (+ labelCache privado)
  scene/viewport.js       createViewport(S, {canvas3d, viewport3d, log, setStatus, pickPanelFromEvent, pickCreaseFromEvent}): resize3D, updateCameraFromOrbit, init3D, fitCamera3D
  scene/artwork.js        createArtwork(S, {refreshPanelMaterials}): hasArtworkLoaded, loadTextureFromPath, disposeArtOverlays, applyArtUVs, addArtworkOverlay, applyArtworkToScene, disposeCurrentArtTextures   bridge/cep (pathToFileURL), config/look, three-utils
  scene/crease-visuals.js createCreaseVisuals(S, {getFoldHingeHex, signedDisplayAngle, updateSelectedCreaseVisuals}): disposeCreaseVisuals, projectInsetDir, buildRibbonStripGeometry, makeBridgeRowsForEdge, addFoldBridgeVisual, rebuildCreaseVisuals   config/look, three-utils
  scene/panel-meshes.js   createPanelMeshes(S, {log, getPanelShellHex, getEdgeLineHex, applyArtworkToScene, disposeLabelCache, disposeCreaseVisuals}): clearAllMeshes, build3DFromPanels (+ creaseLinesGroup privado)   three-utils, core/legacy/geom2d (getPolyCentroid)
  fold/angles.js          createFoldAngles(S): signedDisplayAngle, internalAngleFromDisplay
  fold/folding.js         createFolding(S, {makePanelLabelSprite, refreshPanelMaterials, rebuildCreaseVisuals}): applyFolding
  main.js                 DOM, UI, orquestadores, picking, validación/2D, GLB y PNG (A8), cableado, raíz de composición, __tessDebugView (§7)
```
Orden de composición: `state → materials → labels → angles → viewport → artwork → crease-visuals → panel-meshes → folding`.

### 5.3 Reglas de límites (prueba nueva `a7-limites`, mismo estilo que `a6-limites`)
1. Inventario exacto de `app/`, `scene/` y `fold/` en cada paso.
2. `app/` no usa THREE, `window` ni `document`; `state.js` no exporta más que `createAppState`.
3. `scene/` y `fold/` no importan `main.js`, `host/` ni `bridge/fs`. Solo `scene/artwork.js` importa `bridge/cep` (`pathToFileURL`). Ningún módulo importa una fábrica de otro: el cableado lo hace únicamente `main.js`.
4. `scene/` puede importar de `core/` **solo** `getPolyCentroid` de `core/legacy/geom2d.js` (cierra D-A6-7). `main.js` deja de importarlo.
5. `document` en `scene/` solo dentro de `makeLabelCanvas` (canvas de la etiqueta) y de `init3D` (capa de órbita). `window` solo en `init3D` (`devicePixelRatio`, `resize`, comprobación de THREE). Ningún módulo lee `window` ni `document` al cargarse.
6. Sin estado de módulo: ningún `var`/`let` de primer nivel en `app/`, `scene/` ni `fold/`.
7. Sin ciclos de importación.
8. **Sin referencias sueltas a campos de `S`:** ningún identificador de la lista de 26 aparece sin `S.` delante en `scene/`, `fold/` ni `main.js`, salvo como clave de objeto o tras un punto. Esta regla detecta un campo olvidado, que si no daría un `ReferenceError` diferido.
9. `core/`, `config/`, `host/` y `bridge/` siguen igual (`a5-limites` y `a6-limites`, adaptados según D-A7-7).

### 5.4 Qué NO hace A7
No toca geometría, tolerancias, motor ni contrato `GeometryEngine`. No cambia materiales, luces, el bucle de render (KI-11), la UI o su texto, ni los resultados del GLB. No sube three r132, no integra el motor web, no corrige KI-06, KI-22, KI-24, KI-25, KI-26 ni otros, y no retira código muerto (D-A7-8). No instala nada.

## 6. Ciclo de vida de objetos Three.js y fuga GPU

### 6.1 Inventario de recursos con memoria de GPU [MEDIDO por lectura; la ausencia de crecimiento está MEDIDA por los contadores WebGL de `leak_cycles.js`]
| Recurso | Lo crea | Frecuencia | Lo libera (A1 incluido) |
|---|---|---|---|
| `ExtrudeGeometry` + `MeshPhongMaterial` del panel | `build3DFromPanels` | cada reconstrucción | `clearAllMeshes` → `disposeObject3D(m)` |
| `EdgesGeometry` + `LineBasicMaterial` (hijo del panel) | `build3DFromPanels` | cada reconstrucción | `disposeObject3D` recursivo (**A1**) |
| Overlay de arte `ShapeGeometry` + `MeshBasicMaterial` (hijo) | `addArtworkOverlay` | cada `applyArtworkToScene` | `disposeArtOverlays` o `disposeObject3D` recursivo (**A1**) |
| Texturas de arte | `loadTextureFromPath` | cada Refresh Artwork | `disposeCurrentArtTextures` (al reemplazarlas o si no hay arte). **No** las libera `clearAllMeshes`: son compartidas (comentario A1) |
| `CanvasTexture` + `SpriteMaterial` de etiqueta | `getLabelResources` (caché por texto y base) | una vez por clave | `disposeLabelCache` en `clearAllMeshes` (**A1**) |
| Línea visible de pliegue (`BufferGeometry` + `LineBasicMaterial`) | `rebuildCreaseVisuals` | **cada tick** × pliegue | `disposeCreaseVisuals` al principio de `rebuildCreaseVisuals` y en `clearAllMeshes` (**A1**) |
| Caja de selección (`BoxGeometry` + `MeshBasicMaterial`) | `rebuildCreaseVisuals` | cada tick × pliegue | ídem (**A1**) |
| Puente de pliegue (cinta `BufferGeometry` + Phong/Basic) | `addFoldBridgeVisual` | cada tick × pliegue con \|ángulo\| ≥ umbral | `disposeObject3D(foldBridgeGroup)` en `rebuildCreaseVisuals` y `clearAllMeshes` |
| `GridHelper`, `AxesHelper`, programas de shader, contexto WebGL | `init3D` y three | una vez por panel | nunca (viven lo que vive el panel) |
| Grupos (`foldRoot`, pivotes), luces, `Sprite` | `applyFolding` e `init3D` | cada tick | sin memoria de GPU propia; se desenganchan y el GC los recoge |
| Clones de geometría del GLB | `buildExportSceneMeshes` | cada exportación | no se liberan, pero **nunca se suben a la GPU** (no se renderizan) [INFERENCIA] |

### 6.2 Cómo se preserva la corrección A1
- Las 4 funciones de liberación de A1 (`disposeObject3D` recursivo, `disposeCreaseVisuals`, `disposeLabelCache` y la caché de etiquetas) se mueven **con texto idéntico** y se las llama **en el mismo orden y desde los mismos puntos**. Ninguna liberación pasa a otro momento.
- **Invariante L1:** las texturas de arte no las libera nadie salvo `disposeCurrentArtTextures`. Una liberación «más completa» hecha por un `ResourceTracker` rompería el arte de los puentes y de los overlays que siguen vivos.
- **Invariante L2:** `disposeCreaseVisuals` corre **antes** de crear los nuevos objetos en cada `rebuildCreaseVisuals`.
- **Invariante L3:** `clearAllMeshes` vacía las listas (`creasePickables`, `creaseVisuals`, `panelGroupMap`, `panelLabelSprites`) **después** de liberar.
- Pruebas que lo vigilan: GPU Δ=0 (caja e ill, con y sin arte; 25 ciclos con `--soak`); control positivo «baseline: CRECEN»; mutación «se revierte el parche A1»; mutación «la caché de etiquetas deja de reutilizar». A7.0a añade además el inventario de escena por rol (§9.1).

### 6.3 Observaciones (no son regresiones; **no se corrigen en A7**)
- **O1 (rendimiento):** cada tick de deslizador crea y libera N líneas, N cajas y hasta 2N cintas. El balance es Δ=0, pero hay movimiento de memoria. Objetivo para F3 (render bajo demanda), no para A7.
- **O2:** `applyFolding` desengancha el `foldRoot` anterior sin liberarlo. No hay fuga de GPU (solo grupos) [INFERENCIA, coherente con Δ=0 MEDIDO].
- **O3 (candidato a KI-27, baja):** si en `refreshArtwork` la textura frontal carga y la trasera falla, la frontal ya cargada no se libera. No llega a subirse a la GPU (nunca se asigna a un material) ⇒ solo memoria JS [INFERENCIA, NO VERIFICADO]. Propuesta: registrarlo sin corregirlo (D-A7-9).
- **O4:** entre `disposeCurrentArtTextures()` y `applyArtworkToScene()` los overlays apuntan un instante a texturas ya liberadas. Es síncrono, sin render en medio: inocuo [INFERENCIA].

### 6.4 `ResourceTracker` (D2-B del plan maestro): opciones
| Opción | Qué hace | Riesgo |
|---|---|---|
| **A** | En A7, solo el inventario de ciclo de vida y las pruebas de §9.1; el tracker queda para F3 | Mínimo. La propiedad de los recursos se queda documentada, pero no en el código |
| **B (recomendada)** | Paso opcional A7.6: tracker en **modo observación**. Las fábricas registran cada geometría, material y textura creada con un rol, y las funciones de liberación existentes lo dan de baja. **La liberación no cambia.** Prueba: recuento vivo estable tras el calentamiento e igual al inventario esperado | Añade líneas en rutas calientes (coste despreciable; se mide). Cambia el texto de unas 12 funciones: la equivalencia se comprueba con el normalizador ampliado + GPU Δ=0 |
| C | Tracker **dueño** de la liberación | **No recomendada en A7:** cambia cuándo y qué se libera (riesgo L1 y L2); corresponde a F3, cuando de todos modos cambian el render y los materiales |

## 7. `window.__dbg`, arnés de navegador y exportación GLB

### 7.1 Cómo depende hoy el arnés de la clausura [MEDIDO]
`tools/baseline/setup_harness.py` copia cada objetivo (baseline, `panel/` y bundle) y aplica dos parches a su `main.js`:
- **Parche 1:** antes de `function setStatus(m){ statusArea.textContent = m; }` inserta `window.__dbg = { … }` con **20 propiedades**. Son *getters* sobre 19 nombres de la clausura (`renderer3d`, `scene3d`, `camera3d`, `orbitState`, `foldTree`, `panelMeshes`, `foldData`, `currentArtState`, `currentPanelData`, `currentThicknessMm`, `currentMaterialPreset`, `currentBasePanelIndex`, `foldAngles`, `foldBridgeGroup`, `selectedFoldEdgeIdx`, `creaseVisuals`, `currentAdjEdges`) y dos funciones (`upd` → `updateCameraFromOrbit()`, `fold(i,a)` → `foldAngles[i]=a; applyFolding();`).
- **Parche 2:** `pathToFileURL` acepta `blob:` y `http:` (arte simulado). Desde A5 vive en `bridge/cep.js` y **A7 no lo toca**.
- Uso [MEDIDO]: `browser.test.mjs` (`scene`, `renderer`, `camera`, `orbit`, `baseIndex`, `thickness`, `tree`, `selectedEdge`, `panelData`, `foldData`, `creaseVisuals`, `art`, `adj`), `harness.mjs` (`scene`), `bridge.test.mjs` (`panels`) y `compare_frames.js` (`scene`, `renderer`, `panels`, `nFold`). **Las herramientas del CEP real (`tools/a4/*`) no usan `__dbg`** (usan DOM, lienzo y CDP): la validación real no depende de esta costura.
- **Por qué A7 lo rompe:** los *getters* se evalúan tarde. Si `foldTree` deja de existir en la clausura, el primer acceso lanza `ReferenceError` y caen todas las pruebas de navegador del bundle. Además, esbuild puede renombrar identificadores que chocan (ya pasó con `log` → `log2`).

### 7.2 Costura propuesta (D-A7-4, recomendada: B)
- **Producto:** `main.js` define `function __tessDebugView(){ return { …mismas 20 propiedades… }; }`, que es **el texto exacto del DBG del arnés con el prefijo `S.`**. **No se llama ni se publica en `window`:** es código inerte en producción. La función de módulo `applyFolding` y `updateCameraFromOrbit` le llegan por la desestructuración de §5.1, con el mismo nombre.
- **Arnés (una línea, igual para todos los objetivos):** `window.__dbg = (typeof __tessDebugView === 'function') ? __tessDebugView() : { …DBG actual sin cambios… };`. En baseline, `panel/` y bundles anteriores a A7, `__tessDebugView` no existe ⇒ se usa el objeto de siempre. En A7 se usa la costura. Anclaje y punto de inserción: los mismos.
- **Pruebas de la costura:** (1) Node: el cuerpo de `__tessDebugView`, quitando `S.`, es igual al DBG de `setup_harness.py`; (2) build: el bundle contiene `function __tessDebugView(` sin renombrar; (3) con el arnés nuevo, baseline, `panel/` y el bundle A6 dan resultados **idénticos** a los de la batería previa (neutralidad); (4) mutación: un *getter* de la costura que devuelve otro campo debe detectarse.
- Alternativa A: un DBG distinto por objetivo, solo en el arnés. Acopla las pruebas a nombres internos de `main.js` (`S`, `folding`) y hay que tocarlo en A8 y A9; no añade código al producto.

### 7.3 Otras dependencias del arnés
- El anclaje `function setStatus(m){ statusArea.textContent = m; }` debe seguir **en la clausura de `main.js` con ese texto** (restricción C1).
- `leak_cycles.js`, `measure_ui.js` y `harness_art.js` solo usan la UI pública y los contadores WebGL: no les afecta.
- El cargador de Node (`tests/lib/legacy.mjs`) lee de `src/` solo `validateGeometry`, el motor y los scripts de `host/`, y **ninguna** función de escena. `loadGeometry` incluye la `validateGeometry` de `main.js` con *stubs* de `problems`, `problemsList`, `validationStatus`, `continueBtn` y `lastData`, y `a6-validacion` fija su texto exacto. `validateGeometry` nombra `lastData` dentro del `onclick` de cada problema (`render2D(lastData,p.id)`). Por eso **`lastData` y `problems` se quedan en `main.js`**: ni el cargador ni esa función cambian. Un alias de `S.lastData` no serviría, porque `lastData` se reasigna en cada extracción y el alias quedaría desfasado.

### 7.4 GLB: lo que A7 debe conservar byte a byte
- `buildExportSceneMeshes` recorre `scene3d.traverse`, así que **el orden de los nodos y materiales del GLB es el orden de inserción en la escena**. Hoy, tras cualquier `applyFolding`, ese orden es: luces → rejilla → ejes → `foldRoot` (base, hijos en profundidad según el orden de `foldTree`, grupos sin enganchar por índice) → `fold-bridges`. **Invariante G1:** ningún paso de A7 puede reordenar `scene3d.add`, `group.add` ni las llamadas que los producen.
- **G2:** los filtros de exportación (`pickCrease`, `panelLabel`, opacidad < 0.01) dependen de `userData.role` y del material. Se mueven con texto idéntico.
- **G3:** `materialKey` usa el `uuid` de la textura solo para deduplicar (no se escribe). Los nombres salen de `obj.name || userData.role || 'mesh_'+n`.
- El código GLB **se queda en `main.js`** (A8). En A7.1 solo cambia mecánicamente `scene3d` → `S.scene3d` y `foldRoot` → `S.foldRoot` en `buildExportSceneMeshes` y `exportGLB`. Referencias: `737bcd23…` (plano, 33 436 B), `87aa2e4c…` (todas a 60°, 54 224 B) y `b4973a54…` (arte, en real), además de `glb.golden.json`.

## 8. Estrategia incremental (un commit por paso, cada uno reversible con `git revert`)

Al cerrar cada paso se exige: `run-all.sh --mutations` en verde; `bundle-eq` contra el paso anterior con solo las diferencias previstas; la normalización de texto (§9.2) en verde; GLB byte a byte; y la salida guardada en `docs/fase1/a7/run-all-A7.N.txt`.

| Paso | Contenido | Toca `src/` | Equivalencia específica |
|---|---|---|---|
| **A7.0a** Caracterización | Sin tocar `src/`. (1) **Inventario de escena** por rol y tipo tras 6 flujos (construir, base, espesor, preset, plegado, arte): objetos, geometrías, materiales y texturas distintas, hijos de `scene3d` **en orden**, tamaño de la caché de etiquetas y `userData` de los paneles (`panelIndex`, `center`, hash de `originalVertices`). Golden **generado solo desde el baseline**. (2) Contratos de ciclo de vida L1–L3 (pruebas de navegador). (3) Secuencia de `setStatus` por flujo. (4) Métricas de rendimiento del bundle A6 (informativas, §9.3). (5) Sondas de laguna (`userData.center`, código muerto) | No | Baseline = `panel/` = bundle A6 en todo lo nuevo |
| **A7.0b** Andamiaje | Arnés con DBG uniforme (§7.2); nueva huella vigente `dist-a7` (`dist-a6` congelada, con una prueba que la reconstruye desde el `src/` de `2939dbc`); extractor de funciones a cualquier sangría; normalizador `a7-texto-identico` (lista vacía); `a7-limites` (inventarios vacíos) | No | Batería previa idéntica con el arnés nuevo (neutralidad) |
| **A7.1** Estado | `app/state.js` (`createAppState`, sellado); en `main.js` los 26 campos pasan a `S.` (cambio mecánico, **sin mover funciones**); `__tessDebugView`. Se reescribe 1 patrón de mutación (`foldTree = geometryEngine.buildFoldTree(…)`) con el mismo efecto | Sí | Normalizador sobre **todas** las funciones de `main.js` + líneas sueltas con un multiconjunto de diferencias previsto; GLB, píxeles, log, GPU |
| **A7.2** Utilidades | `scene/three-utils.js`, `scene/labels.js`, `scene/materials.js`, `fold/angles.js` | Sí | Texto idéntico (módulo `S.`); mutaciones de etiquetas, color del preset y caché siguen aplicando |
| **A7.3** Visor | `scene/viewport.js` (`init3D` con capa de entrada y bucle **idénticos**) | Sí | Interacciones (órbita, pan, zoom, Shift/Alt+clic, Esc) = baseline; mutaciones de zoom y Shift+clic aplican |
| **A7.4** Malla y arte | `scene/panel-meshes.js`, `scene/artwork.js`; `getPolyCentroid` sale de `main.js` | Sí | Arte (UV, desplazamientos), materiales, inventario de escena, GPU con arte |
| **A7.5** Plegado | `scene/crease-visuals.js`, `fold/folding.js` | Sí | Árboles, poses, píxeles plano/60°/Reset, GLB, log, soak 25 ciclos |
| **A7.6** (opcional, D-A7-6) | `ResourceTracker` en modo observación | Sí | Liberación sin cambios; recuento vivo estable; GPU Δ=0 |
| **A7.7** Cierre | Informe PC8, procedimiento de validación en CEP **preparado, no ejecutado**, `KNOWN_ISSUES`, `tests/README`, `HANDOFF` | No | Batería `--mutations --soak` completa |

Vuelta atrás: cada paso es un commit propio sobre una base verde. Revertir el último deja la batería en verde, porque las pruebas nuevas de cada paso van en el mismo commit que el cambio que comprueban.

## 9. Pruebas

### 9.1 Regresión (se conserva todo lo actual + lo nuevo)
- **Lo actual, en los tres objetivos:** goldens de geometría y de logs, GLB byte a byte (dos poses y arte), píxeles, escena, materiales, arte, interacciones, log de depuración en 5 flujos, puente CEP (30 casos), Chromium-99 con APIs reducidas, A4-CDP y evidencia real de A4, A5 y A6.
- **Nuevo en A7.0a:** inventario de escena (golden desde el baseline); contratos L1–L3 (p. ej. «tras cambiar el espesor, la textura de arte sigue viva y con el mismo `uuid`»; «tras `applyFolding` no queda ninguna caja de selección del tick anterior en la escena»); secuencia de `setStatus`; `userData` de los paneles.
- **Equivalencia de `__dbg`:** las mismas 20 claves; los valores ya los comparan las pruebas «baseline = panel = bundle».

### 9.2 Equivalencia de texto (`a7-texto-identico`, T2 de A7)
Para cada función de `panel/main.js`: aparece **exactamente una vez** en `src/`, y `norm(src) == norm(panel)`, donde `norm` normaliza la sangría y quita `S.` delante de los 26 nombres (solo cuando `S` no va precedido de `\w`, `.` o `$`). Excepciones con diferencia esperada **escrita en la prueba** (como `a6-validacion`): **ninguna prevista**. `validateGeometry` no cambia de texto porque `lastData` y `problems` se quedan en `main.js`. Las líneas sueltas de `main.js` se comparan como multiconjunto, con las líneas añadidas y quitadas previstas: declaraciones que salen y raíz de composición. Las funciones nuevas permitidas son `createAppState`, las 8 fábricas y `__tessDebugView`.

### 9.3 Soak y rendimiento
- **Soak:** 25 ciclos (caja e ill, con y sin arte) con Δ=0 en texturas, buffers, VAO y programas, en el bundle de **cada** paso. En A7.7, una corrida informativa de 100 ciclos con el *heap* de JS registrado.
- **Rendimiento** (D-A7-13): mediana de ms por tick de `applyFolding` (deslizador), tiempo de construcción, tiempo de exportación GLB y FPS en reposo. Bundle A7 frente a bundle A6 en la misma sesión, intercalados, ≥5 corridas. **Alerta** si > +10 %; **bloqueo** si > +25 % (que los campos sean propiedades de un objeto sellado en vez de variables debería costar menos que el ruido [INFERENCIA]). Los resultados de navegador son un piso optimista (Chrome 155 / M1 Max), no CEP.

### 9.4 Controles negativos nuevos (cada uno debe hacer fallar al menos una prueba de comportamiento; regla vigente: «exactamente una línea»)
| # | Mutación | La debe detectar |
|---|---|---|
| 1 | `fold/folding.js` captura `S.foldAngles` al crear la fábrica (copia obsoleta) | Interacciones / regresión de poses |
| 2 | `scene/artwork.js` captura `S.currentThicknessMm` al crear la fábrica | Arte (desplazamiento tras cambiar el espesor) |
| 3 | `clearAllMeshes` deja de llamar a `disposeCreaseVisuals` | GPU |
| 4 | `disposeObject3D` deja de recorrer los hijos | GPU (control positivo del recorrido de A1) |
| 5 | `rebuildCreaseVisuals` añade `foldBridgeGroup` antes de liberar lo anterior / reordena `scene3d.add` | GLB byte a byte / inventario ordenado |
| 6 | Un *getter* de `__tessDebugView` devuelve otro campo | Pruebas de navegador del bundle |
| 7 | Una referencia suelta a un campo de `S` en un módulo | `a7-limites` (regla 8) |
| 8 | `scene/viewport.js` toca `document` fuera de `init3D` | `a7-limites` |
| 9 | `createAppState` con espesor inicial 0.30 | Escena/materiales (espesor) |
| 10 | `disposeCurrentArtTextures` llamado desde `clearAllMeshes` (rompe L1) | Contrato L1 / arte con espesor |
| 11 | `getPolyCentroid` → `polygonCentroid` en `build3DFromPanels` | Inventario de escena (`userData.center`, nuevo en A7.0a). **Hoy no lo detecta nada** |
Los 46 controles actuales se mantienen. Se reescribe 1 patrón (A6 · log, `setBasePanel`) con el mismo efecto. Los demás no mencionan campos de `S` o pertenecen a estado privado (`labelCache`), así que aplican sin cambios [MEDIDO con `grep` sobre los 46 patrones].

### 9.5 Puerta G-A7 (criterio de equivalencia de cierre)
E1 Node en verde (goldens sin cambios) · E2 `a7-texto-identico` y `a7-limites` · E3 navegador: baseline = `panel/` = bundle A7 en píxeles, escena, inventario, log, interacciones, materiales, arte y GLB byte a byte · E4 `bundle-eq` A6→A7 solo con lo previsto · E5 soak Δ=0 y rendimiento dentro del umbral · E6 Chromium-99 con APIs reducidas · E7 (aparte, con autorización) CEP real: `a6-comparar-paridad` contra la evidencia real de A6 → idéntica, GLB `737bcd23…`/`87aa2e4c…`/`b4973a54…`.

## 10. Riesgos
| Riesgo | Prob. | Impacto | Mitigación |
|---|---|---|---|
| Campo de `S` olvidado ⇒ `ReferenceError` en una rama poco usada | Media | Alto | Regla 8 estática + `Object.seal` (una asignación errónea lanza `TypeError` en modo estricto) |
| Captura temprana de un valor (copia en vez de lectura viva) | Media | Alto | Texto idéntico (solo `S.x` en el punto de uso) + mutaciones 1 y 2 |
| Reorden de inserciones en la escena ⇒ GLB distinto | Baja | Alto | Invariante G1, GLB byte a byte en cada paso, inventario ordenado, mutación 5 |
| Una liberación que cambia de momento ⇒ fuga o arte roto | Baja | Alto | Funciones A1 con texto idéntico, L1–L3, GPU Δ=0 en cada paso, mutaciones 3, 4 y 10 |
| Desestructuración en `main.js`: una función usada antes de crear su fábrica (las declaraciones se elevaban y las variables no) | Baja | Medio | Fábricas creadas justo después de `log` y `geometryEngine`, antes de cualquier llamada [MEDIDO: entre las líneas 14 y 85 no se llama a ninguna función que se mueve]; los manejadores se registran al final |
| Renombres de esbuild | Baja | Bajo | Nombres de fábrica únicos; las funciones movidas quedan dentro de clausuras (sin choques de primer nivel); comprobación de `__tessDebugView` en el bundle |
| El arnés nuevo deja de ser neutral | Baja | Alto | A7.0b solo cambia el arnés y debe reproducir la batería previa idéntica |
| Rendimiento en CEP (Chromium 99) distinto del de Chrome 155 | Baja | Medio | Umbral §9.3; validación real (E7) |
| Tamaño de los pasos A7.4/A7.5 | Media | Medio | Se pueden partir (arte aparte; puentes aparte) sin cambiar el plan |
| Tiempo de batería (~30 min con mutaciones) y cierres de la app | Media | Bajo | `nohup`, registro en `.scratch/`, vigilar `pgrep -f remote-debugging-port` |

## 11. Condiciones de aceptación (PC8)
G-A7 (E1–E6) cumplida · 46 controles + los nuevos, todos detectados · `dist-a7` vigente y `dist-a6`/`dist-a5`/`dist` congeladas y reproducibles · goldens y fixtures intactos (solo se añaden los de A7.0a, generados desde el baseline) · aislamiento en verde · ningún defecto conocido cambia · informe con lo NO verificado (CEP real, Windows, troqueles fuera del corpus).

## 12. Decisiones que requieren tu autorización

| # | Decisión | Recomendación | Alternativas y riesgo |
|---|---|---|---|
| **D-A7-1** | Alcance: estado + escena + mecanismo de plegado; los orquestadores (`buildFoldUI`, `setBasePanel`, `applyMaterialPreset`, `refreshArtwork`, picking y manejadores), la UI y el GLB se quedan en `main.js` | **Aprobar** | Extraer ya un controlador de plegado (`initFoldState` sacado de `buildFoldUI`/`setBasePanel`): cambia el texto de dos orquestadores y mezcla A7 con A9 |
| **D-A7-2** | Modelo de estado: objeto **plano y sellado** `S` con los **26 campos de dominio** (§4.1); `lastData`, `problems` y los widgets DOM en `main.js`; `labelCache` y `creaseLinesGroup` privados de su módulo | **Aprobar: plano, sellado, 26 campos** | (a) mínimo, solo lo que cruza módulos (24 campos, sin `currentAdjEdges` ni `selectedFoldEdgeIdx`): algo menos de texto cambiado, pero el estado de plegado queda partido · (c) anidado por dominio (`S.scene.renderer3d`): más legible, pero cambia más texto y complica la normalización · meter también `lastData`: cambia el texto de `validateGeometry`, rompe `a6-validacion` y obliga a tocar el cargador |
| **D-A7-3** | Patrón: fábricas `createX(S, deps)` + desestructuración con los mismos nombres en `main.js` (texto de las funciones idéntico salvo `S.`) | **Aprobar** | Estado de módulo (`export let`): rechazado (asignación imposible, una sola instancia) · Clases: cambian todo el texto (`this.`) |
| **D-A7-4** | Costura `__tessDebugView` inerte en el producto + inyección uniforme en el arnés | **B (costura)** | A: DBG por objetivo solo en el arnés (sin código en el producto, más acoplamiento y cambios en A8/A9) |
| **D-A7-5** | `getPolyCentroid`: la escena lo importa de `core/legacy/geom2d.js` (lista blanca) y `main.js` deja de importarlo (cierra D-A6-7) | **Aprobar** | Exponerlo en `GeometryEngine` (cambia el contrato v1) · duplicarlo (puede divergir) |
| **D-A7-6** | `ResourceTracker` | **B: paso opcional A7.6 en modo observación**, sin cambiar la liberación | A: solo inventario y contratos ahora, tracker en F3 · C: tracker dueño de la liberación (no en A7) |
| **D-A7-7** | Adaptar herramientas de prueba (no de producto): `setup_harness.py` (1 línea), `a5-limites` (THREE permitido en `scene/` y `fold/`; inventario), `a6-limites` (`MAIN_CORE_IMPORTS` sin `getPolyCentroid`), `DIST_PIN` → `dist-a7` con `dist-a6` congelada y reconstruible, 1 patrón de mutación reescrito, extractor a cualquier sangría | **Aprobar** (lo mínimo; mismo criterio que D-A6-5: no se reduce la detección) | Sin adaptarlas, A7 no puede pasar la batería |
| **D-A7-8** | Código muerto (§3.3) | **Preservarlo** tal cual en A7; retirarlo en A9 | Retirarlo ya: cambia el bundle (no el comportamiento) y añade diferencias a `bundle-eq` |
| **D-A7-9** | Observación O3 (`refreshArtwork` con fallo parcial) | **Registrarla como KI-27** (baja), sin corregir | No registrarla |
| **D-A7-10** | Validación en CEP real tras A7 | **Preparar el procedimiento en A7.7** (paridad, GLB, GPU Δ en real); ejecutarlo solo con **autorización fechada y separada** | No validar en real hasta A8 (acumula dos pasos de riesgo alto) |
| **D-A7-11** | Commit de esta propuesta | Tras tu aprobación, con las decisiones anotadas (como `09dc069` en A6) | Mantenerla sin commit |
| **D-A7-12** | Quién implementa | Opus, en este chat si se aprueba pronto o en uno nuevo con `HANDOFF.md`, según tu política | — |
| **D-A7-13** | Umbral de rendimiento | **Alerta > +10 %, bloqueo > +25 %** frente al bundle A6, en la misma sesión | Solo informativo (como hasta ahora) |

**Fuera de A7 y sin cambios:** KI-22 y los demás defectos (F2/2A), motor web (2B), GLB y unidades (A8/F5), UI (A9/F7), three r132, instalación en CEP. **No se inician A8, A9 ni F2.**

## 13. Límites de este análisis
- El mapa de §3–§4 sale de un análisis estático (expresiones regulares sobre las funciones de la clausura) con revisión manual. Los manejadores anónimos y las funciones anidadas se revisaron leyendo el código. No se instrumentó la ejecución.
- La estimación de tamaño de `main.js` y el impacto en rendimiento son [INFERENCIA]. Se medirán en A7.0a.
- O3 y la ausencia de fuga de GPU en los clones del GLB son [INFERENCIA], no [MEDIDO].
- Nada de esta propuesta se probó en Illustrator ni en CEP real.

## 12 bis. Decisiones del usuario (2026-10-25)

El usuario aprobó la dirección técnica y autorizó A7.0a–A7.7 en modo autónomo y secuencial, sin aprobaciones intermedias, con estos ajustes a §12:

| # | Decisión tomada |
|---|---|
| D-A7-1 | Aprobada (orquestadores, UI y GLB en `main.js`) |
| D-A7-2 | Aprobada: `S` plano y sellado con 26 campos; en `main.js` se quedan las 9 variables previstas, incluidas `lastData` y `problems` |
| D-A7-3 | Aprobada (fábricas `createX(S, deps)`) |
| D-A7-4 | **B**, con una restricción: `__tessDebugView` es **solo de observación para pruebas**, no se usa en producción y **no ofrece API de escritura**. Por eso expone únicamente los **18 *getters*** del DBG heredado: **sin `upd` ni `fold`**, que no usa ninguna prueba ni herramienta [MEDIDO con `grep` en `tests/` y `tools/`]. El arnés conserva el objeto heredado de 20 claves para baseline, `panel/` y bundles anteriores |
| D-A7-5 | Aprobada |
| D-A7-6 | **A: NO se implementa el `ResourceTracker`** (no hay A7.6). Se añaden solo el inventario y los invariantes de ciclo de vida |
| D-A7-7 | Aprobada (herramientas mínimas; se conservan los 46 controles y se añaden los 11 nuevos si detectan regresiones reales) |
| D-A7-8 | Aprobada: no se toca el código muerto ni las propiedades sin uso |
| D-A7-9 | KI-27 se registra **como hallazgo pendiente de confirmación**, sin corregirlo |
| D-A7-10 | Se prepara el procedimiento de validación corta en CEP real **sin ejecutarlo**; no se instala ni se carga nada en Illustrator |
| D-A7-11 | La propuesta y la evidencia inicial se versionan **antes** de tocar el producto |
| D-A7-12 | Opus, en este chat |
| D-A7-13 | Si la degradación supera el 10 % se investiga; si supera el 25 % se detiene la intervención |
Además: batería completa `--mutations --soak` tras cada intervención relevante; no se avanza con fallos ni con mutaciones no detectadas; GLB byte a byte frente a las referencias aprobadas; huella nueva `dist-a7` conservando las anteriores. Fuera de alcance: instalar o cargar en Illustrator, push, publicar, corregir KI-06, KI-22, KI-27 u otros, three.js, materiales, UI, y A8, A9 y F2.
