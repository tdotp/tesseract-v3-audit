// Baseline de geometría: plugin (main.js, solo lectura, extraído por rangos de línea) vs @tesseract/core.
// Requiere dos variables de entorno:
//   PLUGIN_MAIN  ruta al main.js del plugin (SOLO LECTURA; se extraen funciones puras por rango de líneas)
//   WEB_DIR      raíz de una COPIA de tesseract-web ya construida (pnpm build) -> packages/core/dist
// Los rangos de línea (550-556, 648-776, 977-1194, 1316-1348) corresponden al main.js de 2656 líneas
// ("Phase 7B"). Si el plugin cambia, hay que revisar los rangos.
// Uso:  PLUGIN_MAIN=... WEB_DIR=... [BIG=1] node bench.mjs > results/topology_bench.json
import fs from 'node:fs';
import vm from 'node:vm';
import { performance } from 'node:perf_hooks';

const PLUGIN = process.env.PLUGIN_MAIN;
const WEB = process.env.WEB_DIR;
const lines = fs.readFileSync(PLUGIN, 'utf8').split('\n');
const slice = (a, b) => lines.slice(a - 1, b).join('\n');

// Funciones puras del plugin: distPtSeg(550-556), topología(648-776), buildPanels y helpers(977-1194), adyacencia(1316-1348)
const src = [
  'var GRAPH_EPS=0.5; var logBuf=[]; function log(m){ logBuf.push(m); }',
  slice(550, 556), slice(648, 776), slice(977, 1194), slice(1316, 1348),
  'this.buildPanels=buildPanels; this.logBuf=logBuf;',
].join('\n');
const sandbox = {};
vm.createContext(sandbox);
vm.runInContext('(function(){' + src + '}).call(this)', sandbox);
const pluginBuildPanels = sandbox.buildPanels;

const core = await import(WEB + '/packages/core/dist/index.js');

const pt = (x, y) => ({ anchor: { x, y }, left: { x, y }, right: { x, y } });
const path = (pts, closed) => ({ closed, points: pts.map(([x, y]) => pt(x, y)) });

function gridDieline(n, extraPerEdge = 0, cell = 40) {
  const W = n * cell, H = n * cell, pts = [];
  const edge = (x0, y0, x1, y1) => { for (let k = 0; k <= extraPerEdge; k++) { const t = k / (extraPerEdge + 1); pts.push([x0 + (x1 - x0) * t, y0 + (y1 - y0) * t]); } };
  edge(0, 0, W, 0); edge(W, 0, W, H); edge(W, H, 0, H); edge(0, H, 0, 0);
  const creases = []; // una crease por arista interior entre celdas (como en un troquel real)
  for (let i = 1; i < n; i++) for (let j = 0; j < n; j++) { creases.push(path([[i * cell, j * cell], [i * cell, (j + 1) * cell]], false)); creases.push(path([[j * cell, i * cell], [(j + 1) * cell, i * cell]], false)); }
  return { outerBoundary: path(pts, true), holes: [], cutLines: [], creases, thickness_mm: 0.25 };
}
function holeCase(centered) { // 2 paneles 40x80, hueco 20x40 centrado (centroide dentro del hueco) o descentrado
  const d = gridDieline(2, 0, 40); d.creases = [path([[40, 0], [40, 80]], false)];
  d.holes = [centered ? path([[50, 20], [70, 20], [70, 60], [50, 60]], true) : path([[65, 5], [75, 5], [75, 25], [65, 25]], true)];
  return d;
}
function roundedCase() { // rectángulo con 4 esquinas redondeadas (Bézier) y 1 crease
  const k = 0.5523 * 10, W = 120, H = 60, r = 10;
  const P = (ax, ay, lx, ly, rx, ry) => ({ anchor: { x: ax, y: ay }, left: { x: lx, y: ly }, right: { x: rx, y: ry } });
  const pts = [
    P(r, 0, r, 0, W - r, 0), P(W - r, 0, W - r, 0, W - r + k, 0),
    P(W, r, W, r - k, W, r), P(W, H - r, W, H - r, W, H - r + k),
    P(W - r, H, W - r + k, H, W - r, H), P(r, H, r, H, r - k, H),
    P(0, H - r, 0, H - r + k, 0, H - r), P(0, r, 0, r, 0, r - k),
  ];
  // right/left correctos por esquina (aprox. válida para la prueba)
  return { outerBoundary: { closed: true, points: pts }, holes: [], cutLines: [], creases: [path([[60, 0], [60, 60]], false)], thickness_mm: 0.25 };
}

