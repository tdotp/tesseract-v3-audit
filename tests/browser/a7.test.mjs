// A7.0a — Caracterización de la escena y de su ciclo de vida ANTES de separar estado, escena y plegado (docs/fase1/A7_PROPUESTA.md §6, §7.4, §9.1).
// Baseline · panel · bundle: inventario ORDENADO de la escena en 7 flujos (tipos, nombres, roles, renderOrder, nº de hijos; recursos distintos),
// userData de los paneles (índice, centro, vértices), invariantes de ciclo de vida L1–L3 y secuencia de mensajes de estado.
// El golden (tests/golden/scene-inventory.golden.json) se genera SOLO desde el baseline (UPDATE_GOLDEN_A7=1) y lo fija tests/golden/a7.pins.json.
// LÍMITE: Chrome headless, no CEP; el puente CEP está simulado.
import test, { before, after } from 'node:test'; import assert from 'node:assert/strict'; import fs from 'node:fs'; import path from 'node:path'; import crypto from 'node:crypto';
import { prepare, textOf, PAGE_HELPERS } from './harness.mjs'; import { ROOT } from '../lib/fixtures.mjs';

const OUT = path.join(ROOT, 'tests/results/latest'); fs.mkdirSync(OUT, { recursive: true });
const save = (name, data) => fs.writeFileSync(path.join(OUT, name + '.json'), JSON.stringify(data, null, 1));
const GOLD = path.join(ROOT, 'tests/golden/scene-inventory.golden.json'); const PINS = path.join(ROOT, 'tests/golden/a7.pins.json'); const UPDATE = !!process.env.UPDATE_GOLDEN_A7;
let H; const names = { base: 'baseline', fix: 'panel', dist: 'bundle' }; const TG = ['base', 'fix', 'dist'];
before(async () => { H = await prepare(); });
after(async () => { await H?.close(); process.exit(process.exitCode ?? 0); });
const evalIn = (code) => H.browser.eval(code);
async function load(dir) { await H.open(dir); await evalIn(PAGE_HELPERS); await evalIn(textOf('tools/baseline/harness_art.js')); assert.deepEqual(H.browser.errors, [], 'errores JS al cargar ' + dir); }

// Inventario de la escena: recorrido en el MISMO orden que usa buildExportSceneMeshes (scene.traverse). Solo lectura de __dbg.
const INV = `window.A7INV = () => { const D = __dbg; const S = D.scene; S.updateMatrixWorld(true); const r4 = (x) => { const v = Math.round(x * 1e4) / 1e4; return Object.is(v, -0) ? 0 : v; };
  const geos = new Set(), mats = new Set(), texs = new Set(), nodes = [], byRole = {}, byType = {};
  S.traverse((o) => { const role = (o.userData && o.userData.role) || ''; nodes.push([o.type, o.name || '', role, o.renderOrder, o.children.length].join('|'));
    byType[o.type] = (byType[o.type] || 0) + 1; if (role) byRole[role] = (byRole[role] || 0) + 1; if (o.geometry) geos.add(o.geometry.uuid);
    for (const m of (o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : [])) { mats.add(m.uuid); if (m.map) texs.add(m.map.uuid); } });
  const panels = T.panelMeshes().map((m) => ({ idx: m.userData.panelIndex, center: [r4(m.userData.center.x), r4(m.userData.center.y)], nVert: m.userData.originalVertices.length,
    sumVert: r4(m.userData.originalVertices.reduce((s, v) => s + v.x * 1.5 + v.y, 0)), overlays: (m.userData.artOverlays || []).length, parentType: m.parent ? m.parent.type : null }));
  return { top: S.children.map((c) => c.type + ':' + (c.name || '')), nodes, byType, byRole, distintos: { geometrias: geos.size, materiales: mats.size, texturas: texs.size }, panels,
    listas: { creaseVisuals: D.creaseVisuals.length, arbol: D.tree.length, paneles: D.panels } }; };`;
