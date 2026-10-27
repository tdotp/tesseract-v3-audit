// A9 — Límites de src/ui/ y src/app/ (salvo app/state.js, que rige a7-limites) y de la raíz de composición (docs/fase1/A9_PROPUESTA.md §5.4, reglas 1–9),
// verificados sobre el texto y cargando cada módulo en Node. Cada regla se activa según el inventario del paso:
//  1 inventario y exports exactos · 2 sin THREE ni window · 3 document solo en las funciones previstas · 4 imports solo los previstos (nada hacia scene/, fold/, export/, core/, ui/, app/ ni main.js) ·
//  5 sin estado de módulo y fábricas sin efectos al crearse · 6 lastData y problems con una sola declaración y todos sus usos en el mismo archivo; los 6 widgets privados de plegado, también ·
//  7 identificadores libres: solo globales esperados (excepción única declarada: buildChildrenOfMap, KI-24) · 8 número exacto de envoltorios de enlace tardío en main.js ·
//  9 main.js conserva el ancla del arnés y __tessDebugView con su texto, y solo las funciones previstas en este paso.
import test from 'node:test'; import assert from 'node:assert/strict'; import fs from 'node:fs'; import path from 'node:path'; import { pathToFileURL } from 'node:url';
import { SRC, srcFiles, codeOnly, functionsAnyIndent } from '../lib/a7.mjs'; import { freeIdentifiers, KNOWN_GLOBALS } from '../lib/a8.mjs'; import { CLOSURE_3EA0D8A } from '../lib/a9.mjs';

// Estado esperado en ESTE paso (se actualiza en cada paso aprobado; igualdad exacta).
const INVENTORY = ['app/actions.js', 'ui/views.js']; // A9.2 (app/state.js queda fuera de este inventario: lo rige a7-limites)
const RULES = { // por módulo: { exports, imports, doc: funciones donde se permite document, free: identificadores libres admitidos además de KNOWN_GLOBALS }
  'ui/views.js': { exports: ['createViews'], imports: ['../bridge/cep.js'], doc: [], free: [] }, // A9.1
  'app/actions.js': { exports: ['createActions'], imports: ['../host/art.js', '../bridge/cep.js', '../bridge/fs.js'], doc: ['exportPNG'], free: [] } }; // A9.2: document SOLO en exportPNG (ajuste A)
const VIEWS = ['syncMaterialPresetUI', 'setInteractionMode', 'ensureCep', 'showImport', 'show3D', 'setDebugVisible', 'setActiveTab', 'syncMaterialInputs', 'setArtStatus']; // A9.1
const ACTIONS = ['refreshArtwork', 'exportPNG', 'exportGLB']; // A9.2
const MAIN_FUNCTIONS = CLOSURE_3EA0D8A.filter((n) => !VIEWS.includes(n) && !ACTIONS.includes(n)); // funciones de la clausura de main.js en este paso
const WRAPPERS = 0; // regla 8: envoltorios de enlace tardío en main.js (3 en el Bloque 2; ninguno en el Bloque 1)
const FOLD_WIDGETS = ['currentBaseSelect', 'currentCreaseRows', 'currentCreaseSliders', 'selectedCreaseLabelEl', 'selectedCreaseSliderEl', 'selectedCreaseNumberEl'];

const all = srcFiles().filter((f) => !f.startsWith('core/')); /* core/ tiene su propio problems (validateDieline) y lo rige a6-limites */ const files = all.filter((f) => /^(ui|app)\//.test(f) && f !== 'app/state.js'); const raw = (f) => fs.readFileSync(path.join(SRC, f), 'utf8');
const countIn = (text, word) => (codeOnly(text).match(new RegExp('(?<![\\w$.])' + word + '\\b', 'g')) || []).length;
const inFns = (f, names, word) => functionsAnyIndent(raw(f)).filter((x) => names.includes(x.name)).reduce((s, x) => s + countIn(x.text, word), 0);
const importsOf = (f) => [...raw(f).matchAll(/^import \{([^}]*)\} from '([^']+)';$/gm)].map((m) => m[2]);
const mainText = raw('main.js');

