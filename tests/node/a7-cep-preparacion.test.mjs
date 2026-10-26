// A7.7 — Preparación de la validación corta de A7 en el CEP real (NO ejecutada, nada instalado; docs/fase1/A7_VALIDACION_CEP_PROCEDIMIENTO.md).
// La referencia es la evidencia REAL de A6 (docs/fase1/a6-real/). El comparador (tools/a4/a6-comparar-paridad.mjs, con referencia explícita) da «idéntica»
// entre las evidencias reales de A5 y A6 (sin falsos positivos), y los GLB reales de A6 tienen los hashes que el procedimiento exige.
import test from 'node:test'; import assert from 'node:assert/strict'; import fs from 'node:fs'; import crypto from 'node:crypto'; import { spawnSync } from 'node:child_process';
import { ROOT } from '../lib/fixtures.mjs'; import { compare, REFERENCIA_A5 } from '../../tools/a4/a6-comparar-paridad.mjs';
const J = (p) => JSON.parse(fs.readFileSync(`${ROOT}/${p}`, 'utf8')); const sha = (p) => crypto.createHash('sha256').update(fs.readFileSync(`${ROOT}/${p}`)).digest('hex');
export const REFERENCIA_A6 = { caja: 'docs/fase1/a6-real/paridad-caja-2026-10-26T03-15-02-116Z.json', arte: 'docs/fase1/a6-real/paridad-arte-2026-10-26T03-15-33-260Z.json' };

test('las referencias reales de A6 existen y son salidas de a4-paridad (perfiles caja y arte)', () => { for (const [p, f] of Object.entries(REFERENCIA_A6)) assert.equal(J(f).profile, p); });
test('evidencia real A5 = A6 (caja y arte) para el comparador: sin falsos positivos con la referencia que usará A7', () => { for (const p of ['caja', 'arte']) assert.deepEqual(compare(J(REFERENCIA_A6[p]), J(REFERENCIA_A5[p])), [], p); });
test('GLB reales de A6: plano 737bcd23…, todas a 60° 87aa2e4c…, arte b4973a54… (los valores que V-3 exige a A7)', () => {
  assert.match(sha('docs/fase1/a6-real/glb/paridad-caja-plano.glb'), /^737bcd2312da1191/); assert.match(sha('docs/fase1/a6-real/glb/paridad-caja-todas60.glb'), /^87aa2e4c5cc39092/); assert.match(sha('docs/fase1/a6-real/glb/paridad-arte.glb'), /^b4973a54840cd0c1/);
});
test('CLI con referencia explícita de A6: salida 0 «PARIDAD IDÉNTICA» para la propia evidencia de A6', () => {
  for (const p of ['caja', 'arte']) { const r = spawnSync('node', [`${ROOT}/tools/a4/a6-comparar-paridad.mjs`, `${ROOT}/${REFERENCIA_A6[p]}`, `${ROOT}/${REFERENCIA_A6[p]}`], { encoding: 'utf8' }); assert.equal(r.status, 0, r.stdout + r.stderr); assert.match(r.stdout, /^PARIDAD IDÉNTICA/); }
});
test('el procedimiento existe, exige autorización fechada y apunta a la huella vigente dist-a7', () => {
  const t = fs.readFileSync(`${ROOT}/docs/fase1/A7_VALIDACION_CEP_PROCEDIMIENTO.md`, 'utf8'); assert.match(t, /PREPARADO, NO EJECUTADO/); assert.match(t, /--autorizado-por-usuario=AAAA-MM-DD/); assert.match(t, /dist-a7\.SHA256SUMS/);
  const pin = fs.readFileSync(`${ROOT}/tests/golden/dist-a7.SHA256SUMS`, 'utf8').split('\n').find((l) => /\.\/main\.js$/.test(l)).split(/\s+/)[0]; assert.ok(t.includes(pin.slice(0, 8)), 'el procedimiento debe citar el main.js vigente ' + pin.slice(0, 8));
});