const shoelace = (v) => { let s = 0; for (let i = 0; i < v.length; i++) { const a = v[i], b = v[(i + 1) % v.length]; s += a.x * b.y - b.x * a.y; } return Math.abs(s) / 2; };
const polyAreaOuter = (d) => shoelace(core.flattenPath(d.outerBoundary)) - d.holes.reduce((s, h) => s + shoelace(core.flattenPath(h)), 0);

function median(a) { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; }
function time(fn, reps) { const t = []; let out; for (let i = 0; i < reps; i++) { const t0 = performance.now(); out = fn(); t.push(performance.now() - t0); } return { ms: median(t), min: Math.min(...t), out }; }

function runCase(name, d, reps = 5, usePlugin = true) {
  const row = { name, segsApprox: d.outerBoundary.points.length + d.creases.reduce((s, c) => s + c.points.length - 1, 0) };
  const expectedFlat = polyAreaOuter(d);
  const anchorsOnly = { ...d, outerBoundary: { ...d.outerBoundary, points: d.outerBoundary.points.map((p) => ({ anchor: p.anchor, left: p.anchor, right: p.anchor })) }, holes: d.holes.map((h) => ({ ...h, points: h.points.map((p) => ({ anchor: p.anchor, left: p.anchor, right: p.anchor })) })) };
  const expectedAnchors = shoelace(anchorsOnly.outerBoundary.points.map((p) => p.anchor)) - anchorsOnly.holes.reduce((s, h) => s + shoelace(h.points.map((p) => p.anchor)), 0);
  if (usePlugin) try {
    const p = time(() => { sandbox.logBuf.length = 0; return pluginBuildPanels(JSON.parse(JSON.stringify(d))); }, reps);
    const sumArea = p.out.panels.reduce((s, q) => s + Math.abs(q.area), 0);
    row.plugin_ms = +p.ms.toFixed(2); row.plugin_panels = p.out.panels.length;
    row.plugin_area_err_mm2 = +(sumArea - expectedAnchors).toFixed(3); // vs. polígono de anclas (descontando huecos)
  } catch (e) { row.plugin_err = e.message; }
  try {
    const c = time(() => core.buildFoldTopology(d), reps);
    row.core_ms = +c.ms.toFixed(2); row.core_panels = c.out.panels.length;
    row.core_area_err_mm2 = +c.out.geometryArea.difference.toFixed(9);
    row.core_vs_flat = +(c.out.geometryArea.expected - expectedFlat).toFixed(6);
  } catch (e) { row.core_err = e.message.slice(0, 140); }
  return row;
}

const results = [];
const real = JSON.parse(fs.readFileSync(WEB + '/packages/core/src/__tests__/fixtures/caja-botanica-real.json', 'utf8'));
results.push(runCase('caja-botanica-real (fixture del plugin)', real, 9));
results.push(runCase('hueco descentrado (200 mm2)', holeCase(false)));
results.push(runCase('hueco centrado en el panel (800 mm2)', holeCase(true)));
results.push(runCase('esquinas redondeadas Bézier', roundedCase()));
for (const n of [2, 3, 4, 6, 8, 10]) results.push(runCase(`rejilla ${n}x${n}`, gridDieline(n), 3));
for (const m of [10, 25, 50]) results.push(runCase(`rejilla 4x4, ${m} pts/arista extra`, gridDieline(4, m), 3));
if (process.env.BIG) for (const n of [16, 24, 32, 48]) results.push(runCase(`rejilla ${n}x${n}`, gridDieline(n), 2, n <= 16));
console.log(JSON.stringify(results, null, 1));
