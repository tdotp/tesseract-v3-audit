# Fase 1 · A6 — Propuesta: separación del motor geométrico tras la interfaz `GeometryEngine` (para revisión)

Fecha: 2026-10-24 · Punto de partida: `31459fc` (validación A5 en CEP real ejecutada y revertida) · Estado: **PROPUESTA. No se ha modificado código de producto, pruebas, herramientas, goldens ni fixtures.** Archivos nuevos (sin commit): este documento y la salida de la batería `docs/fase1/a6/run-all-precheck-31459fc.txt`.
Etiquetas: **[MEDIDO]** · **[CONFIRMADO por lectura]** · **[INFERENCIA]** · **[NO VERIFICADO]**. Los números de línea se refieren a `src/main.js` en `31459fc`.

> **APROBADA por el usuario el 2026-10-24** con las decisiones D-A6-1 A · D-A6-2 A · D-A6-3 A · D-A6-4 A · D-A6-5 A · D-A6-6 A · D-A6-7 A · **D-A6-8 B** (preparar una validación corta en Illustrator real al terminar A6; **la instalación NO está autorizada**: requerirá autorización expresa y fechada por separado) · D-A6-9 A · D-A6-10 A (Opus High en el mismo chat). Autorizada la ejecución de A6.0a–A6.7 dentro de este alcance. Reglas añadidas: batería completa con mutaciones tras cada paso; mantener los 36 controles negativos y añadir ≥ 7 que detecten fallos reales; crear `dist-a6.SHA256SUMS` sin tocar huellas históricas; detenerse ante cualquier regresión, mutación no detectada o incompatibilidad de contrato; detenerse antes de instalar o de iniciar A7.

## 0. Resumen

- El motor geométrico vigente son **24 funciones (~580 líneas)** dentro de la clausura de `src/main.js` (2 440 líneas). 23 son puras salvo por `log` y `GRAPH_EPS`; **solo `validateGeometry` mezcla cálculo y DOM**. Ninguna usa THREE [CONFIRMADO por lectura].
- El motor se invoca desde **7 puntos** de orquestación y produce 4 estructuras (`panelData`, adyacencia, árbol de plegado, problemas) que guardan variables de la clausura. **Esas variables no se mueven en A6**, así que `window.__dbg` y los dos anclajes del arnés siguen intactos sin tocarlos.
- Propuesta: `src/core/legacy/` (7 módulos con el **texto idéntico** de las funciones, sin sangría) + `src/core/engine.js` (contrato `GeometryEngine` v1 con **una sola implementación, `legacy`**, sin interruptor). Una única función cambia de texto: `validateGeometry` se parte en `validateDieline` (pura, en el motor) + la parte DOM (se queda en `main.js`).
- Ejecución en **8 commits pequeños** (A6.0a…A6.7), cada uno con la batería completa y las mutaciones en verde, diff del bundle revisado y rollback por `git revert` de un solo commit. Puerta **G2**: goldens geométricos idénticos por tres caminos (texto, módulo ES real, bundle en navegador) + GLB byte a byte + log de depuración idéntico.
- Hay **10 decisiones** que necesito de ti (§11). La más importante: aprobar el contrato v1 (§5) y las adaptaciones de herramientas de prueba (§7, D-A6-5).

## 1. Verificación previa [MEDIDO]

| Comprobación | Resultado |
|---|---|
| Git | HEAD `31459fc`, árbol limpio (0 cambios, 0 sin seguimiento), sin remoto, 23 commits de un solo autor, 0 trailers de IA |
| Baseline congelado | 15/15 = `reference/legacy-baseline.SHA256SUMS` |
| `panel/` (referencia A1) | 14/14 = `tests/golden/panel.pins.json`; `panel/main.js` `91b42b7b…1706` |
| Fuente vigente | `src/main.js` `88d3f74c…8167` |
| Build | `node tools/build/build.mjs` → `dist/SHA256SUMS` **idéntico** a `tests/golden/dist-a5.SHA256SUMS` (`main.js` `70de82a8…0701`) |
| Aislamiento | `tools/verify-isolation.sh` verde: baseline OK, extensión instalada = baseline, `panel/` difiere solo en lo esperado (`main.js` A1, sin `main.js.bak`), **V3 no instalada** |
| Batería | `tests/run-all.sh` (sin `--mutations`): **ver §1.1** |

### 1.1 Resultado de la batería
`tests/run-all.sh` sobre `31459fc` (2026-10-24): **TODO EN VERDE** — aislamiento OK · build = `dist-a5` · **Node 336/336** · navegador `browser` 44/44 · `chromium99` 4/4 · `bridge` 6/6 · `a5-observar` 3/3 · `a4-cdp` 7/7 [MEDIDO]. Sin `--mutations` ni `--soak` en esta intervención (los 36 controles negativos se verificaron al cierre de A5; se repetirán en cada paso de A6). Salida completa: `docs/fase1/a6/run-all-precheck-31459fc.txt`.

## 2. Arquitectura vigente tras A5 (resumen)

```
src/main.js        2440 l.  clausura DOMContentLoaded: DOM, ~35 variables de estado, GEOMETRÍA, escena, plegado, arte, GLB, UI, cableado
src/config/look.js           constantes visuales/material   (no importa nada)
src/host/*.js                4 textos ExtendScript          (no importan nada)
src/bridge/cep.js            evalScript, hasCep, pathToFileURL (solo window.__adobe_cep__, perezoso)
src/bridge/fs.js             guardado/descarga               (solo importa host/save-dialog)
```
Reglas vigentes (`tests/node/a5-limites.test.mjs`): `main.js` solo importa `config/`, `host/`, `bridge/`; THREE solo en `main.js`; ningún módulo lee `window`/`document` al cargarse. A6 añade `core/` respetando y ampliando estas reglas.

## 3. Mapa de dependencias del motor geométrico en `src/main.js`

### 3.1 Inventario (24 funciones + 2 constantes)

