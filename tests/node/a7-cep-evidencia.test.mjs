// Evidencia de la validación corta del bundle A7 en Illustrator 30.8.2 / CEP 12.1.1 / Chromium 99.0.4844.84 REAL (2026-10-26), fijada como prueba: docs/fase1/a7-real/.
// Comprueba que la evidencia dice lo que el informe afirma (V-1…V-5 + arte) y que es idéntica, campo a campo, a la evidencia real de A6 (a6-comparar-paridad).
import test from 'node:test'; import assert from 'node:assert/strict'; import fs from 'node:fs'; import crypto from 'node:crypto'; import { ROOT } from '../lib/fixtures.mjs';
import { GLB_A4 } from '../../tools/a4/a5-observar.mjs'; import { compare } from '../../tools/a4/a6-comparar-paridad.mjs';
const D = ROOT + '/docs/fase1/a7-real', A6 = ROOT + '/docs/fase1/a6-real'; const J = (f) => JSON.parse(fs.readFileSync(f, 'utf8')); const pick = (dir, pre) => fs.readdirSync(dir).filter((f) => f.startsWith(pre) && f.endsWith('.json')).sort();
const sha = (f) => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const PIN_MAIN = fs.readFileSync(ROOT + '/tests/golden/dist-a7.SHA256SUMS', 'utf8').split('\n').find((l) => /\.\/main\.js$/.test(l)).split(/\s+/)[0];
const P8 = 'P-8 exportar GLB (diálogo sustituido por ruta en /private/tmp/tesseract_a4/)'; const caja = J(`${D}/${pick(D, 'paridad-caja-')[0]}`); const arte = J(`${D}/${pick(D, 'paridad-arte-')[0]}`);
const cajaA6 = J(`${A6}/${pick(A6, 'paridad-caja-')[0]}`); const arteA6 = J(`${A6}/${pick(A6, 'paridad-arte-')[0]}`);

test('V-1 · instalación autorizada el 2026-10-26 del bundle A7 (main.js = huella vigente dist-a7), identidad REAL correcta y 0 errores de consola', () => {
  const r = J(`${D}/install-record.json`); assert.equal(r.autorizacion_usuario, '2026-10-26'); assert.equal(r.huellas['main.js'], PIN_MAIN); assert.equal(PIN_MAIN, '9784ec70e103a1eb8f91d8d58e2104585466f498a94e554d41d994bcce8944fc');
  const id = J(`${D}/${pick(D, 'cdp-identity-')[0]}`); assert.equal(id.simulated, false); assert.equal(id.veredicto.ok, true); assert.equal(id.identidad.mainJs.sha256, PIN_MAIN);
  assert.match(id.identidad.ua, /Chrome\/99\.0\.4844\.84 AdobeCEP\/12\.1\.1/); assert.equal(id.identidad.extensionId, 'com.tato.tesseract.v3.panel'); assert.equal(id.identidad.three, '132');
  for (const f of pick(D, 'cdp-console-')) assert.equal(J(`${D}/${f}`).errores, 0, f); assert.equal(caja.consola.errores.length, 0); assert.equal(arte.consola.errores.length, 0);
});
test('V-2 · a4-paridad caja y arte en CEP real = evidencia real de A6 campo a campo (salvo fecha, ms y eventos); extracciones idénticas byte a byte; 11 de 13 (KI-04/KI-22)', () => {
  assert.deepEqual(compare(caja, cajaA6), []); assert.deepEqual(compare(arte, arteA6), []);
  for (const f of ['extraccion-panel-caja.json', 'extraccion-panel-arte.json']) assert.equal(sha(`${D}/${f}`), sha(`${A6}/${f}`), f);
  assert.equal(caja.pasos['P-0 test de conexión'].status, 'OK_FROM_ILLUSTRATOR'); assert.ok(caja.pasos['P-2 paso a 3D'].logPaneles.some((l) => /keeping 11 of 13/.test(l)));
});
test('V-3 · GLB de la caja en 2 poses y GLB con arte = A4/A5/A6 en CEP real (en memoria y archivados)', () => {
  assert.equal(caja.pasos[P8].plano.sha256, GLB_A4.plano); assert.equal(caja.pasos[P8].todas60.sha256, GLB_A4.todas60); assert.equal(caja.pasos[P8].plano.archivo.sha256, GLB_A4.plano);
  assert.equal(sha(`${D}/glb/paridad-caja-plano.glb`), GLB_A4.plano); assert.equal(sha(`${D}/glb/paridad-caja-todas60.glb`), GLB_A4.todas60);
  assert.equal(arte.pasos['P-7 arte Front/Back'].pill, 'Layers'); assert.ok(sha(`${D}/glb/paridad-arte.glb`).startsWith(GLB_A4.arte));
  for (const f of ['paridad-caja-plano', 'paridad-caja-todas60', 'paridad-arte']) assert.equal(sha(`${D}/glb/${f}.glb`), sha(`${A6}/glb/${f}.glb`), f);
});
test('V-4 · documento N0-B idéntico antes/después (y = A6); rollback: carpetas CEP tras retirar V3 = estado previo (= previo de A6)', () => {
  const antes = fs.readFileSync(`${D}/n0b-estado-antes.txt`, 'utf8'); assert.equal(fs.readFileSync(`${D}/n0b-estado-despues.txt`, 'utf8'), antes); assert.equal(antes, fs.readFileSync(`${A6}/n0b-estado-antes.txt`, 'utf8'));
  const s0 = fs.readFileSync(`${D}/snapshot-antes.txt`, 'utf8'); assert.equal(fs.readFileSync(`${D}/snapshot-tras-rollback.txt`, 'utf8'), s0); assert.equal(s0, fs.readFileSync(`${A6}/snapshot-antes.txt`, 'utf8')); assert.ok(!/tesseract-v3/.test(s0));
});
test('V-5 · GPU en CEP real: sin crecimiento acumulativo (Δ=0 desde el ciclo 2; el ciclo 1 solo libera)', () => {
  const r = J(`${D}/${pick(D, 'cdp-leak-')[0]}`).resultado; assert.equal(r.veredicto, 'SIN CRECIMIENTO ACUMULATIVO'); assert.equal(r.conArte, false); assert.equal(r.ciclos, 3);
  assert.deepEqual(r.peor_delta_ciclos_2_en_adelante, { tex: 0, buf: 0, vao: 0, prog: 0 });
  for (const d of r.deltas_por_ciclo) { assert.equal(d.dTex, 0); assert.equal(d.dProg, 0); assert.ok(d.dBuf <= 0 && d.dVao <= 0, `ciclo ${d.ciclo}: la GPU no puede crecer`); }
});
