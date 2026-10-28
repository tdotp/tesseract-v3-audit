// F2A-3 · I-4 — El bundle EXPERIMENTAL ejecutado en Chrome headless con la interfaz real (arnés de A1–A9: setup_harness.py, puente CEP
// simulado con el fixture) frente al bundle NORMAL construido en el mismo momento:
//   A. SOMBRA (predeterminado): flujo completo (3D, plegado a 60°, arte, GLB) idéntico al bundle normal: GLB byte a byte, log visible,
//      modelo, árbol y estado; la sombra anota sus comparaciones después; único global nuevo: el punto de control; sin almacenamiento.
//   B. ACTIVO: activación explícita (rechazada sin confirmación), visible en el log; Caja Botánica con 13 paneles = motor v1 en Node,
//      árbol para cada base elegida en la interfaz, plegado, arte y GLB válido.
//   C. cambio de documento, desactivación (los modelos conservan su motor), fallback atómico visible y reactivación.
//   D. modo congelado de depuración: flujo completo + espesor + preset sin ninguna escritura en los datos del motor.
//   E. no persistente: al recargar vuelve a sombra.  F. APIs reducidas a Chromium 99: mismos resultados que con APIs completas.
// LÍMITE: Chrome headless, no CEP 12 ni Chromium 99 auténtico (las APIs posteriores a la 99 se eliminan antes de cargar la página).
import test, { before, after } from 'node:test'; import assert from 'node:assert/strict'; import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { createHash } from 'node:crypto'; import { execFileSync } from 'node:child_process';
import { ROOT, gridDieline } from '../lib/fixtures.mjs'; import { serveDir, launchChrome } from '../browser/cdp.mjs'; import { PAGE_HELPERS, FIXTURE_FILES } from '../browser/harness.mjs';
import { summarize, parseGLB } from '../lib/glb.mjs'; import { JS_POST99 } from '../lib/chromium99.mjs';
import { build } from '../../tools/build/build.mjs'; import { construirExperimental } from '../../tools/build/build-experimental.mjs';
import { createLegacyEngine } from '../../src/core/engine.js'; import { createExperimentalEngine } from '../../experimental/integracion/motor-v1.js';
import { CONFIRMACION_ACTIVO } from '../../experimental/integracion/selector.js';

const REDUCE = `(() => { const del = (o, k) => { try { delete o[k]; } catch (e) {} }; const TA = Object.getPrototypeOf(Uint8Array.prototype);
  for (const k of ['toSorted', 'toReversed', 'toSpliced', 'with', 'group', 'groupBy']) { del(Array.prototype, k); del(TA, k); }
  del(Object, 'groupBy'); del(Map, 'groupBy'); del(Promise, 'withResolvers'); del(Promise, 'try'); del(Array, 'fromAsync'); del(String.prototype, 'isWellFormed'); del(String.prototype, 'toWellFormed');
  for (const k of ['union', 'intersection', 'difference', 'symmetricDifference', 'isSubsetOf', 'isSupersetOf', 'isDisjointFrom']) del(Set.prototype, k);
  del(globalThis, 'Iterator'); del(URL, 'canParse'); del(AbortSignal, 'any'); del(AbortSignal, 'timeout'); del(ArrayBuffer.prototype, 'transfer'); del(ArrayBuffer.prototype, 'transferToFixedLength');
  del(Element.prototype, 'checkVisibility'); del(document, 'startViewTransition'); del(JSON, 'rawJSON'); del(Response, 'json'); del(HTMLElement.prototype, 'showPopover'); del(Intl, 'DurationFormat'); del(globalThis, 'Float16Array'); del(globalThis, 'scheduler');
  window.__lowApi = { arr: 'toSorted' in Array.prototype, prom: 'withResolvers' in Promise, set: 'union' in Set.prototype, iter: typeof Iterator }; })()`;
const CAPTURE = `window.captureGLB = async () => { window.__glb = null; window.cep = { fs: { writeFile: (p, b) => { window.__glb = b; return { err: 0 }; } }, encoding: { Base64: 'Base64' } };
  const prev = window.__adobe_cep__.evalScript; window.__adobe_cep__.evalScript = (s, cb) => (s.indexOf('saveDialog') > -1 ? setTimeout(() => cb('/tmp/x.glb'), 0) : prev(s, cb)); T.$('export-glb-btn').click();
  for (let i = 0; i < 400 && !window.__glb; i++) await T.sleep(50); window.__adobe_cep__.evalScript = prev; return window.__glb; };`;
