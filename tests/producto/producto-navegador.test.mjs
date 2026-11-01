// Línea de producto 3.0.1-dev (D-0) — el bundle de PRODUCTO (experimental: selector legacy/experimental, sombra por defecto) en Chrome headless con la
// interfaz real (arnés A1–A9) y un puente CEP simulado que SÍ responde al envoltorio de identidad (host/doc-identity.js) como Illustrator:
//   H-05  documento cambiado entre extraer y construir ⇒ no se construye y se pide extraer; arte de otro documento ⇒ no se aplica; nombres repetidos.
//   H-03  refrescos de arte simultáneos (el último gana), fallo parcial (front cargado, back falla), reconstrucción a mitad de carga; texturas liberadas
//         y ninguna textura en uso (overlays y puentes de plegado) liberada.
//   KI-24 cambiar el preset antes de construir no lanza.
//   GLB   sombra y activo, plano y plegado, con y sin arte: 0 errores del comprobador independiente, sin triángulos degenerados, en METROS, y
//         semánticamente igual (×0,001) a las exportaciones REALES históricas del legacy (A7) y del activo (RC).
// LÍMITE: Chrome headless, no CEP 12 ni Chromium 99 auténtico; el puente CEP es simulado (la validación real está en el informe).
import test, { before, after } from 'node:test'; import assert from 'node:assert/strict'; import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { execFileSync } from 'node:child_process';
import { ROOT } from '../lib/fixtures.mjs'; import { serveDir, launchChrome } from '../browser/cdp.mjs'; import { PAGE_HELPERS, FIXTURE_FILES } from '../browser/harness.mjs';
import { validarGLB, cajaGLB, equivalenciaHistorica } from '../lib/glb-conformidad.mjs';
import { construirExperimental } from '../../tools/build/build-experimental.mjs'; import { construirRC } from '../../tools/build/build-rc.mjs'; import { CONFIRMACION_ACTIVO } from '../../experimental/integracion/selector.js';

