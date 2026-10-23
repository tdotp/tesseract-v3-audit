#target illustrator
/*
 * tesseract_art_check.jsx — Tesseract V3 (Nivel 0; generado por tools/illustrator/make-jsx.mjs desde reference/legacy-baseline/main.js)
 * ⚠ Exporta PNG a la carpeta temporal y cambia TEMPORALMENTE el artboard activo y la visibilidad de capas; el guardián lo restaura SIEMPRE (también ante errores). No guarda ni modifica el documento.
 * Guardián de estado incluido: compara y restaura documento, artboard activo, selección, nº de elementos y visibilidad/bloqueo de capas.
 * Resultado: ~/Desktop/Tesseract_Nivel0/<documento>__<script>.json. No instala nada; para quitarlo basta borrar este .jsx y esa carpeta.
 * EJECUTAR SOLO sobre documentos de prueba o copias desechables.
 */

var OUT_DIR = Folder.desktop.fsName + "/Tesseract_Nivel0"; // por defecto; un orquestador puede fijar $.global.TESS_OUT_DIR (p. ej. /tmp) para evitar permisos de carpetas protegidas
try{ if($.global.TESS_OUT_DIR) OUT_DIR = String($.global.TESS_OUT_DIR); }catch(eo){}
var __QUIET = false; try{ __QUIET = !!$.global.TESS_NO_ALERT; }catch(eq){} // sin cuadros modales cuando lo ejecuta un orquestador
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
  if(!__QUIET) alert("Tesseract Nivel 0 · "+scriptName+"\n\nGuardado en:\n"+f.fsName+"\n\nEstado del documento idéntico antes/después: "+(obj._integridad && obj._integridad.identicos ? "SÍ" : "NO — avisa a Claude"));
  return f.fsName; }

function __tess_png_size(path){ try{ var f=new File(path); if(!f.exists) return null; f.encoding="BINARY"; f.open("r"); f.seek(16); var b=f.read(8); f.close(); if(!b || b.length<8) return null; function u32(s){ return ((s.charCodeAt(0)&255)*16777216)+((s.charCodeAt(1)&255)*65536)+((s.charCodeAt(2)&255)*256)+(s.charCodeAt(3)&255); } return { ancho:u32(b.substr(0,4)), alto:u32(b.substr(4,4)), bytes:f.length }; }catch(e){ return null; } }

