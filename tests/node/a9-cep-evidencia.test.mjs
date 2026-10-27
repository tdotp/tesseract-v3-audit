// Evidencia de la validación corta del bundle A9 en Illustrator 30.8.2 / CEP 12.1.1 / Chromium 99.0.4844.84 REAL (2026-10-27), fijada como prueba: docs/fase1/a9-real/.
// Comprueba que la evidencia dice lo que el informe afirma (V-1…V-8) y que es idéntica, campo a campo y byte a byte, a la evidencia real de A8 (a6-comparar-paridad),
// incluido el GLB con arte b4973a54… con la misma precondición que A8 (base previa P0), y fija la observación O-1: la primera pasada de arte heredó la base de V-6.
import test from 'node:test'; import assert from 'node:assert/strict'; import fs from 'node:fs'; import crypto from 'node:crypto'; import { ROOT } from '../lib/fixtures.mjs';
import { EXPECTED_SCRIPTS } from '../../tools/a4/a5-observar.mjs'; import { compare } from '../../tools/a4/a6-comparar-paridad.mjs'; import { REAL_SHA } from '../lib/a8.mjs';
const REFERENCIA_A8 = { caja: 'docs/fase1/a8-real/paridad-caja-2026-10-26T23-20-40-335Z.json', arte: 'docs/fase1/a8-real/paridad-arte-2026-10-26T23-23-49-804Z.json' }; // = a9-cep-preparacion
const D = ROOT + '/docs/fase1/a9-real', A8 = ROOT + '/docs/fase1/a8-real'; const J = (f) => JSON.parse(fs.readFileSync(f, 'utf8')); const pick = (dir, pre) => fs.readdirSync(dir).filter((f) => f.startsWith(pre) && f.endsWith('.json')).sort();
const sha = (f) => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex'); const txt = (f) => fs.readFileSync(f, 'utf8');
const PIN_MAIN = txt(ROOT + '/tests/golden/dist-a9.SHA256SUMS').split('\n').find((l) => /\.\/main\.js$/.test(l)).split(/\s+/)[0];
const P8 = 'P-8 exportar GLB (diálogo sustituido por ruta en /private/tmp/tesseract_a4/)'; const P7B = 'P-7b exportar GLB con arte';
const caja = J(`${D}/${pick(D, 'paridad-caja-')[0]}`); const [arte1, arteP0, arteP1] = pick(D, 'paridad-arte-').map((f) => J(`${D}/${f}`));
const [obs1, obs2] = pick(D, 'observacion-').map((f) => J(`${D}/${f}`)); const consolas = pick(D, 'cdp-console-').map((f) => J(`${D}/${f}`));
const AVISO = 'The specified value "abc" cannot be parsed, or is out of range.';
const ARTE_BASE_P1 = '9e8dd2e5c573265ce9815006deec6111fea6c9499a06da072ca8803e166a8b64';

