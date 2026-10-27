#!/usr/bin/env node
// A9 — Comparación de rendimiento (copia de a8-perf con las métricas de interfaz de A9): bundle de REFERENCIA (src/ de un commit, por defecto 3ea0d8a = A8 validada en CEP real) frente al
// bundle ACTUAL (src/), en la MISMA sesión de Chrome headless, con corridas INTERCALADAS (ref, act, act, ref…) sobre la Caja Botánica real (docs/fase1/A9_PROPUESTA.md §8.3, D-A9-14).
//   node tests/tools/a9-perf.mjs [--ref 3ea0d8a] [--runs 10] [--out docs/fase1/a9/rendimiento-X.json]
// Métricas de A8 + latencia deslizador → fotograma (media de 40; CUANTIZADA por requestAnimationFrame), cambio de base por select (setBasePanel → buildFoldUI; media de 20),
// extraer → validar → 2D (mediana de 9) y clic → estado con Shift/Alt (duración síncrona del mouseup; media de 10 de cada uno).
// Umbral aprobado (D-A9-14): > +10 % en la mediana de una métrica ⇒ investigar (repetir con 20 corridas); > +25 % ⇒ detener. Chrome 155/M1 Max = piso optimista, no CEP.
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { execFileSync } from 'node:child_process';
import { ROOT } from '../lib/fixtures.mjs'; import { serveDir, launchChrome } from '../browser/cdp.mjs'; import { build } from '../../tools/build/build.mjs';
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const REF = arg('ref', '3ea0d8a'), RUNS = +arg('runs', 10), OUTF = arg('out', null);
const FIXTURE = path.join(ROOT, 'tests/fixtures/real/caja-botanica-real.dieline.json');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tess-a9perf-'));
try {
  execFileSync('/bin/sh', ['-c', `git -C "${ROOT}" archive ${REF} src | tar -x -C "${dir}"`]);
  await build({ entry: path.join(dir, 'src/main.js'), out: path.join(dir, '_ref') }); await build({ out: path.join(dir, '_act') });
  for (const t of ['ref', 'act']) execFileSync('python3', [ROOT + '/tools/baseline/setup_harness.py', path.join(dir, '_' + t), FIXTURE, path.join(dir, t)], { stdio: 'pipe' });
  for (const f of ['measure_ui.js', 'harness_art.js']) fs.copyFileSync(path.join(ROOT, 'tools/baseline', f), path.join(dir, f));
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
        sl.value = '60'; fire(sl, 'input'); const glb = []; for (let i = 0; i < 9; i++) { await sleep(20); $('status-area').textContent = ''; const done = new Promise((res) => { const mo = new MutationObserver(() => { if (/GLB exported from current 3D pose|failed/.test($('status-area').textContent)) { const t = performance.now(); mo.disconnect(); res(t); } }); mo.observe($('status-area'), { childList: true, characterData: true, subtree: true }); }); const s0 = performance.now(); $('export-glb-btn').click(); glb.push((await done) - s0); } // A7.3: MutationObserver en vez de sondeo con setTimeout (que Chrome sube a ~4 ms anidado)
        glb.sort((a, b) => a - b); return { fold, rebuild, glb: glb[4] }; })()`);
      // A9: métricas de interfaz (mismo método: tiempos de pared sobre muchas repeticiones; performance.now() tiene 0.1 ms de resolución)
      const qi = await br.eval(`(async () => { const sleep = (ms) => new Promise((r) => setTimeout(r, ms)); const raf = () => new Promise((r) => requestAnimationFrame(r)); const $ = (id) => document.getElementById(id); const fire = (el, t) => el.dispatchEvent(new Event(t, { bubbles: true }));
        const sl = document.querySelector('#fold-panel details.all-creases input[type=range]'); const lat = []; for (let i = 0; i < 40; i++) { await raf(); const t0 = performance.now(); sl.value = String((i * 13) % 181 - 90); fire(sl, 'input'); await raf(); lat.push(performance.now() - t0); }
        sl.value = '0'; fire(sl, 'input'); let t0 = performance.now(); for (let i = 0; i < 20; i++) { const sel = document.querySelector('#fold-panel select'); sel.value = String(i % sel.options.length); fire(sel, 'change'); } const baseSel = (performance.now() - t0) / 20;
        const D = __dbg; const ov = $('three-overlay'); const proj = (v) => { const p = v.clone().project(D.camera); const r = $('preview-3d').getBoundingClientRect(); return { x: r.left + (p.x + 1) / 2 * r.width, y: r.top + (1 - p.y) / 2 * r.height }; };
        const meshes = () => { const a = []; D.scene.traverse((o) => { if (o.isMesh && o.userData && o.userData.panelIndex !== undefined && o.geometry && o.geometry.type === 'ExtrudeGeometry') a.push(o); }); return a; };
        const ev = (t, p, o) => ov.dispatchEvent(new MouseEvent(t, Object.assign({ bubbles: true, cancelable: true, clientX: p.x, clientY: p.y, button: 0, buttons: 1 }, o)));
        const timedClick = (p, o) => { ev('mousedown', p, o); const s0 = performance.now(); ev('mouseup', p, o); return performance.now() - s0; };
        let shift = 0, alt = 0; for (let i = 0; i < 10; i++) { D.scene.updateMatrixWorld(true); const cand = meshes().filter((m) => m.userData.panelIndex !== D.baseIndex); const m = cand[i % cand.length]; m.geometry.computeBoundingBox(); const c = m.geometry.boundingBox.getCenter(new THREE.Vector3()); c.z = m.geometry.boundingBox.max.z; m.localToWorld(c); shift += timedClick(proj(c), { shiftKey: true }); await raf(); }
        for (let i = 0; i < 10; i++) { D.scene.updateMatrixWorld(true); const cv = D.creaseVisuals[i % D.creaseVisuals.length]; const g = cv.visible.geometry.attributes.position; const a = new THREE.Vector3(g.getX(0), g.getY(0), g.getZ(0)), b = new THREE.Vector3(g.getX(1), g.getY(1), g.getZ(1)); cv.visible.localToWorld(a); cv.visible.localToWorld(b); alt += timedClick(proj(a.add(b).multiplyScalar(0.5)), { altKey: true }); await raf(); }
        const ex = []; for (let i = 0; i < 9; i++) { await sleep(20); $('status-area').textContent = ''; const done = new Promise((res) => { const mo = new MutationObserver(() => { if (/Extraction complete|Error|error/.test($('status-area').textContent)) { const t = performance.now(); mo.disconnect(); res(t); } }); mo.observe($('status-area'), { childList: true, characterData: true, subtree: true }); }); const s0 = performance.now(); $('extract-btn').click(); ex.push((await done) - s0); }
        ex.sort((a, b) => a - b); return { latencia: lat.reduce((a, b) => a + b, 0) / lat.length, baseSel, shift: shift / 10, alt: alt / 10, extraer: ex[4] }; })()`);
      // A8: exportación CON ARTE (re-codifica dos PNG de 4096 px: KI-13); mediana de 5 exportaciones, mismo método
      const qa = await br.eval(`(async () => { const sleep = (ms) => new Promise((r) => setTimeout(r, ms)); const $ = (id) => document.getElementById(id); ${fs.readFileSync(path.join(ROOT, 'tools/baseline/harness_art.js'), 'utf8')}
        await window.harnessLoadArt(); await sleep(300); const glb = []; for (let i = 0; i < 5; i++) { await sleep(20); $('status-area').textContent = ''; const done = new Promise((res) => { const mo = new MutationObserver(() => { if (/GLB exported from current 3D pose|failed/.test($('status-area').textContent)) { const t = performance.now(); mo.disconnect(); res(t); } }); mo.observe($('status-area'), { childList: true, characterData: true, subtree: true }); }); const s0 = performance.now(); $('export-glb-btn').click(); glb.push((await done) - s0); }
        glb.sort((a, b) => a - b); return { glbArte: glb[2] }; })()`, 300000);
      if (br.errors.length) throw new Error('errores JS: ' + br.errors.join(' | '));
      res[t].push({ construir_ms: m.continuar_a_3d_sincrono_ms, reconstruir_ms: q.rebuild, plegado_tick_ms: q.fold, glb_export_ms: q.glb, glb_export_arte_ms: qa.glbArte, deslizador_fotograma_ms: qi.latencia, base_select_ms: qi.baseSel, clic_shift_ms: qi.shift, clic_alt_ms: qi.alt, extraer_validar_2d_ms: qi.extraer, fps_reposo: m.fps_reposo.fps, fps_orbita: m.fps_orbita.fps, crec100: m.crecimiento_por_100_ticks });
    }
  } finally { await br.close(); await srv.close(); }
  const med = (a) => { const s = [...a].sort((x, y) => x - y); return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2; };
  const keys = ['construir_ms', 'reconstruir_ms', 'plegado_tick_ms', 'glb_export_ms', 'glb_export_arte_ms', 'deslizador_fotograma_ms', 'base_select_ms', 'clic_shift_ms', 'clic_alt_ms', 'extraer_validar_2d_ms', 'fps_reposo', 'fps_orbita'];
  const resumen = Object.fromEntries(keys.map((k) => { const r = med(res.ref.map((x) => x[k])), a = med(res.act.map((x) => x[k])); const peor = r === 0 ? 0 : (/fps/.test(k) ? (r - a) / r : (a - r) / r); // fps: menos es peor
    return [k, { ref: +r.toFixed(3), act: +a.toFixed(3), degradacion_pct: +(peor * 100).toFixed(1), veredicto: peor > 0.25 ? 'DETENER (> 25 %)' : peor > 0.10 ? 'INVESTIGAR (> 10 %)' : 'OK' }]; }));
  const out = { fecha: new Date().toISOString(), referencia: REF, actual: 'src/ (árbol de trabajo)', corridas_por_bundle: RUNS, entorno: 'Chrome headless (cdp.mjs), Caja Botánica real; piso optimista, no CEP', resumen, crudo: res };
  if (OUTF) fs.writeFileSync(path.resolve(ROOT, OUTF), JSON.stringify(out, null, 1) + '\n');
  console.log(JSON.stringify(resumen, null, 1)); if (Object.values(resumen).some((v) => v.veredicto !== 'OK')) process.exitCode = 1;
} finally { fs.rmSync(dir, { recursive: true, force: true }); }
