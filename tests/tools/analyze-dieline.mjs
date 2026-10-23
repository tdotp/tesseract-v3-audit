// Toma de datos para el corpus de troqueles reales (D4/2A): analiza un DielineV1 con el motor vigente e informa riesgos de normalización.
// Acepta el JSON crudo del extractor O el archivo que guarda tools/illustrator/tesseract_extract_check.jsx (campo _resultado).
// Uso: node tests/tools/analyze-dieline.mjs <archivo.json> [--target panel|baseline]
import fs from 'node:fs'; import { TARGETS, loadGeometry } from '../lib/legacy.mjs'; import { analyze, outlineArea } from '../lib/analyze.mjs';
const file = process.argv[2]; const tIdx = process.argv.indexOf('--target'); const target = tIdx > 0 ? process.argv[tIdx + 1] : 'baseline';
if (!file) { console.error('uso: analyze-dieline.mjs <archivo.json> [--target panel|baseline]'); process.exit(2); }
let d = JSON.parse(fs.readFileSync(file, 'utf8')); if (d._resultado) d = d._resultado; if (d.error) { console.log('El extractor devolvió un error:', d.error); process.exit(1); }
const L = loadGeometry(TARGETS[target]); const a = analyze(L, d); const hyp = (p, q) => Math.hypot(p.x - q.x, p.y - q.y);
const outline = d.outerBoundary.points.map((p) => p.anchor); const segs = outline.map((p, i) => [p, outline[(i + 1) % outline.length]]);
const distSeg = (p, [s, e]) => { const dx = e.x - s.x, dy = e.y - s.y, l2 = dx * dx + dy * dy; let t = l2 ? ((p.x - s.x) * dx + (p.y - s.y) * dy) / l2 : 0; t = Math.max(0, Math.min(1, t)); return hyp(p, { x: s.x + t * dx, y: s.y + t * dy }); };
const ends = []; d.creases.forEach((c, i) => { ends.push({ i, k: 'ini', p: c.points[0].anchor }); ends.push({ i, k: 'fin', p: c.points[c.points.length - 1].anchor }); });
const near = []; for (let x = 0; x < ends.length; x++) { const dOut = Math.min(...segs.map((s) => distSeg(ends[x].p, s))); if (dOut > 1e-6 && dOut < 1.0) near.push(`crease ${ends[x].i} (${ends[x].k}) a ${dOut.toFixed(3)} mm del contorno`);
  for (let y = x + 1; y < ends.length; y++) { const dd = hyp(ends[x].p, ends[y].p); if (dd > 1e-6 && dd < 1.0 && ends[x].i !== ends[y].i) near.push(`crease ${ends[x].i} (${ends[x].k}) ↔ crease ${ends[y].i} (${ends[y].k}): ${dd.toFixed(3)} mm`); } }
const curved = [d.outerBoundary, ...d.holes, ...d.creases].reduce((n, pth) => n + pth.points.filter((q) => ['left', 'right'].some((h) => Math.hypot(q[h].x - q.anchor.x, q[h].y - q.anchor.y) > 1e-4)).length, 0);
console.log(JSON.stringify({ archivo: file, motor: target, contorno_mm2_anclas: +outlineArea(d).toFixed(2), huecos: d.holes.length, creases: d.creases.length, cutLines: d.cutLines.length, puntos_con_manijas_curvas: curved,
  paneles: a.nPanels, area_paneles_mm2: a.areaSum, diferencia_vs_contorno_mm2: +(a.areaSum - outlineArea(d)).toFixed(2), adyacencias: a.adjacency.length, avisos_del_validador: a.validate.problems.length, filtro_de_conectividad: a.logSummary.connectivity,
  extremos_casi_coincidentes_0_a_1mm: near, indicios: [curved ? 'curvas: el motor vigente las ignora (KI-07)' : null, d.holes.length ? 'huecos: no se restan; un panel con ventana centrada puede desaparecer (KI-05/06)' : null, a.logSummary.connectivity && /keeping (\d+) of (\d+)/.test(a.logSummary.connectivity) && RegExp.$1 !== RegExp.$2 ? 'el filtro de conectividad descartó caras (revisar KI-04/KI-09)' : null].filter(Boolean) }, null, 1));