const CTRL = 'window.__tessMotorExperimental';
const PUENTE = `(() => {
  window.__docActual = { name: 'caja.ai', path: '/A/caja.ai', documentID: 'xmp.did:A' }; window.__arte = []; window.__llamadas = [];
  const orig = window.__adobe_cep__.evalScript;
  window.__adobe_cep__.evalScript = (s, cb) => {
    const envuelto = s.indexOf('__tessDocIdentity') > -1, doc = window.__docActual; // la identidad se lee al ejecutar el script, como en Illustrator
    const responder = (inner, ms) => setTimeout(() => cb(envuelto ? '{"tessDoc":' + JSON.stringify(doc) + ',"r":' + inner + '}' : inner), ms || 0);
    if (s.indexOf('tesseract_art') > -1) { window.__llamadas.push('arte'); const q = window.__arte.shift() || { art: { ok: true, mode: 'none', front: null, back: null, available: { artboards: [], layers: [] } } }; return responder(JSON.stringify(q.art), q.ms); }
    if (s.indexOf('saveDialog') > -1 || s.indexOf('OK_FROM_ILLUSTRATOR') > -1) return orig(s, cb);
    if (s.indexOf('return "{}"') > -1) { window.__llamadas.push('identidad'); return responder('{}', 0); }
    window.__llamadas.push('extraer'); return responder(JSON.stringify(window.__FIXTURE__), 0);
  };
  window.__liberadas = new Set(); const disp = THREE.Texture.prototype.dispose; THREE.Texture.prototype.dispose = function () { window.__liberadas.add(this.uuid); return disp.call(this); };
  const F = window.__FIXTURE__; const pts = [F.outerBoundary, ...F.creases].flatMap((p) => p.points.map((q) => q.anchor));
  const minx = Math.min(...pts.map((p) => p.x)) - 10, maxx = Math.max(...pts.map((p) => p.x)) + 10, miny = Math.min(...pts.map((p) => p.y)) - 10, maxy = Math.max(...pts.map((p) => p.y)) + 10;
  const rect = { left: minx, top: maxy, right: maxx, bottom: miny, width: maxx - minx, height: maxy - miny };
  window.crearArte = async (hue) => { const url = async (h) => { const c = document.createElement('canvas'); c.width = 256; c.height = 256; const x = c.getContext('2d'); x.fillStyle = 'hsl(' + h + ',70%,50%)'; x.fillRect(0, 0, 256, 256);
      return URL.createObjectURL(await new Promise((r) => c.toBlob(r, 'image/png'))); };
    return { ok: true, mode: 'artboards', front: { path: await url(hue), rect, label: 'front' }, back: { path: await url(hue + 120), rect, label: 'back' }, available: { artboards: [], layers: [] } }; };
  window.texturasEnUso = () => { const u = new Set(); __dbg.scene.traverse((o) => { if (o.isMesh && o.material && o.material.map) u.add(o.material.map.uuid); }); return [...u]; }; // mallas (las etiquetas P# son Sprite con su propio lienzo)
  window.arteActual = () => { const a = __dbg.art; return a ? [a.front && a.front.texture && a.front.texture.uuid, a.back && a.back.texture && a.back.texture.uuid] : null; };
  window.esperarArte = async (re) => { for (let i = 0; i < 200; i++) { if (re.test(T.$('art-status').textContent)) return T.$('art-status').textContent; await T.sleep(25); } return 'TIMEOUT: ' + T.$('art-status').textContent; };
})()`;
const CAPTURE = `window.captureGLB = async () => { window.__glb = null; window.cep = { fs: { writeFile: (p, b) => { window.__glb = b; return { err: 0 }; } }, encoding: { Base64: 'Base64' } };
  const prev = window.__adobe_cep__.evalScript; window.__adobe_cep__.evalScript = (s, cb) => (s.indexOf('saveDialog') > -1 ? setTimeout(() => cb('/tmp/x.glb'), 0) : prev(s, cb)); T.$('export-glb-btn').click();
  for (let i = 0; i < 400 && !window.__glb; i++) await T.sleep(50); window.__adobe_cep__.evalScript = prev; return window.__glb; };`;

// El troquel extraído en Illustrator real de N0-A: con él el legacy reproduce byte a byte las exportaciones reales de A7 (prueba A8 · N1).
const REAL_FIXTURE = 'tests/fixtures/illustrator-real/ill-real-caja-botanica.dieline.json';
let dir, server, B; const GLB = {};
before(async () => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tess-producto-nav-')); await construirExperimental({ out: path.join(dir, '_exp') });
  const rc = await construirRC({ commit: '7258524', out: path.join(dir, '_rc') }); // el RC 3.0.0-rc.1 cerrado, reconstruido byte a byte desde su commit
  execFileSync('python3', [ROOT + '/tools/baseline/setup_harness.py', path.join(rc.dir, 'extension'), path.join(ROOT, REAL_FIXTURE), path.join(dir, 'rc-real')], { stdio: 'pipe' });
  for (const [fx, f] of [['caja', FIXTURE_FILES.caja], ['real', REAL_FIXTURE]]) execFileSync('python3', [ROOT + '/tools/baseline/setup_harness.py', path.join(dir, '_exp'), path.join(ROOT, f), path.join(dir, 'exp-' + fx)], { stdio: 'pipe' });
  server = await serveDir(dir); B = await launchChrome();
});
after(async () => { await B?.close(); await server?.close(); if (dir) fs.rmSync(dir, { recursive: true, force: true }); process.exit(process.exitCode ?? 0); });
async function abrir(fx = 'caja', pre = 'exp') { await B.goto(`${server.url}/${pre}-${fx}/index.html`); await B.eval('new Promise((r) => setTimeout(r, 200))'); await B.eval(PAGE_HELPERS); await B.eval(PUENTE); await B.eval(CAPTURE); }
const estado = () => B.eval(`({ status: T.$('status-area').textContent, panels: __dbg.panels, vista3d: T.$('three-view').style.display !== 'none', continuar: !T.$('continue-3d-btn').disabled, llamadas: window.__llamadas.slice() })`);
const glb = async () => Buffer.from(await B.eval('captureGLB()'), 'base64');

