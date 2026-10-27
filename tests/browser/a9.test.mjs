// A9.0a — Caracterización de la interfaz y de la orquestación ANTES de separar main.js (docs/fase1/A9_PROPUESTA.md §8.1, §16.2; docs/fase1/A9_HANDOFF.md §3).
// Baseline · panel · bundle (y, en H1, el bundle de referencia de 3ea0d8a): todo lo observable debe ser IDÉNTICO entre los objetivos.
//  H1 inventario de escuchas (elemento, tipo, opciones, número y orden; sin CEP y con «UI mismatch», ninguna de UI) · H2 historial de mensajes y de estado visible ·
//  H3 estado del DOM tras el arranque (normal, sin CEP, con un elemento requerido ausente) · H4 DOM dinámico (#fold-panel, #problems-list) y píxeles de la vista 2D ·
//  H5 Shift+clic y Alt+clic en el PRIMER clic tras el 3D, resaltado tras plegar y registro SIN «Pick error» · H6 teclado · soak de UI (con SOAK=1).
// El golden (tests/golden/ui-a9.golden.json) se genera SOLO desde el baseline (UPDATE_GOLDEN_A9=1) y lo fija tests/golden/a9.pins.json; no incluye hashes de píxeles ni de texto.
// LÍMITE: Chrome headless, no CEP (Chromium 99); el puente CEP está simulado (shim.js de setup_harness.py).
import test, { before, after } from 'node:test'; import assert from 'node:assert/strict'; import fs from 'node:fs'; import path from 'node:path'; import crypto from 'node:crypto'; import { execFileSync } from 'node:child_process';
import { prepare, FIXTURE_FILES } from './harness.mjs'; import { ROOT, FIXTURES } from '../lib/fixtures.mjs'; import { build } from '../../tools/build/build.mjs';
import { A9_REF, INIT, PAGE, UI_LISTENERS } from '../lib/a9.mjs';

const OUT = path.join(ROOT, 'tests/results/latest'); fs.mkdirSync(OUT, { recursive: true });
const save = (name, data) => fs.writeFileSync(path.join(OUT, name + '.json'), JSON.stringify(data, null, 1));
const GOLD = path.join(ROOT, 'tests/golden/ui-a9.golden.json'); const PINS = path.join(ROOT, 'tests/golden/a9.pins.json'); const UPDATE = !!process.env.UPDATE_GOLDEN_A9; const SOAK = !!process.env.SOAK;
const names = { base: 'baseline', fix: 'panel', dist: 'bundle', ref: 'referencia 3ea0d8a' }; const TG = ['base', 'fix', 'dist'];
const PROBLEMAS = JSON.stringify(FIXTURES['crease-corta-0.6'].build()); // 2 problemas «Crease endpoint unconnected» (el fixture versionado no se toca: se inyecta en la página)
let H;
before(async () => {
  H = await prepare({ initScript: INIT });
  // objetivo extra para H1: el bundle construido desde el src/ de 3ea0d8a (compara el TEXTO de cada manejador con el bundle actual: mismo impresor de esbuild)
  const src = path.join(H.dir, '_ref-src'); fs.mkdirSync(src); execFileSync('/bin/sh', ['-c', `git -C "${ROOT}" archive ${A9_REF} src | tar -x -C "${src}"`]);
  await build({ entry: path.join(src, 'src/main.js'), out: path.join(H.dir, '_ref') });
  execFileSync('python3', [ROOT + '/tools/baseline/setup_harness.py', path.join(H.dir, '_ref'), path.join(ROOT, FIXTURE_FILES.caja), path.join(H.dir, 'ref-caja')], { stdio: 'pipe' });
});
after(async () => { await H?.close(); process.exit(process.exitCode ?? 0); });
const ev = (code, opts) => H.browser.eval(code, opts);
async function open(t, q = '') { await H.browser.goto(`${H.url}/${t}-caja/index.html${q}`); await ev(`new Promise((r) => setTimeout(r, 200))`); await ev(PAGE); }
const errs = (e0) => H.browser.errors.slice(e0).map((e) => String(e).split('\n')[0].replace(/^Uncaught /, ''));
const R = { H1: {}, H2: {}, H3: {}, H4: {}, H5: {}, H6: {}, soak: {} }; const TXT = {};
const sameAsBase = (h, strip = (x) => x) => { assert.ok(R[h].base && R[h].dist, `${h}: faltan baseline o bundle`); for (const t of Object.keys(R[h])) if (t !== 'base') assert.deepEqual(strip(R[h][t]), strip(R[h].base), `${h}: ${names[t]} ≠ baseline`); };

