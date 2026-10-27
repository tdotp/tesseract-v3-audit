// A9.3 — Controles de plegado: panel #fold-panel (deslizadores por crease, ALL, Reset, base), crease seleccionada y su resaltado, y cambio de base.
// Texto idéntico al de src/main.js de 3ea0d8a salvo la sangría (docs/fase1/A9_PROPUESTA.md §5.2, A9_HANDOFF.md §8). Los 6 widgets del panel son privados de la fábrica.
// document solo en buildFoldUI; sin THREE ni window; sin efectos al crearse. createCreaseVisuals recibe updateSelectedCreaseVisuals por un envoltorio de enlace
// tardío en la raíz de composición (D-A9-3): la escena la captura al crearse y esta fábrica se crea después.

export function createFoldControls(S, deps){
  var { threeView, byId, geometryEngine, applyFolding, fitCamera3D, refreshPanelMaterials, signedDisplayAngle, internalAngleFromDisplay, setInteractionMode, setStatus } = deps;
  var currentBaseSelect = null;
  var currentCreaseRows = [];
  var currentCreaseSliders = [];
  var selectedCreaseLabelEl = null;
  var selectedCreaseSliderEl = null;
  var selectedCreaseNumberEl = null;

  function updatePerCreaseRow(edgeIdx){
    var cs = currentCreaseSliders[edgeIdx];
    if(!cs) return;
    var display = signedDisplayAngle(edgeIdx, S.foldAngles[edgeIdx] || 0);
    cs.slider.value = String(display);
    cs.val.textContent = (display>0?'+':'') + String(display) + '°';
    if(cs.label) cs.label.textContent = 'C'+edgeIdx+'  P'+S.foldTree[edgeIdx].parent+'→P'+S.foldTree[edgeIdx].child+'  ' + (display>=0 ? '+' : '−');
  }

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

  return { updatePerCreaseRow, updateSelectedCreaseVisuals, syncSelectedCreaseUI, selectFoldEdge, applySelectedCreaseAngle, setBasePanel, buildFoldUI };
}
