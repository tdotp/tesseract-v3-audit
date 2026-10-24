// A5.4 — Contrato de src/bridge/fs.js: askSavePathViaIllustrator y saveBlobWithDialog se comportan EXACTAMENTE como las del baseline (extraídas por nombre)
// en todos los caminos del guardado (cancelar, error del diálogo, sin cep.fs → descarga, escritura correcta, err ≠ 0, err '0', sin respuesta, codificaciones),
// con el mismo script de diálogo, los mismos argumentos a cep.fs.writeFile y las mismas descargas. El navegador real lo cubre bridge.test.mjs.
import test from 'node:test'; import assert from 'node:assert/strict'; import vm from 'node:vm'; import fs from 'node:fs'; import path from 'node:path'; import { pathToFileURL as nodeFileURL } from 'node:url';
import { TARGETS, extractFunctions, extractScripts } from '../lib/legacy.mjs';
const mod = await import(nodeFileURL(path.join(path.dirname(TARGETS.src), 'bridge/fs.js')).href);
const fns = extractFunctions(fs.readFileSync(TARGETS.baseline, 'utf8')); const SAVE = extractScripts(TARGETS.baseline).save;

function env(dialogReply, cepFs) { // entorno observable idéntico para ambos lados
  const log = { scripts: [], writes: [], downloads: [] };
  class FileReader { readAsDataURL(b) { b.arrayBuffer().then((ab) => { this.result = 'data:application/octet-stream;base64,' + Buffer.from(ab).toString('base64'); this.onloadend(); }); } }
  const anchor = () => ({ click() { log.downloads.push({ name: this.download, href: this.href }); } });
  const window = { __adobe_cep__: { evalScript(s, cb) { log.scripts.push(s); setTimeout(() => cb(dialogReply), 0); } } };
  if (cepFs) window.cep = { fs: { writeFile(p, d, e) { log.writes.push([p, d, e]); return cepFs.res; } }, ...(cepFs.encoding ? { encoding: cepFs.encoding } : {}) };
  const g = { window, FileReader, document: { createElement: anchor, body: { appendChild() {}, removeChild() {} } }, URL: { createObjectURL: () => 'blob:x', revokeObjectURL() {} }, setTimeout, Promise, Error, String };
  return { g, log };
}
async function runModule(e, blob) { const keys = Object.keys(e.g); const prev = Object.fromEntries(keys.map((k) => [k, globalThis[k]]));
  for (const k of ['window', 'FileReader', 'document']) globalThis[k] = e.g[k]; const URLprev = globalThis.URL; globalThis.URL = { ...e.g.URL };
  try { return await mod.saveBlobWithDialog(blob, 'tesseract_model.glb').then((v) => ({ ok: v }), (err) => ({ err: err.message })); }
  finally { for (const k of ['window', 'FileReader', 'document']) if (prev[k] === undefined) delete globalThis[k]; else globalThis[k] = prev[k]; globalThis.URL = URLprev; } }
async function runBaseline(e, blob) { const api = vm.runInNewContext(`(function(){ ${['triggerDownload', 'blobToBase64', 'askSavePathViaIllustrator', 'saveBlobWithDialog'].map((n) => fns.get(n)).join('\n')}\n return { saveBlobWithDialog }; })()`, e.g);
  return api.saveBlobWithDialog(blob, 'tesseract_model.glb').then((v) => ({ ok: JSON.parse(JSON.stringify(v)) }), (err) => ({ err: err.message })); }

const CASES = {
  cancelado: ['', { res: { err: 0 } }], 'error del diálogo': ['EvalScript error.', { res: { err: 0 } }], 'sin cep.fs (descarga)': ['/tmp/a.glb', null],
  'escritura correcta': ['/tmp/a.glb', { res: { err: 0 } }], 'err 3': ['/tmp/a.glb', { res: { err: 3 } }], "err '0'": ['/tmp/a.glb', { res: { err: '0' } }],
  'sin respuesta': ['/tmp/a.glb', { res: undefined }], 'encoding base64 en minúscula': ['/tmp/a.glb', { res: { err: 0 }, encoding: { base64: 'b64' } }], 'diálogo devuelve null': [null, { res: { err: 0 } }],
};
test('el módulo exporta las cuatro funciones del guardado', () => {
  assert.deepEqual(Object.keys(mod).sort(), ['askSavePathViaIllustrator', 'blobToBase64', 'saveBlobWithDialog', 'triggerDownload']);
});
for (const [name, [reply, cepFs]] of Object.entries(CASES)) test(`saveBlobWithDialog = baseline · ${name} (resultado, script, escrituras, descargas)`, async () => {
  const blob = new Blob([Buffer.from('glTF\u0002\u0000\u0000\u0000prueba')]);
  const a = env(reply, cepFs), b = env(reply, cepFs); const got = await runModule(a, blob), want = await runBaseline(b, blob);
  assert.deepEqual(got, want); assert.deepEqual(a.log, b.log); assert.deepEqual(a.log.scripts, [SAVE]);
});
