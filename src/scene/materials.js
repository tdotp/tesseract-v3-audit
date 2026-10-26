// A7.2 — Materiales de la escena: preset activo, colores y refresco de materiales de los paneles. Texto idéntico al de src/main.js de 2939dbc salvo la sangría y «S.».
import { MATERIAL_PRESETS, CREASE_HINGE_RADIUS_FACTOR, CREASE_HINGE_MIN_RADIUS } from '../config/look.js';

export function createMaterials(S){

  function getMaterialPreset(){
    return MATERIAL_PRESETS[S.currentMaterialPreset] || MATERIAL_PRESETS.white;
  }

  function getPanelShellHex(isBase){
    var preset = getMaterialPreset();
    return isBase ? preset.shellBase : preset.shell;
  }

  function getEdgeLineHex(){
    return getMaterialPreset().line;
  }

  function getFoldHingeHex(){
    return getMaterialPreset().hinge;
  }

  function getFoldHingeRadius(){
    return Math.max(CREASE_HINGE_MIN_RADIUS, S.currentThicknessMm * CREASE_HINGE_RADIUS_FACTOR);
  }

  function refreshPanelMaterials(){
    S.panelMeshes.forEach(function(mesh){
      if(!mesh || !mesh.material) return;
      var isBase = mesh.userData && mesh.userData.panelIndex===S.currentBasePanelIndex;
      mesh.material.color.set(getPanelShellHex(isBase));
      mesh.material.needsUpdate = true;
      if(mesh.userData && mesh.userData.edgeLines && mesh.userData.edgeLines.material){
        mesh.userData.edgeLines.material.color.set(getEdgeLineHex());
        mesh.userData.edgeLines.material.needsUpdate = true;
      }
    });
  }

  return { getMaterialPreset, getPanelShellHex, getEdgeLineHex, getFoldHingeHex, getFoldHingeRadius, refreshPanelMaterials };
}