// Mensajes de estado: cada asignación de #status-area (setStatus) queda registrada en orden.
const STATUS = `(() => { window.__st = []; new MutationObserver((recs) => { for (const r of recs) for (const n of r.addedNodes) window.__st.push(n.data !== undefined ? n.data : n.textContent); }).observe(document.getElementById('status-area'), { childList: true }); })()`;
const FLOWS = `(async () => { const { sleep, raf2, $, fire, setAll } = T; const out = {}; const take = () => { const s = window.__st; window.__st = []; return s; };
  ${'$'}('extract-btn').click(); await sleep(250); out.extraer = { estados: take() };
  ${'$'}('continue-3d-btn').click(); await sleep(700); await raf2(); out.construir = { ...A7INV(), estados: take() };
  const sel = document.querySelector('#fold-panel select'); sel.value = String(sel.options.length - 1); fire(sel, 'change'); await sleep(200); await raf2(); out.base = { ...A7INV(), estados: take() };
  ${'$'}('thickness-input').value = '0.8'; ${'$'}('apply-thickness-btn').click(); await sleep(200); await raf2(); out.espesor = { ...A7INV(), estados: take() };
  const mp = ${'$'}('material-preset'); mp.value = 'kraft'; fire(mp, 'change'); await sleep(200); await raf2(); out.preset = { ...A7INV(), estados: take() };
  await setAll(60); await sleep(100); out.plegado = { ...A7INV(), estados: take() };
  await harnessLoadArt(); await sleep(300); await raf2(); await setAll(30); await sleep(100); out.arte = { ...A7INV(), estados: take() };
  return out; })()`;

// Invariantes de ciclo de vida (§6.2): L1 las texturas de arte solo las libera disposeCurrentArtTextures · L2 cada applyFolding libera los
// visuales de pliegue del tick anterior ANTES de crear los nuevos · L3 una reconstrucción libera y desengancha la malla anterior y vacía las listas.
const LIFE = `(async () => { const { sleep, raf2, $, setAll, panelMeshes } = T; const D = __dbg; const out = {}; const disposed = (o) => { o.__d = false; o.addEventListener('dispose', () => { o.__d = true; }); return o; };
  await T.build(); await harnessLoadArt(); await sleep(300); await raf2();
  const tf = disposed(D.art.front.texture), tb = disposed(D.art.back.texture); const uf = tf.uuid;
  $('thickness-input').value = '1.2'; $('apply-thickness-btn').click(); await sleep(250); await raf2();
  const ovMaps = panelMeshes().flatMap((m) => m.userData.artOverlays.map((ov) => ov.material.map));
  out.L1 = { frontLiberada: tf.__d, backLiberada: tb.__d, mismaTextura: D.art.front.texture === tf && tf.uuid === uf, overlaysConLaMisma: ovMaps.length > 0 && ovMaps.every((t) => t === tf || t === tb) };
  await setAll(30); await sleep(80); const old = D.creaseVisuals.map((cv) => ({ vis: cv.visible, pick: cv.pick, vg: disposed(cv.visible.geometry), pg: disposed(cv.pick.geometry), vm: disposed(cv.visible.material), pm: disposed(cv.pick.material) }));
  const oldGroup = D.bridges; const oldBridges = []; if (oldGroup) oldGroup.traverse((o) => { if (o.geometry) oldBridges.push({ o, g: disposed(o.geometry), m: disposed(o.material) }); });
  await setAll(31); await sleep(80); let picksEnEscena = 0; D.scene.traverse((o) => { if (o.userData && o.userData.role === 'pickCrease') picksEnEscena++; });
  out.L2 = { visualesAnteriores: old.length, todosLiberados: old.every((x) => x.vg.__d && x.pg.__d && x.vm.__d && x.pm.__d), todosDesenganchados: old.every((x) => !x.vis.parent && !x.pick.parent),
    puentesAnteriores: oldBridges.length, puentesLiberados: oldBridges.every((x) => x.g.__d && x.m.__d), grupoPuentesDesenganchado: !!oldGroup && !oldGroup.parent && D.bridges !== oldGroup, picksEnEscena, arbol: D.tree.length, listaVisuales: D.creaseVisuals.length };
  const oldMeshes = panelMeshes().map((m) => ({ m, g: disposed(m.geometry), mat: disposed(m.material), eg: disposed(m.userData.edgeLines.geometry), ov: m.userData.artOverlays.map((o) => disposed(o.geometry)) }));
  const oldVis = D.creaseVisuals.map((cv) => disposed(cv.visible.geometry));
  $('thickness-input').value = '0.25'; $('apply-thickness-btn').click(); await sleep(250); await raf2();
  let enEscena = 0; D.scene.traverse((o) => { if (oldMeshes.some((x) => x.m === o)) enEscena++; });
  out.L3 = { mallasAnteriores: oldMeshes.length, liberadas: oldMeshes.every((x) => x.g.__d && x.mat.__d && x.eg.__d && x.ov.every((g) => g.__d)), anterioresEnEscena: enEscena,
    visualesAnterioresLiberados: oldVis.every((g) => g.__d), listaVisuales: D.creaseVisuals.length, arbol: D.tree.length, paneles: D.panels, texturaArteViva: !tf.__d && D.art.front.texture === tf };
  return out; })()`;

