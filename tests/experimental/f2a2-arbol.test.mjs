// F2A-2 — Árbol de plegado experimental (experimental/plegado/arbol.js): validez frente al ORÁCULO (adyacencias y niveles BFS
// independientes), signo comprobado por sondas geométricas sobre el polígono del oráculo (no por semiaristas), plegado rígido con la
// convención de src/fold/folding.js, determinismo ante permutaciones, invariancia ante transformaciones, componentes, ciclos y A-1…A-12.
import { test, describe } from 'node:test'; import assert from 'node:assert/strict'; import fs from 'node:fs'; import path from 'node:path';
import { ROOT, gridDieline } from '../lib/fixtures.mjs';
import { adaptarPanelModel, construirAdyacencias, construirArbolPlegado, baseDefecto, ErrorPanelModel } from '../../experimental/plegado/index.js';
import { oraculo } from '../lib/f2/oraculo.mjs';
import { PERMUTACIONES, transformarDouble } from '../lib/f2/comparar.mjs';
import { FIXTURES_F2 } from '../lib/f2/fixtures-f2.mjs';
import { firmasModelo, firmasOraculo, poligonoOraculo, ladoPorSondas, nivelesBFS, plegar, centroidePoli, arbolCanonico, clasificarUnionesOraculo, componentesYCiclomatico } from '../lib/f2/plegado.mjs';

const rd = (f) => JSON.parse(fs.readFileSync(path.join(ROOT, f), 'utf8'));
const CB = 'tests/fixtures/real/caja-botanica-real.dieline.json', ILL = 'tests/fixtures/illustrator-real/ill-real-caja-botanica.dieline.json', HIST = 'tests/fixtures/real/caja-botanica-illustrator-export.dieline.json';
const CASOS = [...Object.entries(FIXTURES_F2).map(([n, f]) => [n, f.build, f.eps]), ['caja-botanica-real', () => rd(CB), null], ['ill-real-caja-botanica ε 0.05', () => rd(ILL), '0.05'], ['histórico ×0.75 ε 0.05', () => rd(HIST), '0.05'],
  ['ill-real-caja-simple', () => rd('tests/fixtures/illustrator-real/ill-real-caja-simple.dieline.json'), null], ['ill-real-compuesto', () => rd('tests/fixtures/illustrator-real/ill-real-compuesto.dieline.json'), null], ['rejilla 2×2', () => gridDieline(2), null], ['rejilla 6×6', () => gridDieline(6), null], ['rejilla 3×3 líneas completas', () => gridDieline(3, { fullLines: true }), null]];
const todo = (d, eps, base) => { const m = adaptarPanelModel(d, { eps }); const A = construirAdyacencias(m); const b = base == null ? baseDefecto(m) : base; return { m, A, T: construirArbolPlegado(m, A, b), b }; };

