# Fase 1 · A7 — Separación del estado de aplicación, la escena Three.js y el plegado: informe (punto de control PC8)

Fecha: 2026-10-26 · Autorización: el usuario aprobó la dirección técnica de `A7_PROPUESTA.md` el 2026-10-25 y autorizó A7.0a–A7.7 en modo autónomo y secuencial (decisiones anotadas en `A7_PROPUESTA.md` §12 bis; **sin `ResourceTracker`**; vista de depuración **solo de lectura**) · Base: `2939dbc` · Cierre: commit de A7.7 (ver `git log`).
Estado: **A7 completada dentro del alcance aprobado. Nada instalado ni cargado en Illustrator. A8, A9 y F2 NO iniciadas.** Etiquetas: **[MEDIDO]** · **[CONFIRMADO]** · **[INFERENCIA]** · **[NO VERIFICADO]**.

## 1. Resumen
El estado de dominio que compartían por nombre 71 funciones de la clausura de `src/main.js` pasa a un objeto sellado `S` (`src/app/state.js`, **26 campos**, mismos valores iniciales). La escena Three.js y el plegado salen a **7 módulos** de `src/scene/` y **2** de `src/fold/` (**35 funciones**). Esas funciones conservan **exactamente su texto**: solo cambian la sangría y el prefijo `S.`. Lo comprueba una prueba que deshace el prefijo y compara con el `src/main.js` de `2939dbc` (A6 validada en real). En el bundle, función a función, **todas** las funciones son idénticas en cada paso. En `main.js` quedan los orquestadores, la UI, la validación, la vista 2D y el GLB (A8/A9), más la raíz de composición. Se conservan las cuatro rutas de liberación de A1 y el orden de inserción en la escena (GLB byte a byte). Se añadieron invariantes de ciclo de vida (L1–L3), un inventario ordenado de la escena con golden desde el baseline y **11 controles negativos nuevos**, todos detectados. El rendimiento queda dentro del ruido. **No se corrigió ningún defecto**; KI-27 se registra como pendiente de confirmación.

## 2. Commits
| Commit | Paso | Contenido |
|---|---|---|
| `db5e592` | — | Propuesta aprobada con las decisiones anotadas + batería previa sobre `2939dbc` |
| `41e3fe2` | **A7.0a** | Caracterización sin tocar `src/`: inventario ordenado de la escena (golden desde el baseline), L1–L3, mensajes de estado, `a7-perf`; 3 controles nuevos |
| `af7090a` | **A7.0b** | Andamiaje: arnés con `__dbg` uniforme (neutral), huella vigente `dist-a7` (`dist-a6` congelada y reproducible), `a7-texto-identico`, `a7-limites`, `a7-arnes` |
| `67d698d` | **A7.1** | `src/app/state.js` (`S`, 26 campos) + `S.` en `main.js` (sin mover funciones) + `__tessDebugView` (solo lectura); 4 controles nuevos |
| `e84758c` | **A7.2** | `scene/three-utils`, `scene/labels` (caché privada), `scene/materials`, `fold/angles`; `a7-bundle-eq`; 1 control nuevo |
| `2336ef6` | **A7.3** | `scene/viewport`; 1 control nuevo |
| `30d3047` | (A7.3) | Investigación del umbral de rendimiento: artefacto de medida, sin degradación (§9) |
| `a1ad1c2` | **A7.4** | `scene/artwork`, `scene/panel-meshes` (D-A6-7 cerrada); 1 control nuevo |
| `7f12fbc` | **A7.5** | `scene/crease-visuals`, `fold/folding`; 1 control nuevo |
| (A7.7) | **A7.7** | Cierre: este informe, procedimiento CEP preparado y su prueba, referencia GLB, `KNOWN_ISSUES` (KI-27), `tests/README`, `HANDOFF` |
Todos con un solo autor, sin trailers de IA y sin push. Cada paso se cerró con `tests/run-all.sh --mutations --soak` en verde antes del commit (salidas en `docs/fase1/a7/run-all-A7.*.txt`).

