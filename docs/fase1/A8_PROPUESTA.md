# Fase 1 · A8 — Extracción y modularización del subsistema de exportación GLB: propuesta

Fecha: 2026-10-26 · Base: `a322d7a` (A7 + A7-CEP, validada en Illustrator real) · Estado: **SOLO ANÁLISIS Y PROPUESTA. No se ha tocado `src/`, `panel/`, goldens, huellas ni el plugin original. A8 no está autorizada; esperar decisiones (§13).**
Etiquetas: **[MEDIDO]** · **[CONFIRMADO]** · **[INFERENCIA]** · **[NO VERIFICADO]**. Todo lo marcado [MEDIDO] se comprobó hoy sobre el repositorio (sin escribir en él: solo lecturas y la batería, que escribe en `tests/results/`, ignorado por git).

## 1. Verificación previa (tarea 1)

| Comprobación | Resultado |
|---|---|
| Git | HEAD `a322d7a`, árbol limpio, sin remoto, 46 commits de un solo autor (`Gerardo Calambas posada`) [MEDIDO] |
| `tools/verify-isolation.sh` | Verde: baseline 15/15 intacto, extensión instalada = baseline, `panel/` con las diferencias esperadas (`main.js`, sin `main.js.bak`), V3 no instalada [MEDIDO] |
| CEP de usuario | Solo `TesserArt_Validator` (V3 ausente) [MEDIDO] |
| Huella vigente `dist-a7.SHA256SUMS` | `dist/` actual = huella: 13/13 archivos OK (`main.js` `9784ec70…`) [MEDIDO] |
| Batería previa `tests/run-all.sh` (sin `--mutations` ni `--soak`) | **TODO EN VERDE** (exit 0): aislamiento · build · Node 446/447 (1 omitida a propósito) · navegador 52/52 · `a7` 13/13 · Chromium-99 4/4 · puente CEP 6/6 · `a5-observar` 3/3 · A4-CDP 7/7 [MEDIDO]. Salida: `docs/fase1/a8/run-all-precheck-a322d7a.txt`. Los controles negativos y el soak se ejecutan en A8.0a, no en esta fase de análisis |
| Los tres GLB validados en Illustrator real | `docs/fase1/a7-real/glb/`: `paridad-caja-plano.glb` (33 436 B, `737bcd23…`), `paridad-caja-todas60.glb` (54 224 B, `87aa2e4c…`), `paridad-arte.glb` (295 440 B, `b4973a54…`). Los mismos hashes en `a4-real`, `a5-real` y `a6-real`: **cuatro versiones sucesivas del bundle en CEP real produjeron exactamente estos bytes** [MEDIDO, `shasum`] |

## 2. Inventario de exportación y qué toca cada pieza (tarea 2)

Todo el subsistema vive hoy en `src/main.js` (A7 lo dejó allí a propósito, `A7_INFORME` §10). Líneas de `a322d7a`:

| # | Función | Líneas | Rol | Lee | Efectos / dependencias de entorno |
|---|---|---|---|---|---|
| 1 | `exportPNG` | 606–611 | captura 3D → `<a download>` (botón `export-3d-btn`; KI-12) | `S.renderer3d` | DOM (`<a>`), `toDataURL`. **No es GLB** |
| 2 | `bytesFromDataURL` | 613–623 | `data:` URL → `{mime, bytes}` | — | `atob` |
| 3 | `textureToImageBytes` | 625–646 | textura → bytes PNG (re-codifica) | `texture.image` | `document.createElement('canvas')`, `HTMLCanvasElement`, `drawImage`, `toDataURL`; **`log()`** en la rama de fallo (dentro de `try/catch` silencioso) |
| 4 | `padBytes` | 648–655 | relleno a múltiplo de 4 | — | puro |
| 5 | `toUint8View` | 657–659 | vista `Uint8Array` de un typed array | — | puro |
| 6 | `typedArrayFromList` | 661–665 | lista → typed array | — | puro |
| 7 | `buildExportSceneMeshes` | 667–721 | recorre la escena y produce los registros de malla en espacio mundo | **`S.scene3d`** | `THREE` (global): `Vector3`, `Matrix3`; **`updateMatrixWorld(true)`**; `geometry.clone()`; `computeVertexNormals()` (solo en el clon) |
| 8 | `materialKey` | 723–730 | clave de deduplicación de materiales | `mat.color/opacity/side/map` | `THREE.DoubleSide`; `map.uuid` |
| 9 | `buildGLBBlobFromCurrentView` | 732–865 | ensambla JSON + BIN y devuelve el `Blob` (135 líneas; 5 clausuras internas: `appendBytes`, `addAccessorFromTyped`, `ensureSampler`, `ensureTexture`, `ensureMaterial`) | (indirecto: 7, 8, 3) | `THREE.Color`, `TextEncoder`, `Blob`, `DataView`; sin DOM propio |
| 10 | `exportGLB` | 867–882 | orquesta: guarda `S.scene3d`/`S.foldRoot`, construye el Blob, abre el diálogo, escribe estado | **`S.scene3d`, `S.foldRoot`** (solo guarda) | `updateMatrixWorld`, `saveBlobWithDialog` (`bridge/fs`), **`setStatus()`** |
| 11 | manejador `export-glb-btn` | 1025–1034 | estado «Exporting GLB…» → `exportGLB` → «GLB exported from current 3D pose» (KI-25) o `log` + `debug-details.open` | — | DOM, `setStatus`, `log` |
| — | `saveBlobWithDialog` y ayudantes | `bridge/fs.js` (A5.4) | diálogo ExtendScript, Base64, `cep.fs.writeFile`, descarga de respaldo | — | **ya extraído; fuera de A8** |
| — | `SAVE_GLB_DIALOG_SCRIPT` | `host/save-dialog.js` (A5.2) | ES3 de Illustrator | — | **ya extraído; fuera de A8** |