| Función | Líneas | Depende de (fuera de la función) | Llamada por | Destino propuesto |
|---|---|---|---|---|
| `TOLERANCE_MM` (var) | 53 | — | `validateGeometry` | `core/legacy/constants.js` |
| `GRAPH_EPS` (var) | 54 | — | `ptEq`, `pointOnSeg`, `pointOnSegment2D`, `edgeMatch`, `buildAdjacency` | `core/legacy/constants.js` |
| `distPtSeg` | 380–386 | — | `validateGeometry`, `pointOnSegment2D` | `geom2d.js` |
| `segsFromPath` | 388–395 | — | `buildAllSegs` | `validate.js` |
| `buildAllSegs` | 397–404 | `segsFromPath` | `validateGeometry` | `validate.js` |
| **`validateGeometry`** | 406–436 | `buildAllSegs`, `distPtSeg`, `TOLERANCE_MM` **+ estado `problems` + DOM** (`problemsList`, `validationStatus`, `continueBtn`, `document.createElement`) **+ `render2D`, `lastData`** | handler de Extract (2288) | **se parte**: `validateDieline` → `validate.js`; parte DOM → queda en `main.js` |
| `dist2d`, `ptEq` | 478–479 | `GRAPH_EPS` | topología, `pointOnSeg`, `edgeMatch` | `geom2d.js` |
| `segSegIntersect` | 481–490 | — (literales 1e-9, 1e-6) | `buildTopology` | `geom2d.js` |
| `pointOnSeg` | 492–495 | `dist2d`, `GRAPH_EPS` | `buildTopology` | `geom2d.js` |
| `buildTopology` | 497–606 | `segSegIntersect`, `pointOnSeg`, `ptEq`, **`log`** (5 mensajes + 1 por cara) | `buildPanels` | `topology.js` |
| `polygonSignedArea` | 810–817 | — | `polygonCentroid`, contornos, `buildPanels` | `geom2d.js` |
| `polygonCentroid` | 819–834 | `polygonSignedArea` | contornos, `buildPanels` | `geom2d.js` |
| `pointOnSegment2D` | 836–838 | `distPtSeg`, `GRAPH_EPS` | `pointInPolygonInclusive` | `geom2d.js` |
| `pointInPolygonInclusive` | 840–854 | `pointOnSegment2D` | contornos, `buildPanels` | `geom2d.js` |
| `contourContainsContour` | 856–862 | `pointInPolygonInclusive` | `classifyClosedCutContours` | `panels.js` |
| `classifyClosedCutContours` | 864–893 | `polygonSignedArea`, `polygonCentroid`, `contourContainsContour`, **`log`** | `buildPanels` | `panels.js` |
| `faceBounds` | 895–902 | — | `buildPanels` | `geom2d.js` |
| `buildPanels` | 904–1027 | contornos, `buildTopology`, áreas/centroides, `buildAdjacencyStrict`, **`log`** (literales 1, 4, 30, 120, `toFixed(2)`, 0.001) | handler Continue (2324) | `panels.js` |
| `getPolyCentroid` | 1149–1153 | — | `computeFoldSign` **y `build3DFromPanels` (escena, 1068)** | `geom2d.js` (la escena lo importa) |
| `edgeMatch` | 1155–1158 | `dist2d`, `GRAPH_EPS` | adyacencias | `geom2d.js` |
| `buildAdjacencyStrict` | 1160–1181 | `edgeMatch` | `buildPanels` (filtro de conectividad), `buildAdjacency` | `adjacency.js` |
| `buildAdjacency` | 1183–1297 | `buildAdjacencyStrict`, `edgeMatch`, `GRAPH_EPS`, **`log`**; funciones internas `edgeKey`, `lineOverlapSegment`, `pushAdj` | `buildFoldUI` (1786) | `adjacency.js` |
| `buildFoldTree` | 1299–1319 | `computeFoldSign`, **`log`** | `setBasePanel` (1773), `buildFoldUI` (1790) | `fold-tree.js` |
| `computeFoldSign` | 1342–1354 | `getPolyCentroid` | `buildFoldTree` | `fold-tree.js` |
| `getDefaultBaseIndex` | 1761–1767 | — | `buildFoldUI` (1788), handler Continue (2331) | `fold-tree.js` |

Totales [MEDIDO]: 24 funciones (las mismas 24 que carga `tests/lib/legacy.mjs` por nombre), ~578 líneas. Dependencias de la clausura: `log` (5 funciones, 15 mensajes), `GRAPH_EPS` (5), `TOLERANCE_MM` (1), DOM/estado (solo `validateGeometry`). **Ninguna lee ni escribe estado de escena** y ninguna usa THREE.

### 3.2 Grafo de llamadas interno
```
validateGeometry ─► buildAllSegs ─► segsFromPath
                 └► distPtSeg
buildPanels ─► classifyClosedCutContours ─► contourContainsContour ─► pointInPolygonInclusive ─► pointOnSegment2D ─► distPtSeg
           │                            └► polygonSignedArea, polygonCentroid
           ├► buildTopology ─► segSegIntersect, pointOnSeg ─► dist2d ; ptEq ─► dist2d
           ├► polygonSignedArea, polygonCentroid, pointInPolygonInclusive, faceBounds
           └► buildAdjacencyStrict ─► edgeMatch ─► dist2d          (filtro de conectividad)
buildAdjacency ─► buildAdjacencyStrict ; edgeMatch ; lineOverlapSegment (interna)
buildFoldTree ─► computeFoldSign ─► getPolyCentroid
getDefaultBaseIndex (hoja)
```
Sin ciclos. El único cruce entre «paneles» y «adyacencia» es `buildPanels → buildAdjacencyStrict` (por eso `panels.js` importa `adjacency.js`, nunca al revés).

### 3.3 Puntos de entrada desde la orquestación (7)

| Línea | Dónde | Llamada | Qué hace con el resultado |
|---|---|---|---|
| 2288 | handler Extract | `validateGeometry(parsed)` | estado de validación, lista de problemas, `continueBtn`; `render2D` lee `problems` |
| 2324 | handler Continue 3D | `buildPanels(lastData)` | `currentPanelData`; si 0 paneles → mensaje; excepciones → «3D error: …» |
| 2331 | handler Continue 3D | `getDefaultBaseIndex(panelData)` | solo si la base guardada está fuera de rango |
| 1786 | `buildFoldUI` | `buildAdjacency(panels, creaseEdges)` | `currentAdjEdges` (se recalcula en cada `buildFoldUI`: 3D, espesor, preset con 3D, cambio de base) |
| 1788 | `buildFoldUI` | `getDefaultBaseIndex(panelData)` | igual que 2331 |
| 1790 | `buildFoldUI` | `buildFoldTree(panels, adj, base)` | `foldTree`, `foldSigns`, `foldAngles` |
| 1773 | `setBasePanel` | `buildFoldTree(panels, adj, base)` | ídem (y luego `buildFoldUI` lo vuelve a llamar si `rebuildUI`) |

[CONFIRMADO por lectura] Con `rebuildUI=true`, un cambio de base llama dos veces a `buildFoldTree` y una a `buildAdjacency`; cada llamada escribe en el log. **A6 conserva ese número y orden de llamadas** (son visibles en el log de depuración y forman parte del comportamiento).

