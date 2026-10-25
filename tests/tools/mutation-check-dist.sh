#!/bin/bash
# Control negativo del BUNDLE (A3; fuente src/ desde A5): muta una COPIA de src/, reconstruye el bundle desde ella (TESS_DIST_ENTRY / TESS_BUILD_ENTRY) y exige que las pruebas del bundle fallen.
cd "$(dirname "$0")/../.." || exit 2
TMP=$(mktemp -d); trap 'rm -rf "$TMP"' EXIT; ok=0; bad=0
mutsrc() { # aplica la mutación sed a TODOS los .js de una COPIA de src/ (nunca al original); falla («NO APLICÓ») si no cambió EXACTAMENTE una línea (A6: una copia duplicada no puede esconder la mutación)
  rm -rf "$TMP/src" "$TMP/src.orig"; cp -R src "$TMP/src"; cp -R src "$TMP/src.orig"; find "$TMP/src" -name '*.js' -exec sed -i '' "$1" {} +; [ "$(diff -r "$TMP/src.orig" "$TMP/src" | grep -c '^<')" = 1 ]; }
browser() { # nombre, patrón, origen (src = copia mutada de src/ · otra carpeta = carpeta de plugin sin mutar), sed, [archivo de prueba]
  if [ "$3" = "src" ]; then mutsrc "$4" || { echo "NO APLICÓ  $1"; bad=$((bad+1)); return; }; var=TESS_DIST_ENTRY; val="$TMP/src/main.js"; else var=TESS_DIST_FROM; val="$PWD/$3"; fi
  if env "$var=$val" node --test --test-name-pattern="$2" "${5:-tests/browser/browser.test.mjs}" >/dev/null 2>&1; then echo "NO DETECTADA  $1"; bad=$((bad+1)); else echo "detectada     $1"; ok=$((ok+1)); fi; }
node_pins() { mutsrc "$2" || { echo "NO APLICÓ  $1"; bad=$((bad+1)); return; }
  if TESS_BUILD_ENTRY="$TMP/src/main.js" node --test tests/node/build.test.mjs >/dev/null 2>&1; then echo "NO DETECTADA  $1"; bad=$((bad+1)); else echo "detectada     $1"; ok=$((ok+1)); fi; }
# precondición: sin mutar, las pruebas del bundle pasan
for pat in "GPU · bundle \(caja, sin arte\)" "Arte · bundle" "Interacciones · bundle" "Geometría en página · bundle \(caja\)"; do node --test --test-name-pattern="$pat" tests/browser/browser.test.mjs >/dev/null 2>&1 || { echo "ERROR: '$pat' falla sin mutaciones"; exit 2; }; done
node --test --test-name-pattern="Puente CEP · (baseline|bundle)" tests/browser/bridge.test.mjs >/dev/null 2>&1 || { echo "ERROR: el puente del bundle falla sin mutaciones"; exit 2; }
node --test tests/node/build.test.mjs >/dev/null 2>&1 || { echo "ERROR: build.test falla sin mutaciones"; exit 2; }; echo "precondición OK"
browser "bundle construido SIN el parche A1 (baseline como fuente)" "GPU · bundle \(caja, sin arte\)" reference/legacy-baseline NONE
browser "bundle: offset del arte frontal"                          "Arte · bundle"                      src 's/ART_TOP_OFFSET = 0.08;/ART_TOP_OFFSET = 0.12;/'
browser "bundle: Shift+clic ya no cambia la base"                  "Interacciones · bundle"             src 's/if(pickPanelFromEvent(e)) return;/if(false) return;/'
browser "bundle: tolerancia del grafo (GRAPH_EPS 0.5→0.6)"         "Geometría en página · bundle \(caja\)" src 's/export const GRAPH_EPS = 0.5;/export const GRAPH_EPS = 0.6;/'
browser "bundle: puente CEP, mensaje de escritura de GLB"         "Puente CEP · (baseline|bundle)"     src "s/'Could not save GLB file'/'Could not write GLB file'/" tests/browser/bridge.test.mjs
node_pins "huellas del bundle: cambio mínimo en la fuente"         's/DEFAULT_THICKNESS_MM = 0.25;/DEFAULT_THICKNESS_MM = 0.26;/'
echo "mutaciones detectadas (bundle): $ok · no detectadas: $bad"; [ "$bad" = 0 ]
