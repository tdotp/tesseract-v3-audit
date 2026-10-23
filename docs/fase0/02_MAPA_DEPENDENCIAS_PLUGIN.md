# 02 — Mapa de dependencias e inventario del plugin actual

Objeto: `tesseract-instalado-copia` = `/Library/Application Support/Adobe/CEP/extensions/tesseract` (idénticos salvo `.DS_Store`, verificado).
Versión: bundle `com.tato.tesseract` 0.1.0, "Phase 7B" (archivos del 15–16 mar 2026).

## 1. Inventario de archivos

| Archivo | Tamaño / líneas | Rol | Observación |
|---|---|---|---|
| `CSXS/manifest.xml` | 55 líneas | Manifiesto CEP 12.0; host `ILST` [0–99.9]; panel redimensionable 480×640 (mín. 400×560) | Sin `<ScriptPath>`, sin `CEFCommandLine` (no `--enable-nodejs`, no `--allow-file-access-from-files`) |
| `index.html` | 174 líneas, 43 elementos con `id` | Vistas Import y 3D, tabs Material/Artwork/Creases/Debug | `main.js` aborta si falta alguno de 20 `id` (L174–179) |
| `main.js` | **2656 líneas, 117 KB** | Todo el comportamiento, dentro de `DOMContentLoaded` (una sola clausura) | Ver §3 |
| `main.js.bak` | 2582 líneas | Respaldo previo a "Phase 7B" (diferencia 160 líneas: presets de material, tabs) | Código muerto dentro de la extensión instalada |
| `style.css` | 97 líneas | Tema oscuro | |
| `libs/three.min.js` | 613 KB, **r132** (2021), MIT | Renderer | Global `THREE` |
| `libs/OrbitControls.js` | 1 110 líneas | **No se usa** (`main.js` implementa su propia órbita, L848–917) | Sin cabecera de licencia en el archivo |
| `icons/*.png`, `*.svg` | — | Iconos del panel; `linkedin_logo.svg` | |
| `TECH_BRIEF_V1.md` | 108 líneas | Brief original de Fase 1 (v1) | Documenta el criterio "arte contra el artboard completo" |

## 2. Dependencias de ejecución

```
Illustrator 2026 (30.8.2)
 └─ CEP 12 · CEPHtmlEngine · Chromium 99 (CEF rama 4844) · Node embebido (libnode) pero sin habilitar en el manifiesto
     └─ Panel (index.html)
         ├─ window.__adobe_cep__.evalScript(jsx, cb)       ← único puente al DOM de Illustrator
         ├─ window.cep.fs.writeFile(path, base64, 'Base64') ← guardar GLB (si no existe: descarga por <a download>)
         ├─ window.cep.util / __adobe_cep__.openURLInDefaultBrowser ← enlace LinkedIn
         ├─ THREE r132 (global)   ← WebGLRenderer, ExtrudeGeometry, ShapeGeometry, Raycaster, Sprite, Line…
         └─ ExtendScript (ES3, dentro de Illustrator): app.activeDocument, layers/pathItems/groupItems/compoundPathItems,
            artboards, ExportOptionsPNG24 + doc.exportFile, Folder.temp, File.saveDialog
```
No usa `CSInterface.js` de Adobe (llama a `__adobe_cep__` directo): **no hay código de Adobe empaquetado**.

## 3. Mapa de responsabilidades de `main.js` (por líneas)

| Líneas | Responsabilidad | Módulo destino propuesto (doc 03) | Dependencias de estado |
|---|---|---|---|
| 1–86 | Referencias DOM, constantes (`TOLERANCE_MM`, `GRAPH_EPS`, `MATERIAL_PRESETS`, `CREASE_*`) y ~35 variables de estado | `config`, `state` | todas |
| 87–180 | Utilidades UI: estado/log, getters de material, modo de interacción, sprite de etiqueta de panel | `ui`, `scene/labels` | `currentMaterialPreset`, `currentThicknessMm`, `interactionMode` |
| 181–277 | `EXTRACT_SCRIPT`: ExtendScript como arreglo de cadenas (serializador JSON propio por falta de `JSON` en ES3) | `host/extract.jsx` | — |
| 279–363 | Puente CEP, cambio de vistas, tabs, preset de material, `pathToFileURL`, `evalScriptJSON` | `bridge`, `ui` | `errorMsg`, botones |
| 365–427 | `buildArtworkExportScript`: ExtendScript de arte (artboards/capas → PNG ≤4096 px) | `host/art.jsx` | — |
| 429–545 | Texturas de arte, UV por artboard, overlays por panel, `refreshArtwork` | `scene/art` | `currentArtState`, `panelMeshes`, `foldData` |
| 547–606 | Utilidades geométricas y `validateGeometry` (extremos de crease > 0.5 mm) | `core/validate` | `problems` |
| 608–643 | `render2D` (vista previa canvas) | `ui/preview2d` | `canvas2d` |
| 645–776 | **Motor de topología** (`buildTopology`, división de segmentos, recorrido de caras) | `core/legacy/topology` | `GRAPH_EPS` |
| 778–935 | Renderer, luces, rejilla, ejes, capa transparente de órbita/pan/zoom, bucle de render | `scene/renderer`, `scene/orbit` | `renderer3d`, `orbitState` |
| 937–963 | `clearAllMeshes` | `scene/lifecycle` | `panelMeshes`, `foldRoot`… |
| 965–1194 | Contornos, shells/huecos por paridad, `buildPanels`, **filtro de conectividad** | `core/legacy/panels` | `GRAPH_EPS` |
| 1196–1311 | `build3DFromPanels` (extrusión, aristas), `refreshPanelMaterials`, picking de panel, `fitCamera3D` | `scene/panels`, `scene/camera` | `panelMeshes`, `foldData` |
| 1313–1521 | Adyacencia (estricta + 2 respaldos), árbol de plegado BFS, signo de pliegue | `core/legacy/fold` | — |
| 1523–1737 | `dispose`, geometría de puentes/bisagras (cintas con UV de arte), visuales de crease | `scene/hinges` | `foldBridgeGroup`, `creaseVisuals` |
| 1739–1814 | Selección/picking de crease | `ui`, `scene/picking` | `selectedFoldEdgeIdx` |
| 1816–1936 | `applyFolding` (reconstruye todo el grafo de escena), `setBasePanel` | `scene/pose` | `foldRoot`, `foldTree`, `foldAngles` |
| 1938–2120 | `buildFoldUI`: construye el panel de pliegue en DOM con `style.cssText` inline | `ui/foldPanel` | casi todo |
| 2122–2189 | Guardado de archivo (diálogo de Illustrator + `cep.fs`), `exportPNG` | `bridge/fs`, `export/png` | `renderer3d` |
| 2191–2460 | Escritor GLB propio (bake de `matrixWorld`, texturas de arte, materiales) | `export/glb` | `scene3d` |
| 2462–2655 | Cableado de eventos | `app` | todo |

