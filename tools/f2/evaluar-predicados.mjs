#!/usr/bin/env node
// F2A-0 (DP-4) — Evaluación de predicados de orientación sobre la geometría REAL, sin dependencias nuevas:
//   (a) double ingenuo · (b) double con filtro de error estático de Shewchuk (ccwerrboundA = (3 + 16u)·u) y recurso exacto en BigInt
//   (c) exacto siempre (racional BigInt, como el oráculo). Cuenta, para todas las orientaciones que necesita un arreglo plano
//   (cada extremo frente a cada segmento con cajas solapadas), cuántas veces el filtro no decide y cuántas el double ingenuo se equivoca.
// Uso: node tools/f2/evaluar-predicados.mjs [--json salida.json]
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
import * as Q from '../../tests/lib/f2/racional.mjs';
import { transformarDouble } from '../../tests/lib/f2/comparar.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const args = process.argv.slice(2); const salida = args.includes('--json') ? args[args.indexOf('--json') + 1] : null;
const u = 2 ** -53, ERR = (3 + 16 * u) * u;
const ingenuo = (a, b, c) => Math.sign((b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x));
let fallbacks = 0;
function filtrado(a, b, c) {
  const l = (b.x - a.x) * (c.y - a.y), r = (b.y - a.y) * (c.x - a.x), det = l - r, bound = ERR * (Math.abs(l) + Math.abs(r));
  if (det > bound || -det > bound) return Math.sign(det);
  fallbacks++; return Q.orient(Q.pDouble(a), Q.pDouble(b), Q.pDouble(c));
}
const exacto = (a, b, c) => Q.orient(Q.pDouble(a), Q.pDouble(b), Q.pDouble(c));
const rot = (deg) => { const t = (deg * Math.PI) / 180, co = Math.cos(t), si = Math.sin(t); return (p) => ({ x: co * p.x - si * p.y, y: si * p.x + co * p.y }); };
const F = { 'caja-botanica-real': 'tests/fixtures/real/caja-botanica-real.dieline.json', 'ill-real-caja-botanica': 'tests/fixtures/illustrator-real/ill-real-caja-botanica.dieline.json' };
const filas = [];
for (const [n, f] of Object.entries(F)) for (const [tn, tf] of [['×1', null], ['rotación 37°', rot(37)], ['traslación +1e5', (p) => ({ x: p.x + 1e5, y: p.y + 1e5 })]]) {
  let d = JSON.parse(fs.readFileSync(path.join(ROOT, f), 'utf8')); if (tf) d = transformarDouble(d, tf);
  const segs = []; const add = (pa, cerr) => { const p = pa.points.map((q) => q.anchor); for (let i = 0; i < p.length - (cerr ? 0 : 1); i++) segs.push([p[i], p[(i + 1) % p.length]]); };
  add(d.outerBoundary, true); d.creases.forEach((c) => add(c, false));
  const triples = []; for (const [a, b] of segs) for (const [c, e] of segs) { if (Math.max(a.x, b.x) < Math.min(c.x, e.x) || Math.max(c.x, e.x) < Math.min(a.x, b.x) || Math.max(a.y, b.y) < Math.min(c.y, e.y) || Math.max(c.y, e.y) < Math.min(a.y, b.y)) continue; triples.push([a, b, c], [a, b, e]); }
  let errores = 0, ceros = 0; fallbacks = 0;
  const t0 = performance.now(); const sI = triples.map(([a, b, c]) => ingenuo(a, b, c)); const tI = performance.now() - t0;
  const t1 = performance.now(); const sF = triples.map(([a, b, c]) => filtrado(a, b, c)); const tF = performance.now() - t1; const fb = fallbacks;
  const t2 = performance.now(); const sE = triples.map(([a, b, c]) => exacto(a, b, c)); const tE = performance.now() - t2;
  sI.forEach((s, i) => { if (s !== sE[i]) errores++; if (sE[i] === 0) ceros++; });
  const filtroOK = sF.every((s, i) => s === sE[i]);
  filas.push({ troquel: n, entrada: tn, orientaciones: triples.length, exactasCero: ceros, doubleIngenuoErroneas: errores, filtroSinDecidir: fb, filtroCorrecto: filtroOK, ms_double: +tI.toFixed(2), ms_filtrado: +tF.toFixed(2), ms_exacto: +tE.toFixed(2) });
}
console.table(filas);
if (salida) { fs.mkdirSync(path.dirname(salida), { recursive: true }); fs.writeFileSync(salida, JSON.stringify({ ccwerrboundA: ERR, filas }, null, 1) + '\n'); }
