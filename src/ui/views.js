// A9.1 — Presentación de la interfaz: material/preset, modo de interacción, CEP ausente, vistas, depuración, pestañas, espesor y estado del arte.
// Texto idéntico al de src/main.js de 3ea0d8a salvo la sangría (docs/fase1/A9_PROPUESTA.md §5.2, A9_HANDOFF.md §5). interactionMode es privado de la fábrica
// (solo lo usa setInteractionMode). Sin THREE, window ni document; sin efectos al crearse: la guarda «UI mismatch» y el arranque siguen en main.js.
import { hasCep } from '../bridge/cep.js';

export function createViews(S, deps){
  var { importView, threeView, outputArea, tabButtons, tabPanels, thicknessInput, materialPresetSelect, materialPill, artStatus, artSourcePill, modeFoldBtn, modeBaseBtn, interactionModePill, interactionStatus, viewportBadge, viewport3d, errorMsg, testBtn, extractBtn, previewBtn, continueBtn, backBtn, export3dBtn, setStatus, getMaterialPreset } = deps;
  var interactionMode = 'fold';

  function syncMaterialPresetUI(){
    var preset = getMaterialPreset();
    if(materialPresetSelect) materialPresetSelect.value = preset.key;
    if(materialPill) materialPill.textContent = preset.label;
  }

  function setInteractionMode(mode, announce){
    interactionMode = (mode==='base') ? 'base' : 'fold';
    if(modeFoldBtn) modeFoldBtn.classList.toggle('active', interactionMode==='fold');
    if(modeBaseBtn) modeBaseBtn.classList.toggle('active', interactionMode==='base');
    if(interactionModePill) interactionModePill.textContent = interactionMode==='base' ? 'Base selection' : 'Crease selection';
    if(interactionStatus) interactionStatus.textContent = interactionMode==='base'
      ? 'Shift + click any panel to assign it as the base. Alt/Option + click a red fold line to target a crease.'
      : 'Alt/Option + click a red fold line to target a crease. Shift + click any panel to change the base.';
    if(viewportBadge){
      viewportBadge.textContent = interactionMode==='base' ? 'Shift + click panel for base' : 'Alt/Option + click red line · Shift + click panel for base';
      if(viewport3d) viewport3d.classList.toggle('viewport-base', interactionMode==='base');
    }
    if(announce) setStatus(interactionMode==='base' ? 'Base selection mode enabled' : 'Crease selection mode enabled');
  }

  function ensureCep(){
    if(!hasCep()){
      errorMsg.style.display='block';
      [testBtn,extractBtn,previewBtn,continueBtn,backBtn,export3dBtn].forEach(function(b){b.disabled=true;});
      setStatus('CEP bridge not found.'); return false;
    }
    return true;
  }

  function showImport(){ importView.style.display='block'; threeView.style.display='none'; }

  function show3D()    { importView.style.display='none';  threeView.style.display='block'; }

  function setDebugVisible(on){ if(outputArea) outputArea.style.display = on?'block':'none'; }

  function setActiveTab(key){
    key = key || 'material';
    tabButtons.forEach(function(btn){
      var active = btn.dataset.tab === key;
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-selected', active ? 'true' : 'false');
    });
    tabPanels.forEach(function(panel){
      panel.classList.toggle('active', panel.id === 'tab-' + key);
    });
  }

  function syncMaterialInputs(){ if(thicknessInput) thicknessInput.value=String(S.currentThicknessMm.toFixed(2)); syncMaterialPresetUI(); }

  function setArtStatus(message,pill){
    if(artStatus) artStatus.textContent = message;
    if(artSourcePill) artSourcePill.textContent = pill || 'No art';
  }

  return { syncMaterialPresetUI, setInteractionMode, ensureCep, showImport, show3D, setDebugVisible, setActiveTab, syncMaterialInputs, setArtStatus };
}
