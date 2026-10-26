// A7 (T2 de A7) — Equivalencia de texto: cada función de primer nivel de la clausura del src/main.js de 2939dbc (A6 validada en el CEP real)
// existe EXACTAMENTE una vez en src/ (fuera de core/) y su texto es idéntico salvo la sangría y el prefijo «S.» de los 26 campos del estado
// (docs/fase1/A7_PROPUESTA.md §9.2). Las líneas sueltas de main.js (declaraciones, cableado, raíz de composición) cambian solo como se prevé en este paso.
import test from 'node:test'; import assert from 'node:assert/strict'; import fs from 'node:fs'; import path from 'node:path';
import { SRC, srcFiles, refMain, closureFunctions, functionsAnyIndent, norm, residual, multisetDiff } from '../lib/a7.mjs';

// Estado esperado en ESTE paso (se actualiza en cada paso aprobado; igualdad exacta).
const NEW_FUNCTIONS = ['__tessDebugView', 'createAppState']; // A7.1 // funciones nuevas permitidas fuera de core/ (fábricas, createAppState, __tessDebugView)
const EXPECTED_TEXT_CHANGES = {}; // nombre → motivo; ninguno previsto en A7
const EXPECTED_RESIDUAL = {"quitadas": ["var currentThicknessMm = DEFAULT_THICKNESS_MM;", "var currentMaterialPreset = 'white';", "var currentPanelData = null;", "var currentAdjEdges = null;", "var currentBasePanelIndex = 0;", "var currentArtState = null;", "var creasePickables = [];", "var creaseVisuals = [];", "var panelGroupMap = [];", "var selectedFoldEdgeIdx = -1;", "var panelLabelSprites = [];", "var foldSigns = [];", "var baseSelectionConfirmed = false;", "var renderer3d=null, scene3d=null, camera3d=null;", "var orbitState=null;", "var panelMeshes=[];", "var foldBridgeGroup=null;", "var foldData=null;", "var foldRoot=null;", "var foldAngles=[];", "var foldTree=[];", "var foldCenter={x:0,y:0};", "var raycaster3d = null;", "var pointer3d = null;"], "anadidas": ["import { createAppState } from './app/state.js';", "var S = createAppState(); /* A7.1: estado de dominio compartido (26 campos; docs/fase1/A7_PROPUESTA.md §4.1). Aquí quedan lastData, problems y los widgets del DOM */", "/* A7.1: vista de SOLO LECTURA del estado para el arnés de pruebas (tools/baseline/setup_harness.py la usa si existe). El producto no la llama ni la publica en window. */", "/* A7.1: renderer3d, scene3d, camera3d, orbitState, panelMeshes, foldBridgeGroup, foldData, foldRoot, foldAngles, foldTree, foldCenter, raycaster3d y pointer3d viven en S (src/app/state.js) */"]}; // A7.1: salen las 24 declaraciones del estado (26 campos) y entran el import, S y dos comentarios // multiconjunto de líneas sueltas de main.js frente a 2939dbc, ya normalizadas

const ref = refMain(); const refFns = closureFunctions(ref);
const files = srcFiles().filter((f) => !f.startsWith('core/')); const srcFns = files.flatMap((f) => functionsAnyIndent(fs.readFileSync(path.join(SRC, f), 'utf8')).map((x) => ({ ...x, file: f })));
const mainText = fs.readFileSync(path.join(SRC, 'main.js'), 'utf8');

test('la referencia 2939dbc tiene las 71 funciones de primer nivel de la clausura (mapa de A7_PROPUESTA §3)', () => { assert.equal(refFns.length, 71); });
test('cada función de la referencia está definida EXACTAMENTE una vez en src/ (fuera de core/)', () => {
  for (const f of refFns) { const n = srcFns.filter((x) => x.name === f.name).length; assert.equal(n, 1, `${f.name}: ${n} definiciones`); }
});
test('texto idéntico salvo sangría y prefijo S. (diferencias previstas: ninguna)', () => {
  for (const f of refFns) { if (EXPECTED_TEXT_CHANGES[f.name]) continue; const s = srcFns.find((x) => x.name === f.name); assert.equal(norm(s.text), norm(f.text), `${f.name} (${s.file}) cambió de texto`); }
});
test('funciones nuevas fuera de core/: solo las previstas en este paso', () => {
  const refNames = new Set(functionsAnyIndent(ref).map((f) => f.name)); const nuevas = [...new Set(srcFns.filter((x) => !refNames.has(x.name) && (x.indent <= 2 || (x.file === 'main.js' && x.indent === 4))).map((x) => x.name))].sort();
  // fuera de main.js los módulos de A5 (host/, bridge/, config/) ya existían en 2939dbc: se comparan aparte (a5-limites, host-scripts, bridge-*)
  const a5 = new Set(srcFiles().filter((f) => /^(host|bridge|config)\//.test(f)).flatMap((f) => functionsAnyIndent(fs.readFileSync(path.join(SRC, f), 'utf8')).map((x) => x.name)));
  assert.deepEqual(nuevas.filter((n) => !a5.has(n)), [...NEW_FUNCTIONS].sort());
});
test('líneas sueltas de main.js frente a 2939dbc: solo los cambios previstos en este paso', () => {
  const d = multisetDiff(residual(ref), residual(mainText)); assert.deepEqual(d, EXPECTED_RESIDUAL);
});
