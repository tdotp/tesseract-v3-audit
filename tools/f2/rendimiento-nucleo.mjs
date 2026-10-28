#!/usr/bin/env node
// F2A-1 — Rendimiento y memoria del núcleo experimental frente al legacy (buildPanels + buildAdjacency de src/core/legacy, sin modificar)
// y, como referencia, el oráculo. Tiempo: mediana de 20 corridas tras 3 de calentamiento (Node; piso optimista frente a Chromium 99/CEP).
// Memoria: (a) heap retenido por resultado (heapUsed tras GC con 10 resultados vivos ÷ 10); (b) fugas: heap tras GC al soltar los
// resultados frente al inicial; (c) pico de RSS de un proceso hijo que solo carga ese motor y ejecuta el caso 50 veces.
// Uso: node --expose-gc tools/f2/rendimiento-nucleo.mjs [--json salida.json]
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
async function motores() {
  const { buildPanels } = await import('../../src/core/legacy/panels.js'); const { buildAdjacency } = await import('../../src/core/legacy/adjacency.js'); const { setLogSink } = await import('../../src/core/legacy/log.js'); setLogSink(null);
  const { nucleo } = await import('../../experimental/geometria/nucleo.js'); const { oraculo } = await import('../../tests/lib/f2/oraculo.mjs');
  return {
    legacy: (d) => { const pd = buildPanels(JSON.parse(JSON.stringify(d))); return { pd, adj: buildAdjacency(pd.panels, pd.creaseEdges) }; },
    nucleo: (d, eps) => nucleo(d, { eps }),
    oraculo: (d, eps) => oraculo(d, { eps: eps == null ? null : String(eps) }),
  };
}
const args = process.argv.slice(2);
if (args[0] === '--hijo') { // proceso aislado para el pico de RSS
  const M = await motores(); const [d, eps] = CASOS[args[2]](); let r; for (let i = 0; i < Number(args[3] || 50); i++) r = M[args[1]](d, eps); void r;
  process.stdout.write(JSON.stringify({ maxRSS_kB: process.resourceUsage().maxRSS })); process.exit(0);
}
const salida = args.includes('--json') ? args[args.indexOf('--json') + 1] : null;
if (typeof global.gc !== 'function') { console.error('Ejecutar con node --expose-gc'); process.exit(2); }
const M = await motores(); const filas = [];
const med = (xs) => { const s = xs.slice().sort((a, b) => a - b); return s[Math.floor(s.length / 2)]; };
for (const [n, f] of Object.entries(CASOS)) {
  const [d, eps] = f(); const fila = { caso: n };
  for (const m of ['legacy', 'nucleo', 'oraculo']) {
    const pesado = m === 'oraculo' && /densa|8×8/.test(n); const k = pesado ? 3 : 20;
    for (let i = 0; i < (pesado ? 1 : 3); i++) M[m](d, eps);
    const ts = []; for (let i = 0; i < k; i++) { const t = performance.now(); M[m](d, eps); ts.push(performance.now() - t); }
    fila[m + '_ms'] = +med(ts).toFixed(3);
    if (m !== 'oraculo') {
      global.gc(); const h0 = process.memoryUsage().heapUsed; const vivos = []; for (let i = 0; i < 10; i++) vivos.push(M[m](d, eps)); global.gc(); const h1 = process.memoryUsage().heapUsed;
      vivos.length = 0; global.gc(); const h2 = process.memoryUsage().heapUsed;
      fila[m + '_retenido_kB'] = +((h1 - h0) / 10 / 1024).toFixed(1); fila[m + '_tras_soltar_kB'] = +((h2 - h0) / 1024).toFixed(1);
      const r = spawnSync(process.execPath, [fileURLToPath(import.meta.url), '--hijo', m, n, '50'], { encoding: 'utf8' }); fila[m + '_picoRSS_MB'] = r.status === 0 ? +(JSON.parse(r.stdout).maxRSS_kB / 1024).toFixed(1) : null;
    }
  }
  fila['nucleo/legacy'] = +(fila.nucleo_ms / fila.legacy_ms).toFixed(2); filas.push(fila);
}
console.log(`Node ${process.version} · ${process.arch} · mediana de 20 (oráculo: 3 en los casos pesados)`); console.table(filas);
if (salida) { fs.mkdirSync(path.dirname(salida), { recursive: true }); fs.writeFileSync(salida, JSON.stringify({ node: process.version, arch: process.arch, filas }, null, 1) + '\n'); }
