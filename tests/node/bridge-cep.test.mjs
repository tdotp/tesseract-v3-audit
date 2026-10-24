// A5.3 — Contrato de src/bridge/cep.js: no toca window al cargarse (lectura perezosa), delega en window.__adobe_cep__ como llamada de método,
// y evalScriptJSON / pathToFileURL se comportan EXACTAMENTE como las funciones del baseline (extraídas por nombre) para las mismas entradas.
import test from 'node:test'; import assert from 'node:assert/strict'; import vm from 'node:vm'; import fs from 'node:fs'; import path from 'node:path'; import { pathToFileURL as nodeFileURL } from 'node:url';
import { TARGETS, extractFunctions } from '../lib/legacy.mjs';
delete globalThis.window; // el módulo debe poder cargarse sin window
const cep = await import(nodeFileURL(path.join(path.dirname(TARGETS.src), 'bridge/cep.js')).href);
const fns = extractFunctions(fs.readFileSync(TARGETS.baseline, 'utf8'));
const ctx = { window: {}, Promise, JSON, Error, String, encodeURI };
const base = vm.runInNewContext(`(function(){ ${fns.get('pathToFileURL')}\n${fns.get('evalScriptJSON')}\n return { pathToFileURL, evalScriptJSON }; })()`, ctx);
const reply = (r) => ({ calls: [], evalScript(s, cb) { this.calls.push(s); setTimeout(() => cb(r), 0); } });
const settle = (p) => p.then((v) => ({ ok: JSON.stringify(v) }), (e) => ({ err: e.message }));

test('cargar el módulo no lee window; hasCep refleja window.__adobe_cep__ en el momento de la llamada', () => {
  assert.deepEqual(Object.keys(cep).sort(), ['evalScript', 'evalScriptJSON', 'hasCep', 'pathToFileURL']);
  globalThis.window = {}; assert.equal(cep.hasCep(), false); window.__adobe_cep__ = reply('x'); assert.equal(cep.hasCep(), true); delete globalThis.window;
});
test('evalScript delega (script, callback) tal cual, como método de __adobe_cep__, y no devuelve nada', () => {
  const seen = []; globalThis.window = { __adobe_cep__: { evalScript(s, cb) { seen.push([this === window.__adobe_cep__, s, cb]); return 'ignorado'; } } };
  const cb = () => {}; assert.equal(cep.evalScript('SCRIPT', cb), undefined); assert.deepEqual(seen, [[true, 'SCRIPT', cb]]); delete globalThis.window;
});
test('evalScriptJSON = baseline para todas las respuestas (vacía, null, undefined, EvalScript error., {error}, JSON inválido, válido)', async () => {
  for (const r of ['', null, undefined, 'null', 'undefined', 'EvalScript error.', '{"error":"No document open"}', '{"ok":', '{"ok":true,"mode":"none"}', '[]', '0', '"texto"']) {
    globalThis.window = { __adobe_cep__: reply(r) }; ctx.window.__adobe_cep__ = reply(r);
    const got = await settle(cep.evalScriptJSON('S')), want = await settle(base.evalScriptJSON('S'));
    assert.deepEqual(got, want, JSON.stringify(r)); assert.deepEqual(window.__adobe_cep__.calls, ['S']);
  }
  delete globalThis.window;
});
test('pathToFileURL = baseline (POSIX, Windows, file://, vacío, espacios y caracteres no ASCII)', () => {
  for (const p of ['', null, undefined, '/tmp/a b/arte.png', 'C:\\Users\\x\\Art Front.png', 'file:///ya/es/url.png', 'FILE://X', 'rel/ruta.png', '/tmp/ñandú #1%.png', 0]) assert.equal(cep.pathToFileURL(p), base.pathToFileURL(p), String(p));
});
