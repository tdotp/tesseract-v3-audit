// A8 (T2 de A8) — Equivalencia de texto respecto del src/ del commit a322d7a (A7 validada en el CEP real; docs/fase1/A8_PROPUESTA.md §7).
//  · Toda función (a cualquier sangría) de los módulos y de main.js de a322d7a existe en el src/ actual con el MISMO texto salvo la sangría, «export» y el prefijo «S.»;
//    las únicas funciones añadidas son las previstas en este paso (fábricas de src/export/).
//  · Las 8 funciones de exportación existen EXACTAMENTE una vez fuera de core/. Desde A9.2 exportPNG y exportGLB viven (una sola vez) en app/actions.js; el manejador del botón sigue en main.js (D-A8-2).
//  · Las líneas sueltas de main.js cambian solo como se prevé en este paso (imports, cableado, declaraciones que salen).
import test from 'node:test'; import assert from 'node:assert/strict'; import fs from 'node:fs'; import path from 'node:path';
import { SRC, srcFiles, functionsAnyIndent, norm, residual, multisetDiff } from '../lib/a7.mjs'; import { EXPORT_FUNCTIONS, refTree, refMain } from '../lib/a8.mjs';

// Estado esperado en ESTE paso (se actualiza en cada paso aprobado; igualdad exacta).
const NEW_FUNCTIONS = ['createGlbBuilder', 'createGlbImage', 'createGlbScene', 'createViews', 'createActions', 'createFoldControls']; // A8.4: fábricas nuevas; las 8 funciones movidas cambian de archivo, no son nuevas · A9.1: createViews · A9.2: createActions · A9.3: createFoldControls
const EXPECTED_RESIDUAL = {"quitadas":["import { buildArtworkExportScript } from './host/art.js';","import { hasCep, evalScript, evalScriptJSON, pathToFileURL } from './bridge/cep.js';","import { saveBlobWithDialog } from './bridge/fs.js';","var currentBaseSelect = null;","var currentCreaseRows = [];","var currentCreaseSliders = [];","var selectedCreaseLabelEl = null;","var selectedCreaseSliderEl = null;","var selectedCreaseNumberEl = null;","var interactionMode = 'fold';","var { disposeCreaseVisuals, projectInsetDir, buildRibbonStripGeometry, makeBridgeRowsForEdge, addFoldBridgeVisual, rebuildCreaseVisuals } = createCreaseVisuals(S, { getFoldHingeHex, signedDisplayAngle, updateSelectedCreaseVisuals });"],"anadidas":["import { evalScript, pathToFileURL } from './bridge/cep.js';","import { createGlbBuilder } from './export/glb-builder.js';","import { createGlbImage } from './export/glb-image.js';","import { createGlbScene } from './export/glb-scene.js';","import { createViews } from './ui/views.js';","import { createFoldControls } from './ui/fold-controls.js';","import { createActions } from './app/actions.js';","var { disposeCreaseVisuals, projectInsetDir, buildRibbonStripGeometry, makeBridgeRowsForEdge, addFoldBridgeVisual, rebuildCreaseVisuals } = createCreaseVisuals(S, { getFoldHingeHex, signedDisplayAngle, updateSelectedCreaseVisuals: function(){ return updateSelectedCreaseVisuals(); } }); /* A9.3: enlace tardío (D-A9-3); la función la asigna createFoldControls más abajo */","var { textureToImageBytes } = createGlbImage({ log }); /* A8.2: codificación de texturas para el GLB (bytesFromDataURL queda interna) */","var { buildExportSceneMeshes } = createGlbScene(S); /* A8.3: recorrido de la escena para el GLB */","var { buildGLBBlobFromCurrentView } = createGlbBuilder({ buildExportSceneMeshes, textureToImageBytes }); /* A8.4: constructor del GLB */","var { syncMaterialPresetUI, setInteractionMode, ensureCep, showImport, show3D, setDebugVisible, setActiveTab, syncMaterialInputs, setArtStatus } = createViews(S, { importView, threeView, outputArea, tabButtons, tabPanels, thicknessInput, materialPresetSelect, materialPill, artStatus, artSourcePill, modeFoldBtn, modeBaseBtn, interactionModePill, interactionStatus, viewportBadge, viewport3d, errorMsg, testBtn, extractBtn, previewBtn, continueBtn, backBtn, export3dBtn, setStatus, getMaterialPreset }); /* A9.1: presentación (ui/views.js); interactionMode es privado de la fábrica */","var { updatePerCreaseRow, updateSelectedCreaseVisuals, syncSelectedCreaseUI, selectFoldEdge, applySelectedCreaseAngle, setBasePanel, buildFoldUI } = createFoldControls(S, { threeView, byId, geometryEngine, applyFolding, fitCamera3D, refreshPanelMaterials, signedDisplayAngle, internalAngleFromDisplay, setInteractionMode, setStatus }); /* A9.3: controles de plegado (ui/fold-controls.js); los 6 widgets del panel son privados de la fábrica */","var { refreshArtwork, exportPNG, exportGLB } = createActions(S, { log, setStatus, ensureCep, setArtStatus, loadTextureFromPath, applyArtworkToScene, disposeCurrentArtTextures, buildGLBBlobFromCurrentView }); /* A9.2: acciones (app/actions.js); el manejador de «Export GLB» sigue aquí */"]}; // A9.3: revisado a mano (salen las 6 declaraciones de widgets de plegado y la línea de createCreaseVisuals sin envoltorio; entran el import de ui/fold-controls.js, la línea de createCreaseVisuals con el envoltorio y la composición de createFoldControls)

