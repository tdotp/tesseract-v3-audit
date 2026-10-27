#!/bin/bash
# Control negativo de la batería Node: aplica mutaciones PEQUEÑAS a una COPIA de la fuente src/ (nunca al original) y exige que las pruebas fallen.
# (Desde A5 la fuente del build es src/; panel/main.js queda congelado como referencia A1.)
# Uso: tests/tools/mutation-check.sh        (salida 0 si TODAS las mutaciones fueron detectadas)
cd "$(dirname "$0")/../.." || exit 2
TMP=$(mktemp -d); trap 'rm -rf "$TMP"' EXIT; ok=0; bad=0
# precondición: sin mutar, la batería debe pasar (si no, 'detectada' no significaría nada)
node --test 'tests/node/*.test.mjs' > "$TMP/pre.txt" 2>&1 || { echo 'ERROR: la batería falla sin mutaciones'; grep -E '^(✖|  AssertionError|  Error)' "$TMP/pre.txt" | head -20; exit 2; } # A7.0a: muestra qué falló (solo diagnóstico)
mutsrc() { # aplica la mutación sed a TODOS los .js de una COPIA de src/ (nunca al original); falla («NO APLICÓ») si no cambió EXACTAMENTE una línea (A6: una copia duplicada no puede esconder la mutación)
  rm -rf "$TMP/src" "$TMP/src.orig"; cp -R src "$TMP/src"; cp -R src "$TMP/src.orig"; find "$TMP/src" -name '*.js' -exec sed -i '' "$1" {} +; [ "$(diff -r "$TMP/src.orig" "$TMP/src" | grep -c '^<')" = 1 ]; }
