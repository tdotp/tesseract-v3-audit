// Evidencia de la validación corta del bundle A5 en Illustrator 30.8.2 / CEP 12.1.1 / Chromium 99.0.4844.84 REAL (2026-10-24), fijada como prueba: docs/fase1/a5-real/.
// Comprueba que la evidencia dice lo que el informe afirma (V-1…V-6) y que es coherente con la huella vigente, los textos ExtendScript del baseline y la evidencia de A4.
import test from 'node:test'; import assert from 'node:assert/strict'; import fs from 'node:fs'; import crypto from 'node:crypto'; import { ROOT } from '../lib/fixtures.mjs';
import { EXPECTED_SCRIPTS, GLB_A4 } from '../../tools/a4/a5-observar.mjs';
const D = ROOT + '/docs/fase1/a5-real', A4 = ROOT + '/docs/fase1/a4-real'; const J = (f) => JSON.parse(fs.readFileSync(f, 'utf8')); const pick = (pre) => fs.readdirSync(D).filter((f) => f.startsWith(pre) && f.endsWith('.json')).sort();
const sha = (f) => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const PIN_MAIN = fs.readFileSync(ROOT + '/tests/golden/dist-a5.SHA256SUMS', 'utf8').split('\n').find((l) => /\.\/main\.js$/.test(l)).split(/\s+/)[0];
const P8 = 'P-8 exportar GLB (diálogo sustituido por ruta en /private/tmp/tesseract_a4/)'; const caja = J(`${D}/${pick('paridad-caja-')[0]}`); const arte = J(`${D}/${pick('paridad-arte-')[0]}`);
const obs = J(`${D}/${pick('observacion-').at(-1)}`);

