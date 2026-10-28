// F2A-0 — Pruebas METAMÓRFICAS del oráculo (comportamiento esperado de F2): escala, traslación, rotación, reflexión, inversión del
// contorno y permutación de la entrada. Dos niveles que no se mezclan (docs/fase2/F2A0_03_CLASIFICACION.md):
//   exactas  la transformación se aplica en racionales ⇒ la topología es IDÉNTICA y las áreas cumplen A' = s²·A EXACTAMENTE;
//   double   la transformación se aplica a los doubles de entrada (como haría Illustrator) ⇒ topología idéntica y ΔA de REPRESENTACIÓN.
// Dominio de escala con ε = 0.05 y ρ = 3 (docs/fase2/03 §3): s·ℓ_min > ρ·ε y s·ν_max < ε/ρ (ℓ_min ≈ 0.4974, ν_max ≈ 0.005).
import { test, describe } from 'node:test'; import assert from 'node:assert/strict'; import fs from 'node:fs'; import path from 'node:path';
import { ROOT } from '../lib/fixtures.mjs';
import * as Q from '../lib/f2/racional.mjs';
import { oraculo } from '../lib/f2/oraculo.mjs';
import { T, PERMUTACIONES, transformarDouble, firmaTopologica, areasPorFirma, compararOraculos } from '../lib/f2/comparar.mjs';
import { FIXTURES_F2 } from '../lib/f2/fixtures-f2.mjs';

const rd = (f) => JSON.parse(fs.readFileSync(path.join(ROOT, f), 'utf8'));
const REAL = rd('tests/fixtures/real/caja-botanica-real.dieline.json'), ILL = rd('tests/fixtures/illustrator-real/ill-real-caja-botanica.dieline.json'), SIMPLE = rd('tests/fixtures/illustrator-real/ill-real-caja-simple.dieline.json');
const BASE = { real: oraculo(REAL, {}), ill: oraculo(ILL, { eps: '0.05' }) };
const opc = { real: {}, ill: { eps: '0.05' } };
const D = { real: REAL, ill: ILL };

function areasEscaladas(A, B, s2) { const a = areasPorFirma(A), b = areasPorFirma(B); for (const [k, x] of a) { assert.ok(b.has(k), 'falta ' + k); assert.ok(Q.igual(Q.mul(x.area, s2), b.get(k).area), `A' = s²·A exacta (${k})`); } }

describe('F2A-0 · metamórficas EXACTAS (racionales)', () => {
  for (const n of ['real', 'ill']) {
    for (const s of n === 'real' ? ['1/2', '3/4', '2', '10'] : ['1/2', '3/4', '2', '3']) test(`${n}: escala ×${s} dentro del dominio ⇒ topología idéntica y A' = s²·A exacta`, () => {
      const R = oraculo(D[n], { ...opc[n], transformar: T.escala(s) }); assert.deepEqual(firmaTopologica(R), firmaTopologica(BASE[n])); const k = Q.deTexto(s); areasEscaladas(BASE[n], R, Q.mul(k, k)); assert.equal(R.conservacion.exacta, true);
    });
    for (const [tn, tf] of [['traslación (1000, −5000)', T.traslacion('1000', '-5000')], ['traslación (1e7, 1e7)', T.traslacion('10000000', '10000000')], ['rotación 90°', T.rot90()], ['rotación 180°', T.rot180()], ['rotación pitagórica 53.13°', T.rotPitagorica()], ['reflexión en X', T.reflexionX()]]) test(`${n}: ${tn} ⇒ topología y áreas idénticas`, () => {
      const R = oraculo(D[n], { ...opc[n], transformar: tf }); assert.deepEqual(firmaTopologica(R), firmaTopologica(BASE[n])); areasEscaladas(BASE[n], R, Q.ONE);
    });
  }
  test('caja simple (hueco a 5 mm del borde): escalas ×1/4…×4 ⇒ siempre 2 paneles y 5 900 netos·s² (el legacy cambia por debajo de ×0.65: KI-33)', () => {
    const B = oraculo(SIMPLE, {}); for (const s of ['1/4', '1/2', '3/4', '2', '4']) { const R = oraculo(SIMPLE, { transformar: T.escala(s) }); assert.deepEqual(firmaTopologica(R), firmaTopologica(B), 's=' + s); const k = Q.deTexto(s); areasEscaladas(B, R, Q.mul(k, k)); }
  });
  test('detalle de 0.5 mm (escalón de crease) a ×1/4…×8 sin ajuste ⇒ misma topología: el oráculo exacto no tiene escala propia', () => {
    const d = FIXTURES_F2['escalon-crease'].build(), B = oraculo(d, {}); for (const s of ['1/4', '1/2', '2', '8']) assert.deepEqual(firmaTopologica(oraculo(d, { transformar: T.escala(s) })), firmaTopologica(B));
  });
  test('fuera del dominio (ill ×1/4: los escalones de 0.5 mm miden 0.124 ≤ ρ·ε) ⇒ el oráculo AVISA (banda ambigua) en lugar de cambiar en silencio', () => {
    const R = oraculo(ILL, { eps: '0.05', transformar: T.escala('1/4') }); assert.ok(R.diagnosticos.some((d) => d.tipo === 'banda-ambigua' || d.tipo === 'ambiguo'));
  });
});

