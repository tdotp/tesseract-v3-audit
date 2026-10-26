// A8.0a — Caracterización del subsistema de exportación GLB ANTES de moverlo (docs/fase1/A8_PROPUESTA.md §6). Baseline · panel · bundle, en Chrome headless (no CEP; puente simulado).
//  N1  los GLB sin arte producidos por los tres objetivos son IGUALES BYTE A BYTE a los archivos de Illustrator real (docs/fase1/a7-real/glb/).
//  N2  baseline = panel = bundle byte a byte (sha-256) en 4 fixtures y en estados con arte; dos exportaciones seguidas dan los mismos bytes (determinismo).
//  N3  GLB con arte real (N0-B): equivalencia BINARIA (no exigible en headless: otro codificador PNG) y ESTRUCTURAL (JSON sin desplazamientos + vistas no-imagen), informadas por separado.
//  E1–E6  no mutación de la escena, sin recursos de GPU, errores y mensajes, orden de eventos (Blob antes del diálogo), fallo de textura con log, golden de estructura (solo desde el baseline).
import test, { before, after } from 'node:test'; import assert from 'node:assert/strict'; import fs from 'node:fs'; import path from 'node:path'; import crypto from 'node:crypto';
import { prepare, textOf, PAGE_HELPERS, FIXTURE_FILES } from './harness.mjs'; import { ROOT } from '../lib/fixtures.mjs'; import { parseGLB } from '../lib/glb.mjs';
import { REAL_SHA, readReal, N0B_RECT, compareStructural, structureOf, imageBytes, sha256, alignmentOf } from '../lib/a8.mjs';

const OUT = path.join(ROOT, 'tests/results/latest'); fs.mkdirSync(OUT, { recursive: true });
const save = (name, data) => fs.writeFileSync(path.join(OUT, name + '.json'), JSON.stringify(data, null, 1));
const GOLD = path.join(ROOT, 'tests/golden/glb-structure.golden.json'); const PINS = path.join(ROOT, 'tests/golden/a8.pins.json'); const UPDATE = !!process.env.UPDATE_GOLDEN_A8;
let H; const names = { base: 'baseline', fix: 'panel', dist: 'bundle' }; const TG = ['base', 'fix', 'dist'];
before(async () => { H = await prepare({ fixtures: { ...FIXTURE_FILES, real: 'tests/fixtures/illustrator-real/ill-real-caja-botanica.dieline.json', simple: 'tests/fixtures/illustrator-real/ill-real-caja-simple.dieline.json' } }); });
after(async () => { await H?.close(); process.exit(process.exitCode ?? 0); });
const evalIn = (code, opts) => H.browser.eval(code, opts);
async function load(dir) { await H.open(dir); await evalIn(PAGE_HELPERS); await evalIn(textOf('tools/baseline/harness_art.js')); assert.deepEqual(H.browser.errors, [], 'errores JS al cargar ' + dir); }