const ESTADO = `(() => ({ panelData: JSON.stringify(__dbg.panelData && __dbg.panelData.panels), creaseEdges: JSON.stringify(__dbg.panelData && __dbg.panelData.creaseEdges), arbol: JSON.stringify(__dbg.tree), adj: JSON.stringify(__dbg.adj),
  base: __dbg.baseIndex, mallas: T.panelMeshes().length, nFold: __dbg.nFold, log: T.$('log-area').textContent, status: T.$('status-area').textContent, experimental: !!(__dbg.panelData && __dbg.panelData.f2a2) }))()`;
const CTRL = 'window.__tessMotorExperimental';
const BASE_SELECT = (i) => `(async () => { const s = document.querySelector('#fold-panel select'); s.value = String(${i} < 0 ? s.options.length - 1 : ${i}); T.fire(s, 'change'); await T.sleep(120); await T.raf2(); return s.options.length; })()`;
const rd = (f) => JSON.parse(fs.readFileSync(path.join(ROOT, f), 'utf8')); const CAJA = rd(FIXTURE_FILES.caja);
const sha16 = (b) => createHash('sha256').update(b).digest('hex').slice(0, 16);

let dir, server, F, H; const R = {};
before(async () => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tess-f2a3-nav-')); await build({ out: path.join(dir, '_dist') }); await construirExperimental({ out: path.join(dir, '_exp') });
  for (const [t, src] of [['dist', '_dist'], ['exp', '_exp']]) execFileSync('python3', [ROOT + '/tools/baseline/setup_harness.py', path.join(dir, src), path.join(ROOT, FIXTURE_FILES.caja), path.join(dir, `${t}-caja`)], { stdio: 'pipe' });
  server = await serveDir(dir); F = await launchChrome(); H = await launchChrome(); await H.addInitScript(REDUCE);
});
after(async () => { await F?.close(); await H?.close(); await server?.close(); if (dir) fs.rmSync(dir, { recursive: true, force: true }); process.exit(process.exitCode ?? 0); });

async function abrir(B, t) { await B.goto(`${server.url}/${t}-caja/index.html`); await B.eval('new Promise((r) => setTimeout(r, 200))'); await B.eval(PAGE_HELPERS); await B.eval(fs.readFileSync(path.join(ROOT, 'tools/baseline/harness_art.js'), 'utf8')); await B.eval(CAPTURE); }
async function flujo(B, { base = null } = {}) { // 3D → plegado 60° → (base) → arte → plegado 60° → GLB
  await B.eval('T.build()'); await B.eval('T.setAll(60)'); if (base !== null) { await B.eval(BASE_SELECT(base)); await B.eval('T.setAll(60)'); } await B.eval('harnessLoadArt()'); await B.eval('T.setAll(60)');
  const b64 = await B.eval('captureGLB()'); assert.ok(b64 && b64.length > 1000, 'GLB exportado'); const buf = Buffer.from(b64, 'base64'); return { glb: sha16(buf), resumen: summarize(parseGLB(buf)), ...(await B.eval(ESTADO)) };
}
const globales = (B) => B.eval('Object.getOwnPropertyNames(window).sort()');
const motorNode = (eps = 0.05) => createExperimentalEngine({ validate: createLegacyEngine({ log: () => {} }).validate, eps });

test('A · SOMBRA (predeterminado): flujo completo idéntico al bundle normal (GLB byte a byte, log, modelo, árbol, estado); la sombra anota 11 frente a 13 paneles', async () => {
  const e0 = F.errors.length;
  await abrir(F, 'dist'); R.dist = await flujo(F, { base: -1 }); const gDist = await globales(F);
  await abrir(F, 'exp'); assert.equal(await F.eval(`${CTRL}.modo()`), 'sombra'); R.expSombra = await flujo(F, { base: -1 }); const gExp = await globales(F);
  for (const k of ['glb', 'panelData', 'creaseEdges', 'arbol', 'adj', 'base', 'mallas', 'nFold', 'log', 'status', 'experimental']) assert.deepEqual(R.expSombra[k], R.dist[k], k);
  assert.equal(R.dist.experimental, false); assert.equal(R.expSombra.mallas, 11); assert.deepEqual(F.errors.slice(e0), [], 'sin errores de página');
  await F.eval('new Promise((r) => setTimeout(r, 300))'); const reg = await F.eval(`${CTRL}.registro()`);
  const p = reg.find((x) => x.etapa === 'buildPanels' && x.comparacion); assert.deepEqual([p.comparacion.legacy.paneles, p.comparacion.experimental.paneles], [11, 13]);
  assert.ok(reg.some((x) => x.etapa === 'buildFoldTree' && x.comparacion), 'comparación del árbol'); assert.ok(reg.every((x) => !x.fallo), JSON.stringify(reg.filter((x) => x.fallo)));
  assert.deepEqual(gExp.filter((g) => !gDist.includes(g)), ['__tessMotorExperimental'], 'único global nuevo: el punto de control'); assert.deepEqual(gDist.filter((g) => !gExp.includes(g)), []);
  assert.deepEqual(await F.eval('[localStorage.length, sessionStorage.length]'), [0, 0], 'sin almacenamiento');
});

