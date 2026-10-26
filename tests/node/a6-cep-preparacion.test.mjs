// A6.7 — Preparación de la validación corta de A6 en el CEP real (NO ejecutada, nada instalado): el comparador de paridad que usará
// (tools/a4/a6-comparar-paridad.mjs) da «idéntica» entre las evidencias reales de A4 y A5 y detecta cualquier diferencia que no sea fecha o tiempo.
import test from 'node:test'; import assert from 'node:assert/strict'; import fs from 'node:fs'; import { spawnSync } from 'node:child_process'; import os from 'node:os'; import path from 'node:path';
import { ROOT } from '../lib/fixtures.mjs'; import { compare, REFERENCIA_A5 } from '../../tools/a4/a6-comparar-paridad.mjs';
const J = (p) => JSON.parse(fs.readFileSync(`${ROOT}/${p}`, 'utf8'));
const A4 = { caja: 'docs/fase1/a4-real/paridad-caja-2026-10-24T01-55-59-890Z.json', arte: 'docs/fase1/a4-real/paridad-arte-2026-10-24T01-59-04-464Z.json' };

test('las referencias A5 existen y son las salidas reales de a4-paridad (perfiles caja y arte)', () => { for (const [p, f] of Object.entries(REFERENCIA_A5)) assert.equal(J(f).profile, p); });
test('evidencia real A4 y A5 (caja y arte) idénticas salvo fecha, tiempos y nº de eventos de consola: el comparador no da falsos positivos', () => { for (const p of ['caja', 'arte']) assert.deepEqual(compare(J(A4[p]), J(REFERENCIA_A5[p])), [], p); });
test('el comparador SÍ compara errores y avisos de consola', () => { const r = J(REFERENCIA_A5.arte); const m = JSON.parse(JSON.stringify(r)); m.consola.errores.push('x'); assert.equal(compare(m, r).length, 1); });
test('el comparador detecta un cambio en un hash del lienzo, en el número de paneles y en un GLB', () => {
  const r = J(REFERENCIA_A5.caja); const m = JSON.parse(JSON.stringify(r)); const p4 = m.pasos['P-4 plegado']; p4.hashTodas60 = p4.hashTodas60.replace(/^./, (c) => (c === '0' ? '1' : '0'));
  assert.equal(compare(m, r).length, 1);
  const m2 = JSON.parse(JSON.stringify(r)); m2.pasos['P-2 paso a 3D'].paneles3D = '12'; assert.equal(compare(m2, r).length, 1);
  const m3 = JSON.parse(JSON.stringify(r)); const k = Object.keys(m3.pasos).find((x) => x.startsWith('P-8')); m3.pasos[k].extra = 1; assert.equal(compare(m3, r).length, 1);
});
test('CLI: salida 0 «PARIDAD IDÉNTICA» con la evidencia de A5 y salida 1 con una copia alterada', () => {
  const ok = spawnSync('node', [`${ROOT}/tools/a4/a6-comparar-paridad.mjs`, `${ROOT}/${REFERENCIA_A5.caja}`], { encoding: 'utf8' }); assert.equal(ok.status, 0, ok.stdout + ok.stderr); assert.match(ok.stdout, /^PARIDAD IDÉNTICA/);
  const t = fs.mkdtempSync(path.join(os.tmpdir(), 'tess-a6cmp-')); const m = J(REFERENCIA_A5.caja); m.pasos['P-1 extracción y validación'].status = 'otra cosa'; fs.writeFileSync(path.join(t, 'n.json'), JSON.stringify(m));
  const bad = spawnSync('node', [`${ROOT}/tools/a4/a6-comparar-paridad.mjs`, path.join(t, 'n.json')], { encoding: 'utf8' }); fs.rmSync(t, { recursive: true, force: true }); assert.equal(bad.status, 1); assert.match(bad.stdout, /^DIFERENCIAS \(1\)/);
});