// Instrumentación de la página: el diálogo «Save GLB», cep.fs.writeFile y Blob quedan registrados en orden. Resultado del diálogo y de la escritura configurables.
const INST = `(() => { const A = window.__a8 = { events: [], saves: [], dialog: '/tmp/x.glb', write: { err: 0 }, status: [] };
  A.hook = () => { const prev = window.__adobe_cep__.evalScript; window.__adobe_cep__.evalScript = (s, cb) => { if (s.indexOf('saveDialog') > -1) { A.events.push('saveDialog'); setTimeout(() => cb(A.dialog), 0); } else prev(s, cb); }; }; A.hook(); // harnessLoadArt() envuelve evalScript y contesta «cancelado» al diálogo: tras cargarlo se vuelve a llamar a hook()
  window.cep = { fs: { writeFile: (p, b) => { A.events.push('write'); A.saves.push(b); return A.write; } }, encoding: { Base64: 'Base64' } };
  const NativeBlob = window.Blob; window.Blob = class extends NativeBlob { constructor(p, o) { super(p, o); if (o && o.type === 'model/gltf-binary') A.events.push('blob'); } };
  new MutationObserver((recs) => { for (const r of recs) for (const n of r.addedNodes) A.status.push(n.data !== undefined ? n.data : n.textContent); }).observe(document.getElementById('status-area'), { childList: true });
  A.reset = () => { A.events.length = 0; A.saves.length = 0; A.status.length = 0; };
  A.click = async () => { A.reset(); T.$('export-glb-btn').click(); for (let i = 0; i < 2400; i++) { await T.sleep(25); const last = A.status[A.status.length - 1] || ''; if (/exported from current 3D pose|export failed/.test(last)) break; } await T.sleep(100);
    return { events: A.events.slice(), status: A.status.slice(), b64: A.saves.slice(), log: T.$('log-area').textContent, debugOpen: T.$('debug-details').open }; };
})()`;
// Exporta N veces y devuelve los bytes en base64 (GLB pequeños) o solo su sha-256 (GLB con arte sintético de ≈16 MB).
const EXPORT = `window.A8EXP = async (shaOnly) => { const r = await __a8.click(); if (!r.b64.length) throw new Error('sin GLB: ' + r.status.join(' | ')); const b = r.b64[0];
  if (!shaOnly) return { b64: b, status: r.status, events: r.events }; const u = Uint8Array.from(atob(b), (c) => c.charCodeAt(0)); const h = await crypto.subtle.digest('SHA-256', u); return { sha: [...new Uint8Array(h)].map((x) => x.toString(16).padStart(2, '0')).join(''), bytes: u.length, events: r.events }; };`;
// Arte real de N0-B: las dos imágenes del GLB real se sirven como si las exportara Illustrator (mismo rectángulo del artboard medido en real).
const realArtImages = () => { const g = parseGLB(readReal('arte')); return imageBytes(g).map((b) => b.toString('base64')); };
const ART_REAL = (b64s) => `(() => { const urls = ${JSON.stringify(b64s)}.map((s) => URL.createObjectURL(new Blob([Uint8Array.from(atob(s), (c) => c.charCodeAt(0))], { type: 'image/png' })));
  const orig = window.__adobe_cep__.evalScript; window.__adobe_cep__.evalScript = (s, cb) => { if (s.indexOf('tesseract_art') > -1) setTimeout(() => cb(JSON.stringify({ ok: true, mode: 'layers', front: { path: urls[0], rect: ${JSON.stringify(N0B_RECT)}, label: 'front' }, back: { path: urls[1], rect: ${JSON.stringify(N0B_RECT)}, label: 'back' }, available: { artboards: [], layers: [] } })), 0); else orig(s, cb); }; })()`;
const BUILD_ART = `(async () => { T.$('extract-btn').click(); await T.sleep(300); T.$('continue-3d-btn').click(); for (let i = 0; i < 150 && !/Artwork loaded|failed/.test(T.$('art-status').textContent); i++) await T.sleep(100); await T.sleep(500); return T.$('art-status').textContent; })()`;
const PIX = `window.A8PIX = async (a64, b64) => { const dec = async (s) => { const bmp = await createImageBitmap(new Blob([Uint8Array.from(atob(s), (c) => c.charCodeAt(0))], { type: 'image/png' }), { premultiplyAlpha: 'none' });
  const c = document.createElement('canvas'); c.width = bmp.width; c.height = bmp.height; const x = c.getContext('2d'); x.drawImage(bmp, 0, 0); return x.getImageData(0, 0, c.width, c.height); };
  const A = await dec(a64), B = await dec(b64); if (A.width !== B.width || A.height !== B.height) return { dims: false, a: [A.width, A.height], b: [B.width, B.height] };
  let diff = 0, max = 0; for (let i = 0; i < A.data.length; i += 4) { let d = 0; for (let k = 0; k < 4; k++) d = Math.max(d, Math.abs(A.data[i + k] - B.data[i + k])); if (d) { diff++; if (d > max) max = d; } }
  return { dims: true, w: A.width, h: A.height, pixelesDistintos: diff, maxDiferenciaCanal: max }; };`;