test('regla 1 · inventario exacto de ui/ y app/ (salvo state.js) en este paso y exports exactos', () => {
  assert.deepEqual(files, INVENTORY);
  for (const f of files) assert.deepEqual([...raw(f).matchAll(/^export (?:async )?(?:function|const|let|var) (\w+)/gm)].map((m) => m[1]).sort(), [...RULES[f].exports].sort(), f);
});
test('reglas 2 y 3 · sin THREE ni window; document solo dentro de las funciones previstas', () => {
  for (const f of files) { assert.equal(countIn(raw(f), 'THREE'), 0, `${f}: THREE`); assert.equal(countIn(raw(f), 'window'), 0, `${f}: window`);
    assert.equal(countIn(raw(f), 'document'), inFns(f, RULES[f].doc, 'document'), `${f}: document fuera de ${RULES[f].doc.join(', ') || '(ninguna)'}`); }
});
test('regla 4 · imports solo los previstos, solo con nombre; ninguno hacia scene/, fold/, export/, core/, ui/, app/ ni main.js', () => {
  for (const f of files) { const imps = importsOf(f); assert.deepEqual([...imps].sort(), [...RULES[f].imports].sort(), f); assert.doesNotMatch(raw(f), /^\s*import\s+(?!\{)/m, `${f}: solo imports con nombre`);
    for (const i of imps) assert.ok(/^\.\.\/(host|bridge|config)\//.test(i), `${f} importa ${i}`); }
});
test('regla 5 · sin estado de módulo; el cuerpo de cada fábrica solo desestructura deps, declara variables privadas con valor literal y funciones, y devuelve', () => {
  for (const f of files) { assert.deepEqual(codeOnly(raw(f)).split('\n').filter((l) => /^(var|let|const)\s/.test(l)), [], `${f}: estado de módulo`);
    const L = codeOnly(raw(f)).split('\n'); let inF = false;
    for (const l of L) { if (/^export function create\w+\(S, deps\)\{$/.test(l)) { inF = true; continue; } if (l === '}') { inF = false; continue; } if (!inF || !/^ {2}\S/.test(l)) continue;
      assert.match(l, /^ {2}(var \{[\w, ]+\} = deps;|var \w+ = (''|-?\d+(\.\d+)?|null|true|false|\[\]);|(async )?function \w+\(|return \{[\w, ]+\};|\})/, `${f}: sentencia con posible efecto al crear la fábrica: ${l.trim()}`); } }
});
test('regla 6 · lastData y problems: una sola declaración y todos sus usos en el mismo archivo; los 6 widgets privados de plegado, también', () => {
  for (const name of ['lastData', 'problems', ...FOLD_WIDGETS]) {
    const decl = all.filter((f) => new RegExp('\\bvar ' + name + '\\b').test(codeOnly(raw(f)))); assert.equal(decl.length, 1, `${name}: declarada en ${decl.join(', ') || 'ninguno'}`);
    const decls = (codeOnly(raw(decl[0])).match(new RegExp('\\bvar ' + name + '\\b', 'g')) || []).length; assert.equal(decls, 1, `${name}: ${decls} declaraciones en ${decl[0]}`);
    const uses = all.filter((f) => countIn(raw(f), name) > 0); assert.deepEqual(uses, decl, `${name}: usada fuera de ${decl[0]}`); }
});
test('regla 7 · identificadores libres: solo globales esperados y las excepciones declaradas', () => {
  for (const f of files) { const libres = freeIdentifiers(raw(f)).filter((n) => !KNOWN_GLOBALS.has(n) && !(RULES[f].free || []).includes(n)); assert.deepEqual(libres, [], `${f}: ${libres.join(', ')}`); }
});
test('regla 8 · envoltorios de enlace tardío en main.js: exactamente los previstos en este paso', () => {
  const w = codeOnly(mainText).match(/function\s*\((e)?\)\s*\{\s*return (pickPanelFromEvent|pickCreaseFromEvent|updateSelectedCreaseVisuals)\(\1?\);\s*\}/g) || []; assert.equal(w.length, WRAPPERS, w.join(' | '));
});
test('regla 9 · main.js conserva el ancla del arnés y __tessDebugView con su texto, y solo las funciones previstas', () => {
  assert.equal((mainText.match(/^ {4}function setStatus\(m\)\{ statusArea\.textContent = m; \}$/gm) || []).length, 1, 'ancla de setup_harness.py');
  assert.equal((mainText.match(/^ {4}function __tessDebugView\(\)\{ return \{get renderer\(\)\{return S\.renderer3d\},/gm) || []).length, 1, '__tessDebugView');
  assert.deepEqual(functionsAnyIndent(mainText).filter((f) => f.indent === 4).map((f) => f.name), MAIN_FUNCTIONS);
});
test('los módulos de ui/ y app/ se cargan en Node SIN window, document ni THREE', async () => {
  delete globalThis.window; delete globalThis.document; delete globalThis.THREE; for (const f of files) await assert.doesNotReject(import(pathToFileURL(path.join(SRC, f)).href), f);
});
