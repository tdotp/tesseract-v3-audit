#target illustrator
/*
 * tesseract_extract_check.jsx — Tesseract V3 (Nivel 0; generado por tools/illustrator/make-jsx.mjs desde reference/legacy-baseline/main.js)
 * SOLO LECTURA: no modifica el documento (el guardián lo comprueba).
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

var __before=__tess_snap(), __selRef=__tess_selection_ref(), __raw, __fixed=[], __selRest=false;
try {
__raw = (function(){
try{
var toJSON=(function(){
  function esc(s){ var r="",c; for(var i=0;i<s.length;i++){ c=s.charAt(i);
    if(c==String.fromCharCode(92)) r+=String.fromCharCode(92,92);
    else if(c==String.fromCharCode(34)) r+=String.fromCharCode(92,34);
    else if(c==String.fromCharCode(10)) r+=String.fromCharCode(92,110);
    else if(c==String.fromCharCode(13)) r+=String.fromCharCode(92,114);
    else if(c==String.fromCharCode(9))  r+=String.fromCharCode(92,116);
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

if(!app.documents.length) return toJSON({error:"No document open"});
var doc=app.activeDocument;
var PT=0.352778; var EPS=0.5; var SMALL=10;
var CK=["cuts","cut","corte","troquel","die","dieline","die-line","die line"];
var FK=["creases","crease","fold","doblez","plegado","pliegue","score"];
function lo(s){return (s||"").toLowerCase();}
function has(n,ks){var nn=lo(n);for(var i=0;i<ks.length;i++){if(nn.indexOf(ks[i])!==-1)return true;}return false;}
function findL(ks){for(var i=0;i<doc.layers.length;i++){if(has(doc.layers[i].name,ks))return doc.layers[i];}return null;}

/* Collect paths recursively including groups and compound paths */
function coll(layer,acc){
  var i,j,g,cp;
  for(i=0;i<layer.pathItems.length;i++){var p=layer.pathItems[i];if(!p.guides&&!p.clipping)acc.push(p);}
  for(i=0;i<layer.groupItems.length;i++){g=layer.groupItems[i];
    for(j=0;j<g.pathItems.length;j++){var gp=g.pathItems[j];if(!gp.guides&&!gp.clipping)acc.push(gp);}
    /* recurse into nested groups */
    if(g.groupItems){for(var gi=0;gi<g.groupItems.length;gi++){coll(g.groupItems[gi],acc);}}
  }
  for(i=0;i<layer.compoundPathItems.length;i++){cp=layer.compoundPathItems[i];
    for(j=0;j<cp.pathItems.length;j++){var cpp=cp.pathItems[j];if(!cpp.guides&&!cpp.clipping)acc.push(cpp);}
  }
  for(i=0;i<layer.layers.length;i++) coll(layer.layers[i],acc);
}

function exBez(path){var pts=[];for(var i=0;i<path.pathPoints.length;i++){var pp=path.pathPoints[i];pts.push({anchor:{x:pp.anchor[0]*PT,y:pp.anchor[1]*PT},left:{x:pp.leftDirection[0]*PT,y:pp.leftDirection[1]*PT},right:{x:pp.rightDirection[0]*PT,y:pp.rightDirection[1]*PT}});}return{closed:path.closed,points:pts};}
function dist(a,b){var dx=(a[0]-b[0])*PT,dy=(a[1]-b[1])*PT;return Math.sqrt(dx*dx+dy*dy);}
function pArea(path){var n=path.pathPoints.length;if(n<3)return 0;var s=0;for(var i=0;i<n;i++){var A=path.pathPoints[i].anchor;var B=path.pathPoints[(i+1)%n].anchor;s+=(A[0]*PT)*(B[1]*PT)-(B[0]*PT)*(A[1]*PT);}return Math.abs(s)*0.5;}
function bbArea(pts){if(!pts||pts.length<2)return 0;var a=1e30,b=1e30,c=-1e30,d=-1e30;for(var i=0;i<pts.length;i++){var p=pts[i].anchor;if(p.x<a)a=p.x;if(p.y<b)b=p.y;if(p.x>c)c=p.x;if(p.y>d)d=p.y;}return(c-a)*(d-b);}