## 3. Mapa definitivo de módulos [MEDIDO]
```
src/
  main.js           1078 l.  (1857 tras A6)  DOM, UI, orquestadores (buildFoldUI, setBasePanel, applyMaterialPreset, refreshArtwork, picking,
                             selección de pliegue), validación y vista 2D, GLB y PNG (A8), cableado, raíz de composición, __tessDebugView
  app/state.js        44 l.  createAppState(): S sellado con los 26 campos de dominio                                   importa: config/look
  scene/
    three-utils.js    26 l.  shapeFromVerts, disposeObject3D (sin estado)                                                —
    labels.js         61 l.  createLabels(): etiquetas P0…Pn + labelCache PRIVADA (A1)                                    —
    materials.js      41 l.  createMaterials(S): preset, colores, getFoldHingeRadius (muerta), refreshPanelMaterials       config/look
    viewport.js      175 l.  createViewport(S, deps): resize3D, updateCameraFromOrbit, init3D (renderer, luces, rejilla,
                             ejes, capa de órbita/pan/zoom/selección, bucle continuo KI-11), fitCamera3D                  —
    artwork.js       101 l.  createArtwork(S, deps): texturas, UV, overlays, liberación (L1), hasArtworkLoaded (muerta)    config/look, bridge/cep, three-utils
    panel-meshes.js  107 l.  createPanelMeshes(S, deps): clearAllMeshes (rutas A1, L3), build3DFromPanels;
                             creaseLinesGroup privada (muerta)                                                           three-utils, core/legacy/geom2d (getPolyCentroid)
    crease-visuals.js 223 l. createCreaseVisuals(S, deps): líneas, cajas de selección y puentes (L2)                      config/look, three-utils
  fold/
    angles.js         16 l.  createFoldAngles(S): signedDisplayAngle, internalAngleFromDisplay                            —
    folding.js       104 l.  createFolding(S, deps): applyFolding (jerarquía de pivotes; orden de inserción G1)          —
  core/ config/ host/ bridge/    sin cambios desde A6
```

Raíz de composición en `main.js`, en orden topológico: `S = createAppState()` → `createMaterials(S)` → `createLabels()` → `createFoldAngles(S)` → `createViewport(S, {canvas3d, viewport3d, log, setStatus, pickPanelFromEvent, pickCreaseFromEvent})` → `createArtwork(S, {refreshPanelMaterials})` → `createCreaseVisuals(S, {getFoldHingeHex, signedDisplayAngle, updateSelectedCreaseVisuals})` → `createPanelMeshes(S, {log, getPanelShellHex, getEdgeLineHex, applyArtworkToScene, disposeLabelCache, disposeCreaseVisuals})` → `createFolding(S, {makePanelLabelSprite, refreshPanelMaterials, rebuildCreaseVisuals})`. Las funciones se desestructuran **con sus nombres de siempre**, así que los orquestadores no cambiaron ni una letra.

**Reglas verificadas** (`a7-limites`, además de `a5-limites` y `a6-limites`): inventario exacto · `app/` sin THREE, `window` ni `document` · `scene/` y `fold/` no importan `main.js`, `host/` ni `bridge/fs`; solo `artwork.js` importa `bridge/cep` (`pathToFileURL`); de `core/` solo `getPolyCentroid` (**D-A6-7 cerrada**: `main.js` ya no importa nada de `core/` salvo `createLegacyEngine`); ninguna fábrica importa otra (solo `three-utils.js`) · `document` solo en `makeLabelCanvas` e `init3D`; `window` solo en `init3D` · sin estado de módulo · **regla 8**: ningún campo de `S` aparece sin `S.` en `main.js`, `scene/` ni `fold/` · todo se carga en Node sin `window`, `document` ni THREE.

