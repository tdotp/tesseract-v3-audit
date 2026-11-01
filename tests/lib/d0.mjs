// D-0 (decisión de producto aprobada por el usuario el 2026-11-01): el RC 3.0.0-rc.1 pasa a ser la línea de desarrollo del producto; dist-a9
// queda congelado como referencia histórica de F1. Este módulo es la ÚNICA lista de diferencias autorizadas entre la fuente evolucionada (src/)
// y las referencias de texto de F1 (A5–A9). Las pruebas de F1 de la línea de producto la consultan: cualquier OTRA diferencia sigue fallando, y
// una diferencia declarada que no aparezca también falla (las listas se comparan exactas, no como filtros).
// La comprobación ORIGINAL de F1 («src = referencia», sin excepciones) sigue ejecutándose sin cambios sobre la fuente congelada: tests/run-historico.sh.
export const HIST_COMMIT = '43125543b4ed54f0eca1d4764e112c6e6baa6666'; // último commit de la línea histórica (fuente congelada de dist-a9)
export const VERSION_PRODUCTO = '3.0.1-dev.1';

// Funciones de F1 cuyo texto cambia en la línea de producto, con su motivo.
export const D0_FUNCIONES_CAMBIADAS = {
  createAppState: 'H-05: campo currentDocIdentity',
  createFolding: 'KI-24: declara y devuelve buildChildrenOfMap',
  applyFolding: 'KI-24: usa buildChildrenOfMap',
  buildArtworkExportScript: 'H-02: try/finally en exportArtboardByIndex; KI-37: comprobación del PNG escrito',
  applyMaterialPreset: 'KI-24: sin escena no rehace pliegues',
  refreshArtwork: 'H-03 (generación, liberación) y H-05 (documento)',
  createGlbScene: 'H-06: escala en la fábrica',
  buildExportSceneMeshes: 'KI-02, H-06 y H-07',
  buildGLBBlobFromCurrentView: 'H-06: generador y asset.extras',
  createActions: 'H-03: funciones privadas nuevas',
  createController: 'H-05: identidad del documento',
  bindEvents: 'H-05: comprobación puntual antes de construir',
  createGlbBuilder: 'H-06: generador y asset.extras',
};
// Funciones nuevas de la línea de producto (nombre → módulo).
export const D0_FUNCIONES_NUEVAS = {
  buildChildrenOfMap: 'fold/folding.js', faceNormal: 'export/glb-scene.js', fallbackNormal: 'export/glb-scene.js',
  artFailure: 'app/actions.js', loadSideTexture: 'app/actions.js', disposeTextures: 'app/actions.js', texturesOf: 'app/actions.js', replaceArtState: 'app/actions.js', current: 'app/actions.js',
  buildFromExtraction: 'ui/controller.js', withDocIdentity: 'host/doc-identity.js', unwrapDocIdentity: 'host/doc-identity.js', sameDocument: 'host/doc-identity.js',
};
export const D0_MODULOS_NUEVOS = ['host/doc-identity.js'];
export const D0_IMPORTS_NUEVOS = { 'app/actions.js': ['../host/doc-identity.js'], 'ui/controller.js': ['../host/doc-identity.js'] };
// Sustitución textual exacta de H-02 en el script de arte (la prueba exige texto = baseline con ESTA sustitución y ninguna otra).
export const D0_ARTE_H02 = {
  antes: 'var prev=doc.artboards.getActiveArtboardIndex(); doc.artboards.setActiveArtboardIndex(idx); var out=exportActiveArtboardToPNG(label); doc.artboards.setActiveArtboardIndex(prev); return out; }',
  despues: 'var prev=doc.artboards.getActiveArtboardIndex(); doc.artboards.setActiveArtboardIndex(idx); try{ return exportActiveArtboardToPNG(label); } finally { doc.artboards.setActiveArtboardIndex(prev); } }',
};
// Sustituciones textuales de KI-37 en el script de arte, además de H-02 (aplicadas EN ORDEN sobre el texto de F1): comprobación del PNG escrito, contexto del
// mensaje y error para el usuario. La prueba exige texto = baseline con ESTAS sustituciones y ninguna otra.
export const D0_ARTE_KI37 = [
  ['  function exportActiveArtboardToPNG(label){ var idx=', '  function exportFailure(label,source,detail){ var err=new Error("No se pudo exportar el artwork "+(label==="front"?"frontal":"trasero")+" ("+source+"). "+detail+" Verifique la carpeta temporal y vuelva a intentarlo."); err.tessUsuario=true; return err; }\n  function exportActiveArtboardToPNG(label,source){ var idx='],
  ['doc.exportFile(file,ExportType.PNG24,opt); return {path:file.fsName,', 'try{ doc.exportFile(file,ExportType.PNG24,opt); }catch(exE){ throw exportFailure(label,source,"Illustrator informó: "+((exE&&exE.message)?exE.message:"error desconocido")+"."); } var written=new File(file.fsName); if(!written.exists) throw exportFailure(label,source,"Illustrator no creó el archivo PNG."); if(!(written.length>0)) throw exportFailure(label,source,"Illustrator creó el archivo PNG vacío."); return {path:file.fsName,'],
  ['function exportArtboardByIndex(idx,label){', 'function exportArtboardByIndex(idx,label,source){'],
  ['try{ return exportActiveArtboardToPNG(label); }', 'try{ return exportActiveArtboardToPNG(label,source); }'],
  ['result.front=exportArtboardByIndex(artboardFront.index,"front");', 'result.front=exportArtboardByIndex(artboardFront.index,"front",artboardFront.name);'],
  ['result.back=exportArtboardByIndex(artboardBack.index,"back");', 'result.back=exportArtboardByIndex(artboardBack.index,"back",artboardBack.name);'],
  ['result.front=exportActiveArtboardToPNG("front"); }', 'result.front=exportActiveArtboardToPNG("front",frontLayer.name); }'],
  ['result.back=exportActiveArtboardToPNG("back"); }', 'result.back=exportActiveArtboardToPNG("back",backLayer.name); }'],
  ['}catch(e){ return toJSON({error:"Artwork export failed: "', '}catch(e){ if(e&&e.tessUsuario) return toJSON({error:e.message,usuario:true}); return toJSON({error:"Artwork export failed: "'],
];
// Script de arte esperado en la línea de producto a partir del de F1. Cada sustitución debe aplicar EXACTAMENTE una vez.
export function arteD0(baseline) { let t = baseline; for (const [a, b] of [[D0_ARTE_H02.antes, D0_ARTE_H02.despues], ...D0_ARTE_KI37]) { const n = t.split(a).length - 1; if (n !== 1) throw new Error(`D-0: se esperaba 1 aparición de «${a.slice(0, 60)}», hay ${n}`); t = t.replace(a, () => b); } return t; }
export const cambiadasEn = (nombres) => Object.keys(D0_FUNCIONES_CAMBIADAS).filter((n) => nombres.includes(n)).sort();
// Líneas de src/main.js que cambian en la línea de producto: [texto de F1, texto actual] (cableado de buildChildrenOfMap para KI-24 y H-03).
export const D0_MAIN_SUSTITUCIONES = [
 [
  "    var { applyFolding } = createFolding(S, { makePanelLabelSprite, refreshPanelMaterials, rebuildCreaseVisuals });",
  "    var { applyFolding, buildChildrenOfMap } = createFolding(S, { makePanelLabelSprite, refreshPanelMaterials, rebuildCreaseVisuals });"
 ],
 [
  "    var { refreshArtwork, exportPNG, exportGLB } = createActions(S, { log, setStatus, ensureCep, setArtStatus, loadTextureFromPath, applyArtworkToScene, disposeCurrentArtTextures, buildGLBBlobFromCurrentView }); /* A9.2: acciones (app/actions.js); el manejador de «Export GLB» sigue aquí */",
  "    var { refreshArtwork, exportPNG, exportGLB } = createActions(S, { log, setStatus, ensureCep, setArtStatus, loadTextureFromPath, applyArtworkToScene, rebuildCreaseVisuals, buildChildrenOfMap, buildGLBBlobFromCurrentView }); /* A9.2: acciones (app/actions.js); el manejador de «Export GLB» sigue aquí. 3.0.1-dev: H-03 */"
 ],
 [
  "    var { applyMaterialPreset, resetValidationUI, validateGeometry, render2D, bindEvents } = createController(S, { threeView, testBtn, extractBtn, previewBtn, continueBtn, debugToggle, outputArea, validationStatus, problemsList, canvas2d, ctx2d, backBtn, export3dBtn, exportGlbBtn, debugDetails, thicknessInput, applyThicknessBtn, materialPresetSelect, refreshArtBtn, modeFoldBtn, modeBaseBtn, tabButtons, setStatus, log, clearLog, geometryEngine, getMaterialPreset, refreshPanelMaterials, init3D, fitCamera3D, applyArtworkToScene, rebuildCreaseVisuals, build3DFromPanels, syncMaterialPresetUI, setInteractionMode, showImport, show3D, setDebugVisible, setActiveTab, syncMaterialInputs, buildFoldUI, refreshArtwork, exportPNG, exportGLB }); /* A9.5: sesión del troquel y eventos (ui/controller.js); lastData y problems son privados de la fábrica; bindEvents() se llama una vez, tras ensureCep */",
  "    var { applyMaterialPreset, resetValidationUI, validateGeometry, render2D, bindEvents } = createController(S, { threeView, testBtn, extractBtn, previewBtn, continueBtn, debugToggle, outputArea, validationStatus, problemsList, canvas2d, ctx2d, backBtn, export3dBtn, exportGlbBtn, debugDetails, thicknessInput, applyThicknessBtn, materialPresetSelect, refreshArtBtn, modeFoldBtn, modeBaseBtn, tabButtons, setStatus, log, clearLog, geometryEngine, getMaterialPreset, refreshPanelMaterials, init3D, fitCamera3D, applyArtworkToScene, rebuildCreaseVisuals, buildChildrenOfMap, build3DFromPanels, syncMaterialPresetUI, setInteractionMode, showImport, show3D, setDebugVisible, setActiveTab, syncMaterialInputs, buildFoldUI, refreshArtwork, exportPNG, exportGLB }); /* A9.5: sesión del troquel y eventos (ui/controller.js); lastData y problems son privados de la fábrica; bindEvents() se llama una vez, tras ensureCep */"
 ]
];
// main.js con las sustituciones de D-0 deshechas (cada una debe aparecer EXACTAMENTE una vez): las pruebas de residuo de F1 comparan esto.
export function mainSinD0(texto) { for (const [antes, ahora] of D0_MAIN_SUSTITUCIONES) { const n = texto.split(ahora).length - 1; if (n !== 1) throw new Error(`D-0: se esperaba 1 aparición de una línea de main.js, hay ${n}`); texto = texto.replace(ahora, () => antes); } return texto; }
// Manejadores de bindEvents (H-05): los dos que cambian (por su primera línea); los otros 13, idénticos. Ningún bloque de manejador nuevo
// (buildFromExtraction es una función declarada, ver D0_FUNCIONES_NUEVAS; handlerBlocks no la cuenta como manejador).
export const D0_MANEJADORES = { cambiados: ["extractBtn.addEventListener('click',function(){", "continueBtn.addEventListener('click', function(){"], nuevos: [] };
export const primeraLinea = (t) => t.split('\n').map((l) => l.trim()).filter(Boolean)[0];
