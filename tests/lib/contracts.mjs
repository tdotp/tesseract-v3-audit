// A6 — Utilidades compartidas para medir los contratos implícitos del motor (invariantes I2, I3, I4 e I8 de docs/fase1/A6_PROPUESTA.md §5.2)
// sobre cualquier «api» con la forma del cargador (tests/lib/legacy.mjs) o de un GeometryEngine adaptado con engineApi().
import { clone } from './fixtures.mjs';

// Huella de alias: qué objetos de la salida SON (identidad) objetos de la entrada o de una etapa anterior.
export function aliasPrint(L, dieline) {
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
export const MALOS = {
  'buildPanels(null)': (api) => api.buildPanels(null),
  'buildPanels(contorno sin anclas)': (api) => api.buildPanels({ outerBoundary: { closed: true, points: [{}, {}, {}] }, creases: [] }),
  'buildAdjacency(null, creaseEdges)': (api) => api.buildAdjacency(null, [{ a: { x: 0, y: 0 }, b: { x: 1, y: 0 }, creaseIdx: 0, segIdx: 0 }]),
  'buildFoldTree(null, adyacencia, 0)': (api) => api.buildFoldTree(null, [{ panelA: 0, panelB: 1, crease: { a: { x: 0, y: 0 }, b: { x: 1, y: 0 } }, creaseIdx: 0 }], 0),
  'getDefaultBaseIndex(null)': (api) => api.getDefaultBaseIndex(null),
  'validateGeometry(crease sin anclas)': (api) => api.validateGeometry({ outerBoundary: { closed: true, points: [{ anchor: { x: 0, y: 0 } }, { anchor: { x: 10, y: 0 } }, { anchor: { x: 10, y: 10 } }] }, creases: [{ closed: false, points: [{}, {}] }] }),
  'buildFoldTree([], [], 0) (sin error)': (api) => api.buildFoldTree([], [], 0),
};
export const errorOf = (fn) => { try { fn(); return 'sin excepción'; } catch (e) { return `${e.name}: ${e.message}`; } };

// Adapta un GeometryEngine a la forma del cargador, imitando lo que hace main.js con él (validateGeometry: reinicia «problems»,
// no valida si no hay datos o hay error, y si no toma engine.validate(d).problems). logs = array que recibe el sink del motor.
export function engineApi(engine, logs) {
  let problems = [];
  return { buildPanels: engine.buildPanels, buildAdjacency: engine.buildAdjacency, buildFoldTree: engine.buildFoldTree, getDefaultBaseIndex: engine.defaultBaseIndex,
    validateGeometry: (d) => { problems = []; if (!d || d.error) return; problems = engine.validate(d).problems; },
    getProblems: () => problems, logs, resetLogs: () => { logs.length = 0; } };
}