**Texto frente a las referencias congeladas [MEDIDO]:** las funciones 2–6, 8 y 9 son **idénticas carácter a carácter** en `reference/legacy-baseline/main.js`, `panel/main.js` y `src/main.js`. Las funciones 1, 7 y 10 difieren **solo** en el prefijo `S.` de `scene3d`/`foldRoot`/`renderer3d` (comprobado: tras quitar `S.` son idénticas a `panel/main.js`). Es decir, el subsistema no ha cambiado desde el baseline; A8 parte de una base estable.

**Quién llama a quién:** `exportGLB` → `buildGLBBlobFromCurrentView` → `buildExportSceneMeshes`, `materialKey`, `textureToImageBytes` → `bytesFromDataURL`; `padBytes`/`toUint8View`/`typedArrayFromList` las usan 7 y 9. Nada fuera de las funciones 1–11 las invoca [MEDIDO, `grep`]. **Ningún test nombra estas funciones** (solo `a5-limites`/`bridge-*` mencionan `saveBlobWithDialog`): se prueban siempre por el botón y los bytes resultantes. Eso es bueno: refactorizar no rompe pruebas por nombre, pero también indica que **la cobertura es solo de extremo a extremo** (§6).

### 2.1 Efectos secundarios, en orden de ejecución (clic en «Export GLB»)
1. `setStatus('Exporting GLB…')` (DOM de estado).
2. `exportGLB`: guarda `S.scene3d && S.foldRoot` o lanza `Error('Build 3D first')`.
3. `S.scene3d.updateMatrixWorld(true)` (y otra vez dentro de `buildExportSceneMeshes`): **única mutación de la escena** — refresca la caché `matrixWorld` de todos los objetos; idempotente y sin efecto visible.
4. Por cada malla exportable: `geometry.clone()` (memoria JS; no crea recursos GPU; **el clon nunca se libera con `dispose`**, lo recoge el GC).
5. Por cada textura única: un `<canvas>` desconectado del DOM, `drawImage` y `toDataURL('image/png')` (KI-13: ≈1.4 s con arte de 4096 px).
6. El `Blob` se construye **antes** de abrir el diálogo (invariante: la pose exportada es la del instante del clic).
7. `saveBlobWithDialog`: `evalScript` (diálogo de Illustrator) → `FileReader` → `cep.fs.writeFile` (o `<a download>` de respaldo).
8. `setStatus` del resultado y luego el del manejador (KI-25 sobrescribe).
**No se tocan** `S` (ningún campo), la cámara, los materiales ni el estado de plegado. No se crean texturas, geometrías ni programas en la GPU [INFERENCIA fuerte, a fijar con `renderer.info` en A8.0a].

## 3. Cómo se consumen estado, geometría, materiales, artwork y escena (tarea 3)

| Fuente | Qué lee la exportación | Cómo llega | Notas para la modularización |
|---|---|---|---|
| **Estado `S`** | Solo `S.scene3d` (raíz del recorrido y `updateMatrixWorld`) y `S.foldRoot` (únicamente como guarda en `exportGLB`). **No** lee ángulos, espesor, preset, base ni `currentArtState` | `S` sellado de A7 | La pose entra **a través de las matrices de la escena**, no del estado de plegado. El espesor ya está horneado en las geometrías |
| **Escena** | Recorrido `traverse` (preorden) desde `S.scene3d`; filtros: no-`isMesh`; `userData.role` ∈ {`pickCrease`,`panelLabel`}; material `transparent` con `opacity < 0.01`; sin `geometry` o sin atributo `position` | Orden de inserción de A7 (invariante **G1**) | El **orden de los nodos del GLB es el orden del recorrido**. Las luces, la rejilla (`GridHelper`), los ejes, `LineSegments` de aristas y `Line` de pliegues no son `Mesh` y quedan fuera. **Nadie usa `Object3D.visible = false`** [MEDIDO, `grep`], así que ese filtro no existe ni hace falta hoy |
| **Geometría** | `BufferGeometry` de cada malla: `position`, `normal` (si falta, `computeVertexNormals` sobre el clon), `uv`, `index` (si falta: secuencial). Posiciones y normales se **hornean en espacio mundo** con `matrixWorld` y la `normalMatrix`; los nodos del GLB **no llevan TRS** | `ExtrudeGeometry` (paneles), `ShapeGeometry` (superposiciones de arte), puentes de pliegue | Sin jerarquía en el GLB: un nodo por malla, plano. Umbral `Uint16` si `max(índices) < 65535` |
| **Materiales** | `color.r/g/b`, `opacity`, `transparent`, `side` (solo para la clave), `map` | `MeshPhongMaterial` (paneles, color del preset), `MeshBasicMaterial` (arte y puentes con arte) | Salida fija: `metallicFactor 0`, `roughnessFactor 1`, `doubleSided true`, `alphaMode BLEND` si `alpha < 0.999` o `transparent`. **Numeración por primer uso** (`mat_0…`). Deduplicación por `materialKey` |
| **Artwork** | `material.map` (textura) → PNG re-codificado por canvas; texturas deduplicadas por `uuid` | `scene/artwork.js` y `crease-visuals.js` (las mismas texturas frontal/trasera alimentan superposiciones y puentes ⇒ 2 imágenes, 4 materiales en `paridad-arte.glb`) | `uuid` es aleatorio por sesión pero **no entra en la salida** (solo indexa un mapa) ⇒ los bytes son deterministas |
| **Entorno** | `THREE` (r132, global), `document`, `HTMLCanvasElement`, `atob`, `TextEncoder`, `Blob`, `DataView` | `index.html` carga `libs/three.min.js` | Los módulos deben referirse a ellos **en tiempo de llamada**, nunca al importarse (regla vigente de `a5-limites`/`a7-limites`) |