// ───────────────────────── H1: inventario de escuchas ─────────────────────────
const H1FLOW = `(async () => { const { $, fire, settle, take } = A9; const inv = {}, txt = {}; const snap = (k) => { inv[k] = A9.listeners(); txt[k] = A9.handlerTexts(); };
  snap('arranque'); await A9.extract(); snap('extraer'); await A9.cont(); snap('construir');
  const sel = document.querySelector('#fold-panel select'); sel.value = String(sel.options.length - 1); fire(sel, 'change'); await settle(); snap('baseSelect');
  inv.shiftObjetivo = await A9.shiftPanel(0); snap('baseShift');
  $('thickness-input').value = '0.8'; $('apply-thickness-btn').click(); await settle(); snap('espesor');
  const mp = $('material-preset'); mp.value = 'kraft'; fire(mp, 'change'); await settle(); snap('preset');
  $('back-btn').click(); await settle(); snap('atras'); await A9.cont(); snap('reconstruir'); take(); return { inv, txt }; })()`;
for (const t of [...TG, 'ref']) test(`A9 · H1 · ${names[t]}: escuchas tras arranque, extraer, 3D, base (select y Shift+clic), espesor, preset, Back y 3D otra vez; sin CEP y con «UI mismatch»`, async () => {
  const e0 = H.browser.errors.length; await open(t); const r = await ev(H1FLOW);
  await open(t, '?nocep=1'); r.inv.sinCep = await ev('A9.listeners()'); r.txt.sinCep = await ev('A9.handlerTexts()');
  await open(t, '?mismatch=thickness-input'); r.inv.uiMismatch = await ev('A9.listeners()'); r.txt.uiMismatch = await ev('A9.handlerTexts()');
  r.inv.errores = errs(e0); R.H1[t] = r.inv; TXT[t] = r.txt; save(`a9-h1-${t}`, r.inv);
});
test('A9 · H1 · baseline, panel, bundle y referencia: mismo inventario (elemento, tipo, opciones, número y orden)', () => { sameAsBase('H1'); });
test('A9 · H1 · las 15 escuchas de main.js se registran UNA vez y en el orden de hoy; sin CEP y con «UI mismatch», ninguna', () => {
  const b = R.H1.dist; assert.ok(b, 'falta el bundle');
  for (const k of ['arranque', 'extraer', 'construir', 'baseSelect', 'baseShift', 'espesor', 'preset', 'atras', 'reconstruir']) {
    const ui = b[k].activos.filter((a) => UI_LISTENERS.includes(a)); assert.deepEqual(ui, UI_LISTENERS, `${k}: escuchas de UI`); assert.equal(b[k].duplicados, 0, `${k}: registros duplicados`); }
  for (const k of ['sinCep', 'uiMismatch']) assert.deepEqual(b[k].activos.filter((a) => UI_LISTENERS.includes(a)), [], `${k}: no debe registrar escuchas de UI`);
  assert.equal(b.arranque.persistentes, b.extraer.persistentes, 'extraer no añade escuchas persistentes');
  for (const k of ['baseSelect', 'baseShift', 'espesor', 'preset']) assert.equal(b[k].persistentes, b.construir.persistentes, `${k}: escuchas persistentes constantes`);
  assert.deepEqual(b.errores, []);
});
test('A9 · H1 · texto de cada manejador: bundle actual = bundle de 3ea0d8a (mismo orden)', () => {
  assert.ok(TXT.ref && TXT.dist, 'faltan referencia o bundle'); for (const k of Object.keys(TXT.ref)) assert.deepEqual(TXT.dist[k], TXT.ref[k], `${k}: texto de algún manejador distinto`);
});

