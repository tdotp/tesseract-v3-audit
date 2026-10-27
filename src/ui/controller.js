// A9.5 — Sesión del troquel y eventos: validación (presentación), vista 2D, preset de material (KI-24) y los 15 manejadores de la interfaz en un único bindEvents.
// Texto idéntico al de src/main.js de 3ea0d8a salvo la sangría (docs/fase1/A9_PROPUESTA.md §5.2, §16.2.2–§16.2.3): las funciones y lastData/problems, −2 espacios; los
// manejadores, sin cambios (en el cuerpo de bindEvents conservan sus 4 espacios). lastData y problems son privados de la fábrica (una sola instancia).
// bindEvents registra las escuchas en el ORDEN de hoy y main.js lo llama UNA vez, después de ensureCep; crear la fábrica no registra nada (sin efectos al crearse).
// document solo en validateGeometry y bindEvents; sin THREE ni window. buildChildrenOfMap sigue sin declararse (KI-24, excepción única de identificadores libres).
import { MATERIAL_PRESETS } from '../config/look.js';
import { EXTRACT_SCRIPT } from '../host/extract.js';
import { TEST_CONNECTION_SCRIPT } from '../host/test-connection.js';
import { evalScript } from '../bridge/cep.js';

export function createController(S, deps){
  var { threeView, testBtn, extractBtn, previewBtn, continueBtn, debugToggle, outputArea, validationStatus, problemsList, canvas2d, ctx2d, backBtn, export3dBtn, exportGlbBtn, debugDetails, thicknessInput, applyThicknessBtn, materialPresetSelect, refreshArtBtn, modeFoldBtn, modeBaseBtn, tabButtons, setStatus, log, clearLog, geometryEngine, getMaterialPreset, refreshPanelMaterials, init3D, fitCamera3D, applyArtworkToScene, rebuildCreaseVisuals, build3DFromPanels, syncMaterialPresetUI, setInteractionMode, showImport, show3D, setDebugVisible, setActiveTab, syncMaterialInputs, buildFoldUI, refreshArtwork, exportPNG, exportGLB } = deps;
  var lastData   = null;
  var problems   = [];

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

  function bindEvents(){
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
  }

  return { applyMaterialPreset, resetValidationUI, validateGeometry, render2D, bindEvents };
}