const SNAP = `window.A8SNAP = () => { const S = __dbg.scene; const sum = (a) => { let s = 0; for (let i = 0; i < a.length; i++) s += a[i] * ((i % 7) + 1); return s; }; const rows = [];
  S.traverse((o) => { const g = o.geometry, m = o.material && !Array.isArray(o.material) ? o.material : null; rows.push([o.type, o.name, o.uuid, o.visible, o.renderOrder, o.parent ? o.parent.uuid : null, o.children.length, o.position.toArray(), o.quaternion.toArray(), o.scale.toArray(),
    g ? [g.uuid, g.type, g.attributes.position ? g.attributes.position.count : 0, g.attributes.position ? sum(g.attributes.position.array) : 0, g.attributes.normal ? sum(g.attributes.normal.array) : 0, g.attributes.uv ? sum(g.attributes.uv.array) : 0, g.index ? g.index.count : -1, g.index ? sum(g.index.array) : 0] : null,
    m ? [m.uuid, m.type, m.color ? m.color.getHexString() : null, m.opacity, m.transparent, m.side, m.map ? [m.map.uuid, m.map.version, m.map.image ? (m.map.image.width || 0) : 0] : null] : null]); });
  return JSON.stringify(rows); };
  window.A8MEM = () => { const i = __dbg.renderer.info; return { geometries: i.memory.geometries, textures: i.memory.textures, programs: i.programs.length }; };`;

// ───────────────────────── N1: archivos reales de Illustrator ─────────────────────────
const n1 = {};
for (const t of TG) test(`A8 · N1 · GLB sin arte de ${names[t]} = archivos de Illustrator REAL byte a byte (plano y todas a 60°)`, async () => {
  await load(`${t}-real`); await evalIn(INST); await evalIn(EXPORT); await evalIn('T.build()');
  const flat = Buffer.from((await evalIn('A8EXP(false)')).b64, 'base64'); await evalIn('T.setAll(60)'); const a60 = Buffer.from((await evalIn('A8EXP(false)')).b64, 'base64');
  n1[t] = { plano: sha256(flat), todas60: sha256(a60) }; save(`a8-n1-${names[t]}`, { ...n1[t], bytes: [flat.length, a60.length] });
  assert.equal(sha256(readReal('plano')), REAL_SHA.plano); assert.equal(sha256(readReal('todas60')), REAL_SHA.todas60);
  assert.ok(flat.equals(readReal('plano')), `plano ≠ archivo real (${sha256(flat).slice(0, 12)})`); assert.ok(a60.equals(readReal('todas60')), `todas a 60° ≠ archivo real (${sha256(a60).slice(0, 12)})`);
  assert.deepEqual(H.browser.errors, []);
});

