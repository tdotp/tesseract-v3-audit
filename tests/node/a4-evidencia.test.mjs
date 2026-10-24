// Evidencia de A4 (primera carga REAL del bundle V3 en Illustrator 30.8.2 / CEP 12.1.1 / Chromium 99.0.4844.84, 2026-10-23) fijada como prueba: docs/fase1/a4-real/.
import test from 'node:test'; import assert from 'node:assert/strict'; import fs from 'node:fs'; import crypto from 'node:crypto'; import { ROOT } from '../lib/fixtures.mjs'; import { summarizeFile } from '../lib/glb.mjs';
const D = ROOT + '/docs/fase1/a4-real'; const J = (f) => JSON.parse(fs.readFileSync(`${D}/${f}`, 'utf8')); const pick = (pre) => fs.readdirSync(D).filter((f) => f.startsWith(pre) && f.endsWith('.json')).sort();
const sha = (f) => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex'); const MAIN = 'bc2606957595d086ac8b81d2e3af019e0c1d44344bd8c273c9ddb45bb159b5bd';
const P8 = 'P-8 exportar GLB (diálogo sustituido por ruta en /private/tmp/tesseract_a4/)'; const caja = J(pick('paridad-caja-')[0]); const arte = pick('paridad-arte-').map(J);

