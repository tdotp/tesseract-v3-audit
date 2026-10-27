#!/usr/bin/env node
// F2.0 — Evaluación del motor candidato de tesseract-web (packages/core/src/fold-engine) frente al legacy, a varias escalas.
// SOLO lectura del repositorio web: se empaqueta con esbuild a tests/results/f2/ (ignorado por git); nunca se construye dentro del original.
// Uso: node tools/f2/motor-web.mjs [troquel.json …] [--escalas 0.5,0.75,1,2] [--json salida.json]
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath, pathToFileURL } from 'node:url'; import { execFileSync } from 'node:child_process';
import { ejecutarEtapas, escalar } from './lib/etapas.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const WEB = path.resolve(ROOT, '../tesseract-web'); const OUT = path.join(ROOT, 'tests/results/f2/web-engine.mjs');
const args = process.argv.slice(2); const opt = (k, def) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : def; };
const salida = opt('--json', null);
const escalas = opt('--escalas', '0.25,0.5,0.75,0.9,0.99,0.995,0.998,0.999,1,1.001,1.01,1.25,1.5,2,4').split(',').map(Number);
const files = args.filter((a, i) => a.endsWith('.json') && args[i - 1] !== '--json');
if (!files.length) files.push(...['ill-real-caja-botanica', 'ill-real-caja-simple', 'ill-real-compuesto', 'ill-real-curvas'].map((n) => path.join(ROOT, 'tests/fixtures/illustrator-real', n + '.dieline.json')), path.join(ROOT, 'tests/fixtures/real/caja-botanica-real.dieline.json'), path.join(ROOT, 'tests/fixtures/real/caja-botanica-illustrator-export.dieline.json'));

const head = execFileSync('git', ['-C', WEB, 'rev-parse', '--short', 'HEAD'], { encoding: 'utf8' }).trim();
fs.mkdirSync(path.dirname(OUT), { recursive: true });
execFileSync(path.join(ROOT, 'node_modules/.bin/esbuild'), [path.join(WEB, 'packages/core/src/fold-engine/index.ts'), '--bundle', '--format=esm', '--platform=node', '--outfile=' + OUT, '--log-level=warning']);
const web = await import(pathToFileURL(OUT).href);

const filas = [];
for (const f of files) {
  const base = JSON.parse(fs.readFileSync(f, 'utf8'));
  for (const s of escalas) {
    const d = escalar(base, s);
    const L = ejecutarEtapas(d);
    let W;
    try {
      const t = web.buildFoldTopology({ outerBoundary: d.outerBoundary, holes: d.holes || [], creases: d.creases || [], thickness: d.thickness_mm || 0.25 });
      W = { paneles: t.panels.length, areaN: t.geometryArea.generated / (s * s), esperadaN: t.geometryArea.expected / (s * s), adyacencias: t.creaseAdjacency.length, error: null };
    } catch (e) { W = { paneles: null, areaN: null, esperadaN: null, adyacencias: null, error: String(e.message).replace(/^buildFoldTopology: /, '').slice(0, 90) }; }
    filas.push({ troquel: path.basename(f).replace('.dieline.json', ''), escala: s, legacyPaneles: L.e8_conectividad.conservados, legacyAreaN: +(L.areaTotal / (s * s)).toFixed(3), legacyAvisos: L.e10_validacion.problemas, webPaneles: W.paneles, webAreaN: W.areaN == null ? null : +W.areaN.toFixed(3), webEsperadaN: W.esperadaN == null ? null : +W.esperadaN.toFixed(3), webAdy: W.adyacencias, webError: W.error });
  }
}
console.log(`tesseract-web HEAD ${head} (empaquetado en ${path.relative(ROOT, OUT)})`);
console.table(filas);
if (salida) { fs.mkdirSync(path.dirname(salida), { recursive: true }); fs.writeFileSync(salida, JSON.stringify({ tesseractWebHead: head, filas }, null, 1) + '\n'); console.log('→ ' + salida); }
