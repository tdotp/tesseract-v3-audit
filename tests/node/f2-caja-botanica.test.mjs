// F2A-0 — Caja Botánica según el ORÁCULO independiente: los 13 paneles CANDIDATOS (DP-2: candidato, no criterio único) con contornos,
// área, adyacencias y asignación de cada crease; estabilidad frente a ε; correspondencia entre las tres extracciones del mismo troquel.
// Comportamiento ESPERADO DE F2 (no describe al legacy; eso está en f2-legacy-historico.test.mjs).
import { test, describe } from 'node:test'; import assert from 'node:assert/strict'; import fs from 'node:fs'; import path from 'node:path';
import { ROOT } from '../lib/fixtures.mjs';
import { oraculo, resumen } from '../lib/f2/oraculo.mjs';
import { firmaTopologica, compararOraculos, mapaCreasesPorGeometria } from '../lib/f2/comparar.mjs';
import { generar } from '../tools/make-f2-golden.mjs';

const rd = (f) => JSON.parse(fs.readFileSync(path.join(ROOT, f), 'utf8'));
const REAL = rd('tests/fixtures/real/caja-botanica-real.dieline.json'), ILL = rd('tests/fixtures/illustrator-real/ill-real-caja-botanica.dieline.json'), HIST = rd('tests/fixtures/real/caja-botanica-illustrator-export.dieline.json');
// Conjunto de creases que separa cada panel candidato (identificador estable, docs/fase2/04 §4) y parejas adyacentes por crease
const PANELES = ['C0', 'C0 C8', 'C1', 'C1 C2 C5', 'C10', 'C2', 'C3', 'C3 C11', 'C4', 'C4 C8 C9', 'C5 C6 C11', 'C6 C7 C9 C10', 'C7'];
const ADY = { C0: ['C0', 'C0 C8'], C1: ['C1', 'C1 C2 C5'], C2: ['C1 C2 C5', 'C2'], C3: ['C3', 'C3 C11'], C4: ['C4', 'C4 C8 C9'], C5: ['C1 C2 C5', 'C5 C6 C11'], C6: ['C5 C6 C11', 'C6 C7 C9 C10'], C7: ['C6 C7 C9 C10', 'C7'], C8: ['C0 C8', 'C4 C8 C9'], C9: ['C4 C8 C9', 'C6 C7 C9 C10'], C10: ['C10', 'C6 C7 C9 C10'], C11: ['C3 C11', 'C5 C6 C11'] };
const g = JSON.parse(fs.readFileSync(path.join(ROOT, 'tests/golden/f2-caja-botanica.golden.json'), 'utf8'));

function comprobar13(R, nombre, mapa = (id) => id) {
  const S = resumen(R); S.paneles.forEach((p) => { p.creases = p.creases.map(mapa).sort((a, b) => Number(a.slice(1)) - Number(b.slice(1))); }); S.creases.forEach((c) => { c.id = mapa(c.id); });
  assert.equal(S.paneles.length, 13, nombre + ': 13 paneles candidatos');
  assert.deepEqual(firmaTopologica(R, mapa).paneles, PANELES.slice().sort(), nombre + ': conjunto de creases de cada panel');
  assert.equal(S.conservacion.exacta, true, nombre + ': Σ paneles = área par-impar del contorno, EXACTA'); assert.equal(S.contornoIntacto, true);
  assert.equal(S.componentesPaneles, 1, nombre + ': una sola componente'); assert.equal(S.arreglo.eulerOK, true); assert.equal(S.arreglo.paridadCoherente, true);
  assert.equal(S.adyacencias.length, 12, nombre + ': 12 adyacencias');
  const firma = new Map(S.paneles.map((p, i) => [i, p.creases.join(' ')]));
  for (const c of S.creases) {
    assert.equal(c.pares.length, 1, `${nombre}: ${c.id} separa exactamente una pareja de paneles`); assert.ok(c.colganteMm < 1e-9, `${nombre}: ${c.id} sin tramos colgantes`);
    const [a, b] = c.pares[0].split('-').map(Number); assert.deepEqual([firma.get(a), firma.get(b)].sort(), ADY[c.id].slice().sort(), `${nombre}: ${c.id} une los paneles esperados`);
  }
  return S;
}