test('A4 · instalación autorizada y huellas: el registro coincide con dist/ y con la huella fijada del bundle', () => {
  const r = J('install-record.json'); assert.equal(r.autorizacion_usuario, '2026-10-23'); assert.equal(r.puerto_debug, 8088); assert.equal(r.huellas['main.js'], MAIN);
  assert.equal(r.huellas['main.js'], fs.readFileSync(ROOT + '/tests/golden/dist.SHA256SUMS', 'utf8').split('\n').find((l) => /main\.js$/.test(l)).split(/\s+/)[0]);
});
test('A4 · identidad del panel CARGADO en el CEP real (id, host, Chromium 99, three r132, SHA-256 de main.js = dist/), en las dos comprobaciones', () => {
  for (const f of pick('cdp-identity-')) { const j = J(f); assert.equal(j.simulated, false, f); assert.equal(j.veredicto.ok, true, JSON.stringify(j.veredicto.checks.filter((c) => !c.ok))); const i = j.identidad;
    assert.equal(i.extensionId, 'com.tato.tesseract.v3.panel'); assert.equal(i.hostEnvironment.appName, 'ILST'); assert.equal(i.hostEnvironment.appVersion, '30.8.2'); assert.match(i.ua, /Chrome\/99\.0\.4844\.84 AdobeCEP\/12\.1\.1/); assert.equal(i.three, '132'); assert.equal(i.mainJs.sha256, MAIN); assert.match(i.href, /extensions\/tesseract-v3\/index\.html$/); }
});
test('A4 · P-0…P-6 en el panel real: conexión, 0 avisos, 11 de 13 paneles (KI-04/KI-22), base, plegado, espesor y presets', () => {
  const p = caja.pasos; assert.equal(p['P-0 test de conexión'].status, 'OK_FROM_ILLUSTRATOR'); const e = p['P-1 extracción y validación']; assert.equal(e.status, 'Extraction complete'); assert.match(e.validacion, /No problems found/); assert.deepEqual(e.avisos, []);
  assert.ok(p['P-2 paso a 3D'].logPaneles.some((l) => /keeping 11 of 13 panels/.test(l))); const b = p['P-3 base']; assert.deepEqual([b.baseInicial, b.baseFinal, b.opciones], ['0', '0', 11]); assert.match(b.statusTrasCambio, /base=P1/);
  const f = p['P-4 plegado']; assert.equal(f.plegadoCambiaLaImagen, true); assert.equal(f.resetVuelveAlPlano, true); assert.equal(f.sliders, 12);
  const t = p['P-5 espesor']; assert.equal(t['0.5'].status, 'Thickness applied: 0.5mm'); assert.equal(t['25'].valorTrasAplicar, '20.00'); assert.equal(t['0.05'].valorTrasAplicar, '0.10'); assert.match(t.abc.status, /greater than 0/); assert.match(t['(vacío)'].status, /greater than 0/);
  for (const [k, pill] of [['kraft', 'Kraft board'], ['gray', 'Gray board'], ['white', 'White board']]) assert.equal(p['P-6 presets de material'][k].pill, pill);
});
test('A4 · la extracción hecha por el panel real es idéntica a la familia de fixtures de Illustrator ×1,0', () => {
  assert.deepEqual(J('extraccion-panel-caja.json'), JSON.parse(fs.readFileSync(ROOT + '/tests/fixtures/illustrator-real/ill-real-caja-botanica.dieline.json', 'utf8')));
});
test('A4 · P-8: el GLB exportado por el CEP real es byte a byte idéntico al del baseline congelado, panel/ y bundle (2 poses), sin normales nulas (KI-02 no se reproduce aquí)', () => {
  const g = caja.pasos[P8]; const ref = J('glb-referencia.json').resultados;
  for (const n of ['baseline', 'panel', 'bundle']) for (const pose of ['plano', 'todas60']) { assert.equal(ref[n][pose].sha256, g[pose].archivo.sha256, `${n} ${pose}`); assert.equal(ref[n][pose].bytes, g[pose].archivo.bytes); }
  assert.equal(sha(`${D}/glb/pose1.glb`), g.plano.archivo.sha256); assert.equal(sha(`${D}/glb/pose2.glb`), g.todas60.archivo.sha256);
  for (const f of ['pose1', 'pose2', 'arte']) { const s = summarizeFile(`${D}/glb/${f}.glb`); assert.equal(s.normals.zeroLength, 0, f); assert.equal(s.generator, 'Tesseract Phase 7B'); } assert.deepEqual(summarizeFile(`${D}/glb/pose1.glb`).bbox.size.map((v) => +v.toFixed(1)), [175, 0.3, 223.5]);
});
test('A4 · P-7 arte (N0-B): modo capas, GLB con 2 imágenes PNG en mm, y el documento queda idéntico antes/después', () => {
  assert.equal(arte.length, 2); for (const a of arte) { assert.equal(a.pasos['P-7 arte Front/Back'].pill, 'Layers'); assert.match(a.pasos['P-2 paso a 3D'].logPaneles.join(' '), /keeping 2 of 3/); }
  const s = summarizeFile(`${D}/glb/arte.glb`); assert.equal(s.images, 2); assert.deepEqual(s.bbox.size.map((v) => +v.toFixed(2)), [100, 0.41, 60]); assert.equal(sha(`${D}/glb/arte.glb`), arte[1].pasos['P-7b exportar GLB con arte'].archivo.sha256);
  assert.equal(fs.readFileSync(`${D}/n0b-estado-antes.txt`, 'utf8'), fs.readFileSync(`${D}/n0b-estado-despues.txt`, 'utf8'));
});
test('A4 · P-9/P-10: consola sin errores en toda la sesión y SIN crecimiento acumulativo de GPU (con control positivo del contador)', () => {
  for (const j of [caja, ...arte]) assert.deepEqual(j.consola.errores, []);
  for (const f of pick('cdp-console-')) assert.equal(J(f).errores, 0, f);
  for (const f of pick('cdp-leak-')) { const l = J(f).resultado; assert.equal(l.veredicto, 'SIN CRECIMIENTO ACUMULATIVO'); assert.deepEqual(l.peor_delta_ciclos_2_en_adelante, { tex: 0, buf: 0, vao: 0, prog: 0 }); }
  assert.equal(J(pick('cdp-leak-')[0]).resultado.ciclos, 6); const m = J(pick('cdp-measure-')[0]).resultado; assert.deepEqual(m.crecimiento_por_100_ticks, { texturas: 0, buffers: 0, vaos: 0, heap_MB: 0 }); assert.equal(m.gpu, 'Apple M1 Max');
  const c = J('control-positivo-contadores-gpu.json'); assert.equal(c.tras50sinBorrar.tex, 50); assert.equal(c.trasBorrar.tex, 0); assert.equal(c.ctx, 'webgl2');
});
test('A4 · rollback: el estado tras retirar tesseract-v3 es idéntico al previo a la instalación; con V3 instalada las demás extensiones no cambiaron', () => {
  const norm = (f) => fs.readFileSync(`${D}/${f}`, 'utf8'); assert.equal(norm('snapshot-antes.txt'), norm('snapshot-tras-rollback.txt'));
  assert.equal(norm('snapshot-antes.txt'), norm('snapshot-ahora.txt').split('\n').filter((l) => !l.startsWith('tesseract-v3\t')).join('\n')); assert.match(norm('snapshot-ahora.txt'), /tesseract-v3\tcom\.tato\.tesseract\.v3/);
});
