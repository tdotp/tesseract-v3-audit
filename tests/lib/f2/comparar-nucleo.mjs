// F2A-1 — Comparación del núcleo experimental con el oráculo de F2A-0 (usa node:assert: solo para pruebas).
import assert from 'node:assert/strict';
import * as Q from './racional.mjs';
import { firmaTopologica } from './comparar.mjs';

const cs = (l) => l.slice().sort((a, b) => Number(a.slice(1)) - Number(b.slice(1))).join(' ');
// paneles por firma (conjunto de creases + rango por área entre los de igual conjunto) → área
const porFirma = (R, area) => { const g = new Map(); R.paneles.forEach((p, i) => { const k = cs(p.creases); if (!g.has(k)) g.set(k, []); g.get(k).push({ i, a: area(p) }); }); const m = new Map(); for (const [k, ps] of g) ps.sort((x, y) => x.a - y.a).forEach((p, r) => m.set(k + '#' + r, p)); return m; };

// Tolerancias de REPRESENTACIÓN: el núcleo calcula áreas y longitudes en double desde coordenadas aproximadas; el error absoluto crece
// con la magnitud M de las coordenadas (≈ u·M por coordenada). La topología se compara exactamente.
export function compararConOraculo(C, O) {
  let M = 1; for (const p of C.paneles) for (const v of p.poligono) M = Math.max(M, Math.abs(v.x), Math.abs(v.y)); const tolL = 1e-12 * M, tolA = (x) => 1e-9 * Math.max(1, x) + 1e-12 * M * M;
  assert.deepEqual(firmaTopologica(C), firmaTopologica(O), 'topología: paneles, adyacencias y componentes');
  const fo = porFirma(O, (p) => Q.aNumero(p.area)), fc = porFirma(C, (p) => p.area);
  for (const [k, o] of fo) { const c = fc.get(k); assert.ok(c, 'falta ' + k); assert.ok(Math.abs(c.a - o.a) <= tolA(o.a), `área ${k}: ${c.a} frente a ${o.a}`); }
  const nombre = (R, i) => cs(R.paneles[i].creases);
  for (const co of O.creases) {
    const cc = C.creases.find((x) => x.id === co.id);
    for (const k of ['separa', 'colgante', 'sobreCorte', 'fuera', 'borde']) assert.ok(Math.abs(cc[k] - co[k]) <= 1e-9 * Math.max(1, co[k]) + tolL, `${co.id}.${k}: ${cc[k]} frente a ${co[k]}`);
    const pares = (R, x) => x.pares.map((p) => p.split('-').map((i) => nombre(R, Number(i))).sort().join(' ⟷ ')).sort();
    assert.deepEqual(pares(C, cc), pares(O, co), co.id + ': parejas que separa');
  }
  assert.equal(C.arreglo.eulerOK, true); assert.equal(C.arreglo.paridadCoherente, true); assert.equal(C.contornoIntacto, true);
  const tipos = (ds) => { const m = {}; ds.forEach((d) => { m[d.tipo] = (m[d.tipo] || 0) + 1; }); return m; };
  assert.deepEqual(tipos(C.diagnosticos), tipos(O.diagnosticos), 'mismos diagnósticos (ajuste, banda-ambigua, astilla, ambiguo)');
  assert.ok(Math.abs(C.conservacion.generadaMm2 - Q.aNumero(O.conservacion.generada)) <= tolA(C.conservacion.esperadaMm2), 'conservación');
}

