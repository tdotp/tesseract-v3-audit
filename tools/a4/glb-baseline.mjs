#!/usr/bin/env node
// A4 — referencia para comparar con lo exportado por el panel V3 REAL: ejecuta el MISMO guion de a4-paridad.mjs («caja») en Chrome headless, con el puente CEP simulado del arnés,
// sobre el baseline congelado, panel/ y el bundle, usando la extracción real de Illustrator (tests/fixtures/illustrator-real/ill-real-caja-botanica.dieline.json). Solo copias temporales.
//   node tools/a4/glb-baseline.mjs [--out=dir]   →  tests/results/a4/glb-referencia.json  {baseline|panel|bundle: {plano, todas60}}
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { execFileSync } from 'node:child_process'; import { fileURLToPath, pathToFileURL } from 'node:url';
import { serveDir, launchChrome } from '../../tests/browser/cdp.mjs'; import { build } from '../build/build.mjs'; import { PAGE } from './a4-paridad.mjs';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..'); const FIX = path.join(ROOT, 'tests/fixtures/illustrator-real/ill-real-caja-botanica.dieline.json');
export async function main(argv = []) {
  const out = argv.find((a) => a.startsWith('--out='))?.slice(6) || path.join(ROOT, 'tests/results/a4'); fs.mkdirSync(out, { recursive: true });
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tess-a4ref-')); const distSrc = path.join(dir, '_dist'); await build({ src: path.join(ROOT, 'panel'), out: distSrc });
  const dirs = {}; for (const [name, src] of [['baseline', path.join(ROOT, 'reference/legacy-baseline')], ['panel', path.join(ROOT, 'panel')], ['bundle', distSrc]]) { const d = path.join(dir, name); execFileSync('python3', [ROOT + '/tools/baseline/setup_harness.py', src, FIX, d], { stdio: 'pipe' }); dirs[name] = d; }
  const server = await serveDir(dir); const res = {};
  try { for (const name of Object.keys(dirs)) { const b = await launchChrome(); try {
      await b.addInitScript(`window.cep = { fs: { writeFile: function () { return { err: 0 }; } }, encoding: { Base64: 'Base64' } };`); await b.goto(`${server.url}/${name}/index.html`); await b.eval('new Promise(r=>setTimeout(r,500))');
      const r = await b.eval(`${PAGE}('caja')`, 300000); const glb = r.pasos['P-8 exportar GLB (diálogo sustituido por ruta en /private/tmp/tesseract_a4/)'];
      res[name] = { paneles: r.pasos['P-2 paso a 3D']?.logPaneles, plano: glb.plano && { bytes: glb.plano.bytes, sha256: glb.plano.sha256 }, todas60: glb.todas60 && { bytes: glb.todas60.bytes, sha256: glb.todas60.sha256 }, errores: Object.entries(r.pasos).filter(([, v]) => v.error).map(([k, v]) => k + ': ' + v.error) };
    } finally { await b.close(); } } } finally { await server.close(); fs.rmSync(dir, { recursive: true, force: true }); }
  const f = path.join(out, 'glb-referencia.json'); fs.writeFileSync(f, JSON.stringify({ fecha: new Date().toISOString(), fixture: path.relative(ROOT, FIX), resultados: res }, null, 1)); console.log(JSON.stringify(res, null, 1)); console.log('→', f); return res; }
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main(process.argv.slice(2)).catch((e) => { console.error('ERROR:', e.message); process.exit(1); });
