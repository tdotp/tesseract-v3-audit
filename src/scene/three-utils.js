// A7.2 — Utilidades Three.js sin estado (docs/fase1/A7_PROPUESTA.md §5.2). Texto idéntico al de src/main.js de 2939dbc salvo la sangría y el export.
// THREE es el global que carga index.html (r132); nada se evalúa al importar el módulo.

export function shapeFromVerts(verts2d){
  if(verts2d.length<3) return null;
  var s=new THREE.Shape();
  s.moveTo(verts2d[0].x,verts2d[0].y);
  for(var i=1;i<verts2d.length;i++) s.lineTo(verts2d[i].x,verts2d[i].y);
  s.closePath();
  return s;
}

export function disposeObject3D(obj){
  if(!obj) return;
  if(obj.geometry) try{ obj.geometry.dispose(); }catch(ex){}
  if(obj.material){
    if(obj.material instanceof Array){
      obj.material.forEach(function(m){ try{ m.dispose(); }catch(ex){}; });
    } else {
      try{ obj.material.dispose(); }catch(ex){}
    }
  }
  if(obj.children && obj.children.length){
    obj.children.slice().forEach(function(ch){ disposeObject3D(ch); });
  }
}
