#!/usr/bin/env node
// F2A-2P — Juez de la optimización: (1) EQUIVALENCIA byte a byte (JSON completo de construirAdyacencias y construirArbolPlegado:
// adyacencias, detalle, uniones, diagnósticos, aristas, niveles, componentes, ciclos…) entre el árbol de trabajo y el commit aprobado
// d8b4bef (extraído con git archive), sobre el MISMO modelo; (2) tiempo A/B intercalado en el mismo proceso (mediana); (3) heap retenido.
// Conjuntos: 42 casos antes/después de F2A-2R, 600 de estrés (misma semilla y cortes que f2a2r-hallazgos), Caja Botánica (3 extracciones)
// con TODAS las bases, permutaciones y transformaciones. Sale con código 1 ante cualquier diferencia.
// Uso: node --expose-gc tools/f2/comparar-f2a2p.mjs [--base <sha>] [--json salida.json] [--md salida.md] [--sin-tiempos]
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { execFileSync } from 'node:child_process'; import { fileURLToPath, pathToFileURL } from 'node:url';
import { gridDieline } from '../../tests/lib/fixtures.mjs';
import { CASOS_LEGACY, CASOS_F2A2R } from '../../tests/lib/f2/casos-plegado.mjs';
import { PERMUTACIONES, transformarDouble } from '../../tests/lib/f2/comparar.mjs';
import { sintetico, generador } from '../../tests/lib/f2/aleatorios.mjs';
import * as N from '../../experimental/plegado/index.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..'); const args = process.argv.slice(2); const opt = (k) => (args.includes(k) ? args[args.indexOf(k) + 1] : null);
const BASE = opt('--base') || 'd8b4bef0b2b592fd3877882f3af379dc8eb318bb';
const rd = (f) => JSON.parse(fs.readFileSync(path.join(ROOT, f), 'utf8')); const CB = 'tests/fixtures/real/caja-botanica-real.dieline.json', ILL = 'tests/fixtures/illustrator-real/ill-real-caja-botanica.dieline.json', HIST = 'tests/fixtures/real/caja-botanica-illustrator-export.dieline.json';
const P = (pts, closed) => ({ closed, points: pts.map(([x, y]) => ({ anchor: { x, y }, left: { x, y }, right: { x, y } })) });
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'tess-f2a2p-base-'));
let salida = 0;
try {
  execFileSync('sh', ['-c', `git -C "${ROOT}" archive ${BASE} experimental | tar -x -C "${tmp}"`]); const B = await import(pathToFileURL(path.join(tmp, 'experimental/plegado/index.js')).href);
  const salidaDe = (Mod, m, base) => { const A = Mod.construirAdyacencias(m); const b = base == null ? Mod.baseDefecto(m) : base; let T; try { T = Mod.construirArbolPlegado(m, A, b); } catch (e) { T = { error: e.codigo || e.message }; } return JSON.stringify({ A, T, b }); };
  const grupos = {}; const dif = [];
  const caso = (g, n, d, eps, bases) => { const m = N.adaptarPanelModel(d, { eps: eps == null ? null : Number(eps) }); if (!m.panels.length) return; for (const b of bases ? bases(m) : [null]) {
    grupos[g] = (grupos[g] || 0) + 1; const x = salidaDe(B, m, b), y = salidaDe(N, m, b); if (x !== y) { let i = 0; while (x[i] === y[i]) i++; dif.push({ grupo: g, caso: n, base: b, contexto: { base: x.slice(Math.max(0, i - 80), i + 80), actual: y.slice(Math.max(0, i - 80), i + 80) } }); } } };
  for (const [n, c] of Object.entries(CASOS_LEGACY)) caso('42 antes/después', n, c.build(), c.eps);
  for (const [n, b] of Object.entries(CASOS_F2A2R)) caso('42 antes/después', 'F2A-2R ' + n, b(), null);
  caso('42 antes/después', 'A-7 sin ajuste', rd(ILL), null);
  const r = generador(20261028); for (let k = 0; k < 600; k++) { const d = sintetico(r); if (r() < 0.5) { const vert = r() < 0.5, c = 1 + Math.floor(r() * (vert ? 7 : 5)); d.cutLines = [{ geom: P(vert ? [[c, 0], [c, 6]] : [[0, c], [8, c]], false) }]; } caso('600 estrés', 'estrés ' + k, d, null); }
  const todas = (m) => m.panels.map((_, i) => i);
  for (const [n, f, e] of [['caja-botanica-real', CB, null], ['ill-real ε 0.05', ILL, '0.05'], ['histórico ×0.75 ε 0.05', HIST, '0.05'], ['A-7 sin ajuste', ILL, null]]) caso('Caja Botánica, todas las bases', n, rd(f), e, todas);
  caso('Caja Botánica, todas las bases', 'base inválida', rd(CB), null, () => [-1, 13, 1.5]);
  for (const [n, f] of [['crease cerrada', () => ({ version: '1.0', units: 'mm', holes: [], cutLines: [], outerBoundary: P([[0, 0], [100, 0], [100, 100], [0, 100]], true), creases: [P([[25, 25], [75, 25], [75, 75], [25, 75]], true)] })], ['hueco-centrado', CASOS_LEGACY['hueco-centrado'].build], ['hueco-descentrado', CASOS_LEGACY['hueco-descentrado'].build], ['ill-real-compuesto', CASOS_LEGACY['ill-real-compuesto'].build], ['ill-real-caja-simple', CASOS_LEGACY['ill-real-caja-simple'].build]]) caso('creases cerradas y huecos, todas las bases', n, f(), null, todas);
  const BASES = [['caja-botanica-real', () => rd(CB), null], ['ill-real ε 0.05', () => rd(ILL), '0.05'], ['x-cruz', CASOS_LEGACY['x-cruz'].build, null], ['rejilla 4×4', () => gridDieline(4), null], ['t-exacta', CASOS_LEGACY['t-exacta'].build, null], ['hueco-descentrado', CASOS_LEGACY['hueco-descentrado'].build, null], ['dos componentes', CASOS_F2A2R.dosComponentes, null], ['ciclo fuera', CASOS_F2A2R.cicloFuera, null], ['escalón', CASOS_F2A2R.escalon, null]];
  for (const [n, b, e] of BASES) for (const [pn, perm] of Object.entries(PERMUTACIONES)) caso('permutaciones', n + ' · ' + pn, perm(b()).d, e);
  const TR = { '×2': (p) => ({ x: 2 * p.x, y: 2 * p.y }), 'rotación 90°': (p) => ({ x: -p.y, y: p.x }), 'reflexión': (p) => ({ x: -p.x, y: p.y }), '×0.75': (p) => ({ x: 0.75 * p.x, y: 0.75 * p.y }), 'rotación 37°': (p) => { const c = Math.cos(37 * Math.PI / 180), s = Math.sin(37 * Math.PI / 180); return { x: c * p.x - s * p.y, y: s * p.x + c * p.y }; }, '+1e5': (p) => ({ x: p.x + 1e5, y: p.y + 1e5 }) };
  for (const [n, b, e] of BASES) for (const [tn, f] of Object.entries(TR)) caso('transformaciones', n + ' · ' + tn, transformarDouble(b(), f), /0\.75|37|1e5/.test(tn) && /caja|ill/.test(n) ? '0.05' : e);
  const totalCasos = Object.values(grupos).reduce((s, x) => s + x, 0);
  console.log(`Equivalencia byte a byte frente a ${BASE.slice(0, 7)}: ${totalCasos - dif.length} de ${totalCasos} iguales`); console.table(grupos); if (dif.length) { salida = 1; console.log('DIFERENCIAS:', JSON.stringify(dif.slice(0, 5), null, 1)); }
  // tiempo A/B intercalado y memoria
  let tiempos = null;
  if (!args.includes('--sin-tiempos')) {
    if (typeof global.gc !== 'function') { console.error('Para los tiempos: node --expose-gc'); process.exit(2); }
    const CT = { 'caja-botanica-real': [rd(CB), null], 'ill-real ε 0.05': [rd(ILL), 0.05], 'histórico ×0.75 ε 0.05': [rd(HIST), 0.05], 'ill-real-caja-simple': [rd('tests/fixtures/illustrator-real/ill-real-caja-simple.dieline.json'), null], 'rejilla 2×2': [gridDieline(2), null], 'rejilla 4×4': [gridDieline(4), null], 'rejilla 6×6': [gridDieline(6), null], 'rejilla 8×8': [gridDieline(8), null], 'rejilla 3×3 líneas completas': [gridDieline(3, { fullLines: true }), null], 'rejilla 4×4 densa': [gridDieline(4, { extra: 25 }), null], 'F2A-2R ciclo fuera': [CASOS_F2A2R.cicloFuera(), null], 'A-7 sin ajuste': [rd(ILL), null] };
    const med = (xs) => { const s = xs.slice().sort((a, b) => a - b); return s[Math.floor(s.length / 2)]; };
    const heap = (f) => { global.gc(); const h0 = process.memoryUsage().heapUsed; const v = []; for (let i = 0; i < 20; i++) v.push(f()); global.gc(); const h1 = process.memoryUsage().heapUsed; void v.length; return +((h1 - h0) / 20 / 1024).toFixed(1); };
    tiempos = [];
    for (const [n, [d, eps]] of Object.entries(CT)) {
      const m = N.adaptarPanelModel(d, { eps }); const b = N.baseDefecto(m); const K = 20;
      const corre = (Mod) => () => { const A = Mod.construirAdyacencias(m); return Mod.construirArbolPlegado(m, A, b); };
      const fB = corre(B), fN = corre(N); for (let i = 0; i < 30; i++) { fB(); fN(); }
      const tB = [], tN = []; for (let r2 = 0; r2 < 60; r2++) { for (const [f, t] of r2 % 2 ? [[fB, tB], [fN, tN]] : [[fN, tN], [fB, tB]]) { const t0 = performance.now(); for (let i = 0; i < K; i++) f(); t.push((performance.now() - t0) / K); } }
      const kB = heap(() => { const A = B.construirAdyacencias(m); return [A, B.construirArbolPlegado(m, A, b)]; }), kN = heap(() => { const A = N.construirAdyacencias(m); return [A, N.construirArbolPlegado(m, A, b)]; });
      tiempos.push({ caso: n, base_ms: +med(tB).toFixed(4), actual_ms: +med(tN).toFixed(4), 'actual/base': +(med(tN) / med(tB)).toFixed(2), base_kB: kB, actual_kB: kN });
    }
    console.log('Tiempo de construirAdyacencias + construirArbolPlegado sobre el mismo modelo (60 rondas intercaladas × 20; mediana) y heap retenido por resultado:'); console.table(tiempos);
  }
  const res = { base: BASE, iguales: totalCasos - dif.length, total: totalCasos, grupos, diferencias: dif, tiempos };
  if (opt('--json')) fs.writeFileSync(opt('--json'), JSON.stringify(res, null, 1) + '\n');
  if (opt('--md')) fs.writeFileSync(opt('--md'), [`# F2A-2P · Equivalencia y A/B frente a \`${BASE}\` (generado por \`tools/f2/comparar-f2a2p.mjs\`)`, '', `**Equivalencia byte a byte:** ${totalCasos - dif.length} de ${totalCasos} iguales.`, '', '| Conjunto | Casos |', '|---|---|', ...Object.entries(grupos).map(([g, k]) => `| ${g} | ${k} |`), '', ...(tiempos ? ['| Caso | Base (ms) | Actual (ms) | Actual/base | Heap base (kB) | Heap actual (kB) |', '|---|---|---|---|---|---|', ...tiempos.map((t) => `| ${t.caso} | ${t.base_ms} | ${t.actual_ms} | ${t['actual/base']} | ${t.base_kB} | ${t.actual_kB} |`)] : [])].join('\n') + '\n');
} finally { fs.rmSync(tmp, { recursive: true, force: true }); }
process.exit(salida);
