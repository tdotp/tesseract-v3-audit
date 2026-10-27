// F2.0 — «Sombras» parametrizadas de los motores para EXPERIMENTOS de tolerancia (solo diagnóstico; nunca se empaquetan ni se usan en producción).
// legacySombra(eps): el TEXTO de src/core/legacy/*.js evaluado en un contexto vm aislado con GRAPH_EPS/TOLERANCE_MM sustituidos. No se edita
// ningún archivo: se leen, se quitan `import`/`export` y se evalúan. Con eps = 0.5 debe reproducir el motor real bit a bit (lo comprueba el llamador).
// webSombra(): el motor de tesseract-web empaquetado (solo lectura) con acceso a sus piezas para variar la tolerancia de snap y de fusión.
import fs from 'node:fs'; import path from 'node:path'; import vm from 'node:vm'; import { fileURLToPath, pathToFileURL } from 'node:url'; import { execFileSync } from 'node:child_process';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const LEG = path.join(ROOT, 'src/core/legacy');
const ORDEN = ['geom2d', 'topology', 'adjacency', 'panels', 'fold-tree', 'validate'];

export function legacySombra(eps, tolValidacion = eps) {
  const texto = ORDEN.map((n) => fs.readFileSync(path.join(LEG, n + '.js'), 'utf8').split('\n').filter((l) => !/^import /.test(l)).map((l) => l.replace(/^export /, '')).join('\n')).join('\n');
  const ctx = vm.createContext({ Math, JSON, Object, Array, Number, String, Infinity, parseInt });
  vm.runInContext(`var GRAPH_EPS=${eps}, TOLERANCE_MM=${tolValidacion}; function log(){}\n${texto}\nthis.api={buildPanels:buildPanels,buildAdjacency:buildAdjacency,buildFoldTree:buildFoldTree,getDefaultBaseIndex:getDefaultBaseIndex,validateDieline:validateDieline};`, ctx);
  return ctx.api;
}

export async function webSombra() {
  const WEB = path.resolve(ROOT, '../tesseract-web/packages/core/src/fold-engine');
  const dir = path.join(ROOT, 'tests/results/f2'); fs.mkdirSync(dir, { recursive: true });
  const entry = path.join(dir, 'web-entry.ts'), out = path.join(dir, 'web-sombra.mjs');
  fs.writeFileSync(entry, ['planarGraph', 'bezier', 'geometry'].map((m) => `export * from '${path.join(WEB, m)}';`).join('\n') + `\nexport { buildFoldTopology } from '${path.join(WEB, 'topology')}';\n`);
  execFileSync(path.join(ROOT, 'node_modules/.bin/esbuild'), [entry, '--bundle', '--format=esm', '--platform=node', '--outfile=' + out, '--log-level=warning']);
  const W = { ...(await import(pathToFileURL(out).href)) };
  // Réplica mínima de buildFoldTopology (sin huecos) con snap y fusión parametrizados: segmentos → grafo plano → caras interiores → conservación.
  W.topologiaParam = function (d, { snap = W.GRAPH_SNAP_TOLERANCE_MM, fusion = 1e-6 } = {}) {
    const outer = W.flattenPath(d.outerBoundary);
    const segsDe = (pts, closed, type, id) => { const s = []; for (let i = 0; i < pts.length - 1; i++) s.push({ start: pts[i], end: pts[i + 1], type, creaseId: id }); if (closed && pts.length >= 3) s.push({ start: pts[pts.length - 1], end: pts[0], type, creaseId: id }); return s; };
    const bs = segsDe(outer, true, 'boundary');
    const segs = [...bs]; (d.creases || []).forEach((c, i) => segs.push(...segsDe(W.snapCreaseVerticesToBoundary(W.flattenPath(c), bs, snap), false, 'crease', String(i))));
    const g = W.buildPlanarGraph(segs, fusion);
    const esperada = Math.abs(W.polyArea(outer));
    const interiores = g.faces.filter((f) => f.area > 1e-7);
    const generada = interiores.reduce((s, f) => s + f.area, 0);
    return { paneles: interiores.length, esperada, generada, conserva: Math.abs(esperada - generada) <= Math.max(1e-7, esperada * 1e-8), astillas: interiores.filter((f) => f.area < 1).length };
  };
  return W;
}
