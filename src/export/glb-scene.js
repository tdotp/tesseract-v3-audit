// A8.3 — Recorrido de la escena para la exportación GLB: lista de mallas exportables en espacio MUNDO (posiciones y normales con matrixWorld, UV, índices Uint16/Uint32, min/max).
// Texto idéntico al de src/main.js de a322d7a salvo la sangría (docs/fase1/A8_PROPUESTA.md §4.1). Lee solo S.scene3d; su único efecto sobre la escena es refrescar la caché matrixWorld
// (updateMatrixWorld). El orden de los nodos del GLB es el del recorrido en preorden (invariante G1). THREE es el global de index.html. Usa typedArrayFromList de glb-bytes
// (desviación mecánica frente a la propuesta, que no lo listaba: la función ya lo usaba por nombre desde la clausura).
import { typedArrayFromList } from './glb-bytes.js';

export function createGlbScene(S){

  function buildExportSceneMeshes(){
    if(!S.scene3d) return [];
    S.scene3d.updateMatrixWorld(true);
    var out = [];
    S.scene3d.traverse(function(obj){
      if(!obj || !obj.isMesh) return;
      if(obj.userData && (obj.userData.role==='pickCrease' || obj.userData.role==='panelLabel')) return;
      if(obj.material && obj.material.opacity!==undefined && obj.material.transparent && obj.material.opacity < 0.01) return;
      if(!obj.geometry) return;
      var geom = obj.geometry.clone();
      if(!geom.attributes || !geom.attributes.position) return;
      if(!geom.attributes.normal) geom.computeVertexNormals();
      var posAttr = geom.attributes.position;
      var posOut = [];
      var min=[Infinity,Infinity,Infinity], max=[-Infinity,-Infinity,-Infinity];
      for(var i=0;i<posAttr.count;i++){
        var v = new THREE.Vector3(posAttr.getX(i), posAttr.getY(i), posAttr.getZ(i)).applyMatrix4(obj.matrixWorld);
        posOut.push(v.x,v.y,v.z);
        if(v.x<min[0]) min[0]=v.x; if(v.y<min[1]) min[1]=v.y; if(v.z<min[2]) min[2]=v.z;
        if(v.x>max[0]) max[0]=v.x; if(v.y>max[1]) max[1]=v.y; if(v.z>max[2]) max[2]=v.z;
      }
      var normOut = [];
      if(geom.attributes.normal){
        var nMat = new THREE.Matrix3().getNormalMatrix(obj.matrixWorld);
        var nAttr = geom.attributes.normal;
        for(var j=0;j<nAttr.count;j++){
          var n = new THREE.Vector3(nAttr.getX(j), nAttr.getY(j), nAttr.getZ(j)).applyMatrix3(nMat).normalize();
          normOut.push(n.x,n.y,n.z);
        }
      }
      var uvOut = [];
      if(geom.attributes.uv){
        var uvAttr = geom.attributes.uv;
        for(var u=0;u<uvAttr.count;u++) uvOut.push(uvAttr.getX(u), uvAttr.getY(u));
      }
      var idxOut = [];
      if(geom.index){
        var idxAttr = geom.index.array;
        for(var k=0;k<idxAttr.length;k++) idxOut.push(idxAttr[k]);
      } else {
        for(var q=0;q<posAttr.count;q++) idxOut.push(q);
      }
      out.push({
        name: obj.name || (obj.userData && obj.userData.role) || 'mesh_'+out.length,
        positions: typedArrayFromList(posOut, Float32Array),
        normals: normOut.length ? typedArrayFromList(normOut, Float32Array) : null,
        uvs: uvOut.length ? typedArrayFromList(uvOut, Float32Array) : null,
        indices: (Math.max.apply(null, idxOut) < 65535) ? typedArrayFromList(idxOut, Uint16Array) : typedArrayFromList(idxOut, Uint32Array),
        min: min,
        max: max,
        material: obj.material
      });
    });
    return out;
  }

  return { buildExportSceneMeshes };
}
