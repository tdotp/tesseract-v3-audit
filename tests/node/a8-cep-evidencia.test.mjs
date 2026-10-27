// Evidencia de la validación corta del bundle A8 en Illustrator 30.8.2 / CEP 12.1.1 / Chromium 99.0.4844.84 REAL (2026-10-26), fijada como prueba: docs/fase1/a8-real/.
// Comprueba que la evidencia dice lo que el informe afirma (V-1…V-7) y que es idéntica, campo a campo y byte a byte, a la evidencia real de A7 (a6-comparar-paridad),
// incluida la igualdad BINARIA del GLB con arte, que Chrome headless no puede comprobar.
import test from 'node:test'; import assert from 'node:assert/strict'; import fs from 'node:fs'; import crypto from 'node:crypto'; import { ROOT } from '../lib/fixtures.mjs';
import { EXPECTED_SCRIPTS } from '../../tools/a4/a5-observar.mjs'; import { compare } from '../../tools/a4/a6-comparar-paridad.mjs'; import { REAL_SHA } from '../lib/a8.mjs';
const D = ROOT + '/docs/fase1/a8-real', A7 = ROOT + '/docs/fase1/a7-real'; const J = (f) => JSON.parse(fs.readFileSync(f, 'utf8')); const pick = (dir, pre) => fs.readdirSync(dir).filter((f) => f.startsWith(pre) && f.endsWith('.json')).sort();
const sha = (f) => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex'); const txt = (f) => fs.readFileSync(f, 'utf8');
const PIN_MAIN = txt(ROOT + '/tests/golden/dist-a8.SHA256SUMS').split('\n').find((l) => /\.\/main\.js$/.test(l)).split(/\s+/)[0];
const P8 = 'P-8 exportar GLB (diálogo sustituido por ruta en /private/tmp/tesseract_a4/)'; const caja = J(`${D}/${pick(D, 'paridad-caja-')[0]}`); const arte = J(`${D}/${pick(D, 'paridad-arte-')[0]}`);
const cajaA7 = J(`${A7}/${pick(A7, 'paridad-caja-')[0]}`); const arteA7 = J(`${A7}/${pick(A7, 'paridad-arte-')[0]}`); const obs = J(`${D}/${pick(D, 'observacion-')[0]}`);