// ───────────────────────── N3: GLB con arte real (N0-B) — binario y estructural por separado ─────────────────────────
const n3 = {};
for (const t of TG) test(`A8 · N3 · GLB con arte real de ${names[t]}: equivalencia ESTRUCTURAL con el archivo de Illustrator real (y registro de la BINARIA)`, async () => {
  const imgs = realArtImages(); await load(`${t}-simple`); await evalIn(INST); await evalIn(EXPORT); await evalIn(PIX); await evalIn(ART_REAL(imgs));
  assert.match(await evalIn(BUILD_ART), /Artwork loaded from layers/); const r = await evalIn('A8EXP(false)'); const out = Buffer.from(r.b64, 'base64'); const real = readReal('arte');
  const est = compareStructural(real, out); const realImgs = imageBytes(parseGLB(real)), outImgs = imageBytes(parseGLB(out));
  const px = []; for (let i = 0; i < realImgs.length; i++) px.push(await evalIn(`A8PIX(${JSON.stringify(realImgs[i].toString('base64'))}, ${JSON.stringify(outImgs[i].toString('base64'))})`));
  n3[t] = { out, binario: { identicoAlReal: out.equals(real), sha256: sha256(out), shaReal: REAL_SHA.arte, bytes: out.length, bytesReal: real.length }, estructural: { ...est, pixeles: px } };
  save(`a8-n3-arte-${names[t]}`, { binario: n3[t].binario, estructural: n3[t].estructural });
  // ESTRUCTURAL (exigible): mismo JSON salvo desplazamientos y longitud de imagen, mismo orden de claves, todas las vistas que no son imagen idénticas byte a byte, 2 imágenes del mismo tamaño en píxeles.
  assert.equal(est.esqueletoJson, true, 'esqueleto del JSON'); assert.equal(est.ordenClaves, true, 'orden de claves'); assert.deepEqual(est.vistasNoImagenDistintas, [], 'vistas de datos distintas');
  const al = alignmentOf(out); assert.deepEqual({ ...al, util: 0 }, { vistasAlineadas: true, huecosOk: true, colaBinOk: true, chunksMultiplo4: true, relleno20: true, jsonTermina: true, longitudCabecera: true, util: 0 }, 'alineación y relleno (invisibles al comparar por contenido)');
  assert.equal(est.imagenes.length, 2); for (const im of est.imagenes) assert.deepEqual(im.dims[0], im.dims[1], 'tamaño de imagen');
  for (const p of px) assert.equal(p.dims, true, 'tamaño en píxeles de la imagen');
  // BINARIA (condicional): si el codificador PNG de este Chrome coincidiera con el de CEP, el archivo sería el real; si no, solo se informa. Nunca se exige igualdad binaria con el real en headless.
  if (n3[t].binario.identicoAlReal) assert.equal(sha256(out), REAL_SHA.arte);
  assert.deepEqual(H.browser.errors, []);
});
test('A8 · N3 · el GLB con arte real es idéntico BYTE A BYTE entre baseline, panel y bundle (misma sesión de Chrome)', () => { assert.ok(n3.fix.out.equals(n3.base.out), 'panel ≠ baseline'); assert.ok(n3.dist.out.equals(n3.base.out), 'bundle ≠ baseline'); });

// ───────────────────────── N2: baseline = panel = bundle y determinismo ─────────────────────────
const FLOW_N2 = `(async () => { const { sleep, raf2, setAll } = T; const o = {}; const ex = async (k) => { const a = await A8EXP(true); const b = await A8EXP(true); o[k] = a.sha; o[k + '_bytes'] = a.bytes; o[k + '_repetida'] = a.sha === b.sha; };
  await T.build(); await ex('plano'); await setAll(30); await ex('a30'); await setAll(60); await ex('a60'); await setAll(0);
  await harnessLoadArt(); __a8.hook(); await sleep(300); await raf2(); await ex('arte_plano'); await setAll(45); await ex('arte_a45');
  const th = T.$('thickness-input'); th.value = '1.2'; T.$('apply-thickness-btn').click(); await sleep(300); await raf2(); await ex('arte_espesor'); return o; })()`;
const n2 = {};
for (const fx of ['caja', 'ill']) for (const t of TG) test(`A8 · N2 · ${names[t]} (${fx}): exportación en 6 estados con y sin arte, y repetida`, async () => {
  await load(`${t}-${fx}`); await evalIn(INST); await evalIn(EXPORT); n2[`${t}-${fx}`] = await evalIn(FLOW_N2, 240000); save(`a8-n2-${names[t]}-${fx}`, n2[`${t}-${fx}`]);
  for (const k of ['plano', 'a30', 'a60', 'arte_plano', 'arte_a45', 'arte_espesor']) assert.equal(n2[`${t}-${fx}`][k + '_repetida'], true, `determinismo (${k})`);
  assert.deepEqual(H.browser.errors, []);
});
for (const fx of ['caja', 'ill']) test(`A8 · N2 · ${fx}: baseline, panel y bundle exportan los mismos bytes en cada estado`, () => { assert.deepEqual(n2[`fix-${fx}`], n2[`base-${fx}`]); assert.deepEqual(n2[`dist-${fx}`], n2[`base-${fx}`]); });