### 3.4 Estado de la clausura que produce o consume el motor (no se mueve en A6)
`lastData` (entrada), `problems` (salida de validación, la lee `render2D`), `currentPanelData`, `currentAdjEdges`, `currentBasePanelIndex` (empieza en 0 y **solo** se reinicia si queda fuera de rango, por eso la base inicial es P0 y no el panel mayor; A3), `foldTree`, `foldSigns`, `foldAngles`, `foldData`/`foldCenter` (los calcula la escena). Todo esto es materia de A7 (estado).

### 3.5 Quién consume cada campo de los datos del motor

| Dato | Campo | Consumidor (fuera del motor) |
|---|---|---|
| `panelData.panels[i]` | `vertices` (CCW, en mm) | `build3DFromPanels` (malla, centro global, UV de arte), `buildGLB…` indirectamente vía mallas |
| | `centroid` (ponderado por área) | etiquetas `P{i}` (`applyFolding` 1689), puentes de pliegue (1451–1452) |
| | `area` | selector de base (`P{i} (… mm²)`, 1841) |
| | `edges` | solo `buildAdjacency` (motor) |
| `panelData.creaseEdges` | `length` | log de escena (1088); se guarda en `foldData` |
| `panelData.creases` | (alias de `lastData.creases`) | `foldData.creases` |
| adyacencia `[k]` | `length` | textos de UI (1812, 1965) |
| árbol `[e]` | `parent`, `child`, `crease.a/.b`, `sign` | `applyFolding` (pivote en `crease.a`, ángulo `atan2(b−a)`), visuales de pliegue, filas `C{e} P{p}→P{c}`, `foldSigns` |
| problemas | `id`, `type`, `dist`, `point` | lista de problemas y `render2D` |

### 3.6 Qué NO es motor y dónde queda

| Responsabilidad | Funciones | Queda en | Paso que lo extrae |
|---|---|---|---|
| Orquestación | handlers Extract/Continue/espesor/preset, `setBasePanel`, llamadas de `buildFoldUI` | `main.js` | A9 (`app`) |
| Estado | ~35 variables de clausura (§3.4) | `main.js` | A7 (`state`) |
| Escena | `shapeFromVerts` (THREE), `build3DFromPanels` (incluye el **centro global** = media de todos los vértices), `clearAllMeshes`, materiales, picking, cámara, etiquetas, `disposeObject3D` | `main.js` | A7 (`scene`) |
| Plegado (transformaciones) | `applyFolding`, `rebuildCreaseVisuals`, puentes (`projectInsetDir`, `buildRibbonStripGeometry`, `makeBridgeRowsForEdge`, `addFoldBridgeVisual`), selección de crease | `main.js` | A7 |
| Renderer | `init3D`, `resize3D`, órbita | `main.js` | A7 |
| Arte | `applyArtUVs`, overlays, `refreshArtwork` | `main.js` | A7 |
| Exportación | `exportPNG`, escritor GLB | `main.js` | A8 |
| UI | parte DOM de `validateGeometry`, `render2D`, `buildFoldUI`, `signedDisplayAngle`/`internalAngleFromDisplay`, filas de pliegue | `main.js` | A9 |

Criterio: es motor lo que transforma el troquel (datos) en paneles, adyacencias, árbol y diagnósticos **sin** DOM, THREE ni estado. El ángulo de cada pliegue, la jerarquía de grupos THREE y el centro de la escena son **uso** del resultado del motor, no motor. Nota: el centro global (`foldData.center`) es geometría pura, pero vive dentro de `build3DFromPanels` y afecta al arte y al GLB; moverlo cambiaría texto de la escena, así que se deja para A7 (ver D-A6-7).

## 4. Límites de módulos propuestos

```
src/core/
  engine.js              contrato GeometryEngine (JSDoc) + createLegacyEngine()      importa: legacy/*
  legacy/
    constants.js         export const TOLERANCE_MM = 0.5; export const GRAPH_EPS = 0.5;   (no importa nada)
    log.js               log(m), setLogSink(fn)  — único estado de módulo de core/        (no importa nada)
    geom2d.js            distPtSeg, dist2d, ptEq, segSegIntersect, pointOnSeg, polygonSignedArea, polygonCentroid,
                         pointOnSegment2D, pointInPolygonInclusive, faceBounds, getPolyCentroid, edgeMatch
                                                                                      importa: constants
    topology.js          buildTopology                                               importa: geom2d, log
    adjacency.js         buildAdjacencyStrict, buildAdjacency                        importa: geom2d, constants, log
    fold-tree.js         computeFoldSign, buildFoldTree, getDefaultBaseIndex         importa: geom2d, log
    panels.js            contourContainsContour, classifyClosedCutContours, buildPanels
                                                                                      importa: geom2d, topology, adjacency, log
    validate.js          segsFromPath, buildAllSegs, validateDieline (nueva, pura)   importa: geom2d, constants
```
**Reglas (se verifican con una prueba nueva `a6-limites`, que amplía `a5-limites`):**
1. `core/` no importa nada de fuera de `core/` (ni `config/`, `host/`, `bridge/`, ni `main.js`).
2. `core/` no menciona `THREE`, `window`, `document`, `console` ni `localStorage`; se carga en Node sin globales.
3. `core/legacy/*` no importa `core/engine.js`; `engine.js` es la única puerta pública. Excepción explícita y temporal: `main.js` importa `getPolyCentroid` de `geom2d.js` para la escena (D-A6-7).
4. Sin ciclos. Sin estado de módulo salvo el *sink* de `log.js`.
5. `main.js` importa de `core/` solo `createLegacyEngine` y `getPolyCentroid`.
6. Las funciones movidas conservan **el texto exacto** (solo cambia la sangría de 4 espacios y se antepone `export`); se verifica automáticamente (§8, prueba T2).

Por qué 7 archivos y no uno: siguen las secciones que el propio `main.js` ya tiene (GEOMETRY UTILS / TOPOLOGY / PANELS / ADJACENCY + FOLD TREE), permiten mover en pasos pequeños y dejan claro qué pieza sustituirá el normalizador de 2A. Alternativa en D-A6-2.

## 5. Contrato `GeometryEngine` v1

