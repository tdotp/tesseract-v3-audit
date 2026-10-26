// A7.4 — Malla de paneles: construcción de los paneles extruidos (con sus aristas) y limpieza completa de la escena del modelo.
// Texto idéntico al de src/main.js de 2939dbc salvo la sangría y «S.». clearAllMeshes conserva las rutas de liberación de A1 (paneles con hijos,
// visuales de pliegue, caché de etiquetas, puentes) y su orden (invariante L3). creaseLinesGroup es privada (código muerto, se conserva tal cual).
import { shapeFromVerts, disposeObject3D } from './three-utils.js';
// D-A6-7 cerrada en A7.4: la escena usa este helper puro del motor; main.js ya no lo importa.
import { getPolyCentroid } from '../core/legacy/geom2d.js';

export function createPanelMeshes(S, deps){
  var { log, getPanelShellHex, getEdgeLineHex, applyArtworkToScene, disposeLabelCache, disposeCreaseVisuals } = deps;
  var creaseLinesGroup=null;

  function clearAllMeshes(){
    S.panelMeshes.forEach(function(m){
      if(m.parent) m.parent.remove(m);
      else if(S.scene3d) S.scene3d.remove(m);
      /* A1 (fuga GPU): también libera los hijos (aristas EdgesGeometry y overlays de arte); antes solo geometría/material del panel.
         Las texturas de arte son compartidas y las libera disposeCurrentArtTextures(), no esto. */
      disposeObject3D(m);
    });
    S.panelMeshes=[];
    disposeCreaseVisuals();   /* A1 */
    disposeLabelCache();      /* A1 */
    if(creaseLinesGroup){
      if(creaseLinesGroup.parent) creaseLinesGroup.parent.remove(creaseLinesGroup);
      else if(S.scene3d) S.scene3d.remove(creaseLinesGroup);
      creaseLinesGroup=null;
    }
    if(S.foldBridgeGroup){
      if(S.foldBridgeGroup.parent) S.foldBridgeGroup.parent.remove(S.foldBridgeGroup);
      disposeObject3D(S.foldBridgeGroup);
      S.foldBridgeGroup=null;
    }
    S.creasePickables = [];
    S.creaseVisuals = [];
    S.panelGroupMap = [];
    S.panelLabelSprites = [];
    if(S.foldRoot){
      if(S.foldRoot.parent) S.foldRoot.parent.remove(S.foldRoot);
      S.foldRoot=null;
    }
  }

  function build3DFromPanels(panelData,data){
    clearAllMeshes();
    var panels=panelData.panels;
    var creaseEdges=panelData.creaseEdges;

    /* Compute global center */
    var allPts=[];
    panels.forEach(function(p){p.vertices.forEach(function(v){allPts.push(v);});});
    var cx=0,cy=0;
    allPts.forEach(function(p){cx+=p.x;cy+=p.y;});
    if(allPts.length>0){cx/=allPts.length;cy/=allPts.length;}

    /* Create mesh for each panel */
    panels.forEach(function(panel,pi){
      var centered=panel.vertices.map(function(v){return{x:v.x-cx,y:v.y-cy};});
      var shape=shapeFromVerts(centered);
      if(!shape) return;
      var geom=new THREE.ExtrudeGeometry(shape,{depth:S.currentThicknessMm,bevelEnabled:false,curveSegments:1,steps:1});
      geom.computeVertexNormals();

      var shellMat=new THREE.MeshPhongMaterial({
        color:new THREE.Color(getPanelShellHex(pi===S.currentBasePanelIndex)), specular:0x1b1b1b, shininess:10,
        side:THREE.DoubleSide
      });
      var mesh=new THREE.Mesh(geom,shellMat);

      /* Add board edges */
      var edges=new THREE.EdgesGeometry(geom,1);
      var lineMat=new THREE.LineBasicMaterial({color:new THREE.Color(getEdgeLineHex()),transparent:true,opacity:0.72});
      var edgeLines = new THREE.LineSegments(edges,lineMat);
      mesh.add(edgeLines);

      /* rotation handled by foldRoot group */
      mesh.position.z=0;

      /* Store panel data for folding */
      mesh.userData={
        panelIndex:pi,
        originalVertices:centered,
        center:getPolyCentroid(centered),
        creaseEdges:[],
        edgeLines:edgeLines
      };

      S.scene3d.add(mesh);
      S.panelMeshes.push(mesh);
    });

    /* Fold line visuals are built after the fold tree is established. */

    /* Store fold data */
    S.foldData={
      panels:panels,
      creaseEdges:creaseEdges,
      creases:panelData.creases,
      center:{x:cx,y:cy}
    };

    applyArtworkToScene();
    log('Built '+S.panelMeshes.length+' panel meshes, '+creaseEdges.length+' crease edge segments');
    return S.panelMeshes.length;
  }

  return { clearAllMeshes, build3DFromPanels };
}