const inv = {}, life = {};
for (const fx of ['caja', 'ill']) for (const t of TG) test(`A7 · inventario de escena · ${names[t]} (${fx}): 7 flujos, orden de nodos, recursos, userData y estados`, async () => {
  await load(`${t}-${fx}`); await evalIn(INV); await evalIn(STATUS); const r = inv[`${t}-${fx}`] = JSON.parse(JSON.stringify(await evalIn(FLOWS))); save(`a7-inventario-${names[t]}-${fx}`, r);
  assert.ok(r.construir.nodes.length > 50, 'inventario vacío'); assert.deepEqual(r.construir.top, ['AmbientLight:', 'DirectionalLight:', 'HemisphereLight:', 'GridHelper:', 'AxesHelper:', 'Group:']);
  assert.deepEqual(r.plegado.top.slice(-2), ['Group:', 'Group:fold-bridges'], 'tras plegar: foldRoot y luego fold-bridges (orden del GLB, invariante G1)');
  assert.deepEqual(H.browser.errors, []);
});
for (const fx of ['caja', 'ill']) test(`A7 · inventario de escena · ${fx}: baseline, panel y bundle idénticos (orden incluido)`, () => {
  assert.deepEqual(inv[`fix-${fx}`], inv[`base-${fx}`]); assert.deepEqual(inv[`dist-${fx}`], inv[`base-${fx}`]);
});
test('A7 · inventario de escena: el baseline coincide con el golden fijado (o se regenera desde el baseline con UPDATE_GOLDEN_A7=1)', () => {
  const cur = { caja: inv['base-caja'], ill: inv['base-ill'] };
  if (UPDATE) { fs.writeFileSync(GOLD, JSON.stringify({ _fuente: 'reference/legacy-baseline vía Chrome headless (A7.0a)', ...cur }, null, 1)); return; }
  const pins = JSON.parse(fs.readFileSync(PINS, 'utf8')); assert.equal(crypto.createHash('sha256').update(fs.readFileSync(GOLD)).digest('hex'), pins.archivos['tests/golden/scene-inventory.golden.json'], 'golden alterado');
  const { _fuente, ...g } = JSON.parse(fs.readFileSync(GOLD, 'utf8')); assert.deepEqual(cur, g);
});
for (const t of TG) test(`A7 · ciclo de vida L1–L3 · ${names[t]} (caja): arte compartido, visuales por tick y reconstrucción`, async () => {
  await load(`${t}-caja`); const r = life[t] = await evalIn(LIFE); save(`a7-ciclo-vida-${names[t]}`, r);
  assert.deepEqual(r.L1, { frontLiberada: false, backLiberada: false, mismaTextura: true, overlaysConLaMisma: true }, 'L1');
  assert.ok(r.L2.visualesAnteriores > 0 && r.L2.puentesAnteriores > 0, 'L2 sin visuales que comprobar'); assert.equal(r.L2.todosDesenganchados || t === 'base', true, 'L2 desenganche');
  assert.equal(r.L2.puentesLiberados, true, 'L2 puentes'); assert.equal(r.L2.grupoPuentesDesenganchado, true, 'L2 grupo de puentes'); assert.equal(r.L2.picksEnEscena, r.L2.arbol, 'L2: una caja de selección por arista del árbol'); assert.equal(r.L2.listaVisuales, r.L2.arbol);
  assert.equal(r.L3.anterioresEnEscena, 0, 'L3 desenganche'); assert.equal(r.L3.listaVisuales, r.L3.arbol); assert.equal(r.L3.texturaArteViva, true, 'L1 tras reconstruir');
  if (t === 'base') { assert.equal(r.L2.todosLiberados, false, 'control positivo: el baseline (KI-01) NO libera los visuales de pliegue'); assert.equal(r.L3.liberadas, false, 'control positivo: el baseline no libera las aristas'); }
  else { assert.equal(r.L2.todosLiberados, true, 'L2 liberación (A1)'); assert.equal(r.L3.liberadas, true, 'L3 liberación (A1)'); assert.equal(r.L3.visualesAnterioresLiberados, true, 'L3 visuales (A1)'); }
  assert.deepEqual(H.browser.errors, []);
});
test('A7 · ciclo de vida: panel y bundle idénticos (el baseline difiere solo por KI-01)', () => { assert.deepEqual(life.dist, life.fix); });
