#!/usr/bin/env node
// F2.0 — Escalas críticas de los predicados con tolerancia absoluta del legacy y barrido fino de escala.
// (1) Sobre la entrada a ×1 calcula, para cada predicado que compara una longitud L con GRAPH_EPS = 0.5 mm, la escala crítica s* = 0.5 / L
//     en la que esa decisión cambia (ptEq: distancia entre extremos; pointOnSeg: d1, d2 y el exceso d1 + d2 − len; distancia lateral solo como referencia).
// (2) Barre la escala en una malla logarítmica fina, detecta cada TRANSICIÓN de la firma normalizada del resultado y comprueba si cae junto a
//     alguna escala crítica de la entrada (explicación) o no (transición inducida por puntos creados al trocear: se registra como no explicada).
// Uso: node tools/f2/ki22-predicados.mjs [troquel.json] [--min 0.2 --max 5 --pasos 600] [--json salida.json]
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
import { ejecutarEtapas, escalar } from './lib/etapas.mjs';
import { GRAPH_EPS } from '../../src/core/legacy/constants.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const args = process.argv.slice(2); const opt = (k, def) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : def; };
const file = args.find((a, i) => a.endsWith('.json') && args[i - 1] !== '--json') || path.join(ROOT, 'tests/fixtures/illustrator-real/ill-real-caja-botanica.dieline.json');
const smin = Number(opt('--min', '0.2')), smax = Number(opt('--max', '5')), pasos = Number(opt('--pasos', '600')); const salida = opt('--json', null);
const d = JSON.parse(fs.readFileSync(file, 'utf8'));

// Segmentos de entrada con procedencia (igual que buildPanels: contornos cerrados y creases abiertas; los cutLines no entran en la topología)
const segs = [];
const addPath = (pa, closed, tipo, idx) => { if (!pa || !pa.points || pa.points.length < 2) return; const p = pa.points.map((q) => q.anchor); for (let i = 0; i < p.length - 1; i++) segs.push({ a: p[i], b: p[i + 1], tipo, idx, seg: i }); if (closed) segs.push({ a: p[p.length - 1], b: p[0], tipo, idx, seg: p.length - 1 }); };
addPath(d.outerBoundary, true, 'contorno', 0); (d.holes || []).forEach((h, i) => addPath(h, true, 'hueco', i)); (d.creases || []).forEach((c, i) => addPath(c, false, 'crease', i));
const dist = (p, q) => Math.hypot(p.x - q.x, p.y - q.y);
const lateral = (p, a, b) => { const l2 = (b.x - a.x) ** 2 + (b.y - a.y) ** 2; if (!l2) return dist(p, a); let t = ((p.x - a.x) * (b.x - a.x) + (p.y - a.y) * (b.y - a.y)) / l2; t = Math.max(0, Math.min(1, t)); return Math.hypot(p.x - (a.x + t * (b.x - a.x)), p.y - (a.y + t * (b.y - a.y))); };
const nombre = (s) => `${s.tipo}${s.idx}.${s.seg}`;

// Extremos únicos (de crease: sus dos extremos; de contorno: sus vértices)
const pts = []; const key = (p) => p.x + ',' + p.y;
const vistos = new Set();
for (const s of segs) for (const [p, cual] of [[s.a, 'a'], [s.b, 'b']]) { const k = key(p) + nombre(s).split('.')[0]; if (vistos.has(k)) continue; vistos.add(k); pts.push({ p, origen: nombre(s).split('.')[0], extremo: s.tipo === 'crease' && ((cual === 'a' && s.seg === 0) || (cual === 'b' && s.seg === (d.creases[s.idx].points.length - 2))) }); }

