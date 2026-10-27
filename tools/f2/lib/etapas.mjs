// F2.0 — Reproducción instrumentada del pipeline geométrico legacy, etapa por etapa (SOLO diagnóstico; no es código de producción).
// Usa las funciones REALES de src/core/legacy/ (importadas, sin modificar). La única lógica replicada es el bucle de filtros de
// buildPanels (área, cáscara/hueco, delgadez, duplicados) y el filtro de conectividad, para poder registrar el MOTIVO de cada descarte.
// La réplica se verifica contra buildPanels() real en cada ejecución (verificarReplica): si difiere, el diagnóstico se invalida.
import { classifyClosedCutContours, buildPanels } from '../../../src/core/legacy/panels.js';
import { buildTopology } from '../../../src/core/legacy/topology.js';
import { buildAdjacencyStrict, buildAdjacency } from '../../../src/core/legacy/adjacency.js';
import { buildFoldTree, getDefaultBaseIndex } from '../../../src/core/legacy/fold-tree.js';
import { validateDieline } from '../../../src/core/legacy/validate.js';
import { polygonSignedArea, polygonCentroid, pointInPolygonInclusive, faceBounds, edgeMatch } from '../../../src/core/legacy/geom2d.js';
import { setLogSink } from '../../../src/core/legacy/log.js';

export const clone = (o) => JSON.parse(JSON.stringify(o));

// Escala uniforme exacta del troquel (anchor + manejadores). s = 1 devuelve una copia idéntica.
export function escalar(d, s) {
  const c = clone(d);
  const sp = (p) => { for (const k of ['anchor', 'left', 'right']) if (p[k]) { p[k].x *= s; p[k].y *= s; } };
  const sPath = (pa) => { if (pa && pa.points) pa.points.forEach(sp); };
  sPath(c.outerBoundary); (c.holes || []).forEach(sPath); (c.cutLines || []).forEach((cl) => sPath(cl.geom)); (c.creases || []).forEach(sPath);
  return c;
}
// Traslación y rotación (para pruebas metamórficas).
export function transformar(d, f) {
  const c = clone(d);
  const tp = (p) => { for (const k of ['anchor', 'left', 'right']) if (p[k]) { const q = f(p[k]); p[k].x = q.x; p[k].y = q.y; } };
  const tPath = (pa) => { if (pa && pa.points) pa.points.forEach(tp); };
  tPath(c.outerBoundary); (c.holes || []).forEach(tPath); (c.cutLines || []).forEach((cl) => tPath(cl.geom)); (c.creases || []).forEach(tPath);
  return c;
}

// Mismo ensamblado de segmentos que buildPanels (contornos cerrados + creases), con procedencia (origen, índice de trazado, índice de segmento).
function segmentosTopologia(data, contourInfo) {
  const segs = [];
  const addPath = (pts, closed, type, origen, idx) => {
    if (!pts || pts.length < 2) return;
    for (let i = 0; i < pts.length - 1; i++) segs.push({ p1: { x: pts[i].x, y: pts[i].y }, p2: { x: pts[i + 1].x, y: pts[i + 1].y }, type, origen, idx, seg: i });
    if (closed) segs.push({ p1: { x: pts[pts.length - 1].x, y: pts[pts.length - 1].y }, p2: { x: pts[0].x, y: pts[0].y }, type, origen, idx, seg: pts.length - 1 });
  };
  contourInfo.all.forEach((c, i) => addPath(c.points, true, 'boundary', c.source, i));
  (data.creases || []).forEach((cr, ci) => { if (cr && cr.points && cr.points.length >= 2) addPath(cr.points.map((p) => p.anchor), false, 'crease', 'crease', ci); });
  return segs;
}

