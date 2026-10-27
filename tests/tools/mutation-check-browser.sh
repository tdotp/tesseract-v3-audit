#!/bin/bash
# Control negativo de la batería de navegador: cada mutación se aplica a una COPIA de src/, se construye el bundle desde ella (TESS_DIST_ENTRY)
# y debe hacer fallar la prueba indicada del BUNDLE. (Desde A5 la fuente es src/; panel/ es la referencia A1 congelada.)
cd "$(dirname "$0")/../.." || exit 2
TMP=$(mktemp -d); trap 'rm -rf "$TMP"' EXIT; ok=0; bad=0
# precondición: sin mutar, cada patrón debe PASAR (si no, 'detectada' no significaría nada)
for pat in "GPU · bundle \(caja, sin arte\)" "Escena/materiales · bundle" "Arte · bundle" "GLB · bundle \(caja\)" "Interacciones · bundle" "Log de depuración \(A6\)"; do
  node --test --test-name-pattern="$pat" tests/browser/browser.test.mjs >/dev/null 2>&1 || { echo "ERROR: la prueba '$pat' falla sin mutaciones"; exit 2; }
done
node --test --test-name-pattern="Puente CEP · (baseline|bundle)" tests/browser/bridge.test.mjs >/dev/null 2>&1 || { echo "ERROR: la prueba del puente falla sin mutaciones"; exit 2; }
for pat in "A7 · inventario de escena" "A7 · ciclo de vida"; do node --test --test-name-pattern="$pat" tests/browser/a7.test.mjs >/dev/null 2>&1 || { echo "ERROR: la prueba '$pat' (A7) falla sin mutaciones"; exit 2; }; done
node --test tests/browser/a8.test.mjs >/dev/null 2>&1 || { echo "ERROR: la batería A8 (exportación GLB) falla sin mutaciones"; exit 2; }
SOAK=1 node --test tests/browser/a9.test.mjs >/dev/null 2>&1 || { echo "ERROR: la batería A9 (interfaz, con soak de UI) falla sin mutaciones"; exit 2; }
echo "precondición OK (9 patrones + baterías A8 y A9 pasan sin mutar)"
mutsrc() { # aplica la mutación sed a TODOS los .js de una COPIA de src/ (nunca al original); falla («NO APLICÓ») si no cambió EXACTAMENTE una línea (A6: una copia duplicada no puede esconder la mutación)
  rm -rf "$TMP/src" "$TMP/src.orig"; cp -R src "$TMP/src"; cp -R src "$TMP/src.orig"; find "$TMP/src" -name '*.js' -exec sed -i '' "$1" {} +; [ "$(diff -r "$TMP/src.orig" "$TMP/src" | grep -c '^<')" = 1 ]; }