// Validez del árbol desde una base contra el oráculo: aristas = adyacencias, niveles BFS independientes, signo por sondas, componentes
function validarArbol(d, eps, base) {
  const { m, A, T } = todo(d, eps, base); const O = oraculo(d, { eps }); const fm = firmasModelo(m), fo = firmasOraculo(O); const oi = fm.map((f) => fo.indexOf(f)); const n = m.panels.length;
  // grafo de bisagras de referencia = uniones del oráculo clasificadas como plegables de forma independiente (F2A-2R, H-01; antes: todas)
  const CI = clasificarUnionesOraculo(O, d); assert.ok(CI.every((x) => x.clase !== 'sin-aristas-en-poligono'), 'clasificación independiente completa');
  const paresP = CI.filter((x) => x.clase === 'plegable').map((x) => [oi.indexOf(x.a), oi.indexOf(x.b)]);
  const L = nivelesBFS(n, paresP, base); assert.deepEqual(T.niveles, L, 'niveles BFS = los del grafo de bisagras del oráculo');
  const comp = L.filter((x) => x >= 0).length; assert.equal(T.aristas.length, comp - 1, 'árbol de la componente de la base'); assert.deepEqual(T.noAlcanzados, L.map((x, i) => (x < 0 ? i : -1)).filter((i) => i >= 0));
  const hijos = new Set(); T.aristas.forEach((e, k) => {
    assert.ok(!hijos.has(e.child) && e.child !== base, 'cada panel entra una vez'); hijos.add(e.child); assert.equal(T.niveles[e.parent], T.niveles[e.child] - 1, 'padre en el nivel anterior');
    const x = A.adyacencias[T.adyacenciaDeArista[k]]; assert.deepEqual([x.panelA, x.panelB], [e.parent, e.child].sort((a, b) => a - b), 'la arista es una adyacencia'); assert.equal(e.crease, x.crease, 'mismo eje que la adyacencia (alias, como el legacy)');
    assert.deepEqual(Object.keys(e).sort(), ['child', 'crease', 'parent', 'sign'], 'FoldEdge v1 sin campos extra'); assert.ok(e.sign === 1 || e.sign === -1);
    const lado = ladoPorSondas(poligonoOraculo(O.paneles[oi[e.child]]), e.crease); assert.notEqual(lado, 0, 'sonda decidida'); assert.equal(e.sign, lado, `signo de P${e.parent}→P${e.child}: hijo a la ${lado > 0 ? 'izquierda' : 'derecha'} de a→b`);
    assert.equal(ladoPorSondas(poligonoOraculo(O.paneles[oi[e.parent]]), e.crease), -lado, 'el padre está al otro lado');
  });
  assert.equal(T.adyacenciasFueraDelArbol.length, A.adyacencias.length - T.aristas.length);
  // componentes y ciclos sobre el grafo COMPLETO de bisagras (F2A-2R, H-02; antes se exigía `ciclo` ante cualquier adyacencia fuera del árbol)
  const ref = componentesYCiclomatico(n, paresP); const ncomp = T.componentes.length; assert.equal(ncomp, ref.componentes, 'componentes del grafo de bisagras');
  assert.equal(T.diagnosticos.some((x) => x.tipo === 'componente-desconectado'), ncomp > 1); assert.equal(T.numeroCiclomatico, ref.ciclomatico, 'ν = m − n + c independiente');
  assert.equal(T.adyacenciasCiclo.length, ref.ciclomatico); assert.equal(T.diagnosticos.some((x) => x.tipo === 'ciclo'), ref.ciclomatico > 0, 'diagnóstico de ciclo solo si hay ciclos reales');
  const part = [...T.adyacenciaDeArista, ...T.adyacenciasCiclo, ...T.adyacenciasNoAlcanzadas].sort((x, y) => x - y); assert.deepEqual(part, A.adyacencias.map((_, k) => k), 'árbol + ciclo + no alcanzadas = todas, sin repetición');
  const enBase = new Set(T.componentes[0]); for (const k of T.adyacenciasNoAlcanzadas) assert.ok(!enBase.has(A.adyacencias[k].panelA), 'las no alcanzadas son de otras componentes');
  for (const k of T.adyacenciasCiclo) assert.equal(componentesYCiclomatico(n, A.adyacencias.filter((_, j) => j !== k).map((x) => [x.panelA, x.panelB])).componentes, ref.componentes, 'quitar una adyacencia de ciclo no desconecta nada');
  return { m, A, T };
}

describe('F2A-2 · árbol válido desde la base por defecto (22 sintéticos, 5 reales, rejillas)', () => {
  for (const [n, build, eps] of CASOS) test(n, () => { const d = build(); const m = adaptarPanelModel(d, { eps }); validarArbol(d, eps, baseDefecto(m)); });
});
describe('F2A-2 · selección explícita de base: cualquier panel da un árbol válido', () => {
  for (const [n, f, eps] of [['caja-botanica-real (13 bases)', CB, null], ['ill-real-caja-botanica ε 0.05 (13 bases)', ILL, '0.05']]) test(n, () => { const d = rd(f); for (let b = 0; b < 13; b++) validarArbol(d, eps, b); });
  test('rejilla 4×4 (16 bases)', () => { const d = gridDieline(4); for (let b = 0; b < 16; b++) validarArbol(d, null, b); });
  test('base inválida: error explícito (no se elige otra en silencio)', () => { const { m, A } = todo(rd(CB), null); for (const b of [-1, 13, 1.5, '0', null, undefined, NaN]) assert.throws(() => construirArbolPlegado(m, A, b), (e) => e instanceof ErrorPanelModel && e.codigo === 'base-invalida'); });
  test('base por defecto = mayor área bruta (regla del legacy); con área neta puede cambiar (DP-6) y se calcula aparte', () => {
    const q = (x, y) => ({ anchor: { x, y }, left: { x, y }, right: { x, y } }); const R4 = (pts) => ({ closed: true, points: pts.map(([x, y]) => q(x, y)) });
    const d = { version: '1.0', units: 'mm', cutLines: [], outerBoundary: R4([[0, 0], [90, 0], [90, 80], [0, 80]]), holes: [R4([[55, 20], [75, 20], [75, 70], [55, 70]])], creases: [{ closed: false, points: [q(40, 0), q(40, 80)] }] }; // 40×80 | 50×80 con hueco 20×50
    const { m } = todo(d, null); const b = baseDefecto(m), bn = baseDefecto(m, { area: 'neta' }); assert.equal(m.panels[b].area, 4000); assert.equal(m.f2a2.paneles[bn].areaNeta, 3200); assert.notEqual(b, bn, 'bruta y neta eligen paneles distintos');
  });
});