test('B · ACTIVO: activación explícita y visible; Caja Botánica con 13 paneles = motor v1 en Node; árbol de cada base elegida en la interfaz; plegado, arte y GLB', async () => {
  const e0 = F.errors.length; await abrir(F, 'exp');
  assert.equal(await F.eval(`${CTRL}.activar('si')`), false); assert.equal(await F.eval(`${CTRL}.activar()`), false); assert.equal(await F.eval(`${CTRL}.modo()`), 'sombra');
  assert.equal(await F.eval(`${CTRL}.activar('${CONFIRMACION_ACTIVO}')`), true); assert.equal(await F.eval(`${CTRL}.modo()`), 'activo');
  const visible = await F.eval("T.$('log-area').textContent"); assert.match(visible, /activación RECHAZADA/); assert.match(visible, /modo ACTIVO — los modelos NUEVOS los construye el motor experimental experimental-f2a2 \(ε=0\.05 mm\)/);
  const r = await flujo(F); R.expActivo = r; assert.equal(r.experimental, true); assert.equal(r.mallas, 13); assert.equal(r.nFold, 12); assert.equal(await F.eval(`${CTRL}.origenDelModelo(__dbg.panelData)`), 'experimental');
  assert.match(r.log, /^Motor de geometría: modo ACTIVO — esta construcción usa el motor experimental/m, 'visible en cada construcción (el log se limpia al construir)'); assert.match(r.log, /=== buildPanels \(experimental-f2a2, ε=0\.05 mm\) === panels=13/);
  const M = motorNode(); const m = M.buildPanels(structuredClone(CAJA)); const A = M.buildAdjacency(m.panels, m.creaseEdges);
  assert.equal(r.panelData, JSON.stringify(m.panels), 'modelo del navegador = motor v1 en Node'); assert.equal(r.creaseEdges, JSON.stringify(m.creaseEdges)); assert.equal(r.adj, JSON.stringify(A)); assert.equal(r.arbol, JSON.stringify(M.buildFoldTree(m.panels, A, r.base)));
  assert.equal(r.resumen.images, 2); assert.equal(r.resumen.generator, 'Tesseract Phase 7B'); assert.notEqual(r.glb, R.dist.glb, 'GLB distinto del legacy (13 paneles frente a 11: KI-22/KI-04 corregidos)');
  for (const b of [12, 5, 0]) { await F.eval(BASE_SELECT(b)); const s = await F.eval(ESTADO); assert.equal(s.base, b); assert.equal(s.arbol, JSON.stringify(M.buildFoldTree(m.panels, A, b)), 'base ' + b); assert.equal(s.nFold, 12); }
  assert.deepEqual(F.errors.slice(e0), []);
});

test('C · documento nuevo, desactivación (los modelos conservan su motor), fallback atómico visible y reactivación', async () => {
  const e0 = F.errors.length; const M = motorNode(); const L = createLegacyEngine({ log: () => {} }); const grid = gridDieline(3);
  await F.eval(`window.__FIXTURE__ = ${JSON.stringify(grid)}`); await F.eval('T.build()'); let s = await F.eval(ESTADO);
  assert.deepEqual([s.mallas, s.nFold, s.experimental], [9, 8, true]); const g = M.buildPanels(structuredClone(grid)); assert.equal(s.panelData, JSON.stringify(g.panels)); assert.ok(s.base >= 0 && s.base < 9);
  assert.equal(await F.eval(`${CTRL}.desactivar()`), true); assert.equal(await F.eval(`${CTRL}.modo()`), 'sombra'); await F.eval(BASE_SELECT(4)); s = await F.eval(ESTADO);
  assert.equal(s.arbol, JSON.stringify(M.buildFoldTree(g.panels, M.buildAdjacency(g.panels, g.creaseEdges), 4)), 'el modelo experimental sigue con el experimental tras desactivar'); assert.match(s.log, /modo SOMBRA/);
  await F.eval('T.build()'); s = await F.eval(ESTADO); assert.equal(s.experimental, false); assert.equal(await F.eval(`${CTRL}.origenDelModelo(__dbg.panelData)`), 'legacy');
  const lg = L.buildPanels(structuredClone(grid)); assert.equal(s.panelData, JSON.stringify(lg.panels), 'tras desactivar, los modelos nuevos son del legacy');
  const pulgadas = { ...structuredClone(CAJA), units: 'in' }; await F.eval(`${CTRL}.activar('${CONFIRMACION_ACTIVO}')`); await F.eval(`window.__FIXTURE__ = ${JSON.stringify(pulgadas)}`); await F.eval('T.build()'); s = await F.eval(ESTADO);
  assert.equal(s.experimental, false); assert.equal(s.mallas, 11); assert.equal(await F.eval(`${CTRL}.origenDelModelo(__dbg.panelData)`), 'legacy'); assert.match(s.log, /FALLBACK ATÓMICO: esta construcción usa el motor legacy COMPLETO/);
  const lm = L.buildPanels(structuredClone(pulgadas)); const la = L.buildAdjacency(lm.panels, lm.creaseEdges); assert.equal(s.panelData, JSON.stringify(lm.panels)); assert.equal(s.arbol, JSON.stringify(L.buildFoldTree(lm.panels, la, s.base)), 'adyacencias y árbol también del legacy');
  const fb = (await F.eval(`${CTRL}.registro()`)).find((x) => x.fallback); assert.equal(fb.causa.codigo, 'entrada-invalida'); assert.equal(fb.origen, 'legacy');
  await F.eval(`window.__FIXTURE__ = ${JSON.stringify(CAJA)}`); await F.eval('T.build()'); s = await F.eval(ESTADO); assert.deepEqual([s.experimental, s.mallas], [true, 13]); assert.match(s.log, /KI-30/);
  assert.deepEqual(F.errors.slice(e0), []);
});

