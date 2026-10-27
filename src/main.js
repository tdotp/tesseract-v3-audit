import { DEFAULT_THICKNESS_MM, MATERIAL_PRESETS, CREASE_HINGE_RADIUS_FACTOR, CREASE_HINGE_MIN_RADIUS, CREASE_HINGE_SEGMENTS, CREASE_HINGE_SHOW_THRESHOLD_DEG, FOLD_BRIDGE_TOP_Z, FOLD_BRIDGE_BOTTOM_Z, CREASE_LINE_Z_OFFSET, ART_TOP_OFFSET, ART_BOTTOM_OFFSET } from './config/look.js';
import { EXTRACT_SCRIPT } from './host/extract.js';
import { TEST_CONNECTION_SCRIPT } from './host/test-connection.js';
import { evalScript, pathToFileURL } from './bridge/cep.js';
import { createLegacyEngine } from './core/engine.js';
import { createAppState } from './app/state.js';
import { createLabels } from './scene/labels.js';
import { createMaterials } from './scene/materials.js';
import { createFoldAngles } from './fold/angles.js';
import { createViewport } from './scene/viewport.js';
import { createArtwork } from './scene/artwork.js';
import { createPanelMeshes } from './scene/panel-meshes.js';
import { createCreaseVisuals } from './scene/crease-visuals.js';
import { createFolding } from './fold/folding.js';
import { createGlbBuilder } from './export/glb-builder.js';
import { createGlbImage } from './export/glb-image.js';
import { createGlbScene } from './export/glb-scene.js';
import { createViews } from './ui/views.js';
import { createActions } from './app/actions.js';