**Estructura real del GLB [MEDIDO, parseo de los tres archivos reales]** (todo esto es lo que A8 debe preservar):
- Claves del JSON, **en este orden**: `asset, scene, scenes, nodes, meshes, materials, accessors, bufferViews, buffers` y, solo con arte, `images, textures, samplers` (en ese orden: `samplers` se crea dentro del argumento de `textures.push`, después de `images`). El orden de claves es parte de los bytes.
- `asset = {version:'2.0', generator:'Tesseract Phase 7B'}`; sin `extensionsUsed`; unidades en mm (KI-03).
- Por cada malla, `bufferViews`/`accessors` en el orden **POSITION, NORMAL, TEXCOORD_0, índices, [imagen si el material de esa malla estrena textura]** (en `paridad-arte.glb` las imágenes están en las vistas 8 y 13, justo tras las 4 vistas de la malla que las estrena).
- Cada vista se alinea a 4 bytes con relleno `0x00` *antes* de ella; el chunk JSON se rellena con `0x20` y el BIN con `0x00`; cabeceras little-endian.
- Nombres de nodo: `obj.name || userData.role || 'mesh_' + (índice en la lista de exportación)`. Los paneles salen como `mesh_0…mesh_10`; los puentes, `foldBridgeTop`/`foldBridgeBottom` (repetidos). Plano: 11 nodos/2 materiales; a 60°: 31 nodos/3 materiales; con arte: 6 nodos/4 materiales/2 imágenes/1 sampler.

## 4. Fronteras de módulo y contratos (tareas 4 y 5)

Principio de A5–A7 que se mantiene: **mover texto, no reescribirlo.** Las ocho funciones 2–9 se mueven con el **mismo texto** (salvo sangría, `export` y el prefijo `S.`); ninguna se parte, se renombra ni se reordena internamente. Se conserva la raíz de composición en `main.js` y los nombres de siempre vía desestructuración, de modo que `buildGLBBlobFromCurrentView` sigue viendo `buildExportSceneMeshes`, `materialKey`, `textureToImageBytes`… como identificadores de clausura.

### 4.1 Propuesta recomendada: `src/export/` con 4 módulos
```
src/export/
  glb-bytes.js    padBytes, toUint8View, typedArrayFromList          puro: sin THREE, DOM, window ni S           importa: —
  glb-image.js    createGlbImage({ log }) → { bytesFromDataURL, textureToImageBytes }
                                                                      único módulo de export con DOM (canvas)     importa: —
  glb-scene.js    createGlbScene(S) → { buildExportSceneMeshes }     THREE global + S.scene3d                     importa: —
  glb-builder.js  createGlbBuilder({ buildExportSceneMeshes, textureToImageBytes })
                    → { materialKey, buildGLBBlobFromCurrentView }   THREE global (Color, DoubleSide), TextEncoder, Blob
                                                                      importa: glb-bytes (solo los 3 ayudantes puros)
```
`bytesFromDataURL` se queda con `textureToImageBytes` porque solo la usa esta. `materialKey` se queda con el constructor porque solo la usa `ensureMaterial`.
**Se queda en `main.js`** (decisión D-A8-2): `exportPNG`, `exportGLB` y el manejador del botón (mezclan `setStatus`/`log`/`debug-details`, que son UI de A9, y el efecto KI-25), más la importación de `saveBlobWithDialog`.

Raíz de composición añadida a `main.js`, en orden topológico, tras `createFolding`:
`createGlbImage({log})` → `createGlbScene(S)` → `createGlbBuilder({buildExportSceneMeshes, textureToImageBytes})`; luego `var { bytesFromDataURL, textureToImageBytes } = …` etc., y `exportGLB` llama a `buildGLBBlobFromCurrentView` exactamente igual que hoy. `main.js` pasa de 1 078 a ≈ 830 líneas (salen las líneas 613–865).

**Alternativa (D-A8-1):** un único `src/export/glb.js` con `createGlbExporter(S, {log})` (≈ 260 líneas, menos costuras, pero mezcla el único código con DOM con el resto y obliga a mover todo en un solo paso). Recomiendo los 4 módulos: cada uno es un commit pequeño con su propio control negativo y el DOM queda confinado a una función.

