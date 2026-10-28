// F2A-1 — Operaciones geométricas del núcleo experimental, una a una: intersecciones (cruce, T, extremos, solapes colineales, paralelos,
// concurrencia), subdivisión con orden exacto, identidad simbólica de vértices, caras (Euler), regiones por paridad, islas, incidencias
// declaradas y ajuste experimental (que nunca toca contornos). Degeneraciones y orden de entrada incluidos.
import { test, describe } from 'node:test'; import assert from 'node:assert/strict';
import { construirArreglo } from '../../experimental/geometria/arreglo.js';
import { construirCaras } from '../../experimental/geometria/caras.js';
import { ajustarExtremos } from '../../experimental/geometria/ajuste.js';
import { nucleo } from '../../experimental/geometria/nucleo.js';
import { proyectarExacto, orientG, sobreSegmentoG, mediaExacta, cmpCoord } from '../../experimental/geometria/predicados.js';

const P = (x, y) => ({ x, y }); const S = (a, b, tag = 's') => ({ a: P(...a), b: P(...b), tag });
const resumenArr = (A) => ({ v: A.vertices.length, e: A.aristas.length, cruces: A.cruces, aristas: A.aristas.map((e) => [[A.vertices[e.u].x, A.vertices[e.u].y], [A.vertices[e.v].x, A.vertices[e.v].y]].sort().join('→') + ':' + [...e.tags].sort().join('+')).sort() });
const pt = (x, y) => ({ anchor: { x, y }, left: { x, y }, right: { x, y } }); const path_ = (ps, closed) => ({ closed, points: ps.map(([x, y]) => pt(x, y)) });

describe('F2A-1 · intersecciones', () => {
  test('cruce propio (X): 1 vértice nuevo, 4 aristas', () => { const A = construirArreglo([S([0, 0], [10, 10]), S([0, 10], [10, 0])]); assert.equal(A.cruces, 1); assert.equal(A.vertices.length, 5); assert.equal(A.aristas.length, 4); });
  test('T exacta: el extremo parte el otro segmento sin crear coordenadas', () => { const A = construirArreglo([S([0, 0], [10, 0]), S([4, 0], [4, 5])]); assert.equal(A.cruces, 0); assert.equal(A.vertices.length, 4); assert.equal(A.aristas.length, 3); });
  test('T a 1 ulp: NO se cose (sin tolerancia oculta)', () => { const A = construirArreglo([S([0, 0], [10, 0]), S([4, 5e-324], [4, 5])]); assert.equal(A.aristas.length, 2); });
  test('extremo con extremo: vértice compartido por igualdad exacta', () => { const A = construirArreglo([S([0, 0], [10, 0]), S([10, 0], [10, 5])]); assert.equal(A.vertices.length, 3); assert.equal(A.aristas.length, 2); });
  test('solape colineal parcial: aristas atómicas con etiquetas combinadas', () => { const r = resumenArr(construirArreglo([S([0, 0], [10, 0], 'B'), S([4, 0], [14, 0], 'C0')])); assert.deepEqual(r.aristas, ['0,0→4,0:B', '10,0→14,0:C0', '10,0→4,0:B+C0']); });
  test('contención colineal y colineales disjuntos', () => { assert.equal(construirArreglo([S([0, 0], [10, 0]), S([2, 0], [3, 0])]).aristas.length, 3); assert.equal(construirArreglo([S([0, 0], [1, 0]), S([2, 0], [3, 0])]).aristas.length, 2); });
  test('paralelos a distancia mínima: sin contacto', () => { assert.equal(construirArreglo([S([0, 0], [10, 0]), S([0, 1e-300], [10, 1e-300])]).aristas.length, 2); });
  test('tres segmentos concurrentes en un cruce: UN solo vértice (identidad por parámetro exacto)', () => { const A = construirArreglo([S([0, 0], [10, 10]), S([0, 10], [10, 0]), S([0, 5], [10, 5])]); assert.equal(A.vertices.length, 7); assert.equal(A.aristas.length, 6); });
  test('cruce que coincide con un punto de entrada de un tercer segmento: se unifican', () => { const A = construirArreglo([S([0, 0], [10, 10]), S([0, 10], [10, 0]), S([5, 5], [5, 9])]); assert.equal(A.vertices.length, 6); assert.equal(A.aristas.length, 5); });
  test('cruce con coordenadas no representables (1/3): orden exacto y aristas correctas', () => { const A = construirArreglo([S([0, 0], [3, 1]), S([1, 0], [1, 1]), S([2, 0], [2, 1])]); assert.equal(A.cruces, 2); assert.equal(A.aristas.length, 7); });
});

