// A5.0a — Caracterización del puente CEP ANTES de modularizar: rutas de error de evalScript, extracción, arte y guardado, CEP ausente y KI-24.
// En baseline, panel y bundle se sustituye la respuesta de evalScript caso por caso (navegación limpia en cada caso) y se registra todo lo observable:
// cada mensaje de estado en orden (se intercepta textContent, no solo el último valor), scripts enviados (tipo, longitud, SHA-256), descargas, escrituras de cep.fs, DOM y excepciones.
// Las tres versiones deben ser idénticas; además se fijan explícitamente los comportamientos documentados (incluidos los defectos).
import test, { before, after } from 'node:test'; import assert from 'node:assert/strict'; import fs from 'node:fs'; import path from 'node:path';
import { prepare, PAGE_HELPERS } from './harness.mjs'; import { ROOT } from '../lib/fixtures.mjs';

const NOCEP = `(() => { if (location.search.indexOf('nocep') < 0) return; Object.defineProperty(window, '__adobe_cep__', { configurable: true, get() { return undefined; }, set() {} }); })()`; // el shim no puede instalar el puente
const REC = `(() => {
  const rec = window.__rec = { status: [], art: [], scripts: [], downloads: [], writes: [], reply: null };
  const d = Object.getOwnPropertyDescriptor(Node.prototype, 'textContent');
  const hook = (el, arr) => Object.defineProperty(el, 'textContent', { configurable: true, get() { return d.get.call(this); }, set(v) { arr.push(String(v)); d.set.call(this, v); } });
  hook(document.getElementById('status-area'), rec.status); hook(document.getElementById('art-status'), rec.art);
  const cep = window.__adobe_cep__; // el panel lee window.__adobe_cep__.evalScript en cada llamada: basta con sustituir la propiedad
  if (cep) { const orig = cep.evalScript; cep.evalScript = function (s, cb) { rec.scripts.push(s); const r = rec.reply ? rec.reply(s) : undefined; if (r === undefined) return orig.call(this, s, cb); setTimeout(() => cb(r), 0); }; }
  const click = HTMLAnchorElement.prototype.click; HTMLAnchorElement.prototype.click = function () { if (this.download) { rec.downloads.push({ name: this.download, scheme: String(this.href).split(':')[0] }); return; } return click.call(this); };
  const $ = (id) => document.getElementById(id);
  window.W = { // esperas por condición observable (nunca por tiempo fijo solo)
    status: async (re, ms = 20000) => { for (let i = 0; i < ms / 25; i++) { if (re.test($('status-area').textContent)) return; await T.sleep(25); } throw new Error('estado no alcanzado: ' + re + ' · actual: ' + $('status-area').textContent); },
    art: async (re, ms = 20000) => { for (let i = 0; i < ms / 25; i++) { if (re.test($('art-status').textContent)) return; await T.sleep(25); } throw new Error('estado de arte no alcanzado: ' + re + ' · actual: ' + $('art-status').textContent); },
    cepFs: (writeFile, encoding) => { window.cep = { fs: { writeFile: function (p, data, enc) { rec.writes.push({ path: p, enc: enc, len: String(data).length, head: String(data).slice(0, 12) }); return writeFile(); } } }; if (encoding) window.cep.encoding = encoding; },
  };
})()`;
const SNAP = `(async () => {
  const $ = (id) => document.getElementById(id); const rec = window.__rec;
  const sha = async (s) => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)))).map((b) => b.toString(16).padStart(2, '0')).join('').slice(0, 16);
  const kind = (s) => s.indexOf('OK_FROM_ILLUSTRATOR') > -1 ? 'test' : s.indexOf('tesseract_art') > -1 ? 'arte' : s.indexOf('saveDialog') > -1 ? 'guardar' : s.indexOf('outerBoundary') > -1 ? 'extraer' : 'otro';
  const out = $('output-json').value;
  return { estado: $('status-area').textContent, historial: rec.status.slice(), arte: [$('art-status').textContent, $('art-source-pill').textContent], historialArte: rec.art.slice(),
    errorMsg: $('error-msg').style.display, deshabilitados: ['test-btn', 'extract-btn', 'preview-btn', 'continue-3d-btn', 'back-btn', 'export-3d-btn', 'export-glb-btn'].map((id) => $(id).disabled),
    vistas: [$('import-view').style.display, $('three-view').style.display], salida: out.length + ':' + await sha(out), salidaVisible: $('output-json').style.display,
    validacion: [$('validation-status').textContent, $('validation-status').className], problemas: $('problems-list').children.length, log: $('log-area').textContent, depuracionAbierta: $('debug-details').open,
    stock: [$('material-preset').value, $('material-pill').textContent], scripts: await Promise.all(rec.scripts.map(async (s) => kind(s) + ':' + s.length + ':' + await sha(s))),
    descargas: rec.downloads, escrituras: rec.writes, paneles: window.__dbg ? __dbg.panels : null };
})()`;