### 4.2 Reglas de frontera (a verificar por una prueba `a8-limites`, como `a7-limites`)
1. `glb-bytes.js` sin `THREE`, `window`, `document`, `S`; solo exporta los tres ayudantes.
2. `document`/`HTMLCanvasElement` **solo** dentro de `textureToImageBytes` (`glb-image.js`); `window`: en ninguno.
3. `THREE` solo dentro de `buildExportSceneMeshes`, `materialKey` y `ensureMaterial`; nunca al evaluar el módulo.
4. `S` solo en `glb-scene.js`, siempre con el prefijo `S.`, y únicamente `S.scene3d` (regla nueva: el módulo no puede leer ningún otro campo).
5. Ningún módulo de `export/` importa `main.js`, `host/`, `bridge/`, `scene/`, `fold/` ni `core/`; ninguna fábrica importa otra (solo `glb-bytes.js`, que es de utilidades puras, como `three-utils.js`).
6. `bridge/fs.js` y `host/save-dialog.js` **no se tocan**.
7. Todos los módulos se cargan en Node sin `window`, `document` ni `THREE`.
8. **Nueva (lección de KI-24):** comprobación estática de identificadores libres: ninguna función movida referencia un nombre que no sea local, importado, global esperado (`THREE`, `document`, `HTMLCanvasElement`, `atob`, `TextEncoder`, `Blob`, `DataView`, `Uint8Array`, `Float32Array`…) o dependencia inyectada. Un nombre mal cableado en una clausura solo falla *al ejecutarse esa ruta* (así nació KI-24).

### 4.3 Contratos (v1; descriptivos, sin funcionalidad nueva)
| Contrato | Entrada | Salida | Precondiciones / invariantes |
|---|---|---|---|
| `ExportMesh` (registro) | — | `{ name:string, positions:Float32Array(3n), normals:Float32Array\|null, uvs:Float32Array\|null, indices:Uint16Array\|Uint32Array, min:[x,y,z], max:[x,y,z], material:THREE.Material }` | posiciones y normales en **espacio mundo**; `min/max` calculados sobre las posiciones mundo en doble precisión (antes de convertir a `Float32`) |
| `buildExportSceneMeshes()` | lee `S.scene3d` | `ExportMesh[]` (`[]` si no hay escena) | **I-E1** orden = recorrido en preorden (G1); **I-E2** solo muta la caché `matrixWorld`; **I-E3** no modifica geometrías, materiales ni hijos de la escena; **I-E4** no crea recursos GPU |
| `materialKey(mat)` | material o `undefined` | `string` (`'default'` si falta) | determinista dentro de la sesión; distingue color, opacidad, `side` y mapa |
| `textureToImageBytes(tex)` | `THREE.Texture` | `{mime, bytes:Uint8Array}` o `null` | `null` si falta imagen o tamaño; ante excepción devuelve `null` y escribe «Texture image encode failed: …» en `log` |
| `buildGLBBlobFromCurrentView()` | escena actual vía los tres anteriores | `Blob` (`model/gltf-binary`) | lanza `Error('Nothing exportable in current 3D view')` si no hay mallas; **I-G1** nodos en el orden de `ExportMesh[]`; **I-G2** materiales, imágenes, texturas y sampler numerados por primer uso; **I-G3** orden de `bufferViews`/`accessors` (§3); **I-G4** orden de claves del JSON; **I-G5** alineación 4 B y relleno `0x00/0x20`; **I-G6** constantes de KI-03 (mm, `roughness 1`, `doubleSided`, sin extensiones, generador `Tesseract Phase 7B`) |
| `exportGLB()` (queda en `main.js`) | — | `Promise<Blob>` | **I-X1** el Blob se construye *antes* de abrir el diálogo; mensajes de estado y KI-25 intactos |
Todos los contratos describen **el comportamiento actual incluidos sus defectos**; ninguno promete corregirlos.

## 5. Qué NO se toca (restricciones, repetidas para el cierre)
GLB exportados (bytes), algoritmos geométricos, plegado y escena, `three.js r132`, artwork, materiales, interfaz, defectos conocidos (KI-02, KI-03, KI-12, KI-13, KI-25 y los demás), el plugin original, `reference/`, `panel/`, goldens e huellas históricas. V3 no se instala. A9 y F2 no se inician. La separación del contenedor GLB puro del resolvedor de materiales, el cambio de unidades, las normales y cualquier extensión **son trabajo de Fase 5** y quedan fuera (D-A8-3).

## 6. Pruebas de equivalencia byte a byte (tarea 6)