describe('F2A-2 · plegado rígido con la convención de src/fold/folding.js (ejes y ángulos)', () => {
  for (const [n, d, eps] of [['caja-botanica-real', () => rd(CB), null], ['ill-real ε 0.05', () => rd(ILL), '0.05'], ['rejilla 4×4', () => gridDieline(4), null], ['T exacta (tres bisagras sobre dos rectas)', FIXTURES_F2['t-exacta'].build, null]]) test(n, () => {
    const { m, T, b } = todo(d(), eps); const P = m.panels; const N = P.length; let M = 1; for (const p of P) for (const v of p.vertices) M = Math.max(M, Math.abs(v.x), Math.abs(v.y));
    const T0 = plegar(N, T.aristas, b, []); for (let i = 0; i < N; i++) if (T.niveles[i] >= 0) for (const v of P[i].vertices) { const w = T0[i](v); assert.ok(Math.abs(w.x - v.x) + Math.abs(w.y - v.y) + Math.abs(w.z) < 1e-12 * M, 'a 0° todo queda plano y en su sitio'); }
    let s = 7; const r = () => ((s = (s * 1103515245 + 12345) % 2147483648) / 2147483648) * 180 - 90; const ang = T.aristas.map(r); const TA = plegar(N, T.aristas, b, ang);
    T.aristas.forEach((e) => { for (const q of [e.crease.a, e.crease.b]) { const wp = TA[e.parent](q), wc = TA[e.child](q); assert.ok(Math.hypot(wp.x - wc.x, wp.y - wc.y, wp.z - wc.z) < 1e-9 * M, 'la bisagra une padre e hijo en cualquier ángulo'); } });
    T.aristas.forEach((e, k) => { const una = T.aristas.map((_, j) => (j === k ? 90 : 0)); const T1 = plegar(N, T.aristas, b, una); const c = centroidePoli(P[e.child].vertices); assert.ok(T1[e.child](c).z > 0, `+90° visible levanta el hijo P${e.child} hacia +z`); assert.ok(Math.abs(T1[e.parent](centroidePoli(P[e.parent].vertices)).z) < 1e-9 * M, 'el padre no se mueve'); });
  });
});

describe('F2A-2 · determinismo ante permutaciones del orden de entrada (árbol canónico idéntico, en el mismo orden)', () => {
  const BASES = [['caja-botanica-real', () => rd(CB), null], ['ill-real ε 0.05', () => rd(ILL), '0.05'], ['x-cruz', FIXTURES_F2['x-cruz'].build, null], ['rejilla 4×4', () => gridDieline(4), null], ['t-exacta', FIXTURES_F2['t-exacta'].build, null], ['hueco-descentrado', FIXTURES_F2['hueco-descentrado'].build, null]];
  for (const [n, build, eps] of BASES) for (const [pn, perm] of Object.entries(PERMUTACIONES)) test(`${n} · ${pn}`, () => {
    const d = build(); const R0 = todo(d, eps); const { d: d2, mapa } = perm(d); const R1 = todo(d2, eps);
    const f0 = firmasModelo(R0.m), f1 = firmasModelo(R1.m, mapa); assert.equal(f1[R1.b], f0[R0.b], 'misma base por defecto');
    assert.deepEqual(arbolCanonico(R1.m, R1.T, mapa), arbolCanonico(R0.m, R0.T), 'mismas aristas, mismo orden, mismo eje y mismo lado');
  });
  test('repetición: salida idéntica', () => { const a = todo(rd(ILL), '0.05'), b = todo(rd(ILL), '0.05'); assert.equal(JSON.stringify([a.A, a.T]), JSON.stringify([b.A, b.T])); });
});