test('V-1 · instalación autorizada el 2026-10-24 del bundle A5 (main.js = huella vigente dist-a5), identidad REAL correcta y 0 errores de consola', () => {
  const r = J(`${D}/install-record.json`); assert.equal(r.autorizacion_usuario, '2026-10-24'); assert.equal(r.huellas['main.js'], PIN_MAIN); assert.equal(PIN_MAIN, '70de82a82f90c91b3f794bc62fa02f34d86d06d11dfe0c77af4ed8d660e70701');
  const id = J(`${D}/${pick('cdp-identity-')[0]}`); assert.equal(id.simulated, false); assert.equal(id.veredicto.ok, true); assert.equal(id.identidad.mainJs.sha256, PIN_MAIN);
  assert.match(id.identidad.ua, /Chrome\/99\.0\.4844\.84 AdobeCEP\/12\.1\.1/); assert.equal(id.identidad.extensionId, 'com.tato.tesseract.v3.panel'); assert.equal(id.identidad.three, '132');
  for (const f of pick('cdp-console-')) assert.equal(J(`${D}/${f}`).errores, 0, f); assert.equal(caja.consola.errores.length, 0); assert.equal(arte.consola.errores.length, 0);
});
test('V-2 · Test Connection real y extracción idéntica byte a byte a A4; 11 de 13 paneles (KI-04/KI-22 preservado)', () => {
  assert.equal(caja.pasos['P-0 test de conexión'].status, 'OK_FROM_ILLUSTRATOR');
  const p1 = caja.pasos['P-1 extracción y validación']; assert.equal(p1.status, 'Extraction complete'); assert.equal(p1.avisos.length, 0);
  assert.equal(sha(`${D}/extraccion-panel-caja.json`), sha(`${A4}/extraccion-panel-caja.json`)); assert.equal(sha(`${D}/extraccion-panel-arte.json`), sha(`${A4}/extraccion-panel-arte.json`));
  assert.ok(caja.pasos['P-2 paso a 3D'].logPaneles.some((l) => /keeping 11 of 13/.test(l)));
  const a4caja = J(`${A4}/paridad-caja-2026-10-24T01-55-59-890Z.json`).pasos; for (const k of ['P-3 base', 'P-5 espesor', 'P-6 presets de material']) assert.deepEqual(caja.pasos[k], a4caja[k], k);
  for (const h of ['hashPlano', 'hashTodas60', 'hashTrasReset']) assert.equal(caja.pasos['P-4 plegado'][h], a4caja['P-4 plegado'][h], h);
});
test('V-3 · diálogo «Save GLB» REAL: textos ExtendScript = baseline; guardados con err 0 y archivos = referencia de su pose; cancelar no escribe; KI-25 visible', () => {
  assert.equal(obs.veredicto.ok, true); assert.equal(obs.restaurado, true); assert.deepEqual([...new Set(obs.scripts.map((s) => s.tipo))].sort(), ['arte', 'extraer', 'guardar', 'test']);
  for (const s of obs.scripts) assert.deepEqual([s.longitud, s.sha256_16], EXPECTED_SCRIPTS[s.tipo], s.tipo);
  assert.equal(obs.scripts.filter((s) => s.tipo === 'guardar').length, 5, '5 diálogos reales: 4 guardados + 1 cancelado');
  const h = obs.historialEstado; const i = h.indexOf('GLB export cancelled'); assert.ok(i > 0); assert.deepEqual(h.slice(i - 1, i + 2), ['Exporting GLB…', 'GLB export cancelled', 'GLB exported from current 3D pose']);
  const reales = obs.escrituras.filter((w) => !/tesseract_a4\//.test(w.ruta)); assert.equal(reales.length, 4); for (const w of obs.escrituras) assert.ok(w.err === 0 || w.err === '0');
  for (const w of reales) assert.ok([GLB_A4.plano, GLB_A4.todas60].includes(w.archivo.sha256), w.ruta);
});
test('V-4 · arte Front/Back real: modo Layers; GLB con arte = A4 byte a byte; documento N0-B idéntico antes/después (y = A4)', () => {
  assert.equal(arte.pasos['P-7 arte Front/Back'].pill, 'Layers'); const g = arte.pasos['P-7b exportar GLB con arte']; assert.equal(g.bytes, 295440); assert.ok(g.sha256.startsWith(GLB_A4.arte)); assert.equal(g.archivo.sha256, g.sha256);
  const antes = fs.readFileSync(`${D}/n0b-estado-antes.txt`, 'utf8'); assert.equal(fs.readFileSync(`${D}/n0b-estado-despues.txt`, 'utf8'), antes); assert.equal(antes, fs.readFileSync(`${A4}/n0b-estado-antes.txt`, 'utf8'));
});
test('V-5 · GLB de la caja en 2 poses = A4 en CEP real (en memoria y en disco); los 6 GLB archivados coinciden con su referencia', () => {
  assert.equal(caja.pasos[P8].plano.sha256, GLB_A4.plano); assert.equal(caja.pasos[P8].todas60.sha256, GLB_A4.todas60); assert.equal(caja.pasos[P8].plano.archivo.sha256, GLB_A4.plano);
  const ref = J(`${A4}/glb-referencia.json`).resultados.baseline; assert.equal(ref.plano.sha256, GLB_A4.plano); assert.equal(ref.todas60.sha256, GLB_A4.todas60);
  const want = { 'paridad-caja-plano.glb': GLB_A4.plano, 'paridad-caja-todas60.glb': GLB_A4.todas60, 'dialogo-real-a5-plano2-plano.glb': GLB_A4.plano, 'dialogo-real-a5-plano-todas60.glb': GLB_A4.todas60, 'dialogo-real-test-todas60.glb': GLB_A4.todas60 };
  for (const [f, h] of Object.entries(want)) assert.equal(sha(`${D}/glb/${f}`), h, f); assert.ok(sha(`${D}/glb/paridad-arte.glb`).startsWith(GLB_A4.arte));
});
test('V-6 · rollback: el estado de las carpetas CEP tras retirar V3 es idéntico al previo a la instalación', () => {
  assert.equal(fs.readFileSync(`${D}/snapshot-tras-rollback.txt`, 'utf8'), fs.readFileSync(`${D}/snapshot-antes.txt`, 'utf8'));
  assert.ok(!/tesseract-v3/.test(fs.readFileSync(`${D}/snapshot-tras-rollback.txt`, 'utf8')));
});