### 6.1 Lo que ya protege el GLB hoy [MEDIDO, por lectura de las pruebas]
`browser.test.mjs` §«Exportación GLB»: baseline = `panel/` = bundle **byte a byte** en 4 poses × 2 fixtures (diferencial en la misma sesión de Chrome); estructura contra `glb.golden.json`; regresión de píxeles/escena/GLB; mutaciones del generador y de la rugosidad; `bridge.test.mjs` (guardado, KI-25); `a7.test.mjs` (inventario ordenado de la escena = lo que el recorrido ve); `a4-cdp`, `chromium99`. **Lagunas:** (G-1) **ninguna prueba comprueba que el bundle reproduzca los *archivos* reales** de CEP (los hashes `737bcd23…`/`87aa2e4c…` solo están en informes y en pruebas de evidencia); (G-2) la rama de fallo de `textureToImageBytes` (y la ruta `HTMLCanvasElement`) no se ejercita; (G-3) las ramas `Uint32`, «sin normales», «sin UV», «opacidad < 0.01» y «`pickCrease`/`panelLabel`» no son alcanzables con los troqueles actuales, pero están en el texto y A8 las movería sin red; (G-4) el orden de las claves del JSON y de las `bufferViews` solo lo ve la comparación byte a byte completa.

### 6.2 Diseño: cuatro niveles
| Nivel | Qué compara | Cómo | Cubre | Estado |
|---|---|---|---|---|
| **N1 — archivos reales** (tabla 1 de la validación) | GLB producido por baseline, `panel/` y bundle ≡ `docs/fase1/a7-real/glb/paridad-caja-plano.glb` y `…-todas60.glb` **byte a byte** (`Buffer.compare`, no solo hash) | Chrome headless con la extracción real `ill-real-caja-botanica.dieline.json` y el guion de `tools/a4/glb-baseline.mjs` (ya reproduce ambos hashes: [MEDIDO] `docs/fase1/a7/glb-referencia-A7.json` = real). Se promueve a prueba permanente (`tests/browser/a8.test.mjs`) | I-G1…I-G6 para los dos GLB sin arte | Factible hoy: **los hashes de headless ya coinciden con los reales** |
| **N2 — diferencial en sesión** (existente, ampliado) | baseline ≡ `panel/` ≡ bundle, incluido el **GLB con arte** (arnés determinista) | Mantener las 4 poses × 2 fixtures y añadir 2 estados: arte activado antes/después de plegar, y reexportación consecutiva (determinismo: dos exportaciones seguidas ⇒ mismos bytes) | Rutas de arte, deduplicación de texturas e imágenes, orden de imágenes | Existe; se amplía |
| **N3 — esqueleto del GLB con arte real** | `paridad-arte.glb` ≡ GLB de headless **salvo los bytes de las dos imágenes PNG** | Parsear ambos; comparar el JSON completo con `byteOffset/byteLength` normalizados y el BIN con los rangos de imagen enmascarados; las dos imágenes se comparan *por píxeles decodificados* | I-G2/G3/G4 con arte (4 materiales, 2 imágenes, 1 sampler, claves `images,textures,samplers`) | **A medir en A8.0a** si Chrome 155 reproduce los PNG de Chromium 99 byte a byte; si lo hace, N3 pasa a ser byte a byte completo [NO VERIFICADO]. Lo que **no** puede reproducirse en headless es el PNG de Illustrator (el arte real de N0-B) |
| **N4 — diferencial de módulo en Node (nuevo)** | Texto de referencia (extraído por nombre de `panel/main.js`) frente a los módulos de `src/export/`, sobre escenas sintéticas | Cargar `libs/three.min.js` r132 en un `vm` ([MEDIDO] que carga en Node: `REVISION 132`), construir escenas con mallas, grupos, materiales y texturas falsas (`image` de lienzo simulado) y comparar los `Blob` byte a byte con `arrayBuffer()`. Corpus: ≥ 30 escenas generadas con semilla fija: sin normales, sin UV, índices > 65 535, mallas con `opacity < 0.01`, `pickCrease`, `panelLabel`, material sin color, textura compartida, texturas distintas con igual color, nombres vacíos, jerarquías con TRS | Todas las ramas de 7, 8 y 9, incluidas las inalcanzables desde la interfaz (G-3) | Nuevo; es el único nivel que ve el código «muerto» |

**Control del mismo error en los dos lados:** N1 y N3 comparan contra archivos **que ningún código de A8 genera** (los de Illustrator real), así que no pueden coincidir por error compartido; N2 y N4 son diferenciales y solo valen mientras la referencia (`panel/`, baseline) permanezca congelada.

### 6.3 Pruebas de efectos y de contratos (A8.0a, antes de mover nada)
- **E1 — no mutación:** instantánea estructural de la escena (tipos, orden, uuids, `position/rotation/scale`, contadores de geometría/material/textura) antes y después de exportar ⇒ idéntica, salvo la caché `matrixWorld` (que se compara tras forzar `updateMatrixWorld`).
- **E2 — sin GPU:** `renderer.info.memory` y `programs.length` iguales antes y después de exportar 25 veces.
- **E3 — determinismo:** dos exportaciones consecutivas ⇒ bytes idénticos (con y sin arte).
- **E4 — errores y mensajes:** `Build 3D first` (sin escena), `Nothing exportable in current 3D view`, `GLB export failed: …` + `debug-details.open`, y el log «Texture image encode failed: …» (con `drawImage` forzado a lanzar). **Importante:** `log` en esa rama está dentro de un `try/catch` silencioso; si el cableado de `log` se perdiera al mover el código, nada fallaría salvo esta prueba.
- **E5 — orden de eventos (I-X1):** el Blob existe antes de que se llame a `askSavePathViaIllustrator` (se observa con el `evalScript` sustituido del arnés).
- **E6 — inventario del GLB exportado:** nombre, índice de material, y orden de vistas de cada nodo, con golden **solo desde el baseline** (`tests/golden/glb-structure.golden.json`, nuevo), análogo a `scene-inventory.golden.json` de A7.

