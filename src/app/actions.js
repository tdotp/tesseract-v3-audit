// A9.2 — Acciones del usuario sin estado propio: refrescar el arte (async; KI-26/KI-27), exportar PNG y exportar GLB (async; el Blob se construye ANTES del diálogo, I-X1).
// Texto idéntico al de src/main.js de 3ea0d8a salvo la sangría (docs/fase1/A9_PROPUESTA.md §5.2, A9_HANDOFF.md §6). El manejador de «Export GLB» (KI-25) sigue en main.js.
// document solo dentro de exportPNG; sin THREE ni window; sin efectos al crearse.
import { buildArtworkExportScript } from '../host/art.js';
import { evalScriptJSON } from '../bridge/cep.js';
import { saveBlobWithDialog } from '../bridge/fs.js';

export function createActions(S, deps){
  var { log, setStatus, ensureCep, setArtStatus, loadTextureFromPath, applyArtworkToScene, disposeCurrentArtTextures, buildGLBBlobFromCurrentView } = deps;

  async function refreshArtwork(){
    if(!ensureCep()) return;
    if(!S.panelMeshes.length){
      setArtStatus('Build 3D first, then refresh art.','No art');
      return;
    }
    try{
      setArtStatus('Searching Front/Back or Tiro/Retiro…','Scanning');
      var exported = await evalScriptJSON(buildArtworkExportScript());
      if(!exported || exported.mode==='none' || (!exported.front && !exported.back)){
        disposeCurrentArtTextures();
        S.currentArtState = null;
        applyArtworkToScene();
        setArtStatus('No Front/Back or Tiro/Retiro art detected.','No art');
        return;
      }
      var nextState = { mode: exported.mode, front: null, back: null };
      if(exported.front && exported.front.path){
        nextState.front = { rect: exported.front.rect, texture: await loadTextureFromPath(exported.front.path), path: exported.front.path };
      }
      if(exported.back && exported.back.path){
        nextState.back = { rect: exported.back.rect, texture: await loadTextureFromPath(exported.back.path), path: exported.back.path };
      }
      disposeCurrentArtTextures();
      S.currentArtState = nextState;
      applyArtworkToScene();
      setArtStatus('Artwork loaded from '+exported.mode+'. Mapping uses full artboard coordinates.', exported.mode==='artboards' ? 'Artboards' : 'Layers');
    }catch(err){
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