test('V-1 · instalación autorizada el 2026-10-27 del bundle A9 (main.js = huella vigente dist-a9 e5902a3c…), identidad REAL correcta', () => {
  const r = J(`${D}/install-record.json`); assert.equal(r.autorizacion_usuario, '2026-10-27'); assert.equal(r.huellas['main.js'], PIN_MAIN); assert.equal(PIN_MAIN, 'e5902a3cc3deccf19f07c236a8fd4d6b98834baae30c564dfc367350406f9d46');
  const id = J(`${D}/${pick(D, 'cdp-identity-')[0]}`); assert.equal(id.simulated, false); assert.equal(id.veredicto.ok, true); assert.equal(id.identidad.mainJs.sha256, PIN_MAIN);
  assert.match(id.identidad.ua, /Chrome\/99\.0\.4844\.84 AdobeCEP\/12\.1\.1/); assert.equal(id.identidad.extensionId, 'com.tato.tesseract.v3.panel'); assert.equal(id.identidad.three, '132');
});
test('consola de toda la sesión: 0 errores, ningún «Pick error» y solo el aviso conocido de la prueba de espesor (la captura final, 459 eventos, incluye los mensajes desde la carga)', () => {
  assert.equal(consolas.length, 9); assert.equal(consolas[0].eventos.length, 0, 'desde la recarga: 0 eventos');
  for (const c of consolas) { assert.equal(c.errores, 0); assert.equal(c.eventos.filter((e) => /Pick error/.test(e.texto)).length, 0); assert.ok(c.eventos.filter((e) => e.tipo !== 'log').every((e) => e.texto === AVISO)); }
  assert.equal(consolas.at(-1).eventos.length, 459);
  for (const p of [caja, arte1, arteP0, arteP1]) { assert.equal(p.consola.errores.length, 0); assert.deepEqual(p.consola.avisos.map((a) => a.texto), [AVISO]); }
});
test('V-2 · a4-paridad caja en CEP real = evidencia real de A8 campo a campo; extracciones de caja y arte = A8 byte a byte; 11 de 13 (KI-04/KI-22)', () => {
  assert.deepEqual(compare(caja, J(`${ROOT}/${REFERENCIA_A8.caja}`)), []);
  for (const f of ['extraccion-panel-caja.json', 'extraccion-panel-arte.json']) assert.equal(sha(`${D}/${f}`), sha(`${A8}/${f}`), f);
  assert.equal(caja.pasos['P-0 test de conexión'].status, 'OK_FROM_ILLUSTRATOR'); assert.ok(caja.pasos['P-2 paso a 3D'].logPaneles.some((l) => /keeping 11 of 13/.test(l)));
});
test('V-3 · GLB de la caja en 2 poses = Illustrator real de A4–A8 byte a byte', () => {
  assert.equal(caja.pasos[P8].plano.sha256, REAL_SHA.plano); assert.equal(caja.pasos[P8].todas60.sha256, REAL_SHA.todas60);
  for (const [k, f] of [['plano', 'paridad-caja-plano'], ['todas60', 'paridad-caja-todas60']]) { assert.equal(sha(`${D}/glb/${f}.glb`), REAL_SHA[k], f); assert.ok(fs.readFileSync(`${D}/glb/${f}.glb`).equals(fs.readFileSync(`${A8}/glb/${f}.glb`)), `${f} = A8 real`); }
});
test('V-4 · arte N0-B con la precondición de A8 (base previa P0): paridad = A8 salvo la etiqueta y GLB con arte = b4973a54… BYTE A BYTE; N0-B idéntico antes/después (= A8)', () => {
  assert.deepEqual(compare(arteP0, J(`${ROOT}/${REFERENCIA_A8.arte}`)), ['.tag: "N0-B-base-P0" ≠ "N0-B"']); assert.equal(arteP0.pasos[P7B].sha256, REAL_SHA.arte);
  assert.equal(arteP0.pasos['P-7 arte Front/Back'].pill, 'Layers'); assert.equal(sha(`${D}/glb/paridad-arte.glb`), REAL_SHA.arte); assert.equal(fs.statSync(`${D}/glb/paridad-arte.glb`).size, 295440);
  assert.ok(fs.readFileSync(`${D}/glb/paridad-arte.glb`).equals(fs.readFileSync(`${A8}/glb/paridad-arte.glb`)), 'GLB con arte = A8 real');
  const antes = txt(`${D}/n0b-estado-antes.txt`); assert.equal(txt(`${D}/n0b-estado-despues.txt`), antes); assert.equal(antes, txt(`${A8}/n0b-estado-antes.txt`));
});
test('O-1 · la primera pasada de arte heredó la base de V-6 (P3 fuera de rango en N0-B ⇒ base por defecto P1): solo cambia el GLB (9e8dd2e5…), y base P1 lo reproduce byte a byte', () => {
  assert.deepEqual(compare(arte1, J(`${ROOT}/${REFERENCIA_A8.arte}`)).map((d) => d.split(':')[0]), [`.pasos.${P7B}.sha256`, `.pasos.${P7B}.archivo.sha256`]);
  assert.equal(arte1.pasos[P7B].sha256, ARTE_BASE_P1); assert.equal(arte1.pasos[P7B].bytes, 295440);
  assert.deepEqual(compare(arteP1, arte1), ['.tag: "N0-B-base-P1" ≠ "N0-B"']);
  for (const f of ['paridad-arte-primera-base-arrastrada', 'paridad-arte-base-P1']) assert.equal(sha(`${D}/glb/${f}.glb`), ARTE_BASE_P1, f);
  const g = (f) => { const b = fs.readFileSync(`${D}/glb/${f}.glb`); const n = b.readUInt32LE(12); return JSON.parse(b.subarray(20, 20 + n)); };
  const a = g('paridad-arte-primera-base-arrastrada'), b = g('paridad-arte'); assert.deepEqual(a.images, b.images); assert.deepEqual(a.bufferViews, b.bufferViews);
  assert.deepEqual([a.accessors[0].min[0], a.accessors[12].min[0]], [-50, b.accessors[0].min[0]], 'los dos paneles quedan reflejados en X: cambia cuál es la base, no las texturas');
});
test('V-5 · diálogo «Save GLB» REAL: guardar escribe 737bcd23… con err 0, cancelar no escribe; KI-25 intacto; scripts ExtendScript = baseline', () => {
  for (const o of [obs1, obs2]) { assert.equal(o.veredicto.ok, true); assert.equal(o.restaurado, true); for (const s of o.scripts) assert.deepEqual([s.longitud, s.sha256_16], EXPECTED_SCRIPTS[s.tipo], s.tipo); }
  assert.deepEqual(obs1.veredicto.tiposDeScriptVistos, ['arte', 'extraer', 'guardar', 'test']);
  const reales = obs1.escrituras.filter((w) => w.ruta.startsWith('/private/tmp/tesseract_a9/')); assert.equal(reales.length, 1, 'una sola escritura desde el diálogo real (cancelar no escribe)');
  assert.equal(reales[0].err, 0); assert.equal(reales[0].archivo.sha256, REAL_SHA.plano); assert.equal(sha(`${D}/glb/dialogo-real-a9-plano.glb`), REAL_SHA.plano); assert.deepEqual(obs2.escrituras, []);
  const h = obs1.historialEstado.join('\n');
  assert.ok(h.includes('Exporting GLB…\nGLB saved: /private/tmp/tesseract_a9/a9-plano.glb\nGLB exported from current 3D pose\nExporting GLB…\nGLB export cancelled\nGLB exported from current 3D pose'), 'guardar y cancelar con KI-25');
});
test('V-6 · Shift+clic y Alt+clic en el lienzo REAL (R13): Alt como primer clic tras reconstruir, cambios de base sin duplicados; y con entrada CDP: Shift como primer clic, Escape, pestañas y Debug', () => {
  const h = obs1.historialEstado; const tras = h.slice(h.lastIndexOf('GLB export cancelled'));
  const i = tras.indexOf('3D ready · thickness=0.3mm'); assert.ok(i > 0); assert.match(tras[i + 1], /^Crease C3 selected · Alt\/Option \+ click another red line to retarget$/, 'primer clic tras el 3D = Alt+clic');
  const bases = tras.filter((l) => /^Base set to/.test(l)).map((l) => l.match(/P(\d+)/)[1]); assert.deepEqual(bases, ['3', '9', '9', '9', '7']);
  for (const [k, l] of tras.entries()) if (/^Base set to P/.test(l)) { assert.equal(tras[k - 2], '3D model ready - 11 panels, 10 fold edges', 'cada Shift+clic, una sola reconstrucción'); assert.match(tras[k - 1], /^3D ready · base=P\d+ · thickness=0\.3mm$/); }
  assert.ok(h.some((l) => /^Crease C1 selected/.test(l)) && h.some((l) => /^Crease C4 selected/.test(l)));
  const v = J(`${D}/v6-entrada-cdp.json`).pasos; const p = (n) => v.find((s) => s.nombre === n);
  assert.match(p('primer clic: Shift+clic centro del lienzo').estado, /^Base set to P3 · Shift \+ click another panel to change it$/); assert.equal(p('primer clic: Shift+clic centro del lienzo').pestanaMaterial, true);
  assert.equal(p('Escape en vista 3D').estado, 'Crease selection mode enabled');
  for (const t of ['material', 'artwork', 'creases', 'debug']) assert.deepEqual([p('pestaña tab-btn-' + t).activos, p('pestaña tab-btn-' + t).panelesVisibles], [['tab-btn-' + t], ['tab-' + t]]);
  assert.deepEqual([p('Debug').inicial.visible, p('Debug').trasMarcar.visible, p('Debug').trasDesmarcar.visible], [false, true, false]);
  const e = J(`${D}/v6-escape-cdp.json`); assert.deepEqual([e.trasApplyEspesor.estado, e.escapeConFocoEnEspesor.estado, e.escapeConFocoEnEspesor.foco, e.escapeSinFoco.estado], ['Thickness applied: 0.8mm', 'Thickness applied: 0.8mm', 'thickness-input', 'Crease selection mode enabled']);
});
test('V-7 · GPU en CEP real: sin crecimiento acumulativo (Δ=0 en los 3 ciclos)', () => {
  const r = J(`${D}/${pick(D, 'cdp-leak-')[0]}`).resultado; assert.equal(r.veredicto, 'SIN CRECIMIENTO ACUMULATIVO'); assert.equal(r.conArte, false); assert.equal(r.ciclos, 3);
  assert.deepEqual(r.peor_delta_ciclos_2_en_adelante, { tex: 0, buf: 0, vao: 0, prog: 0 }); for (const d of r.deltas_por_ciclo) for (const k of ['dTex', 'dBuf', 'dVao', 'dProg']) assert.equal(d[k], 0, `ciclo ${d.ciclo} ${k}`);
});
test('V-8 · rollback: carpetas CEP tras retirar V3 = estado previo, que coincide con el previo de A8', () => {
  const s0 = txt(`${D}/snapshot-antes.txt`); assert.equal(txt(`${D}/snapshot-tras-rollback.txt`), s0); assert.ok(!/tesseract-v3/.test(s0)); assert.equal(s0, txt(`${A8}/snapshot-antes.txt`));
});
