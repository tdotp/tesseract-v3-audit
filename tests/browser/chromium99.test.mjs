// A3 — comportamiento con un conjunto de APIs reducido al de Chromium 99: en un Chrome moderno se ELIMINAN, antes de cargar la página, las APIs
// añadidas después de la 99 y se repite el flujo completo en baseline, panel y bundle. No sustituye a Chromium 99 real (CEF 4844): es una red de seguridad.
import test, { before, after } from 'node:test'; import assert from 'node:assert/strict'; import fs from 'node:fs'; import path from 'node:path'; import { createHash } from 'node:crypto';
import { prepare, textOf, PAGE_HELPERS } from './harness.mjs'; import { ROOT } from '../lib/fixtures.mjs'; import { summarize, parseGLB } from '../lib/glb.mjs';
const REDUCE = `(() => { const del = (o, k) => { try { delete o[k]; } catch (e) {} }; const TA = Object.getPrototypeOf(Uint8Array.prototype);
  for (const k of ['toSorted', 'toReversed', 'toSpliced', 'with', 'group', 'groupBy']) { del(Array.prototype, k); del(TA, k); }
  del(Object, 'groupBy'); del(Map, 'groupBy'); del(Promise, 'withResolvers'); del(Promise, 'try'); del(Array, 'fromAsync'); del(String.prototype, 'isWellFormed'); del(String.prototype, 'toWellFormed');
  for (const k of ['union', 'intersection', 'difference', 'symmetricDifference', 'isSubsetOf', 'isSupersetOf', 'isDisjointFrom']) del(Set.prototype, k);
  del(globalThis, 'Iterator'); del(URL, 'canParse'); del(AbortSignal, 'any'); del(AbortSignal, 'timeout'); del(ArrayBuffer.prototype, 'transfer'); del(ArrayBuffer.prototype, 'transferToFixedLength');
  del(Element.prototype, 'checkVisibility'); del(document, 'startViewTransition'); del(JSON, 'rawJSON'); del(Response, 'json'); del(HTMLElement.prototype, 'showPopover'); del(Intl, 'DurationFormat'); del(globalThis, 'Float16Array'); del(globalThis, 'scheduler');
  window.__lowApi = { arr: 'toSorted' in Array.prototype, ta: 'toSorted' in TA, prom: 'withResolvers' in Promise, grp: 'groupBy' in Object, set: 'union' in Set.prototype, iter: typeof Iterator, url: 'canParse' in URL, abort: 'timeout' in AbortSignal }; })()`;
let H, F; before(async () => { H = await prepare({ initScript: REDUCE }); F = await prepare(); }); after(async () => { await H?.close(); await F?.close(); process.exit(process.exitCode ?? 0); }); // H = APIs reducidas · F = APIs completas (referencia)
const evalIn = (c) => H.browser.eval(c);
const CAPTURE = `window.captureGLB = async () => { window.__glb = null; window.cep = { fs: { writeFile: (p, b) => { window.__glb = b; return { err: 0 }; } }, encoding: { Base64: 'Base64' } };
  const prev = window.__adobe_cep__.evalScript; window.__adobe_cep__.evalScript = (s, cb) => (s.indexOf('saveDialog') > -1 ? setTimeout(() => cb('/tmp/x.glb'), 0) : prev(s, cb)); T.$('export-glb-btn').click();
  for (let i = 0; i < 400 && !window.__glb; i++) await T.sleep(50); window.__adobe_cep__.evalScript = prev; return window.__glb; };`;
const res = {}, full = {};
async function seq(h, t) { const ev = (c) => h.browser.eval(c); await h.open(`${t}-caja`); await ev(PAGE_HELPERS); for (const s of ['leak_cycles.js', 'harness_art.js']) await ev(textOf('tools/baseline/' + s)); await ev(CAPTURE);
  await ev('T.build()'); await ev('T.setAll(60)'); await ev('harnessLoadArt()'); await ev('T.setAll(60)'); const b64 = await ev('captureGLB()'); assert.ok(b64 && b64.length > 1000); const buf = Buffer.from(b64, 'base64'); return { buf, ev }; }
for (const t of ['base', 'fix', 'dist']) test(`APIs reducidas a Chromium 99 · ${t === 'base' ? 'baseline' : t === 'fix' ? 'panel' : 'bundle'}: flujo completo sin errores (3D, plegado, arte, GLB, ciclos de GPU) y mismo GLB que con APIs completas`, async () => {
  const f = await seq(F, t); full[t] = createHash('sha256').update(f.buf).digest('hex').slice(0, 16);
  const { buf, ev } = await seq(H, t); const low = await ev('window.__lowApi'); assert.deepEqual(low, { arr: false, ta: false, prom: false, grp: false, set: false, iter: 'undefined', url: false, abort: false }, 'las APIs posteriores deben estar eliminadas');
  const s = summarize(parseGLB(buf)); res[t] = { sha: createHash('sha256').update(buf).digest('hex').slice(0, 16), nodes: s.nodes, images: s.images };
  const g = await ev('tesseractLeakCycles({ cycles: 3, withArt: true })'); assert.equal(g.veredicto, t === 'base' ? 'CRECE' : 'SIN CRECIMIENTO ACUMULATIVO');
  assert.deepEqual(H.browser.errors, [], 'errores JS con APIs reducidas'); assert.equal(s.images, 2); assert.equal(s.generator, 'Tesseract Phase 7B'); assert.equal(res[t].sha, full[t], 'el GLB con APIs reducidas debe ser idéntico al de APIs completas');
});
test('APIs reducidas: baseline, panel y bundle exportan el mismo GLB entre sí (reducidas y completas)', () => { assert.equal(res.fix.sha, res.base.sha); assert.equal(res.dist.sha, res.base.sha); assert.equal(full.fix, full.base); assert.equal(full.dist, full.base); });
