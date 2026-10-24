#!/bin/bash
# Control negativo de la batería de navegador: cada mutación se aplica a una COPIA de panel/ (TESS_PANEL_DIR) y debe hacer fallar la prueba indicada.
cd "$(dirname "$0")/../.." || exit 2
TMP=$(mktemp -d); trap 'rm -rf "$TMP"' EXIT; ok=0; bad=0
# precondición: sin mutar, cada patrón debe PASAR (si no, 'detectada' no significaría nada)
for pat in "GPU · panel \(caja, sin arte\)" "Escena/materiales · panel" "Arte · panel" "GLB · panel \(caja\)" "Interacciones · panel"; do
  node --test --test-name-pattern="$pat" tests/browser/browser.test.mjs >/dev/null 2>&1 || { echo "ERROR: la prueba '$pat' falla sin mutaciones"; exit 2; }
done
node --test --test-name-pattern="Puente CEP · (baseline|panel)" tests/browser/bridge.test.mjs >/dev/null 2>&1 || { echo "ERROR: la prueba del puente falla sin mutaciones"; exit 2; }
echo "precondición OK (6 patrones pasan sin mutar)"
run() { # nombre, patrón de prueba, comando de mutación (opera sobre $TMP/panel/main.js) ; si es "REVERT" usa el baseline como panel
  rm -rf "$TMP/panel"; cp -R panel "$TMP/panel"; chmod -R u+w "$TMP/panel"
  if [ "$3" = "REVERT" ]; then rm -rf "$TMP/panel"; cp -R reference/legacy-baseline "$TMP/panel"; chmod -R u+w "$TMP/panel"; else cp "$TMP/panel/main.js" "$TMP/orig.js"; sed -i '' "$3" "$TMP/panel/main.js"; cmp -s "$TMP/orig.js" "$TMP/panel/main.js" && { echo "NO APLICÓ  $1"; bad=$((bad+1)); return; }; fi
  if TESS_PANEL_DIR="$TMP/panel" node --test --test-name-pattern="$2" "${4:-tests/browser/browser.test.mjs}" >/dev/null 2>&1; then echo "NO DETECTADA  $1"; bad=$((bad+1)); else echo "detectada     $1"; ok=$((ok+1)); fi
}
run "se revierte el parche A1 (fuga vuelve)"        "GPU · panel \(caja, sin arte\)"  REVERT
run "etiquetas: la caché deja de reutilizar"        "GPU · panel \(caja, sin arte\)"  's/var r = labelCache\[key\];/var r = null;/'
run "color del preset white (shell)"                "Escena/materiales · panel"       "s/shell:'#d9d5cc'/shell:'#d9d5cd'/"
run "luz direccional 0.8 → 0.9"                     "Escena/materiales · panel"       's/new THREE.DirectionalLight(0xffffff,0.8)/new THREE.DirectionalLight(0xffffff,0.9)/'
run "desplazamiento del arte frontal"               "Arte · panel"                    's/var ART_TOP_OFFSET = 0.08;/var ART_TOP_OFFSET = 0.12;/'
run "UV del arte (se invierte v)"                   "Arte · panel"                    's/var v = (artRect.top - y) \/ artRect.height;/var v = (y - artRect.top) \/ artRect.height;/'
run "generador del GLB"                             "GLB · panel \(caja\)"            "s/generator:'Tesseract Phase 7B'/generator:'Tesseract Phase 7C'/"
run "rugosidad del GLB (1 → 0.5)"                   "GLB · panel \(caja\)"            's/roughnessFactor: 1$/roughnessFactor: 0.5/'
run "zoom de la rueda (1.08 → 1.10)"                "Interacciones · panel"           's/var delta=(e.deltaY>0)?1.08:0.92;/var delta=(e.deltaY>0)?1.10:0.92;/'
run "Shift+clic ya no cambia la base"               "Interacciones · panel"           's/if(pickPanelFromEvent(e)) return;/if(false) return;/'
run "puente: evalScriptJSON deja de tratar «EvalScript error.»" "Puente CEP · (baseline|panel)" "s/ || result==='null' || result==='EvalScript error.') throw new Error(String(result || 'No result returned'));/ || result==='null') throw new Error(String(result || 'No result returned'));/" tests/browser/bridge.test.mjs
run "puente: mensaje de escritura de GLB"            "Puente CEP · (baseline|panel)" "s/'Could not save GLB file'/'Could not write GLB file'/" tests/browser/bridge.test.mjs
run "puente: codificación por defecto Base64 → base64" "Puente CEP · (baseline|panel)" "s/|| 'Base64';/|| 'base64';/" tests/browser/bridge.test.mjs
run "puente: ensureCep ya no deshabilita «Back»"     "Puente CEP · (baseline|panel)" 's/\[testBtn,extractBtn,previewBtn,continueBtn,backBtn,export3dBtn\]/[testBtn,extractBtn,previewBtn,continueBtn,export3dBtn]/' tests/browser/bridge.test.mjs
run "KI-25 corregido sin tarea (mensaje final del GLB)" "Puente CEP · (baseline|panel)" "s/setStatus('GLB exported from current 3D pose');//" tests/browser/bridge.test.mjs
run "KI-24 corregido sin tarea (buildChildrenOfMap)" "Puente CEP · (baseline|panel)" 's/rebuildCreaseVisuals(buildChildrenOfMap());/rebuildCreaseVisuals([]);/' tests/browser/bridge.test.mjs
echo "mutaciones detectadas: $ok · no detectadas: $bad"; [ "$bad" = 0 ]
