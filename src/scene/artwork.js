// A7.4 — Arte Front/Back sobre los paneles: carga de texturas, UV por artboard completo, overlays y su liberación.
// Texto idéntico al de src/main.js de 2939dbc salvo la sangría y «S.». Invariante L1: las texturas de arte son COMPARTIDAS (overlays y puentes) y solo
// las libera disposeCurrentArtTextures. THREE es el global de index.html.
import { ART_TOP_OFFSET, ART_BOTTOM_OFFSET } from '../config/look.js';
import { pathToFileURL } from '../bridge/cep.js';
import { shapeFromVerts } from './three-utils.js';

export function createArtwork(S, deps){
  var { refreshPanelMaterials } = deps;

  function hasArtworkLoaded(){
    return !!(S.currentArtState && ((S.currentArtState.front && S.currentArtState.front.texture) || (S.currentArtState.back && S.currentArtState.back.texture)));
  }

  function loadTextureFromPath(fsPath){
    return new Promise(function(resolve,reject){
      var loader = new THREE.TextureLoader();
      loader.load(pathToFileURL(fsPath), function(tex){
        tex.flipY = false;
        if('colorSpace' in tex && THREE.SRGBColorSpace) tex.colorSpace = THREE.SRGBColorSpace;
        else if('encoding' in tex && THREE.sRGBEncoding) tex.encoding = THREE.sRGBEncoding;
        if(THREE.LinearMipMapLinearFilter) tex.minFilter = THREE.LinearMipMapLinearFilter;
        if(THREE.LinearFilter) tex.magFilter = THREE.LinearFilter;
        tex.generateMipmaps = true;
        try{ if(S.renderer3d && S.renderer3d.capabilities && S.renderer3d.capabilities.getMaxAnisotropy) tex.anisotropy = S.renderer3d.capabilities.getMaxAnisotropy(); }catch(_anis){}
        tex.needsUpdate = true;
        resolve(tex);
      }, undefined, function(err){
        reject(err || new Error('Texture load failed'));
      });
    });
  }

  function disposeArtOverlays(mesh){
    if(!mesh || !mesh.userData || !mesh.userData.artOverlays) return;
    mesh.userData.artOverlays.forEach(function(ov){
      mesh.remove(ov);
      if(ov.geometry) ov.geometry.dispose();
      if(ov.material) ov.material.dispose();
    });
    mesh.userData.artOverlays = [];
  }

  function applyArtUVs(geometry, artRect, center){
    if(!geometry || !artRect || !artRect.width || !artRect.height) return;
    var pos = geometry.attributes.position;
    var uv = geometry.attributes.uv;
    if(!pos || !uv) return;
    for(var i=0;i<pos.count;i++){
      var x = pos.getX(i) + center.x;
      var y = pos.getY(i) + center.y;
      var u = (x - artRect.left) / artRect.width;
      var v = (artRect.top - y) / artRect.height;
      uv.setXY(i,u,v);
    }
    uv.needsUpdate = true;
  }

  function addArtworkOverlay(mesh, verts, texture, artRect, zOffset){
    if(!mesh || !texture || !artRect) return;
    var shape = shapeFromVerts(verts);
    if(!shape) return;
    var geom = new THREE.ShapeGeometry(shape);
    applyArtUVs(geom, artRect, S.foldData ? S.foldData.center : {x:0,y:0});
    var mat = new THREE.MeshBasicMaterial({
      map:texture, transparent:true, side:THREE.DoubleSide,
      depthWrite:false, depthTest:true
    });
    var overlay = new THREE.Mesh(geom, mat);
    overlay.position.z = zOffset;
    overlay.renderOrder = 60;
    mesh.add(overlay);
    if(!mesh.userData.artOverlays) mesh.userData.artOverlays = [];
    mesh.userData.artOverlays.push(overlay);
  }

  function applyArtworkToScene(){
    S.panelMeshes.forEach(function(mesh){
      disposeArtOverlays(mesh);
      if(!S.currentArtState) return;
      if(S.currentArtState.front && S.currentArtState.front.texture && S.currentArtState.front.rect){
        addArtworkOverlay(mesh, mesh.userData.originalVertices, S.currentArtState.front.texture, S.currentArtState.front.rect, S.currentThicknessMm + ART_TOP_OFFSET);
      }
      if(S.currentArtState.back && S.currentArtState.back.texture && S.currentArtState.back.rect){
        addArtworkOverlay(mesh, mesh.userData.originalVertices, S.currentArtState.back.texture, S.currentArtState.back.rect, -ART_BOTTOM_OFFSET);
      }
    });
    refreshPanelMaterials();
  }

  function disposeCurrentArtTextures(){
    if(!S.currentArtState) return;
    ['front','back'].forEach(function(side){
      if(S.currentArtState[side] && S.currentArtState[side].texture){
        try{ S.currentArtState[side].texture.dispose(); }catch(ex){}
      }
    });
  }

  return { hasArtworkLoaded, loadTextureFromPath, disposeArtOverlays, applyArtUVs, addArtworkOverlay, applyArtworkToScene, disposeCurrentArtTextures };
}