test('D · modo congelado de depuración: flujo completo, cambio de base, espesor y preset sin ninguna escritura en los datos del motor', async () => {
  const e0 = F.errors.length; await abrir(F, 'exp'); await F.eval(`${CTRL}.activar('${CONFIRMACION_ACTIVO}')`); assert.equal(await F.eval(`${CTRL}.congelarSalidas(true)`), true);
  const r = await flujo(F, { base: 3 }); assert.equal(r.mallas, 13); assert.equal(await F.eval('Object.isFrozen(__dbg.panelData.panels[0].vertices) && Object.isFrozen(__dbg.tree) && Object.isFrozen(__dbg.adj)'), true);
  const antes = await F.eval('JSON.stringify([__dbg.panelData.panels, __dbg.adj])');
  await F.eval(`(async () => { T.$('thickness-input').value = '0.8'; T.$('apply-thickness-btn').click(); await T.sleep(150); const mp = T.$('material-preset'); mp.value = 'kraft'; T.fire(mp, 'change'); await T.sleep(150); await T.setAll(45); })()`);
  assert.equal(await F.eval('JSON.stringify([__dbg.panelData.panels, __dbg.adj])'), antes); assert.equal((await F.eval(ESTADO)).nFold, 12);
  assert.deepEqual(F.errors.slice(e0), [], 'ninguna escritura sobre objetos congelados (lanzaría TypeError)');
});

test('E · no persistente: al recargar el panel vuelve a SOMBRA y el modelo vuelve a ser el del legacy', async () => {
  await abrir(F, 'exp'); await F.eval(`${CTRL}.activar('${CONFIRMACION_ACTIVO}')`); await F.eval('T.build()'); assert.equal((await F.eval(ESTADO)).mallas, 13);
  await abrir(F, 'exp'); assert.equal(await F.eval(`${CTRL}.modo()`), 'sombra'); await F.eval('T.build()'); const s = await F.eval(ESTADO); assert.deepEqual([s.experimental, s.mallas], [false, 11]);
  assert.deepEqual(await F.eval('[localStorage.length, sessionStorage.length, document.cookie]'), [0, 0, '']);
});

test('F · APIs reducidas a Chromium 99: sombra = bundle normal byte a byte y activo = mismo modelo, árbol y GLB que con APIs completas; sin errores', async () => {
  await abrir(H, 'exp'); assert.deepEqual(await H.eval('window.__lowApi'), { arr: false, prom: false, set: false, iter: 'undefined' }, 'APIs posteriores eliminadas');
  const s = await flujo(H, { base: -1 }); assert.equal(s.glb, R.dist.glb); assert.equal(s.arbol, R.dist.arbol);
  await abrir(H, 'exp'); await H.eval(`${CTRL}.activar('${CONFIRMACION_ACTIVO}')`); const a = await flujo(H); for (const k of ['glb', 'panelData', 'arbol', 'adj', 'mallas']) assert.deepEqual(a[k], R.expActivo[k], k);
  assert.deepEqual(H.errors, [], 'sin errores con APIs reducidas');
  const t = fs.readFileSync(path.join(dir, '_exp/main.js'), 'utf8'); for (const [tok, desc] of JS_POST99) assert.ok(!t.includes(tok), desc);
});