### 6.4 Controles negativos nuevos (≥ 14; cada uno debe hacer fallar al menos una prueba, o declararse laguna)
1 orden de claves (`samplers` antes de `images`) · 2 la imagen se añade *antes* de los accessors de la malla · 3 sin relleno de alineación en `appendBytes` · 4 relleno del JSON `0x20 → 0x00` · 5 umbral `Uint16` 65535 → 65534 · 6 umbral de opacidad 0.01 → 0.02 · 7 `pickCrease` deja de filtrarse · 8 `panelLabel` deja de filtrarse · 9 normales sin `normalMatrix` · 10 nombre `mesh_` + índice → posición en la escena · 11 deduplicación de texturas por `uuid` desactivada · 12 `materialKey` sin `side` · 13 `ensureMaterial`: `alphaMode` deja de depender de `transparent` · 14 `textureToImageBytes` sin `log` cableado · 15 `buildExportSceneMeshes` trabaja sobre una copia de `S` (patrón A7) · 16 `exportGLB` abre el diálogo antes de construir el Blob. El arnés actual (`mutation-check-*.sh`) aplica el `sed` a **todos** los `.js` de una copia de `src/` y exige que cambie exactamente una línea, por lo que los patrones sobreviven al cambio de archivo [MEDIDO, lectura]; solo hay que garantizar que sigan siendo únicos tras el movimiento (`NO APLICÓ` los delata).

## 7. Qué hay que ajustar en las pruebas existentes (sin debilitarlas)
`a7-texto-identico` fija 71 funciones contra `2939dbc`; para A8 se crea `a8-texto-identico` con referencia **`src/main.js` de `a322d7a`** (A7 validada en real, vía `git show`) y, además, `panel/main.js` normalizado por `S.` para las ocho funciones; `a7-texto-identico` se conserva con su referencia histórica (las 8 funciones saldrían de `main.js`, así que su lista se actualiza *en el mismo paso aprobado* con la ubicación nueva, como se hizo en A7.2–A7.5). `a5-limites` y `a7-limites` extienden su inventario con `export/` (no se relajan). `tests/lib/a7.mjs` se reutiliza. `mutation-check-*.sh` añaden las precondiciones de las pruebas A8.

## 8. Secuencia incremental con commits reversibles (tarea 7)
Cada paso termina con `tests/run-all.sh --mutations --soak` en verde, `verify-isolation.sh` verde y **una lectura de rendimiento antes del commit** (lección de A7.3). Cada commit se revierte con `git revert <hash>` sin tocar los demás.

| Paso | Cambio | Toca `src/` | Riesgo | Control específico |
|---|---|---|---|---|
| **A8.0a** | Caracterización: N1, N2 ampliado, E1–E6, golden de estructura desde el baseline, harness N4 (solo las pruebas, con la referencia extraída de `panel/main.js`), los controles negativos aplicables hoy a `main.js` (1–14 y 16; el 15 se añade en A8.3) | No | Bajo | Todo verde contra el `src/` actual; el baseline y `panel/` son control positivo |
| **A8.0b** | Andamiaje: `a8-texto-identico` (estado «nada movido»), `a8-limites` (estado «sin `export/`»), `dist-a8` = copia exacta del bundle de A7 (`9784ec70…`), medición de línea base de rendimiento incl. exportación con arte | No | Bajo | La huella `dist-a8` debe ser idéntica a `dist-a7` |
| **A8.1** | `export/glb-bytes.js` (`padBytes`, `toUint8View`, `typedArrayFromList`) | Sí | Bajo (puras) | Texto idéntico; bundle función a función (`a7-bundle-eq`) |
| **A8.2** | `export/glb-image.js` (`bytesFromDataURL`, `textureToImageBytes`) | Sí | **Medio**: DOM y `log` silencioso | E4 (log), N2 con arte; control 14 |
| **A8.3** | `export/glb-scene.js` (`buildExportSceneMeshes`) | Sí | **Medio**: `S` y orden del recorrido | E1, E2, E6, N4; controles 5–10, 15 |
| **A8.4** | `export/glb-builder.js` (`materialKey`, `buildGLBBlobFromCurrentView`) | Sí | **Alto**: 135 líneas con 5 clausuras y todas las invariantes I-G | N1, N2, N3, N4; controles 1–4, 11–13 |
| **A8.5** | Cierre (PC9): informe, `dist-a8` vigente, `KNOWN_ISSUES`, `HANDOFF`, procedimiento de validación corta en CEP **preparado y no ejecutado** | Docs/huellas | Bajo | Equivalencia bundle A7 → A8 función a función (esperado: todas idénticas) |
| *(aparte)* **A8-CEP** | Validación corta en Illustrator real: GLB `737bcd23…`, `87aa2e4c…`, `b4973a54…` + GPU Δ=0 + rollback | — | — | **Requiere autorización expresa y fechada** (patrón A5/A6/A7) |
**Compuerta G-A8:** (E1) texto idéntico salvo sangría, `export` y `S.`; (E2) bundle A7 → A8 con todas las funciones preexistentes idénticas; (E3) N1 byte a byte; (E4) N2/N3/N4 en verde; (E5) rendimiento dentro del umbral D-A7-13 (> 10 % investigar, > 25 % detener; ruido ±5 %); (E6) controles negativos nuevos, todos detectados o declarados como laguna; (E7) GPU Δ=0; (E8) aislamiento verde.
**Parar y consultar** si cualquier paso cambia un byte de N1, rompe una invariante I-G, o un control negativo no se detecta y no se puede explicar.

