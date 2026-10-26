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
echo "precondición OK (9 patrones pasan sin mutar)"
mutsrc() { # aplica la mutación sed a TODOS los .js de una COPIA de src/ (nunca al original); falla («NO APLICÓ») si no cambió EXACTAMENTE una línea (A6: una copia duplicada no puede esconder la mutación)
  rm -rf "$TMP/src" "$TMP/src.orig"; cp -R src "$TMP/src"; cp -R src "$TMP/src.orig"; find "$TMP/src" -name '*.js' -exec sed -i '' "$1" {} +; [ "$(diff -r "$TMP/src.orig" "$TMP/src" | grep -c '^<')" = 1 ]; }
run() { # nombre, patrón de prueba, mutación sed (sobre una copia de src/) o REVERT (bundle construido desde el baseline, sin el parche A1), [archivo de prueba]
  if [ "$3" = "REVERT" ]; then var=TESS_DIST_FROM; val="$PWD/reference/legacy-baseline"; else mutsrc "$3" || { echo "NO APLICÓ  $1"; bad=$((bad+1)); return; }; var=TESS_DIST_ENTRY; val="$TMP/src/main.js"; fi
  if env "$var=$val" node --test --test-name-pattern="$2" "${4:-tests/browser/browser.test.mjs}" >/dev/null 2>&1; then echo "NO DETECTADA  $1"; bad=$((bad+1)); else echo "detectada     $1"; ok=$((ok+1)); fi
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
run "A7 · clearAllMeshes deja de liberar los visuales de pliegue"  "A7 · ciclo de vida"  's/      disposeCreaseVisuals();   \/\* A1 \*\//      \/\* A7-mut \*\//'  tests/browser/a7.test.mjs
run "A7 · disposeObject3D deja de recorrer los hijos"             "A7 · ciclo de vida"  's/obj.children.slice().forEach(function(ch){ disposeObject3D(ch); });/void 0;/'  tests/browser/a7.test.mjs
run "A7 · centro del panel (userData.center) calculado distinto"  "A7 · inventario de escena"  's/center:getPolyCentroid(centered),/center:getPolyCentroid(centered.slice(1)),/'  tests/browser/a7.test.mjs
# A7.1 — estado compartido S y vista de depuración
run "A7 · orden de inserción: fold-bridges pasa delante en la escena (G1)"  "A7 · inventario de escena"  's/S.scene3d.add(S.foldBridgeGroup);/S.scene3d.add(S.foldBridgeGroup); S.scene3d.children.unshift(S.scene3d.children.pop());/'  tests/browser/a7.test.mjs
run "A7 · vista de depuración: baseIndex devuelve otro campo"           "Interacciones · bundle"     's/get baseIndex(){return S.currentBasePanelIndex}/get baseIndex(){return S.selectedFoldEdgeIdx}/'
run "A7 · estado inicial: espesor 0.30 en createAppState"              "Regresión · baseline vs bundle \(caja\)"  's/currentThicknessMm: DEFAULT_THICKNESS_MM,/currentThicknessMm: 0.30,/'
run "A7 · clearAllMeshes libera la textura de arte compartida (rompe L1)" "A7 · ciclo de vida"  's/      disposeLabelCache();      \/\* A1 \*\//      disposeLabelCache();      \/\* A1 \*\/ if(S.currentArtState \&\& S.currentArtState.front) S.currentArtState.front.texture.dispose();/'  tests/browser/a7.test.mjs
echo "mutaciones detectadas: $ok · no detectadas: $bad"; [ "$bad" = 0 ]
