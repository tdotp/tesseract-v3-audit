// A7.5 — Pliegues visuales: líneas rojas, cajas de selección (Alt+clic) y puentes de bisagra con o sin arte, rehechos en cada applyFolding.
// Texto idéntico al de src/main.js de 2939dbc salvo la sangría y «S.». Invariante L2: disposeCreaseVisuals libera los del tick anterior ANTES de crear
// los nuevos. updateSelectedCreaseVisuals toca filas del DOM: es UI de main.js y llega por deps. THREE es el global de index.html.
import { CREASE_HINGE_SHOW_THRESHOLD_DEG, FOLD_BRIDGE_TOP_Z, FOLD_BRIDGE_BOTTOM_Z, CREASE_LINE_Z_OFFSET } from '../config/look.js';
import { disposeObject3D } from './three-utils.js';

export function createCreaseVisuals(S, deps){
  var { getFoldHingeHex, signedDisplayAngle, updateSelectedCreaseVisuals } = deps;

  function disposeCreaseVisuals(){
    (S.creaseVisuals || []).forEach(function(entry){
      [entry.visible, entry.pick].forEach(function(o){
        if(!o) return;
        if(o.parent) o.parent.remove(o);
        if(o.geometry) try{ o.geometry.dispose(); }catch(ex){}
        if(o.material) try{ o.material.dispose(); }catch(ex){}
      });
    });
  }

  function projectInsetDir(mid, centroid, tx, ty, fallbackSign){
    var vx = centroid.x - mid.x;
    var vy = centroid.y - mid.y;
    var dot = vx * tx + vy * ty;
    vx -= dot * tx;
    vy -= dot * ty;
    var len = Math.hypot(vx, vy);
    if(len < 1e-4){
      vx = -ty * (fallbackSign || 1);
      vy = tx * (fallbackSign || 1);
      len = Math.hypot(vx, vy);
    }
    return { x: vx / len, y: vy / len };
  }

  function buildRibbonStripGeometry(worldRows, flatRows, artRect){
    if(!worldRows || worldRows.length < 2) return null;
    var cols = worldRows[0].length;
    if(cols < 2) return null;
    var positions = [];
    var uvs = [];
    var indices = [];
    for(var r=0;r<worldRows.length;r++){
      for(var c=0;c<cols;c++){
        var wp = worldRows[r][c];
        positions.push(wp.x, wp.y, wp.z);
        if(artRect && flatRows && flatRows[r] && flatRows[r][c]){
          var fp = flatRows[r][c];
          var gx = fp.x + S.foldCenter.x;
          var gy = fp.y + S.foldCenter.y;
          var u = (gx - artRect.left) / artRect.width;
          var v = (artRect.top - gy) / artRect.height;
          uvs.push(u, v);
        } else {
          uvs.push(c/(cols-1), r/(worldRows.length-1));
        }
      }
    }
    for(var rr=0; rr<worldRows.length-1; rr++){
      for(var cc=0; cc<cols-1; cc++){
        var a = rr*cols + cc;
        var b = a + 1;
        var cidx = a + cols;
        var d = cidx + 1;
        indices.push(a, cidx, b);
        indices.push(b, cidx, d);
      }
    }
    var geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(new Float32Array(positions), 3));
    geom.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(uvs), 2));
    geom.setIndex(indices);
    geom.computeVertexNormals();
    return geom;
  }

  function makeBridgeRowsForEdge(parentGroup, childGroup, p1, p2, parentIdx, childIdx, zLocal){
    if(!parentGroup || !childGroup || !S.currentPanelData) return null;
    var parentPanel = S.currentPanelData.panels[parentIdx];
    var childPanel = S.currentPanelData.panels[childIdx];
    if(!parentPanel || !childPanel) return null;
    var mx = (p1.x + p2.x) * 0.5;
    var my = (p1.y + p2.y) * 0.5;
    var segLen = Math.hypot(p2.x - p1.x, p2.y - p1.y);
    if(segLen < 1) return null;
    var tx = (p2.x - p1.x) / segLen;
    var ty = (p2.y - p1.y) / segLen;
    var parentCent = { x: parentPanel.centroid.x - S.foldCenter.x, y: parentPanel.centroid.y - S.foldCenter.y };
    var childCent = { x: childPanel.centroid.x - S.foldCenter.x, y: childPanel.centroid.y - S.foldCenter.y };
    var parentDir = projectInsetDir({x:mx,y:my}, parentCent, tx, ty, 1);
    var childDir = projectInsetDir({x:mx,y:my}, childCent, tx, ty, -1);
    var inset = Math.max(0.04, Math.min(0.35, S.currentThicknessMm * 0.35));
    var parent2 = [
      { x: p1.x + parentDir.x * inset, y: p1.y + parentDir.y * inset },
      { x: p2.x + parentDir.x * inset, y: p2.y + parentDir.y * inset }
    ];
    var crease2 = [ { x:p1.x, y:p1.y }, { x:p2.x, y:p2.y } ];
    var child2 = [
      { x: p1.x + childDir.x * inset, y: p1.y + childDir.y * inset },
      { x: p2.x + childDir.x * inset, y: p2.y + childDir.y * inset }
    ];
    function toWorld(g, pt, z){ return g.localToWorld(new THREE.Vector3(pt.x, pt.y, z)); }
    var parentWorld = [ toWorld(parentGroup, parent2[0], zLocal), toWorld(parentGroup, parent2[1], zLocal) ];
    var parentCrease = [ toWorld(parentGroup, crease2[0], zLocal), toWorld(parentGroup, crease2[1], zLocal) ];
    var childCrease = [ toWorld(childGroup, crease2[0], zLocal), toWorld(childGroup, crease2[1], zLocal) ];
    var childWorld = [ toWorld(childGroup, child2[0], zLocal), toWorld(childGroup, child2[1], zLocal) ];
    var middleWorld = [ parentCrease[0].clone().lerp(childCrease[0], 0.5), parentCrease[1].clone().lerp(childCrease[1], 0.5) ];
    return {
      worldRows: [parentWorld, middleWorld, childWorld],
      flatRows: [parent2, crease2, child2]
    };
  }

  function addFoldBridgeVisual(parentGroup, childGroup, edgeIdx, p1, p2, parentIdx, childIdx){
    if(!S.scene3d || !parentGroup || !childGroup) return;
    var displayAngle = signedDisplayAngle(edgeIdx, S.foldAngles[edgeIdx] || 0);
    if(Math.abs(displayAngle) < CREASE_HINGE_SHOW_THRESHOLD_DEG) return;
    if(!S.foldBridgeGroup){
      S.foldBridgeGroup = new THREE.Group();
      S.foldBridgeGroup.name = 'fold-bridges';
      S.scene3d.add(S.foldBridgeGroup);
    }

    var topRows = makeBridgeRowsForEdge(parentGroup, childGroup, p1, p2, parentIdx, childIdx, S.currentThicknessMm + FOLD_BRIDGE_TOP_Z);
    if(topRows){
      var topGeom = buildRibbonStripGeometry(topRows.worldRows, topRows.flatRows, S.currentArtState && S.currentArtState.front ? S.currentArtState.front.rect : null);
      if(topGeom){
        var topMat;
        if(S.currentArtState && S.currentArtState.front && S.currentArtState.front.texture){
          topMat = new THREE.MeshBasicMaterial({ map: S.currentArtState.front.texture, transparent:true, side:THREE.DoubleSide, depthWrite:true, depthTest:true });
        } else {
          topMat = new THREE.MeshPhongMaterial({ color:new THREE.Color(getFoldHingeHex()), specular:0x1b1b1b, shininess:6, side:THREE.DoubleSide });
        }
        var topMesh = new THREE.Mesh(topGeom, topMat);
        topMesh.renderOrder = 33;
        topMesh.userData = { role:'foldBridgeTop', edgeIdx:edgeIdx };
        S.foldBridgeGroup.add(topMesh);
      }
    }

    var bottomRows = makeBridgeRowsForEdge(parentGroup, childGroup, p1, p2, parentIdx, childIdx, -FOLD_BRIDGE_BOTTOM_Z);
    if(bottomRows){
      var bottomGeom = buildRibbonStripGeometry(bottomRows.worldRows, bottomRows.flatRows, S.currentArtState && S.currentArtState.back ? S.currentArtState.back.rect : null);
      if(bottomGeom){
        var bottomMat;
        if(S.currentArtState && S.currentArtState.back && S.currentArtState.back.texture){
          bottomMat = new THREE.MeshBasicMaterial({ map: S.currentArtState.back.texture, transparent:true, side:THREE.DoubleSide, depthWrite:true, depthTest:true });
        } else {
          bottomMat = new THREE.MeshPhongMaterial({ color:new THREE.Color(getFoldHingeHex()), specular:0x1b1b1b, shininess:6, side:THREE.DoubleSide });
        }
        var bottomMesh = new THREE.Mesh(bottomGeom, bottomMat);
        bottomMesh.renderOrder = 32;
        bottomMesh.userData = { role:'foldBridgeBottom', edgeIdx:edgeIdx };
        S.foldBridgeGroup.add(bottomMesh);
      }
    }
  }

  function rebuildCreaseVisuals(childrenOf){
    if(S.foldBridgeGroup){
      if(S.foldBridgeGroup.parent) S.foldBridgeGroup.parent.remove(S.foldBridgeGroup);
      disposeObject3D(S.foldBridgeGroup);
      S.foldBridgeGroup=null;
    }
    if(S.scene3d) S.scene3d.updateMatrixWorld(true);
    disposeCreaseVisuals();   /* A1 (fuga GPU): líneas y cajas de selección anteriores se liberaban nunca */
    S.creasePickables = [];
    S.creaseVisuals = [];
    if(!S.panelGroupMap.length || !S.foldTree.length) return;
    Object.keys(childrenOf || {}).forEach(function(parentKey){
      var parentIdx = parseInt(parentKey,10);
      var parentGroup = S.panelGroupMap[parentIdx];
      if(!parentGroup) return;
      (childrenOf[parentKey] || []).forEach(function(ch){
        var edgeIdx = ch.edgeIdx;
        var ca = ch.crease.a, cb = ch.crease.b;
        var p1 = {x:ca.x-S.foldCenter.x, y:ca.y-S.foldCenter.y};
        var p2 = {x:cb.x-S.foldCenter.x, y:cb.y-S.foldCenter.y};
        var z = S.currentThicknessMm + CREASE_LINE_Z_OFFSET;

        addFoldBridgeVisual(parentGroup, S.panelGroupMap[ch.child], edgeIdx, p1, p2, parentIdx, ch.child);

        var visibleGeom = new THREE.BufferGeometry();
        visibleGeom.setAttribute('position', new THREE.BufferAttribute(new Float32Array([
          p1.x,p1.y,z,
          p2.x,p2.y,z
        ]),3));
        var visibleMat = new THREE.LineBasicMaterial({
          color:0xff4444, transparent:true, opacity:0.98,
          depthTest:false, depthWrite:false
        });
        var visibleLine = new THREE.Line(visibleGeom, visibleMat);
        visibleLine.renderOrder = 90;
        visibleLine.userData = { edgeIdx: edgeIdx, role: 'visibleCrease' };
        visibleLine.frustumCulled = false;
        parentGroup.add(visibleLine);

        var segLen = Math.hypot(p2.x-p1.x, p2.y-p1.y);
        var segMidX = (p1.x+p2.x)/2;
        var segMidY = (p1.y+p2.y)/2;
        var segAngle = Math.atan2(p2.y-p1.y, p2.x-p1.x);
        var pickGeom = new THREE.BoxGeometry(Math.max(segLen + 6, 8), Math.max(26, S.currentThicknessMm*9), Math.max(5.0, S.currentThicknessMm*3.2));
        var pickMat = new THREE.MeshBasicMaterial({
          color:0xffffff, transparent:true, opacity:0.001,
          depthTest:false, depthWrite:false
        });
        var pickLine = new THREE.Mesh(pickGeom, pickMat);
        pickLine.position.set(segMidX, segMidY, z + 0.55);
        pickLine.rotation.z = segAngle;
        pickLine.renderOrder = 95;
        pickLine.userData = { edgeIdx: edgeIdx, role: 'pickCrease' };
        parentGroup.add(pickLine);

        S.creasePickables.push(pickLine);
        S.creasePickables.push(visibleLine);
        S.creaseVisuals.push({edgeIdx:edgeIdx, visible:visibleLine, pick:pickLine});
      });
    });
    updateSelectedCreaseVisuals();
  }

  return { disposeCreaseVisuals, projectInsetDir, buildRibbonStripGeometry, makeBridgeRowsForEdge, addFoldBridgeVisual, rebuildCreaseVisuals };
}