describe('F2A-0 · metamórficas en DOUBLE (diferencias de representación)', () => {
  const rot = (deg) => { const a = (deg * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a); return (p) => ({ x: c * p.x - s * p.y, y: s * p.x + c * p.y }); };
  for (const [tn, f, s2] of [['escala ×0.75', (p) => ({ x: p.x * 0.75, y: p.y * 0.75 }), 0.5625], ['escala ×1.37', (p) => ({ x: p.x * 1.37, y: p.y * 1.37 }), 1.37 * 1.37], ['rotación 37°', rot(37), 1], ['rotación 1°', rot(1), 1], ['traslación +1e5', (p) => ({ x: p.x + 1e5, y: p.y + 1e5 }), 1]]) test(`ill (ε 0.05): ${tn} en double ⇒ topología idéntica, |ΔA/s² − A| ≤ 1e-6 mm²`, () => {
    const R = oraculo(transformarDouble(ILL, f), { eps: '0.05' }); assert.deepEqual(firmaTopologica(R), firmaTopologica(BASE.ill));
    const a = areasPorFirma(BASE.ill), b = areasPorFirma(R); for (const [k, x] of a) assert.ok(Math.abs(Q.aNumero(b.get(k).area) / s2 - Q.aNumero(x.area)) <= 1e-6, k);
  });
  test('real SIN ajuste: rotación 37° en double rompe incidencias exactas (≈1e-14 mm) ⇒ la topología cambia; con ε ≥ 1e-6 se recupera — el redondeo es representación, no topología', () => {
    const d = transformarDouble(REAL, rot(37));
    assert.notDeepEqual(firmaTopologica(oraculo(d, {})), firmaTopologica(BASE.real), 'sin ajuste, el redondeo de la rotación separa extremos que tocaban el corte');
    assert.deepEqual(firmaTopologica(oraculo(d, { eps: '0.000001' })), firmaTopologica(BASE.real));
  });
});

describe('F2A-0 · permutaciones de la entrada (determinismo ante entradas equivalentes)', () => {
  for (const n of ['real', 'ill']) for (const [pn, pf] of Object.entries(PERMUTACIONES)) test(`${n}: ${pn} ⇒ resultado idéntico (salvo reetiquetado)`, () => {
    const { d, mapa } = pf(D[n]); const c = compararOraculos(BASE[n], oraculo(d, opc[n]), { mapa }); assert.equal(c.clase, 'idéntico');
  });
  test('ejecuciones repetidas del mismo troquel ⇒ salida idéntica', () => { const a = JSON.stringify(firmaTopologica(BASE.ill)); for (let i = 0; i < 3; i++) assert.equal(JSON.stringify(firmaTopologica(oraculo(ILL, { eps: '0.05' }))), a); });
});