describe('F2A-2 · invariancia ante transformaciones (mismo árbol por firmas y niveles; signo válido en cada copia)', () => {
  const TR = { '×2': (p) => ({ x: 2 * p.x, y: 2 * p.y }), '×½': (p) => ({ x: p.x / 2, y: p.y / 2 }), 'rotación 90°': (p) => ({ x: -p.y, y: p.x }), 'rotación 180°': (p) => ({ x: -p.x, y: -p.y }), 'reflexión': (p) => ({ x: -p.x, y: p.y }),
    '×0.75': (p) => ({ x: 0.75 * p.x, y: 0.75 * p.y }), 'rotación 37°': (p) => { const c = Math.cos(37 * Math.PI / 180), s = Math.sin(37 * Math.PI / 180); return { x: c * p.x - s * p.y, y: s * p.x + c * p.y }; }, '+1e5': (p) => ({ x: p.x + 1e5, y: p.y + 1e5 }) };
  const exacta = (t) => !/0\.75|37|1e5/.test(t);
  const estructura = (R) => { const f = firmasModelo(R.m); return { base: f[R.b], aristas: R.T.aristas.map((e) => f[e.parent] + ' → ' + f[e.child]).sort(), niveles: f.map((x, i) => x + '@' + R.T.niveles[i]).sort() }; };
  for (const [n, build, epsExacta] of [['caja-botanica-real', () => rd(CB), null], ['ill-real', () => rd(ILL), '0.05'], ['rejilla 4×4', () => gridDieline(4), null]]) for (const [tn, f] of Object.entries(TR)) test(`${n} · ${tn}`, () => {
    const eps = exacta(tn) ? epsExacta : '0.05'; const d = build(); const d2 = transformarDouble(d, f); const R0 = todo(d, eps), R1 = todo(d2, eps);
    const E0 = estructura(R0), E1 = estructura(R1);
    if (/rejilla/.test(n)) assert.deepEqual(E1.niveles.length, E0.niveles.length); else assert.deepEqual(E1, E0, 'mismo árbol (la Caja Botánica no tiene ciclos: el árbol es único)');
    validarArbol(d2, eps, R1.b);
  });
});

