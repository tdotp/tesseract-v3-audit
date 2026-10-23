#target illustrator
/*
 * tesseract_doc_survey.jsx — Tesseract V3 (herramienta de validación; generado por tools/illustrator/make-jsx.mjs desde reference/legacy-baseline/main.js)
 * SOLO LECTURA: no modifica el documento.
 * Resultado: se guarda en el archivo que elijas (cuadro "Guardar como"). Nada se instala; para quitarlo basta borrar este .jsx.
 */

function __tess_save(defaultName, text) {
  var f = File.saveDialog("Guardar resultado como…", "*.json");
  if (!f) { alert("Cancelado: no se guardó nada."); return; }
  f.encoding = "UTF-8"; f.open("w"); f.write(text); f.close();
  alert("Guardado en:\n" + f.fsName + "\n\n" + Math.round(text.length / 1024) + " KB");
}

var PT = 0.352778;
function ser(v){ if(v===null||typeof v==="undefined") return "null"; if(typeof v==="boolean") return v?"true":"false"; if(typeof v==="number") return isFinite(v)?String(v):"null";
  if(typeof v==="string") return '"' + v.replace(/\\/g,"\\\\").replace(/"/g,'\\"').replace(/\n/g,"\\n").replace(/\r/g,"\\r") + '"';
  if(v instanceof Array){ var a=[]; for(var i=0;i<v.length;i++) a.push(ser(v[i])); return "["+a.join(",")+"]"; }
  var p=[]; for(var k in v){ if(v.hasOwnProperty(k)) p.push(ser(String(k))+":"+ser(v[k])); } return "{"+p.join(",")+"}"; }
function groupDepth(g){ var d=1, m=0; for (var i=0;i<g.groupItems.length;i++){ m=Math.max(m, groupDepth(g.groupItems[i])); } return d+m; }
function surveyContainer(c){ var o={ pathItems:c.pathItems.length, groupItems:c.groupItems.length, compoundPathItems:c.compoundPathItems.length, maxGroupDepth:0, guidesOrClipping:0 };
  var i; for(i=0;i<c.groupItems.length;i++) o.maxGroupDepth=Math.max(o.maxGroupDepth, groupDepth(c.groupItems[i]));
  for(i=0;i<c.pathItems.length;i++){ var p=c.pathItems[i]; if(p.guides||p.clipping) o.guidesOrClipping++; } return o; }
function surveyLayer(l, depth){ var o={ name:l.name, depth:depth, visible:l.visible, locked:l.locked, items:surveyContainer(l), sublayers:[] };
  for(var i=0;i<l.layers.length;i++) o.sublayers.push(surveyLayer(l.layers[i], depth+1)); return o; }
var out;
try {
  if(!app.documents.length) out = { error: "No document open" };
  else { var doc=app.activeDocument; out={ illustrator: app.version, documento: doc.name, artboards:[], layers:[],
      nota:"maxGroupDepth >= 2 en la capa de corte o de pliegue dispara el defecto KI-10 del extractor actual (grupos anidados)." };
    for(var a=0;a<doc.artboards.length;a++){ var r=doc.artboards[a].artboardRect; out.artboards.push({ name:doc.artboards[a].name, widthMm:Math.abs(r[2]-r[0])*PT, heightMm:Math.abs(r[1]-r[3])*PT }); }
    for(var l=0;l<doc.layers.length;l++) out.layers.push(surveyLayer(doc.layers[l], 0)); }
} catch(e) { out = { error: String(e.message), line: e.line }; }
var __tess_result = ser(out);
__tess_save("survey", __tess_result);