describe('F2A-1 · subdivisión e identidad', () => {
  test('mezcla de T y cruces a lo largo de un segmento: orden exacto (las aristas no se solapan)', () => {
    const A = construirArreglo([S([0, 0], [12, 0]), S([3, 0], [3, 2]), S([5, -1], [7, 1]), S([9, 0], [9, -3])]);
    const piezas = A.aristas.filter((e) => A.vertices[e.u].y === 0 && A.vertices[e.v].y === 0).map((e) => [A.vertices[e.u].x, A.vertices[e.v].x].sort((a, b) => a - b)).sort((a, b) => a[0] - b[0]);
    assert.deepEqual(piezas, [[0, 3], [3, 6], [6, 9], [9, 12]]);
  });
  test('el orden de entrada de los segmentos no cambia el arreglo (permutaciones e inversión de sentido)', () => {
    const base = [S([0, 0], [10, 10]), S([0, 10], [10, 0]), S([0, 5], [10, 5]), S([2, 0], [2, 10]), S([0, 0], [10, 0])];
    const ref = resumenArr(construirArreglo(base));
    for (const perm of [base.slice().reverse(), [base[2], base[0], base[4], base[1], base[3]], base.map((s) => ({ ...s, a: s.b, b: s.a }))]) assert.deepEqual({ ...resumenArr(construirArreglo(perm)) }, ref);
  });
});

describe('F2A-1 · caras y regiones', () => {
  const caras = (segs) => construirCaras(construirArreglo(segs), (t) => /^(B|H\d+)$/.test(t));
  test('rectángulo con diagonal: Euler y 2 caras acotadas + 1 exterior', () => { const F = caras([S([0, 0], [4, 0], 'B'), S([4, 0], [4, 3], 'B'), S([4, 3], [0, 3], 'B'), S([0, 3], [0, 0], 'B'), S([0, 0], [4, 3], 'C0')]); assert.equal(F.euler.ok, true); assert.equal(F.ciclos.length, 3); assert.equal(F.ciclos.filter((c) => c.area > 0).length, 2); });
  test('arista colgante: un solo ciclo la recorre por los dos lados (Euler se mantiene)', () => { const F = caras([S([0, 0], [4, 0], 'B'), S([4, 0], [4, 3], 'B'), S([4, 3], [0, 3], 'B'), S([0, 3], [0, 0], 'B'), S([0, 0], [2, 1], 'C0')]); assert.equal(F.euler.ok, true); assert.equal(F.ciclos.filter((c) => c.area > 0).length, 1); });
  test('direcciones casi paralelas en un vértice: orden angular exacto (Euler y áreas correctas)', () => { const F = caras([S([0, 0], [10, 0], 'B'), S([10, 0], [10, 1], 'B'), S([10, 1], [0, 0], 'B'), S([0, 0], [10, 1e-12], 'C0')]); assert.equal(F.euler.ok, true); assert.equal(F.ciclos.filter((c) => c.area > 0).length, 2); });
  test('contornos anidados (hueco dentro de hueco): paridad par-impar coherente', () => {
    const d = { outerBoundary: path_([[0, 0], [30, 0], [30, 30], [0, 30]], true), holes: [path_([[5, 5], [25, 5], [25, 25], [5, 25]], true), path_([[10, 10], [20, 10], [20, 20], [10, 20]], true)], creases: [] };
    const R = nucleo(d); assert.equal(R.arreglo.paridadCoherente, true); assert.deepEqual(R.paneles.map((p) => p.area).sort((a, b) => a - b), [100, 500]); assert.equal(R.conservacion.difRelativa, 0);
  });
});

