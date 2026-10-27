// A9 (T2 de A9) — Equivalencia de texto respecto del src/ del commit 3ea0d8a (A8 validada en el CEP real; docs/fase1/A9_PROPUESTA.md §8.2, A9_HANDOFF.md §4).
//  · Toda función (a cualquier sangría) de los módulos y de main.js de 3ea0d8a (fuera de core/) existe en el src/ actual con el MISMO texto salvo la sangría, «export» y el prefijo «S.»;
//    las únicas funciones añadidas son las previstas en este paso (fábricas nuevas de ui/ y app/).
//  · Las 29 funciones de la clausura de main.js de 3ea0d8a existen EXACTAMENTE una vez fuera de core/.
//  · Los 15 manejadores de primer nivel son idénticos como bloques de texto salvo la sangría y conservan su orden (en el Bloque 1 siguen en main.js).
//  · Las líneas sueltas de main.js cambian EXACTAMENTE como se prevé en este paso (EXPECTED_RESIDUAL).
import test from 'node:test'; import assert from 'node:assert/strict'; import fs from 'node:fs'; import path from 'node:path';
import { SRC, srcFiles, functionsAnyIndent, norm, residual, multisetDiff } from '../lib/a7.mjs'; import { refTree, refMain, handlerBlocks, CLOSURE_3EA0D8A } from '../lib/a9.mjs';

// Estado esperado en ESTE paso (se actualiza en cada paso aprobado; igualdad exacta).
const NEW_FUNCTIONS = ['createViews', 'createActions']; // A9.1 · A9.2
const HANDLERS_FILE = 'main.js'; // Bloque 1: los 15 manejadores siguen en main.js (bindEvents llega en A9.5, no autorizado)
const EXPECTED_RESIDUAL = {"quitadas":["import { buildArtworkExportScript } from './host/art.js';","import { hasCep, evalScript, evalScriptJSON, pathToFileURL } from './bridge/cep.js';","import { saveBlobWithDialog } from './bridge/fs.js';","var interactionMode = 'fold';"],"anadidas":["import { evalScript, pathToFileURL } from './bridge/cep.js';","import { createViews } from './ui/views.js';","import { createActions } from './app/actions.js';","var { syncMaterialPresetUI, setInteractionMode, ensureCep, showImport, show3D, setDebugVisible, setActiveTab, syncMaterialInputs, setArtStatus } = createViews(S, { importView, threeView, outputArea, tabButtons, tabPanels, thicknessInput, materialPresetSelect, materialPill, artStatus, artSourcePill, modeFoldBtn, modeBaseBtn, interactionModePill, interactionStatus, viewportBadge, viewport3d, errorMsg, testBtn, extractBtn, previewBtn, continueBtn, backBtn, export3dBtn, setStatus, getMaterialPreset }); /* A9.1: presentación (ui/views.js); interactionMode es privado de la fábrica */","var { refreshArtwork, exportPNG, exportGLB } = createActions(S, { log, setStatus, ensureCep, setArtStatus, loadTextureFromPath, applyArtworkToScene, disposeCurrentArtTextures, buildGLBBlobFromCurrentView }); /* A9.2: acciones (app/actions.js); el manejador de «Export GLB» sigue aquí */"]}; // A9.2: revisado a mano (salen los imports de host/art.js y bridge/fs.js y evalScriptJSON del de bridge/cep.js; entran el import de app/actions.js y la línea de composición de createActions)

const ref = refTree(); const refMainText = refMain();
const key = (f) => f.name + '\n' + norm(f.text);
const refFns = ref.flatMap((t) => functionsAnyIndent(t.text)); const files = srcFiles().filter((f) => !f.startsWith('core/'));
const srcFns = files.flatMap((f) => functionsAnyIndent(fs.readFileSync(path.join(SRC, f), 'utf8')).map((x) => ({ ...x, file: f })));
const mainText = fs.readFileSync(path.join(SRC, 'main.js'), 'utf8');
const blockKey = (b) => b.text.split('\n').map((l) => l.trim()).filter(Boolean).join('\n');

test('la referencia 3ea0d8a: main.js + 21 módulos fuera de core/, las 29 funciones de la clausura y los 15 manejadores', () => {
  assert.equal(ref.length, 22, 'árbol de referencia: main.js + 21 módulos fuera de core/');
  assert.deepEqual(functionsAnyIndent(refMainText).filter((f) => f.indent === 4).map((f) => f.name), CLOSURE_3EA0D8A);
  assert.equal(handlerBlocks(refMainText).length, 15);
});
test('cada función de la referencia existe en src/ con el mismo texto (salvo sangría, export y S.); no se pierde ni se altera ninguna', () => {
  const d = multisetDiff(refFns.map(key), srcFns.map(key)); assert.deepEqual(d.quitadas.map((k) => k.split('\n')[0]), [], 'funciones quitadas o alteradas');
});
test('funciones añadidas: solo las previstas en este paso', () => {
  const d = multisetDiff(refFns.map(key), srcFns.map(key)); assert.deepEqual(d.anadidas.map((k) => k.split('\n')[0]).sort(), [...NEW_FUNCTIONS].sort());
});
test('las 29 funciones de la clausura de 3ea0d8a están definidas EXACTAMENTE una vez fuera de core/', () => {
  for (const n of CLOSURE_3EA0D8A) { const k = srcFns.filter((x) => x.name === n).length; assert.equal(k, 1, `${n}: ${k} definiciones`); }
});
test('los 15 manejadores: mismo texto salvo la sangría y mismo orden', () => {
  const r = handlerBlocks(refMainText).map(blockKey); const where = fs.readFileSync(path.join(SRC, HANDLERS_FILE), 'utf8'); const c = handlerBlocks(where).map(blockKey);
  assert.equal(c.length, 15, `${HANDLERS_FILE}: ${c.length} manejadores`); c.forEach((b, i) => assert.equal(b, r[i], `manejador ${i + 1} (${r[i].split('\n')[0]}) cambió de texto u orden`));
  for (const f of files.filter((f) => f !== HANDLERS_FILE)) assert.equal(handlerBlocks(fs.readFileSync(path.join(SRC, f), 'utf8'), 2).filter((b) => r.includes(blockKey(b))).length, 0, `${f}: copia de un manejador`);
});
test('líneas sueltas de main.js frente a 3ea0d8a: solo los cambios previstos en este paso', () => {
  const d = multisetDiff(residual(refMainText), residual(mainText)); assert.deepEqual(d, EXPECTED_RESIDUAL);
});