var cutL=findL(CK); var crL=findL(FK);
if(!cutL) return toJSON({error:"CUT layer not found. Expected: cuts/cut/corte/troquel/die"});

var cutA=[]; coll(cutL,cutA);
var crA=[]; if(crL) coll(crL,crA);

/* Classify cut paths */
var closed=[],open=[];
for(var c=0;c<cutA.length;c++){var cp=cutA[c];
  if(cp.closed){closed.push({path:cp,geom:exBez(cp),area:pArea(cp)});continue;}
  var np=cp.pathPoints.length;
  if(np>=2){var gap=dist(cp.pathPoints[0].anchor,cp.pathPoints[np-1].anchor);
    if(gap<=EPS){closed.push({path:cp,geom:exBez(cp),area:pArea(cp)});continue;}}
  open.push({path:cp,geom:exBez(cp)});
}

/* Pick outer boundary */
var outer=null,holes=[],cutLines=[];
var mca=0,bci=-1;for(var i=0;i<closed.length;i++){if(closed[i].area>mca){mca=closed[i].area;bci=i;}}
var mob=0,boi=-1;for(var j=0;j<open.length;j++){var bb=bbArea(open[j].geom.points);if(bb>mob){mob=bb;boi=j;}}

if(boi>=0&&mob>mca*2){var best=open[boi];best.geom.closed=true;outer=best.geom;
  for(var oi=0;oi<open.length;oi++){if(oi===boi)continue;cutLines.push({geom:open[oi].geom});}
  for(var ci2=0;ci2<closed.length;ci2++) holes.push(closed[ci2].geom);
}else if(bci>=0){outer=closed[bci].geom;
  for(var ci3=0;ci3<closed.length;ci3++){if(ci3===bci)continue;holes.push(closed[ci3].geom);}
  for(var oi2=0;oi2<open.length;oi2++) cutLines.push({geom:open[oi2].geom});
}else{return toJSON({error:"No CUT boundary found"});}

/* Collect ALL crease paths (open or closed) */
var creases=[];
for(var k=0;k<crA.length;k++){
  var crPath=crA[k];
  var crGeom=exBez(crPath);
  /* skip tiny closed creases */
  if(crPath.closed){var cLen=0;for(var cl=0;cl<crPath.pathPoints.length-1;cl++){cLen+=dist(crPath.pathPoints[cl].anchor,crPath.pathPoints[cl+1].anchor);}if(cLen<SMALL)continue;}
  creases.push(crGeom);
}

return toJSON({version:"1.0",units:"mm",thickness_mm:0.25,outerBoundary:outer,holes:holes,cutLines:cutLines,creases:creases,
  meta:{cutLayer:cutL.name,creaseLayer:crL?crL.name:"(none)",closedCutCount:closed.length,openCutCount:open.length,creaseCount:creases.length,totalCutPaths:cutA.length,totalCreasePaths:crA.length}});
}catch(e){return toJSON({error:"Script error: "+e.message+" line:"+e.line});}
})();
} catch (e) { __raw = '{"error":"' + String(e.message).replace(/"/g, "'") + ' (línea ' + e.line + ')"}'; }
finally { try{ __fixed=__tess_restore(__before); }catch(e4){ __fixed=["restauración fallida: "+e4.message]; } __selRest=__tess_restore_selection(__selRef, __before); }
var __parsed; try{ __parsed=eval("("+__raw+")"); }catch(e5){ __parsed={ error:"resultado no es JSON: "+String(e5.message) }; }
__tess_write("extract", { _origen: "EXTRACT_SCRIPT del baseline (sin cambios)", _script: "extract", _env: __tess_env(), _integridad: __tess_integrity(__before, __fixed, __selRest), _resultado: __parsed });