### 5.1 Interfaz
```js
// src/core/engine.js (propuesta; JS plano, Chromium 99, sin dependencias)
/** Contrato v1. Un motor es un objeto congelado con estas propiedades. Todas las funciones son síncronas,
 *  no tocan DOM/THREE/estado de la aplicación y propagan sus excepciones sin envolverlas. */
/** @typedef {{x:number,y:number}} Point                       mm, eje Y hacia arriba (coordenadas de Illustrator × PT) */
/** @typedef {{anchor:Point,left:Point,right:Point}} PathPoint  left/right = manejadores Bézier (el legacy los ignora: KI-07) */
/** @typedef {{closed:boolean,points:PathPoint[]}} Path */
/** @typedef {{version:string,units:'mm',thickness_mm:number,outerBoundary:Path,holes:Path[],cutLines:{geom:Path}[],
 *             creases:Path[],meta:Object,error?:string}} Dieline   salida JSON de host/extract.js, sin transformar */
/** @typedef {{id:string,type:string,dist:number,point:Point}} Problem     id = 'P1','P2',… en orden de detección */
/** @typedef {{problems:Problem[]}} ValidationResult */
/** @typedef {{u:Point,v:Point,type:'boundary'|'crease'}} PanelEdge */
/** @typedef {{vertices:Point[],edges:PanelEdge[],area:number,centroid:Point}} Panel   vertices CCW; area ≥ 0; centroid ponderado por área */
/** @typedef {{a:Point,b:Point,creaseIdx:number,segIdx:number}} CreaseEdge */
/** @typedef {{panels:Panel[],creaseEdges:CreaseEdge[],creases:Path[]}} PanelModel */
/** @typedef {{panelA:number,panelB:number,crease:{a:Point,b:Point},creaseIdx:number}} AdjacencyEdge   creaseIdx −1 = sin crease de origen */
/** @typedef {{parent:number,child:number,crease:{a:Point,b:Point},sign:1|-1}} FoldEdge */
/**
 * @typedef {Object} GeometryEngine
 * @property {string} id                         'legacy'
 * @property {number} contract                   1
 * @property {(d:Dieline)=>ValidationResult} validate
 * @property {(d:Dieline)=>PanelModel} buildPanels
 * @property {(panels:Panel[], creaseEdges:CreaseEdge[])=>AdjacencyEdge[]} buildAdjacency
 * @property {(panels:Panel[], adjacency:AdjacencyEdge[], baseIndex:number)=>FoldEdge[]} buildFoldTree
 * @property {(m:PanelModel)=>number} defaultBaseIndex
 */
import { setLogSink } from './legacy/log.js';
import { validateDieline } from './legacy/validate.js';
import { buildPanels } from './legacy/panels.js';
import { buildAdjacency } from './legacy/adjacency.js';
import { buildFoldTree, getDefaultBaseIndex } from './legacy/fold-tree.js';

export function createLegacyEngine(options){
  setLogSink(options && options.log);
  return Object.freeze({ id:'legacy', contract:1, validate:validateDieline, buildPanels:buildPanels,
    buildAdjacency:buildAdjacency, buildFoldTree:buildFoldTree, defaultBaseIndex:getDefaultBaseIndex });
}
```
**El adaptador `legacy` no envuelve nada**: cada método **es** la función original (mismo cuerpo, misma aridad, mismas excepciones). Así la indirección no puede introducir diferencias. Las firmas de `buildAdjacency` y `buildFoldTree` reproducen las del legacy a propósito; un motor candidato (2B) se adapta a ellas, no al revés.

Uso en `main.js` (7 llamadas, §3.3): `var geometryEngine = createLegacyEngine({ log: log });` justo después de definir `log`, y `buildPanels(x)` → `geometryEngine.buildPanels(x)`, etc. **Sin interruptor, sin selector en la UI, sin exponer el motor en `window`.**

### 5.2 Invariantes del contrato (lo que cualquier motor debe cumplir y lo que A6 debe preservar)

| # | Invariante | Legacy hoy | Cómo se fija |
|---|---|---|---|
| I1 | Puro respecto a la app: sin DOM, THREE, `window`, ni estado de la app | Sí, salvo `validateGeometry` | T5 `a6-limites` |
| I2 | Determinista: misma entrada ⇒ misma salida, **incluido el orden** | [INFERENCIA] sí (sin aleatoriedad; `Object.keys` de claves enteras se recorre en orden numérico) | T3 doble ejecución |
| I3 | No muta la entrada | [NO VERIFICADO] (por lectura, `buildTopology` solo muta su array local) | T3 igualdad profunda antes/después |
| I4 | La salida **puede compartir objetos** con la entrada y entre etapas (los extremos de `creaseEdges` son los `anchor` de `lastData`; la adyacencia estricta guarda el propio `CreaseEdge`; el árbol guarda el `crease` de la adyacencia). Los consumidores la tratan como solo lectura | Sí [CONFIRMADO por lectura] | T3 identidad de objetos; **el adaptador no clona** |
| I5 | Identidad de panel = **índice** en `panels`; identidad de pliegue = índice en el árbol. El orden es comportamiento visible (`P{i}`, `C{e}`, selector de base, ángulos por índice) | Sí | goldens + GEO del navegador |
| I6 | `crease.a→b` y `sign` van acoplados: el pivote se aplica en `crease.a` y el signo usa el lado del centroide del hijo respecto de `a→b` | Sí | árboles por base en el golden + píxeles a 60° + GLB |
| I7 | Unidades mm y tolerancias **absolutas** (por eso existe KI-22) | Sí | goldens; KI-22 se preserva |
| I8 | Las excepciones se propagan sin envolver (el mensaje acaba en «3D error: …») | Sí | prueba de excepción (T3) |
| I9 | Mensajes de log: mismo texto, mismo orden, síncronos, por el *sink* | Sí (15 mensajes) | T1 (log de depuración) + `analyze()` (lee logs) |
| I10 | `buildPanels` puede devolver 0 paneles sin error; la orquestación decide el mensaje | Sí | caso existente «No 3D panels…» |

### 5.3 Reservado para versiones posteriores (NO se implementa en A6)
Diagnósticos estructurados (paneles descartados y por qué, ajustes del normalizador: 2A), `holes` por panel (KI-06), curvas aplanadas con densidad declarada (KI-07), identificadores estables además del índice, centro del modelo, y la selección de motor con interruptor (2B). Se documentan como campos **opcionales** de un futuro contrato v2 para que un candidato no tenga que romper v1.

## 6. Ganchos de pruebas y `window.__dbg`

[CONFIRMADO por lectura] El arnés (`tools/baseline/setup_harness.py`) inserta `window.__dbg = {…}` **justo antes de `function setStatus(m){…}`** (exige exactamente 1 coincidencia) y sus *getters* leen variables de la clausura por nombre: `renderer3d`, `scene3d`, `camera3d`, `orbitState`, `foldAngles`, `foldTree`, `panelMeshes`, `foldData`, `currentArtState`, `currentPanelData`, `currentThicknessMm`, `currentMaterialPreset`, `currentBasePanelIndex`, `foldBridgeGroup`, `selectedFoldEdgeIdx`, `creaseVisuals`, `currentAdjEdges`, y llama a `updateCameraFromOrbit()` y `applyFolding()`. El segundo anclaje está en `bridge/cep.js` (`pathToFileURL`).

