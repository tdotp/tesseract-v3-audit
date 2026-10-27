// A9.4 — Selección por clic en el visor: Shift+clic elige la base y Alt+clic la crease (KI-29: elige la más cercana a la cámara dentro del umbral 40; sin corregir).
// Texto idéntico al de src/main.js de 3ea0d8a salvo la sangría, incluida la línea mal sangrada de pickPanelFromEvent (rareza preservada, D-A9-10).
// createViewport las recibe por dos envoltorios de enlace tardío en la raíz de composición (D-A9-3/4): el visor las captura al crearse y esta fábrica se crea
// después; los envoltorios devuelven el resultado de la función (el visor lo usa para cortar onUp). Sin THREE, window ni document; sin efectos al crearse.

export function createPicking(S, deps){
  var { canvas3d, setBasePanel, selectFoldEdge, setActiveTab, setInteractionMode, setStatus } = deps;

  function pickPanelFromEvent(e){
    if(!S.renderer3d || !S.camera3d || !S.raycaster3d || !S.pointer3d || !S.panelMeshes.length) return false;
    var rect = canvas3d.getBoundingClientRect();
    if(!rect.width || !rect.height) return false;
    S.pointer3d.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    S.pointer3d.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    S.raycaster3d.setFromCamera(S.pointer3d, S.camera3d);
    var hits = S.raycaster3d.intersectObjects(S.panelMeshes, false);
    if(!hits || !hits.length) return false;
    var panelIdx = hits[0].object && hits[0].object.userData ? hits[0].object.userData.panelIndex : null;
    if(panelIdx===null || panelIdx===undefined) return false;
    setBasePanel(panelIdx, true, true);
    setActiveTab('material');
  setInteractionMode('fold', false);
    setStatus('Base set to P'+panelIdx+' · Shift + click another panel to change it');
    return true;
  }

  function pickCreaseFromEvent(e){
    if(!S.renderer3d || !S.camera3d || !S.raycaster3d || !S.pointer3d || !S.creasePickables.length) return false;
    var rect = canvas3d.getBoundingClientRect();
    if(!rect.width || !rect.height) return false;
    S.pointer3d.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    S.pointer3d.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    S.raycaster3d.params.Line = S.raycaster3d.params.Line || {};
    S.raycaster3d.params.Line.threshold = 40;
    S.raycaster3d.setFromCamera(S.pointer3d, S.camera3d);
    var hits = S.raycaster3d.intersectObjects(S.creasePickables, true).sort(function(a,b){ return a.distance-b.distance; });
    if(!hits || !hits.length) return false;
    var edgeIdx = hits[0].object && hits[0].object.userData ? hits[0].object.userData.edgeIdx : null;
    if(edgeIdx===null || edgeIdx===undefined) return false;
    selectFoldEdge(edgeIdx, false);
    setActiveTab('creases');
    setStatus('Crease C'+edgeIdx+' selected · Alt/Option + click another red line to retarget');
    return true;
  }

  return { pickPanelFromEvent, pickCreaseFromEvent };
}
