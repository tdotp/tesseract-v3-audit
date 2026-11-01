// A8.3 — Recorrido de la escena para la exportación GLB: lista de mallas exportables en espacio MUNDO (posiciones y normales con matrixWorld, UV, índices Uint16/Uint32, min/max).
// 3.0.1-dev (D-0): posiciones en metros (H-06), sin triángulos degenerados ni normales nulas (KI-02), solo vértices usados, máximo de índices sin
// Math.max.apply (H-07). Una malla sin ningún triángulo con área no se exporta.
// Texto idéntico al de src/main.js de a322d7a salvo la sangría (docs/fase1/A8_PROPUESTA.md §4.1). Lee solo S.scene3d; su único efecto sobre la escena es refrescar la caché matrixWorld
// (updateMatrixWorld). El orden de los nodos del GLB es el del recorrido en preorden (invariante G1). THREE es el global de index.html. Usa typedArrayFromList de glb-bytes
// (desviación mecánica frente a la propuesta, que no lo listaba: la función ya lo usaba por nombre desde la clausura).
import { typedArrayFromList } from './glb-bytes.js';

export function createGlbScene(S){
  /* 3.0.1-dev (H-06/KI-03): glTF 2.0 mide en METROS. La escena interna sigue en mm; solo las POSICIONES (y su min/max) se convierten aquí, una vez.
     Las normales son direcciones: no se escalan. glb-builder declara la misma escala en asset.extras (solo informativo). */
  var GLB_METERS_PER_MM = 0.001;

  /* Normal (sin normalizar, ponderada por área) de un triángulo en coordenadas mundo, o null si es degenerado: índices repetidos o área EXACTAMENTE
     nula (vértices alineados). Un triángulo muy fino pero con área se conserva: es geometría y su normal se repara si hace falta (fallbackNormal). */
  function faceNormal(world, a, b, c){
    if(a===b || b===c || a===c) return null;
    var ux=world[3*b]-world[3*a], uy=world[3*b+1]-world[3*a+1], uz=world[3*b+2]-world[3*a+2];
    var vx=world[3*c]-world[3*a], vy=world[3*c+1]-world[3*a+1], vz=world[3*c+2]-world[3*a+2];
    var nx=uy*vz-uz*vy, ny=uz*vx-ux*vz, nz=ux*vy-uy*vx;
    if(!(Math.sqrt(nx*nx+ny*ny+nz*nz) > 0)) return null;
    return [nx,ny,nz];
  }

  /* Normal de reserva para un vértice cuya normal transformada es nula: suma de las normales de las caras que lo usan; si no, la de toda la malla. */
  function fallbackNormal(vi, tris, faceN){
    var sx=0, sy=0, sz=0, ax=0, ay=0, az=0;
    for(var t=0;t<faceN.length;t++){
      var f=faceN[t]; ax+=f[0]; ay+=f[1]; az+=f[2];
      if(tris[3*t]===vi || tris[3*t+1]===vi || tris[3*t+2]===vi){ sx+=f[0]; sy+=f[1]; sz+=f[2]; }
    }
    if(Math.sqrt(sx*sx+sy*sy+sz*sz) > 0) return [sx,sy,sz];
    if(Math.sqrt(ax*ax+ay*ay+az*az) > 0) return [ax,ay,az];
    return [0,1,0];
  }

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
      var nAttr = geom.attributes.normal;
      var uvAttr = geom.attributes.uv;
      var nMat = new THREE.Matrix3().getNormalMatrix(obj.matrixWorld);
      var world = [];
      for(var i=0;i<posAttr.count;i++){
        var v = new THREE.Vector3(posAttr.getX(i), posAttr.getY(i), posAttr.getZ(i)).applyMatrix4(obj.matrixWorld);
        world.push(v.x,v.y,v.z);
      }
      var idxIn = [];
      if(geom.index){
        var idxAttr = geom.index.array;
        for(var k=0;k<idxAttr.length;k++) idxIn.push(idxAttr[k]);
      } else {
        for(var q=0;q<posAttr.count;q++) idxIn.push(q);
      }
      /* KI-02: fuera los triángulos degenerados (índices repetidos o área nula): no dibujan nada y computeVertexNormals les da normales de longitud 0 */
      var tris = [], faceN = [];
      for(var t=0;t+2<idxIn.length;t+=3){
        var fn = faceNormal(world, idxIn[t], idxIn[t+1], idxIn[t+2]);
        if(!fn) continue;
        tris.push(idxIn[t], idxIn[t+1], idxIn[t+2]); faceN.push(fn);
      }
      if(!tris.length) return;
      /* solo los vértices que usa algún triángulo, en su orden original */
      var remap = {}, used = [];
      for(var r=0;r<tris.length;r++){ if(remap[tris[r]]===undefined){ remap[tris[r]] = -1; used.push(tris[r]); } }
      used.sort(function(a,b){ return a-b; });
      used.forEach(function(oldIdx, newIdx){ remap[oldIdx] = newIdx; });
      var posOut = [], normOut = [], uvOut = [], idxOut = [];
      var min=[Infinity,Infinity,Infinity], max=[-Infinity,-Infinity,-Infinity];
      used.forEach(function(oi){
        for(var c=0;c<3;c++){
          var m = Math.fround(world[3*oi+c] * GLB_METERS_PER_MM); /* min/max = los float32 que se escriben (el validador los compara) */
          posOut.push(m);
          if(m<min[c]) min[c]=m; if(m>max[c]) max[c]=m;
        }
        var n = new THREE.Vector3(nAttr.getX(oi), nAttr.getY(oi), nAttr.getZ(oi)).applyMatrix3(nMat);
        if(!(n.length() > 1e-12)) n = new THREE.Vector3().fromArray(fallbackNormal(oi, tris, faceN));
        n.normalize();
        normOut.push(n.x,n.y,n.z);
        if(uvAttr) uvOut.push(uvAttr.getX(oi), uvAttr.getY(oi));
      });
      for(var w=0;w<tris.length;w++) idxOut.push(remap[tris[w]]);
      out.push({
        name: obj.name || (obj.userData && obj.userData.role) || 'mesh_'+out.length,
        positions: typedArrayFromList(posOut, Float32Array),
        normals: typedArrayFromList(normOut, Float32Array),
        uvs: uvOut.length ? typedArrayFromList(uvOut, Float32Array) : null,
        indices: (used.length - 1 < 65535) ? typedArrayFromList(idxOut, Uint16Array) : typedArrayFromList(idxOut, Uint32Array), /* H-07: el máximo es used.length-1, sin Math.max.apply */
        min: min,
        max: max,
        material: obj.material
      });
    });
    return out;
  }

  return { buildExportSceneMeshes };
}