// ───────────────────────── H2: historial de mensajes ─────────────────────────
const WAIT_EXTRACT = `await A9.extract();`;
const H2CASES = {
  normal: `const { $, fire, settle, take } = A9; const o = {}; o.arranque = take(); ${WAIT_EXTRACT} o.extraer = take(); $('preview-btn').click(); await settle(); o.preview = take();
    await A9.cont(); o.continuar = take(); const sel = document.querySelector('#fold-panel select'); sel.value = String(sel.options.length - 1); fire(sel, 'change'); await settle(); o.base = take();
    $('thickness-input').value = '0.8'; $('apply-thickness-btn').click(); await settle(); o.espesor = take(); const mp = $('material-preset'); mp.value = 'kraft'; fire(mp, 'change'); await settle(); o.preset = take();
    $('back-btn').click(); await settle(); o.atras = take(); return o;`,
  problemas: `const { $, settle, take } = A9; const o = {}; take(); window.__FIXTURE__ = ${PROBLEMAS}; ${WAIT_EXTRACT} o.extraer = take(); o.lista = [...$('problems-list').children].map((li) => li.textContent);
    $('problems-list').children[1].onclick(); await settle(); o.clicProblema = take(); $('preview-btn').click(); await settle(); o.preview = take(); await A9.cont(); o.continuar = take(); return o;`,
  'sin-datos': `const { $, settle, waitFor, take } = A9; const o = {}; take(); $('preview-btn').click(); await settle(); o.preview = take(); $('continue-3d-btn').click(); await settle(); o.continuar = take();
    $('refresh-art-btn').click(); await settle(); o.arte = take(); $('export-glb-btn').click(); await waitFor(() => /GLB export failed/.test($('status-area').textContent), 'GLB antes de 3D'); o.glb = take(); return o;`,
  espesor: `const { $, settle, take } = A9; const o = {}; take(); const th = $('thickness-input'); th.value = '1.2'; $('apply-thickness-btn').click(); await settle(); o.antesDe3d = take();
    await A9.build(); take(); for (const v of ['0', '-1', 'abc', '50', '0.05']) { th.value = v; $('apply-thickness-btn').click(); await settle(); o['v' + v] = take(); } return o;`,
  'ki24-preset-antes-de-3d': `const { $, fire, settle, take } = A9; const o = {}; take(); const mp = $('material-preset'); mp.value = 'kraft'; fire(mp, 'change'); await settle(); o.preset = take(); return o;`,
  'pestanas-depuracion': `const { $, fire, settle, take } = A9; const o = {}; take(); await A9.build(); take(); for (const k of ['artwork', 'creases', 'debug', 'material']) { $('tab-btn-' + k).click(); await settle(); o[k] = [take(), A9.state().pestanas, A9.state().paneles]; }
    const d = $('debug-toggle'); d.checked = true; fire(d, 'change'); await settle(); o.depuracionOn = take(); d.checked = false; fire(d, 'change'); await settle(); o.depuracionOff = take(); return o;`,
  'ui-mismatch': `const o = {}; o.arranque = A9.take(); return o;`,
  'sin-cep': `const { $, settle, take } = A9; const o = {}; o.arranque = take(); $('test-btn').click(); $('extract-btn').click(); $('preview-btn').click(); await settle(); o.clics = take(); return o;`,
};
const H2Q = { 'ui-mismatch': '?mismatch=thickness-input', 'sin-cep': '?nocep=1' };
for (const t of TG) test(`A9 · H2 · ${names[t]}: historial de mensajes y estado visible en ${Object.keys(H2CASES).length} flujos (normales y de error)`, async () => {
  const out = {}; for (const [name, code] of Object.entries(H2CASES)) { await open(t, H2Q[name] || ''); const e0 = H.browser.errors.length; out[name] = await ev(`(async () => { ${code} })()`); out[name].errores = errs(e0); }
  R.H2[t] = out; save(`a9-h2-${t}`, out);
});
test('A9 · H2 · baseline, panel y bundle: mismo historial en todos los flujos', () => { sameAsBase('H2'); });
test('A9 · H2 · comportamientos documentados (incluidos los defectos que se preservan)', () => {
  const b = R.H2.base; const last = (arr, re) => arr.filter((l) => re.test(l)).at(-1);
  assert.ok(b.normal.extraer.includes('#status-area Extraction complete')); assert.deepEqual(b.normal.preview, ['#preview-canvas.display block', '#status-area 2D preview updated']);
  assert.equal(last(b.normal.continuar, /^#status-area /), '#status-area 3D ready · thickness=0.3mm', 'Continue: el arte no se espera (refreshArtwork sin await)');
  assert.ok(b.normal.continuar.indexOf('#status-area 3D ready · thickness=0.3mm') < b.normal.continuar.indexOf('#art-status No Front/Back or Tiro/Retiro art detected.'), 'orden: estado 3D antes del resultado del arte');
  assert.deepEqual(b.problemas.lista, ['P1: Crease endpoint unconnected (0.6mm)', 'P2: Crease endpoint unconnected (0.6mm)']); assert.ok(b.problemas.extraer.includes('#validation-status ⚠️ 2 potential problem(s)'));
  assert.deepEqual(b['sin-datos'].preview, ['#status-area Nothing to preview. Extract first.']); assert.deepEqual(b['sin-datos'].continuar, [], 'Continue deshabilitado: sin mensaje');
  assert.deepEqual(b['sin-datos'].arte, ['#art-status Build 3D first, then refresh art.', '#art-source-pill No art']); assert.equal(last(b['sin-datos'].glb, /^#status-area /), '#status-area GLB export failed: Build 3D first');
  for (const v of ['v0', 'v-1', 'vabc']) assert.equal(last(b.espesor[v], /^#status-area /), '#status-area Thickness must be greater than 0', v);
  assert.deepEqual(b.espesor.antesDe3d, ['#material-pill White board', '#status-area Thickness updated. Build 3D to apply it.']); assert.equal(last(b.espesor.v50, /^#status-area /), '#status-area Thickness applied: 20.0mm');
  assert.deepEqual(b['ki24-preset-antes-de-3d'].errores, ['ReferenceError: buildChildrenOfMap is not defined'], 'KI-24 se preserva'); assert.deepEqual(b['ki24-preset-antes-de-3d'].preset, ['#material-pill Kraft board']);
  assert.deepEqual(b['ui-mismatch'].arranque, ['— DOMContentLoaded', '#status-area UI mismatch - missing elements']);
  assert.ok(b['sin-cep'].arranque.includes('#error-msg.display block') && b['sin-cep'].arranque.includes('#status-area CEP bridge not found.')); assert.deepEqual(b['sin-cep'].clics, [], 'botones deshabilitados sin CEP');
  for (const [n, c] of Object.entries(b)) if (n !== 'ki24-preset-antes-de-3d') assert.deepEqual(c.errores, [], n);
});

// ───────────────────────── H3: estado tras el arranque ─────────────────────────
const H3BOOTS = { normal: '', sinCep: '?nocep=1', faltaEspesor: '?mismatch=thickness-input', faltaLienzo2d: '?mismatch=preview-canvas' };
for (const t of TG) test(`A9 · H3 · ${names[t]}: estado del DOM tras DOMContentLoaded (normal, sin CEP y con un elemento requerido ausente)`, async () => {
  const out = {}; for (const [k, q] of Object.entries(H3BOOTS)) { const e0 = H.browser.errors.length; await open(t, q); out[k] = await ev(`({ ...A9.state(), historial: A9.take(), escuchas: A9.listeners().activos.length })`); out[k].errores = errs(e0); }
  R.H3[t] = out; save(`a9-h3-${t}`, out);
});
test('A9 · H3 · baseline, panel y bundle: mismo estado en los 4 arranques', () => { sameAsBase('H3'); });
test('A9 · H3 · arranques documentados', () => {
  const b = R.H3.base;
  assert.deepEqual(b.normal.vistas, ['block', 'none']); assert.equal(b.normal.errorMsg, 'none'); assert.equal(b.normal.estado, 'Ready'); assert.deepEqual(b.normal.deshabilitados, [false, false, false, true, false, false, false, false, false]);
  assert.deepEqual(b.normal.material, ['white', 'White board']); assert.equal(b.normal.espesor, '0.25'); assert.deepEqual(b.normal.validacion, ['Waiting for extraction...', 'check-status']);
  assert.deepEqual(b.normal.pestanas.map((p) => p[1]), [true, false, false, false]); assert.deepEqual(b.normal.botonesModo, [false, false]); assert.equal(b.normal.salida, 'none');
  assert.equal(b.normal.modo[0], 'Crease selection');
  assert.equal(b.sinCep.estado, 'CEP bridge not found.'); assert.equal(b.sinCep.errorMsg, 'block'); assert.deepEqual(b.sinCep.deshabilitados, [true, true, true, true, true, true, false, false, false]);
  assert.deepEqual(b.sinCep.vistas, ['', 'none'], 'sin CEP no se llega a showImport (solo queda el estilo en línea de index.html)');
  for (const k of ['faltaEspesor', 'faltaLienzo2d']) { assert.equal(b[k].estado, 'UI mismatch - missing elements', k); assert.equal(b[k].errorMsg, 'none', k); assert.deepEqual(b[k].vistas, ['', 'none'], k); assert.deepEqual(b[k].historial, ['— DOMContentLoaded', '#status-area UI mismatch - missing elements'], k); }
  for (const [k, v] of Object.entries(b)) assert.deepEqual(v.errores, [], k);
});

// ───────────────────────── H4: DOM dinámico y vista 2D ─────────────────────────
const H4A = `(async () => { const { $, fire, settle, ser, canvasHash } = A9; const o = {}; const snap = async (k) => { o[k] = { fold: ser($('fold-panel')), nFold: document.querySelectorAll('#fold-panel').length, problemas: ser($('problems-list')) }; };
  await A9.extract(); o.extraer2d = await canvasHash(); await snap('extraer'); await A9.cont(); await snap('construir');
  const sel = () => document.querySelector('#fold-panel select'); sel().value = String(sel().options.length - 1); fire(sel(), 'change'); await settle(); await snap('base');
  const rows = () => [...document.querySelectorAll('#fold-panel details.all-creases > div:last-child > div')]; const all = () => document.querySelector('#fold-panel details.all-creases input[type=range]');
  const s2 = rows()[2].querySelector('input'); s2.value = '45'; fire(s2, 'input'); await settle(); await snap('deslizador');
  all().value = '60'; fire(all(), 'input'); await settle(); await snap('todas60');
  [...document.querySelectorAll('#fold-panel button')].find((b) => /Reset Flat/.test(b.textContent)).click(); await settle(); await snap('reset');
  rows()[3].click(); await settle(); await snap('fila3');
  const top = () => document.querySelectorAll('#fold-panel > div')[2].querySelectorAll('input'); top()[0].value = '30'; fire(top()[0], 'input'); await settle(); await snap('seleccionadaDeslizador');
  top()[1].value = '-20'; fire(top()[1], 'change'); await settle(); await snap('seleccionadaNumero');
  $('thickness-input').value = '0.8'; $('apply-thickness-btn').click(); await settle(); await snap('espesor');
  rows()[1].click(); await settle(); await snap('filaTrasReconstruir');
  const mp = $('material-preset'); mp.value = 'kraft'; fire(mp, 'change'); await settle(); await snap('preset'); return o; })()`;
const H4B = `(async () => { const { $, settle, ser, canvasHash } = A9; const o = {}; window.__FIXTURE__ = ${PROBLEMAS}; await A9.extract();
  o.problemas = ser($('problems-list')); o.validacion = [$('validation-status').textContent, $('validation-status').className]; o.sinResaltado = await canvasHash();
  $('problems-list').children[1].onclick(); await settle(); o.resaltadoP2 = await canvasHash(); $('problems-list').children[0].onclick(); await settle(); o.resaltadoP1 = await canvasHash();
  $('preview-btn').click(); await settle(); o.preview = await canvasHash(); return o; })()`;
for (const t of TG) test(`A9 · H4 · ${names[t]}: #fold-panel y #problems-list serializados tras cada acción; píxeles de la vista 2D con y sin resaltado`, async () => {
  const e0 = H.browser.errors.length; await open(t); const a = await ev(H4A); await open(t); const b = await ev(H4B); R.H4[t] = { caja: a, problemas: b, errores: errs(e0) }; save(`a9-h4-${t}`, R.H4[t]);
});
test('A9 · H4 · baseline, panel y bundle: mismo DOM dinámico y mismos píxeles 2D', () => { sameAsBase('H4'); });
test('A9 · H4 · invariantes: un solo #fold-panel; el resaltado de un problema cambia los píxeles y Preview lo quita', () => {
  const b = R.H4.base; for (const [k, v] of Object.entries(b.caja)) if (v && v.nFold !== undefined) assert.equal(v.nFold, k === 'extraer' ? 0 : 1, k);
  assert.notEqual(b.problemas.resaltadoP2, b.problemas.sinResaltado); assert.notEqual(b.problemas.resaltadoP1, b.problemas.resaltadoP2); assert.equal(b.problemas.preview, b.problemas.sinResaltado);
  assert.equal(b.problemas.problemas.filter((l) => /\{onclick\}$/.test(l)).length, 2, 'cada problema lleva su onclick'); assert.deepEqual(b.errores, []);
});

// ───────────────────────── H5: Shift+clic y Alt+clic en el primer clic tras el 3D ─────────────────────────
const H5S = `(async () => { const { $, settle, take } = A9; const o = {}; await A9.build(); take(); const antes = __dbg.baseIndex;
  const idx = await A9.shiftPanel(0); o.shift = { objetivo: idx, antes, base: __dbg.baseIndex, select: document.querySelector('#fold-panel select').value, historial: take(), pestana: $('tab-btn-material').classList.contains('active') };
  const t2 = A9.panelTarget(1); await A9.clickAt(t2.p); o.sinModificador = { base: __dbg.baseIndex, historial: take() }; o.log = A9.logText(); return o; })()`;
const H5A = `(async () => { const { $, settle, take } = A9; const o = {}; await A9.build(); take();
  const e = await A9.altCrease(2); o.alt = { objetivo: e, ...A9.crease(), historial: take(), pestana: $('tab-btn-creases').classList.contains('active') };
  const all = document.querySelector('#fold-panel details.all-creases input[type=range]'); all.value = '30'; A9.fire(all, 'input'); await settle(); o.plegado = { ...A9.crease(), historial: take() };
  const e2 = await A9.altCrease(4); o.alt2 = { objetivo: e2, ...A9.crease(), historial: take() }; o.log = A9.logText(); return o; })()`;
for (const t of TG) test(`A9 · H5 · ${names[t]}: Shift+clic y Alt+clic como PRIMER clic tras el 3D; resaltado tras plegar; registro sin «Pick error»`, async () => {
  const e0 = H.browser.errors.length; await open(t); const s = await ev(H5S); await open(t); const a = await ev(H5A); R.H5[t] = { shift: s, alt: a, errores: errs(e0) }; save(`a9-h5-${t}`, R.H5[t]);
});
test('A9 · H5 · baseline, panel y bundle: mismos efectos y mismo historial', () => { sameAsBase('H5'); });
test('A9 · H5 · efectos observables: un solo cambio de estado por clic, resaltado #ffd166 tras plegar y NINGÚN «Pick error» en ningún objetivo', () => {
  for (const t of Object.keys(R.H5)) { const { shift: s, alt: a, errores } = R.H5[t]; const st = (h) => h.filter((l) => l.startsWith('#status-area '));
    assert.doesNotMatch(s.log + a.log, /Pick error/, `${t}: un fallo de selección quedó tragado por el try/catch del visor`); assert.deepEqual(errores, [], t);
    assert.notEqual(s.shift.objetivo, s.shift.antes); assert.equal(s.shift.base, s.shift.objetivo, `${t}: Shift+clic no cambió la base`); assert.equal(s.shift.select, String(s.shift.objetivo));
    assert.equal(st(s.shift.historial).filter((l) => /Base set to/.test(l)).length, 1); assert.match(st(s.shift.historial).at(-1), new RegExp(`^#status-area Base set to P${s.shift.objetivo} `)); assert.equal(s.shift.pestana, true);
    assert.equal(s.sinModificador.base, s.shift.base, 'un clic sin modificador no cambia la base'); assert.deepEqual(st(s.sinModificador.historial), []);
    // Alt+clic: el visor elige la crease más cercana a la cámara dentro de un umbral de 40 (no necesariamente la del punto clicado); se fija lo que hace el baseline
    assert.notEqual(a.alt.seleccionada, 0, `${t}: Alt+clic no cambió la selección (0 tras construir)`); assert.equal(st(a.alt.historial).length, 1); assert.match(st(a.alt.historial)[0], new RegExp(`^#status-area Crease C${a.alt.seleccionada} selected`)); assert.equal(a.alt.pestana, true);
    for (const k of ['alt', 'plegado', 'alt2']) { const c = a[k]; for (const [edge, hex, op] of c.visuales) assert.deepEqual([hex, op], edge === c.seleccionada ? ['ffd166', 1] : ['ff4444', 0.98], `${t}/${k}: resaltado de C${edge}`);
      c.filas.forEach((css, i) => assert.equal(/rgba\(255, 209, 102, 0\.1\)/.test(css), i === c.seleccionada, `${t}/${k}: fila ${i}`)); }
    assert.notEqual(a.alt2.seleccionada, a.alt.seleccionada); assert.match(st(a.alt2.historial)[0], new RegExp(`^#status-area Crease C${a.alt2.seleccionada} selected`)); }
});

// ───────────────────────── H6: teclado ─────────────────────────
const H6F = `(async () => { const { $, settle, take } = A9; const o = {}; take(); const key = async (el, k) => { const prevented = !el.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true })); await settle(); return { prevented, historial: take() }; };
  o.importacion = await key(document, 'Escape'); await A9.build(); take(); o.vista3d = await key(document, 'Escape'); o.otraTecla = await key(document, 'a');
  $('thickness-input').focus(); o.enInput = await key($('thickness-input'), 'Escape'); $('material-preset').focus(); o.enSelect = await key($('material-preset'), 'Escape');
  $('back-btn').click(); await settle(); take(); o.trasBack = await key(document, 'Escape'); $('output-json').style.display = 'block'; take(); o.enTextarea = await key($('output-json'), 'Escape'); return o; })()`;
for (const t of TG) test(`A9 · H6 · ${names[t]}: Escape en 3D, en la importación, con el foco en un input, un select y un textarea`, async () => {
  const e0 = H.browser.errors.length; await open(t); R.H6[t] = await ev(H6F); R.H6[t].errores = errs(e0); save(`a9-h6-${t}`, R.H6[t]);
});
test('A9 · H6 · baseline, panel y bundle idénticos; Escape solo actúa con la vista 3D visible y fuera de campos de texto', () => {
  sameAsBase('H6'); const b = R.H6.base; const st = (x) => x.historial.filter((l) => l.startsWith('#status-area '));
  assert.equal(b.vista3d.prevented, true); assert.deepEqual(st(b.vista3d), ['#status-area Crease selection mode enabled']);
  for (const k of ['importacion', 'otraTecla', 'enInput', 'trasBack', 'enTextarea']) { assert.equal(b[k].prevented, false, k); assert.deepEqual(b[k].historial, [], k); }
  assert.equal(b.enSelect.prevented, true, 'un <select> no está excluido (rareza preservada)'); assert.deepEqual(b.errores, []);
});

// ───────────────────────── Soak de UI (solo con SOAK=1) ─────────────────────────
const SOAKF = (n) => `(async () => { const { $, fire, settle } = A9; await A9.build(); const D = __dbg; const gl = $('preview-3d').getContext('webgl2') || $('preview-3d').getContext('webgl');
  if (!gl.__a9) { const c = (gl.__a9 = { tex: 0, buf: 0, vao: 0, prog: 0 }); const w = (cr, de, k) => { if (!gl[cr] || !gl[de]) return; const oc = gl[cr].bind(gl), od = gl[de].bind(gl); gl[cr] = function () { c[k]++; return oc.apply(null, arguments); }; gl[de] = function (x) { if (x) c[k]--; return od(x); }; };
    w('createTexture', 'deleteTexture', 'tex'); w('createBuffer', 'deleteBuffer', 'buf'); w('createVertexArray', 'deleteVertexArray', 'vao'); w('createProgram', 'deleteProgram', 'prog'); }
  const out = []; for (let i = 0; i < ${n}; i++) {
    $('thickness-input').value = i % 2 ? '0.25' : '0.5'; $('apply-thickness-btn').click(); await settle();
    const mp = $('material-preset'); mp.value = i % 2 ? 'white' : 'kraft'; fire(mp, 'change'); await settle();
    const sel = document.querySelector('#fold-panel select'); sel.value = String(i % sel.options.length); fire(sel, 'change'); await settle();
    const shift = await A9.shiftPanel(i % 2); const alt = await A9.altCrease(i % 2 ? 3 : 0);
    await A9.sleep(60); await settle(); const L = A9.listeners();
    out.push({ escuchasPersistentes: L.persistentes, escuchasActivas: L.activos.length, duplicados: L.duplicados, foldPanels: document.querySelectorAll('#fold-panel').length, nodos: document.getElementsByTagName('*').length,
      gpu: { ...gl.__a9 }, opciones: sel.options.length, base: D.baseIndex, shift, alt, seleccionada: D.selectedEdge, estado: $('status-area').textContent, pickError: /Pick error/.test(A9.logText()) }); }
  return out; })()`;
if (SOAK) {
  for (const t of TG) test(`A9 · soak de UI · ${names[t]}: 25 ciclos de espesor, preset, base (select y Shift+clic) y Alt+clic`, async () => {
    const e0 = H.browser.errors.length; await open(t); const r = await ev(SOAKF(25), { timeout: 180000 }); /* ≈ 10 s sin mutar */ R.soak[t] = { ciclos: r, errores: errs(e0) }; save(`a9-soak-${t}`, R.soak[t]);
    const c = r; assert.equal(c.length, 25); assert.deepEqual(R.soak[t].errores, []);
    for (let i = 0; i < c.length; i++) { assert.equal(c[i].foldPanels, 1, `ciclo ${i + 1}: #fold-panel`); assert.equal(c[i].duplicados, 0); assert.equal(c[i].pickError, false, `ciclo ${i + 1}: Pick error`);
      assert.equal(c[i].escuchasPersistentes, c[0].escuchasPersistentes, `ciclo ${i + 1}: escuchas en elementos persistentes`); assert.equal(c[i].escuchasActivas, c[0].escuchasActivas, `ciclo ${i + 1}: escuchas activas`);
      assert.equal(c[i].nodos, c[0].nodos, `ciclo ${i + 1}: nodos del DOM`); assert.equal(c[i].base, c[i].shift, `ciclo ${i + 1}: Shift+clic`); assert.match(c[i].estado, new RegExp(`^Crease C${c[i].seleccionada} selected`), `ciclo ${i + 1}: Alt+clic (se elige la crease más cercana a la cámara dentro del umbral)`); }
    if (t === 'base') assert.ok(c.at(-1).gpu.tex > c[1].gpu.tex, 'control positivo: el baseline (KI-01) crece');
    else { // el estado de UI del ciclo i se repite en el ciclo i + P (P = mcm(2, nº de paneles)): mismo estado ⇒ mismos contadores (Δ = 0); buffers, VAO y programas, constantes desde el ciclo 2
      const gcd = (a, b) => (b ? gcd(b, a % b) : a); const P = 2 * c[0].opciones / gcd(2, c[0].opciones); assert.ok(P + 2 < c.length, 'el soak debe cubrir un periodo completo');
      for (let i = 1; i + P < c.length; i++) assert.deepEqual(c[i + P].gpu, c[i].gpu, `ciclo ${i + P + 1} frente al ${i + 1} (mismo estado): GPU Δ≠0`);
      for (let i = 2; i < c.length; i++) for (const k of ['buf', 'vao', 'prog']) assert.equal(c[i].gpu[k], c[1].gpu[k], `ciclo ${i + 1}: ${k} Δ≠0`);
      assert.ok(Math.max(...c.slice(1).map((x) => x.gpu.tex)) <= Math.max(...c.slice(1, P + 1).map((x) => x.gpu.tex)), 'texturas: sin crecimiento tras el primer periodo'); }
  });
  test('A9 · soak de UI · baseline, panel y bundle: mismos mensajes, bases, creases, escuchas y nodos en los 25 ciclos (la GPU del baseline difiere solo por KI-01)', () => {
    sameAsBase('soak', (s) => ({ ...s, ciclos: s.ciclos.map(({ gpu, ...rest }) => rest) })); assert.deepEqual(R.soak.dist.ciclos.map((x) => x.gpu), R.soak.fix.ciclos.map((x) => x.gpu));
  });
}

// ───────────────────────── Golden (solo desde el baseline) ─────────────────────────
test('A9 · golden: el baseline coincide con el golden fijado (o se regenera desde el baseline con UPDATE_GOLDEN_A9=1)', () => {
  for (const h of ['H1', 'H2', 'H3', 'H4', 'H5', 'H6']) assert.ok(R[h].base, `${h}: falta el baseline`);
  const noPx = (h4) => ({ ...h4, caja: { ...h4.caja, extraer2d: undefined }, problemas: { ...h4.problemas, sinResaltado: undefined, resaltadoP1: undefined, resaltadoP2: undefined, preview: undefined } }); // los píxeles dependen de la versión de Chrome
  const cur = JSON.parse(JSON.stringify({ H1: R.H1.base, H2: R.H2.base, H3: R.H3.base, H4: noPx(R.H4.base), H5: R.H5.base, H6: R.H6.base }));
  if (UPDATE) { fs.writeFileSync(GOLD, JSON.stringify({ _fuente: 'reference/legacy-baseline vía Chrome headless (A9.0a); sin hashes de píxeles', ...cur }, null, 1)); return; }
  const pins = JSON.parse(fs.readFileSync(PINS, 'utf8')); assert.equal(crypto.createHash('sha256').update(fs.readFileSync(GOLD)).digest('hex'), pins.archivos['tests/golden/ui-a9.golden.json'], 'golden alterado');
  const { _fuente, ...g } = JSON.parse(fs.readFileSync(GOLD, 'utf8')); assert.deepEqual(cur, g);
});