const SAVE_DONE = String.raw`/GLB exported from current 3D pose|GLB export failed/`;
const ART_DONE = String.raw`/^(?!Searching)/`;
const glb = (setup) => ({ build: true, act: `${setup}; T.$('export-glb-btn').click(); await W.status(${SAVE_DONE}); await T.sleep(100);` });
const art = (reply) => ({ build: true, act: `__rec.reply = (s) => s.indexOf('tesseract_art') > -1 ? ${reply} : undefined; T.$('refresh-art-btn').click(); await T.sleep(50); await W.art(${ART_DONE});` });
const extract = (reply, extra = '') => ({ act: `T.$('debug-toggle').checked = true; T.fire(T.$('debug-toggle'), 'change'); __rec.reply = (s) => s.indexOf('outerBoundary') > -1 ? ${reply} : undefined;
  T.$('extract-btn').click(); await W.status(/^(?!Extracting)/); ${extra}` });
const AFTER_ERROR = `await T.sleep(50); T.$('preview-btn').click(); T.$('continue-3d-btn').click(); await T.sleep(50);`;
const CASES = {
  'conexion-ok': { act: `T.$('test-btn').click(); await W.status(/^(?!Testing)/);` },
  'conexion-vacia': { act: `__rec.reply = (s) => s.indexOf('OK_FROM_ILLUSTRATOR') > -1 ? '' : undefined; T.$('test-btn').click(); await W.status(/^(?!Testing)/);` },
  'conexion-evalerror': { act: `__rec.reply = (s) => s.indexOf('OK_FROM_ILLUSTRATOR') > -1 ? 'EvalScript error.' : undefined; T.$('test-btn').click(); await W.status(/^(?!Testing)/);` },
  'extraccion-ok': extract('undefined'),
  'extraccion-evalerror': extract(`'EvalScript error.'`, AFTER_ERROR),
  'extraccion-vacia': extract(`''`),
  'extraccion-null': extract(`'null'`),
  'extraccion-undefined': extract(`'undefined'`),
  'extraccion-json-invalido': extract(`'{"version":'`, AFTER_ERROR),
  'extraccion-error-sin-documento': extract(`'{"error":"No document open"}'`, AFTER_ERROR),
  'extraccion-error-capa': extract(`'{"error":"CUT layer not found. Expected: cuts/cut/corte/troquel/die"}'`, AFTER_ERROR),
  'sin-extraer': { act: `T.$('preview-btn').click(); T.$('continue-3d-btn').click(); await T.sleep(50);` },
  'arte-antes-de-3d': { act: `T.$('refresh-art-btn').click(); await T.sleep(100);` },
  'exportar-antes-de-3d': { act: `T.$('export-glb-btn').click(); await W.status(${SAVE_DONE});` },
  'ki24-stock-antes-de-3d': { act: `const s = T.$('material-preset'); s.value = 'kraft'; T.fire(s, 'change'); await T.sleep(100);` },
  'stock-despues-de-3d': { build: true, act: `const s = T.$('material-preset'); s.value = 'gray'; T.fire(s, 'change'); await T.sleep(150);` },
  'arte-evalerror': art(`'EvalScript error.'`),
  'arte-vacio': art(`''`),
  'arte-error': art(`'{"error":"Artwork export failed: prueba line:1"}'`),
  'arte-json-invalido': art(`'{"ok":'`),
  'arte-ninguno': art(`'{"ok":true,"mode":"none","front":null,"back":null}'`),
  'arte-textura-inexistente': art(`'{"ok":true,"mode":"layers","front":{"path":"/nonexistent/tesseract_a5.png","rect":{"left":0,"top":100,"right":140,"bottom":0,"width":140,"height":100},"label":"front","exportScale":100},"back":null}'`),
  'guardar-cancelado': glb(`__rec.reply = (s) => s.indexOf('saveDialog') > -1 ? '' : undefined`),
  'guardar-evalerror': glb(`__rec.reply = (s) => s.indexOf('saveDialog') > -1 ? 'EvalScript error.' : undefined`),
  'guardar-respaldo-sin-cep-fs': glb(`delete window.cep; __rec.reply = (s) => s.indexOf('saveDialog') > -1 ? '/tmp/tesseract_a5.glb' : undefined`),
  'guardar-error-escritura': glb(`W.cepFs(() => ({ err: 3 })); __rec.reply = (s) => s.indexOf('saveDialog') > -1 ? '/tmp/tesseract_a5.glb' : undefined`),
  'guardar-error-sin-respuesta': glb(`W.cepFs(() => undefined); __rec.reply = (s) => s.indexOf('saveDialog') > -1 ? '/tmp/tesseract_a5.glb' : undefined`),
  'guardar-ok': glb(`W.cepFs(() => ({ err: 0 })); __rec.reply = (s) => s.indexOf('saveDialog') > -1 ? '/tmp/tesseract_a5.glb' : undefined`),
  'guardar-ok-err-cadena-y-encoding': glb(`W.cepFs(() => ({ err: '0' }), { base64: 'b64-minuscula' }); __rec.reply = (s) => s.indexOf('saveDialog') > -1 ? '/tmp/tesseract_a5.glb' : undefined`),
  'sin-cep': { nocep: true, act: `T.$('test-btn').click(); T.$('extract-btn').click(); await T.sleep(100);` },
};

