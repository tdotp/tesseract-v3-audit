#!/usr/bin/env node
// F2.0 — Pruebas metamórficas del legacy (traslación, rotación, reflexión, escala) y correspondencia de paneles con el oráculo.
// Oráculo de referencia (provisional, ver docs/fase2/F2.0_05): arreglo plano exacto del motor web con snap y fusión ε = 0.05 mm sobre la
// extracción original del plugin (caja-botanica-real), que conserva el área y deja las 12 creases entre dos paneles distintos.
// Uso: node tools/f2/metamorficas.mjs [--json salida.json]
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
import { ejecutarEtapas, transformar, escalar } from './lib/etapas.mjs';
import { webSombra } from './lib/sombra.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const args = process.argv.slice(2); const salida = args.includes('--json') ? args[args.indexOf('--json') + 1] : null;
const FIX = { 'ill-real-caja-botanica': 'tests/fixtures/illustrator-real/ill-real-caja-botanica.dieline.json', 'caja-botanica-real': 'tests/fixtures/real/caja-botanica-real.dieline.json', 'ill-real-caja-simple': 'tests/fixtures/illustrator-real/ill-real-caja-simple.dieline.json' };
const rot = (deg) => { const a = (deg * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a); return (p) => ({ x: c * p.x - s * p.y, y: s * p.x + c * p.y }); };
const T = {
  identidad: (p) => p,
  'traslación +1000': (p) => ({ x: p.x + 1000, y: p.y + 1000 }),
  'traslación −5000': (p) => ({ x: p.x - 5000, y: p.y - 5000 }),
  'traslación +1e5': (p) => ({ x: p.x + 1e5, y: p.y + 1e5 }),
  'traslación +1e7': (p) => ({ x: p.x + 1e7, y: p.y + 1e7 }),
  'rotación 90°': rot(90), 'rotación 180°': rot(180), 'rotación 37°': rot(37), 'rotación 1°': rot(1),
  'reflexión X': (p) => ({ x: -p.x, y: p.y }),
};
const filas = [];
for (const [n, f] of Object.entries(FIX)) {
  const d = JSON.parse(fs.readFileSync(path.join(ROOT, f), 'utf8')); const E0 = ejecutarEtapas(d);
  for (const [tn, tf] of Object.entries(T)) {
    const E = ejecutarEtapas(transformar(d, tf));
    filas.push({ troquel: n, transformacion: tn, paneles: E.e8_conectividad.conservados, area: +E.areaTotal.toFixed(3), igualAIdentidad: E.e8_conectividad.conservados === E0.e8_conectividad.conservados && Math.abs(E.areaTotal - E0.areaTotal) < 1e-3, segSplit: E.e3_troceado.segmentos, V: E.e4_grafo.vertices, ady: E.e9_plegado.adyacencias });
  }
}
// Permutaciones de la entrada (misma geometría, distinto orden): determinismo frente a entradas equivalentes
const P = {
  'creases en orden inverso': (d) => ({ ...d, creases: d.creases.slice().reverse() }),
  'cada crease invertida': (d) => ({ ...d, creases: d.creases.map((c) => ({ ...c, points: c.points.slice().reverse().map((p) => ({ anchor: p.anchor, left: p.right, right: p.left })) })) }),
  'contorno en sentido contrario': (d) => ({ ...d, outerBoundary: { ...d.outerBoundary, points: d.outerBoundary.points.slice().reverse().map((p) => ({ anchor: p.anchor, left: p.right, right: p.left })) } }),
  'contorno con inicio desplazado 7': (d) => ({ ...d, outerBoundary: { ...d.outerBoundary, points: d.outerBoundary.points.slice(7).concat(d.outerBoundary.points.slice(0, 7)) } }),
};
for (const [n, f] of Object.entries(FIX)) {
  const d = JSON.parse(fs.readFileSync(path.join(ROOT, f), 'utf8')); const E0 = ejecutarEtapas(d);
  for (const [pn, pf] of Object.entries(P)) {
    const E = ejecutarEtapas(pf(JSON.parse(JSON.stringify(d))));
    filas.push({ troquel: n, transformacion: pn, paneles: E.e8_conectividad.conservados, area: +E.areaTotal.toFixed(3), igualAIdentidad: E.e8_conectividad.conservados === E0.e8_conectividad.conservados && Math.abs(E.areaTotal - E0.areaTotal) < 1e-3, segSplit: E.e3_troceado.segmentos, V: E.e4_grafo.vertices, ady: E.e9_plegado.adyacencias });
  }
}
console.table(filas);

