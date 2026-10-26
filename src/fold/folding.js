// A7.5 — Plegado: jerarquía de pivotes por arista del árbol (pivot → align → innerPivot → unalign → translate), etiquetas y visuales de pliegue.
// Texto idéntico al de src/main.js de 2939dbc salvo la sangría y «S.»: mismo orden de inserción en la escena (invariante G1 del GLB). THREE es el global de index.html.

export function createFolding(S, deps){
  var { makePanelLabelSprite, refreshPanelMaterials, rebuildCreaseVisuals } = deps;

  function applyFolding(){
    if(!S.scene3d || !S.panelMeshes.length) return;

    if(S.foldRoot && S.foldRoot.parent) S.foldRoot.parent.remove(S.foldRoot);
    S.foldRoot=new THREE.Group();
    S.foldRoot.rotation.x=-Math.PI/2;
    S.scene3d.add(S.foldRoot);

    var panelGroups=[];
    S.panelGroupMap = panelGroups;
    S.panelLabelSprites = [];
    S.panelMeshes.forEach(function(mesh){
      if(mesh.parent) mesh.parent.remove(mesh);
      else S.scene3d.remove(mesh);
      mesh.rotation.set(0,0,0);
      mesh.position.set(0,0,0);
      var g=new THREE.Group();
      g.add(mesh);
      var pIdx = mesh.userData.panelIndex;
      if(S.currentPanelData && S.currentPanelData.panels && S.currentPanelData.panels[pIdx]){
        var pData = S.currentPanelData.panels[pIdx];
        var showLabel = !S.baseSelectionConfirmed || pIdx===S.currentBasePanelIndex;
        if(showLabel){
          var sp = makePanelLabelSprite('P'+pIdx, pIdx===S.currentBasePanelIndex);
          sp.position.set((pData.centroid.x - S.foldCenter.x), (pData.centroid.y - S.foldCenter.y), S.currentThicknessMm + 5.0);
          sp.userData = { panelIndex:pIdx, role:'panelLabel' };
          g.add(sp);
          S.panelLabelSprites[pIdx] = sp;
        }
      }
      panelGroups[pIdx]=g;
    });

    var childrenOf={};
    S.foldTree.forEach(function(edge,ei){
      if(!childrenOf[edge.parent]) childrenOf[edge.parent]=[];
      childrenOf[edge.parent].push({child:edge.child,crease:edge.crease,edgeIdx:ei});
    });

    var attached={};
    function attachChildren(parentIdx,parentGroup){
      attached[parentIdx]=true;
      var children=childrenOf[parentIdx]||[];
      children.forEach(function(ch){
        var angle=(S.foldAngles[ch.edgeIdx]||0)*Math.PI/180;
        var ca=ch.crease.a, cb=ch.crease.b;
        var p1={x:ca.x-S.foldCenter.x, y:ca.y-S.foldCenter.y};
        var p2={x:cb.x-S.foldCenter.x, y:cb.y-S.foldCenter.y};

        var pivot=new THREE.Group();
        pivot.position.set(p1.x,p1.y,0);

        var creaseAngle=Math.atan2(p2.y-p1.y, p2.x-p1.x);
        var alignGroup=new THREE.Group();
        alignGroup.rotation.z=creaseAngle;

        var innerPivot=new THREE.Group();
        innerPivot.rotation.x=angle;

        /* IMPORTANT:
           Keep translation and un-alignment in separate groups so that
           angle=0 preserves the child's original flat world transform.
           Mixing rotation.z and position on the same group caused
           T(p1)·R(a)·T(-p1)·R(-a), which displaces panels even at 0°. */
        var unalignGroup=new THREE.Group();
        unalignGroup.rotation.z=-creaseAngle;

        var translateGroup=new THREE.Group();
        translateGroup.position.set(-p1.x,-p1.y,0);

        translateGroup.add(panelGroups[ch.child]);
        unalignGroup.add(translateGroup);
        innerPivot.add(unalignGroup);
        alignGroup.add(innerPivot);
        pivot.add(alignGroup);
        parentGroup.add(pivot);

        attachChildren(ch.child,translateGroup);
      });
    }

    var baseIdx=Math.max(0, Math.min(S.currentBasePanelIndex, S.panelMeshes.length-1));
    if(panelGroups[baseIdx]){
      S.foldRoot.add(panelGroups[baseIdx]);
      attachChildren(baseIdx,panelGroups[baseIdx]);
    }

    panelGroups.forEach(function(g,idx){
      if(g && !attached[idx] && idx!==baseIdx) S.foldRoot.add(g);
    });

    rebuildCreaseVisuals(childrenOf);
    refreshPanelMaterials();
    if(S.scene3d) S.scene3d.updateMatrixWorld(true);
  }

  return { applyFolding };
}
