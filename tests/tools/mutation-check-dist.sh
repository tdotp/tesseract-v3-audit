#!/bin/bash
# Control negativo del BUNDLE (A3): muta una COPIA de panel/, reconstruye el bundle desde ella (TESS_DIST_FROM / TESS_BUILD_SRC) y exige que las pruebas del bundle fallen.
cd "$(dirname "$0")/../.." || exit 2
TMP=$(mktemp -d); trap 'rm -rf "$TMP"' EXIT; ok=0; bad=0
mutate() { rm -rf "$TMP/panel"; cp -R "$2" "$TMP/panel"; chmod -R u+w "$TMP/panel"; if [ "$3" = "NONE" ]; then return 0; fi; cp "$TMP/panel/main.js" "$TMP/orig.js"; sed -i '' "$3" "$TMP/panel/main.js"; cmp -s "$TMP/orig.js" "$TMP/panel/main.js" && return 1; return 0; }
browser() { # nombre, patrón, origen, sed
  mutate x "$3" "$4" || { echo "NO APLICÓ  $1"; bad=$((bad+1)); return; }
  if TESS_DIST_FROM="$TMP/panel" node --test --test-name-pattern="$2" "${5:-tests/browser/browser.test.mjs}" >/dev/null 2>&1; then echo "NO DETECTADA  $1"; bad=$((bad+1)); else echo "detectada     $1"; ok=$((ok+1)); fi; }
node_pins() { mutate x panel "$2" || { echo "NO APLICÓ  $1"; bad=$((bad+1)); return; }
  if TESS_BUILD_SRC="$TMP/panel" node --test tests/node/build.test.mjs >/dev/null 2>&1; then echo "NO DETECTADA  $1"; bad=$((bad+1)); else echo "detectada     $1"; ok=$((ok+1)); fi; }
# precondición: sin mutar, las pruebas del bundle pasan
for pat in "GPU · bundle \(caja, sin arte\)" "Arte · bundle" "Interacciones · bundle" "Geometría en página · bundle \(caja\)"; do node --test --test-name-pattern="$pat" tests/browser/browser.test.mjs >/dev/null 2>&1 || { echo "ERROR: '$pat' falla sin mutaciones"; exit 2; }; done
node --test --test-name-pattern="Puente CEP · (baseline|bundle)" tests/browser/bridge.test.mjs >/dev/null 2>&1 || { echo "ERROR: el puente del bundle falla sin mutaciones"; exit 2; }
node --test tests/node/build.test.mjs >/dev/null 2>&1 || { echo "ERROR: build.test falla sin mutaciones"; exit 2; }; echo "precondición OK"
browser "bundle construido SIN el parche A1 (baseline como fuente)" "GPU · bundle \(caja, sin arte\)" reference/legacy-baseline NONE
browser "bundle: offset del arte frontal"                          "Arte · bundle"                      panel 's/var ART_TOP_OFFSET = 0.08;/var ART_TOP_OFFSET = 0.12;/'
browser "bundle: Shift+clic ya no cambia la base"                  "Interacciones · bundle"             panel 's/if(pickPanelFromEvent(e)) return;/if(false) return;/'
browser "bundle: tolerancia del grafo (GRAPH_EPS 0.5→0.6)"         "Geometría en página · bundle \(caja\)" panel 's/var GRAPH_EPS      = 0.5;/var GRAPH_EPS      = 0.6;/'
browser "bundle: puente CEP, mensaje de escritura de GLB"         "Puente CEP · (baseline|bundle)"     panel "s/'Could not save GLB file'/'Could not write GLB file'/" tests/browser/bridge.test.mjs
node_pins "huellas del bundle: cambio mínimo en la fuente"         's/var DEFAULT_THICKNESS_MM = 0.25;/var DEFAULT_THICKNESS_MM = 0.26;/'
echo "mutaciones detectadas (bundle): $ok · no detectadas: $bad"; [ "$bad" = 0 ]
