// A6 (T3) — Contratos IMPLÍCITOS del motor geométrico vigente que A6 debe preservar (invariantes I2, I3, I4 e I8 de docs/fase1/A6_PROPUESTA.md §5.2),
// medidos en los tres objetivos (baseline, panel = referencia A1, src) y comparados con el baseline:
// determinismo en todos los troqueles · la entrada no se muta en ninguna etapa · objetos COMPARTIDOS entre entrada y salida (alias) · excepciones.
import test from 'node:test'; import assert from 'node:assert/strict';
import { FIXTURES, clone } from '../lib/fixtures.mjs'; import { TARGETS, loadGeometry } from '../lib/legacy.mjs'; import { analyze } from '../lib/analyze.mjs'; import { trace } from '../lib/engine-trace.mjs';
import { aliasPrint, MALOS, errorOf } from '../lib/contracts.mjs';

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
