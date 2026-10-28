// F2A-1 — Núcleo experimental frente al ORÁCULO de F2A-0 (referencia independiente) y frente a los criterios de comportamiento esperado
// de F2A-0: geometría (áreas por panel), conservación, adyacencias, asignación de cada crease, componentes y diagnósticos. Nunca se
// acepta por el número de paneles. El núcleo no se compara con el legacy para aprobarse (el legacy no es la verdad geométrica).
import { test, describe } from 'node:test'; import assert from 'node:assert/strict'; import fs from 'node:fs'; import path from 'node:path';
import { ROOT } from '../lib/fixtures.mjs';
import { nucleo } from '../../experimental/geometria/nucleo.js';
import { oraculo } from '../lib/f2/oraculo.mjs';
import { firmaTopologica } from '../lib/f2/comparar.mjs';
import { compararConOraculo } from '../lib/f2/comparar-nucleo.mjs';
import { FIXTURES_F2 } from '../lib/f2/fixtures-f2.mjs';

const rd = (f) => JSON.parse(fs.readFileSync(path.join(ROOT, f), 'utf8'));

describe('F2A-1 · núcleo frente al oráculo: 22 fixtures sintéticos de F2A-0', () => {
  for (const [n, f] of Object.entries(FIXTURES_F2)) test(`${n} (${f.categoria})`, () => {
    const d = f.build(); const C = nucleo(d, { eps: f.eps == null ? null : Number(f.eps) }), O = oraculo(d, { eps: f.eps });
    compararConOraculo(C, O);
    const areas = C.paneles.map((p) => p.area).sort((a, b) => a - b), esp = f.esperado.paneles.slice().sort((a, b) => a - b);
    assert.deepEqual(areas.map((a) => +a.toFixed(9)), esp.map((a) => +a.toFixed(9)), 'valor analítico'); assert.equal(C.adyacencias.length, f.esperado.adyacencias); assert.equal(C.componentesPaneles, f.esperado.componentes);
  });
});

const REAL = { 'caja-botanica-real (ε=0)': ['tests/fixtures/real/caja-botanica-real.dieline.json', null], 'caja-botanica-real (ε=0.05)': ['tests/fixtures/real/caja-botanica-real.dieline.json', '0.05'], 'ill-real-caja-botanica (ε=0.05)': ['tests/fixtures/illustrator-real/ill-real-caja-botanica.dieline.json', '0.05'], 'ill-real-caja-botanica (ε=0, fuera de dominio)': ['tests/fixtures/illustrator-real/ill-real-caja-botanica.dieline.json', null], 'histórico ×0.75 (ε=0.05)': ['tests/fixtures/real/caja-botanica-illustrator-export.dieline.json', '0.05'], 'ill-real-caja-simple': ['tests/fixtures/illustrator-real/ill-real-caja-simple.dieline.json', null], 'ill-real-compuesto': ['tests/fixtures/illustrator-real/ill-real-compuesto.dieline.json', null], 'ill-real-curvas (anclas)': ['tests/fixtures/illustrator-real/ill-real-curvas.dieline.json', null] };
describe('F2A-1 · núcleo frente al oráculo: fixtures reales', () => {
  for (const [n, [f, eps]] of Object.entries(REAL)) test(n, () => { const d = rd(f); compararConOraculo(nucleo(d, { eps: eps == null ? null : Number(eps) }), oraculo(d, { eps })); });
  test('curvas muestreadas (16): misma topología y áreas que el oráculo con muestras exactas (|ΔA| ≤ 1e-9 relativo)', () => { const d = rd('tests/fixtures/illustrator-real/ill-real-curvas.dieline.json'); compararConOraculo(nucleo(d, { curvas: { muestras: 16 } }), oraculo(d, { curvas: { muestras: 16 } })); });
});

describe('F2A-1 · criterios de F2A-0 sobre la Caja Botánica (13 paneles candidatos; no solo el conteo)', () => {
  const PANELES = ['C0', 'C0 C8', 'C1', 'C1 C2 C5', 'C10', 'C2', 'C3', 'C3 C11', 'C4', 'C4 C8 C9', 'C5 C6 C11', 'C6 C7 C9 C10', 'C7'];
  for (const [n, f, eps] of [['original sin ajuste', 'tests/fixtures/real/caja-botanica-real.dieline.json', null], ['Illustrator real con ε experimental 0.05', 'tests/fixtures/illustrator-real/ill-real-caja-botanica.dieline.json', 0.05]]) test(n, () => {
    const C = nucleo(rd(f), { eps }); assert.deepEqual(firmaTopologica(C).paneles, PANELES.slice().sort()); assert.equal(C.adyacencias.length, 12); assert.equal(C.componentesPaneles, 1);
    for (const c of C.creases) { assert.equal(c.pares.length, 1, c.id); assert.ok(c.colgante < 1e-9, c.id); }
    assert.ok(Math.abs(C.conservacion.difRelativa) <= 1e-12, 'conservación ' + C.conservacion.difRelativa); assert.equal(C.contornoIntacto, true);
  });
});
