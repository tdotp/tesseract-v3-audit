// Métricas base del motor geométrico (Node): tiempo de buildPanels por fixture (mediana de N ejecuciones) y contadores deterministas.
// Informativo: los tiempos dependen de la máquina; los contadores (segmentos, iteraciones) no.
// Uso: node tests/tools/collect-metrics.mjs [--update]   (--update escribe tests/golden/metrics.base.json fusionando las métricas de navegador de tests/results/latest)
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { performance } from 'node:perf_hooks';
import { FIXTURES, ROOT, clone } from '../lib/fixtures.mjs'; import { TARGETS, loadGeometry, sha256 } from '../lib/legacy.mjs'; import { analyze } from '../lib/analyze.mjs';
const med = (a) => [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)];
const out = { fecha: new Date().toISOString(), entorno: { node: process.version, so: `${os.type()} ${os.release()}`, cpu: os.cpus()[0].model, nucleos: os.cpus().length }, geometria: {} };
for (const [target, file] of Object.entries(TARGETS)) {
  const L = loadGeometry(file); out.geometria[target] = { sha256_main_js: sha256(file).slice(0, 16), fixtures: {} };
  for (const [id, f] of Object.entries(FIXTURES)) {
    const d = f.build(); const reps = id.includes('8x8') || id.includes('densa') ? 5 : 15; const t = [];
    for (let i = 0; i < reps; i++) { L.api.resetLogs(); const c = clone(d); const t0 = performance.now(); L.api.buildPanels(c); t.push(performance.now() - t0); }
    const a = analyze(L, d); out.geometria[target].fixtures[id] = { buildPanels_ms_mediana: +med(t).toFixed(3), repeticiones: reps, paneles: a.nPanels, segmentos_entrada: a.topology.inputSegments, segmentos_tras_division: a.topology.splitSegments, reinicios_de_barrido: a.topology.iterations };
  }
}
fs.mkdirSync(ROOT + '/tests/results/latest', { recursive: true }); fs.writeFileSync(ROOT + '/tests/results/latest/metricas-geometria.json', JSON.stringify(out, null, 1));
if (process.argv.includes('--update')) {
  const br = {}; for (const t of ['baseline', 'panel', 'bundle']) { const f = `${ROOT}/tests/results/latest/metricas-${t}.json`; if (fs.existsSync(f)) br[t] = JSON.parse(fs.readFileSync(f, 'utf8')); }
  const slim = (m) => m && ({ entorno: m.entorno, extraccion_simulada_ms: m.extraccion_ms, continuar_a_3d_sincrono_ms: m.continuar_a_3d_sincrono_ms, fps_reposo: m.fps_reposo, fps_orbita: m.fps_orbita, plegado_por_tick: m.plegado, crecimiento_por_100_ticks: m.crecimiento_por_100_ticks, glb_export_ms_sin_arte: m.glb_export_ms });
  fs.writeFileSync(ROOT + '/tests/golden/metrics.base.json', JSON.stringify({ _nota: 'Métricas base INFORMATIVAS (A2; ampliadas en A3 con el bundle). Chrome headless real con GPU, puente CEP simulado: NO es CEP/Illustrator. Los tiempos son un piso optimista; los contadores y proporciones sí son comparables.', ...out, navegador: { baseline: slim(br.baseline), panel: slim(br.panel), bundle: slim(br.bundle) } }, null, 1));
  console.log('tests/golden/metrics.base.json escrito');
}
console.log(Object.entries(out.geometria.baseline.fixtures).map(([k, v]) => `${k.padEnd(30)} ${String(v.buildPanels_ms_mediana).padStart(9)} ms  seg=${v.segmentos_entrada} reinicios=${v.reinicios_de_barrido}`).join('\n'));