## 4. Mapa definitivo del estado
| Dónde | Qué |
|---|---|
| **`S`** (`src/app/state.js`, sellado; 26) | material: `currentThicknessMm`, `currentMaterialPreset` · motor: `currentPanelData`, `currentAdjEdges` · plegado: `currentBasePanelIndex`, `baseSelectionConfirmed`, `foldTree`, `foldSigns`, `foldAngles`, `foldCenter`, `selectedFoldEdgeIdx` · escena de plegado: `foldRoot`, `panelGroupMap`, `panelLabelSprites` · visor: `renderer3d`, `scene3d`, `camera3d`, `raycaster3d`, `pointer3d`, `orbitState` · malla: `panelMeshes`, `foldData` · pliegues visuales: `creasePickables`, `creaseVisuals`, `foldBridgeGroup` · arte: `currentArtState` |
| **`main.js`** (9) | `lastData`, `problems`, `currentBaseSelect`, `currentCreaseRows`, `currentCreaseSliders`, `selectedCreaseLabelEl`, `selectedCreaseSliderEl`, `selectedCreaseNumberEl`, `interactionMode` |
| **Privado de su módulo** (2) | `labelCache` (`scene/labels.js`, corrección A1), `creaseLinesGroup` (`scene/panel-meshes.js`, código muerto conservado) |
| **Vista de depuración** | `__tessDebugView()` en `main.js`: los 18 *getters* del DBG heredado con `S.`, **sin `upd` ni `fold`** (sin escritura); no se llama ni se publica en `window`; el arnés la usa si existe (`a7-vista-depuracion`, `a7-arnes`) |

## 5. Pruebas [MEDIDO]
| Batería | Antes de A7 (`2939dbc`) | Cierre de A7 (`run-all.sh --mutations --soak`) |
|---|---|---|
| Node | 416 (415 + 1 omitida a propósito) | **442** (441 + la misma omitida): + `a7-texto-identico`, `a7-limites`, `a7-arnes`, `a7-vista-depuracion`, `a7-cep-preparacion` e histórico A6 en `build.test` |
| Navegador `browser` (con `--soak`) | 56 | **56** |
| Navegador `a7` (nuevo) | — | **13** (inventario × 6 + 2 comparaciones + golden; L1–L3 × 3 + comparación) |
| Chromium-99 · puente CEP · `a5-observar` · A4-CDP | 4 · 6 · 3 · 7 | 4 · 6 · 3 · 7 |
| Controles negativos | 46/46 | **57/57** (Node 24 · navegador 27 · bundle 6) |
| Aislamiento | verde | verde en cada paso (baseline intacto, instalada = baseline, V3 no instalada) |
Salida completa del cierre: `docs/fase1/a7/run-all-cierre-A7.txt` (34 min). **Soak:** GPU Δ=0 tras 25 ciclos de plegado en `panel/` y bundle (caja e ill), con y sin arte; el baseline crece (control positivo de KI-01).

**Pruebas nuevas:** `a7.test.mjs` (navegador: inventario ordenado de la escena en 7 flujos con golden desde el baseline, `userData` de paneles, mensajes de estado e invariantes L1–L3 con el baseline como control positivo) · `a7-texto-identico` · `a7-limites` · `a7-arnes` · `a7-vista-depuracion` · `a7-cep-preparacion` · histórico A6 en `build.test` (`dist-a6` se reproduce desde `2939dbc`). Herramientas: `tests/tools/a7-perf.mjs`, `tests/tools/a7-bundle-eq.mjs`.

**Controles negativos nuevos (11), todos con un fallo real que ve al menos una prueba:**
| # | Mutación | La detecta |
|---|---|---|
| 1 | `createFolding` trabaja sobre una copia de `S` tomada al crearse | Interacciones (bundle) |
| 2 | `createArtwork` trabaja sobre una copia de `S` | Arte (bundle) |
| 3 | `clearAllMeshes` deja de liberar los visuales de pliegue | L3 (A7) |
| 4 | `disposeObject3D` deja de recorrer los hijos | L2/L3 (A7) |
| 5 | `fold-bridges` se inserta delante en la escena (rompe G1, el orden del GLB) | Inventario ordenado (A7) |
| 6 | La vista de depuración devuelve otro campo en `baseIndex` | Interacciones (bundle) |
| 7 | Un campo de `S` sin prefijo en un módulo | `a7-limites` regla 8 (Node) |
| 8 | `resize3D` toca `document` | `a7-limites` (Node) |
| 9 | Espesor inicial 0.30 en `createAppState` | Regresión de píxeles/GLB (bundle) |
| 10 | `clearAllMeshes` libera la textura de arte compartida | L1 (A7) |
| 11 | `userData.center` calculado distinto | Inventario (A7); **antes no lo veía ninguna prueba** |
Adaptaciones de herramientas (D-A7-7), sin pérdida de detección: el patrón A6 de `setBasePanel` reescrito con `S.` (mismo efecto); dos patrones propios de A7.0a sin la sangría al pasar `clearAllMeshes` a su módulo; `tests/lib/a7.mjs` respeta `TESS_SRC_DIR`; `a5-limites` deja a `a7-limites` lo que es de `app/`, `scene/` y `fold/`; `a6-limites` sin `getPolyCentroid` en `main.js`; la precondición de `mutation-check.sh` muestra qué falla (solo diagnóstico).