run() { # nombre, patrón de prueba, mutación sed (sobre una copia de src/) o REVERT (bundle construido desde el baseline, sin el parche A1), [archivo de prueba]
  if [ "$3" = "REVERT" ]; then var=TESS_DIST_FROM; val="$PWD/reference/legacy-baseline"; else mutsrc "$3" || { echo "NO APLICÓ  $1"; bad=$((bad+1)); return; }; var=TESS_DIST_ENTRY; val="$TMP/src/main.js"; fi
  if env "$var=$val" node --test --test-name-pattern="$2" "${4:-tests/browser/browser.test.mjs}" >/dev/null 2>&1; then echo "NO DETECTADA  $1"; bad=$((bad+1)); else echo "detectada     $1"; ok=$((ok+1)); fi
}
run_soak() { # como run, con SOAK=1 (el soak de UI de A9 solo existe con SOAK): nombre, patrón, mutación sed, archivo de prueba
  mutsrc "$3" || { echo "NO APLICÓ  $1"; bad=$((bad+1)); return; }
  if env SOAK=1 TESS_DIST_ENTRY="$TMP/src/main.js" node --test --test-name-pattern="$2" "$4" >/dev/null 2>&1; then echo "NO DETECTADA  $1"; bad=$((bad+1)); else echo "detectada     $1"; ok=$((ok+1)); fi
}
run "se revierte el parche A1 (fuga vuelve)"        "GPU · bundle \(caja, sin arte\)"  REVERT
run "etiquetas: la caché deja de reutilizar"        "GPU · bundle \(caja, sin arte\)"  's/var r = labelCache\[key\];/var r = null;/'
run "color del preset white (shell)"                "Escena/materiales · bundle"       "s/shell:'#d9d5cc'/shell:'#d9d5cd'/"
run "luz direccional 0.8 → 0.9"                     "Escena/materiales · bundle"       's/new THREE.DirectionalLight(0xffffff,0.8)/new THREE.DirectionalLight(0xffffff,0.9)/'
run "desplazamiento del arte frontal"               "Arte · bundle"                    's/ART_TOP_OFFSET = 0.08;/ART_TOP_OFFSET = 0.12;/'
run "UV del arte (se invierte v)"                   "Arte · bundle"                    's/var v = (artRect.top - y) \/ artRect.height;/var v = (y - artRect.top) \/ artRect.height;/'
run "generador del GLB"                             "GLB · bundle \(caja\)"            "s/generator:'Tesseract Phase 7B'/generator:'Tesseract Phase 7C'/"
run "rugosidad del GLB (1 → 0.5)"                   "GLB · bundle \(caja\)"            's/roughnessFactor: 1$/roughnessFactor: 0.5/'
run "zoom de la rueda (1.08 → 1.10)"                "Interacciones · bundle"           's/var delta=(e.deltaY>0)?1.08:0.92;/var delta=(e.deltaY>0)?1.10:0.92;/'
run "Shift+clic ya no cambia la base"               "Interacciones · bundle"           's/if(pickPanelFromEvent(e)) return;/if(false) return;/'
run "puente: evalScriptJSON deja de tratar «EvalScript error.»" "Puente CEP · (baseline|bundle)" "s/ || result==='null' || result==='EvalScript error.') throw new Error(String(result || 'No result returned'));/ || result==='null') throw new Error(String(result || 'No result returned'));/" tests/browser/bridge.test.mjs
run "puente: mensaje de escritura de GLB"            "Puente CEP · (baseline|bundle)" "s/'Could not save GLB file'/'Could not write GLB file'/" tests/browser/bridge.test.mjs
run "puente: codificación por defecto Base64 → base64" "Puente CEP · (baseline|bundle)" "s/|| 'Base64';/|| 'base64';/" tests/browser/bridge.test.mjs
run "puente: ensureCep ya no deshabilita «Back»"     "Puente CEP · (baseline|bundle)" 's/\[testBtn,extractBtn,previewBtn,continueBtn,backBtn,export3dBtn\]/[testBtn,extractBtn,previewBtn,continueBtn,export3dBtn]/' tests/browser/bridge.test.mjs
run "KI-25 corregido sin tarea (mensaje final del GLB)" "Puente CEP · (baseline|bundle)" "s/setStatus('GLB exported from current 3D pose');//" tests/browser/bridge.test.mjs
run "KI-24 corregido sin tarea (buildChildrenOfMap)" "Puente CEP · (baseline|bundle)" 's/rebuildCreaseVisuals(buildChildrenOfMap());/rebuildCreaseVisuals([]);/' tests/browser/bridge.test.mjs
# A6.0a — número y orden de llamadas al motor (solo lo ve el log de depuración, T1): setBasePanel deja de recalcular el árbol (buildFoldUI lo recalcula igual)
run "A6 · log: setBasePanel ya no llama a buildFoldTree"      "Log de depuración \(A6\)"      's/S.foldTree = geometryEngine.buildFoldTree(S.currentPanelData.panels, S.currentAdjEdges, S.currentBasePanelIndex);/S.foldTree = S.foldTree;/'  # A6.6: la llamada pasa por geometryEngine · A7.1: mismo efecto con el prefijo S.
# A6.6 — el adaptador del motor en el bundle real: si ignora la base elegida, el log y la interacción Shift+clic lo delatan
run "A6 · adaptador: el motor ignora la base elegida (bundle)"  "Log de depuración \(A6\)"  's/    buildFoldTree: buildFoldTree,/    buildFoldTree: function(p, a, b){ return buildFoldTree(p, a, 0); },/'
# A7.0a — ciclo de vida de los recursos (A1) y datos de escena que antes no observaba ninguna prueba (docs/fase1/A7_PROPUESTA.md §9.4)
run "A7 · clearAllMeshes deja de liberar los visuales de pliegue"  "A7 · ciclo de vida"  's/disposeCreaseVisuals();   \/\* A1 \*\//\/\* A7-mut \*\//'  tests/browser/a7.test.mjs  # A7.4: patrón sin la sangría (clearAllMeshes pasó a scene/panel-meshes.js)
run "A7 · disposeObject3D deja de recorrer los hijos"             "A7 · ciclo de vida"  's/obj.children.slice().forEach(function(ch){ disposeObject3D(ch); });/void 0;/'  tests/browser/a7.test.mjs
run "A7 · centro del panel (userData.center) calculado distinto"  "A7 · inventario de escena"  's/center:getPolyCentroid(centered),/center:getPolyCentroid(centered.slice(1)),/'  tests/browser/a7.test.mjs
# A7.1 — estado compartido S y vista de depuración
run "A7 · orden de inserción: fold-bridges pasa delante en la escena (G1)"  "A7 · inventario de escena"  's/S.scene3d.add(S.foldBridgeGroup);/S.scene3d.add(S.foldBridgeGroup); S.scene3d.children.unshift(S.scene3d.children.pop());/'  tests/browser/a7.test.mjs
run "A7 · vista de depuración: baseIndex devuelve otro campo"           "Interacciones · bundle"     's/get baseIndex(){return S.currentBasePanelIndex}/get baseIndex(){return S.selectedFoldEdgeIdx}/'
run "A7 · estado inicial: espesor 0.30 en createAppState"              "Regresión · baseline vs bundle \(caja\)"  's/currentThicknessMm: DEFAULT_THICKNESS_MM,/currentThicknessMm: 0.30,/'
run "A7 · clearAllMeshes libera la textura de arte compartida (rompe L1)" "A7 · ciclo de vida"  's/disposeLabelCache();      \/\* A1 \*\//disposeLabelCache();      \/\* A1 \*\/ if(S.currentArtState \&\& S.currentArtState.front) S.currentArtState.front.texture.dispose();/'  tests/browser/a7.test.mjs  # A7.4: patrón sin la sangría (clearAllMeshes pasó a scene/panel-meshes.js)
# A7.4 — el arte trabaja sobre una COPIA del estado tomada al crear la fábrica (estado obsoleto en vez de compartido)
run "A7 · artwork: copia obsoleta de S al crear la fábrica"  "Arte · bundle"  's/^export function createArtwork(S, deps){$/export function createArtwork(S, deps){ S = Object.assign({}, S);/'
# A7.5 — el plegado trabaja sobre una COPIA del estado tomada al crear la fábrica
run "A7 · folding: copia obsoleta de S al crear la fábrica"  "Interacciones · bundle"  's/^export function createFolding(S, deps){$/export function createFolding(S, deps){ S = Object.assign({}, S);/'
# A8.0a — exportación GLB en el navegador (N1/N3/E1–E6 sobre el bundle construido desde la copia mutada). Cada patrón cambia exactamente 1 línea.
A8=tests/browser/a8.test.mjs
run "A8 · GLB: claves del JSON (samplers antes de textures)"     "A8 · (N3|E6)"        's/gltf.images = \[\];/gltf.images = []; ensureSampler();/' $A8
run "A8 · GLB: la imagen se añade ANTES de los accesores"         "A8 · (N3|E6)"        's/attr.POSITION = addAccessorFromTyped(/ensureMaterial(meshInfo.material); attr.POSITION = addAccessorFromTyped(/' $A8
run "A8 · GLB: sin relleno de alineación entre vistas"           "A8 · (N3|E6)"        's/var pad = (4 - (byteOffset % 4)) % 4;/var pad = 0;/' $A8
run "A8 · GLB: normales sin normalMatrix"                        "A8 · N1"             's/.applyMatrix3(nMat).normalize()/.normalize()/' $A8
run "A8 · GLB: nombre mesh_<índice+1>"                           "A8 · N1"             "s/'mesh_'+out.length/'mesh_'+(out.length+1)/" $A8
run "A8 · GLB: posiciones sin matrixWorld"                       "A8 · N1"             's/.applyMatrix4(obj.matrixWorld);/;/' $A8
run "A8 · GLB: alphaMode ya no depende de transparent"           "A8 · (N3|E6)"        "s/if(alpha < 0.999 || (mat \&\& mat.transparent)) out.alphaMode = 'BLEND';/if(alpha < 0.999) out.alphaMode = 'BLEND';/" $A8
run "A8 · GLB: magFilter del sampler 9729 → 9728"                "A8 · (N3|E6)"        's/magFilter:9729/magFilter:9728/' $A8
run "A8 · GLB: el fallo de la textura ya no se registra"         "A8 · E4 · .*textura"  "s/try{ log('Texture image encode failed: '+ex1.message); }catch(exlog){}//" $A8
run "A8 · GLB: la exportación marca la textura como sucia (muta la escena)" "A8 · E1/E2"  "s/var cvs = document.createElement('canvas');/var cvs = document.createElement('canvas'); texture.needsUpdate = true;/" $A8
run "A8 · exportGLB: el diálogo se abre ANTES de construir el Blob" "A8 · E4/E5"        "s/var blob = buildGLBBlobFromCurrentView();/var blob = (await saveBlobWithDialog(new Blob([], { type:'model\/gltf-binary' }), 'x'), buildGLBBlobFromCurrentView());/" $A8
# A8.1 — glb-bytes: cableado de main.js y contenido de los ayudantes
run "A8.1 · cableado: glb-builder.js no importa toUint8View"      "A8 · N1"             's/^import { padBytes, toUint8View } from /import { padBytes } from /' $A8   # A8.4: el import salió de main.js a glb-builder.js
run "A8.1 · toUint8View corta 4 bytes"                            "A8 · N1"             's/typed.byteOffset||0, typed.byteLength)/typed.byteOffset||0, typed.byteLength-4)/' $A8
# A8.2 — glb-image: cableado del log (try/catch silencioso) y contenido de las imágenes
run "A8.2 · cableado: main.js no pasa log a createGlbImage"       "A8 · E4 · .*textura"  's/createGlbImage({ log })/createGlbImage({})/' $A8
run "A8.2 · bytesFromDataURL pierde el último byte (PNG truncado)" "A8 · N2"             's/    for(var i=0;i<bin.length;i++) out\[i\] = bin.charCodeAt(i);/    for(var i=0;i<bin.length-1;i++) out[i] = bin.charCodeAt(i);/' $A8
# A8.3 — glb-scene: cableado de S (copia obsoleta, patrón de A7)
run "A8.3 · glb-scene: copia obsoleta de S al crear la fábrica"  "A8 · N1"             's/^export function createGlbScene(S){$/export function createGlbScene(S){ S = Object.assign({}, S);/' $A8
# A8.4 — glb-builder: cableado del import de glb-bytes y de las dependencias que main.js inyecta en el constructor
run "A8.4 · cableado: glb-builder.js no importa padBytes"         "A8 · N1"             's/^import { padBytes, toUint8View } from /import { toUint8View } from /' $A8
run "A8.4 · cableado: main.js inyecta otra textureToImageBytes"   "A8 · N3"             's/createGlbBuilder({ buildExportSceneMeshes, textureToImageBytes })/createGlbBuilder({ buildExportSceneMeshes, textureToImageBytes: function(){ return null; } })/' $A8
# A9.0a — caracterización de interfaz y orquestación (H1–H6 y soak de UI sobre el bundle construido desde la copia mutada). Cada patrón cambia exactamente 1 línea.
A9=tests/browser/a9.test.mjs
run "A9 · H1: la escucha de Extract se registra dos veces (n.º 4)"            "A9 · H1"   "s/^    extractBtn.addEventListener('click',function(){\$/    var __a9dup=extractBtn.addEventListener; extractBtn.addEventListener=function(t,f,o){ __a9dup.call(this,t,f,o); __a9dup.call(this,t,function(e){ return f.call(this,e); },o); }; extractBtn.addEventListener('click',function(){/" $A9
run "A9 · H1: se omite la escucha de debug-toggle (n.º 5)"                   "A9 · H1"   "s/^    debugToggle.addEventListener('change', function(){\$/    void('change', function(){/" $A9
run "A9 · H1: keydown en window en lugar de document (n.º 6)"                "A9 · H1"   "s/^    document.addEventListener('keydown', function(ev){\$/    window.addEventListener('keydown', function(ev){/" $A9
run "A9 · H1: sin CEP el arranque ya no corta (registra escuchas) (n.º 11)"   "A9 · H1"   '/^    if(!ensureCep()) return;$/{N;N;s/^    if(!ensureCep()) return;\(\n\n    showImport();\)$/    ensureCep();\1/;}' $A9  # A9.2: la misma línea está en refreshArtwork (app/actions.js) a 4 espacios; se ancla con las dos siguientes (solo el arranque de main.js va seguido de showImport)
run "A9 · H2: copia sombra de lastData en el manejador Preview (n.º 9)"       "A9 · H2"   "s/^    previewBtn.addEventListener('click', function(){\$/    previewBtn.addEventListener('click', function(){ var lastData;/" $A9
run "A9 · H2: Continue espera a refreshArtwork antes de su mensaje (n.º 16)"  "A9 · H2"   "s/setStatus('3D ready · thickness='+S.currentThicknessMm.toFixed(1)+'mm');/return refreshArtwork().then(function(){ setStatus('3D ready · thickness='+S.currentThicknessMm.toFixed(1)+'mm'); });/" $A9
run "A9 · H3: ensureCep deja de mostrar #error-msg (n.º 12)"                  "A9 · H3"   "s/errorMsg.style.display='block';/void 0;/" $A9
run "A9 · H3: la guarda «UI mismatch» pierde !thicknessInput (n.º 17)"        "A9 · H3"   's/^       !thicknessInput||!applyThicknessBtn){$/       !applyThicknessBtn){/' $A9
run "A9 · H4: buildFoldUI deja de reiniciar currentCreaseRows (n.º 8)"        "A9 · H4"   's/^    currentCreaseRows = \[\];$/    void 0;/' $A9  # A9.3: buildFoldUI pasó a ui/fold-controls.js (sangría −2)
run "A9 · H4: el onclick de un problema llama a render2D(null, …) (n.º 10)"   "A9 · H4"   's/li.onclick=function(){render2D(lastData,p.id);};/li.onclick=function(){render2D(null,p.id);};/' $A9
run "A9 · H5: error tragado por el try/catch del visor tras un Alt+clic correcto" "A9 · H5" "s/setStatus('Crease C'+edgeIdx+' selected · Alt\/Option + click another red line to retarget');/setStatus('Crease C'+edgeIdx+' selected · Alt\/Option + click another red line to retarget'); null.x;/" $A9
run "A9 · H5: createViewport recibe pickPanelFromEvent sin envoltorio (captura undefined; n.º 3)" "A9 · H5" 's/pickPanelFromEvent: function(e){ return pickPanelFromEvent(e); }, /pickPanelFromEvent, /' $A9  # A9.4: misma intención (cableado roto ⇒ Pick error) sobre la composición con envoltorios
run "A9 · H5: rebuildCreaseVisuals deja de actualizar el resaltado tras plegar" "A9 · H5"  '/^    updateSelectedCreaseVisuals();$/{N;N;N;s/^    updateSelectedCreaseVisuals();\(\n  }\n\n  return { disposeCreaseVisuals\)/    void 0;\1/;}' $A9  # A9.3: syncSelectedCreaseUI (ui/fold-controls.js) tiene la misma línea a 4 espacios; se ancla con el cierre de rebuildCreaseVisuals
run_soak "A9 · soak de UI: cada reconstrucción deja una escucha de Reset en #three-view (fuga en un elemento persistente)" "A9 · soak" "s/^    resetBtn.addEventListener('click',function(){\$/    threeView.addEventListener('click',function(){/" $A9  # A9.3: buildFoldUI pasó a ui/fold-controls.js (sangría −2)
# A9.1 — src/ui/views.js: cableado de la fábrica (efectos al crearse, copia de S, widgets inyectados). Cada patrón cambia exactamente 1 línea.
run "A9.1 · createViews llama a setStatus al crearse (n.º 18)"                 "A9 · (H2|H3)"        "s/^  var interactionMode = 'fold';\$/  var interactionMode = 'fold'; setStatus('');/" $A9
run "A9.1 · createViews trabaja sobre una copia de S (espesor obsoleto)"     "Escena/materiales"   's/^export function createViews(S, deps){$/export function createViews(S, deps){ S = Object.assign({}, S);/'
run "A9.1 · la composición pasa materialPill como artSourcePill"              "A9 · H2"             's/artSourcePill, modeFoldBtn\(.*\)getMaterialPreset });/artSourcePill: materialPill, modeFoldBtn\1getMaterialPreset });/' $A9
# A9.2 — src/app/actions.js: cableado de la fábrica (dependencias inyectadas, copia de S) y rutas asíncronas (arte, GLB). Cada patrón cambia exactamente 1 línea.
run "A9.2 · la composición pasa setStatus como setArtStatus a createActions"   "A9 · H2"             's/ensureCep, setArtStatus, loadTextureFromPath\(.*\)buildGLBBlobFromCurrentView });/ensureCep, setArtStatus: setStatus, loadTextureFromPath\1buildGLBBlobFromCurrentView });/' $A9
run "A9.2 · refreshArtwork deja de liberar las texturas anteriores"            "GPU · bundle \(caja, con arte y refresco\)"  's/^      disposeCurrentArtTextures();$/      void 0;/'
run "A9.2 · createActions trabaja sobre una copia de S"                       "Arte · bundle"       's/^export function createActions(S, deps){$/export function createActions(S, deps){ S = Object.assign({}, S);/'
# A9.3 — src/ui/fold-controls.js y el envoltorio de enlace tardío de updateSelectedCreaseVisuals (D-A9-3). Cada patrón cambia exactamente 1 línea.
run "A9.3 · el envoltorio de updateSelectedCreaseVisuals no la llama (n.º 1)"        "A9 · H5"                 's/updateSelectedCreaseVisuals: function(){ return updateSelectedCreaseVisuals(); }/updateSelectedCreaseVisuals: function(){ }/' $A9
run "A9.3 · createCreaseVisuals recibe updateSelectedCreaseVisuals sin envoltorio (captura undefined)" "A9 · H5"  's/updateSelectedCreaseVisuals: function(){ return updateSelectedCreaseVisuals(); } });/updateSelectedCreaseVisuals });/' $A9
run "A9.3 · createFoldControls trabaja sobre una copia de S (n.º 13)"                "Interacciones · bundle"  's/^export function createFoldControls(S, deps){$/export function createFoldControls(S, deps){ S = Object.assign({}, S);/'
# A9.4 — src/ui/picking.js y los dos envoltorios de enlace tardío de createViewport (D-A9-3/4). Cada patrón cambia exactamente 1 línea.
run "A9.4 · el envoltorio de pickPanelFromEvent no la llama (n.º 2)"                 "A9 · H5"                 's/pickPanelFromEvent: function(e){ return pickPanelFromEvent(e); }/pickPanelFromEvent: function(e){ return undefined; }/' $A9
run "A9.4 · el envoltorio de pickCreaseFromEvent llama a pickPanelFromEvent (n.º 19)" "Interacciones · bundle"  's/pickCreaseFromEvent: function(e){ return pickCreaseFromEvent(e); }/pickCreaseFromEvent: function(e){ return pickPanelFromEvent(e); }/'
run "A9.4 · createPicking trabaja sobre una copia de S"                              "A9 · H5"                 's/^export function createPicking(S, deps){$/export function createPicking(S, deps){ S = Object.assign({}, S);/' $A9
# A9.5 — src/ui/controller.js: un solo bindEvents tras ensureCep, KI-24 intacto, cableado de la fábrica. Cada patrón cambia exactamente 1 línea.
run "A9.5 · bindEvents() se llama dos veces (n.º 21)"                                 "A9 · H1"                         's/^    bindEvents();$/    bindEvents(); bindEvents();/' $A9
run "A9.5 · buildChildrenOfMap declarada en el controlador (KI-24 corregido sin tarea; n.º 15)" "Puente CEP · (baseline|bundle)" 's/^  var problems   = \[\];$/  var problems   = []; function buildChildrenOfMap(){ return []; }/' tests/browser/bridge.test.mjs
run "A9.5 · createController trabaja sobre una copia de S"                          "Escena/materiales"               's/^export function createController(S, deps){$/export function createController(S, deps){ S = Object.assign({}, S);/'
run "A9.5 · la composición pasa showImport como show3D al controlador"              "A9 · H2"                         's/show3D\(, setDebugVisible.*exportGLB }); \/\*\)/show3D: showImport\1/' $A9
echo "mutaciones detectadas: $ok · no detectadas: $bad"; [ "$bad" = 0 ]