// ───────────────────────── E1/E2: la exportación no muta la escena ni crea recursos de GPU ─────────────────────────
for (const t of TG) test(`A8 · E1/E2 · ${names[t]}: exportar (con arte) no cambia la escena ni la memoria de GPU`, async () => {
  await load(`${t}-caja`); await evalIn(INST); await evalIn(EXPORT); await evalIn(SNAP); await evalIn('T.build()'); await evalIn('harnessLoadArt()'); await evalIn('__a8.hook()'); await evalIn(`T.setAll(40)`); await evalIn(`T.sleep(300)`);
  const antes = await evalIn('A8SNAP()'); const memAntes = await evalIn('A8MEM()');
  for (let i = 0; i < 5; i++) await evalIn('A8EXP(true)');
  await evalIn('T.sleep(300)'); const despues = await evalIn('A8SNAP()'); const memDespues = await evalIn('A8MEM()');
  assert.equal(despues, antes, 'la escena cambió al exportar (tipos, orden, transformaciones, geometría, materiales, versión de textura)'); assert.deepEqual(memDespues, memAntes, 'la memoria de GPU cambió al exportar');
  assert.deepEqual(H.browser.errors, []);
});

// ───────────────────────── E4/E5: errores, cancelación, mensajes y orden de eventos ─────────────────────────
const errs = {};
for (const t of TG) test(`A8 · E4/E5 · ${names[t]}: mensajes de estado, cancelación, errores y orden Blob → diálogo → escritura`, async () => {
  const o = errs[t] = {};
  await load(`${t}-caja`); await evalIn(INST); await evalIn(EXPORT);
  o.sinEscena = await evalIn('__a8.click()'); // sin construir 3D
  await load(`${t}-caja`); await evalIn(INST); await evalIn(EXPORT); await evalIn('T.build()');
  o.ok = await evalIn('__a8.click()'); o.ok.b64 = o.ok.b64.length; // el contenido ya lo cubren N1/N2
  await evalIn(`__a8.dialog = ''`); o.cancelado = await evalIn('__a8.click()'); await evalIn(`__a8.dialog = '/tmp/x.glb'`);
  await evalIn(`__a8.write = { err: 5 }`); o.errorEscritura = await evalIn('__a8.click()'); await evalIn(`__a8.write = { err: 0 }`);
  await evalIn(`__dbg.scene.traverse((m) => { if (m.isMesh && m.material && !Array.isArray(m.material)) { m.material.transparent = true; m.material.opacity = 0; } })`); o.nadaExportable = await evalIn('__a8.click()');
  for (const k of Object.keys(o)) { delete o[k].b64; delete o[k].log; } // el log completo contiene tiempos; abajo se comprueba aparte
  save(`a8-errores-${names[t]}`, o);
  assert.deepEqual(o.sinEscena.status, ['Exporting GLB…', 'GLB export failed: Build 3D first']); assert.deepEqual(o.sinEscena.events, []); assert.equal(o.sinEscena.debugOpen, true);
  assert.deepEqual(o.ok.status, ['Exporting GLB…', 'GLB saved: /tmp/x.glb', 'GLB exported from current 3D pose'], 'KI-25: el mensaje final sobrescribe el resultado'); assert.deepEqual(o.ok.events, ['blob', 'saveDialog', 'write'], 'I-X1: el Blob se construye ANTES del diálogo');
  assert.deepEqual(o.cancelado.status, ['Exporting GLB…', 'GLB export cancelled', 'GLB exported from current 3D pose'], 'KI-25 también al cancelar'); assert.deepEqual(o.cancelado.events, ['blob', 'saveDialog']);
  assert.deepEqual(o.errorEscritura.status, ['Exporting GLB…', 'GLB export failed: Could not save GLB file (err 5)']); assert.deepEqual(o.errorEscritura.events, ['blob', 'saveDialog', 'write']);
  assert.deepEqual(o.nadaExportable.status, ['Exporting GLB…', 'GLB export failed: Nothing exportable in current 3D view']); assert.deepEqual(o.nadaExportable.events, [], 'sin Blob ni diálogo cuando no hay nada que exportar');
  assert.deepEqual(H.browser.errors, []);
});
test('A8 · E4 · mensajes y orden idénticos en baseline, panel y bundle', () => { assert.deepEqual(errs.fix, errs.base); assert.deepEqual(errs.dist, errs.base); });
const logFail = {};
for (const t of TG) test(`A8 · E4 · ${names[t]}: si la codificación de la textura falla, el log lo dice y el GLB sale sin imágenes`, async () => {
  const imgs = realArtImages(); await load(`${t}-simple`); await evalIn(INST); await evalIn(EXPORT); await evalIn(ART_REAL(imgs)); assert.match(await evalIn(BUILD_ART), /Artwork loaded from layers/);
  await evalIn(`window.__draw = CanvasRenderingContext2D.prototype.drawImage; CanvasRenderingContext2D.prototype.drawImage = function () { throw new Error('boom'); }`);
  let r; try { r = await evalIn('__a8.click()'); } finally { await evalIn(`CanvasRenderingContext2D.prototype.drawImage = window.__draw`); }
  const g = parseGLB(Buffer.from(r.b64[0], 'base64')); logFail[t] = { lineas: r.log.split('\n').filter((l) => /Texture image encode failed/.test(l)).length, imagenes: (g.json.images || []).length, texturas: (g.json.textures || []).length, estado: r.status };
  save(`a8-fallo-textura-${names[t]}`, logFail[t]);
  assert.ok(logFail[t].lineas >= 1, 'falta «Texture image encode failed: boom» en el log'); assert.match(r.log, /Texture image encode failed: boom/); assert.equal(logFail[t].imagenes, 0); assert.equal(logFail[t].texturas, 0);
  assert.deepEqual(r.status, ['Exporting GLB…', 'GLB saved: /tmp/x.glb', 'GLB exported from current 3D pose']);
});
test('A8 · E4 · fallo de textura: idéntico en baseline, panel y bundle', () => { assert.deepEqual(logFail.fix, logFail.base); assert.deepEqual(logFail.dist, logFail.base); });