const ref = refTree(); const refMainText = refMain();
const key = (f) => f.name + '\n' + norm(f.text);
const refFns = ref.flatMap((t) => functionsAnyIndent(t.text)); const files = srcFiles().filter((f) => !f.startsWith('core/'));
const srcFns = files.flatMap((f) => functionsAnyIndent(fs.readFileSync(path.join(SRC, f), 'utf8')).map((x) => ({ ...x, file: f })));
const mainText = fs.readFileSync(path.join(SRC, 'main.js'), 'utf8');

test('la referencia a322d7a tiene main.js y los módulos de A5–A7 (sin core/) y las 8 funciones de exportación en la clausura', () => {
  assert.equal(ref.length, 18, 'árbol de referencia: main.js + 17 módulos fuera de core/');
  const closure = functionsAnyIndent(refMainText).filter((f) => f.indent === 4).map((f) => f.name); for (const n of EXPORT_FUNCTIONS) assert.ok(closure.includes(n), n);
});
test('cada función de la referencia existe en src/ con el mismo texto (salvo sangría, export y S.); no se pierde ni se altera ninguna', () => {
  const d = multisetDiff(refFns.map(key), srcFns.map(key)); assert.deepEqual(d.quitadas.map((k) => k.split('\n')[0]), [], 'funciones quitadas o alteradas');
});
test('funciones añadidas: solo las previstas en este paso', () => {
  const d = multisetDiff(refFns.map(key), srcFns.map(key)); assert.deepEqual(d.anadidas.map((k) => k.split('\n')[0]).sort(), [...NEW_FUNCTIONS].sort());
});
test('las 8 funciones de exportación están definidas EXACTAMENTE una vez fuera de core/', () => {
  for (const n of EXPORT_FUNCTIONS) { const k = srcFns.filter((x) => x.name === n).length; assert.equal(k, 1, `${n}: ${k} definiciones`); }
});
test('exportPNG y exportGLB: una sola vez y en app/actions.js (A9.2, D-A9-9); el manejador de «Export GLB» sigue en main.js con su texto (D-A8-2)', () => {
  for (const n of ['exportPNG', 'exportGLB']) { const d = srcFns.filter((x) => x.name === n); assert.equal(d.length, 1, `${n}: ${d.length} definiciones`); assert.equal(d[0].file, 'app/actions.js', n); }
  assert.ok(!functionsAnyIndent(mainText).some((f) => f.name === 'exportPNG' || f.name === 'exportGLB'), 'main.js ya no las define');
  assert.match(mainText, /exportGlbBtn\.addEventListener\('click', async function\(\)\{\n\s+try\{\n\s+setStatus\('Exporting GLB…'\);\n\s+await exportGLB\(\);\n\s+setStatus\('GLB exported from current 3D pose'\);/);
  assert.match(fs.readFileSync(path.join(SRC, 'app/actions.js'), 'utf8'), /^import \{ saveBlobWithDialog \} from '\.\.\/bridge\/fs\.js';$/m);
});
test('líneas sueltas de main.js frente a a322d7a: solo los cambios previstos en este paso', () => {
  const d = multisetDiff(residual(refMainText), residual(mainText)); assert.deepEqual(d, EXPECTED_RESIDUAL);
});
