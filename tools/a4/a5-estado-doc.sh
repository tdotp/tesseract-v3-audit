#!/bin/bash
# A5-CEP — SOLO LECTURA: estado del documento desechable activo (N0-*) en Illustrator real, en el mismo formato que la evidencia de A4
# (docs/fase1/a4-real/n0b-estado-*.txt): documentos, nombre, artboard activo, capas [nombre, visible, bloqueada], selección, elementos, guardado.
#   tools/a4/a5-estado-doc.sh <archivo-de-salida>
# No modifica nada; se niega si no hay documento o si el activo no es de prueba N0-*. Requiere el permiso de Automatización ya concedido (Nivel 0/A4).
set -u
OUT="${1:?uso: a5-estado-doc.sh <archivo-de-salida>}"
JSX='(function(){ if(!app.documents.length) return "ERROR: sin documentos"; var d=app.activeDocument; if(d.name.indexOf("N0-")!==0) return "ERROR: el documento activo no es de prueba N0-*: "+d.name; var L=[]; for(var i=0;i<d.layers.length;i++){ L.push([d.layers[i].name, d.layers[i].visible, d.layers[i].locked]); } return ({docs:app.documents.length, name:d.name, activeArtboard:d.artboards.getActiveArtboardIndex(), artboards:d.artboards.length, layers:L, selection:d.selection.length, items:d.pageItems.length, saved:d.saved}).toSource(); })();'
r=$(osascript -e "tell application \"Adobe Illustrator\" to do javascript \"$(printf '%s' "$JSX" | sed 's/\\/\\\\/g; s/"/\\"/g')\"" 2>&1) || { echo "FALLA osascript: $r"; exit 1; }
case "$r" in ERROR:*) echo "$r"; exit 3;; esac
printf '%s\n' "$r" > "$OUT"; echo "estado guardado en $OUT"; cat "$OUT"
