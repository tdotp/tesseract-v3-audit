#!/usr/bin/env node
// F2A-2 — Rendimiento y memoria de la cadena experimental núcleo → adaptador PanelModel v1 → adyacencias → árbol de plegado frente a la
// cadena legacy buildPanels → buildAdjacency → buildFoldTree (src/core/legacy, sin modificar), con los 10 casos de F2A-1.
// Tiempo: mediana de 20 corridas tras 3 de calentamiento, por etapa y total (Node; piso optimista frente a Chromium 99/CEP).
// Memoria: heap retenido por resultado (10 resultados vivos tras GC), heap tras soltarlos y pico de RSS de un proceso hijo (50 ejecuciones).
// Predicados: contadores de filtro/exacto de una ejecución del núcleo; ajuste: núcleo con y sin ε en los casos con ε.
// Uso: node --expose-gc tools/f2/rendimiento-plegado.mjs [--json salida.json]
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url'; import { spawnSync } from 'node:child_process';
import { gridDieline } from '../../tests/lib/fixtures.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const rd = (f) => JSON.parse(fs.readFileSync(path.join(ROOT, f), 'utf8'));
const CASOS = {
  'caja-botanica-real': () => [rd('tests/fixtures/real/caja-botanica-real.dieline.json'), null],
  'ill-real-caja-botanica (ε 0.05)': () => [rd('tests/fixtures/illustrator-real/ill-real-caja-botanica.dieline.json'), 0.05],
  'histórico ×0.75 (ε 0.05)': () => [rd('tests/fixtures/real/caja-botanica-illustrator-export.dieline.json'), 0.05],
  'ill-real-caja-simple': () => [rd('tests/fixtures/illustrator-real/ill-real-caja-simple.dieline.json'), null],
  'rejilla 2×2': () => [gridDieline(2), null], 'rejilla 4×4': () => [gridDieline(4), null], 'rejilla 6×6': () => [gridDieline(6), null], 'rejilla 8×8': () => [gridDieline(8), null],
  'rejilla 3×3 líneas completas': () => [gridDieline(3, { fullLines: true }), null], 'rejilla 4×4 densa (25 puntos por arista)': () => [gridDieline(4, { extra: 25 }), null],
};
async function cadenas() {
  const { createLegacyEngine } = await import('../../src/core/engine.js'); const L = createLegacyEngine({ log: null });
  const G = await import('../../experimental/geometria/nucleo.js'); const E = await import('../../experimental/plegado/index.js'); const { contadores } = await import('../../experimental/geometria/predicados.js');
  const legacy = (d) => { const pd = L.buildPanels(JSON.parse(JSON.stringify(d))); const adj = L.buildAdjacency(pd.panels, pd.creaseEdges); return { pd, adj, tree: pd.panels.length ? L.buildFoldTree(pd.panels, adj, L.defaultBaseIndex(pd)) : [] }; };
  const experimental = (d, eps) => { const m = E.adaptarPanelModel(d, { eps }); const A = E.construirAdyacencias(m); return { m, A, T: m.panels.length ? E.construirArbolPlegado(m, A, E.baseDefecto(m)) : null }; };
  return { L, G, E, contadores, legacy, experimental };
}
const args = process.argv.slice(2);
if (args[0] === '--hijo') { const C = await cadenas(); const [d, eps] = CASOS[args[2]](); let r; for (let i = 0; i < Number(args[3] || 50); i++) r = C[args[1]](d, eps); void r; process.stdout.write(JSON.stringify({ maxRSS_kB: process.resourceUsage().maxRSS })); process.exit(0); }
const salida = args.includes('--json') ? args[args.indexOf('--json') + 1] : null;
if (typeof global.gc !== 'function') { console.error('Ejecutar con node --expose-gc'); process.exit(2); }
const C = await cadenas(); const filas = [];
const med = (xs) => { const s = xs.slice().sort((a, b) => a - b); return s[Math.floor(s.length / 2)]; };
const mide = (f, k = 20) => { for (let i = 0; i < 3; i++) f(); const ts = []; for (let i = 0; i < k; i++) { const t = performance.now(); f(); ts.push(performance.now() - t); } return +med(ts).toFixed(3); };
const retenido = (f) => { global.gc(); const h0 = process.memoryUsage().heapUsed; const vivos = []; for (let i = 0; i < 10; i++) vivos.push(f()); global.gc(); const h1 = process.memoryUsage().heapUsed; vivos.length = 0; global.gc(); const h2 = process.memoryUsage().heapUsed; return [+((h1 - h0) / 10 / 1024).toFixed(1), +((h2 - h0) / 1024).toFixed(1)]; };
for (const [n, f] of Object.entries(CASOS)) {
  const [d, eps] = f(); const fila = { caso: n };
  // legacy por etapas
  const dc = () => JSON.parse(JSON.stringify(d)); const pd = C.L.buildPanels(dc()); const adj = C.L.buildAdjacency(pd.panels, pd.creaseEdges); const lb = C.L.defaultBaseIndex(pd);
  fila.L_paneles_ms = mide(() => C.L.buildPanels(dc())); fila.L_ady_ms = mide(() => C.L.buildAdjacency(pd.panels, pd.creaseEdges)); fila.L_arbol_ms = mide(() => C.L.buildFoldTree(pd.panels, adj, lb)); fila.L_total_ms = mide(() => C.legacy(d));
  // experimental por etapas (el adaptador se mide como adaptar − nucleoDetallado sobre las mismas corridas intercaladas)
  const m = C.E.adaptarPanelModel(d, { eps }); const A = C.E.construirAdyacencias(m); const b = C.E.baseDefecto(m);
  fila.N_nucleo_ms = mide(() => C.G.nucleo(d, { eps })); const det = mide(() => C.G.nucleoDetallado(d, { eps })); const ad = mide(() => C.E.adaptarPanelModel(d, { eps }));
  fila.N_adaptador_ms = +(ad - det).toFixed(3); fila.N_ady_ms = mide(() => C.E.construirAdyacencias(m)); fila.N_arbol_ms = mide(() => C.E.construirArbolPlegado(m, A, b)); fila.N_total_ms = mide(() => C.experimental(d, eps));
  fila['total N/L'] = +(fila.N_total_ms / fila.L_total_ms).toFixed(2);
  if (eps != null) fila.N_nucleo_sin_eps_ms = mide(() => C.G.nucleo(d, {}));
  for (const k of Object.keys(C.contadores)) C.contadores[k] = 0; C.G.nucleo(d, { eps }); fila.predicados = `${C.contadores.filtro}/${C.contadores.exacto}/${C.contadores.exactoCero}`;
  [fila.L_retenido_kB, fila.L_tras_soltar_kB] = retenido(() => C.legacy(d)); [fila.N_retenido_kB, fila.N_tras_soltar_kB] = retenido(() => C.experimental(d, eps));
  for (const k of ['legacy', 'experimental']) { const r = spawnSync(process.execPath, [fileURLToPath(import.meta.url), '--hijo', k, n, '50'], { encoding: 'utf8' }); fila[(k === 'legacy' ? 'L' : 'N') + '_picoRSS_MB'] = r.status === 0 ? +(JSON.parse(r.stdout).maxRSS_kB / 1024).toFixed(1) : null; }
  filas.push(fila);
}
console.log(`Node ${process.version} · ${process.arch} · mediana de 20 · predicados = filtro/exacto/exactoCero de una ejecución del núcleo`);
console.table(filas.map((f) => ({ caso: f.caso, L_total_ms: f.L_total_ms, N_total_ms: f.N_total_ms, 'total N/L': f['total N/L'], N_nucleo_ms: f.N_nucleo_ms, N_adaptador_ms: f.N_adaptador_ms, N_ady_ms: f.N_ady_ms, N_arbol_ms: f.N_arbol_ms, L_paneles_ms: f.L_paneles_ms, L_ady_ms: f.L_ady_ms, L_arbol_ms: f.L_arbol_ms })));
console.table(filas.map((f) => ({ caso: f.caso, 'retenido L/N kB': f.L_retenido_kB + ' / ' + f.N_retenido_kB, 'tras soltar L/N kB': f.L_tras_soltar_kB + ' / ' + f.N_tras_soltar_kB, 'pico RSS L/N MB': f.L_picoRSS_MB + ' / ' + f.N_picoRSS_MB, predicados: f.predicados, 'núcleo sin ε ms': f.N_nucleo_sin_eps_ms ?? '—' })));
const lentos = filas.filter((f) => f.N_total_ms > f.L_total_ms).map((f) => f.caso); console.log(`Criterio 5 del Plan §5 (tiempo ≤ legacy en todos los casos): ${lentos.length ? 'NO SE CUMPLE en ' + lentos.length + ' de ' + filas.length + ': ' + lentos.join(', ') : 'se cumple'}`);
if (salida) { fs.mkdirSync(path.dirname(salida), { recursive: true }); fs.writeFileSync(salida, JSON.stringify({ node: process.version, arch: process.arch, filas, criterio5: { cumple: !lentos.length, lentos } }, null, 1) + '\n'); }