describe('F2A-0 · Caja Botánica: 13 paneles candidatos del oráculo', () => {
  test('extracción original del plugin SIN ningún ajuste (ε = 0): 13, área exacta, 12 creases efectivas, 0 ajustes', () => { const S = comprobar13(oraculo(REAL, {}), 'real ε=0'); assert.equal(S.ajustes, 0); assert.equal(S.ambiguedades.length, 0); });
  test('extracción de Illustrator real con ε experimental 0.05: 13 con 19 ajustes de ruido (≤ 0.005 mm) y 0 ambigüedades', () => { const R = oraculo(ILL, { eps: '0.05' }); comprobar13(R, 'ill'); const aj = R.diagnosticos.filter((d) => d.tipo === 'ajuste'); assert.equal(aj.length, 19); assert.ok(Math.max(...aj.map((d) => d.d_mm)) <= 0.005); assert.equal(R.diagnosticos.length, 19); });
  test('fixture histórico ×0.75 con ε 0.05: misma topología (13) tras reetiquetar sus creases (otro orden de lectura del SVG, Y invertida)', () => {
    const m = mapaCreasesPorGeometria(REAL, HIST); assert.equal(m.flip, true); comprobar13(oraculo(HIST, { eps: '0.05' }), 'hist ×0.75', (id) => m.mapa.get(id));
  });
  test('detalles de 0.5 mm conservados (DP-1): C7 y C10 recorren 0.501 mm sobre el corte en la extracción original y ningún vértice del contorno se mueve', () => {
    const S = resumen(oraculo(REAL, {})); const c = new Map(S.creases.map((x) => [x.id, x]));
    assert.ok(Math.abs(c.get('C7').sobreCorteMm - 0.501) < 1e-3); assert.ok(Math.abs(c.get('C10').sobreCorteMm - 0.501) < 1e-3); assert.equal(S.contornoIntacto, true);
  });
  test('el resultado del oráculo coincide con el golden (tests/golden/f2-caja-botanica.golden.json, generado desde el oráculo)', () => {
    const x = generar(); for (const k of Object.keys(g.casos)) assert.deepEqual(x.casos[k], g.casos[k], k);
  });
});

describe('F2A-0 · Caja Botánica: estabilidad frente a ε y límites del dominio', () => {
  test('extracción original: misma topología para ε ∈ {0, 1e-6, 0.001, 0.01, 0.05, 0.1}', () => { const f0 = firmaTopologica(oraculo(REAL, {})); for (const eps of ['0.000001', '0.001', '0.01', '0.05', '0.1']) assert.deepEqual(firmaTopologica(oraculo(REAL, { eps })), f0, 'ε=' + eps); });
  test('extracción de Illustrator: meseta de 13 para ε ∈ {0.01, 0.05, 0.1}; con ε = 0.3 la banda (ρ·ε = 0.9) alcanza los detalles de 0.5 mm y el oráculo lo AVISA', () => {
    const f = firmaTopologica(oraculo(ILL, { eps: '0.05' })); for (const eps of ['0.01', '0.1']) assert.deepEqual(firmaTopologica(oraculo(ILL, { eps })), f, 'ε=' + eps);
    const R3 = oraculo(ILL, { eps: '0.3' }); assert.ok(R3.diagnosticos.some((d) => d.tipo !== 'ajuste'), 'ε=0.3 ⇒ diagnósticos de ambigüedad');
  });
  test('fuera de dominio por debajo: ε = 0.001 < ruido (0.005) ⇒ no se cierran las uniones y el resultado NO es el candidato (se documenta, no se acepta)', () => {
    const S = resumen(oraculo(ILL, { eps: '0.001' })); assert.notEqual(S.paneles.length, 13); assert.equal(S.conservacion.exacta, true, 'el área se conserva igualmente: el área sola no basta como oráculo');
  });
});

describe('F2A-0 · correspondencia entre las tres extracciones del mismo troquel', () => {
  test('original frente a Illustrator real: topología idéntica y diferencias de área de REPRESENTACIÓN (|ΔA| ≤ ν·perímetro, ν = 0.005 mm)', () => {
    const c = compararOraculos(oraculo(REAL, {}), oraculo(ILL, { eps: '0.05' }), { ruidoMm: 0.005 });
    assert.equal(c.topologiaIgual, true); assert.equal(c.clase, 'representación'); assert.ok(c.filas.every((f) => Math.abs(f.dA) <= f.cota));
  });
  test('original frente al histórico ×0.75: topología idéntica (la escala del fixture no cambia la topología del oráculo)', () => {
    const m = mapaCreasesPorGeometria(REAL, HIST); assert.equal(compararOraculos(oraculo(REAL, {}), oraculo(HIST, { eps: '0.05' }), { mapa: (id) => m.mapa.get(id) }).topologiaIgual, true);
    const mi = mapaCreasesPorGeometria(REAL, ILL); assert.equal(mi.flip, false); assert.ok([...mi.mapa].every(([b, a]) => a === b), 'la extracción de Illustrator real conserva el orden de las creases');
  });
});
