// A6 (T3) — Contratos IMPLÍCITOS del motor geométrico vigente que A6 debe preservar (invariantes I2, I3, I4 e I8 de docs/fase1/A6_PROPUESTA.md §5.2),
// medidos en los tres objetivos (baseline, panel = referencia A1, src) y comparados con el baseline:
// determinismo en todos los troqueles · la entrada no se muta en ninguna etapa · objetos COMPARTIDOS entre entrada y salida (alias) · excepciones.
import test from 'node:test'; import assert from 'node:assert/strict';
import { FIXTURES, clone } from '../lib/fixtures.mjs'; import { TARGETS, loadGeometry } from '../lib/legacy.mjs'; import { analyze } from '../lib/analyze.mjs'; import { trace } from '../lib/engine-trace.mjs';

// Huella de alias: qué objetos de la salida SON (identidad) objetos de la entrada o de una etapa anterior.
function aliasPrint(L, dieline) {
  const { api } = L; const d = clone(dieline); const anchors = new Set();
  for (const p of [d.outerBoundary, ...(d.holes || []), ...(d.cutLines || []).map((c) => c.geom), ...(d.creases || [])]) for (const q of (p && p.points) || []) anchors.add(q.anchor);
  const pd = api.buildPanels(d); const ces = new Set(pd.creaseEdges);
  const adj = api.buildAdjacency(pd.panels, pd.creaseEdges); const adjCreases = new Set(adj.map((a) => a.crease));
  const tree = pd.panels.length ? api.buildFoldTree(pd.panels, adj, 0) : [];
  api.validateGeometry(d); const problems = api.getProblems();
  return {
    creasesEsLaEntrada: pd.creases === (d.creases || null),
    creaseEdges: pd.creaseEdges.length,
    creaseEdgesConExtremosDeLaEntrada: pd.creaseEdges.filter((ce) => { const pts = d.creases[ce.creaseIdx].points; return ce.a === pts[ce.segIdx].anchor && ce.b === pts[ce.segIdx + 1].anchor; }).length,
    verticesDePanelQueSonDeLaEntrada: pd.panels.reduce((s, p) => s + p.vertices.filter((v) => anchors.has(v)).length, 0),
    adyacencias: adj.length,
    adyacenciasQueGuardanElCreaseEdge: adj.filter((a) => ces.has(a.crease)).length,
    adyacenciasConExtremosDeLaEntrada: adj.filter((a) => a.crease && anchors.has(a.crease.a) && anchors.has(a.crease.b)).length,
    aristasDeArbol: tree.length,
    aristasDeArbolQueGuardanElCreaseDeLaAdyacencia: tree.filter((e) => adjCreases.has(e.crease)).length,
    problemas: problems.length,
    problemasConPuntoDeLaEntrada: problems.filter((p) => anchors.has(p.point)).length,
  };
}
const MALOS = {
  'buildPanels(null)': (api) => api.buildPanels(null),
  'buildPanels(contorno sin anclas)': (api) => api.buildPanels({ outerBoundary: { closed: true, points: [{}, {}, {}] }, creases: [] }),
  'buildAdjacency(null, creaseEdges)': (api) => api.buildAdjacency(null, [{ a: { x: 0, y: 0 }, b: { x: 1, y: 0 }, creaseIdx: 0, segIdx: 0 }]),
  'buildFoldTree(null, adyacencia, 0)': (api) => api.buildFoldTree(null, [{ panelA: 0, panelB: 1, crease: { a: { x: 0, y: 0 }, b: { x: 1, y: 0 } }, creaseIdx: 0 }], 0),
  'getDefaultBaseIndex(null)': (api) => api.getDefaultBaseIndex(null),
  'validateGeometry(crease sin anclas)': (api) => api.validateGeometry({ outerBoundary: { closed: true, points: [{ anchor: { x: 0, y: 0 } }, { anchor: { x: 10, y: 0 } }, { anchor: { x: 10, y: 10 } }] }, creases: [{ closed: false, points: [{}, {}] }] }),
  'buildFoldTree([], [], 0) (sin error)': (api) => api.buildFoldTree([], [], 0),
};
const errorOf = (fn) => { try { fn(); return 'sin excepción'; } catch (e) { return `${e.name}: ${e.message}`; } };