describe('F2A-2 · casos ambiguos A-1…A-12 (F2A0_04): comportamiento del adaptador y del árbol', () => {
  const p = (x, y) => ({ anchor: { x, y }, left: { x, y }, right: { x, y } }); const P = (pts, closed) => ({ closed, points: pts.map(([x, y]) => p(x, y)) });
  const W = (o) => ({ version: '1.0', units: 'mm', holes: [], cutLines: [], outerBoundary: P([[0, 0], [80, 0], [80, 40], [0, 40]], true), ...o });
  const diags = (R) => new Set([...R.m.f2a2.diagnosticos, ...R.A.diagnosticos, ...R.T.diagnosticos].map((x) => x.tipo));
  // F2A-2R (H-01): antes este caso exigía 1 FoldEdge (el tramo colineal más largo como bisagra); ahora la unión es no plegable y no hay pliegue
  test('A-1 detalles de 0,5 mm: se conservan; el escalón de crease que separa la misma pareja es una unión NO plegable: sin FoldEdge, con diagnóstico y desconexión explicada', () => {
    const R = todo(FIXTURES_F2['escalon-crease'].build(), null); assert.ok(diags(R).has('union-no-plegable')); assert.equal(R.T.aristas.length, 0); assert.equal(R.A.adyacencias.length, 0);
    const u = R.A.uniones[0]; assert.equal(u.clase, 'no-plegable'); assert.equal(u.grupos.length, 3); assert.equal(R.T.componentes.length, 2); assert.deepEqual(R.T.diagnosticos.find((x) => x.tipo === 'componente-desconectado').unionesNoPlegablesEntreComponentes.map((x) => x.union), [0]);
    const C = todo(FIXTURES_F2['escalon-contorno'].build(), null); assert.equal(C.T.aristas.length, 1); assert.ok(!diags(C).has('union-no-plegable'));
  });
  test('A-2 Caja Botánica: 13 paneles, 12 adyacencias, el grafo ya es un árbol (sin ciclos ni componentes sueltas) en las tres extracciones', () => {
    for (const [f, e] of [[CB, null], [ILL, '0.05'], [HIST, '0.05']]) { const R = todo(rd(f), e); assert.equal(R.T.aristas.length, 12); assert.equal(R.T.adyacenciasFueraDelArbol.length, 0); assert.ok(!diags(R).has('ciclo') && !diags(R).has('componente-desconectado') && !diags(R).has('adyacencia-no-colineal')); }
  });
  test('A-3 T a 0,375: 2 paneles y crease colgante AVISADA (el núcleo no avisaba)', () => { const R = todo(FIXTURES_F2['t-desalineada-0.375'].build(), '0.05'); assert.equal(R.m.panels.length, 2); assert.ok(diags(R).has('crease-colgante')); assert.equal(R.T.aristas.length, 1); });
  test('A-4 crease corta en la banda: banda-ambigua del núcleo se conserva; 0 pliegues', () => { const R = todo(FIXTURES_F2['crease-corta-banda'].build(), '0.05'); assert.ok(diags(R).has('banda-ambigua') && diags(R).has('crease-sin-efecto')); assert.equal(R.T.aristas.length, 0); });
  test('A-5 crease corta 0,6: ahora con diagnóstico crease-colgante (propuesta de F2A-0); 0 pliegues', () => { const R = todo(FIXTURES_F2['crease-corta-0.6'].build(), '0.05'); assert.ok(diags(R).has('crease-colgante')); assert.equal(R.T.aristas.length, 0); });
  test('A-6 crease paralela al corte a 1/256: la astilla se conserva y es un panel plegable (decisión abierta)', () => { const R = todo(FIXTURES_F2['crease-paralela-ruido'].build(), '0.05'); assert.ok(diags(R).has('astilla')); assert.equal(R.T.aristas.length, 1); });
  test('A-7 Illustrator real sin ajuste: 4 paneles, creases colgantes avisadas; se documenta, no se acepta', () => { const R = todo(rd(ILL), null); assert.equal(R.m.panels.length, 4); assert.ok(diags(R).has('crease-colgante')); validarArbol(rd(ILL), null, R.b); });
  test('A-8 fuera de dominio (Illustrator real ×1/4 con ε 0,05): avisos del núcleo presentes en el modelo', () => { const d = transformarDouble(rd(ILL), (q) => ({ x: q.x / 4, y: q.y / 4 })); const R = todo(d, '0.05'); assert.ok(diags(R).has('banda-ambigua') || diags(R).has('ambiguo')); validarArbol(d, '0.05', R.b); });
  test('A-9 cortes abiertos: el que divide da dos componentes y diagnóstico; el parcial, una pieza', () => {
    const R = todo(FIXTURES_F2['corte-abierto-divide'].build(), null); assert.equal(R.T.componentes.length, 2); assert.ok(diags(R).has('componente-desconectado'));
    const Q2 = todo(FIXTURES_F2['corte-abierto-parcial'].build(), null); assert.equal(Q2.m.panels.length, 1); assert.equal(Q2.T.aristas.length, 0);
    const d = W({ creases: [P([[40, 0], [40, 40]], false)], cutLines: [{ geom: P([[20, 20], [60, 20]], false) }] }); const H = todo(d, null); validarArbol(d, null, H.b); // corte abierto que cruza la crease
  });
  test('A-10 curvas: anclas y 16 muestras dan el mismo árbol por firmas', () => { const d = rd('tests/fixtures/illustrator-real/ill-real-curvas.dieline.json'); const a = todo(d, null), b = (() => { const m = adaptarPanelModel(d, { curvas: { muestras: 16 } }); const A = construirAdyacencias(m); const bb = baseDefecto(m); return { m, A, T: construirArbolPlegado(m, A, bb), b: bb }; })(); assert.deepEqual(firmasModelo(b.m), firmasModelo(a.m)); assert.deepEqual(b.T.aristas.map((e) => [e.parent, e.child, e.sign]), a.T.aristas.map((e) => [e.parent, e.child, e.sign])); });
  test('A-11 cadena de ajuste C (T sobre T con ruido): = oráculo; 4 paneles, 5 adyacencias, ciclo diagnosticado', () => {
    const r = 1 / 256; const d = W({ creases: [P([[40, 0], [40, 40]], false), P([[40 + r, 20], [80, 20]], false), P([[60, 20 + r], [60, 40]], false)] });
    const R = validarArbol(d, '0.05', baseDefecto(adaptarPanelModel(d, { eps: 0.05 }))); assert.equal(R.m.panels.length, 4); assert.equal(R.A.adyacencias.length, 5); assert.ok(R.T.diagnosticos.some((x) => x.tipo === 'ciclo'));
  });
  test('A-12 agrupación transitiva (extremos a 0,04 y 0,08 mm encadenados, ε 0,05): = oráculo, sin aviso específico (propuesta abierta de F2A-3)', () => {
    const d = W({ creases: [P([[0, 20], [40, 20]], false), P([[40.04, 20], [40.04, 40]], false), P([[40.08, 20], [80, 20]], false), P([[40, 0], [40, 20]], false)] });
    const R = validarArbol(d, '0.05', baseDefecto(adaptarPanelModel(d, { eps: 0.05 }))); assert.ok(R.m.f2a2.diagnosticos.some((x) => x.tipo === 'ajuste'));
  });
});
