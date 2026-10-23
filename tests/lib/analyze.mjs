// Resumen determinista del comportamiento geométrico del motor vigente para un troquel (se usa para golden masters y pruebas).
import { clone } from './fixtures.mjs';
const r4 = (x) => { const v = Math.round(x * 1e4) / 1e4; return Object.is(v, -0) ? 0 : v; };
const seg = (c) => [r4(c.a.x), r4(c.a.y), r4(c.b.x), r4(c.b.y)];

export function analyze(L, dieline) {
  const { api } = L; api.resetLogs();
  const d = clone(dieline);
  const panelData = api.buildPanels(d);
  const logs = api.logs.slice();
  const panels = panelData.panels;
  const adj = api.buildAdjacency(panels, panelData.creaseEdges);
  const base = panels.length ? api.getDefaultBaseIndex(panelData) : -1;
  const bases = panels.length <= 12 ? panels.map((_, i) => i) : [...new Set([0, base, panels.length - 1])];
  const trees = {};
  for (const b of bases) trees['base' + b] = api.buildFoldTree(panels, adj, b).map((e) => ({ parent: e.parent, child: e.child, sign: e.sign, crease: seg(e.crease) }));
  api.validateGeometry(d);
  const problems = api.getProblems().map((p) => ({ type: p.type, dist: p.dist, point: [r4(p.point.x), r4(p.point.y)] }));
  const topoIn = logs.find((l) => /^buildTopology: /.test(l)), topoOut = logs.find((l) => /^After splitting/.test(l));
  const topology = { inputSegments: topoIn ? Number(/(\d+) input/.exec(topoIn)[1]) : null, splitSegments: topoOut ? Number(/: (\d+) segments/.exec(topoOut)[1]) : null, iterations: topoOut ? Number(/\((\d+) iterations/.exec(topoOut)[1]) : null };
  const facesLog = logs.find((l) => /^Faces traced/.test(l)); const conn = logs.find((l) => /^Connectivity filter/.test(l));
  const result = {
    panels: panels.map((p) => ({ area: r4(Math.abs(p.area)), vertices: p.vertices.length, centroid: [r4(p.centroid.x), r4(p.centroid.y)] })),
    nPanels: panels.length,
    areaSum: r4(panels.reduce((s, p) => s + Math.abs(p.area), 0)),
    creaseEdges: panelData.creaseEdges.length,
    adjacency: adj.map((a) => ({ a: a.panelA, b: a.panelB, creaseIdx: a.creaseIdx, crease: seg(a.crease) })),
    defaultBase: base,
    trees,
    validate: { problems },
    topology,
    logSummary: { faces: facesLog ? Number(/Faces traced: (\d+)/.exec(facesLog)[1]) : null, connectivity: conn || null, panelsAfterShell: Number((logs.find((l) => /^Panels after shell filter/.test(l)) || '').replace(/\D+/g, '')) || null },
  };
  return JSON.parse(JSON.stringify(result)); // normaliza el reino (vm) y los -0/undefined, igual que el golden
}
export const outlineArea = (d) => { const p = d.outerBoundary.points.map((q) => q.anchor); let s = 0; for (let i = 0; i < p.length; i++) { const a = p[i], b = p[(i + 1) % p.length]; s += a.x * b.y - b.x * a.y; } return Math.abs(s) / 2; };