**Reglas para A6:**
1. No se mueven ni se renombran `setStatus` ni ninguna de esas variables o funciones. Como el motor **devuelve** datos y la orquestación los sigue guardando en las mismas variables, `__dbg.panelData`, `__dbg.adj`, `__dbg.tree`, `__dbg.baseIndex` y `__dbg.foldData` siguen funcionando **sin tocar el arnés**.
2. No se añade el motor a `__dbg` ni a `window`, y el arnés no se modifica. La identidad del motor se comprueba en Node (módulo real) y en el texto del bundle, no en la página.
3. `core/` no conoce el arnés: ningún *hook* de prueba en el código de producto. Las pruebas del motor entran por la API pública (`createLegacyEngine`) o por el cargador de texto existente.
4. Cada paso comprueba que los dos parches del arnés siguen aplicándose 1 vez (la batería de navegador ya aborta si no).
5. El sustituto explícito de `__dbg` sigue siendo tarea de A7 (cuando el estado salga de la clausura), como ya decía la propuesta de A5.

## 7. Secuencia de implementación (un commit por paso)

Precondición de cada paso: el anterior en verde con `tests/run-all.sh --mutations`. Cada paso: diff del bundle archivado en `docs/fase1/a6/diff-bundle-A6.N.txt` y revisado (solo reubicaciones y renombres de esbuild), huella vigente regenerada **solo** en la línea de `main.js`, `verify-isolation.sh` verde. Rollback de cualquier paso: `git revert <commit>` (un commit, sin reescribir historia); de todo A6: revertir sus commits en orden inverso hasta `31459fc`. Nada se instala, así que el rollback es solo de repositorio.

| Paso | Qué se hace | Producto | Prueba de equivalencia específica |
|---|---|---|---|
| **A6.0a** Caracterización adicional | Solo pruebas, sobre el código **sin mover**: T1 log de depuración completo (`#log-area`) idéntico en baseline/panel/bundle en 5 flujos (3D, cambio de base, espesor, preset con 3D, ángulo); T3 contratos implícitos del legacy (no mutación, determinismo, alias de objetos, excepción) en baseline/panel/src; golden nuevo de transcripción de logs del motor por fixture **generado desde el baseline** (D-A6-6) | Sin cambios | Deben pasar con `src` = copia actual; si I3 resultara falsa, se **registra** (no se corrige) |
| **A6.0b** Andamiaje de pruebas | `DIST_PIN` pasa a `tests/golden/dist-a6.SHA256SUMS` (al principio, copia exacta de `dist-a5`); `dist-a5` queda **congelada** como histórica (la evidencia real de A5-CEP depende de ella); prueba T2 «texto idéntico» (función a función, `panel/main.js` vs `src/`, normalizando solo la sangría); cargador: nombres opcionales + motor de apoyo (D-A6-5); `a5-limites` acepta `core/` (reglas A5 intactas) | Sin cambios | Batería idéntica; T2 pasa trivialmente; `dist-a5` sigue reproduciéndose desde el `src/` de `31459fc` (`git archive`) |
| **A6.1** Constantes | `core/legacy/constants.js`; `main.js` importa `TOLERANCE_MM`, `GRAPH_EPS` (2 `var` eliminadas). Se actualizan los 2 patrones de mutación de esas constantes (mismo cambio de valor) | Reubicación | `constants.golden` sobre `src`; mutaciones de constantes detectadas (no «NO APLICÓ») |
| **A6.2** Geometría 2D y topología | `geom2d.js` (12 funciones), `topology.js`, `log.js`; `main.js` llama `setLogSink(log)` al arrancar e importa lo que aún usa | Reubicación | T1 (log), `geometry.golden` 26 fixtures, `illustrator-real.golden`, mutaciones `ptEq`/`pointOnSeg` |
| **A6.3** Adyacencia y árbol | `adjacency.js`, `fold-tree.js` | Reubicación | Árboles por base del golden; GEO del navegador; píxeles a 60°; GLB 2 poses |
| **A6.4** Paneles | `panels.js` | Reubicación | 11 de 13 (caja real) y 13 a ×0.75 preservados; mutaciones de umbrales (4 mm², 30:1) |
| **A6.5** Validación | `validate.js` con `segsFromPath`, `buildAllSegs` y **`validateDieline` (nueva, pura)**; `validateGeometry` de `main.js` conserva toda la parte DOM y obtiene `problems` de la función pura. **Único cambio de texto de una función en A6** | Separación cálculo/DOM | `problems` del golden; 30 casos del puente (estado de validación, lista, `continueBtn`, log); mutación de `TOLERANCE_MM` |
| **A6.6** `GeometryEngine` | `core/engine.js` (contrato + `createLegacyEngine`); las 7 llamadas de §3.3 pasan por `geometryEngine`; T4 prueba el contrato sobre el **módulo ES real** con todos los fixtures; T5 `a6-limites` | Indirección | G2 por tres caminos (§8); mutación «el adaptador ignora la base» detectada en navegador |
| **A6.7** Cierre | `run-all.sh --mutations --soak`; `A6_INFORME.md`; `KNOWN_ISSUES.md`, `tests/README.md`, `HANDOFF.md` | — | **PC7** |

Estimación [INFERENCIA]: 1,75–2,75 días de trabajo asistido (coincide con `docs/fase0/09`), la mitad en A6.0a/A6.0b.

## 8. Pruebas requeridas

**Existentes (deben seguir en verde sin cambiar su contenido):** Node 336 (incluye `geometry-golden` 26 fixtures × baseline/panel/src, `known-issues`, `illustrator-real-fixtures`, `constants`, `build`, `isolation`, evidencias A4/A5-CEP), navegador 44 (48 con `--soak`: píxeles, escena, **GLB byte a byte**, GEO, GPU Δ=0), puente CEP 6 (30 casos), Chromium-99 4, A4-CDP 7, mutaciones 36.

**Nuevas:**

| ID | Prueba | Dónde | Qué fija |
|---|---|---|---|
| T1 | Log de depuración completo idéntico en 5 flujos | navegador (baseline · panel · bundle) | orden y texto de los 15 mensajes del motor intercalados con los de la escena (I9) |
| T2 | Texto idéntico de las 23 funciones movidas (normalizando solo sangría y `export`) | Node | que «mover» no cambió ni un carácter; excepción declarada: `validateGeometry` |
| T3 | Contratos implícitos: no mutación, determinismo, alias de objetos, propagación de excepciones | Node (baseline · panel · src) | I2, I3, I4, I8 |
| T4 | Conformidad del contrato y G2 sobre el **módulo ES real** (`import('src/core/engine.js')`): forma del objeto, `analyze()` vía contrato = `geometry.golden` e `illustrator-real.golden` para todos los fixtures | Node | que el camino que usa el bundle es el validado (no solo el cargador por texto) |
| T5 | `a6-limites`: reglas de §4 | Node | límites de módulos |
| T6 | Golden de logs del motor por fixture (desde el baseline) | Node | I9 sin navegador |
| T7 | Reproducibilidad de `dist-a5` desde el `src/` de `31459fc` | Node | que la evidencia real de A5 sigue anclada |