var __before=__tess_snap(), __selRef=__tess_selection_ref(), __raw, __fixed=[], __selRest=false;
try {
__raw = (function(){
var toJSON=(function(){
  function esc(s){ var r="",c; s=String(s||""); for(var i=0;i<s.length;i++){ c=s.charAt(i);
    if(c==String.fromCharCode(92)) r+=String.fromCharCode(92,92);
    else if(c==String.fromCharCode(34)) r+=String.fromCharCode(92,34);
    else if(c==String.fromCharCode(10)) r+=String.fromCharCode(92,110);
    else if(c==String.fromCharCode(13)) r+=String.fromCharCode(92,114);
    else if(c==String.fromCharCode(9)) r+=String.fromCharCode(92,116);
    else r+=c; } return r; }
  function ser(v){
    if(v===null||typeof v==="undefined") return "null";
    if(typeof v==="boolean") return v?"true":"false";
    if(typeof v==="number") return isFinite(v)?String(v):"null";
    if(typeof v==="string") return String.fromCharCode(34)+esc(v)+String.fromCharCode(34);
    if(v instanceof Array){ var a=[]; for(var i=0;i<v.length;i++) a.push(ser(v[i])); return "["+a.join(",")+"]"; }
    if(typeof v==="object"){ var p=[]; for(var k in v){ if(v.hasOwnProperty(k)) p.push(String.fromCharCode(34)+esc(String(k))+String.fromCharCode(34)+":"+ser(v[k])); } return "{"+p.join(",")+"}"; }
    return "null"; }
  return ser; })();
try{
  if(!app.documents.length) return toJSON({error:"No document open"});
  var doc=app.activeDocument;
  var PT=0.352778;
  function lo(s){ return String(s||"").toLowerCase().replace(/^\s+|\s+$/g,""); }
  function roleForName(n){ n=lo(n); if(n==="front"||n==="tiro") return "front"; if(n==="back"||n==="retiro") return "back"; return ""; }
  function mmRectFromAB(ab){ var r=ab.artboardRect; var left=r[0]*PT, top=r[1]*PT, right=r[2]*PT, bottom=r[3]*PT; return {left:left, top:top, right:right, bottom:bottom, width:Math.abs(right-left), height:Math.abs(top-bottom)}; }
  function slug(s){ return String(s||"art").replace(/\.[^\.]+$/,"").replace(/[^a-zA-Z0-9_\-]+/g,"_"); }
  var outFolder=new Folder(Folder.temp.fsName+"/tesseract_art"); if(!outFolder.exists) outFolder.create();
  var stamp=(new Date()).getTime();
  var result={ok:true,mode:"none",front:null,back:null,available:{artboards:[],layers:[]},activeArtboardIndex:doc.artboards.getActiveArtboardIndex()};
  function exportActiveArtboardToPNG(label){ var idx=doc.artboards.getActiveArtboardIndex(); var ab=doc.artboards[idx]; var r=ab.artboardRect; var widthPt=Math.abs(r[2]-r[0]); var heightPt=Math.abs(r[1]-r[3]); var maxSidePt=Math.max(widthPt,heightPt); var targetMaxPx=4096; var scalePct=maxSidePt>0?Math.min(800,Math.max(100,(targetMaxPx/maxSidePt)*100)):100; var file=new File(outFolder.fsName+"/"+slug(doc.name)+"_"+label+"_"+stamp+".png"); var opt=new ExportOptionsPNG24(); opt.antiAliasing=true; opt.transparency=true; opt.artBoardClipping=true; opt.horizontalScale=scalePct; opt.verticalScale=scalePct; doc.exportFile(file,ExportType.PNG24,opt); return {path:file.fsName, rect:mmRectFromAB(ab), label:label, exportScale:scalePct}; }
  function exportArtboardByIndex(idx,label){ var prev=doc.artboards.getActiveArtboardIndex(); doc.artboards.setActiveArtboardIndex(idx); var out=exportActiveArtboardToPNG(label); doc.artboards.setActiveArtboardIndex(prev); return out; }
  var artboardFront=null, artboardBack=null;
  for(var ai=0;ai<doc.artboards.length;ai++){ var ab=doc.artboards[ai]; var role=roleForName(ab.name); result.available.artboards.push({name:ab.name,index:ai,role:role}); if(role==="front" && !artboardFront) artboardFront={index:ai,name:ab.name}; if(role==="back" && !artboardBack) artboardBack={index:ai,name:ab.name}; }
  function visitLayers(container,acc){ for(var li=0;li<container.layers.length;li++){ var lyr=container.layers[li]; var role=roleForName(lyr.name); acc.push({layer:lyr,role:role,name:lyr.name}); if(lyr.layers&&lyr.layers.length) visitLayers(lyr,acc); } }
  var layerRefs=[]; visitLayers(doc,layerRefs);
  for(var lr=0;lr<layerRefs.length;lr++){ result.available.layers.push({name:layerRefs[lr].name,role:layerRefs[lr].role}); }
  if(artboardFront||artboardBack){
    result.mode="artboards";
    if(artboardFront) result.front=exportArtboardByIndex(artboardFront.index,"front");
    if(artboardBack) result.back=exportArtboardByIndex(artboardBack.index,"back");
    return toJSON(result);
  }
  function snapVis(container,arr){ for(var i=0;i<container.layers.length;i++){ var lyr=container.layers[i]; arr.push({layer:lyr,visible:lyr.visible}); if(lyr.layers&&lyr.layers.length) snapVis(lyr,arr); } }
  function restoreVis(arr){ for(var i=0;i<arr.length;i++){ try{ arr[i].layer.visible=arr[i].visible; }catch(ex){} } }
  function hideAll(container){ for(var i=0;i<container.layers.length;i++){ var lyr=container.layers[i]; lyr.visible=false; if(lyr.layers&&lyr.layers.length) hideAll(lyr); } }
  function showBranch(layer){ var ptr=layer; while(ptr&&ptr.typename!=="Document"){ try{ ptr.visible=true; }catch(ex){} ptr=ptr.parent; } function showKids(node){ if(!node.layers) return; for(var i=0;i<node.layers.length;i++){ try{ node.layers[i].visible=true; }catch(ex){} showKids(node.layers[i]); } } showKids(layer); }
  function findRoleLayer(role){ for(var i=0;i<layerRefs.length;i++){ if(layerRefs[i].role===role) return layerRefs[i].layer; } return null; }
  var frontLayer=findRoleLayer("front"), backLayer=findRoleLayer("back");
  if(frontLayer||backLayer){
    result.mode="layers";
    var states=[]; snapVis(doc,states);
    try{
      if(frontLayer){ hideAll(doc); showBranch(frontLayer); result.front=exportActiveArtboardToPNG("front"); }
      if(backLayer){ hideAll(doc); showBranch(backLayer); result.back=exportActiveArtboardToPNG("back"); }
    } finally { restoreVis(states); }
  }
  return toJSON(result);
}catch(e){ return toJSON({error:"Artwork export failed: "+e.message+" line:"+e.line}); }
})();
} catch (e) { __raw = '{"error":"' + String(e.message).replace(/"/g, "'") + ' (línea ' + e.line + ')"}'; }
finally { try{ __fixed=__tess_restore(__before); }catch(e4){ __fixed=["restauración fallida: "+e4.message]; } __selRest=__tess_restore_selection(__selRef, __before); }
var __parsed; try{ __parsed=eval("("+__raw+")"); }catch(e5){ __parsed={ error:"resultado no es JSON: "+String(e5.message) }; }
try{ var __sides=["front","back"]; for(var __i=0;__i<2;__i++){ var __s=__parsed[__sides[__i]]; if(__s && __s.path){ __s.png=__tess_png_size(__s.path); } } }catch(e6){}
__tess_write("art", { _origen: "buildArtworkExportScript del baseline (sin cambios)", _script: "art", _env: __tess_env(), _integridad: __tess_integrity(__before, __fixed, __selRest), _resultado: __parsed });