test('H-05 · documento cambiado entre «Extract» y «Continue to 3D»: no se construye, se invalida la extracción y se pide extraer de nuevo', async () => {
  const e0 = B.errors.length; await abrir();
  await B.eval("T.$('extract-btn').click(); T.sleep(150)"); await B.eval("window.__docActual = { name: 'otra.ai', path: '/A/otra.ai', documentID: 'xmp.did:B' }");
  await B.eval("T.$('continue-3d-btn').click(); T.sleep(300)"); let s = await estado();
  assert.match(s.status, /active document changed since the extraction/); assert.equal(s.panels, 0); assert.equal(s.vista3d, false); assert.equal(s.continuar, false, 'la extracción queda invalidada');
  assert.deepEqual(s.llamadas, ['extraer', 'identidad'], 'una sola comprobación puntual (sin vigilancia continua)');
  await B.eval("T.$('continue-3d-btn').disabled = false; T.$('continue-3d-btn').click(); T.sleep(100)"); assert.match((await estado()).status, /Nothing to build\. Extract first\./);
  await B.eval("T.$('extract-btn').click(); T.sleep(150)"); await B.eval("T.$('continue-3d-btn').click(); T.sleep(700)"); s = await estado();
  assert.match(s.status, /3D ready/); assert.equal(s.panels, 11); assert.deepEqual(B.errors.slice(e0), []);
});
test('H-05 · mismo nombre en otra carpeta = otro documento; volver al documento original sí construye', async () => {
  await abrir(); await B.eval("window.__docActual = { name: 'caja.ai', path: '/A/caja.ai', documentID: 'xmp.did:A' }; T.$('extract-btn').click(); T.sleep(150)");
  await B.eval("window.__docActual = { name: 'caja.ai', path: '/B/caja.ai', documentID: 'xmp.did:A' }; T.$('continue-3d-btn').click(); T.sleep(300)"); assert.match((await estado()).status, /active document changed/);
  await B.eval("window.__docActual = { name: 'caja.ai', path: '/A/caja.ai', documentID: 'xmp.did:A' }; T.$('extract-btn').click(); T.sleep(150)");
  await B.eval("window.__docActual = { name: 'otra.ai', path: '', documentID: 'xmp.did:Z' }; window.__docActual = { name: 'caja.ai', path: '/A/caja.ai', documentID: 'xmp.did:A' }; T.$('continue-3d-btn').click(); T.sleep(700)");
  assert.match((await estado()).status, /3D ready/);
});
test('H-05 · arte de un documento distinto del del modelo: no se aplica y el arte vigente se conserva', async () => {
  const e0 = B.errors.length; await abrir(); await B.eval('window.__arte.push({ art: null })'); await B.eval('(async () => { window.__arte.length = 0; window.__arte.push({ art: await crearArte(20) }); })()');
  await B.eval('T.build()'); assert.match(await B.eval('esperarArte(/Artwork loaded/)'), /Artwork loaded/); const antes = await B.eval('arteActual()');
  await B.eval("(async () => { window.__docActual = { name: 'otra.ai', path: '/A/otra.ai', documentID: 'xmp.did:B' }; window.__arte.push({ art: await crearArte(200) }); T.$('refresh-art-btn').click(); })()");
  assert.match(await B.eval('esperarArte(/not applied/)'), /active document is not the one the 3D model was built from/);
  assert.deepEqual(await B.eval('arteActual()'), antes); assert.deepEqual(await B.eval('[...window.__liberadas]'), [], 'no se liberó nada en uso'); assert.deepEqual(B.errors.slice(e0), []);
});
test('H-03 · dos refrescos simultáneos: gana el ÚLTIMO aunque el primero responda después; las texturas del descartado se liberan', async () => {
  const e0 = B.errors.length; await abrir(); await B.eval('T.build()'); await B.eval('esperarArte(/No Front|Artwork/)');
  await B.eval(`(async () => { const lento = await crearArte(20), rapido = await crearArte(200); window.__arte.push({ art: lento, ms: 500 }, { art: rapido, ms: 20 });
    T.$('refresh-art-btn').click(); await T.sleep(5); T.$('refresh-art-btn').click(); window.__rapido = rapido.front.path; })()`);
  await B.eval('T.sleep(900)'); const r = await B.eval(`({ path: __dbg.art && __dbg.art.front.path, uso: texturasEnUso(), arte: arteActual(), lib: [...__liberadas], status: T.$('art-status').textContent })`);
  assert.equal(r.path, await B.eval('window.__rapido'), 'el arte aplicado es el de la ÚLTIMA solicitud'); assert.match(r.status, /Artwork loaded/);
  assert.equal(r.lib.length, 0, 'el primero se descartó ANTES de cargar texturas (no llegó a crear ninguna)'); for (const u of r.uso) assert.ok(r.arte.includes(u), 'en escena solo el arte vigente');
  await B.eval(`(async () => { const a = await crearArte(40), b = await crearArte(80); window.__arte.push({ art: a, ms: 10 }, { art: b, ms: 10 }); window.__b = b.front.path;
    const orig = __dbg; T.$('refresh-art-btn').click(); await T.sleep(30); T.$('refresh-art-btn').click(); })()`); await B.eval('T.sleep(600)');
  const r2 = await B.eval(`({ path: __dbg.art.front.path, arte: arteActual(), lib: [...__liberadas], uso: texturasEnUso() })`); assert.equal(r2.path, await B.eval('window.__b'));
  for (const u of r2.uso) assert.ok(!r2.lib.includes(u), 'ninguna textura en uso está liberada'); assert.ok(r2.lib.length >= 2, 'las texturas de los artes sustituidos se liberan'); assert.deepEqual(B.errors.slice(e0), []);
});
test('H-03 · plegado a 60°: overlays Y puentes de plegado pasan al arte nuevo; las texturas viejas se liberan y ninguna en uso lo está', async () => {
  const e0 = B.errors.length; await abrir(); await B.eval('(async () => { window.__arte.push({ art: await crearArte(20) }); })()'); await B.eval('T.build()'); await B.eval('esperarArte(/Artwork loaded/)'); await B.eval('T.setAll(60)');
  const viejo = await B.eval('arteActual()'); const puentes = () => B.eval(`(() => { const u = new Set(); if (__dbg.bridges) __dbg.bridges.traverse((o) => { if (o.material && o.material.map) u.add(o.material.map.uuid); }); return [...u]; })()`);
  assert.ok((await puentes()).length > 0, 'a 60° hay puentes con arte'); await B.eval("(async () => { window.__arte.push({ art: await crearArte(200) }); T.$('refresh-art-btn').click(); })()"); await B.eval('esperarArte(/Artwork loaded/)'); await B.eval('T.sleep(100)');
  const r = await B.eval('({ nuevo: arteActual(), uso: texturasEnUso(), lib: [...__liberadas] })'); const p = await puentes();
  assert.ok(p.length > 0 && p.every((u) => r.nuevo.includes(u)), 'los puentes usan el arte NUEVO'); assert.ok(r.uso.every((u) => r.nuevo.includes(u)), 'overlays con el arte nuevo');
  assert.deepEqual(r.lib.sort(), viejo.filter(Boolean).sort(), 'se liberan exactamente las dos texturas viejas'); assert.deepEqual(B.errors.slice(e0), []);
});
test('H-03 · fallo parcial (front carga, back falla): el arte vigente no cambia y la textura front recién cargada se libera', async () => {
  const e0 = B.errors.length; await abrir(); await B.eval('(async () => { window.__arte.push({ art: await crearArte(20) }); })()'); await B.eval('T.build()'); await B.eval('esperarArte(/Artwork loaded/)'); const antes = await B.eval('arteActual()');
  await B.eval("(async () => { const a = await crearArte(200); a.back.path = 'blob:http://127.0.0.1/no-existe'; window.__arte.push({ art: a }); T.$('refresh-art-btn').click(); })()");
  assert.match(await B.eval('esperarArte(/failed/)'), /Artwork load failed/); const r = await B.eval('({ arte: arteActual(), lib: [...__liberadas], uso: texturasEnUso() })');
  assert.deepEqual(r.arte, antes, 'sin referencias al intento fallido'); assert.equal(r.lib.length, 1, 'la front del intento fallido'); assert.ok(!antes.includes(r.lib[0])); assert.ok(r.uso.every((u) => antes.includes(u)));
  assert.deepEqual(B.errors.slice(e0), []);
});
test('H-03 · reconstruir el modelo (Continue to 3D) a mitad de una carga: la carga vieja se descarta y no toca el modelo nuevo', async () => {
  const e0 = B.errors.length; await abrir(); await B.eval('T.build()'); await B.eval('esperarArte(/No Front|Artwork/)');
  await B.eval(`(async () => { const viejo = await crearArte(20), nuevo = await crearArte(200); window.__arte.push({ art: viejo, ms: 600 }, { art: nuevo, ms: 10 }); window.__nuevo = nuevo.front.path;
    T.$('refresh-art-btn').click(); await T.sleep(20); T.$('back-btn').click(); T.$('extract-btn').click(); await T.sleep(150); T.$('continue-3d-btn').click(); })()`);
  await B.eval('T.sleep(1200)'); assert.equal(await B.eval('__dbg.art && __dbg.art.front.path'), await B.eval('window.__nuevo')); assert.deepEqual(B.errors.slice(e0), []);
});
test('KI-24 · cambiar el preset de material ANTES de construir no lanza; después el 3D se construye con ese preset', async () => {
  const e0 = B.errors.length; await abrir(); await B.eval("(() => { const s = T.$('material-preset'); s.value = 'kraft'; T.fire(s, 'change'); })()"); await B.eval('T.sleep(50)');
  assert.deepEqual(B.errors.slice(e0), [], 'sin ReferenceError'); assert.doesNotMatch(await B.eval("T.$('log-area').textContent"), /buildChildrenOfMap|ReferenceError/);
  await B.eval('T.build()'); assert.equal(await B.eval('__dbg.preset'), 'kraft'); assert.equal(await B.eval('__dbg.panels'), 11);
});

