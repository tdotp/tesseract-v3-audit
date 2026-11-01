// A9.2 — Acciones del usuario: refrescar el arte (async; KI-26/KI-27; 3.0.1-dev: H-03 y H-05), exportar PNG y exportar GLB (async; el Blob se construye ANTES del diálogo, I-X1).
// Texto idéntico al de src/main.js de 3ea0d8a salvo la sangría (docs/fase1/A9_PROPUESTA.md §5.2, A9_HANDOFF.md §6) y refreshArtwork (3.0.1-dev). El manejador de «Export GLB» (KI-25) sigue en main.js.
// document solo dentro de exportPNG; sin THREE ni window; sin efectos al crearse.
import { buildArtworkExportScript } from '../host/art.js';
import { evalScriptJSON } from '../bridge/cep.js';
import { withDocIdentity, unwrapDocIdentity, sameDocument } from '../host/doc-identity.js';
import { saveBlobWithDialog } from '../bridge/fs.js';

export function createActions(S, deps){
  var { log, setStatus, ensureCep, setArtStatus, loadTextureFromPath, applyArtworkToScene, rebuildCreaseVisuals, buildChildrenOfMap, buildGLBBlobFromCurrentView } = deps;

  /* 3.0.1-dev (H-03): cada refresco tiene un número de solicitud. Solo la ÚLTIMA solicitud, sobre el MISMO modelo (S.currentPanelData) y el MISMO
     documento (S.currentDocIdentity), puede aplicar su arte; una anterior que termina después se descarta y libera lo que cargó. Las texturas del arte
     anterior se liberan DESPUÉS de que overlays y puentes de plegado pasan a las nuevas (nada en uso apunta a una textura liberada). */
  var artRequestSeq = 0;

  function disposeTextures(list){
    list.forEach(function(tex){ if(tex){ try{ tex.dispose(); }catch(ex){} } });
  }

  function texturesOf(state){
    if(!state) return [];
    return ['front','back'].map(function(side){ return state[side] && state[side].texture; }).filter(function(tex){ return !!tex; });
  }

  function replaceArtState(nextState){
    var previous = texturesOf(S.currentArtState), keep = texturesOf(nextState);
    S.currentArtState = nextState;
    applyArtworkToScene();
    if(S.foldTree.length) rebuildCreaseVisuals(buildChildrenOfMap());
    disposeTextures(previous.filter(function(tex){ return keep.indexOf(tex) < 0; }));
  }

  async function refreshArtwork(){
    if(!ensureCep()) return;
    if(!S.panelMeshes.length){
      setArtStatus('Build 3D first, then refresh art.','No art');
      return;
    }
    var seq = ++artRequestSeq, model = S.currentPanelData, docAtStart = S.currentDocIdentity, loaded = [];
    function current(){ return seq===artRequestSeq && S.currentPanelData===model && S.currentDocIdentity===docAtStart && S.panelMeshes.length>0; }
    try{
      setArtStatus('Searching Front/Back or Tiro/Retiro…','Scanning');
      var answer = unwrapDocIdentity(await evalScriptJSON(withDocIdentity(buildArtworkExportScript())));
      var exported = answer.result;
      if(!current()) return;
      if(exported && exported.error) throw new Error(exported.error);
      if(!sameDocument(answer.identity, S.currentDocIdentity)){
        setArtStatus('Artwork not applied: the active document is not the one the 3D model was built from. Extract and build again.','Art error');
        log('Artwork refused: active document differs from the 3D model source');
        return;
      }
      if(!exported || exported.mode==='none' || (!exported.front && !exported.back)){
        replaceArtState(null);
        setArtStatus('No Front/Back or Tiro/Retiro art detected.','No art');
        return;
      }
      var nextState = { mode: exported.mode, front: null, back: null };
      if(exported.front && exported.front.path){
        nextState.front = { rect: exported.front.rect, texture: null, path: exported.front.path };
        loaded.push(nextState.front.texture = await loadTextureFromPath(exported.front.path));
        if(!current()){ disposeTextures(loaded); return; }
      }
      if(exported.back && exported.back.path){
        nextState.back = { rect: exported.back.rect, texture: null, path: exported.back.path };
        loaded.push(nextState.back.texture = await loadTextureFromPath(exported.back.path));
        if(!current()){ disposeTextures(loaded); return; }
      }
      loaded = [];
      replaceArtState(nextState);
      setArtStatus('Artwork loaded from '+exported.mode+'. Mapping uses full artboard coordinates.', exported.mode==='artboards' ? 'Artboards' : 'Layers');
    }catch(err){
      disposeTextures(loaded);
      if(seq!==artRequestSeq) return;
      setArtStatus('Artwork load failed: '+err.message, 'Art error');
      log('Artwork load failed: '+err.message);
    }
  }

  function exportPNG(){
    if(!S.renderer3d) return;
    var url=S.renderer3d.domElement.toDataURL('image/png');
    var a=document.createElement('a');
    a.href=url; a.download='tesseract_3d.png'; a.click();
  }

  async function exportGLB(){
    if(!S.scene3d || !S.foldRoot) throw new Error('Build 3D first');
    S.scene3d.updateMatrixWorld(true);
    var blob = buildGLBBlobFromCurrentView();
    var out = await saveBlobWithDialog(blob, 'tesseract_model.glb');
    if(out && out.cancelled){
      setStatus('GLB export cancelled');
    }else if(out && out.fallback){
      setStatus('GLB exported with browser download fallback');
    }else if(out && out.path){
      setStatus('GLB saved: ' + out.path);
    }else{
      setStatus('GLB exported');
    }
    return blob;
  }

  return { refreshArtwork, exportPNG, exportGLB };
}
