// A6.6 (T4) — Contrato GeometryEngine v1 sobre el MÓDULO ES REAL (src/core/engine.js: el mismo código que empaqueta el bundle; no el cargador por texto):
// forma del objeto · el adaptador no envuelve (cada operación ES la función de core/legacy) · puerta G2 por este camino (golden de geometría, de Illustrator real
// y de logs) · alias, no mutación y excepciones = baseline.
import test from 'node:test'; import assert from 'node:assert/strict'; import fs from 'node:fs'; import path from 'node:path'; import { pathToFileURL } from 'node:url';
import { FIXTURES, ROOT, clone } from '../lib/fixtures.mjs'; import { TARGETS, loadGeometry } from '../lib/legacy.mjs'; import { analyze } from '../lib/analyze.mjs'; import { trace } from '../lib/engine-trace.mjs';
import { aliasPrint, MALOS, errorOf, engineApi } from '../lib/contracts.mjs'; import { FAMILY } from '../tools/make-illustrator-real-fixtures.mjs';

const SRC = path.dirname(TARGETS.src); const imp = (rel) => import(pathToFileURL(path.join(SRC, rel)).href);
const E = await imp('core/engine.js');
const legacy = { ...(await imp('core/legacy/validate.js')), ...(await imp('core/legacy/panels.js')), ...(await imp('core/legacy/adjacency.js')), ...(await imp('core/legacy/fold-tree.js')) };
const logs = []; const fresh = () => { logs.length = 0; return E.createLegacyEngine({ log: (m) => logs.push(String(m)) }); };
const J = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8'));
const goldenGeo = J('tests/golden/geometry.golden.json'), goldenReal = J('tests/golden/illustrator-real.golden.json'), goldenLogs = J('tests/golden/geometry-logs.golden.json');
const real = (id) => J(`tests/fixtures/illustrator-real/${id}.dieline.json`);
const REF = loadGeometry(TARGETS.baseline);

test('forma: objeto congelado con exactamente id, contract y las 5 operaciones; id legacy; contrato 1', () => {
  const e = fresh(); assert.ok(Object.isFrozen(e)); assert.deepEqual(Object.keys(e), ['id', 'contract', 'validate', 'buildPanels', 'buildAdjacency', 'buildFoldTree', 'defaultBaseIndex']);
  assert.equal(e.id, 'legacy'); assert.equal(e.contract, 1); assert.equal(E.GEOMETRY_ENGINE_CONTRACT, 1); for (const k of ['validate', 'buildPanels', 'buildAdjacency', 'buildFoldTree', 'defaultBaseIndex']) assert.equal(typeof e[k], 'function', k);
  assert.deepEqual(Object.keys(E).sort(), ['GEOMETRY_ENGINE_CONTRACT', 'createLegacyEngine']);
});
test('el adaptador NO envuelve: cada operación ES la función original de core/legacy (misma aridad)', () => {
  const e = fresh(); const map = { validate: 'validateDieline', buildPanels: 'buildPanels', buildAdjacency: 'buildAdjacency', buildFoldTree: 'buildFoldTree', defaultBaseIndex: 'getDefaultBaseIndex' };
  for (const [k, n] of Object.entries(map)) { assert.equal(e[k], legacy[n], k); assert.equal(e[k].length, legacy[n].length, k); }
});
test('el log del motor llega por options.log; sin log no escribe nada (y el último createLegacyEngine manda)', () => {
  const e = fresh(); e.buildPanels(clone(FIXTURES['crease-exacta'].build())); assert.equal(logs[0], '=== buildPanels ===');
  const seen = []; const e2 = E.createLegacyEngine(); logs.length = 0; e2.buildPanels(clone(FIXTURES['crease-exacta'].build())); assert.deepEqual(logs, []); assert.deepEqual(seen, []);
});
test('G2 (módulo real): paneles, adyacencias, árboles y validación = golden de geometría (26 fixtures)', () => {
  const L = { api: engineApi(fresh(), logs) }; for (const [id, f] of Object.entries(FIXTURES)) { const { desc, tags, ...exp } = goldenGeo.fixtures[id]; assert.deepEqual(analyze(L, f.build()), exp, id); }
});
test('G2 (módulo real): familia de Illustrator real ×1.0 = golden (11 de 13 en la Caja Botánica real preservado)', () => {
  const L = { api: engineApi(fresh(), logs) }; for (const id of Object.keys(FAMILY)) { const { desc, tags, fuente, sha256Fuente, ...exp } = goldenReal.fixtures[id]; assert.deepEqual(analyze(L, real(id)), exp, id); }
  assert.equal(analyze(L, real('ill-real-caja-botanica')).nPanels, 11);
});
test('G2 (módulo real): log del motor = golden de logs del baseline (26 + familia real)', () => {
  const L = { api: engineApi(fresh(), logs) };
  for (const [id, f] of Object.entries(FIXTURES)) assert.deepEqual(trace(L, f.build()), goldenLogs.fixtures[id], id);
  for (const id of Object.keys(FAMILY)) assert.deepEqual(trace(L, real(id)), goldenLogs.illustratorReal[id], id);
});
test('alias entre entrada y salida = baseline (el adaptador no clona)', () => {
  const L = { api: engineApi(fresh(), logs) }; for (const [id, f] of Object.entries(FIXTURES)) assert.deepEqual(aliasPrint(L, f.build()), aliasPrint(REF, f.build()), id);
});
test('ninguna operación muta su entrada; excepciones (tipo y mensaje) = baseline', () => {
  const e = fresh();
  for (const [id, f] of Object.entries(FIXTURES)) { const d = clone(f.build()), d0 = JSON.stringify(d); const pd = e.buildPanels(d); const p0 = JSON.stringify(pd); const adj = e.buildAdjacency(pd.panels, pd.creaseEdges);
    if (pd.panels.length) { e.defaultBaseIndex(pd); e.buildFoldTree(pd.panels, adj, 0); } e.validate(d); assert.equal(JSON.stringify(d), d0, id); assert.equal(JSON.stringify(pd), p0, id); }
  const api = engineApi(e, logs); for (const [k, fn] of Object.entries(MALOS)) assert.equal(errorOf(() => fn(api)), errorOf(() => fn(REF.api)), k);
  assert.equal(errorOf(() => e.validate({ creases: [{ points: [{}, {}] }], outerBoundary: { closed: true, points: [{ anchor: { x: 0, y: 0 } }, { anchor: { x: 9, y: 0 } }] } })), errorOf(() => MALOS['validateGeometry(crease sin anclas)'](REF.api)));
});
test('validate sin datos o con error devuelve {problems: []} (la presentación de main.js ni siquiera la llama)', () => {
  const e = fresh(); assert.deepEqual(e.validate(null), { problems: [] }); assert.deepEqual(e.validate({ error: 'x' }), { problems: [] });
});