const HIST = { sombraPlano: 'docs/fase1/a7-real/glb/paridad-caja-plano.glb', sombra60: 'docs/fase1/a7-real/glb/paridad-caja-todas60.glb' }; // exportaciones REALES del legacy (A7)
test('GLB · sombra y activo, plano, 60° y con arte: 0 errores del comprobador independiente, sin triángulos degenerados, normales unitarias, en METROS', async () => {
  const e0 = B.errors.length;
  for (const modo of ['sombra', 'activo']) { await abrir('real'); if (modo === 'activo') assert.equal(await B.eval(`${CTRL}.activar('${CONFIRMACION_ACTIVO}')`), true);
    await B.eval('T.build()'); await B.eval('esperarArte(/No Front|Artwork/)'); GLB[modo + 'Plano'] = await glb(); await B.eval('T.setAll(60)'); GLB[modo + '60'] = await glb();
    await B.eval("(async () => { window.__arte.push({ art: await crearArte(20) }); T.$('refresh-art-btn').click(); })()"); await B.eval('esperarArte(/Artwork loaded/)'); GLB[modo + 'Arte60'] = await glb(); }
  const res = path.join(ROOT, 'tests/results/producto'); fs.mkdirSync(res, { recursive: true }); for (const [k, buf] of Object.entries(GLB)) fs.writeFileSync(path.join(res, `glb-${k}.glb`), buf); // salidas locales (ignoradas por git) para consumidores externos
  for (const [k, buf] of Object.entries(GLB)) { const v = validarGLB(buf); assert.deepEqual(v.errores, [], k); assert.equal(v.degenerados, 0, k); const j = JSON.parse(buf.slice(20, 20 + buf.readUInt32LE(12)).toString());
    assert.equal(j.asset.generator, 'Tesseract V3'); assert.deepEqual(j.asset.extras, { tesseract: { unidades: 'm', unidadInterna: 'mm', escalaAplicada: 0.001 } }); assert.ok(Math.max(...cajaGLB(buf).size) < 1, k + ': en metros (< 1 m)'); }
  assert.equal(JSON.parse(GLB.activoArte60.slice(20, 20 + GLB.activoArte60.readUInt32LE(12)).toString()).images.length, 2); assert.deepEqual(B.errors.slice(e0), []);
});
test('GLB · dimensiones físicas: plano = troquel real (175,0 × 0,25 × 223,5 mm ⇒ 0,175 × 0,00025 × 0,2235 m); espesor y centro convertidos una sola vez', () => {
  const c = cajaGLB(GLB.sombraPlano); const h = cajaGLB(fs.readFileSync(path.join(ROOT, HIST.sombraPlano)));
  for (let i = 0; i < 3; i++) { assert.ok(Math.abs(c.size[i] - h.size[i] * 0.001) < 1e-6, `tamaño[${i}] ${c.size[i]} vs ${h.size[i]} mm`); assert.ok(Math.abs(c.min[i] - h.min[i] * 0.001) < 1e-6, `min[${i}]`); assert.ok(Math.abs(c.max[i] - h.max[i] * 0.001) < 1e-6, `max[${i}]`); }
  assert.ok(Math.abs(c.size[0] - 0.174999) < 2e-6 && Math.abs(c.size[1] - 0.00025) < 1e-7 && Math.abs(c.size[2] - 0.223499) < 2e-6, JSON.stringify(c.size));
  const a = cajaGLB(GLB.activoPlano); for (let i = 0; i < 3; i++) assert.ok(Math.abs(a.size[i] - c.size[i]) < 1e-6, 'activo: mismo troquel, mismo tamaño');
});
test('GLB · equivalencia semántica (×0,001) con las exportaciones REALES históricas del legacy: sombra plano (737bcd23) y sombra 60° (87aa2e4c)', () => {
  for (const [k, f] of Object.entries(HIST)) { const r = equivalenciaHistorica(GLB[k], fs.readFileSync(path.join(ROOT, f))); assert.ok(r.ok, k + ': ' + r.diferencias.join(' | ')); assert.ok(r.verticesComparados > 500, k); }
});
test('GLB · equivalencia semántica con el RC 3.0.0-rc.1 (reconstruido desde 7258524) en la misma escena: activo plano y 60°; el RC tenía los triángulos degenerados de KI-02', async () => {
  const e0 = B.errors.length; const RC = {}; await abrir('real', 'rc'); assert.equal(await B.eval(`${CTRL}.activar('${CONFIRMACION_ACTIVO}')`), true);
  await B.eval('T.build()'); await B.eval('T.sleep(200)'); RC.activoPlano = await glb(); await B.eval('T.setAll(60)'); RC.activo60 = await glb();
  for (const k of ['activoPlano', 'activo60']) { const v = validarGLB(RC[k]); const r = equivalenciaHistorica(GLB[k], RC[k]); assert.ok(r.ok, k + ': ' + r.diferencias.join(' | ')); assert.ok(r.verticesComparados > 500);
    if (k === 'activoPlano') { assert.equal(r.triangulosDegeneradosHistoricos, 6, 'los 6 triángulos de área nula del RC (los de las 18 normales nulas)'); assert.equal(v.errores.filter((e) => e.codigo === 'ACCESSOR_VECTOR3_NON_UNIT').length, 18, 'KI-02 reproducido en el RC: 18 normales nulas (igual que la exportación real rc-activo-plano.glb)'); } }
  assert.deepEqual(B.errors.slice(e0), []);
});
