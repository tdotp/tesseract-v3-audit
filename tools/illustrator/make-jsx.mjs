// Genera, desde el baseline congelado, scripts .jsx para ejecutar a mano en Illustrator (Archivo ▸ Scripts ▸ Otro script…) SIN instalar ninguna extensión.
//   tesseract_extract_check.jsx : ejecuta el EXTRACT_SCRIPT del plugin TAL CUAL y guarda el JSON (SOLO LECTURA sobre el documento)
//   tesseract_doc_survey.jsx    : inventario del documento (capas, grupos anidados, artboards, versión) — SOLO LECTURA
//   tesseract_art_check.jsx     : ⚠ ejecuta el script de arte del plugin (exporta PNG a la carpeta temporal; cambia TEMPORALMENTE el artboard activo y la
//                                 visibilidad de capas y los restaura). No guarda ni modifica el documento.
// Uso: node tools/illustrator/make-jsx.mjs     (regenera los tres archivos)
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
import { TARGETS, extractScripts } from '../../tests/lib/legacy.mjs';
const here = path.dirname(fileURLToPath(import.meta.url)); const { extract, art } = extractScripts(TARGETS.baseline);
const HEADER = (name, readonly) => `#target illustrator
/*
 * ${name} — Tesseract V3 (herramienta de validación; generado por tools/illustrator/make-jsx.mjs desde reference/legacy-baseline/main.js)
 * ${readonly}
 * Resultado: se guarda en el archivo que elijas (cuadro "Guardar como"). Nada se instala; para quitarlo basta borrar este .jsx.
 */
`;
const SAVE = `
function __tess_save(defaultName, text) {
  var f = File.saveDialog("Guardar resultado como…", "*.json");
  if (!f) { alert("Cancelado: no se guardó nada."); return; }
  f.encoding = "UTF-8"; f.open("w"); f.write(text); f.close();
  alert("Guardado en:\\n" + f.fsName + "\\n\\n" + Math.round(text.length / 1024) + " KB");
}
`;
const wrap = (code) => `var __tess_result;\ntry {\n__tess_result = ${code}\n} catch (e) { __tess_result = '{"error":"' + String(e.message).replace(/"/g, "'") + ' (línea ' + e.line + ')"}'; }\n`;

fs.writeFileSync(path.join(here, 'tesseract_extract_check.jsx'), HEADER('tesseract_extract_check.jsx', 'SOLO LECTURA: no modifica el documento.') + SAVE + wrap(extract.trim().replace(/;?\s*$/, ';')) +
  `var __doc = app.documents.length ? app.activeDocument.name : '(sin documento)';\n__tess_save(__doc, '{"_origen":"EXTRACT_SCRIPT del baseline (sin cambios)","_illustrator":"' + app.version + '","_documento":"' + String(__doc).replace(/"/g, "'") + '","_resultado":' + __tess_result + '}');\n`);

const SURVEY = `
var PT = 0.352778;
function ser(v){ if(v===null||typeof v==="undefined") return "null"; if(typeof v==="boolean") return v?"true":"false"; if(typeof v==="number") return isFinite(v)?String(v):"null";
  if(typeof v==="string") return '"' + v.replace(/\\\\/g,"\\\\\\\\").replace(/"/g,'\\\\"').replace(/\\n/g,"\\\\n").replace(/\\r/g,"\\\\r") + '"';
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
`;
fs.writeFileSync(path.join(here, 'tesseract_doc_survey.jsx'), HEADER('tesseract_doc_survey.jsx', 'SOLO LECTURA: no modifica el documento.') + SAVE + SURVEY + `__tess_save("survey", __tess_result);\n`);

fs.writeFileSync(path.join(here, 'tesseract_art_check.jsx'), HEADER('tesseract_art_check.jsx', '⚠ Exporta PNG a la carpeta temporal y cambia TEMPORALMENTE el artboard activo y la visibilidad de capas (los restaura). No guarda ni modifica el documento.') + SAVE +
  wrap(art.trim().replace(/;?\s*$/, ';')) + `__tess_save("arte", '{"_origen":"buildArtworkExportScript del baseline (sin cambios)","_illustrator":"' + app.version + '","_resultado":' + __tess_result + '}');\n`);
console.log('generados 3 .jsx en', here);