(function () {
  'use strict';

  function byId(id) { return document.getElementById(id); }

  document.addEventListener('DOMContentLoaded', function () {
    var importView = byId('import-view');
    var threeView  = byId('three-view');
    var statusArea = byId('status-area');
    var errorMsg   = byId('error-msg');
    var testBtn    = byId('test-btn');
    var extractBtn = byId('extract-btn');
    var previewBtn = byId('preview-btn');
    var continueBtn= byId('continue-3d-btn');
    var debugToggle= byId('debug-toggle');
    var outputArea = byId('output-json');
    var validationStatus = byId('validation-status');
    var problemsList     = byId('problems-list');
    var canvas2d   = byId('preview-canvas');
    var ctx2d      = canvas2d ? canvas2d.getContext('2d') : null;
    var backBtn    = byId('back-btn');
    var export3dBtn= byId('export-3d-btn');
    var exportGlbBtn= byId('export-glb-btn');
    var viewport3d = byId('three-viewport');
    var canvas3d   = byId('preview-3d');
    var logArea    = byId('log-area');
    var debugDetails = byId('debug-details');
    var thicknessInput = byId('thickness-input');
    var applyThicknessBtn = byId('apply-thickness-btn');
    var materialPresetSelect = byId('material-preset');
    var materialPill = byId('material-pill');
    var refreshArtBtn = byId('refresh-art-btn');
    var artStatus = byId('art-status');
    var artSourcePill = byId('art-source-pill');
    var modeFoldBtn = byId('mode-fold-btn');
    var modeBaseBtn = byId('mode-base-btn');
    var interactionModePill = byId('interaction-mode-pill');
    var interactionStatus = byId('interaction-status');
    var viewportBadge = byId('viewport-badge');
    var tabButtons = Array.prototype.slice.call(document.querySelectorAll('.tooltab'));
    var tabPanels = Array.prototype.slice.call(document.querySelectorAll('.tabpanel'));
    var creaseControlsSlot = byId('crease-controls-slot');
    if(modeFoldBtn) modeFoldBtn.style.display='none';
    if(modeBaseBtn) modeBaseBtn.style.display='none';

    var S = createAppState(); /* A7.1: estado de dominio compartido (26 campos; docs/fase1/A7_PROPUESTA.md §4.1). Aquí quedan lastData, problems y los widgets del DOM */
    var lastData   = null;
    var problems   = [];
    var currentBaseSelect = null;
    var currentCreaseRows = [];
    var currentCreaseSliders = [];
    var selectedCreaseLabelEl = null;
    var selectedCreaseSliderEl = null;
    var selectedCreaseNumberEl = null;

    function setStatus(m){ statusArea.textContent = m; }
    function log(m){
      try{ console.log('[Tesseract]',m); }catch(e){}
      if(logArea){ logArea.textContent += String(m)+"\n"; logArea.scrollTop=logArea.scrollHeight; }
    }
    function clearLog(){ if(logArea){ logArea.textContent=''; } if(debugDetails) debugDetails.open=false; }
    var geometryEngine = createLegacyEngine({ log: log }); /* A6.6: GeometryEngine v1, única implementación 'legacy' (sin selector); su log escribe en este log() */
    /* A7.1: vista de SOLO LECTURA del estado para el arnés de pruebas (tools/baseline/setup_harness.py la usa si existe). El producto no la llama ni la publica en window. */
    function __tessDebugView(){ return {get renderer(){return S.renderer3d},get scene(){return S.scene3d},get camera(){return S.camera3d},get orbit(){return S.orbitState},get nFold(){return S.foldTree.length},get panels(){return S.panelMeshes.length},get foldData(){return S.foldData},get art(){return S.currentArtState},get panelData(){return S.currentPanelData},get thickness(){return S.currentThicknessMm},get preset(){return S.currentMaterialPreset},get baseIndex(){return S.currentBasePanelIndex},get angles(){return S.foldAngles},get tree(){return S.foldTree},get bridges(){return S.foldBridgeGroup},get selectedEdge(){return S.selectedFoldEdgeIdx},get creaseVisuals(){return S.creaseVisuals},get adj(){return S.currentAdjEdges}}; }
    /* A7: raíz de composición (docs/fase1/A7_PROPUESTA.md §5.1): fábricas en orden topológico; sus funciones conservan los nombres y el texto de siempre */
    var { getMaterialPreset, getPanelShellHex, getEdgeLineHex, getFoldHingeHex, getFoldHingeRadius, refreshPanelMaterials } = createMaterials(S);
    var { makeLabelCanvas, roundRect, getLabelResources, disposeLabelCache, makePanelLabelSprite } = createLabels();
    var { signedDisplayAngle, internalAngleFromDisplay } = createFoldAngles(S);
    var { resize3D, updateCameraFromOrbit, init3D, fitCamera3D } = createViewport(S, { canvas3d, viewport3d, log, setStatus, pickPanelFromEvent, pickCreaseFromEvent });
    var { hasArtworkLoaded, loadTextureFromPath, disposeArtOverlays, applyArtUVs, addArtworkOverlay, applyArtworkToScene, disposeCurrentArtTextures } = createArtwork(S, { refreshPanelMaterials });
    var { disposeCreaseVisuals, projectInsetDir, buildRibbonStripGeometry, makeBridgeRowsForEdge, addFoldBridgeVisual, rebuildCreaseVisuals } = createCreaseVisuals(S, { getFoldHingeHex, signedDisplayAngle, updateSelectedCreaseVisuals });
    var { clearAllMeshes, build3DFromPanels } = createPanelMeshes(S, { log, getPanelShellHex, getEdgeLineHex, applyArtworkToScene, disposeLabelCache, disposeCreaseVisuals });
    var { applyFolding } = createFolding(S, { makePanelLabelSprite, refreshPanelMaterials, rebuildCreaseVisuals });
    var { textureToImageBytes } = createGlbImage({ log }); /* A8.2: codificación de texturas para el GLB (bytesFromDataURL queda interna) */
    var { buildExportSceneMeshes } = createGlbScene(S); /* A8.3: recorrido de la escena para el GLB */
    var { buildGLBBlobFromCurrentView } = createGlbBuilder({ buildExportSceneMeshes, textureToImageBytes }); /* A8.4: constructor del GLB */
    var { syncMaterialPresetUI, setInteractionMode, ensureCep, showImport, show3D, setDebugVisible, setActiveTab, syncMaterialInputs, setArtStatus } = createViews(S, { importView, threeView, outputArea, tabButtons, tabPanels, thicknessInput, materialPresetSelect, materialPill, artStatus, artSourcePill, modeFoldBtn, modeBaseBtn, interactionModePill, interactionStatus, viewportBadge, viewport3d, errorMsg, testBtn, extractBtn, previewBtn, continueBtn, backBtn, export3dBtn, setStatus, getMaterialPreset }); /* A9.1: presentación (ui/views.js); interactionMode es privado de la fábrica */
    var { refreshArtwork, exportPNG, exportGLB } = createActions(S, { log, setStatus, ensureCep, setArtStatus, loadTextureFromPath, applyArtworkToScene, disposeCurrentArtTextures, buildGLBBlobFromCurrentView }); /* A9.2: acciones (app/actions.js); el manejador de «Export GLB» sigue aquí */


    if(!importView||!threeView||!statusArea||!errorMsg||!testBtn||!extractBtn||
       !previewBtn||!continueBtn||!debugToggle||!outputArea||!validationStatus||
       !problemsList||!canvas2d||!ctx2d||!backBtn||!export3dBtn||!exportGlbBtn||!viewport3d||!canvas3d||
       !thicknessInput||!applyThicknessBtn){
      setStatus('UI mismatch - missing elements'); return;
    }

    /* ================================================================
       EXTENDSCRIPT — clean, no intrusive catch blocks
       ================================================================ */
    /* Los textos ExtendScript viven en src/host/ (A5.2). */

    /* ================================================================
       CEP BRIDGE — clean, no intrusive catch
       ================================================================ */

    function applyMaterialPreset(presetKey, rebuild){
      if(!MATERIAL_PRESETS[presetKey]) presetKey = 'white';
      S.currentMaterialPreset = presetKey;
      syncMaterialPresetUI();
      if(rebuild && S.currentPanelData){
        try{
          var built = build3DFromPanels(S.currentPanelData, lastData);
          if(built){
            buildFoldUI(S.currentPanelData);
            fitCamera3D();
            setStatus('Material preset applied: '+getMaterialPreset().label);
          }
        }catch(err){
          log('Material preset rebuild error: '+err.message);
          setStatus('Material preset error: '+err.message);
        }
      } else {
        refreshPanelMaterials();
        rebuildCreaseVisuals(buildChildrenOfMap());
      }
    }

    function resetValidationUI(){
      problems=[]; problemsList.innerHTML='';
      validationStatus.textContent='Waiting for extraction...';
      validationStatus.className='check-status';
      continueBtn.disabled=true;
    }

    /* ================================================================
       VALIDATION (presentación). Cálculo: src/core/legacy/validate.js (A6.5); utilidades 2D: src/core/legacy/geom2d.js
       ================================================================ */
    function validateGeometry(data){
      problems=[]; problemsList.innerHTML='';
      if(!data||data.error){ validationStatus.textContent='Waiting...'; validationStatus.className='check-status'; continueBtn.disabled=true; return; }
      problems=geometryEngine.validate(data).problems; /* A6.5/A6.6: cálculo puro del motor (core/legacy/validate.js); aquí solo la presentación */
      if(problems.length===0){
        validationStatus.textContent='\u2705 No problems found';
        validationStatus.className='check-status status-ok';
        continueBtn.disabled=false;
      } else {
        validationStatus.textContent='\u26a0\ufe0f '+problems.length+' potential problem(s)';
        validationStatus.className='check-status status-warning';
        continueBtn.disabled=false;
        problems.forEach(function(p){
          var li=document.createElement('li');
          li.textContent=p.id+': '+p.type+' ('+p.dist+'mm)';
          li.onclick=function(){render2D(lastData,p.id);};
          problemsList.appendChild(li);
        });
      }
    }

    /* ================================================================
       2D PREVIEW
       ================================================================ */
    function render2D(data,hlId){
      if(!data||data.error) return;
      canvas2d.style.display='block';
      ctx2d.clearRect(0,0,canvas2d.width,canvas2d.height);
      var mnx=Infinity,mny=Infinity,mxx=-Infinity,mxy=-Infinity;
      function con(pt){if(!pt)return;mnx=Math.min(mnx,pt.x);mny=Math.min(mny,pt.y);mxx=Math.max(mxx,pt.x);mxy=Math.max(mxy,pt.y);}
      function conP(po){if(!po||!po.points)return;po.points.forEach(function(p){con(p.anchor);});}
      conP(data.outerBoundary);
      (data.holes||[]).forEach(conP);
      (data.creases||[]).forEach(conP);
      (data.cutLines||[]).forEach(function(cl){conP(cl.geom);});
      if(!isFinite(mnx)) return;
      var w=(mxx-mnx)||1,h=(mxy-mny)||1,pad=24,dw=canvas2d.width-pad*2,dh=canvas2d.height-pad*2;
      var sc=Math.min(dw/w,dh/h), ox=pad+(dw-w*sc)/2, oy=pad+(dh-h*sc)/2;
      function tr(x,y){return{x:ox+(x-mnx)*sc, y:canvas2d.height-(oy+(y-mny)*sc)};}
      function draw(po,col,dash,lw){
        if(!po||!po.points||po.points.length<2)return;
        ctx2d.beginPath();ctx2d.strokeStyle=col;ctx2d.lineWidth=lw||1.2;ctx2d.setLineDash(dash?[5,5]:[]);
        var s=tr(po.points[0].anchor.x,po.points[0].anchor.y);ctx2d.moveTo(s.x,s.y);
        for(var i=1;i<po.points.length;i++){var p=tr(po.points[i].anchor.x,po.points[i].anchor.y);ctx2d.lineTo(p.x,p.y);}
        if(po.closed)ctx2d.closePath();ctx2d.stroke();ctx2d.setLineDash([]);
      }
      draw(data.outerBoundary,'#4488ff',false,1.8);
      (data.holes||[]).forEach(function(h){draw(h,'#4488ff',true,1);});
      (data.cutLines||[]).forEach(function(cl){draw(cl.geom,'#4488ff',true,1);});
      (data.creases||[]).forEach(function(cr){draw(cr,'#ff4444',false,1.2);});
      problems.forEach(function(p){
        var pt=tr(p.point.x,p.point.y);
        ctx2d.beginPath();ctx2d.arc(pt.x,pt.y,hlId===p.id?8:5,0,Math.PI*2);
        ctx2d.strokeStyle=hlId===p.id?'#ffffff':'#f0a000';ctx2d.lineWidth=2;ctx2d.stroke();
        ctx2d.fillStyle='#f0a000';ctx2d.font='10px sans-serif';ctx2d.fillText(p.id,pt.x+8,pt.y-8);
      });
    }

    /* PLANAR GRAPH TOPOLOGY ENGINE → src/core/legacy/topology.js (A6.2); utilidades 2D → src/core/legacy/geom2d.js */

    /* ================================================================
       3D ENGINE
       ================================================================ */
    /* A7.1: renderer3d, scene3d, camera3d, orbitState, panelMeshes, foldBridgeGroup, foldData, foldRoot, foldAngles, foldTree, foldCenter, raycaster3d y pointer3d viven en S (src/app/state.js) */

    /* ================================================================
       BUILD 3D PANELS (escena). Los paneles 2D salen de src/core/legacy/panels.js (A6.4).
       ================================================================ */

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

    /* ADJACENCY + FOLD TREE → src/core/legacy/adjacency.js y src/core/legacy/fold-tree.js (A6.3). Aquí quedan los signos de presentación de la UI. */

    function updatePerCreaseRow(edgeIdx){
      var cs = currentCreaseSliders[edgeIdx];
      if(!cs) return;
      var display = signedDisplayAngle(edgeIdx, S.foldAngles[edgeIdx] || 0);
      cs.slider.value = String(display);
      cs.val.textContent = (display>0?'+':'') + String(display) + '°';
      if(cs.label) cs.label.textContent = 'C'+edgeIdx+'  P'+S.foldTree[edgeIdx].parent+'→P'+S.foldTree[edgeIdx].child+'  ' + (display>=0 ? '+' : '−');
    }


    /* A1 (fuga GPU): libera geometría y material de las líneas visibles y cajas de selección de crease. */

    function updateSelectedCreaseVisuals(){
      S.creaseVisuals.forEach(function(entry){
        if(!entry.visible || !entry.visible.material) return;
        var active = entry.edgeIdx===S.selectedFoldEdgeIdx;
        entry.visible.material.color.set(active ? '#ffd166' : '#ff4444');
        entry.visible.material.opacity = active ? 1 : 0.98;
        entry.visible.material.needsUpdate = true;
      });
      currentCreaseRows.forEach(function(row, idx){
        if(!row) return;
        row.style.background = idx===S.selectedFoldEdgeIdx ? 'rgba(255,209,102,0.10)' : 'transparent';
        row.style.borderRadius = '8px';
        row.style.padding = '2px 4px';
      });
    }

    function syncSelectedCreaseUI(){
      if(!selectedCreaseLabelEl || !selectedCreaseSliderEl || !selectedCreaseNumberEl) return;
      if(S.selectedFoldEdgeIdx<0 || !S.foldTree[S.selectedFoldEdgeIdx]){
        selectedCreaseLabelEl.textContent = 'Selected crease: none';
        selectedCreaseSliderEl.disabled = true;
        selectedCreaseNumberEl.disabled = true;
        selectedCreaseSliderEl.value = '0';
        selectedCreaseNumberEl.value = '0';
        updateSelectedCreaseVisuals();
        return;
      }
      var edge = S.foldTree[S.selectedFoldEdgeIdx];
      var displayAngle = signedDisplayAngle(S.selectedFoldEdgeIdx, S.foldAngles[S.selectedFoldEdgeIdx] || 0);
      selectedCreaseLabelEl.textContent = 'Selected crease: C'+S.selectedFoldEdgeIdx+' · P'+edge.parent+' → P'+edge.child+' · '+(displayAngle>0?'+':'')+displayAngle+'°';
      selectedCreaseSliderEl.disabled = false;
      selectedCreaseNumberEl.disabled = false;
      selectedCreaseSliderEl.value = String(displayAngle);
      selectedCreaseNumberEl.value = String(displayAngle);
      updateSelectedCreaseVisuals();
    }

    function selectFoldEdge(edgeIdx, applyNow){
      if(edgeIdx===null || edgeIdx===undefined || !S.foldTree.length){
        S.selectedFoldEdgeIdx = -1;
        syncSelectedCreaseUI();
        return;
      }
      S.selectedFoldEdgeIdx = Math.max(0, Math.min(edgeIdx, S.foldTree.length-1));
      setInteractionMode('fold', false);
      syncSelectedCreaseUI();
      if(applyNow) applyFolding();
    }

    function applySelectedCreaseAngle(angle){
      if(S.selectedFoldEdgeIdx<0 || S.selectedFoldEdgeIdx>=S.foldAngles.length) return;
      var clamped = Math.max(-180, Math.min(180, angle));
      S.foldAngles[S.selectedFoldEdgeIdx] = internalAngleFromDisplay(S.selectedFoldEdgeIdx, clamped);
      if(currentCreaseSliders[S.selectedFoldEdgeIdx]) updatePerCreaseRow(S.selectedFoldEdgeIdx);
      syncSelectedCreaseUI();
      applyFolding();
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

    /* ================================================================
       APPLY FOLDING — hierarchical pivot rotation
       ================================================================ */

    function setBasePanel(newBase, rebuildUI, userSelected){
      if(!S.currentPanelData || !S.currentAdjEdges) return;
      S.currentBasePanelIndex = Math.max(0, Math.min(newBase, S.currentPanelData.panels.length-1));
      if(userSelected) S.baseSelectionConfirmed = true;
      S.foldTree = geometryEngine.buildFoldTree(S.currentPanelData.panels, S.currentAdjEdges, S.currentBasePanelIndex);
      S.foldSigns = S.foldTree.map(function(edge){ return edge.sign || 1; });
      S.foldAngles = S.foldTree.map(function(){ return 0; });
      S.foldCenter = S.foldData ? S.foldData.center : {x:0,y:0};
      S.selectedFoldEdgeIdx = S.foldTree.length ? 0 : -1;
      if(rebuildUI) buildFoldUI(S.currentPanelData);
      applyFolding();
      fitCamera3D();
      setStatus('3D ready · base=P'+S.currentBasePanelIndex+' · thickness='+S.currentThicknessMm.toFixed(1)+'mm');
    }

    function buildFoldUI(panelData){
      S.currentPanelData = panelData;
      S.currentAdjEdges = geometryEngine.buildAdjacency(panelData.panels,panelData.creaseEdges);
      if(S.currentBasePanelIndex<0 || S.currentBasePanelIndex>=panelData.panels.length){
        S.currentBasePanelIndex = geometryEngine.defaultBaseIndex(panelData);
      }
      S.foldTree = geometryEngine.buildFoldTree(panelData.panels,S.currentAdjEdges,S.currentBasePanelIndex);
      S.foldSigns = S.foldTree.map(function(edge){ return edge.sign || 1; });
      S.foldAngles = S.foldTree.map(function(){return 0;});
      S.foldCenter = S.foldData?S.foldData.center:{x:0,y:0};

      var existing=byId('fold-panel');
      if(existing) existing.remove();

      var nPanels=panelData.panels.length;
      var panel=document.createElement('div');
      panel.id='fold-panel';
      panel.className='card fold-section';
      panel.style.cssText='margin-top:0;max-height:320px;overflow-y:auto;';

      var title=document.createElement('div');
      title.className='cardtitle';
      title.textContent='Fold Controls';
      title.style.marginBottom='8px';
      panel.appendChild(title);

      var info=document.createElement('div');
      info.style.cssText='font-size:11px;opacity:0.78;margin-bottom:8px;line-height:1.35;';
      info.textContent=nPanels+' panels, '+S.currentAdjEdges.length+' fold edges, base=P'+S.currentBasePanelIndex+(S.currentAdjEdges.length ? '. Alt/Option + click a red fold line in 3D. Shift + click any panel to change the base.' : '. No fold edges detected yet.');
      panel.appendChild(info);

      var selectedRow=document.createElement('div');
      selectedRow.style.cssText='display:flex;align-items:center;gap:8px;margin-bottom:8px;flex-wrap:wrap;';
      selectedCreaseLabelEl=document.createElement('div');
      selectedCreaseLabelEl.style.cssText='font-size:11px;font-weight:700;min-width:140px;';
      selectedCreaseLabelEl.textContent='Selected crease: none';
      selectedCreaseSliderEl=document.createElement('input');
      selectedCreaseSliderEl.type='range'; selectedCreaseSliderEl.min='-180'; selectedCreaseSliderEl.max='180'; selectedCreaseSliderEl.value='0';
      selectedCreaseSliderEl.style.cssText='flex:1;min-width:120px;accent-color:#ffd166;';
      selectedCreaseNumberEl=document.createElement('input');
      selectedCreaseNumberEl.type='number'; selectedCreaseNumberEl.min='-180'; selectedCreaseNumberEl.max='180'; selectedCreaseNumberEl.step='1'; selectedCreaseNumberEl.value='0';
      selectedCreaseNumberEl.style.cssText='width:72px;background:#0b1220;color:#fff;border:1px solid #334155;border-radius:8px;padding:6px 8px;font-size:11px;';
      selectedRow.appendChild(selectedCreaseLabelEl);
      selectedRow.appendChild(selectedCreaseSliderEl);
      selectedRow.appendChild(selectedCreaseNumberEl);
      panel.appendChild(selectedRow);

      var baseRow=document.createElement('div');
      baseRow.style.cssText='display:flex;align-items:center;gap:8px;margin-bottom:8px;';
      var baseLabel=document.createElement('span');
      baseLabel.textContent='Base';
      baseLabel.style.cssText='font-size:11px;font-weight:700;min-width:36px;';
      var baseSelect=document.createElement('select');
      baseSelect.style.cssText='flex:1;background:#0b1220;color:#fff;border:1px solid #334155;border-radius:10px;padding:8px 10px;font-size:11px;';
      panelData.panels.forEach(function(p,i){
        var opt=document.createElement('option');
        opt.value=i;
        opt.textContent='P'+i+' ('+Math.abs(p.area).toFixed(0)+' mm²)';
        if(i===S.currentBasePanelIndex) opt.selected=true;
        baseSelect.appendChild(opt);
      });
      currentBaseSelect = baseSelect;
      baseRow.appendChild(baseLabel);
      baseRow.appendChild(baseSelect);
      panel.appendChild(baseRow);

      var allDetails=document.createElement('details');
      allDetails.className='all-creases';
      allDetails.open=false;
      var allSummary=document.createElement('summary');
      allSummary.textContent='ALL creases';
      allDetails.appendChild(allSummary);
      var allRow=document.createElement('div');
      allRow.style.cssText='display:flex;align-items:center;gap:8px;margin-bottom:8px;';
      var allLabel=document.createElement('span');
      allLabel.textContent='ALL';
      allLabel.style.cssText='font-size:11px;font-weight:700;color:#ff6b6b;min-width:30px;';
      var allSlider=document.createElement('input');
      allSlider.type='range'; allSlider.min='-180'; allSlider.max='180'; allSlider.value='0';
      allSlider.style.cssText='flex:1;accent-color:#ff6b6b;';
      var allVal=document.createElement('span');
      allVal.textContent='0°';
      allVal.style.cssText='font-size:11px;min-width:42px;text-align:right;';
      allRow.appendChild(allLabel);
      allRow.appendChild(allSlider);
      allRow.appendChild(allVal);
      allDetails.appendChild(allRow);

      var creaseListWrap=document.createElement('div');
      creaseListWrap.style.cssText='display:flex;flex-direction:column;gap:4px;';
      allDetails.appendChild(creaseListWrap);
      panel.appendChild(allDetails);

      var creaseSliders=[];
      currentCreaseRows = [];
      currentCreaseSliders = creaseSliders;
      S.foldTree.forEach(function(edge,ei){
        var row=document.createElement('div');
        row.style.cssText='display:flex;align-items:center;gap:8px;margin-bottom:4px;cursor:pointer;';
        var label=document.createElement('span');
        label.textContent='C'+ei+'  P'+edge.parent+'→P'+edge.child+'  '+((S.foldSigns[ei]||1)>=0?'+':'−');
        label.style.cssText='font-size:10px;font-weight:600;color:#66bbff;min-width:30px;';
        var slider=document.createElement('input');
        slider.type='range'; slider.min='-180'; slider.max='180'; slider.value='0';
        slider.style.cssText='flex:1;accent-color:#66bbff;';
        slider.dataset.idx=ei;
        var val=document.createElement('span');
        val.textContent='0°';
        val.style.cssText='font-size:10px;min-width:35px;text-align:right;';
        row.appendChild(label);
        row.appendChild(slider);
        row.appendChild(val);
        creaseListWrap.appendChild(row);
        creaseSliders.push({slider:slider,val:val,row:row,label:label});
        currentCreaseRows.push(row);

        row.addEventListener('click', function(){
          selectFoldEdge(ei, false);
        });

        slider.addEventListener('input',function(){
          var idx=parseInt(this.dataset.idx,10);
          var displayVal=parseFloat(this.value);
          S.foldAngles[idx]=internalAngleFromDisplay(idx, displayVal);
          val.textContent=(displayVal>0?'+':'')+displayVal+'°';
          if(S.selectedFoldEdgeIdx===idx) syncSelectedCreaseUI();
          applyFolding();
        });
      });

      selectedCreaseSliderEl.addEventListener('input', function(){
        applySelectedCreaseAngle(parseFloat(this.value));
      });
      selectedCreaseNumberEl.addEventListener('change', function(){
        applySelectedCreaseAngle(parseFloat(this.value));
      });

      allSlider.addEventListener('input',function(){
        var v=parseFloat(allSlider.value);
        allVal.textContent=(v>0?'+':'')+v+'°';
        S.foldAngles=S.foldAngles.map(function(){return v;});
        creaseSliders.forEach(function(cs,idx){ updatePerCreaseRow(idx); });
        syncSelectedCreaseUI();
        applyFolding();
      });

      var resetBtn=document.createElement('button');
      resetBtn.className='btn secondary full';
      resetBtn.textContent='↩ Reset Flat';
      resetBtn.style.marginTop='6px';
      resetBtn.addEventListener('click',function(){
        allSlider.value='0'; allVal.textContent='0°';
        S.foldAngles=S.foldAngles.map(function(){return 0;});
        creaseSliders.forEach(function(cs,idx){ updatePerCreaseRow(idx); });
        syncSelectedCreaseUI();
        applyFolding();
      });
      panel.appendChild(resetBtn);

      baseSelect.addEventListener('change',function(){
        setBasePanel(parseInt(baseSelect.value,10), true, true);
      });

      var debugDetails = byId('debug-details');
      var logNode = byId('log-area');
      var creaseSlot = byId('crease-controls-slot');
      if(creaseSlot){
        creaseSlot.innerHTML='';
        creaseSlot.appendChild(panel);
      }else if(debugDetails && debugDetails.parentNode===threeView){
        threeView.insertBefore(panel, debugDetails);
      }else if(logNode && logNode.parentNode===threeView){
        threeView.insertBefore(panel, logNode);
      }else{
        threeView.appendChild(panel);
      }
      if(!S.foldTree.length) S.selectedFoldEdgeIdx = -1;
      else if(S.selectedFoldEdgeIdx<0 || S.selectedFoldEdgeIdx>=S.foldTree.length) S.selectedFoldEdgeIdx = 0;
      syncSelectedCreaseUI();
      applyFolding();
      refreshPanelMaterials();
      setStatus(S.currentAdjEdges.length ? ('3D model ready - '+nPanels+' panels, '+S.currentAdjEdges.length+' fold edges') : ('3D model ready - '+nPanels+' panels, no fold edges detected'));
    }

    /* ================================================================
       EVENT HANDLERS
       ================================================================ */
    if(!ensureCep()) return;

    showImport();
    resetValidationUI();
    setDebugVisible(debugToggle.checked);
    syncMaterialInputs();
    setArtStatus('Looks for Front/Back or Tiro/Retiro as artboards or layers. Mapping is aligned to the full artboard.','No art');
    setInteractionMode('fold', false);

    testBtn.addEventListener('click',function(){
      setStatus('Testing...');
      var jsx=TEST_CONNECTION_SCRIPT;
      evalScript(jsx,function(result){
        setStatus((result&&String(result).trim())?result:'No result returned');
      });
    });

    extractBtn.addEventListener('click',function(){
      setStatus('Extracting...');
      outputArea.value='';
      resetValidationUI();

      evalScript(EXTRACT_SCRIPT,function(result){
        try{
          if(!result || result==='undefined' || result==='null' || result==='EvalScript error.'){
            setStatus('Error: ' + String(result || 'No result returned'));
            return;
          }
          var parsed = JSON.parse(result);
          if(parsed.error){
            lastData = parsed;
            outputArea.value = result;
            if(debugToggle.checked) setDebugVisible(true);
            setStatus(parsed.error);
            return;
          }
          lastData = parsed;
          outputArea.value = JSON.stringify(parsed, null, 2);
          if(debugToggle.checked) setDebugVisible(true);
          validateGeometry(parsed);
          render2D(parsed);
          setStatus('Extraction complete');
        }catch(err){
          outputArea.value = String(result || '');
          if(debugToggle.checked) setDebugVisible(true);
          setStatus('Parse error: ' + err.message);
          log('Parse error: ' + err.message);
        }
      });
    });

    previewBtn.addEventListener('click', function(){
      if(!lastData || lastData.error){
        setStatus('Nothing to preview. Extract first.');
        return;
      }
      render2D(lastData);
      setStatus('2D preview updated');
    });

    continueBtn.addEventListener('click', function(){
      if(!lastData || lastData.error){
        setStatus('Nothing to build. Extract first.');
        return;
      }
      clearLog();
      show3D();
      setStatus('Preparing 3D...');

      if(!init3D()){
        setStatus('3D init failed');
        return;
      }

      try{
        var panelData = geometryEngine.buildPanels(lastData);
        if(!panelData || !panelData.panels || panelData.panels.length===0){
          setStatus('No 3D panels could be generated from the dieline');
          return;
        }
        S.currentPanelData = panelData;
        if(S.currentBasePanelIndex<0 || S.currentBasePanelIndex>=panelData.panels.length){
          S.currentBasePanelIndex = geometryEngine.defaultBaseIndex(panelData);
        }
        var built = build3DFromPanels(panelData, lastData);
        if(!built){
          setStatus('3D build failed');
          return;
        }
        buildFoldUI(panelData);
        fitCamera3D();
        setStatus('3D ready · thickness='+S.currentThicknessMm.toFixed(1)+'mm');
        refreshArtwork();
      }catch(err){
        log('3D error: ' + err.message);
        setStatus('3D error: ' + err.message);
      }
    });

    applyThicknessBtn.addEventListener('click', function(){
      var parsed = parseFloat(thicknessInput.value);
      if(!isFinite(parsed) || parsed<=0){
        setStatus('Thickness must be greater than 0');
        syncMaterialInputs();
        return;
      }
      S.currentThicknessMm = Math.max(0.1, Math.min(parsed, 20));
      syncMaterialInputs();
      if(!S.currentPanelData){
        setStatus('Thickness updated. Build 3D to apply it.');
        return;
      }
      try{
        var built = build3DFromPanels(S.currentPanelData, lastData);
        if(!built){
          setStatus('3D rebuild failed');
          return;
        }
        buildFoldUI(S.currentPanelData);
        fitCamera3D();
        setStatus('Thickness applied: '+S.currentThicknessMm.toFixed(1)+'mm');
        applyArtworkToScene();
      }catch(err){
        log('Rebuild error: '+err.message);
        setStatus('Rebuild error: '+err.message);
      }
    });

    backBtn.addEventListener('click', function(){
      showImport();
      setStatus('Back to import');
    });

    export3dBtn.addEventListener('click', function(){
      exportPNG();
      setStatus('3D PNG exported');
    });

    exportGlbBtn.addEventListener('click', async function(){
      try{
        setStatus('Exporting GLB…');
        await exportGLB();
        setStatus('GLB exported from current 3D pose');
      }catch(err){
        log('GLB export failed: '+err.message);
        if(debugDetails) debugDetails.open = true;
        setStatus('GLB export failed: '+err.message);
      }
    });

    if(materialPresetSelect){
      materialPresetSelect.addEventListener('change', function(){
        applyMaterialPreset(materialPresetSelect.value, true);
      });
    }

    if(refreshArtBtn){
      refreshArtBtn.addEventListener('click', function(){
        refreshArtwork();
      });
    }

    if(tabButtons.length){
      tabButtons.forEach(function(btn){
        btn.addEventListener('click', function(){
          setActiveTab(btn.dataset.tab);
        });
      });
    }

    if(modeFoldBtn){
      modeFoldBtn.addEventListener('click', function(){ setInteractionMode('fold', true); });
    }

    if(modeBaseBtn){
      modeBaseBtn.addEventListener('click', function(){ setInteractionMode('base', true); });
    }

    document.addEventListener('keydown', function(ev){
      if(!threeView || threeView.style.display==='none') return;
      var tag=(ev.target && ev.target.tagName ? ev.target.tagName.toLowerCase() : '');
      if(tag==='input' || tag==='textarea' || ev.target.isContentEditable) return;
      var key=(ev.key||'').toLowerCase();
      if(key==='escape'){ ev.preventDefault(); setInteractionMode('fold', true); }
    });

    debugToggle.addEventListener('change', function(){
      setDebugVisible(!!debugToggle.checked);
    });

  });
})();
