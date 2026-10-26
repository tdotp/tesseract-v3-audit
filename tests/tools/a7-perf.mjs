#!/usr/bin/env node
// A7 — Comparación de rendimiento: bundle de REFERENCIA (src/ de un commit, por defecto 2939dbc = A6 validada en CEP real) frente al bundle ACTUAL (src/),
// en la MISMA sesión de Chrome headless, con corridas INTERCALADAS (ref, act, ref, act…) sobre la Caja Botánica real. Informativo (docs/fase1/A7_PROPUESTA.md §9.3).
//   node tests/tools/a7-perf.mjs [--ref 2939dbc] [--runs 5] [--out docs/fase1/a7/rendimiento-X.json]
// Umbral aprobado (D-A7-13): > +10 % en la mediana de una métrica ⇒ investigar; > +25 % ⇒ detener la intervención. Chrome 155/M1 Max = piso optimista, no CEP.
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { execFileSync } from 'node:child_process';
import { ROOT } from '../lib/fixtures.mjs'; import { serveDir, launchChrome } from '../browser/cdp.mjs'; import { build } from '../../tools/build/build.mjs';
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const REF = arg('ref', '2939dbc'), RUNS = +arg('runs', 5), OUTF = arg('out', null);
const FIXTURE = path.join(ROOT, 'tests/fixtures/real/caja-botanica-real.dieline.json');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tess-a7perf-'));
try {
  execFileSync('/bin/sh', ['-c', `git -C "${ROOT}" archive ${REF} src | tar -x -C "${dir}"`]);
  await build({ entry: path.join(dir, 'src/main.js'), out: path.join(dir, '_ref') }); await build({ out: path.join(dir, '_act') });
  for (const t of ['ref', 'act']) execFileSync('python3', [ROOT + '/tools/baseline/setup_harness.py', path.join(dir, '_' + t), FIXTURE, path.join(dir, t)], { stdio: 'pipe' });
  for (const f of ['measure_ui.js']) fs.copyFileSync(path.join(ROOT, 'tools/baseline', f), path.join(dir, f));
  const srv = await serveDir(dir); const br = await launchChrome(); const res = { ref: [], act: [] };
  try {
    for (let i = 0; i < RUNS; i++) for (const t of (i % 2 ? ['act', 'ref'] : ['ref', 'act'])) {
      await br.goto(`${srv.url}/${t}/index.html`); await br.eval(`new Promise(r=>setTimeout(r,200))`); await br.eval(fs.readFileSync(path.join(dir, 'measure_ui.js'), 'utf8'));
      await br.eval(`(() => { const o = window.__adobe_cep__.evalScript; window.__adobe_cep__.evalScript = (s, cb) => (s.indexOf('saveDialog') > -1 ? setTimeout(() => cb(''), 0) : o(s, cb)); })()`);
      const m = await br.eval(`tesseractBaseline({ skipGlb: true, sliderTicks: 20, orbitMs: 1500, idleMs: 1500 })`);
      // Medidas propias con suma de muchas repeticiones (performance.now() tiene 0.1 ms de resolución y un tick dura ≈0.6 ms)
      const q = await br.eval(`(async () => { const sleep = (ms) => new Promise((r) => setTimeout(r, ms)); const $ = (id) => document.getElementById(id); const fire = (el, t) => el.dispatchEvent(new Event(t, { bubbles: true }));
        const sl = document.querySelector('#fold-panel details.all-creases input[type=range]'); let t0 = performance.now(); for (let i = 0; i < 300; i++) { sl.value = String((i * 7) % 181 - 90); fire(sl, 'input'); } const fold = (performance.now() - t0) / 300;
        sl.value = '0'; fire(sl, 'input'); const th = $('thickness-input'); t0 = performance.now(); for (let i = 0; i < 20; i++) { th.value = i % 2 ? '0.25' : '0.3'; $('apply-thickness-btn').click(); } const rebuild = (performance.now() - t0) / 20;
        sl.value = '60'; fire(sl, 'input'); const glb = []; for (let i = 0; i < 5; i++) { $('status-area').textContent = ''; const s0 = performance.now(); $('export-glb-btn').click(); while (!/GLB exported from current 3D pose|failed/.test($('status-area').textContent)) await sleep(1); glb.push(performance.now() - s0); }
        glb.sort((a, b) => a - b); return { fold, rebuild, glb: glb[2] }; })()`);
      if (br.errors.length) throw new Error('errores JS: ' + br.errors.join(' | '));
      res[t].push({ construir_ms: m.continuar_a_3d_sincrono_ms, reconstruir_ms: q.rebuild, plegado_tick_ms: q.fold, glb_export_ms: q.glb, fps_reposo: m.fps_reposo.fps, fps_orbita: m.fps_orbita.fps, crec100: m.crecimiento_por_100_ticks });
    }
  } finally { await br.close(); await srv.close(); }
  const med = (a) => { const s = [...a].sort((x, y) => x - y); return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2; };
  const keys = ['construir_ms', 'reconstruir_ms', 'plegado_tick_ms', 'glb_export_ms', 'fps_reposo', 'fps_orbita'];
  const resumen = Object.fromEntries(keys.map((k) => { const r = med(res.ref.map((x) => x[k])), a = med(res.act.map((x) => x[k])); const peor = r === 0 ? 0 : (/fps/.test(k) ? (r - a) / r : (a - r) / r); // fps: menos es peor
    return [k, { ref: +r.toFixed(3), act: +a.toFixed(3), degradacion_pct: +(peor * 100).toFixed(1), veredicto: peor > 0.25 ? 'DETENER (> 25 %)' : peor > 0.10 ? 'INVESTIGAR (> 10 %)' : 'OK' }]; }));
  const out = { fecha: new Date().toISOString(), referencia: REF, actual: 'src/ (árbol de trabajo)', corridas_por_bundle: RUNS, entorno: 'Chrome headless (cdp.mjs), Caja Botánica real; piso optimista, no CEP', resumen, crudo: res };
  if (OUTF) fs.writeFileSync(path.resolve(ROOT, OUTF), JSON.stringify(out, null, 1) + '\n');
  console.log(JSON.stringify(resumen, null, 1)); if (Object.values(resumen).some((v) => v.veredicto !== 'OK')) process.exitCode = 1;
} finally { fs.rmSync(dir, { recursive: true, force: true }); }
