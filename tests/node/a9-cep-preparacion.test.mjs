// A9.6 — Preparación de la validación corta de A9 en el CEP real (NO ejecutada, nada instalado; docs/fase1/A9_VALIDACION_CEP_PROCEDIMIENTO.md, D-A9-12).
// La referencia es la evidencia REAL de A8 (docs/fase1/a8-real/). El comparador (tools/a4/a6-comparar-paridad.mjs, con referencia explícita) da «idéntica» entre las
// evidencias reales de A7 y A8 (sin falsos positivos), los GLB reales de A8 tienen los hashes que exige el procedimiento y el procedimiento cita la huella vigente dist-a9,
// las comprobaciones manuales de Shift+clic y Alt+clic (R13), KI-29 y la búsqueda de «Pick error» en la consola.
import test from 'node:test'; import assert from 'node:assert/strict'; import fs from 'node:fs'; import crypto from 'node:crypto'; import { spawnSync } from 'node:child_process';
import { ROOT } from '../lib/fixtures.mjs'; import { compare } from '../../tools/a4/a6-comparar-paridad.mjs'; import { REAL_SHA } from '../lib/a8.mjs';
const J = (p) => JSON.parse(fs.readFileSync(`${ROOT}/${p}`, 'utf8')); const sha = (p) => crypto.createHash('sha256').update(fs.readFileSync(`${ROOT}/${p}`)).digest('hex');
const PROC = 'docs/fase1/A9_VALIDACION_CEP_PROCEDIMIENTO.md';
export const REFERENCIA_A8 = { caja: 'docs/fase1/a8-real/paridad-caja-2026-10-26T23-20-40-335Z.json', arte: 'docs/fase1/a8-real/paridad-arte-2026-10-26T23-23-49-804Z.json' };
const REFERENCIA_A7 = { caja: 'docs/fase1/a7-real/paridad-caja-2026-10-26T13-27-53-448Z.json', arte: 'docs/fase1/a7-real/paridad-arte-2026-10-26T13-28-46-102Z.json' };
const mainPin = (f) => fs.readFileSync(`${ROOT}/tests/golden/${f}`, 'utf8').split('\n').find((l) => /\.\/main\.js$/.test(l)).split(/\s+/)[0];

test('las referencias reales de A8 existen y son salidas de a4-paridad (perfiles caja y arte)', () => { for (const [p, f] of Object.entries(REFERENCIA_A8)) assert.equal(J(f).profile, p); });
test('evidencia real A7 = A8 (caja y arte) para el comparador: sin falsos positivos con la referencia que usará A9', () => { for (const p of ['caja', 'arte']) assert.deepEqual(compare(J(REFERENCIA_A8[p]), J(REFERENCIA_A7[p])), [], p); });
test('GLB reales de A8: plano, todas a 60°, con arte y del diálogo real tienen los hashes completos que exige el procedimiento', () => {
  for (const [k, f] of [['plano', 'paridad-caja-plano.glb'], ['todas60', 'paridad-caja-todas60.glb'], ['arte', 'paridad-arte.glb'], ['plano', 'dialogo-real-a8-plano.glb']]) assert.equal(sha(`docs/fase1/a8-real/glb/${f}`), REAL_SHA[k], f);
});
test('CLI con referencia explícita de A8: salida 0 «PARIDAD IDÉNTICA» para la propia evidencia de A8', () => {
  for (const p of ['caja', 'arte']) { const r = spawnSync('node', [`${ROOT}/tools/a4/a6-comparar-paridad.mjs`, `${ROOT}/${REFERENCIA_A8[p]}`, `${ROOT}/${REFERENCIA_A8[p]}`], { encoding: 'utf8' }); assert.equal(r.status, 0, r.stdout + r.stderr); assert.match(r.stdout, /^PARIDAD IDÉNTICA/); }
});
test('el procedimiento existe, está PREPARADO y NO EJECUTADO, exige autorización fechada y apunta a la huella vigente dist-a9 y a su main.js', () => {
  const t = fs.readFileSync(`${ROOT}/${PROC}`, 'utf8'); assert.match(t, /PREPARADO, NO EJECUTADO/); assert.match(t, /--autorizado-por-usuario=AAAA-MM-DD/); assert.match(t, /dist-a9\.SHA256SUMS/);
  const pin = mainPin('dist-a9.SHA256SUMS'); assert.ok(t.includes(pin.slice(0, 8)), 'el procedimiento debe citar el main.js vigente ' + pin.slice(0, 8)); assert.ok(t.includes(pin), 'y su SHA-256 completo');
  assert.notEqual(pin, mainPin('dist-a8.SHA256SUMS'), 'el bundle A9 es distinto del validado en A8: la validación en real no es redundante');
});
test('el procedimiento exige los GLB reales (incluida la igualdad BINARIA con arte), las referencias de A8, el diálogo real, la interfaz a mano (Shift/Alt+clic, KI-29, Pick error) y el rollback', () => {
  const t = fs.readFileSync(`${ROOT}/${PROC}`, 'utf8');
  for (const k of ['plano', 'todas60', 'arte']) assert.ok(t.includes(REAL_SHA[k].slice(0, 16)), `hash ${k}`);
  for (const f of Object.values(REFERENCIA_A8)) assert.ok(t.includes(f), f);
  for (const s of ['a5-observar.mjs instalar', 'a5-observar.mjs leer', 'Cancelar', 'KI-25', 'KI-29', 'Shift+clic', 'Alt+clic', 'Primer clic tras el 3D', 'Pick error', 'cdp-run.mjs console --seconds=240', 'Escape', 'Reset Flat', 'a5-estado-doc.sh', 'a4.sh rollback', 'verify-isolation.sh', 'cmp /private/tmp/tesseract_a4/arte.glb', 'F1 no se declara cerrada']) assert.ok(t.includes(s), s);
});