**Controles negativos nuevos (cada uno debe detectarse; si alguno no, se documenta y se sustituye, como en A2):** cambiar `eps = Math.max(GRAPH_EPS, 1.0)` de `buildAdjacency`; desempate del orden de componentes en el filtro de conectividad; umbral `0.001` de `computeFoldSign`; el adaptador pasa siempre base 0; el adaptador clona la entrada (rompe I4 en T3); `validateDieline` con `>=` en lugar de `>`; `core/` toca `document` (T5). Las 36 existentes deben seguir **aplicándose** (ninguna «NO APLICÓ»).

**Puerta G2 (aceptación técnica):** `geometry.golden.json` e `illustrator-real.golden.json` idénticos para `src` por el cargador de texto **y** por el módulo real (T4); GEO del navegador idéntico en los tres objetivos; GLB byte a byte (2 fixtures × poses) y píxeles iguales; log de depuración idéntico (T1); GPU Δ=0; 11 de 13 preservado; todas las mutaciones detectadas.

## 9. Riesgos

### 9.1 Específicos del motor

| Área | Riesgo | Mitigación |
|---|---|---|
| **Curvas** | El extractor envía manejadores `left/right`; el legacy solo usa `anchor` (KI-07). La escena, los UV del arte y el GLB asumen polígonos. Tentación de «aprovechar» A6 para leer curvas | A6 no toca el uso de `anchor`; T2 lo garantiza. El contrato fija polígonos; las curvas quedan como extensión v2 (2B) con densidad de aplanado declarada, porque cambian el número de vértices y por tanto índices, GLB y UV |
| **Tolerancias** | Hay 2 constantes con nombre y **≥ 12 literales** en mm o adimensionales (1e-9, 1e-6, área ≤ 1, < 4 mm², 30:1 y 120 mm², `toFixed(2)` como clave de duplicados, 0.001, 0.20, `eps*1.2`, `max(GRAPH_EPS,1.0)`, 0.001 del signo). `GRAPH_EPS` tiene **4 semánticas** distintas (radio de fusión de vértices, suma de distancias de KI-18, coincidencia de aristas, base del eps de adyacencia). Unificarlas o «parametrizarlas» cambiaría resultados (KI-22, KI-18) | A6 **no** parametriza ni renombra literales; solo exporta las 2 constantes como solo lectura. Los literales siguen en línea (T2). Cualquier cambio de tolerancia es 2A |
| **Conectividad** | Dos nociones de adyacencia: la **estricta** filtra paneles (`buildPanels`) y la **robusta** alimenta el plegado. Unificarlas «arreglaría» KI-04 y cambiaría 11→13 | Se preservan las dos y su uso; mutación sobre el desempate del filtro; 11 de 13 en la puerta |
| **Jerarquía de paneles** | El índice de panel nace del orden de recorrido de caras (`Object.keys` del grafo + orden angular); el árbol es BFS desde la base y su índice de arista es el `C{e}` de la UI; con varias aristas entre el mismo par gana la primera. Cualquier `Map`, `sort` o deduplicación nueva **renumera** paneles y pliegues | Prohibido cambiar estructuras de datos o iteración en A6 (T2); golden de árboles para varias bases; GEO del navegador |
| **Datos del plegado** | Acoplamientos finos: pivote en `crease.a`, signo por el centroide **ponderado** del hijo (y del padre si el producto cruz < 0.001), mientras `userData.center` usa la **media de vértices**; el centro global de la escena es la media de todos los vértices con repetidos; los vértices se invierten a CCW (afecta a la orientación de las normales y al GLB) | No se unifican centroides; el centro global sigue en la escena (D-A6-7); GLB byte a byte y píxeles a 60° |
| **Alias de objetos** | Clonar «por limpieza» en el adaptador rompería la identidad que hoy comparten `lastData`, `creaseEdges`, adyacencia y árbol; hoy nadie muta, pero A7/A9 podrían depender de ello | I4 documentado y fijado por T3; mutación «el adaptador clona» |

### 9.2 Del procedimiento

| Riesgo | Mitigación |
|---|---|
| El golden lee **textos de log** (`analyze()` extrae iteraciones, caras y el mensaje del filtro): cualquier cambio de texto rompe G2 | Los mensajes no se tocan (T2, T6) |
| El *sink* de log es estado de módulo: dos motores con *sinks* distintos chocarían | Solo hay `legacy` y un `createLegacyEngine` en `main.js`; documentado; revisar en 2B |
| esbuild renombra (`log` del módulo frente al `log` de la clausura) | Revisión del diff del bundle; los renombres no cambian semántica |
| Las constantes pasan de `var` a `export const` (solo lectura) | [MEDIDO por búsqueda] no se reasignan nunca |
| Mutaciones que «no aplican» tras mover texto (dan falsa seguridad si se ignoran) | El script ya falla con «NO APLICÓ»; se actualizan solo los 2 patrones de constantes |
| Romper la evidencia real de A5 al regenerar huellas | `dist-a5` queda congelada; `dist-a6` es la nueva vigente; T7 |
| Chromium 99 | El código movido es el mismo; los módulos ES solo existen en la fuente (el bundle sigue siendo un IIFE); `chromium99` y `chromium99-compat` siguen en la batería |
| Validación en CEP real | No autorizada; la equivalencia se apoya en las pruebas. Ver D-A6-8 |

## 10. Condiciones de aceptación (PC7)

1. G2 cumplida (§8) y batería de cierre `run-all.sh --mutations --soak` en verde, con nuevas pruebas T1–T7 y nuevos controles negativos detectados.
2. Cero cambios en goldens históricos, fixtures, `reference/`, `panel/`, `dist.SHA256SUMS` y `dist-a5.SHA256SUMS`; `dist-a6` regenerada solo en `main.js`.
3. Las 23 funciones movidas, con texto idéntico (T2); `validateGeometry` como única excepción, descrita y probada.
4. KI-01…KI-26 preservados (incluidos KI-04, KI-07, KI-17…20, KI-22); ningún defecto corregido.
5. `__dbg` y el arnés sin modificar; 1 coincidencia de cada parche en cada paso.
6. Un commit por paso, un solo autor, sin trailers, sin push; nada instalado; `verify-isolation.sh` verde.
7. Informe `A6_INFORME.md` con diff del bundle por paso, resultados, regresiones (ninguna esperada) y lo no verificado.

