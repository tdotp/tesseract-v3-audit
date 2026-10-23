#target illustrator
/*
 * tesseract_doc_survey.jsx — Tesseract V3 (Nivel 0; generado por tools/illustrator/make-jsx.mjs desde reference/legacy-baseline/main.js)
 * SOLO LECTURA: inventario del documento y sondas de comportamiento de ExtendScript; no modifica el documento (el guardián lo comprueba).
 * Guardián de estado incluido: compara y restaura documento, artboard activo, selección, nº de elementos y visibilidad/bloqueo de capas.
 * Resultado: ~/Desktop/Tesseract_Nivel0/<documento>__<script>.json. No instala nada; para quitarlo basta borrar este .jsx y esa carpeta.
 * EJECUTAR SOLO sobre documentos de prueba o copias desechables.
 */

var OUT_DIR = Folder.desktop.fsName + "/Tesseract_Nivel0";
var PT = 0.352778;
function ser(v){ if(v===null||typeof v==="undefined") return "null"; if(typeof v==="boolean") return v?"true":"false"; if(typeof v==="number") return isFinite(v)?String(v):"null";
  if(typeof v==="string") return '"' + v.replace(/\\/g,"\\\\").replace(/"/g,'\\"').replace(/\n/g,"\\n").replace(/\r/g,"\\r").replace(/\t/g,"\\t") + '"';
  if(v instanceof Array){ var a=[]; for(var i=0;i<v.length;i++) a.push(ser(v[i])); return "["+a.join(",")+"]"; }
  var p=[]; for(var k in v){ if(v.hasOwnProperty(k)) p.push(ser(String(k))+":"+ser(v[k])); } return "{"+p.join(",")+"}"; }
function __tess_snap(){
  var o={ documentos: app.documents.length, capas: [] };
  if(!app.documents.length) return o;
  var d=app.activeDocument; o.nombre=d.name; o.artboardActivo=d.artboards.getActiveArtboardIndex(); o.artboards=d.artboards.length; o.items=d.pageItems.length;
  try{ o.seleccion=d.selection ? d.selection.length : 0; }catch(e1){ o.seleccion=-1; }
  try{ o.guardado=d.saved; }catch(e2){ o.guardado=null; }
  (function walk(arr){ for(var i=0;i<arr.length;i++){ var l=arr[i]; o.capas.push({ n:l.name, v:l.visible, l:l.locked }); if(l.layers && l.layers.length) walk(l.layers); } })(d.layers);
  return o; }
function __tess_restore(before){ // devuelve la lista de lo que hubo que restaurar
  var fixed=[]; if(!app.documents.length) return fixed; var d=app.activeDocument;
  try{ if(d.artboards.getActiveArtboardIndex()!==before.artboardActivo){ d.artboards.setActiveArtboardIndex(before.artboardActivo); fixed.push("artboardActivo"); } }catch(e1){ fixed.push("artboardActivo(error)"); }
  var idx=0; (function walk(arr){ for(var i=0;i<arr.length;i++){ var l=arr[i], rec=before.capas[idx++]; if(!rec) continue;
      try{ if(l.locked!==rec.l){ l.locked=rec.l; fixed.push("bloqueo:"+rec.n); } }catch(e2){ fixed.push("bloqueo(error):"+rec.n); }
      try{ if(l.visible!==rec.v){ l.visible=rec.v; fixed.push("visibilidad:"+rec.n); } }catch(e3){ fixed.push("visibilidad(error):"+rec.n); }
      if(l.layers && l.layers.length) walk(l.layers); } })(d.layers);
  return fixed; }
function __tess_selection_ref(){ try{ return app.documents.length ? app.activeDocument.selection : null; }catch(e){ return null; } }
function __tess_restore_selection(ref, before){ try{ if(ref && app.documents.length && app.activeDocument.selection.length!==before.seleccion){ app.activeDocument.selection=ref; return true; } }catch(e){} return false; }
function __tess_integrity(before, fixed, selRestored){
  var after=__tess_snap(); var same=(ser(before)===ser(after));
  return { antes: before, despues: after, identicos: same, restaurado: fixed, seleccionRestaurada: selRestored, nota: same ? "El estado del documento es idéntico antes y después." : "DIFERENCIA tras restaurar: revisar a mano (ver antes/después)." }; }
function __tess_env(){ var e={ illustrator: app.version, os: ""+$.os, extendscript: ""+$.version, locale: "" }; try{ e.locale=""+$.locale; }catch(x){} try{ e.nombre=""+app.name; }catch(y){} try{ e.temp=Folder.temp.fsName; }catch(z){} try{ e.escritorio=Folder.desktop.fsName; }catch(w){} return e; }
function __tess_write(scriptName, obj){
  var folder=new Folder(OUT_DIR); if(!folder.exists) folder.create();
  var doc=app.documents.length ? app.activeDocument.name : "sin_documento"; var safe=String(doc).replace(/[^A-Za-z0-9_\-\.]+/g,"_");
  var f=new File(folder.fsName+"/"+safe+"__"+scriptName+".json"); f.encoding="UTF-8"; f.open("w"); f.write(ser(obj)); f.close();
  alert("Tesseract Nivel 0 · "+scriptName+"\n\nGuardado en:\n"+f.fsName+"\n\nEstado del documento idéntico antes/después: "+(obj._integridad && obj._integridad.identicos ? "SÍ" : "NO — avisa a Claude"));
  return f.fsName; }

function groupDepth(g){ var m=0; for (var i=0;i<g.groupItems.length;i++){ m=Math.max(m, groupDepth(g.groupItems[i])); } return 1+m; }
function surveyContainer(c){ var o={ pathItems:c.pathItems.length, groupItems:c.groupItems.length, compoundPathItems:c.compoundPathItems.length, maxGroupDepth:0, guidesOrClipping:0, pathsEnGrupos:0, subtrazadosCompuestos:0, puntos:0 };
  var i, j; for(i=0;i<c.groupItems.length;i++){ o.maxGroupDepth=Math.max(o.maxGroupDepth, groupDepth(c.groupItems[i])); o.pathsEnGrupos+=c.groupItems[i].pathItems.length; }
  for(i=0;i<c.pathItems.length;i++){ var p=c.pathItems[i]; if(p.guides||p.clipping) o.guidesOrClipping++; o.puntos+=p.pathPoints.length; }
  for(i=0;i<c.compoundPathItems.length;i++){ o.subtrazadosCompuestos+=c.compoundPathItems[i].pathItems.length; } return o; }
function surveyLayer(l, depth){ var o={ name:l.name, depth:depth, visible:l.visible, locked:l.locked, items:surveyContainer(l), sublayers:[] };
  for(var i=0;i<l.layers.length;i++) o.sublayers.push(surveyLayer(l.layers[i], depth+1)); return o; }
function firstOf(c, key){ return c[key] && c[key].length ? c[key][0] : null; }
function findFirst(doc, key){ var r=null; (function walk(arr){ for(var i=0;i<arr.length&&!r;i++){ var l=arr[i]; var f=firstOf(l,key); if(f){ r=f; return; } for(var g=0;g<l.groupItems.length&&!r;g++){ var gf=firstOf(l.groupItems[g],key); if(gf) r=gf; } if(!r && l.layers && l.layers.length) walk(l.layers); } })(doc.layers); return r; }
function probes(doc){ // SONDAS de comportamiento de ExtendScript real (contraste con la maqueta de los tests)
  var P={}; var g=findFirst(doc,"groupItems"), p=findFirst(doc,"pathItems"), cp=findFirst(doc,"compoundPathItems");
  P.layer0={ typename:doc.layers.length?doc.layers[0].typename:null, tieneLayers:doc.layers.length?(typeof doc.layers[0].layers):null, orden:"doc.layers[0] es la capa SUPERIOR en el panel Capas" };
  if(g){ P.groupItem={ typename:g.typename, typeofLayers:typeof g.layers, tienePathItems:typeof g.pathItems, tieneGroupItems:typeof g.groupItems, tieneCompound:typeof g.compoundPathItems };
    try{ var n=g.layers.length; P.groupItem.layersLengthLanza=false; P.groupItem.layersLength=n; }catch(e){ P.groupItem.layersLengthLanza=true; P.groupItem.mensajeError=String(e.message); P.groupItem.nombreError=String(e.name); P.groupItem.numeroError=e.number; } } else P.groupItem=null;
  if(p){ P.pathItem={ typename:p.typename, closed:p.closed, guides:p.guides, clipping:p.clipping, puntos:p.pathPoints.length, parentTypename:p.parent?p.parent.typename:null };
    var pp=p.pathPoints[0]; P.pathPoint={ anchorTipo:Object.prototype.toString.call(pp.anchor), anchorLen:pp.anchor.length, left:pp.leftDirection.length, right:pp.rightDirection.length, anchorMuestra:[pp.anchor[0],pp.anchor[1]], leftMuestra:[pp.leftDirection[0],pp.leftDirection[1]], tipo:""+pp.pointType };
    try{ var gb=p.geometricBounds; P.pathItem.geometricBounds=[gb[0],gb[1],gb[2],gb[3]]; }catch(e2){} } else P.pathItem=null;
  if(cp){ P.compound={ typename:cp.typename, subtrazados:cp.pathItems.length, hijo0:cp.pathItems.length?{ typename:cp.pathItems[0].typename, parentTypename:cp.pathItems[0].parent.typename, guides:cp.pathItems[0].guides, clipping:cp.pathItems[0].clipping }:null }; } else P.compound=null;
  P.artboard0={ rect:(function(){ var r=doc.artboards[0].artboardRect; return [r[0],r[1],r[2],r[3]]; })(), indiceActivo:doc.artboards.getActiveArtboardIndex(), nombre:doc.artboards[0].name, nota:"Compara con anclas de los trazados para inferir origen y sentido del eje Y" };
  try{ P.rulerUnits=""+doc.rulerUnits; }catch(e3){} try{ P.colorSpace=""+doc.documentColorSpace; }catch(e4){} try{ P.seleccion=doc.selection.length; }catch(e5){}
  P.totales={ pageItems:doc.pageItems.length, pathItems:doc.pathItems.length, groupItems:doc.groupItems.length, compoundPathItems:doc.compoundPathItems.length, layers:doc.layers.length };
  return P; }
var __survey;
var __before=__tess_snap(), __selRef=__tess_selection_ref(), __fixed=[], __selRest=false;
try {
  if(!app.documents.length) __survey = { error: "No document open" };
  else { var doc=app.activeDocument; __survey={ documento: doc.name, artboards:[], layers:[],
      nota:"maxGroupDepth >= 2 en la capa de corte o de pliegue dispara el defecto KI-10 del extractor actual (grupos anidados)." };
    for(var a=0;a<doc.artboards.length;a++){ var r=doc.artboards[a].artboardRect; __survey.artboards.push({ name:doc.artboards[a].name, rect:[r[0],r[1],r[2],r[3]], widthMm:Math.abs(r[2]-r[0])*PT, heightMm:Math.abs(r[1]-r[3])*PT }); }
    for(var l=0;l<doc.layers.length;l++) __survey.layers.push(surveyLayer(doc.layers[l], 0));
    try{ __survey.sondas=probes(doc); }catch(ep){ __survey.sondas={ error:String(ep.message), line:ep.line }; } }
} catch(e) { __survey = { error: String(e.message), line: e.line }; }
finally { try{ __fixed=__tess_restore(__before); }catch(e4){ __fixed=["restauración fallida: "+e4.message]; } __selRest=__tess_restore_selection(__selRef, __before); }
__tess_write("survey", { _origen: "tesseract_doc_survey.jsx", _script: "survey", _env: __tess_env(), _integridad: __tess_integrity(__before, __fixed, __selRest), _resultado: __survey });