let H; const res = { base: {}, fix: {}, dist: {} }; const names = { base: 'baseline', fix: 'panel', dist: 'bundle' };
before(async () => { H = await prepare({ initScript: NOCEP }); }); after(async () => { await H?.close(); process.exit(process.exitCode ?? 0); });
async function run(t, name, c) {
  await H.browser.goto(`${H.url}/${t}-caja/index.html${c.nocep ? '?nocep=1' : ''}`); await H.browser.eval(`new Promise(r=>setTimeout(r,200))`);
  const ev = (code) => H.browser.eval(code); await ev(PAGE_HELPERS); await ev(REC); const e0 = H.browser.errors.length;
  if (c.build) { await ev('T.build()'); await ev(`W.art(${ART_DONE})`); await ev(`(async () => { await T.sleep(100); __rec.status.length = 0; __rec.art.length = 0; __rec.scripts.length = 0; })()`); }
  await ev(`(async () => { ${c.act} })()`);
  const snap = await ev(SNAP); snap.excepciones = H.browser.errors.slice(e0).map((e) => String(e).split('\n')[0]); return snap;
}
for (const t of ['base', 'fix', 'dist']) test(`Puente CEP · ${names[t]}: ${Object.keys(CASES).length} casos (errores de evalScript, extracción, arte, guardado, CEP ausente, KI-24)`, async () => {
  for (const [name, c] of Object.entries(CASES)) res[t][name] = await run(t, name, c);
});
for (const t of ['fix', 'dist']) test(`Puente CEP · ${names[t]} idéntico al baseline en TODOS los casos (estado, historial, scripts, descargas, escrituras, DOM, excepciones)`, () => {
  for (const name of Object.keys(CASES)) assert.deepEqual(res[t][name], res.base[name], names[t] + ' · ' + name);
});
test('Puente CEP · comportamientos documentados del baseline (se preservan, incluidos los defectos)', () => {
  fs.mkdirSync(path.join(ROOT, 'tests/results'), { recursive: true }); fs.writeFileSync(path.join(ROOT, 'tests/results/bridge-a5.json'), JSON.stringify(res.base, null, 1));
  const b = res.base; const noErr = (n) => assert.deepEqual(b[n].excepciones, [], n);
  assert.equal(b['conexion-ok'].estado, 'OK_FROM_ILLUSTRATOR'); assert.equal(b['conexion-vacia'].estado, 'No result returned'); assert.equal(b['conexion-evalerror'].estado, 'EvalScript error.');
  assert.equal(b['extraccion-ok'].estado, 'Extraction complete'); assert.equal(b['extraccion-ok'].salidaVisible, 'block'); assert.equal(b['extraccion-ok'].deshabilitados[3], false, 'continuar habilitado');
  assert.equal(b['extraccion-evalerror'].historial.slice(0, 2).join(' | '), 'Extracting... | Error: EvalScript error.'); assert.equal(b['extraccion-vacia'].estado, 'Error: No result returned');
  assert.equal(b['extraccion-null'].estado, 'Error: null'); assert.equal(b['extraccion-undefined'].estado, 'Error: undefined');
  assert.match(b['extraccion-json-invalido'].historial[1], /^Parse error: /); assert.match(b['extraccion-json-invalido'].log, /Parse error: /);
  assert.equal(b['extraccion-error-sin-documento'].historial[1], 'No document open'); assert.equal(b['extraccion-error-capa'].salidaVisible, 'block');
  // tras un error de extracción «Continue to 3D» queda deshabilitado: su clic no produce mensaje; «Preview 2D» sí responde
  for (const n of ['extraccion-evalerror', 'extraccion-json-invalido', 'extraccion-error-sin-documento', 'extraccion-error-capa', 'sin-extraer']) { assert.equal(b[n].historial.at(-1), 'Nothing to preview. Extract first.', n); assert.equal(b[n].deshabilitados[3], true, n); }
  assert.deepEqual(b['arte-antes-de-3d'].arte, ['Build 3D first, then refresh art.', 'No art']); assert.equal(b['exportar-antes-de-3d'].estado, 'GLB export failed: Build 3D first');
  // KI-24 (estático en A5 propuesta; aquí se REPRODUCE): cambiar el stock antes de 3D aplica el preset y luego lanza ReferenceError
  assert.deepEqual(b['ki24-stock-antes-de-3d'].excepciones.map((e) => e.replace(/^Uncaught /, '')), ['ReferenceError: buildChildrenOfMap is not defined']); assert.equal(b['ki24-stock-antes-de-3d'].stock[0], 'kraft');
  noErr('stock-despues-de-3d'); assert.equal(b['stock-despues-de-3d'].stock[0], 'gray');
  assert.deepEqual(b['arte-evalerror'].arte, ['Artwork load failed: EvalScript error.', 'Art error']); assert.deepEqual(b['arte-vacio'].arte, ['Artwork load failed: No result returned', 'Art error']);
  assert.deepEqual(b['arte-error'].arte, ['Artwork load failed: Artwork export failed: prueba line:1', 'Art error']); assert.match(b['arte-json-invalido'].arte[0], /^Artwork load failed: /);
  assert.deepEqual(b['arte-ninguno'].arte, ['No Front/Back or Tiro/Retiro art detected.', 'No art']); assert.deepEqual(b['arte-textura-inexistente'].arte, ['Artwork load failed: undefined', 'Art error'], 'KI-26: el error de carga de textura es un Event sin message');
  // Guardado: el mensaje propio de exportGLB lo SOBRESCRIBE el manejador del botón (KI-25): cancelar termina mostrando «GLB exported from current 3D pose»
  assert.deepEqual(b['guardar-cancelado'].historial, ['Exporting GLB…', 'GLB export cancelled', 'GLB exported from current 3D pose']); assert.deepEqual(b['guardar-cancelado'].escrituras, []);
  assert.deepEqual(b['guardar-evalerror'].historial.slice(-1), ['GLB export failed: Illustrator save dialog failed']); assert.equal(b['guardar-evalerror'].depuracionAbierta, true);
  assert.deepEqual(b['guardar-respaldo-sin-cep-fs'].descargas, [{ name: 'tesseract_model.glb', scheme: 'blob' }]); assert.deepEqual(b['guardar-respaldo-sin-cep-fs'].historial.slice(1), ['GLB exported with browser download fallback', 'GLB exported from current 3D pose']);
  assert.equal(b['guardar-error-escritura'].estado, 'GLB export failed: Could not save GLB file (err 3)'); assert.equal(b['guardar-error-sin-respuesta'].estado, 'GLB export failed: Could not save GLB file');
  assert.equal(b['guardar-ok'].historial[1], 'GLB saved: /tmp/tesseract_a5.glb'); assert.equal(b['guardar-ok'].escrituras[0].enc, 'Base64'); assert.equal(b['guardar-ok'].escrituras[0].head, 'Z2xURgIAAACA'); assert.equal(b['guardar-ok'].estado, 'GLB exported from current 3D pose');
  assert.equal(b['guardar-ok-err-cadena-y-encoding'].escrituras[0].enc, 'b64-minuscula'); assert.equal(b['guardar-ok-err-cadena-y-encoding'].historial[1], 'GLB saved: /tmp/tesseract_a5.glb');
  assert.equal(b['sin-cep'].estado, 'CEP bridge not found.'); assert.equal(b['sin-cep'].errorMsg, 'block'); assert.deepEqual(b['sin-cep'].deshabilitados, [true, true, true, true, true, true, false]); assert.deepEqual(b['sin-cep'].scripts, []);
  for (const n of Object.keys(CASES)) if (n !== 'ki24-stock-antes-de-3d') noErr(n);
});