## 6. Evidencia de equivalencia
**Texto [MEDIDO]:** `a7-texto-identico`: las 71 funciones de primer nivel de la clausura del `src/main.js` de `2939dbc` existen **una sola vez** en `src/` y con el **mismo texto** salvo sangría y `S.`; las líneas sueltas de `main.js` cambian exactamente como se previó (declaraciones que salen; imports, `S`, raíz de composición y comentarios que entran).
**Bundle función a función [MEDIDO]** (`tests/tools/a7-bundle-eq.mjs`, a cualquier sangría, sin `S.`):
| Paso | Funciones del bundle anterior idénticas en el nuevo | Funciones nuevas |
|---|---|---|
| A7.0b → A7.1 | 131/131 | `createAppState`, `__tessDebugView` |
| A7.1 → A7.2 | 133/133 | `createLabels`, `createMaterials`, `createFoldAngles` |
| A7.2 → A7.3 | 136/136 | `createViewport` |
| A7.3 → A7.4 | 137/137 | `createArtwork`, `createPanelMeshes` |
| A7.4 → A7.5 | 139/139 | `createCreaseVisuals`, `createFolding` |
| **A6 (2939dbc) → A7** | **131/131** | las 10 anteriores; ninguna función distinta, duplicada ni perdida |
Archivos: `docs/fase1/a7/equivalencia-funciones-*.txt`; diffs crudos en `diff-bundle-A7.*.txt`.
**Comportamiento [MEDIDO]** (baseline = `panel/` = bundle, en cada paso): píxeles en poses, escena (tipos, *draw calls*, triángulos), **GLB byte a byte** (4 poses × 2 fixtures) y su golden, materiales, arte (UV, desplazamientos, texturas), interacciones (Shift+clic, Alt+clic, órbita, pan, zoom, Esc), geometría en página = golden de Node, log de depuración en 5 flujos (texto y orden), puente CEP (30 casos, KI-24/25/26 intactos), Chromium 99 con APIs reducidas, **inventario ordenado de la escena** (= golden del baseline) y L1–L3.
**GLB con la extracción real de Illustrator** (`tools/a4/glb-baseline.mjs`, `docs/fase1/a7/glb-referencia-A7.json`): baseline = referencia A1 = **bundle A7**: plano `737bcd2312da1191…` (33 436 B) y todas a 60° `87aa2e4c5cc39092…` (54 224 B), 11 de 13 paneles, 0 errores: **los mismos hashes que A4, A5 y A6 obtuvieron en el CEP real**.