## 11. Decisiones que requieren tu aprobación

| # | Decisión | Recomendación | Alternativa |
|---|---|---|---|
| **D-A6-1** | Contrato v1 de §5 (5 operaciones, identidad por índice, firmas del legacy, adaptador sin envoltorios, invariantes I1–I10) | **Aprobar** | Contrato más rico ya (diagnósticos, ids): más trabajo ahora y nada que lo use hasta 2A/2B |
| **D-A6-2** | Límites: 7 módulos en `core/legacy/` + `engine.js` | **7 módulos** | Un solo `core/legacy/index.js` (menos archivos, pasos más grandes) |
| **D-A6-3** | Partir `validateGeometry` en A6.5 (única función que cambia de texto) | **Sí, en A6** (el contrato necesita `validate` para que un candidato aporte diagnósticos) | Diferirlo a A9 (UI): A6 sin `validate` en el contrato |
| **D-A6-4** | Log por *sink* de módulo (`setLogSink`) | **Sink** (el texto de las funciones no cambia) | Pasar `log` como parámetro: cambia firmas y texto de 5 funciones y el cargador de pruebas |
| **D-A6-5** | Adaptar herramientas de prueba (no producto): cargador `tests/lib/legacy.mjs` (nombres opcionales + `geometryEngine` de apoyo), 2 patrones de mutación de constantes, inventario de `a5-limites`, `DIST_PIN` → `dist-a6` | **Aprobar** (es lo mínimo; mismo criterio que en A5) | — (sin ellas A6 no puede pasar la batería) |
| **D-A6-6** | Golden **nuevo** de logs del motor, generado **solo desde el baseline** | **Aprobar** | Confiar solo en T1 (navegador, 2 fixtures) |
| **D-A6-7** | `main.js` (escena) importa `getPolyCentroid` de `core/legacy/geom2d.js` hasta A7; el centro global sigue en la escena | **Aprobar** | Duplicar la función en la escena (deriva) o mover ya el centro (cambia texto de escena) |
| **D-A6-8** | Validación corta en CEP real tras A6 | **No en A6**: hacerla tras A7 (escena, riesgo alto) cubriendo ambos; A6 no cambia operaciones ni orden | Validación tipo A5-CEP (V-1, V-2, V-5) al cerrar A6, con autorización de instalación |
| **D-A6-9** | Registrar esta propuesta en Git (como `bafe4d3` en A5) | Tras tu aprobación, con las decisiones anotadas | Mantenerla sin commit |
| **D-A6-10** | Quién implementa | Opus; en este chat si se aprueba pronto (el contexto ya está reconstruido desde el repo) o en uno nuevo con `HANDOFF.md` actualizado, según tu política | — |

**Fuera de A6 y sin cambios:** KI-22 y demás defectos (F2/2A), motor web (2B), escena/estado/`ResourceTracker` (A7), GLB (A8), UI (A9), three r132, unidades GLB, instalación en CEP.

## 11 bis. Decisiones en detalle (añadido 2026-10-24, tras la aprobación conceptual; A6 sigue SIN autorizar)

| ID | Alternativas | Recomendación | Riesgo de cada alternativa | Consecuencia para equivalencia y pruebas | Autorización |
|---|---|---|---|---|---|
| **D-A6-1** Contrato v1 | **A** contrato mínimo de §5 (5 operaciones, firmas del legacy, índices, adaptador = funciones originales) · **B** contrato rico ya (diagnósticos, ids estables, holes, curvas) | **A** | A: puede quedarse corto en 2B → se resuelve con v2 opcional sin romper v1 · B: código nuevo dentro del adaptador = superficie para diferencias; diseño sin consumidor real | A: el adaptador no ejecuta código propio ⇒ equivalencia por construcción, fijada por T4 · B: exige pruebas nuevas de campos que el legacy no tiene y riesgo de tocar resultados | **Expresa** (fija la interfaz que tendrá que cumplir el candidato de 2B) |
| **D-A6-2** Límites | **A** 7 módulos + `engine.js` · **B** un único `core/legacy/index.js` + `engine.js` | **A** | A: más imports ⇒ más renombres de esbuild que revisar · B: pasos más grandes, peor aislamiento para 2A | Idéntica en ambas (mismo texto); A permite G2 parcial por paso; B concentra el riesgo en un commit | En bloque con A6 |
| **D-A6-3** `validateGeometry` | **A** partirla en A6.5 (`validateDieline` pura + DOM en `main.js`) · **B** dejarla entera hasta A9 | **A** | A: es la única función cuyo texto cambia · B: contrato sin `validate`; un candidato no podría aportar diagnósticos y habría que reabrir el contrato | A: `problems` del golden + 30 casos del puente (estado, lista, botón, log) + mutación `>`→`>=`; T2 la declara como única excepción · B: cero cambio de texto en A6 | **Expresa** (único cambio de texto de una función de producto) |
| **D-A6-4** Log | **A** *sink* de módulo (`log.js` + `setLogSink`) · **B** `log` como parámetro | **A** | A: estado de módulo global (choque si hubiera 2 motores; hoy imposible) · B: cambia firmas y texto de 5 funciones y rompe el cargador | A: texto idéntico, mismo orden síncrono (T1, T6) · B: T2 dejaría de poder verificar «texto idéntico» en 5 funciones | En bloque con A6 |
| **D-A6-5** Herramientas de prueba | **A** adaptación mínima que **no reduce** la detección (detalle abajo) · **B** no tocar herramientas | **A** | A: tocar la red de seguridad; mitigado con las reglas de abajo · B: imposible: 3 mutaciones darían «NO APLICÓ», `a5-limites` y `build` fallarían y el cargador no podría evaluar la `validateGeometry` partida | A: misma cobertura + controles nuevos (36 → ≥ 43) · B: A6 no podría pasar la batería | **Expresa** |
| **D-A6-6** Golden de logs | **A** golden nuevo de transcripción del log del motor por fixture, **generado solo desde el baseline** · **B** solo T1 en navegador | **A** | A: un archivo más que mantener; si alguien lo regenera desde `src` perdería sentido (se fija con huella) · B: cobertura de logs solo con 2 fixtures | A: 26 fixtures + reales verifican orden y texto de los 15 mensajes · B: los otros 24 fixtures solo por `analyze()` (parcial) | **Expresa** (crea un golden) |
| **D-A6-7** `getPolyCentroid` y centro | **A** la escena importa `getPolyCentroid` de `geom2d.js` hasta A7; el centro global sigue en la escena · **B** duplicarla en la escena · **C** mover ya el centro al motor | **A** | A: una excepción temporal a «solo `engine.js` es público» · B: dos copias que pueden divergir · C: cambia texto de `build3DFromPanels` (escena) en A6 | A: texto idéntico, prueba de límites con la excepción escrita · B: idem, pero sin garantía futura · C: requiere pruebas de escena (píxeles, UV) fuera del alcance de A6 | En bloque con A6 |
| **D-A6-8** CEP real | **A** sin validación real en A6; hacerla tras A7 cubriendo ambos · **B** validación corta tipo A5-CEP (V-1, V-2, V-5) al cerrar A6 | **A** | A: el bundle de A6 no se carga en CEP hasta A7 · B: una instalación más (riesgo de entorno ya conocido: extensiones en gris, documentos reales abiertos) | A: equivalencia apoyada en batería y bundle; A6 no cambia operaciones · B: evidencia real adicional (GLB = A5) | **Expresa solo si eliges B** (instalación con fecha de autorización) |
| **D-A6-9** Commit de la propuesta | **A** commit de la propuesta con las decisiones anotadas, antes de A6.0a · **B** sin commit | **A** | A: ninguno relevante · B: la base documental de A6 no queda versionada | Ninguna | **Expresa** (es un commit) |
| **D-A6-10** Quién implementa | **A** Opus en este chat · **B** Opus en chat nuevo con `HANDOFF.md` actualizado | Según tu política; si se aprueba pronto, **A** | A: contexto largo · B: rehacer el análisis desde el repo | Ninguna (mismo procedimiento) | Tu elección |