const REF = loadGeometry(TARGETS.baseline);
const refAlias = Object.fromEntries(Object.entries(FIXTURES).map(([id, f]) => [id, aliasPrint(REF, f.build())]));
const refErr = Object.fromEntries(Object.entries(MALOS).map(([k, fn]) => [k, errorOf(() => fn(REF.api))]));

test('alias del baseline: los extremos de creaseEdges SON los anchor de la entrada; los vértices de panel son copias; la adyacencia estricta guarda el propio creaseEdge', () => {
  for (const [id, r] of Object.entries(refAlias)) {
    assert.equal(r.creaseEdgesConExtremosDeLaEntrada, r.creaseEdges, id); assert.equal(r.verticesDePanelQueSonDeLaEntrada, 0, id);
    assert.equal(r.problemasConPuntoDeLaEntrada, r.problemas, id); assert.equal(r.creasesEsLaEntrada, true, id);
    assert.equal(r.aristasDeArbolQueGuardanElCreaseDeLaAdyacencia, r.aristasDeArbol, id);
  }
  assert.deepEqual([refAlias['real-caja-botanica'].adyacencias, refAlias['real-caja-botanica'].adyacenciasQueGuardanElCreaseEdge], [10, 10]);
});
test('excepciones del baseline: 6 casos lanzan TypeError y uno no lanza', () => {
  const v = Object.values(refErr); assert.equal(v.filter((s) => s.startsWith('TypeError: ')).length, 6, JSON.stringify(refErr)); assert.equal(refErr['buildFoldTree([], [], 0) (sin error)'], 'sin excepción');
});
for (const [target, file] of Object.entries(TARGETS)) {
  const L = loadGeometry(file);
  test(`[${target}] determinismo en TODOS los troqueles (resumen y log)`, () => { for (const [id, f] of Object.entries(FIXTURES)) { const d = f.build(); assert.deepEqual(analyze(L, d), analyze(L, d), id); assert.deepEqual(trace(L, d), trace(L, d), id); } });
  test(`[${target}] ninguna etapa muta su entrada (troquel, paneles, adyacencias)`, () => {
    for (const [id, f] of Object.entries(FIXTURES)) {
      const { api } = L; const d = clone(f.build()); const d0 = JSON.stringify(d);
      const pd = api.buildPanels(d); assert.equal(JSON.stringify(d), d0, id + ' buildPanels');
      const pd0 = JSON.stringify(pd); const adj = api.buildAdjacency(pd.panels, pd.creaseEdges); assert.equal(JSON.stringify(pd), pd0, id + ' buildAdjacency');
      const adj0 = JSON.stringify(adj); if (pd.panels.length) { api.getDefaultBaseIndex(pd); for (let b = 0; b < Math.min(pd.panels.length, 4); b++) api.buildFoldTree(pd.panels, adj, b); }
      assert.equal(JSON.stringify(pd), pd0, id + ' buildFoldTree'); assert.equal(JSON.stringify(adj), adj0, id + ' buildFoldTree (adyacencia)');
      api.validateGeometry(d); assert.equal(JSON.stringify(d), d0, id + ' validación');
    }
  });
  test(`[${target}] alias entre entrada y salida = baseline (todos los troqueles)`, () => { for (const [id, f] of Object.entries(FIXTURES)) assert.deepEqual(aliasPrint(L, f.build()), refAlias[id], id); });
  test(`[${target}] excepciones (tipo y mensaje) = baseline`, () => { for (const [k, fn] of Object.entries(MALOS)) assert.equal(errorOf(() => fn(L.api)), refErr[k], k); });
}
