#!/bin/bash
# Control negativo de la batería Node: aplica mutaciones PEQUEÑAS a una COPIA de la fuente src/ (nunca al original) y exige que las pruebas fallen.
# (Desde A5 la fuente del build es src/; panel/main.js queda congelado como referencia A1.)
# Uso: tests/tools/mutation-check.sh        (salida 0 si TODAS las mutaciones fueron detectadas)
cd "$(dirname "$0")/../.." || exit 2
TMP=$(mktemp -d); trap 'rm -rf "$TMP"' EXIT; ok=0; bad=0
# precondición: sin mutar, la batería debe pasar (si no, 'detectada' no significaría nada)
node --test 'tests/node/*.test.mjs' >/dev/null 2>&1 || { echo 'ERROR: la batería falla sin mutaciones'; exit 2; }
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
echo "mutaciones detectadas: $ok · no detectadas: $bad"; [ "$bad" = 0 ]
