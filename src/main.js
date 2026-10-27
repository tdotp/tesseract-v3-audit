import { DEFAULT_THICKNESS_MM, CREASE_HINGE_RADIUS_FACTOR, CREASE_HINGE_MIN_RADIUS, CREASE_HINGE_SEGMENTS, CREASE_HINGE_SHOW_THRESHOLD_DEG, FOLD_BRIDGE_TOP_Z, FOLD_BRIDGE_BOTTOM_Z, CREASE_LINE_Z_OFFSET, ART_TOP_OFFSET, ART_BOTTOM_OFFSET } from './config/look.js';
import { pathToFileURL } from './bridge/cep.js';
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
import { createFoldControls } from './ui/fold-controls.js';
import { createPicking } from './ui/picking.js';
import { createActions } from './app/actions.js';
import { createController } from './ui/controller.js';

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
    var { resize3D, updateCameraFromOrbit, init3D, fitCamera3D } = createViewport(S, { canvas3d, viewport3d, log, setStatus, pickPanelFromEvent: function(e){ return pickPanelFromEvent(e); }, pickCreaseFromEvent: function(e){ return pickCreaseFromEvent(e); } }); /* A9.4: enlace tardío (D-A9-3/4); las asigna createPicking más abajo */
    var { hasArtworkLoaded, loadTextureFromPath, disposeArtOverlays, applyArtUVs, addArtworkOverlay, applyArtworkToScene, disposeCurrentArtTextures } = createArtwork(S, { refreshPanelMaterials });
    var { disposeCreaseVisuals, projectInsetDir, buildRibbonStripGeometry, makeBridgeRowsForEdge, addFoldBridgeVisual, rebuildCreaseVisuals } = createCreaseVisuals(S, { getFoldHingeHex, signedDisplayAngle, updateSelectedCreaseVisuals: function(){ return updateSelectedCreaseVisuals(); } }); /* A9.3: enlace tardío (D-A9-3); la función la asigna createFoldControls más abajo */
    var { clearAllMeshes, build3DFromPanels } = createPanelMeshes(S, { log, getPanelShellHex, getEdgeLineHex, applyArtworkToScene, disposeLabelCache, disposeCreaseVisuals });
    var { applyFolding } = createFolding(S, { makePanelLabelSprite, refreshPanelMaterials, rebuildCreaseVisuals });
    var { textureToImageBytes } = createGlbImage({ log }); /* A8.2: codificación de texturas para el GLB (bytesFromDataURL queda interna) */
    var { buildExportSceneMeshes } = createGlbScene(S); /* A8.3: recorrido de la escena para el GLB */
    var { buildGLBBlobFromCurrentView } = createGlbBuilder({ buildExportSceneMeshes, textureToImageBytes }); /* A8.4: constructor del GLB */
    var { syncMaterialPresetUI, setInteractionMode, ensureCep, showImport, show3D, setDebugVisible, setActiveTab, syncMaterialInputs, setArtStatus } = createViews(S, { importView, threeView, outputArea, tabButtons, tabPanels, thicknessInput, materialPresetSelect, materialPill, artStatus, artSourcePill, modeFoldBtn, modeBaseBtn, interactionModePill, interactionStatus, viewportBadge, viewport3d, errorMsg, testBtn, extractBtn, previewBtn, continueBtn, backBtn, export3dBtn, setStatus, getMaterialPreset }); /* A9.1: presentación (ui/views.js); interactionMode es privado de la fábrica */
    var { updatePerCreaseRow, updateSelectedCreaseVisuals, syncSelectedCreaseUI, selectFoldEdge, applySelectedCreaseAngle, setBasePanel, buildFoldUI } = createFoldControls(S, { threeView, byId, geometryEngine, applyFolding, fitCamera3D, refreshPanelMaterials, signedDisplayAngle, internalAngleFromDisplay, setInteractionMode, setStatus }); /* A9.3: controles de plegado (ui/fold-controls.js); los 6 widgets del panel son privados de la fábrica */
    var { pickPanelFromEvent, pickCreaseFromEvent } = createPicking(S, { canvas3d, setBasePanel, selectFoldEdge, setActiveTab, setInteractionMode, setStatus }); /* A9.4: selección por clic (ui/picking.js) */
    var { refreshArtwork, exportPNG, exportGLB } = createActions(S, { log, setStatus, ensureCep, setArtStatus, loadTextureFromPath, applyArtworkToScene, disposeCurrentArtTextures, buildGLBBlobFromCurrentView }); /* A9.2: acciones (app/actions.js); el manejador de «Export GLB» sigue aquí */
    var { applyMaterialPreset, resetValidationUI, validateGeometry, render2D, bindEvents } = createController(S, { threeView, testBtn, extractBtn, previewBtn, continueBtn, debugToggle, outputArea, validationStatus, problemsList, canvas2d, ctx2d, backBtn, export3dBtn, exportGlbBtn, debugDetails, thicknessInput, applyThicknessBtn, materialPresetSelect, refreshArtBtn, modeFoldBtn, modeBaseBtn, tabButtons, setStatus, log, clearLog, geometryEngine, getMaterialPreset, refreshPanelMaterials, init3D, fitCamera3D, applyArtworkToScene, rebuildCreaseVisuals, build3DFromPanels, syncMaterialPresetUI, setInteractionMode, showImport, show3D, setDebugVisible, setActiveTab, syncMaterialInputs, buildFoldUI, refreshArtwork, exportPNG, exportGLB }); /* A9.5: sesión del troquel y eventos (ui/controller.js); lastData y problems son privados de la fábrica; bindEvents() se llama una vez, tras ensureCep */


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

    /* ================================================================
       VALIDATION (presentación). Cálculo: src/core/legacy/validate.js (A6.5); utilidades 2D: src/core/legacy/geom2d.js
       ================================================================ */

    /* ================================================================
       2D PREVIEW
       ================================================================ */

    /* PLANAR GRAPH TOPOLOGY ENGINE → src/core/legacy/topology.js (A6.2); utilidades 2D → src/core/legacy/geom2d.js */

    /* ================================================================
       3D ENGINE
       ================================================================ */
    /* A7.1: renderer3d, scene3d, camera3d, orbitState, panelMeshes, foldBridgeGroup, foldData, foldRoot, foldAngles, foldTree, foldCenter, raycaster3d y pointer3d viven en S (src/app/state.js) */

    /* ================================================================
       BUILD 3D PANELS (escena). Los paneles 2D salen de src/core/legacy/panels.js (A6.4).
       ================================================================ */

    /* ADJACENCY + FOLD TREE → src/core/legacy/adjacency.js y src/core/legacy/fold-tree.js (A6.3). Aquí quedan los signos de presentación de la UI. */


    /* A1 (fuga GPU): libera geometría y material de las líneas visibles y cajas de selección de crease. */

    /* ================================================================
       APPLY FOLDING — hierarchical pivot rotation
       ================================================================ */

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

    bindEvents();

  });
})();