## 7. Rendimiento [MEDIDO en Chrome headless 155 / M1 Max; piso optimista, no CEP]
Bundle de referencia `2939dbc` (A6) frente al actual, corridas intercaladas en la misma sesión (`tests/tools/a7-perf.mjs`):
| Medición | construir | reconstruir | tick de plegado | exportar GLB | FPS reposo | FPS órbita |
|---|---|---|---|---|---|---|
| A7.0a (ruido A6↔A6, medida antigua) | 39.7 → 37.1 (-6.5 %) | 1.82 → 1.695 (-6.9 %) | 0.362 → 0.358 (-0.9 %) | 2.4 → 2.2 (-8.3 %) | 61.1 → 61.1 (0 %) | 60.8 → 60.8 (0 %) |
| A7.1 (medida antigua) | 38 → 38.6 (+1.6 %) | 1.665 → 1.735 (+4.2 %) | 0.35 → 0.35 (+0.1 %) | 2.8 → 3 (+7.1 %) | 61.2 → 61.3 (-0.2 %) | 60.8 → 60.8 (0 %) |
| A7.2 (medida antigua) | 39.8 → 41 (+3 %) | 1.88 → 1.97 (+4.8 %) | 0.358 → 0.353 (-1.5 %) | 2.2 → 2.2 (0 %) | 60.9 → 61.3 (-0.7 %) | 60.8 → 60.8 (0 %) |
| A7.3 (medida antigua) | 36.9 → 38.5 (+4.3 %) | 1.685 → 1.675 (-0.6 %) | 0.346 → 0.352 (+1.7 %) | 2.4 → 3 (+25 %) | 60.8 → 61.1 (-0.5 %) | 60.8 → 60.8 (0 %) |
| A7.3 investigación (10 corridas) | 38.15 → 38.55 (+1 %) | 1.698 → 1.735 (+2.2 %) | 0.353 → 0.351 (-0.5 %) | 5.8 → 5.9 (+1.7 %) | 61.05 → 61.3 (-0.4 %) | 60.8 → 60.8 (0 %) |
| ruido A7.3↔A7.3 (10) | 37.15 → 37.9 (+2 %) | 1.675 → 1.703 (+1.6 %) | 0.345 → 0.354 (+2.4 %) | 5.85 → 5.55 (-5.1 %) | 61.35 → 61.05 (+0.5 %) | 60.8 → 60.8 (0 %) |
| A7.4 (10) | 38 → 38.25 (+0.7 %) | 1.65 → 1.72 (+4.2 %) | 0.346 → 0.352 (+2 %) | 5.7 → 5.8 (+1.8 %) | 61.2 → 61 (+0.3 %) | 60.8 → 60.8 (0 %) |
| **A7.5 = cierre (10)** | 38.25 → 37.45 (-2.1 %) | 1.655 → 1.712 (+3.5 %) | 0.348 → 0.353 (+1.3 %) | 5.8 → 5.75 (-0.9 %) | 60.95 → 61.2 (-0.4 %) | 60.8 → 60.8 (0 %) |
(Cada celda: referencia A6 → actual, entre paréntesis la **degradación**: positivo = peor; en FPS, menos es peor.)
Umbral D-A7-13: > +10 % investigar, > +25 % detener. Ruido medido con dos bundles idénticos: hasta ±5 % (`rendimiento-A7.3-ruido-mismo-bundle.json`). **Incidencia A7.3:** la medida antigua del GLB dio +25 % por cuantización del sondeo; investigada y descartada, ver §9.

## 8. Huellas
| Huella | Estado |
|---|---|
| `tests/golden/dist-a7.SHA256SUMS` (**vigente**, nueva) | `main.js` = `9784ec70e103a1eb8f91d8d58e2104585466f498a94e554d41d994bcce8944fc`; los otros 12 archivos, idénticos a A6/A5/A4 |
| `dist-a6.SHA256SUMS` (A6, validada en CEP real) | **Intacta**; `build.test` la reproduce desde el `src/` de `2939dbc` |
| `dist-a5`, `dist` (A3/A4), `panel.pins.json`, `reference/legacy-baseline.SHA256SUMS` | **Intactas** |
| Goldens `geometry`, `geometry-logs`, `constants`, `glb`, `illustrator-real`, `fixtures.pins`, `a6.pins` | **Sin cambios** |
| Nuevos | `scene-inventory.golden.json` (solo desde el baseline) + `a7.pins.json` |