## 9. Riesgos, mutaciones y puntos de control (tarea 8)
| ID | Riesgo | Prob./Imp. | Cómo se detecta | Mitigación |
|---|---|---|---|---|
| R1 | Cambia el orden de claves del JSON o de las `bufferViews` (p. ej. `samplers` antes que `images`) | Baja / **Alta** | N1, N2, controles 1–2 | No partir `buildGLBBlobFromCurrentView` (D-A8-3); texto idéntico |
| R2 | Identificador de clausura mal cableado (`materialKey`, `textureToImageBytes`, `log`…): falla **solo al ejecutar esa ruta** (precedente KI-24) | Media / Alta | Regla estática 8, E4, N4 | Desestructurar con los nombres de siempre; prueba de identificadores libres |
| R3 | `log` silenciado en la rama de fallo de imagen | Media / Baja | E4, control 14 | Prueba que observa el mensaje |
| R4 | `THREE`/`document` evaluados al importar (rompe Node o el orden de carga) | Baja / Media | `a5-limites`, `a7-limites`, carga en Node sin globales | Solo uso en tiempo de llamada |
| R5 | Cambia el orden de recorrido por mover la creación de `foldBridgeGroup` o la inserción de `foldRoot` | Baja / Alta | `a7` inventario ordenado, E6, N1 | A8 **no toca** `scene/` ni `fold/` |
| R6 | Bytes de PNG dependientes de la versión de Chromium: la prueba de arte no puede ser byte a byte en headless | **Media** / Media | N3 (esqueleto + píxeles); A8-CEP con `b4973a54…` | No prometer byte a byte con arte fuera de CEP (D-A8-4); medir en A8.0a |
| R7 | Regresión de rendimiento (exportación con arte re-codifica PNG; KI-13) | Baja / Media | `a7-perf` (+ medida nueva con arte), umbral D-A7-13 | Lectura antes de cada commit |
| R8 | Una prueba que falla por el motivo equivocado (la precondición de los controles ya dio un fallo intermitente en A7.0a, causa [NO VERIFICADO]) | Baja / Media | La precondición imprime qué falla | Repetir antes de concluir; no atribuir a A8 sin reproducir |
| R9 | `a7-texto-identico` y los inventarios exactos fallan al mover funciones | Cierta / Baja | Es lo esperado | Actualizar en el mismo paso aprobado (§7), nunca antes |
| R10 | Arrastrar un «arreglo» (KI-02, KI-03, KI-13, KI-25) al reubicar el código | Baja / Alta | N1/N2/N4 y controles que ya protegen los defectos | Regla del proyecto: los defectos se preservan |

**Puntos de control del estado mutable** (lo único que A8 podría alterar sin querer): (a) `matrixWorld` de la escena (I-E2); (b) `S.scene3d`/`S.foldRoot` (solo lectura); (c) las texturas compartidas con el arte (el exportador solo lee `texture.image`; no puede llamar a `dispose` — L1 de A7 lo vigila); (d) el canvas temporal (desconectado; sin fuga si falla); (e) el orden de los hijos de `scene3d` (G1).

## 10. Hallazgos latentes (preservados; registro propuesto, sin corregir)
Se propone registrarlos como **«pendiente de confirmación»**, igual que KI-27, solo si el usuario lo aprueba (D-A8-5). Un solo candidato nuevo:
- **KI-28 (candidato):** `Math.max.apply(null, idxOut)` (línea 714) lanza `RangeError` con ≥ 125 000 índices en Node 24/V8 [MEDIDO en Node; el límite en Chromium 99 de CEP es [NO VERIFICADO]]. En los tres GLB reales la malla mayor tiene **120 índices** [MEDIDO], así que hoy no es alcanzable; sí lo sería con una malla muy grande.
- **KI-02 (sin cambio):** las normales de longitud 0 de `mesh_9`/`mesh_30` probablemente salen de triángulos degenerados al normalizar en `buildExportSceneMeshes` [INFERENCIA]; A8 mueve ese código tal cual y no lo corrige ni intenta reproducirlo.
- Observación: los colores salen como `color.r/g/b` de r132 sin conversión sRGB→lineal (afecta al aspecto en Dimension) — **Fase 5**, no A8.
- Observación: `exportGLB` llama dos veces a `updateMatrixWorld(true)`; inocuo.

## 11. Validación en Illustrator real
Preparada y **no ejecutada**, con el mismo molde que A5/A6/A7: identidad (`main.js` = hash de `dist-a8`), paridad de caja y de arte contra la evidencia real de A7 (`docs/fase1/a7-real/`), GLB `737bcd23…`/`87aa2e4c…`/`b4973a54…` byte a byte, GPU Δ=0, rollback verificado. Antes de cada instalación: autorización expresa y fechada.

