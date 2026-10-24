// A5-CEP — tools/a4/a5-observar.mjs contra Chrome headless real (DevTools en 127.0.0.1) con el bundle construido desde src/ y el puente CEP simulado del arnés.
// LÍMITE: prueba la HERRAMIENTA (pasiva, registro fiel, veredicto, restauración), no el diálogo real de Illustrator.
import test, { before, after } from 'node:test'; import assert from 'node:assert/strict'; import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import crypto from 'node:crypto';
import { prepare, PAGE_HELPERS } from './harness.mjs'; import { run, parseArgs, veredicto, EXPECTED_SCRIPTS } from '../../tools/a4/a5-observar.mjs';
let H, tmp, glbFile; const ev = (c) => H.browser.eval(c);
const a = (cmd, extra = []) => [cmd, `--port=${H.browser.port}`, '--url-match=dist-caja', `--out=${path.join(tmp, 'out')}`, ...extra];
before(async () => { H = await prepare(); tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'tess-a5obs-')); glbFile = path.join(tmp, 'a5-plano.glb'); fs.writeFileSync(glbFile, 'contenido de prueba'); });
after(async () => { await H.close(); fs.rmSync(tmp, { recursive: true, force: true }); process.exit(process.exitCode ?? 0); });
// diálogo simulado («Save GLB» de Illustrator): responde lo que diga window.__dlg; cep.fs.writeFile simulado (no escribe en disco)
const SIM = `(() => { const shim = window.__adobe_cep__.evalScript; window.__adobe_cep__.evalScript = function (s, cb) { if (s.indexOf('saveDialog') > -1) return setTimeout(() => cb(window.__dlg), 0); return shim.call(this, s, cb); };
  window.cep = { fs: { writeFile: function (p, d, e) { window.__w = (window.__w || []).concat([{ p: p, len: String(d).length, e: e }]); return { err: 0 }; } }, encoding: { Base64: 'Base64' } }; return true; })()`;
const exportWith = (reply) => `(async () => { window.__dlg = ${JSON.stringify(reply)}; T.$('export-glb-btn').click(); for (let i = 0; i < 400; i++) { if (/GLB exported from current 3D pose|GLB export failed/.test(T.$('status-area').textContent)) break; await T.sleep(25); } await T.sleep(50); return true; })()`;

test('argumentos: solo instalar|leer, puerto válido, opciones conocidas', () => {
  assert.throws(() => parseArgs(['borrar']), /uso/); assert.throws(() => parseArgs(['leer', '--port=0']), /puerto/); assert.throws(() => parseArgs(['leer', '--host=x']), /desconocida/); assert.equal(parseArgs(['leer', '--restaurar']).restore, true);
});
test('observación pasiva del flujo real del panel: Test Connection, extracción, arte, guardar (ruta) y cancelar; textos ExtendScript = baseline; KI-25 visible; restauración', async () => {
  await H.open('dist-caja'); await ev(PAGE_HELPERS); await ev(SIM); const orig = await ev(`(window.__origEval = window.__adobe_cep__.evalScript, window.__origWrite = window.cep.fs.writeFile, true)`);
  assert.equal(orig, true); await assert.rejects(() => run(a('leer')), /no hay observador/);
  assert.equal(await run(a('instalar')), 'instalado'); assert.equal(await run(a('instalar')), 'ya estaba instalado');
  await ev(`(async () => { T.$('test-btn').click(); await T.sleep(100); await T.build(); return true; })()`);
  await ev(exportWith(glbFile)); await ev(exportWith(''));
  const r = await run(a('leer', ['--restaurar']));
  assert.deepEqual(r.veredicto.tiposDeScriptVistos, ['arte', 'extraer', 'guardar', 'test']); assert.equal(r.veredicto.ok, true, JSON.stringify(r.veredicto.checks.filter((c) => !c.ok)));
  assert.equal(r.scripts.filter((s) => s.tipo === 'guardar').length, 2);
  const tail = r.historialEstado.slice(-6); assert.deepEqual(tail, ['Exporting GLB…', 'GLB saved: ' + glbFile, 'GLB exported from current 3D pose', 'Exporting GLB…', 'GLB export cancelled', 'GLB exported from current 3D pose'], 'KI-25 visible en el historial');
  assert.equal(r.escrituras.length, 1); assert.equal(r.escrituras[0].ruta, glbFile); assert.equal(r.escrituras[0].enc, 'Base64'); assert.equal(r.escrituras[0].longitudBase64, 40792, 'mismo GLB que la batería del puente (pasivo)');
  assert.equal(r.escrituras[0].archivo.sha256, crypto.createHash('sha256').update(fs.readFileSync(glbFile)).digest('hex')); assert.ok(fs.existsSync(r.archivo));
  assert.deepEqual(await ev(`[window.__a5rec === undefined, window.__adobe_cep__.evalScript === window.__origEval, window.cep.fs.writeFile === window.__origWrite, Object.prototype.hasOwnProperty.call(T.$('status-area'), 'textContent')]`), [true, true, true, false], 'restaurado');
  assert.deepEqual(await ev(`window.__w.length`), 1, 'el panel escribió exactamente una vez (el observador no duplica ni bloquea)');
});
test('veredicto: un texto ExtendScript alterado, desconocido o una escritura fallida se marcan como FALLA', () => {
  const ok = { scripts: Object.entries(EXPECTED_SCRIPTS).map(([tipo, [longitud, sha256_16]]) => ({ tipo, longitud, sha256_16 })), escrituras: [{ ruta: '/x', err: 0, archivo: { sha256: 'a' } }] };
  assert.equal(veredicto(ok).ok, true);
  assert.equal(veredicto({ ...ok, scripts: [{ tipo: 'extraer', longitud: 5537, sha256_16: 'bd4c215d56fb4cdc' }] }).ok, false);
  assert.equal(veredicto({ ...ok, scripts: [{ tipo: 'otro', longitud: 10, sha256_16: '0' }] }).ok, false);
  assert.equal(veredicto({ ...ok, escrituras: [{ ruta: '/x', err: 3 }] }).ok, false);
});