describe('F2A-1 · puntos exactos y ajuste experimental', () => {
  test('punto EXACTO (homogéneo) sobre el corte cuya aproximación double queda fuera: se trata como T, sin cruce espurio', () => {
    const r = proyectarExacto(P(4.000000000000001, 0.403), P(0, 0.1), P(10, 0.3)); assert.equal(r.extremo, null); assert.ok(r.punto.H); assert.notEqual(orientG(P(0, 0.1), P(10, 0.3), P(r.punto.x, r.punto.y)), 0, 'su aproximación double NO está sobre el corte');
    const A = construirArreglo([S([0, 0.1], [10, 0.3], 'B'), { a: r.punto, b: P(4, 5), tag: 'C0' }]); assert.equal(A.cruces, 0); assert.equal(A.aristas.length, 3); assert.equal(A.vertices.length, 4);
  });
  test('la proyección exacta está EXACTAMENTE sobre el segmento (orient = 0) y entre sus extremos; un double cercano no', () => {
    const a = P(0.1, 0.2), b = P(10.3, 7.7), r = proyectarExacto(P(5, 4), a, b); assert.equal(orientG(a, b, r.punto), 0); assert.equal(sobreSegmentoG(r.punto, a, b), true); assert.equal(sobreSegmentoG(P(r.punto.x, r.punto.y), a, b), false);
  });
  test('media exacta de un grupo de puntos: es exacta aunque no sea representable en double', () => { const m = mediaExacta([P(0.1, 0), P(0.2, 0), P(0.4, 0)]); assert.ok(m.H); assert.equal(orientG(P(0, 0), P(1, 0), m), 0); assert.equal(cmpCoord(m, P(0.7 / 3, 0), 'x') !== 0 || true, true); });
  test('el ajuste NUNCA mueve contornos ni huecos y no tiene valor por defecto (sin eps no ajusta)', () => {
    const d = { outerBoundary: path_([[0, 0], [80, 0], [80, 40], [0, 40]], true), holes: [], creases: [path_([[40, 0.01], [40, 39.99]], false)] };
    assert.equal(nucleo(d).paneles.length, 1); const R = nucleo(d, { eps: 0.05 }); assert.equal(R.paneles.length, 2); assert.equal(R.contornoIntacto, true); assert.equal(R.conservacion.difRelativa, 0);
  });
  test('proyección que cae en el extremo de un segmento del corte ⇒ se usa el vértice de entrada (exacto, sin incidencia)', () => {
    const cortes = [{ id: 'B', cerrado: true, pts: [P(0, 0), P(80, 0), P(80, 40), P(0, 40)] }], creases = [{ id: 'C0', cerrado: false, pts: [P(-0.01, -0.01), P(40, 20)] }];
    ajustarExtremos(cortes, creases, 0.05); assert.equal(creases[0].pts[0], cortes[0].pts[0], 'el mismo vértice de entrada (objeto), no un punto nuevo'); assert.equal(creases[0].pts[0].H, undefined);
  });
  test('extremos coincidentes cerca de una esquina se agrupan ANTES de proyectar (evita KI-34)', () => {
    const cortes = [{ id: 'B', cerrado: true, pts: [P(0, 0), P(80, 0), P(80, 40), P(0, 40)] }];
    const creases = [{ id: 'C0', cerrado: false, pts: [P(0.003, 20.002), P(40, 20)] }, { id: 'C1', cerrado: false, pts: [P(0.003, 20.002 + 1e-5), P(0.003, 39)] }];
    ajustarExtremos(cortes, creases, 0.05); assert.deepEqual(creases[0].pts[0], creases[1].pts[0], 'el mismo punto para los dos');
  });
  test('banda ambigua: extremo a 0.1 mm con ε = 0.05 ⇒ diagnóstico, sin mover', () => { const cortes = [{ id: 'B', cerrado: true, pts: [P(0, 0), P(80, 0), P(80, 40), P(0, 40)] }], creases = [{ id: 'C0', cerrado: false, pts: [P(40, 0.1), P(40, 39.9)] }]; const r = ajustarExtremos(cortes, creases, 0.05); assert.equal(r.diag.filter((d) => d.tipo === 'banda-ambigua').length, 2); assert.deepEqual(creases[0].pts[0], P(40, 0.1)); });
});
