// A4 — tools/a4/cdp-run.mjs contra Chrome headless real (DevTools en 127.0.0.1) con el bundle de dist/: identidad, consola, ciclos de GPU y salvaguardas del objetivo.
// LÍMITE: no es el CEP real; el puente CEP está simulado. Prueba la HERRAMIENTA, no el panel en Illustrator.
import test, { before, after } from 'node:test'; import assert from 'node:assert/strict'; import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
import { prepare } from './harness.mjs'; import { serveDir } from './cdp.mjs'; import { ROOT } from '../lib/fixtures.mjs'; import { build } from '../../tools/build/build.mjs';
import { run, pickTarget, parseArgs } from '../../tools/a4/cdp-run.mjs';
let H, plain, tmp, out; const T = (url) => ({ type: 'page', url, title: 'x', webSocketDebuggerUrl: 'ws://x' });
before(async () => { await build({ out: ROOT + '/dist' }); H = await prepare(); tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'tess-a4cdp-')); out = path.join(tmp, 'out'); fs.cpSync(ROOT + '/dist', path.join(tmp, 'site/tesseract-v3'), { recursive: true }); plain = await serveDir(path.join(tmp, 'site')); });
after(async () => { await plain.close(); await H.close(); fs.rmSync(tmp, { recursive: true, force: true }); });
const a = (cmd, extra = []) => [cmd, `--port=${H.browser.port}`, `--out=${out}`, ...extra];

test('selección de objetivo: exactamente 1, nunca el panel del plugin instalado, ni 0 ni varios', () => {
  assert.equal(pickTarget([T('file:///Users/x/Library/Application%20Support/Adobe/CEP/extensions/tesseract-v3/index.html')], 'tesseract-v3').url.includes('tesseract-v3'), true);
  assert.throws(() => pickTarget([T('file:///Library/Application%20Support/Adobe/CEP/extensions/tesseract/index.html')], 'tesseract'), /exactamente 1 objetivo/);
  assert.throws(() => pickTarget([T('file:///a/extensions/tesseract/index.html'), T('file:///b/extensions/tesseract-v3/index.html')], 'tesseract/'), /exactamente 1/);
  assert.equal(pickTarget([T('file:///a/extensions/tesseract/index.html'), T('file:///b/extensions/tesseract-v3/index.html')], 'tesseract-v3').url, 'file:///b/extensions/tesseract-v3/index.html');
  assert.throws(() => pickTarget([T('http://a/tesseract-v3/i.html'), T('http://b/tesseract-v3/i.html')], 'tesseract-v3'), /exactamente 1/); assert.throws(() => pickTarget([], 'tesseract-v3'), /\(ninguno\)/);
  assert.throws(() => parseArgs(['identity', '--port=0']), /puerto/); assert.throws(() => parseArgs(['identity', '--host=evil']), /desconocida/);
});
test('identity: el bundle de dist/ servido como tesseract-v3 se reconoce (huella de main.js = dist/SHA256SUMS); un main.js alterado se detecta', async () => {
  await H.browser.goto(plain.url + '/tesseract-v3/index.html'); await H.browser.eval('new Promise(r=>setTimeout(r,300))');
  const r = await run(a('identity', ['--simulated', '--url-match=tesseract-v3'])); assert.equal(r.veredicto.ok, true, JSON.stringify(r.veredicto.checks.filter((c) => !c.ok)));
  assert.equal(r.identidad.three, '132'); assert.equal(r.identidad.mainJs.sha256, fs.readFileSync(ROOT + '/dist/SHA256SUMS', 'utf8').split('\n').find((l) => /\.\/main\.js$/.test(l)).split(/\s+/)[0]);
  // sin --simulated debe EXIGIR el puente CEP, el id de extensión, el host ILST y Chromium 99 (aquí no existen)
  const real = await run(a('identity', ['--url-match=tesseract-v3'])); assert.equal(real.veredicto.ok, false); const fails = real.veredicto.checks.filter((c) => !c.ok).map((c) => c.name); for (const n of ['puente CEP presente', 'id de extensión = com.tato.tesseract.v3.panel', 'host = ILST (Illustrator)', 'Chromium 99 (CEP 12)']) assert.ok(fails.includes(n), n);
  fs.appendFileSync(path.join(tmp, 'site/tesseract-v3/main.js'), '\n// alterado\n'); await H.browser.goto(plain.url + '/tesseract-v3/index.html'); await H.browser.eval('new Promise(r=>setTimeout(r,300))');
  const bad = await run(a('identity', ['--simulated', '--url-match=tesseract-v3'])); assert.equal(bad.veredicto.ok, false); assert.ok(bad.veredicto.checks.some((c) => !c.ok && /SHA-256/.test(c.name)));
  fs.copyFileSync(ROOT + '/dist/main.js', path.join(tmp, 'site/tesseract-v3/main.js'));
});
test('console: recoge errores y excepciones durante la ventana y los cuenta; sin errores da 0', async () => {
  await H.browser.goto(plain.url + '/tesseract-v3/index.html'); await H.browser.eval('new Promise(r=>setTimeout(r,200))');
  const quiet = await run(a('console', ['--seconds=1', '--url-match=tesseract-v3'])); assert.equal(quiet.errores, 0);
  const p = run(a('console', ['--seconds=2', '--url-match=tesseract-v3'])); await new Promise((r) => setTimeout(r, 500)); await H.browser.eval(`console.error('boom-a4'); setTimeout(() => { throw new Error('exc-a4'); }, 10); 1`); const r = await p;
  assert.ok(r.errores >= 2, JSON.stringify(r.eventos)); assert.ok(r.eventos.some((e) => /boom-a4/.test(e.texto))); assert.ok(r.eventos.some((e) => /exc-a4/.test(e.texto)));
});
test('leak: inyecta leak_cycles.js en el panel y devuelve el resultado (con el bundle: sin crecimiento acumulativo)', async () => {
  await H.open('dist-caja'); const r = await run(a('leak', ['--cycles=3', '--url-match=dist-caja'])); const res = r.resultado; assert.equal(res.ciclos, 3);
  const worst = res.peor_delta_ciclos_2_en_adelante || res.peor_delta || Object.entries(res).find(([k]) => /peor/.test(k))?.[1]; assert.ok(worst, 'el resultado debe incluir el peor delta'); assert.deepEqual([worst.tex, worst.buf, worst.vao, worst.prog].map(Number), [0, 0, 0, 0]);
  assert.ok(fs.readdirSync(out).some((f) => f.startsWith('cdp-leak-')));
});
test('measure: inyecta measure_ui.js y devuelve métricas del panel (estado, FPS)', async () => {
  await H.open('dist-caja'); const r = await run(a('measure', ['--url-match=dist-caja'])); assert.ok(r.resultado.estado, 'estado del panel'); assert.ok(JSON.stringify(r.resultado).length > 500);
});
test('targets: lista los objetivos (solo lectura) y se niega si el puerto no responde', async () => {
  const t = await run(['targets', `--port=${H.browser.port}`]); assert.ok(t.targets.length >= 1); await assert.rejects(() => run(['targets', '--port=1']), /no se pudo consultar DevTools/);
});