## 12. Estimación
A8.0a–A8.0b ≈ 40 % del esfuerzo (es donde está el valor: ocho funciones y ningún test por nombre); A8.1–A8.4 ≈ 45 %; cierre ≈ 15 %. La mayor parte del tiempo de reloj es la batería (`--mutations --soak` ≈ 34 min por paso).

## 13. Decisiones que requieren aprobación del usuario
| # | Decisión | Recomendación |
|---|---|---|
| **D-A8-1** | Granularidad: 4 módulos en `src/export/` (§4.1) o 1 solo módulo | **4 módulos** |
| **D-A8-2** | `exportPNG`, `exportGLB` y el manejador del botón se quedan en `main.js` (A9/Fase 5) | **Quedarse** |
| **D-A8-3** | No partir `buildGLBBlobFromCurrentView` ni separar contenedor/resolvedor de materiales (eso es Fase 5) | **No partir** |
| **D-A8-4** | Con arte, la igualdad byte a byte se exige en la misma sesión (N2) y en CEP real (A8-CEP); en headless contra el archivo real solo esqueleto + píxeles (N3), salvo que A8.0a demuestre que se puede más | **Aceptar** |
| **D-A8-5** | Registrar KI-28 como «pendiente de confirmación», sin corregir | **Registrar** |
| **D-A8-6** | Referencias de texto: `src/main.js` de `a322d7a` y `panel/main.js` normalizado; `dist-a7` queda congelada; `dist-a8` vigente desde A8.0b | **Aprobar** |
| **D-A8-7** | Rendimiento: reutilizar `a7-perf` y añadir la exportación con arte; umbral D-A7-13 | **Aprobar** |
| **D-A8-8** | Alcance de las pruebas nuevas: N1–N4, E1–E6 y 16 controles negativos antes de mover código (A8.0a obligatorio) | **Aprobar** |
| **D-A8-9** | A8-CEP: preparada al cerrar, **no ejecutada**; su ejecución es una autorización aparte | **Aprobar** |
| **D-A8-10** | Ejecución: autónoma y secuencial A8.0a→A8.5 con parada en cada compuerta, o paso a paso con aprobación entre pasos | A su criterio; **el paso A8.4 recomiendo con revisión previa** |

## 14. Qué NO se verificó [NO VERIFICADO]
Que Chrome headless reproduzca los PNG de CEP byte a byte (se mide en A8.0a); límite de `Math.max.apply` en Chromium 99; que la exportación no cree recursos GPU (fijado en E2); Windows; troqueles distintos de los fixtures; validador Khronos sobre estos tres archivos (KI-02 sigue abierto).

## 15. Apéndice: método de esta propuesta
Lecturas: `HANDOFF.md`, `PLAN_MAESTRO_V3.md`, `A7_INFORME.md`, `A7_VALIDACION_CEP_INFORME.md`, `KNOWN_ISSUES.md`, `tests/README.md`; código: `src/main.js` 606–882 y 1025–1034, `bridge/fs.js`, `bridge/cep.js`, `host/save-dialog.js`, `scene/*`, `fold/*`; comprobaciones ejecutadas: aislamiento, huellas, igualdad de texto de las funciones entre baseline/`panel/`/`src/`, parseo de los tres GLB reales, carga de three r132 en Node, límite de `Math.max.apply`, búsqueda de usos por nombre en tests y herramientas. Ningún archivo del repositorio se modificó salvo la creación de este documento.

## 16. Autorización parcial del usuario (2026-10-26)
El usuario aprobó conceptualmente la arquitectura de este documento y autorizó **solo A8.0a–A8.3**, ejecutados de forma autónoma y secuencial en este chat. **A8.4 (constructor GLB) y A8.5 NO están autorizados**: al terminar A8.3 hay que presentar un punto de control (commits y estado Git, mapa de módulos, resultados N1–N4, equivalencia GLB sin arte y con arte por separado —binaria y estructural—, controles negativos, riesgos, diff previsto del constructor de 135 líneas y estrategia de reversión) y esperar autorización. Decisiones: D-A8-1…D-A8-9 según la recomendación; D-A8-10 = ejecución autónoma hasta A8.3 con parada obligatoria antes de A8.4. Condiciones: batería completa con `--mutations --soak` tras cada etapa; verificar aislamiento, huellas y goldens históricos; equivalencia de funciones y bundle; GLB byte a byte donde el entorno lo permita (separando binario y estructural en archivos con arte); no avanzar con pruebas incompletas o fallidas; KI-28 se registra sin corregirse; `exportPNG`, `exportGLB` y el manejador del botón se quedan en `main.js`. Si algo de este documento contradice esos límites, se detiene y se presenta el conflicto.

## 17. Estado tras A8.3 (2026-10-26)
Ejecutados A8.0a (`c7dee4b`), A8.0b (`5509e84`), A8.1 (`bf5360f`), A8.2 (`6494f94`) y A8.3 (`6e316d2`), cada uno con `run-all.sh --mutations --soak` en verde. Detenido antes de A8.4. Resultados, desviaciones (glb-scene importa glb-bytes; `main.js` desestructura solo `textureToImageBytes`; I-E3 añadido a N4) y el diff previsto del constructor: `docs/fase1/A8_PUNTO_DE_CONTROL.md`.
