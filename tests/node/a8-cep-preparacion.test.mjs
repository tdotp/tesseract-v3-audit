// A8.5 — Preparación de la validación corta de A8 en el CEP real (NO ejecutada, nada instalado; docs/fase1/A8_VALIDACION_CEP_PROCEDIMIENTO.md).
// La referencia es la evidencia REAL de A7 (docs/fase1/a7-real/). El comparador (tools/a4/a6-comparar-paridad.mjs, con referencia explícita) da «idéntica»
// entre las evidencias reales de A6 y A7 (sin falsos positivos), los GLB reales de A7 tienen los hashes que el procedimiento exige (incluido el GLB con arte, que solo
// se puede comparar byte a byte en CEP real) y el procedimiento cita la huella vigente dist-a8 y su main.js.
import test from 'node:test'; import assert from 'node:assert/strict'; import fs from 'node:fs'; import crypto from 'node:crypto'; import { spawnSync } from 'node:child_process';
import { ROOT } from '../lib/fixtures.mjs'; import { compare } from '../../tools/a4/a6-comparar-paridad.mjs'; import { REAL_SHA } from '../lib/a8.mjs';
const J = (p) => JSON.parse(fs.readFileSync(`${ROOT}/${p}`, 'utf8')); const sha = (p) => crypto.createHash('sha256').update(fs.readFileSync(`${ROOT}/${p}`)).digest('hex');
const PROC = 'docs/fase1/A8_VALIDACION_CEP_PROCEDIMIENTO.md';
export const REFERENCIA_A7 = { caja: 'docs/fase1/a7-real/paridad-caja-2026-10-26T13-27-53-448Z.json', arte: 'docs/fase1/a7-real/paridad-arte-2026-10-26T13-28-46-102Z.json' };
const REFERENCIA_A6 = { caja: 'docs/fase1/a6-real/paridad-caja-2026-10-26T03-15-02-116Z.json', arte: 'docs/fase1/a6-real/paridad-arte-2026-10-26T03-15-33-260Z.json' };
const mainPin = (f) => fs.readFileSync(`${ROOT}/tests/golden/${f}`, 'utf8').split('\n').find((l) => /\.\/main\.js$/.test(l)).split(/\s+/)[0];

test('las referencias reales de A7 existen y son salidas de a4-paridad (perfiles caja y arte)', () => { for (const [p, f] of Object.entries(REFERENCIA_A7)) assert.equal(J(f).profile, p); });
test('evidencia real A6 = A7 (caja y arte) para el comparador: sin falsos positivos con la referencia que usará A8', () => { for (const p of ['caja', 'arte']) assert.deepEqual(compare(J(REFERENCIA_A7[p]), J(REFERENCIA_A6[p])), [], p); });
test('GLB reales de A7: plano, todas a 60° y con arte tienen los hashes completos que exige el procedimiento y son = A6 real byte a byte', () => {
  for (const [k, f] of [['plano', 'paridad-caja-plano.glb'], ['todas60', 'paridad-caja-todas60.glb'], ['arte', 'paridad-arte.glb']]) {
    assert.equal(sha(`docs/fase1/a7-real/glb/${f}`), REAL_SHA[k], k); assert.ok(fs.readFileSync(`${ROOT}/docs/fase1/a7-real/glb/${f}`).equals(fs.readFileSync(`${ROOT}/docs/fase1/a6-real/glb/${f}`)), `${k}: A7 real = A6 real`); }
});
test('CLI con referencia explícita de A7: salida 0 «PARIDAD IDÉNTICA» para la propia evidencia de A7', () => {
  for (const p of ['caja', 'arte']) { const r = spawnSync('node', [`${ROOT}/tools/a4/a6-comparar-paridad.mjs`, `${ROOT}/${REFERENCIA_A7[p]}`, `${ROOT}/${REFERENCIA_A7[p]}`], { encoding: 'utf8' }); assert.equal(r.status, 0, r.stdout + r.stderr); assert.match(r.stdout, /^PARIDAD IDÉNTICA/); }
});
test('el procedimiento existe, está PREPARADO y NO EJECUTADO, exige autorización fechada y apunta a la huella vigente dist-a8 y a su main.js', () => {
  const t = fs.readFileSync(`${ROOT}/${PROC}`, 'utf8'); assert.match(t, /PREPARADO, NO EJECUTADO/); assert.match(t, /--autorizado-por-usuario=AAAA-MM-DD/); assert.match(t, /dist-a8\.SHA256SUMS/);
  const pin = mainPin('dist-a8.SHA256SUMS'); assert.ok(t.includes(pin.slice(0, 8)), 'el procedimiento debe citar el main.js vigente ' + pin.slice(0, 8)); assert.ok(t.includes(pin), 'y su SHA-256 completo');
  assert.notEqual(pin, mainPin('dist-a7.SHA256SUMS'), 'el bundle A8 es distinto del validado en A7: la validación en real no es redundante');
});
test('el procedimiento exige los tres GLB reales (incluida la igualdad BINARIA con arte), las referencias de A7, el diálogo real y el rollback', () => {
  const t = fs.readFileSync(`${ROOT}/${PROC}`, 'utf8');
  for (const k of ['plano', 'todas60', 'arte']) assert.ok(t.includes(REAL_SHA[k].slice(0, 16)), `hash ${k}`);
  for (const f of Object.values(REFERENCIA_A7)) assert.ok(t.includes(f), f);
  for (const s of ['a5-observar.mjs instalar', 'a5-observar.mjs leer', 'Cancelar', 'KI-25', 'a5-estado-doc.sh', 'a4.sh rollback', 'verify-isolation.sh', 'cmp /private/tmp/tesseract_a4/arte.glb']) assert.ok(t.includes(s), s);
});
