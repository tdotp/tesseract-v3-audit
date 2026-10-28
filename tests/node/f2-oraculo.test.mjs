// F2A-0 — ORÁCULO independiente: independencia, aritmética exacta y comportamiento ESPERADO DE F2 sobre fixtures sintéticos analíticos.
// Estas pruebas NO describen al legacy (eso está en f2-legacy-historico.test.mjs). Las de categoría «indeterminado» fijan lo que el oráculo
// INFORMA (geometría tal cual + diagnóstico) en casos en los que el resultado correcto no está decidido (docs/fase2/F2A0_04_AMBIGUEDADES.md).
import { test, describe } from 'node:test'; import assert from 'node:assert/strict'; import fs from 'node:fs'; import path from 'node:path';
import { ROOT, rounded } from '../lib/fixtures.mjs';
import * as Q from '../lib/f2/racional.mjs';
import { oraculo, resumen } from '../lib/f2/oraculo.mjs';
import { FIXTURES_F2 } from '../lib/f2/fixtures-f2.mjs';
import { firmaTopologica } from '../lib/f2/comparar.mjs';

describe('F2A-0 · independencia del oráculo', () => {
  test('oraculo.mjs solo importa racional.mjs; racional.mjs no importa nada; ninguno toca src/, el legacy ni tesseract-web', () => {
    const o = fs.readFileSync(path.join(ROOT, 'tests/lib/f2/oraculo.mjs'), 'utf8'), r = fs.readFileSync(path.join(ROOT, 'tests/lib/f2/racional.mjs'), 'utf8');
    assert.deepEqual([...o.matchAll(/^import .* from '([^']+)'/gm)].map((m) => m[1]), ['./racional.mjs']);
    assert.equal([...r.matchAll(/^import /gm)].length, 0);
    for (const t of [o, r].map((x) => x.replace(/\/\/.*$/gm, ''))) { assert.doesNotMatch(t, /src\/|core\/legacy|tesseract-web|GRAPH_EPS|TOLERANCE_MM/); assert.doesNotMatch(t, /Math\.atan2/); } // código sin comentarios
  });
  test('sin tolerancias ocultas: una T exacta perturbada 1e-12 mm sin ajuste deja la rama colgante (no se cose sola)', () => {
    const d = FIXTURES_F2['t-exacta'].build(); d.creases[1].points[0].anchor.x += 1e-12;
    const R = resumen(oraculo(d, { eps: null })); assert.equal(R.paneles.length, 2); assert.ok(R.creases[1].colganteMm > 39.99);
  });
});

describe('F2A-0 · aritmética racional exacta', () => {
  test('deDouble es exacto (0.1, subnormal, negativos) y deTexto(0.05) = 1/20', () => {
    assert.equal(Q.texto(Q.deDouble(0.1)), '3602879701896397/36028797018963968');
    assert.equal(Q.texto(Q.deDouble(-0.75)), '-3/4'); assert.equal(Q.texto(Q.deDouble(5e-324)), '1/' + (2n ** 1074n));
    assert.equal(Q.texto(Q.deTexto('0.05')), '1/20'); assert.equal(Q.texto(Q.deTexto('3/4')), '3/4');
  });
  test('orient es exacto donde el double se equivoca', () => {
    const p = { x: 0.5, y: 0.5000000000000001 }, q = { x: 12, y: 12 }, r = { x: 24, y: 24 };
    const det = (q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x); assert.equal(det, 0); // el double dice colineal…
    assert.equal(Q.orient(Q.pDouble(p), Q.pDouble(q), Q.pDouble(r)), 1); // …pero los tres doubles NO son colineales exactamente
  });
});

for (const cat of ['esperado-F2', 'indeterminado']) describe(`F2A-0 · sintéticos «${cat}»`, () => {
  for (const [n, f] of Object.entries(FIXTURES_F2).filter(([, f]) => f.categoria === cat)) test(`${n} — ${f.desc}`, () => {
    const R = resumen(oraculo(f.build(), { eps: f.eps })), E = f.esperado;
    const areas = R.paneles.map((p) => Q.deTexto(p.area)).sort(Q.cmp), esp = E.paneles.map(Q.deDouble).sort(Q.cmp);
    assert.deepEqual(areas.map(Q.texto), esp.map(Q.texto), 'áreas exactas');
    assert.equal(R.adyacencias.length, E.adyacencias, 'adyacencias'); assert.equal(R.componentesPaneles, E.componentes, 'componentes');
    assert.equal(R.conservacion.exacta, true, 'conservación exacta'); assert.equal(R.arreglo.eulerOK, true, 'Euler'); assert.equal(R.arreglo.paridadCoherente, true); assert.equal(R.contornoIntacto, true, 'el contorno no se mueve');
    for (const [t, k] of Object.entries(E.diag || {})) assert.ok(R.ambiguedades.filter((d) => d.tipo === t).length + (t === 'ajuste' ? R.ajustes : 0) >= k, `diagnóstico ${t} ≥ ${k}`);
    if (!E.diag && cat === 'esperado-F2') assert.equal(R.ambiguedades.length, 0, 'sin ambigüedades');
    const sum = (k) => R.creases.reduce((s, c) => s + c[k], 0);
    if (E.colganteMm != null) assert.ok(Math.abs(sum('colganteMm') - E.colganteMm) < 1e-6, 'colgante'); else assert.ok(sum('colganteMm') < 1e-9, 'sin creases colgantes');
    if (E.fueraMm != null) assert.ok(Math.abs(sum('fueraMm') - E.fueraMm) < 1e-6);
    if (E.sobreCorteMm != null) assert.ok(Math.abs(sum('sobreCorteMm') - E.sobreCorteMm) < 1e-6);
    if (E.longitudCero != null) assert.equal(R.segmentosLongitudCero, E.longitudCero);
    if (E.islas != null) assert.equal(R.paneles.reduce((s, p) => s + p.islas, 0), E.islas);
  });
});

describe('F2A-0 · discretización frente a topología', () => {
  test('curvas como anclas o muestreadas (16, 64): misma topología; el área crece con N hacia la Bézier (≈ 7102.26 por integración fina) — diferencia de discretización', () => {
    const A = oraculo(rounded(), {}), B = oraculo(rounded(), { curvas: { muestras: 16 } }), C = oraculo(rounded(), { curvas: { muestras: 64 } });
    assert.deepEqual(firmaTopologica(A), firmaTopologica(B)); assert.deepEqual(firmaTopologica(B), firmaTopologica(C));
    const a = Q.aNumero(A.conservacion.generada), b = Q.aNumero(B.conservacion.generada), c = Q.aNumero(C.conservacion.generada);
    assert.equal(a, 7000); assert.ok(a < b && b < c && c < 7102.26, `${a} < ${b} < ${c} < 7102.26`); assert.equal(B.conservacion.exacta, true); assert.equal(C.conservacion.exacta, true);
  });
});

describe('F2A-0 · controles negativos del oráculo (sensibilidad)', () => {
  test('quitar una crease de la cruz ⇒ 3 paneles, no 4', () => { const d = FIXTURES_F2['x-cruz'].build(); d.creases.pop(); assert.equal(oraculo(d).paneles.length, 2); });
  test('un panel menos en la T ⇒ la conservación sigue exacta pero la crease efectiva desaparece (el área sola no basta)', () => {
    const R = resumen(oraculo(FIXTURES_F2['t-ruido-sin-ajuste'].build())); assert.equal(R.conservacion.exacta, true); assert.equal(R.creases[1].pares.length, 0);
  });
  test('el ajuste nunca mueve el contorno aunque un extremo de crease esté a ε de un vértice del contorno', () => {
    const d = FIXTURES_F2['escalon-contorno'].build(); d.creases[0].points[1].anchor.y -= 0.01; // extremo a 0.01 del vértice (40,40)
    const R = resumen(oraculo(d, { eps: '0.05' })); assert.equal(R.contornoIntacto, true); assert.equal(R.paneles.length, 2); assert.equal(R.conservacion.exacta, true);
  });
  test('el ajuste no cose geometría a más de ε (0.06 > 0.05): la crease queda colgante y se informa', () => {
    const R = resumen(oraculo(FIXTURES_F2['t-desalineada-0.375'].build(), { eps: '0.05' })); assert.equal(R.paneles.length, 2);
    const R2 = resumen(oraculo(FIXTURES_F2['t-exacta'].build().creases && (() => { const d = FIXTURES_F2['t-exacta'].build(); d.creases[1].points[0].anchor.x += 0.06; return d; })(), { eps: '0.05' }));
    assert.equal(R2.paneles.length, 2); assert.ok(R2.ambiguedades.some((d) => d.tipo === 'banda-ambigua'));
  });
});
