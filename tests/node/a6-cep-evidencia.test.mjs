// Evidencia de la validación corta del bundle A6 en Illustrator 30.8.2 / CEP 12.1.1 / Chromium 99.0.4844.84 REAL (2026-10-25), fijada como prueba: docs/fase1/a6-real/.
// Comprueba que la evidencia dice lo que el informe afirma (V-1…V-4 + arte) y que es idéntica, campo a campo, a la evidencia real de A5 (a6-comparar-paridad).
import test from 'node:test'; import assert from 'node:assert/strict'; import fs from 'node:fs'; import crypto from 'node:crypto'; import { ROOT } from '../lib/fixtures.mjs';
import { GLB_A4 } from '../../tools/a4/a5-observar.mjs'; import { compare, REFERENCIA_A5 } from '../../tools/a4/a6-comparar-paridad.mjs';
const D = ROOT + '/docs/fase1/a6-real', A5 = ROOT + '/docs/fase1/a5-real'; const J = (f) => JSON.parse(fs.readFileSync(f, 'utf8')); const pick = (pre) => fs.readdirSync(D).filter((f) => f.startsWith(pre) && f.endsWith('.json')).sort();
const sha = (f) => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const PIN_MAIN = fs.readFileSync(ROOT + '/tests/golden/dist-a6.SHA256SUMS', 'utf8').split('\n').find((l) => /\.\/main\.js$/.test(l)).split(/\s+/)[0];
const P8 = 'P-8 exportar GLB (diálogo sustituido por ruta en /private/tmp/tesseract_a4/)'; const caja = J(`${D}/${pick('paridad-caja-')[0]}`); const arte = J(`${D}/${pick('paridad-arte-')[0]}`);

test('V-1 · instalación autorizada el 2026-10-25 del bundle A6 (main.js = huella vigente dist-a6), identidad REAL correcta y 0 errores de consola', () => {
  const r = J(`${D}/install-record.json`); assert.equal(r.autorizacion_usuario, '2026-10-25'); assert.equal(r.huellas['main.js'], PIN_MAIN); assert.equal(PIN_MAIN, '6e36e32534104a7863f087ba876cd981f41d81b88aafcf09f4860640eaf78c8b');
  const id = J(`${D}/${pick('cdp-identity-')[0]}`); assert.equal(id.simulated, false); assert.equal(id.veredicto.ok, true); assert.equal(id.identidad.mainJs.sha256, PIN_MAIN);
  assert.match(id.identidad.ua, /Chrome\/99\.0\.4844\.84 AdobeCEP\/12\.1\.1/); assert.equal(id.identidad.extensionId, 'com.tato.tesseract.v3.panel'); assert.equal(id.identidad.three, '132');
  for (const f of pick('cdp-console-')) assert.equal(J(`${D}/${f}`).errores, 0, f); assert.equal(caja.consola.errores.length, 0); assert.equal(arte.consola.errores.length, 0);
});
test('V-2 · a4-paridad caja y arte en CEP real = evidencia real de A5 campo a campo (salvo fecha, ms y eventos); extracciones idénticas byte a byte; 11 de 13 (KI-04/KI-22)', () => {
  assert.deepEqual(compare(caja, J(`${ROOT}/${REFERENCIA_A5.caja}`)), []); assert.deepEqual(compare(arte, J(`${ROOT}/${REFERENCIA_A5.arte}`)), []);
  for (const f of ['extraccion-panel-caja.json', 'extraccion-panel-arte.json']) assert.equal(sha(`${D}/${f}`), sha(`${A5}/${f}`), f);
  assert.equal(caja.pasos['P-0 test de conexión'].status, 'OK_FROM_ILLUSTRATOR'); assert.ok(caja.pasos['P-2 paso a 3D'].logPaneles.some((l) => /keeping 11 of 13/.test(l)));
});
test('V-3 · GLB de la caja en 2 poses y GLB con arte = A4/A5 en CEP real (en memoria y archivados)', () => {
  assert.equal(caja.pasos[P8].plano.sha256, GLB_A4.plano); assert.equal(caja.pasos[P8].todas60.sha256, GLB_A4.todas60); assert.equal(caja.pasos[P8].plano.archivo.sha256, GLB_A4.plano);
  assert.equal(sha(`${D}/glb/paridad-caja-plano.glb`), GLB_A4.plano); assert.equal(sha(`${D}/glb/paridad-caja-todas60.glb`), GLB_A4.todas60);
  assert.equal(arte.pasos['P-7 arte Front/Back'].pill, 'Layers'); assert.ok(sha(`${D}/glb/paridad-arte.glb`).startsWith(GLB_A4.arte)); assert.equal(sha(`${D}/glb/paridad-arte.glb`), sha(`${A5}/glb/paridad-arte.glb`));
});
test('V-4 · documento N0-B idéntico antes/después (y = A5); rollback: carpetas CEP tras retirar V3 = estado previo (= previo de A5)', () => {
  const antes = fs.readFileSync(`${D}/n0b-estado-antes.txt`, 'utf8'); assert.equal(fs.readFileSync(`${D}/n0b-estado-despues.txt`, 'utf8'), antes); assert.equal(antes, fs.readFileSync(`${A5}/n0b-estado-antes.txt`, 'utf8'));
  const s0 = fs.readFileSync(`${D}/snapshot-antes.txt`, 'utf8'); assert.equal(fs.readFileSync(`${D}/snapshot-tras-rollback.txt`, 'utf8'), s0); assert.equal(s0, fs.readFileSync(`${A5}/snapshot-antes.txt`, 'utf8')); assert.ok(!/tesseract-v3/.test(s0));
});