// Correspondencia de paneles: oráculo (web ε=0.05 sobre caja-botanica-real) ↔ legacy ×1 ↔ legacy ×0.75 (normalizado a ×1), por centroide
const W = await webSombra();
const d = JSON.parse(fs.readFileSync(path.join(ROOT, FIX['caja-botanica-real']), 'utf8'));
const outer = W.flattenPath(d.outerBoundary); const segsDe = (pts, closed, type, id) => { const s = []; for (let i = 0; i < pts.length - 1; i++) s.push({ start: pts[i], end: pts[i + 1], type, creaseId: id }); if (closed) s.push({ start: pts[pts.length - 1], end: pts[0], type, creaseId: id }); return s; };
const bs = segsDe(outer, true, 'boundary'); const segs = [...bs]; d.creases.forEach((c, i) => segs.push(...segsDe(W.snapCreaseVerticesToBoundary(W.flattenPath(c), bs, 0.05), false, 'crease', String(i))));
const g = W.buildPlanarGraph(segs, 0.05);
const cen = (v) => { const a = W.polyArea(v); let cx = 0, cy = 0; for (let i = 0; i < v.length; i++) { const p = v[i], q = v[(i + 1) % v.length]; const k = p.x * q.y - q.x * p.y; cx += (p.x + q.x) * k; cy += (p.y + q.y) * k; } return { x: cx / (6 * a), y: cy / (6 * a) }; };
const oraculo = g.faces.filter((fa) => fa.area > 1e-7).map((fa, i) => ({ id: 'O' + i, area: fa.area, c: cen(fa.vertices), creases: [...new Set(fa.edges.flatMap((e) => e.creaseIds))].sort((a, b) => a - b) }));
const L1 = ejecutarEtapas(d).panels; const L075 = ejecutarEtapas(escalar(d, 0.75)).panels.map((p) => ({ ...p, area: p.area / 0.5625, centroid: { x: p.centroid.x / 0.75, y: p.centroid.y / 0.75 } }));
const casar = (o, L) => { let best = null, bd = Infinity; L.forEach((p, i) => { const dd = Math.hypot(p.centroid.x - o.c.x, p.centroid.y - o.c.y); if (dd < bd) { bd = dd; best = i; } }); return bd < 2 && best != null ? { i: best, dc: bd, dA: L[best].area - o.area } : null; };
const corr = oraculo.map((o) => { const a = casar(o, L1), b = casar(o, L075); return { oraculo: o.id, area: +o.area.toFixed(2), centroide: `${o.c.x.toFixed(1)},${o.c.y.toFixed(1)}`, creases: o.creases.join(' '), 'legacy×1': a ? `P${a.i} ΔA=${a.dA.toFixed(2)}` : '— (perdido)', 'legacy×0.75': b ? `P${b.i} ΔA=${b.dA.toFixed(2)}` : '— (perdido)' }; });
console.log(`\nOráculo provisional: ${oraculo.length} paneles, Σ área = ${oraculo.reduce((s, o) => s + o.area, 0).toFixed(3)} (contorno aplanado ${Math.abs(W.polyArea(outer)).toFixed(3)})`);
console.table(corr);
if (salida) { fs.mkdirSync(path.dirname(salida), { recursive: true }); fs.writeFileSync(salida, JSON.stringify({ metamorficas: filas, correspondencia: corr }, null, 1) + '\n'); console.log('→ ' + salida); }