## 9. Incidencias
1. **Fallo intermitente en la precondición de Node de los controles negativos** (A7.0a, primer intento): la batería de Node pasó en su etapa y, minutos después, la precondición de `mutation-check.sh` falló. No se reprodujo en 5 corridas seguidas ni en la repetición completa ni en ninguna batería posterior. Causa: [NO VERIFICADO]. Desde entonces la precondición imprime las pruebas que fallen. Ambas salidas en `docs/fase1/a7/`.
2. **Rendimiento A7.3:** «DETENER (+25 %)» en `glb_export_ms` (2.4 → 3.0 ms). Era un artefacto: la medida sondeaba con `setTimeout(1)`. Con un `MutationObserver` y 10 corridas: +1.7 % (ruido ±5 %). **Error de proceso propio:** el commit de A7.3 se encadenó a la medición y se hizo antes de leerla. Se investigó antes de avanzar (`rendimiento-A7.3-INVESTIGACION.md`) y desde entonces la medición se lee antes de cada commit.
3. **Errores propios en herramientas de prueba, corregidos antes de cada commit:** dos patrones de A7.0a llevaban la sangría de `main.js` y dieron «NO APLICÓ» al moverse `clearAllMeshes` (A7.4, primer intento). Al reescribirlos dejé un comentario delante del argumento del archivo de prueba y dieron «NO DETECTADA» (segundo intento). Además: una comprobación de puentes que miraba el `parent` de la malla y no el del grupo (A7.0a); el filtro de funciones nuevas a sangría ≤ 2 (A7.1); el orden de la línea de `setStatus` del arnés (A7.0b). Ninguno afectó al producto.
4. **Entorno:** en el shell interactivo, `find` es `bfs` y trata `{}` dentro de un argumento como marcador. Los scripts de controles usan `bash` con el `find` de BSD, así que no les afecta. Solo afectó a una comprobación manual, repetida con `bash`.

## 10. Defectos y riesgos pendientes
- **Ningún defecto cambia.** KI-01 sigue corregido (Δ=0, soak de 25 ciclos, L1–L3); KI-04/KI-22 (11 de 13), KI-06 (hueco), KI-11 (bucle continuo), KI-14, KI-24 (mismo `ReferenceError` en el mismo punto), KI-25 y KI-26, preservados.
- **KI-27 (nuevo, pendiente de confirmación, no corregido):** textura frontal no liberada si la trasera falla en «Refresh Artwork»; sin efecto en GPU [INFERENCIA].
- **Lagunas de cobertura** (`KNOWN_ISSUES.md` § A7): código muerto conservado (solo lo protege `a7-texto-identico`), espesor inicial con el mismo texto de estado por KI-14. `userData.center` queda **cubierta**.
- **Riesgos para A8/A9:** la exportación GLB (A8) depende del orden de inserción en la escena (invariante G1, ya protegido por el inventario ordenado y el GLB byte a byte) y lee `S.scene3d`/`S.foldRoot`. Los orquestadores con DOM (`buildFoldUI`, `setBasePanel`, `applyMaterialPreset`, `refreshArtwork`, picking) y `updateSelectedCreaseVisuals` (escena + filas DOM) siguen en `main.js` para A9. El estado de plegado se sigue reiniciando en dos sitios (`buildFoldUI` y `setBasePanel`), igual que antes.

## 11. Qué NO se verificó [NO VERIFICADO]
El bundle de A7 **no se cargó en Illustrator/CEP real** (no autorizado). La equivalencia se apoya en Node, los módulos reales, Chrome headless 155 y las APIs reducidas a Chromium 99, no en el Chromium 99 auténtico. Tampoco: rendimiento en CEP, Windows, troqueles de trabajo distintos de los fixtures, ni la causa de la incidencia 1.

## 12. Validación corta en Illustrator real (preparada, NO ejecutada)
`docs/fase1/A7_VALIDACION_CEP_PROCEDIMIENTO.md`: V-1 identidad (`main.js` = `9784ec70…`) · V-2 paridad de la caja contra la evidencia **real de A6**, con el comparador existente y referencia explícita · V-3 GLB `737bcd23…`/`87aa2e4c…` · V-4 arte en N0-B (paridad y GLB `b4973a54…`) · **V-5 GPU Δ=0 en real** · V-6 cierre y rollback. `tests/node/a7-cep-preparacion.test.mjs` comprueba las referencias reales de A6 y el comparador. **Requiere autorización expresa y fechada.**

## 13. Punto de control PC8 — decisiones del usuario
1. Aceptar A7 con la puerta G-A7 (E1–E6) cumplida y las incidencias declaradas.
2. Autorizar (con fecha), o no, la validación corta en CEP real del §12.
3. Siguiente paso: A8 (GLB), A9 (UI) o F2/2A (KI-22). **Ninguno se inicia sin nueva autorización.**