const criticos = [];
// ptEq / getVid / edgeMatch: distancia entre dos puntos < GRAPH_EPS
for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) {
  const L = dist(pts[i].p, pts[j].p); if (L === 0) continue; const s = GRAPH_EPS / L;
  if (s >= smin && s <= smax) criticos.push({ predicado: 'ptEq (fusión de vértices)', s, L, entre: `${pts[i].origen}@(${pts[i].p.x.toFixed(3)},${pts[i].p.y.toFixed(3)}) ↔ ${pts[j].origen}@(${pts[j].p.x.toFixed(3)},${pts[j].p.y.toFixed(3)})` });
}
// pointOnSeg (troceado en T): extremo de un segmento sobre otro segmento — d1 > eps, d2 > eps y d1 + d2 − len < eps
for (const s1 of segs) for (const s2 of segs) {
  if (s1 === s2) continue;
  for (const p of [s2.a, s2.b]) {
    const d1 = dist(p, s1.a), d2 = dist(p, s1.b), len = dist(s1.a, s1.b); const exceso = d1 + d2 - len; if (d1 === 0 || d2 === 0) continue;
    const h = lateral(p, s1.a, s1.b);
    for (const [L, que] of [[exceso, 'exceso d1+d2−len'], [d1, 'd1'], [d2, 'd2']]) {
      if (L <= 0) continue; const s = GRAPH_EPS / L;
      if (s >= smin && s <= smax && (que === 'exceso d1+d2−len' ? Math.min(d1, d2) * s > GRAPH_EPS : exceso * s < GRAPH_EPS))
        criticos.push({ predicado: `pointOnSeg (${que})`, s, L, lateral: h, entre: `extremo de ${nombre(s2)}@(${p.x.toFixed(3)},${p.y.toFixed(3)}) sobre ${nombre(s1)}` });
    }
  }
}
criticos.sort((a, b) => a.s - b.s);
const uniq = []; for (const c of criticos) if (!uniq.find((u) => Math.abs(u.s - c.s) < 1e-12 && u.predicado === c.predicado && u.entre === c.entre)) uniq.push(c);

// Barrido fino: firma normalizada (paneles, área/s², adyacencias, caras, vértices)
const firma = (s) => { const E = ejecutarEtapas(escalar(d, s)); return { s, paneles: E.e8_conectividad.conservados, area: +(E.areaTotal / (s * s)).toFixed(2), ady: E.e9_plegado.adyacencias, caras: E.e5_caras.total, V: E.e4_grafo.vertices, segSplit: E.e3_troceado.segmentos, avisos: E.e10_validacion.problemas }; };
const malla = []; for (let k = 0; k <= pasos; k++) malla.push(smin * Math.pow(smax / smin, k / pasos));
const barrido = malla.map(firma);
const sig = (f) => `${f.paneles}|${f.area}|${f.ady}|${f.caras}|${f.V}|${f.segSplit}`;
const transiciones = [];
for (let k = 1; k < barrido.length; k++) if (sig(barrido[k]) !== sig(barrido[k - 1])) {
  const lo = barrido[k - 1].s, hi = barrido[k].s; const expl = uniq.filter((c) => c.s >= lo * (1 - 1e-9) && c.s <= hi * (1 + 1e-9));
  transiciones.push({ entre: `${lo.toFixed(5)}–${hi.toFixed(5)}`, de: sig(barrido[k - 1]), a: sig(barrido[k]), explicadaPor: expl.map((c) => `${c.predicado} L=${c.L.toFixed(4)} s*=${c.s.toFixed(5)}`) });
}
const resumenResultados = {}; for (const f of barrido) { const k = `${f.paneles} paneles · área ${f.area}`; resumenResultados[k] = resumenResultados[k] || { desde: f.s, hasta: f.s, n: 0 }; resumenResultados[k].hasta = f.s; resumenResultados[k].n++; }

console.log(`Troquel: ${path.relative(ROOT, file)} · GRAPH_EPS = ${GRAPH_EPS} mm · escalas [${smin}, ${smax}] · ${pasos + 1} puntos`);
console.log(`\nPredicados con escala crítica en el intervalo: ${uniq.length}. Los más cercanos a ×1 (|s*−1| < 0.05):`);
console.table(uniq.filter((c) => Math.abs(c.s - 1) < 0.05).map((c) => ({ s: +c.s.toFixed(5), L_mm: +c.L.toFixed(4), lateral_mm: c.lateral == null ? '' : +c.lateral.toFixed(4), predicado: c.predicado, entre: c.entre })));
console.log(`\nTransiciones observadas en el barrido: ${transiciones.length} (explicadas por un predicado de la entrada: ${transiciones.filter((t) => t.explicadaPor.length).length})`);
for (const t of transiciones) console.log(` ${t.entre}: ${t.de} → ${t.a}${t.explicadaPor.length ? '\n     ← ' + t.explicadaPor.slice(0, 4).join('\n     ← ') : '\n     ← (sin predicado de la entrada en el intervalo: punto creado por el troceado)'}`);
console.log('\nResultados distintos (paneles · área normalizada a ×1) y rango de escalas donde aparecen:');
console.table(Object.entries(resumenResultados).map(([k, v]) => ({ resultado: k, desde: +v.desde.toFixed(4), hasta: +v.hasta.toFixed(4), muestras: v.n })));
if (salida) { fs.mkdirSync(path.dirname(salida), { recursive: true }); fs.writeFileSync(salida, JSON.stringify({ troquel: path.relative(ROOT, file), GRAPH_EPS, intervalo: [smin, smax], pasos, criticos: uniq, transiciones, resultados: resumenResultados }, null, 1) + '\n'); console.log('→ ' + salida); }