mut() { # nombre, patrón sed
  mutsrc "$2" || { echo "NO APLICÓ  $1"; bad=$((bad+1)); return; }
  if TESS_SRC_DIR="$TMP/src" node --test 'tests/node/*.test.mjs' >/dev/null 2>&1; then echo "NO DETECTADA  $1"; bad=$((bad+1)); else echo "detectada     $1"; ok=$((ok+1)); fi
}
mut "GRAPH_EPS 0.5→0.6"                         's/export const GRAPH_EPS = 0.5;/export const GRAPH_EPS = 0.6;/'      # A6.1: mismo cambio de valor, ahora en core/legacy/constants.js
mut "TOLERANCE_MM 0.5→0.4"                      's/export const TOLERANCE_MM = 0.5;/export const TOLERANCE_MM = 0.4;/'
mut "color del preset kraft"                    "s/shell:'#b7aa87'/shell:'#b7aa88'/"
mut "espesor por defecto 0.25→0.30"             's/DEFAULT_THICKNESS_MM = 0.25;/DEFAULT_THICKNESS_MM = 0.30;/'
mut "umbral de panel pequeño (absArea < 4 → < 5)" 's/if(absArea < 4) return;/if(absArea < 5) return;/'
mut "filtro de panel delgado (aspect > 30 → > 41)" 's/if(aspect > 30 \&\& absArea < 120) return;/if(aspect > 41 \&\& absArea < 120) return;/'
mut "tolerancia de punto-sobre-segmento (GRAPH_EPS → 0.2)" 's/return d1>GRAPH_EPS \&\& d2>GRAPH_EPS \&\& Math.abs(d1+d2-len)<GRAPH_EPS;/return d1>GRAPH_EPS \&\& d2>GRAPH_EPS \&\& Math.abs(d1+d2-len)<0.2;/'
mut "búsqueda de vértice (ptEq: < GRAPH_EPS → < 0.2)" 's/function ptEq(a,b){ return dist2d(a,b) < GRAPH_EPS; }/function ptEq(a,b){ return dist2d(a,b) < 0.2; }/'
# Nota: la mutación del épsilon de paralelismo en segSegIntersect (1e-9) es inalcanzable con troqueles realistas (exige rectas con ángulo ~1e-7 rad) y no se contrasta.
mut "factor pt→mm del extractor"                's/var PT=0.352778; var EPS=0.5; var SMALL=10;/var PT=0.35; var EPS=0.5; var SMALL=10;/'
mut "tope de escala del PNG de arte (800→700)"  's/Math.min(800,Math.max(100/Math.min(700,Math.max(100/'
mut "offset del arte (ART_TOP_OFFSET 0.08→0.09)" 's/ART_TOP_OFFSET = 0.08;/ART_TOP_OFFSET = 0.09;/'
mut "puente: pathToFileURL sin encodeURI (bridge/cep.js)"  's/+ encodeURI(path);/+ path;/'
mut "guardado: cancelar deja de marcar cancelled (bridge/fs.js)"  "s/return { cancelled:true, path:'' };/return { cancelled:false, path:'' };/"
mut "límites: bridge/cep toca document (a5-limites)"  's/return !!window.__adobe_cep__; }/return !!window.__adobe_cep__ \&\& !!document; }/'
# A6.0a — contratos del motor que los goldens de geometría NO ven (log, alias): los detectan a6-logs-golden y a6-contratos
mut "A6 · log del motor: texto de la adyacencia estricta"   "s/' (strict)');/' (estricta)');/"
mut "A6 · alias: la adyacencia estricta copia el creaseEdge" 's/adj.push({panelA:sharing\[0\],panelB:sharing\[1\],crease:ce,creaseIdx:ce.creaseIdx});/adj.push({panelA:sharing[0],panelB:sharing[1],crease:{a:ce.a,b:ce.b,creaseIdx:ce.creaseIdx,segIdx:ce.segIdx},creaseIdx:ce.creaseIdx});/'
# A6.4 — motor ya en core/legacy/ (cada patrón cambia exactamente 1 línea); fallos reales que ven las pruebas de comportamiento:
mut "A6 · adyacencia robusta: eps 1.0 → 0.1 (pierde adyacencias en los respaldos)" 's/  var eps = Math.max(GRAPH_EPS, 1.0);/  var eps = Math.max(GRAPH_EPS, 0.1);/'
mut "A6 · signo de pliegue invertido (montaña/valle)"  's/  var cross = vx \* (cc.y - ay) - vy \* (cc.x - ax);/  var cross = vy * (cc.x - ax) - vx * (cc.y - ay);/'
# A6.5 — validación separada: numeración de problemas (el golden no incluye el id; lo fija a6-validacion)
mut "A6 · validación: los id de problema empiezan en P0"  "s/id:'P'+(problems.length+1)/id:'P'+problems.length/"
# A6.6 — contrato GeometryEngine (adaptador sin envoltorios) y límites de core/
mut "A6 · adaptador: el motor ignora la base elegida (siempre 0)"  's/    buildFoldTree: buildFoldTree,/    buildFoldTree: function(p, a, b){ return buildFoldTree(p, a, 0); },/'
mut "A6 · adaptador: buildPanels clona la entrada (rompe los alias I4)"  's/    buildPanels: buildPanels,/    buildPanels: function(d){ return buildPanels(JSON.parse(JSON.stringify(d))); },/'
mut "A6 · límites: core/legacy/log.js toca document"  's/export function log(m){ if(sink) sink(m); }/export function log(m){ if(sink \&\& document) sink(m); }/'
# A7.2 — regla 8 de a7-limites: un campo de S usado sin «S.» en un módulo (sería un ReferenceError diferido)
mut "A7 · materials: campo de S sin prefijo (referencia suelta)"  's/return MATERIAL_PRESETS\[S.currentMaterialPreset\] || MATERIAL_PRESETS.white;/return MATERIAL_PRESETS[currentMaterialPreset] || MATERIAL_PRESETS.white;/'
# A7.3 — a7-limites: document fuera de init3D en el visor
mut "A7 · viewport: resize3D toca document"  's/if(!S.renderer3d||!S.camera3d) return;/if(!S.renderer3d||!S.camera3d||!document) return;/'
# A8.0a — exportación GLB. Se ejecuta SOLO la prueba diferencial N4 (a8-diferencial-glb): con la batería completa cualquier cambio de texto lo vería a7-texto-identico y no probaría nada sobre N4.
mutN4() { # nombre, patrón sed
  mutsrc "$2" || { echo "NO APLICÓ  $1"; bad=$((bad+1)); return; }
  if TESS_SRC_DIR="$TMP/src" node --test tests/node/a8-diferencial-glb.test.mjs >/dev/null 2>&1; then echo "NO DETECTADA POR N4  $1"; bad=$((bad+1)); else echo "detectada por N4     $1"; ok=$((ok+1)); fi
}
mutN4 "A8 · GLB: claves del JSON (samplers antes de textures)"   's/gltf.images = \[\];/gltf.images = []; ensureSampler();/'
mutN4 "A8 · GLB: la imagen se añade ANTES de los accesores de la malla" 's/attr.POSITION = addAccessorFromTyped(/ensureMaterial(meshInfo.material); attr.POSITION = addAccessorFromTyped(/'
mutN4 "A8 · GLB: sin relleno de alineación entre vistas"         's/var pad = (4 - (byteOffset % 4)) % 4;/var pad = 0;/'
mutN4 "A8 · GLB: relleno del JSON 0x20 → 0x00"                   's/padBytes(enc.encode(JSON.stringify(gltf)), 0x20)/padBytes(enc.encode(JSON.stringify(gltf)), 0x00)/'
mutN4 "A8 · GLB: umbral Uint16 65535 → 65534"                    's/Math.max.apply(null, idxOut) < 65535/Math.max.apply(null, idxOut) < 65534/'
mutN4 "A8 · GLB: umbral de opacidad 0.01 → 0.02"                 's/obj.material.opacity < 0.01/obj.material.opacity < 0.02/'
mutN4 "A8 · GLB: pickCrease deja de filtrarse"                   "s/obj.userData.role==='pickCrease' || //"
mutN4 "A8 · GLB: panelLabel deja de filtrarse"                   "s/obj.userData.role==='panelLabel'/obj.userData.role==='panelLabel2'/"
mutN4 "A8 · GLB: normales sin normalMatrix"                      's/.applyMatrix3(nMat).normalize()/.normalize()/'
mutN4 "A8 · GLB: nombre mesh_<índice+1>"                         "s/'mesh_'+out.length/'mesh_'+(out.length+1)/"
mutN4 "A8 · GLB: deduplicación de texturas desactivada"          's/if(textureMap\[key\]!==undefined) return textureMap\[key\];/if(false) return textureMap[key];/'
mutN4 "A8 · GLB: materialKey sin el lado"                        "s/var ds = (mat.side===THREE.DoubleSide) ? 'd' : 's';/var ds = 'd';/"
mutN4 "A8 · GLB: alphaMode ya no depende de transparent"         "s/if(alpha < 0.999 || (mat \&\& mat.transparent)) out.alphaMode = 'BLEND';/if(alpha < 0.999) out.alphaMode = 'BLEND';/"
mutN4 "A8 · GLB: el fallo de la textura ya no se registra en el log" "s/try{ log('Texture image encode failed: '+ex1.message); }catch(exlog){}//"
mutN4 "A8 · GLB: posiciones sin matrixWorld"                     's/.applyMatrix4(obj.matrixWorld);/;/'
mutN4 "A8 · GLB: magFilter del sampler 9729 → 9728"              's/magFilter:9729/magFilter:9728/'
# A8.1 — src/export/glb-bytes.js (N4 sobre los módulos reales; límites de a8-limites)
mutN4 "A8.1 · glb-bytes: padBytes copia desde el byte 1"        's/  out.set(u8,0);/  out.set(u8,1);/'
mutN4 "A8.1 · glb-bytes: padBytes ignora el valor de relleno"   's/out\[i\] = padVal || 0;/out[i] = 0;/'
mutN4 "A8.1 · glb-bytes: toUint8View corta 4 bytes"             's/typed.byteOffset||0, typed.byteLength)/typed.byteOffset||0, typed.byteLength-4)/'
mutN4 "A8.1 · glb-bytes: typedArrayFromList omite el último"    's/for(var i=0;i<list.length;i++) arr\[i\] = list\[i\];/for(var i=0;i<list.length-1;i++) arr[i] = list[i];/'
mut   "A8.1 · límites: glb-bytes.js toca document (a8-limites)"  's/export function padBytes(u8, padVal){/export function padBytes(u8, padVal){ if(document){}/'
# A8.2 — src/export/glb-image.js
mutN4 "A8.2 · glb-image: textureToImageBytes ya no descarta texturas sin tamaño" 's/      if(!w || !h) return null;/      if(false) return null;/'
mutN4 "A8.2 · glb-image: createGlbImage ignora el log recibido"  's/  var { log } = deps;/  var { log } = {};/'
mutN4 "A8.2 · glb-image: bytesFromDataURL pierde el último byte" 's/    for(var i=0;i<bin.length;i++) out\[i\] = bin.charCodeAt(i);/    for(var i=0;i<bin.length-1;i++) out[i] = bin.charCodeAt(i);/'
mut   "A8.2 · límites: glb-image.js usa document fuera de textureToImageBytes (a8-limites)" 's/    var bin = atob(base64);/    var bin = atob(base64); document;/'
# A8.3 — src/export/glb-scene.js
mutN4 "A8.3 · glb-scene: recorre solo lo visible (traverseVisible)"        's/S.scene3d.traverse(function(obj){/S.scene3d.traverseVisible(function(obj){/'
mutN4 "A8.3 · glb-scene: no refresca matrixWorld"                          's/^    S.scene3d.updateMatrixWorld(true);$/    /'
mutN4 "A8.3 · glb-scene: exporta la geometría original, sin clonar (I-E3)" 's/var geom = obj.geometry.clone();/var geom = obj.geometry;/'
mut   "A8.3 · límites: glb-scene.js lee otro campo de S (a8-limites)"      's/    if(!S.scene3d) return \[\];/    if(!S.scene3d || !S.foldRoot) return [];/'
mut   "A8.3 · límites: glb-scene.js usa document (a8-limites)"             's/^    var out = \[\];$/    var out = []; document;/'
# A8.4 — src/export/glb-builder.js: cableado de las dependencias inyectadas (un nombre mal cableado fallaría solo en esa ruta: KI-24) y límites
mutN4 "A8.4 · glb-builder: createGlbBuilder ignora textureToImageBytes inyectada"   's/^  var { buildExportSceneMeshes, textureToImageBytes } = deps;$/  var { buildExportSceneMeshes } = deps; var textureToImageBytes;/'
mutN4 "A8.4 · glb-builder: createGlbBuilder ignora buildExportSceneMeshes inyectada" 's/^  var { buildExportSceneMeshes, textureToImageBytes } = deps;$/  var { textureToImageBytes } = deps; var buildExportSceneMeshes = function(){ return []; };/'
mut   "A8.4 · límites: glb-builder.js usa document (a8-limites)"                    's/^  var { buildExportSceneMeshes, textureToImageBytes } = deps;$/  var { buildExportSceneMeshes, textureToImageBytes } = deps; document;/'
# A9.0b — pruebas de texto y de límites de A9. Se ejecuta SOLO la prueba indicada (con la batería completa, a7/a8-texto-identico verían cualquier cambio de texto y no probarían nada sobre la nueva).
mutT() { # nombre, patrón sed, archivo de prueba
  mutsrc "$2" || { echo "NO APLICÓ  $1"; bad=$((bad+1)); return; }
  if TESS_SRC_DIR="$TMP/src" node --test "$3" >/dev/null 2>&1; then echo "NO DETECTADA POR $(basename "$3" .test.mjs)  $1"; bad=$((bad+1)); else echo "detectada por $(basename "$3" .test.mjs)     $1"; ok=$((ok+1)); fi
}
A9T=tests/node/a9-texto-identico.test.mjs; A9L=tests/node/a9-limites.test.mjs
mutT "A9.0b · a9-texto-identico: cambia el texto de un manejador (Back)"        "s/setStatus('Back to import');/setStatus('Back to import.');/" $A9T
mutT "A9.0b · a9-texto-identico: cambia una línea suelta de main.js"           "s/^    if(modeFoldBtn) modeFoldBtn.style.display='none';\$/    if(modeFoldBtn) modeFoldBtn.style.display='hidden';/" $A9T
mutT "A9.0b · a9-limites: segunda declaración de lastData (regla 6)"           's/^    var problems   = \[\];$/    var problems   = []; var lastData = null;/' $A9L
mutT "A9.0b · a9-limites: envoltorio de enlace tardío no previsto (regla 8)"   's/pickPanelFromEvent, pickCreaseFromEvent });/pickPanelFromEvent: function(e){ return pickPanelFromEvent(e); }, pickCreaseFromEvent });/' $A9L
mutT "A9.0b · a9-limites: el ancla del arnés cambia de texto (regla 9)"        's/^    function setStatus(m){ statusArea.textContent = m; }$/    function setStatus(m){ statusArea.textContent = m;  }/' $A9L
echo "mutaciones detectadas: $ok · no detectadas: $bad"; [ "$bad" = 0 ]
