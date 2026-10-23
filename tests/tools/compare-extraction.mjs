// Compara dos extracciones DielineV1 (p. ej. la que guarda tesseract_extract_check.jsx en Illustrator real vs un fixture): conteos y desviación máxima de coordenadas.
// Uso: node tests/tools/compare-extraction.mjs <real.json> <referencia.json> [tolerancia_mm=1e-6]
import fs from 'node:fs';
const [a, b, tolArg] = process.argv.slice(2); if (!a || !b) { console.error('uso: compare-extraction.mjs <real.json> <referencia.json> [tol]'); process.exit(2); }
const load = (f) => { let d = JSON.parse(fs.readFileSync(f, 'utf8')); if (d._resultado) d = d._resultado; return d; }; const A = load(a), B = load(b), tol = Number(tolArg || 1e-6);
if (A.error || B.error) { console.log('error en la extracción:', A.error || B.error); process.exit(1); }
const paths = (d) => ({ outer: [d.outerBoundary], holes: d.holes, cutLines: d.cutLines.map((c) => c.geom), creases: d.creases }); const PA = paths(A), PB = paths(B); const rep = { tolerancia_mm: tol, grupos: {}, ok: true };
for (const g of Object.keys(PA)) { const x = PA[g], y = PB[g]; const r = { n_real: x.length, n_ref: y.length, puntos_iguales: x.length === y.length && x.every((p, i) => p.points.length === y[i].points.length), maxDesviacion_mm: 0 };
  if (r.puntos_iguales) for (let i = 0; i < x.length; i++) x[i].points.forEach((p, j) => ['anchor', 'left', 'right'].forEach((k) => { r.maxDesviacion_mm = Math.max(r.maxDesviacion_mm, Math.abs(p[k].x - y[i].points[j][k].x), Math.abs(p[k].y - y[i].points[j][k].y)); }));
  r.coincide = r.puntos_iguales && r.maxDesviacion_mm <= tol; rep.grupos[g] = r; rep.ok = rep.ok && r.coincide; }
console.log(JSON.stringify(rep, null, 1)); process.exit(rep.ok ? 0 : 1);
