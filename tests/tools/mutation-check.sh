#!/bin/bash
# Control negativo de la batería Node: aplica mutaciones PEQUEÑAS a una COPIA de la fuente src/ (nunca al original) y exige que las pruebas fallen.
# (Desde A5 la fuente del build es src/; panel/main.js queda congelado como referencia A1.)
# Uso: tests/tools/mutation-check.sh        (salida 0 si TODAS las mutaciones fueron detectadas)
cd "$(dirname "$0")/../.." || exit 2
TMP=$(mktemp -d); trap 'rm -rf "$TMP"' EXIT; ok=0; bad=0
# precondición: sin mutar, la batería debe pasar (si no, 'detectada' no significaría nada)
node --test 'tests/node/*.test.mjs' >/dev/null 2>&1 || { echo 'ERROR: la batería falla sin mutaciones'; exit 2; }
mutsrc() { # aplica la mutación sed a TODOS los .js de una COPIA de src/ (nunca al original); falla si no cambió nada
  rm -rf "$TMP/src" "$TMP/src.orig"; cp -R src "$TMP/src"; cp -R src "$TMP/src.orig"; find "$TMP/src" -name '*.js' -exec sed -i '' "$1" {} +; ! diff -rq "$TMP/src.orig" "$TMP/src" >/dev/null; }
mut() { # nombre, patrón sed
  mutsrc "$2" || { echo "NO APLICÓ  $1"; bad=$((bad+1)); return; }
  if TESS_SRC_DIR="$TMP/src" node --test 'tests/node/*.test.mjs' >/dev/null 2>&1; then echo "NO DETECTADA  $1"; bad=$((bad+1)); else echo "detectada     $1"; ok=$((ok+1)); fi
}
mut "GRAPH_EPS 0.5→0.6"                         's/var GRAPH_EPS      = 0.5;/var GRAPH_EPS      = 0.6;/'
mut "TOLERANCE_MM 0.5→0.4"                      's/var TOLERANCE_MM   = 0.5;/var TOLERANCE_MM   = 0.4;/'
mut "color del preset kraft"                    "s/shell:'#b7aa87'/shell:'#b7aa88'/"
mut "espesor por defecto 0.25→0.30"             's/var DEFAULT_THICKNESS_MM = 0.25;/var DEFAULT_THICKNESS_MM = 0.30;/'
mut "umbral de panel pequeño (absArea < 4 → < 5)" 's/if(absArea < 4) return;/if(absArea < 5) return;/'
mut "filtro de panel delgado (aspect > 30 → > 41)" 's/if(aspect > 30 \&\& absArea < 120) return;/if(aspect > 41 \&\& absArea < 120) return;/'
mut "tolerancia de punto-sobre-segmento (GRAPH_EPS → 0.2)" 's/return d1>GRAPH_EPS \&\& d2>GRAPH_EPS \&\& Math.abs(d1+d2-len)<GRAPH_EPS;/return d1>GRAPH_EPS \&\& d2>GRAPH_EPS \&\& Math.abs(d1+d2-len)<0.2;/'
mut "búsqueda de vértice (ptEq: < GRAPH_EPS → < 0.2)" 's/function ptEq(a,b){ return dist2d(a,b) < GRAPH_EPS; }/function ptEq(a,b){ return dist2d(a,b) < 0.2; }/'
# Nota: la mutación del épsilon de paralelismo en segSegIntersect (1e-9) es inalcanzable con troqueles realistas (exige rectas con ángulo ~1e-7 rad) y no se contrasta.
mut "factor pt→mm del extractor"                's/var PT=0.352778; var EPS=0.5; var SMALL=10;/var PT=0.35; var EPS=0.5; var SMALL=10;/'
mut "tope de escala del PNG de arte (800→700)"  's/Math.min(800,Math.max(100/Math.min(700,Math.max(100/'
mut "offset del arte (ART_TOP_OFFSET 0.08→0.09)" 's/var ART_TOP_OFFSET = 0.08;/var ART_TOP_OFFSET = 0.09;/'
echo "mutaciones detectadas: $ok · no detectadas: $bad"; [ "$bad" = 0 ]
