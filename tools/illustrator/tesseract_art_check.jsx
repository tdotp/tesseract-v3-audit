#target illustrator
/*
 * tesseract_art_check.jsx — Tesseract V3 (herramienta de validación; generado por tools/illustrator/make-jsx.mjs desde reference/legacy-baseline/main.js)
 * ⚠ Exporta PNG a la carpeta temporal y cambia TEMPORALMENTE el artboard activo y la visibilidad de capas (los restaura). No guarda ni modifica el documento.
 * Resultado: se guarda en el archivo que elijas (cuadro "Guardar como"). Nada se instala; para quitarlo basta borrar este .jsx.
 */

function __tess_save(defaultName, text) {
  var f = File.saveDialog("Guardar resultado como…", "*.json");
  if (!f) { alert("Cancelado: no se guardó nada."); return; }
  f.encoding = "UTF-8"; f.open("w"); f.write(text); f.close();
  alert("Guardado en:\n" + f.fsName + "\n\n" + Math.round(text.length / 1024) + " KB");
}
var __tess_result;
try {
__tess_result = (function(){
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
} catch (e) { __tess_result = '{"error":"' + String(e.message).replace(/"/g, "'") + ' (línea ' + e.line + ')"}'; }
__tess_save("arte", '{"_origen":"buildArtworkExportScript del baseline (sin cambios)","_illustrator":"' + app.version + '","_resultado":' + __tess_result + '}');