### D-A6-5 en detalle: adaptar herramientas sin perder capacidad de detección

Principio: **ninguna prueba ni mutación existente se elimina ni se relaja**; solo cambia *dónde* buscan el texto movido, y se añaden comprobaciones que hoy no existen.

**1. Cargador `tests/lib/legacy.mjs`**
- La lista de 24 funciones sigue siendo **obligatoria para los tres objetivos** (baseline, `panel/`, `src`). Para `src`, el cargador ya las encuentra en los módulos (lee `main.js` + todos los `.js` de `src/`, acepta funciones sin sangría con `export`).
- Desde A6.5 se añade una lista **obligatoria solo para `src`**: `['validateDieline']`. No es opcional: si falta en `src`, falla; si apareciera en baseline o `panel/`, también falla.
- Para `src`, el contexto de evaluación define `var geometryEngine = { validate: validateDieline };`, para que la `validateGeometry` de `main.js` (la parte DOM) se ejecute igual que hoy y `getProblems()` siga devolviendo los mismos problemas. El adaptador real (`createLegacyEngine`) no se evalúa ahí: lo cubre T4 importando el módulo ES real.
- **Nuevo:** el cargador falla si una función de la lista aparece **definida más de una vez** en el texto concatenado. Hoy una copia vieja olvidada en `main.js` sería ignorada en silencio (gana la última definición); desde A6 sería un error.
- **Nuevo:** cada constante (`TOLERANCE_MM`, `GRAPH_EPS`) debe aparecer **exactamente una vez**. El patrón de búsqueda ya acepta `export const`.

**2. Controles de mutación**
- Solo cambian **3 patrones**, con el mismo cambio de valor: `GRAPH_EPS 0.5→0.6` y `TOLERANCE_MM 0.5→0.4` (Node), y `GRAPH_EPS 0.5→0.6` (bundle). Pasan de `var GRAPH_EPS      = 0.5;` a `export const GRAPH_EPS = 0.5;`. Se cambian en el mismo commit que mueve las constantes (A6.1).
- Los otros 33 controles no cambian: sus patrones no llevan sangría y `mutsrc` aplica la mutación a todos los `.js` de la copia de `src/`, así que siguen aplicándose después de mover el código.
- El script ya falla con «NO APLICÓ» si un patrón no encuentra nada. **Nuevo:** también fallará si un patrón geométrico cambia **más de una línea** («APLICÓ N≠1»). Así una copia duplicada no puede esconder una mutación.
- **Controles nuevos (≥ 7):** `eps` de `buildAdjacency`; desempate del filtro de conectividad; umbral `0.001` de `computeFoldSign`; el adaptador pasa siempre base 0; el adaptador clona la entrada; `validateDieline` con `>=`; `core/` toca `document`. Además, **los primeros controles de geometría en navegador** (hoy ninguno de los 16 de navegador toca geometría): signo de pliegue y base del adaptador sobre «Geometría en página · bundle». Total previsto: 36 → **≥ 43**. Si alguno no se detecta, se documenta y se sustituye por otro que sí, como en A2.
- En cada paso se ejecuta `run-all.sh --mutations` antes del commit.

**3. Prueba de límites `tests/node/a5-limites.test.mjs`**
- Sus 5 pruebas se mantienen. Las 3 de reglas recorren **todos** los módulos de `src/`, así que pasan a cubrir también `core/` (sin THREE, sin `window`/`document` al cargar). Eso amplía la cobertura sin cambiar el texto de esas pruebas.
- Las 2 de inventario (lista exacta de archivos e imports exactos de `main.js`) se limitan a los archivos que **no** están en `core/`: siguen comparando con la lista exacta de A5 y siguen siendo igualdades exactas, no «contiene».
- La nueva `a6-limites` (T5) exige igualdad exacta para el inventario de `core/` y para los imports de `main.js` desde `core/` (`createLegacyEngine` y `getPolyCentroid`), y comprueba las reglas 1–6 de §4. El inventario se actualiza en cada paso de A6.1 a A6.6.

**4. Huella del bundle**
- `tests/lib/dist.mjs` apunta a la nueva `dist-a6.SHA256SUMS`. `dist-a5` queda congelada: la sigue leyendo `a5-cep-evidencia` (la evidencia real de A5 depende de `70de82a8…`).
- **Nuevo T7:** `dist-a5` debe seguir reproduciéndose desde el `src/` de `31459fc` (`git archive`). Así no queda como una huella huérfana.

**Qué no se toca:** goldens históricos, fixtures, `fixtures.pins.json`, `panel.pins.json`, `dist.SHA256SUMS`, el arnés de navegador (`setup_harness.py`, `harness.mjs`) y el contenido de las pruebas de geometría, defectos conocidos, GLB y puente.

## 12. Límites de este análisis

- Lo de §3 y §5.2 sale de leer `src/main.js` y las pruebas; I2 e I3 son [INFERENCIA]/[NO VERIFICADO] hasta A6.0a.
- No se ejecutaron mutaciones en esta intervención (≈25 min); la batería sin mutaciones sí (§1.1).
- El motor web solo se consultó para comprobar que su modelo (`buildFoldTopology` + árbol por base) cabe en el contrato v1 mediante un adaptador; no se integró ni se copió nada.