## 4. Acoplamientos que condicionan la modularización

1. **Estado compartido en clausura (≈35 variables)**: `panelMeshes`, `foldRoot`, `foldTree`, `foldAngles`, `foldSigns`, `foldData`, `foldCenter`, `currentPanelData`, `currentAdjEdges`, `currentArtState`, `currentBasePanelIndex`, `selectedFoldEdgeIdx`, `creaseVisuals`, `creasePickables`, `panelGroupMap`, `panelLabelSprites`, `renderer3d`, `scene3d`, `camera3d`, `orbitState`, … → primero se necesita un contenedor de estado explícito; sin eso, cada función extraída arrastra la clausura.
2. **La lógica de escena y la de UI se mezclan**: `applyFolding` → `rebuildCreaseVisuals` → `updateSelectedCreaseVisuals` actualiza filas DOM (L1747–1752); `buildFoldUI` crea y a la vez registra manejadores que llaman a `applyFolding`. La costura natural: la escena emite eventos/lee estado; la UI solo escribe estado.
3. **Geometría 2D con 3D**: `buildPanels` no usa three (puro), pero `shapeFromVerts` sí; `addArtworkOverlay` usa `foldData.center` global. La geometría pura (L547–606, 645–776, 965–1194 sin `shapeFromVerts`, 1313–1521) ya se puede extraer limpia: **mis scripts de línea de base la ejecutaron en Node sin tocarla** [MEDIDO], prueba de que la costura existe.
4. **Reconstrucción total por tick**: `applyFolding` descarta y recrea todo el árbol de grupos, sprites y visuales por cada evento de slider (origen de la fuga H1). Es una decisión de diseño, no un bug local: la solución correcta es crear el árbol una vez y solo actualizar rotaciones (modelo `setPose`).
5. **IDs de DOM codificados**: `index.html` y `main.js` están acoplados por decenas de ids (20 obligatorios); el rediseño UX/UI debe pasar por una capa de vistas.
6. **ExtendScript como cadenas**: no se puede probar ni resaltar; cada cambio exige recargar. `<ScriptPath>` del manifiesto permitiría archivos `.jsx` reales [A VALIDAR en CEP 12].

## 5. Código muerto, oculto o inconsistente

| Elemento | Dónde | Nota |
|---|---|---|
| `main.js.bak` en la carpeta instalada | raíz | Eliminar de la instalación en V3 |
| `OrbitControls.js` cargado y no usado | `index.html:140` | Eliminar |
| Botones ocultos: `preview-btn`, `export-3d-btn` (PNG), `mode-fold-btn`, `mode-base-btn` | `index.html`, L43–44 | El PNG existe pero **no es accesible** → alcance V3 "captura PNG" |
| Tres variantes de adyacencia (estricta, solape, panel-panel) | L1327–1464 | Parches acumulados sobre el acantilado de 0.5 mm (H4) |
| `thickness=…toFixed(1)` en estado | L1935 | Cosmético |
| `exportGLB` pide `foldRoot` pero el GLB recorre `scene3d` completa | L2445, L2245 | Incluye cualquier malla visible de la escena |

## 6. Interacción de usuario (contrato a preservar en la Fase 1)

Clic y arrastre izq. = orbitar · derecho o Shift+arrastre = pan · rueda = zoom · **Shift+clic** = elegir panel base · **Alt/Option+clic** = elegir crease · Esc = modo crease · sliders por crease (−180…180), "ALL creases", "Selected crease" (slider + número), "Reset Flat", selector de base · espesor (0.1–20) con "Apply" · stock White/Kraft/Gray · "Refresh Artwork" · "Export GLB" (diálogo de Illustrator).

## 7. Qué cambia sin riesgo y qué no

- **Sin riesgo (puro, ya medido):** extraer geometría 2D/topología/adyacencia/árbol de plegado, escritor GLB, constantes.
- **Riesgo medio:** escena (todos los `userData` y `renderOrder` son parte de la apariencia: 33, 32, 60, 90, 95, 120), picking, arte.
- **Riesgo alto:** UI (DOM inline + estado), carga del bundle en CEP, ExtendScript fuera de cadenas.