test('V-1 · instalación autorizada el 2026-10-26 del bundle A8 (main.js = huella vigente dist-a8), identidad REAL correcta y 0 errores de consola', () => {
  const r = J(`${D}/install-record.json`); assert.equal(r.autorizacion_usuario, '2026-10-26'); assert.equal(r.huellas['main.js'], PIN_MAIN); assert.equal(PIN_MAIN, '4addceb7fb8c6dd662a460fb4c8e9c25ad9d715ad1e883e10a66acc858a552bd');
  const id = J(`${D}/${pick(D, 'cdp-identity-')[0]}`); assert.equal(id.simulated, false); assert.equal(id.veredicto.ok, true); assert.equal(id.identidad.mainJs.sha256, PIN_MAIN);
  assert.match(id.identidad.ua, /Chrome\/99\.0\.4844\.84 AdobeCEP\/12\.1\.1/); assert.equal(id.identidad.extensionId, 'com.tato.tesseract.v3.panel'); assert.equal(id.identidad.three, '132');
  for (const f of pick(D, 'cdp-console-')) assert.equal(J(`${D}/${f}`).errores, 0, f); assert.equal(caja.consola.errores.length, 0); assert.equal(arte.consola.errores.length, 0);
  for (const c of [caja.consola, arte.consola]) assert.deepEqual(c.avisos.map((a) => a.texto), ['The specified value "abc" cannot be parsed, or is out of range.'], 'solo el aviso conocido de la prueba de espesor');
});
test('V-2 · a4-paridad caja y arte en CEP real = evidencia real de A7 campo a campo (salvo fecha, ms y eventos); extracciones idénticas byte a byte; 11 de 13 (KI-04/KI-22)', () => {
  assert.deepEqual(compare(caja, cajaA7), []); assert.deepEqual(compare(arte, arteA7), []);
  for (const f of ['extraccion-panel-caja.json', 'extraccion-panel-arte.json']) assert.equal(sha(`${D}/${f}`), sha(`${A7}/${f}`), f);
  assert.equal(caja.pasos['P-0 test de conexión'].status, 'OK_FROM_ILLUSTRATOR'); assert.ok(caja.pasos['P-2 paso a 3D'].logPaneles.some((l) => /keeping 11 of 13/.test(l)));
});
test('V-3 · GLB de la caja en 2 poses = Illustrator real de A4–A7 byte a byte (en memoria y archivados)', () => {
  assert.equal(caja.pasos[P8].plano.sha256, REAL_SHA.plano); assert.equal(caja.pasos[P8].todas60.sha256, REAL_SHA.todas60); assert.equal(caja.pasos[P8].plano.archivo.sha256, REAL_SHA.plano);
  for (const [k, f] of [['plano', 'paridad-caja-plano'], ['todas60', 'paridad-caja-todas60']]) { assert.equal(sha(`${D}/glb/${f}.glb`), REAL_SHA[k], f); assert.ok(fs.readFileSync(`${D}/glb/${f}.glb`).equals(fs.readFileSync(`${A7}/glb/${f}.glb`)), `${f} = A7 real`); }
});
test('V-4 · arte N0-B: GLB con arte = b4973a54… BYTE A BYTE (igualdad binaria que headless no puede probar), modo Layers y N0-B idéntico antes/después (= A7)', () => {
  assert.equal(arte.pasos['P-7 arte Front/Back'].pill, 'Layers'); assert.equal(sha(`${D}/glb/paridad-arte.glb`), REAL_SHA.arte); assert.equal(fs.statSync(`${D}/glb/paridad-arte.glb`).size, 295440);
  assert.ok(fs.readFileSync(`${D}/glb/paridad-arte.glb`).equals(fs.readFileSync(`${A7}/glb/paridad-arte.glb`)), 'GLB con arte = A7 real');
  const antes = txt(`${D}/n0b-estado-antes.txt`); assert.equal(txt(`${D}/n0b-estado-despues.txt`), antes); assert.equal(antes, txt(`${A7}/n0b-estado-antes.txt`));
});
test('V-5 · diálogo «Save GLB» REAL: guardar escribe 737bcd23… con err 0, cancelar no escribe; KI-25 intacto; scripts ExtendScript = baseline', () => {
  assert.equal(obs.veredicto.ok, true); assert.equal(obs.restaurado, true); assert.deepEqual(obs.veredicto.tiposDeScriptVistos, ['arte', 'extraer', 'guardar', 'test']);
  for (const s of obs.scripts) assert.deepEqual([s.longitud, s.sha256_16], EXPECTED_SCRIPTS[s.tipo], s.tipo);
  const reales = obs.escrituras.filter((w) => w.ruta.startsWith('/private/tmp/tesseract_a8/')); assert.equal(reales.length, 1, 'una sola escritura desde el diálogo real (cancelar no escribe)');
  assert.equal(reales[0].err, 0); assert.equal(reales[0].archivo.sha256, REAL_SHA.plano); assert.equal(sha(`${D}/glb/dialogo-real-a8-plano.glb`), REAL_SHA.plano);
  const h = obs.historialEstado.join('\n');
  assert.ok(h.includes('Exporting GLB…\nGLB saved: /private/tmp/tesseract_a8/a8-plano.glb\nGLB exported from current 3D pose'), 'guardar con KI-25');
  assert.ok(h.endsWith('Exporting GLB…\nGLB export cancelled\nGLB exported from current 3D pose'), 'cancelar con KI-25');
});
test('V-6 · rollback: carpetas CEP tras retirar V3 = estado previo; frente al previo de A7 solo cambia la extensión de Adobe CC Libraries (actualizada fuera de esta validación)', () => {
  const s0 = txt(`${D}/snapshot-antes.txt`); assert.equal(txt(`${D}/snapshot-tras-rollback.txt`), s0); assert.ok(!/tesseract-v3/.test(s0));
  const a = s0.split('\n'), b = txt(`${A7}/snapshot-antes.txt`).split('\n'); assert.equal(a.length, b.length);
  const distintas = a.filter((l, i) => l !== b[i]); assert.equal(distintas.length, 1); assert.match(distintas[0], /^CC_LIBRARIES_PANEL_EXTENSION_4_16_29\t/);
  for (const l of a) if (/^tesseract\t|^TesserArt_Validator\t/.test(l)) assert.ok(b.includes(l), l);
});
test('V-7 · GPU en CEP real: sin crecimiento acumulativo (Δ=0 en los 3 ciclos)', () => {
  const r = J(`${D}/${pick(D, 'cdp-leak-')[0]}`).resultado; assert.equal(r.veredicto, 'SIN CRECIMIENTO ACUMULATIVO'); assert.equal(r.conArte, false); assert.equal(r.ciclos, 3);
  assert.deepEqual(r.peor_delta_ciclos_2_en_adelante, { tex: 0, buf: 0, vao: 0, prog: 0 }); for (const d of r.deltas_por_ciclo) for (const k of ['dTex', 'dBuf', 'dVao', 'dProg']) assert.equal(d[k], 0, `ciclo ${d.ciclo} ${k}`);
});