// ───────────────────────── E6: estructura del GLB (golden solo desde el baseline) ─────────────────────────
const struct = {};
for (const t of TG) test(`A8 · E6 · estructura del GLB de ${names[t]}: nodos, materiales, vistas y orden en 4 fixtures, con y sin arte`, async () => {
  const o = struct[t] = {};
  for (const fx of ['caja', 'ill', 'real']) { await load(`${t}-${fx}`); await evalIn(INST); await evalIn(EXPORT); await evalIn('T.build()'); o[fx + '_plano'] = structureOf(Buffer.from((await evalIn('A8EXP(false)')).b64, 'base64'));
    await evalIn('T.setAll(60)'); o[fx + '_a60'] = structureOf(Buffer.from((await evalIn('A8EXP(false)')).b64, 'base64')); }
  const imgs = realArtImages(); await load(`${t}-simple`); await evalIn(INST); await evalIn(EXPORT); await evalIn(ART_REAL(imgs)); await evalIn(BUILD_ART); o.simple_arte = structureOf(Buffer.from((await evalIn('A8EXP(false)')).b64, 'base64'));
  assert.ok(o.real_a60.nodos.length === 31 && o.real_plano.nodos.length === 11 && o.simple_arte.nodos.length === 6, 'nodos 11/31/6 como en los GLB reales'); assert.deepEqual(H.browser.errors, []);
});
test('A8 · E6 · estructura: baseline, panel y bundle idénticos', () => { assert.deepEqual(struct.fix, struct.base); assert.deepEqual(struct.dist, struct.base); });
test('A8 · E6 · estructura: el baseline coincide con el golden fijado (o se regenera desde el baseline con UPDATE_GOLDEN_A8=1)', () => {
  const cur = JSON.parse(JSON.stringify(struct.base)); // JSON: normaliza -0
  if (UPDATE) { fs.writeFileSync(GOLD, JSON.stringify({ _fuente: 'reference/legacy-baseline vía Chrome headless (A8.0a)', ...cur }, null, 1)); return; }
  const pins = JSON.parse(fs.readFileSync(PINS, 'utf8')); assert.equal(crypto.createHash('sha256').update(fs.readFileSync(GOLD)).digest('hex'), pins.archivos['tests/golden/glb-structure.golden.json'], 'golden alterado');
  const { _fuente, ...g } = JSON.parse(fs.readFileSync(GOLD, 'utf8')); assert.deepEqual(cur, g);
});