// Ejecuta el pipeline y devuelve el registro completo por etapas. `data` no se muta.
export function ejecutarEtapas(data) {
  const logs = []; setLogSink((m) => logs.push(String(m)));
  try {
    const d = clone(data);
    const E = { logs };
    // E1 · contornos cerrados → cáscaras/huecos por paridad
    const contourInfo = classifyClosedCutContours(d);
    E.e1_contornos = { total: contourInfo.all.length, shells: contourInfo.shells.length, holes: contourInfo.holes.length, parentCount: contourInfo.all.map((c) => c.parentCount) };
    // E2 · segmentos de entrada
    const segs = segmentosTopologia(d, contourInfo);
    E.e2_segmentos = { total: segs.length, boundary: segs.filter((s) => s.type === 'boundary').length, crease: segs.filter((s) => s.type === 'crease').length, lista: segs.map((s) => ({ ...s })) };
    // E3–E5 · troceado, grafo y caras (función real; muta su argumento, como en producción)
    const topoSegs = segs.map((s) => ({ p1: s.p1, p2: s.p2, type: s.type }));
    const topo = buildTopology(topoSegs);
    const it = /\((\d+) iterations\)/.exec(logs.find((l) => /^After splitting/.test(l)) || '');
    E.e3_troceado = { segmentos: topoSegs.length, iteraciones: it ? Number(it[1]) : null, lista: topoSegs.map((s) => ({ p1: s.p1, p2: s.p2, type: s.type })) };
    let aristas = 0; for (const k of Object.keys(topo.adj)) aristas += topo.adj[k].length;
    E.e4_grafo = { vertices: topo.verts.length, verticesConArista: Object.keys(topo.adj).length, aristasDirigidas: aristas, aristas: aristas / 2, grados: gradoHistograma(topo.adj), verts: topo.verts.map((v) => ({ x: v.x, y: v.y })) };
    E.e5_caras = { total: topo.faces.length, positivas: topo.faces.filter((f) => f.area > 0).length, negativas: topo.faces.filter((f) => f.area < 0).length,
      lista: topo.faces.map((f) => ({ area: f.area, nv: f.vertices.length, hasCrease: f.hasCreaseEdge, centroid: polygonCentroid(f.area < 0 ? f.vertices.slice().reverse() : f.vertices) })),
      // Característica de Euler del grafo plano: V − E + F = 1 + C (C = componentes conexas); con F contando la cara exterior de cada componente.
      euler: { V: Object.keys(topo.adj).length, E: aristas / 2, F: topo.faces.length } };
    // E6 · filtros de caras → paneles (réplica del bucle de buildPanels con motivo de descarte)
    const seen = {}; let panels = []; const descartes = [];
    topo.faces.forEach((f, fi) => {
      const motivo = (m, extra) => descartes.push({ cara: fi, motivo: m, area: f.area, ...extra });
      if (Math.abs(f.area) <= 1) return motivo('area<=1');
      const verts = f.vertices.slice(); const sa = polygonSignedArea(verts); if (sa < 0) verts.reverse();
      const centroid = polygonCentroid(verts);
      const insideShell = contourInfo.shells.some((sh) => pointInPolygonInclusive(centroid, sh.points));
      const insideHole = contourInfo.holes.some((h) => pointInPolygonInclusive(centroid, h.points));
      if (!insideShell || insideHole) return motivo(!insideShell ? 'fuera-de-cascara' : 'en-hueco', { centroid });
      const b = faceBounds(verts); const minDim = Math.max(0.0001, Math.min(b.w, b.h)); const maxDim = Math.max(b.w, b.h); const aspect = maxDim / minDim; const absArea = Math.abs(sa);
      if (absArea < 4) return motivo('area<4', { centroid });
      if (aspect > 30 && absArea < 120) return motivo('delgado', { centroid, aspect });
      const ckey = centroid.x.toFixed(2) + '|' + centroid.y.toFixed(2) + '|' + absArea.toFixed(2);
      if (seen[ckey]) return motivo('duplicado', { centroid, sentido: f.area > 0 ? '+' : '-' });
      seen[ckey] = true; panels.push({ vertices: verts, edges: f.edges, area: absArea, centroid, cara: fi });
    });
    E.e6_filtros = { paneles: panels.length, descartes, porMotivo: contar(descartes.map((x) => x.motivo)) };
    // E7 · creaseEdges crudas y adyacencia estricta (función real) + diagnóstico por crease (cuántos paneles la comparten)
    const creaseEdges = [];
    (d.creases || []).forEach((cr, ci) => { if (!cr || !cr.points || cr.points.length < 2) return; const pts = cr.points.map((p) => p.anchor); for (let i = 0; i < pts.length - 1; i++) creaseEdges.push({ a: pts[i], b: pts[i + 1], creaseIdx: ci, segIdx: i }); });
    const porCrease = creaseEdges.map((ce) => { const sharing = []; panels.forEach((p, pi) => { const v = p.vertices; for (let i = 0; i < v.length; i++) if (edgeMatch(v[i], v[(i + 1) % v.length], ce.a, ce.b)) { sharing.push(pi); break; } }); return { creaseIdx: ce.creaseIdx, segIdx: ce.segIdx, comparten: sharing }; });
    E.e7_estricta = { creaseEdges: creaseEdges.length, porCrease, compartidasPor2: porCrease.filter((x) => x.comparten.length === 2).length };
    // E8 · filtro de conectividad (réplica con componentes)
    const kept = { antes: panels.length, componentes: [], conservados: null };
    if (panels.length > 1 && creaseEdges.length > 0) {
      const adjEdges = buildAdjacencyStrict(panels, creaseEdges);
      const graph = panels.map(() => []); const touch = panels.map(() => 0);
      adjEdges.forEach((ae) => { graph[ae.panelA].push(ae.panelB); graph[ae.panelB].push(ae.panelA); touch[ae.panelA]++; touch[ae.panelB]++; });
      const vis = {}; const comps = [];
      for (let pi = 0; pi < panels.length; pi++) { if (vis[pi] || touch[pi] === 0) continue; const q = [pi]; vis[pi] = true; const nodes = []; let areaSum = 0; while (q.length) { const c = q.shift(); nodes.push(c); areaSum += Math.abs(panels[c].area || 0); for (const n of graph[c]) { if (vis[n]) continue; vis[n] = true; q.push(n); } } comps.push({ nodes, areaSum }); }
      kept.aislados = panels.map((_, i) => i).filter((i) => touch[i] === 0);
      if (comps.length) {
        comps.sort((a, b) => (Math.abs(b.areaSum - a.areaSum) > 0.001 ? b.areaSum - a.areaSum : b.nodes.length - a.nodes.length));
        kept.componentes = comps.map((c) => ({ nodes: c.nodes.slice().sort((a, b) => a - b), areaSum: c.areaSum }));
        const keep = new Set(comps[0].nodes); kept.descartados = panels.map((p, i) => i).filter((i) => !keep.has(i)).map((i) => ({ panel: i, area: panels[i].area, centroid: panels[i].centroid }));
        panels = panels.filter((_, i) => keep.has(i));
      }
    }
    kept.conservados = panels.length; E.e8_conectividad = kept;
    // E9 · adyacencia robusta (función real), base por defecto y árbol de plegado
    const panelData = { panels, creaseEdges, creases: d.creases || [] };
    const adj = buildAdjacency(panels, creaseEdges);
    const base = panels.length ? getDefaultBaseIndex(panelData) : -1;
    const tree = panels.length ? buildFoldTree(panels, adj, base) : [];
    E.e9_plegado = { adyacencias: adj.length, modo: (logs.filter((l) => /^Adjacency edges/.test(l)).pop() || ''), base, arbol: tree.length, noAlcanzados: panels.length - 1 - tree.length };
    E.e10_validacion = { problemas: validateDieline(d).problems.length };
    E.panels = panels; E.areaTotal = panels.reduce((s, p) => s + p.area, 0);
    return E;
  } finally { setLogSink(null); }
}

// La réplica de E6/E8 debe coincidir EXACTAMENTE con buildPanels real (mismos vértices, área y centroide, mismo orden).
export function verificarReplica(data, E) {
  setLogSink(null); const real = buildPanels(clone(data)).panels;
  const strip = (ps) => JSON.stringify(ps.map((p) => ({ v: p.vertices, a: p.area, c: p.centroid })));
  return strip(real) === strip(E.panels);
}

function gradoHistograma(adj) { const h = {}; for (const k of Object.keys(adj)) { const g = adj[k].length; h[g] = (h[g] || 0) + 1; } return h; }
function contar(arr) { const o = {}; for (const x of arr) o[x] = (o[x] || 0) + 1; return o; }
