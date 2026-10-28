// F2A-1 — Metamórficas del núcleo experimental. Dos comprobaciones por transformación:
//   (1) DIFERENCIAL: núcleo(T(d)) = oráculo(T(d)) sobre los MISMOS doubles (el núcleo decide igual que la aritmética exacta);
//   (2) INVARIANCIA: núcleo(T(d)) tiene la misma topología que núcleo(d); con transformaciones exactas en double (×2^k, 90°, 180°,
//       reflexión) además A' = s²·A sin error; con las inexactas la diferencia es de representación.
import { test, describe } from 'node:test'; import assert from 'node:assert/strict'; import fs from 'node:fs'; import path from 'node:path';
import { ROOT } from '../lib/fixtures.mjs';
import { nucleo } from '../../experimental/geometria/nucleo.js';
import { oraculo } from '../lib/f2/oraculo.mjs';
import { firmaTopologica, transformarDouble, PERMUTACIONES } from '../lib/f2/comparar.mjs';
import { compararConOraculo } from '../lib/f2/comparar-nucleo.mjs';

const rd = (f) => JSON.parse(fs.readFileSync(path.join(ROOT, f), 'utf8'));
const REAL = rd('tests/fixtures/real/caja-botanica-real.dieline.json'), ILL = rd('tests/fixtures/illustrator-real/ill-real-caja-botanica.dieline.json');
const rot = (deg) => { const a = (deg * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a); return (p) => ({ x: c * p.x - s * p.y, y: s * p.x + c * p.y }); };
const areas = (R) => R.paneles.map((p) => p.creases.join(' ') + '=' + p.area).sort();

const EXACTAS = [['×2', (p) => ({ x: 2 * p.x, y: 2 * p.y }), 4], ['×1/2', (p) => ({ x: p.x / 2, y: p.y / 2 }), 0.25], ['×1/4', (p) => ({ x: p.x / 4, y: p.y / 4 }), 1 / 16], ['×4', (p) => ({ x: 4 * p.x, y: 4 * p.y }), 16], ['rotación 90°', (p) => ({ x: -p.y, y: p.x }), 1], ['rotación 180°', (p) => ({ x: -p.x, y: -p.y }), 1], ['reflexión X', (p) => ({ x: -p.x, y: p.y }), 1]];
const INEXACTAS = [['×0.75', (p) => ({ x: 0.75 * p.x, y: 0.75 * p.y })], ['×1.37', (p) => ({ x: 1.37 * p.x, y: 1.37 * p.y })], ['rotación 37°', rot(37)], ['rotación 1°', rot(1)], ['traslación +1000', (p) => ({ x: p.x + 1000, y: p.y - 1000 })], ['traslación +1e5', (p) => ({ x: p.x + 1e5, y: p.y + 1e5 })], ['traslación +1e7', (p) => ({ x: p.x + 1e7, y: p.y + 1e7 })]];

for (const [n, d, eps] of [['original (sin ajuste)', REAL, null], ['Illustrator real (ε 0.05)', ILL, '0.05']]) describe(`F2A-1 · metamórficas · ${n}`, () => {
  const base = nucleo(d, { eps: eps == null ? null : Number(eps) });
  for (const [tn, f, s2] of EXACTAS) test(`${tn} (exacta en double): = oráculo; topología idéntica y A' = s²·A (1e-12)`, () => {
    const dt = transformarDouble(d, f), C = nucleo(dt, { eps: eps == null ? null : Number(eps) });
    compararConOraculo(C, oraculo(dt, { eps })); assert.deepEqual(firmaTopologica(C), firmaTopologica(base));
    // topología exacta; el área se calcula en double desde otro vértice inicial tras rotar/reflejar ⇒ igualdad a 1e-12 relativo (representación)
    const b = new Map(base.paneles.map((p) => [p.creases.join(' '), p.area])); for (const p of C.paneles) assert.ok(Math.abs(p.area - b.get(p.creases.join(' ')) * s2) <= 1e-12 * p.area, p.creases.join(' '));
  });
  for (const [tn, f] of INEXACTAS) test(`${tn} (inexacta): = oráculo sobre los mismos doubles`, () => {
    const dt = transformarDouble(d, f); compararConOraculo(nucleo(dt, { eps: eps == null ? null : Number(eps) }), oraculo(dt, { eps }));
  });
  for (const [pn, pf] of Object.entries(PERMUTACIONES)) test(`${pn}: resultado idéntico salvo reetiquetado`, () => {
    const { d: dp, mapa } = pf(d); const C = nucleo(dp, { eps: eps == null ? null : Number(eps) }); assert.deepEqual(firmaTopologica(C, mapa), firmaTopologica(base));
  });
});

describe('F2A-1 · invariancia y representación', () => {
  test('Illustrator real (ε 0.05): las 7 transformaciones inexactas conservan la topología (13 paneles)', () => {
    const f0 = firmaTopologica(nucleo(ILL, { eps: 0.05 })); for (const [, f] of INEXACTAS) assert.deepEqual(firmaTopologica(nucleo(transformarDouble(ILL, f), { eps: 0.05 })), f0);
  });
  test('original SIN ajuste: rotación 37° en double rompe incidencias exactas igual que en el oráculo (representación); con ε = 1e-6 se recupera', () => {
    const dt = transformarDouble(REAL, rot(37)); const f0 = firmaTopologica(nucleo(REAL));
    assert.notDeepEqual(firmaTopologica(nucleo(dt)), f0); assert.deepEqual(firmaTopologica(nucleo(dt, { eps: 1e-6 })), f0);
  });
  test('traslación +1e7 (KI-32 en el legacy): el núcleo conserva la topología y el área relativa ≤ 1e-9', () => {
    const C = nucleo(transformarDouble(ILL, (p) => ({ x: p.x + 1e7, y: p.y + 1e7 })), { eps: 0.05 }); assert.deepEqual(firmaTopologica(C), firmaTopologica(nucleo(ILL, { eps: 0.05 }))); assert.ok(Math.abs(C.conservacion.difRelativa) <= 1e-9);
  });
  test('ejecuciones repetidas: salida idéntica', () => { const a = JSON.stringify(nucleo(ILL, { eps: 0.05 }).paneles); for (let i = 0; i < 5; i++) assert.equal(JSON.stringify(nucleo(ILL, { eps: 0.05 }).paneles), a); });
});
