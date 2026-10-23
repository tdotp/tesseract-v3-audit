// Prepara arneses de navegador (copias EDITABLES e instrumentadas en un directorio temporal) y ayudantes para manejarlos.
// Nunca toca reference/ ni panel/: setup_harness.py solo copia.
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { execFileSync } from 'node:child_process';
import { ROOT } from '../lib/fixtures.mjs'; import { serveDir, launchChrome } from './cdp.mjs';

export const FIXTURE_FILES = { caja: 'tests/fixtures/real/caja-botanica-real.dieline.json', ill: 'tests/fixtures/real/caja-botanica-illustrator-export.dieline.json' };
export async function prepare({ gpu = 'default' } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tess-harness-')); const dirs = {};
  for (const [fx, file] of Object.entries(FIXTURE_FILES)) for (const [t, src] of [['base', 'reference/legacy-baseline'], ['fix', process.env.TESS_PANEL_DIR || 'panel']]) { // TESS_PANEL_DIR: solo controles negativos
    const dest = path.join(dir, `${t}-${fx}`); execFileSync('python3', [ROOT + '/tools/baseline/setup_harness.py', path.resolve(ROOT, src), path.join(ROOT, file), dest], { stdio: 'pipe' }); dirs[`${t}-${fx}`] = dest;
  }
  for (const f of ['harness_art.js', 'measure_ui.js', 'leak_cycles.js']) fs.copyFileSync(path.join(ROOT, 'tools/baseline', f), path.join(dir, f));
  fs.copyFileSync(path.join(ROOT, 'tools/baseline/regression/compare_frames.js'), path.join(dir, 'compare_frames.js'));
  for (const fx of Object.keys(FIXTURE_FILES)) fs.writeFileSync(path.join(dir, `compare-${fx}.html`),
    `<!doctype html><meta charset="utf-8"><style>body{margin:0;display:flex}iframe{width:900px;height:1100px;border:0}</style><iframe id="A" src="base-${fx}/index.html"></iframe><iframe id="B" src="fix-${fx}/index.html"></iframe><script src="compare_frames.js"></script>`);
  const server = await serveDir(dir); const browser = await launchChrome({ gpu });
  return { dir, server, browser, url: server.url,
    async open(name) { await browser.goto(`${server.url}/${name}/index.html`); await browser.eval(`new Promise(r=>setTimeout(r,200))`); },
    async close() { await browser.close(); await server.close(); fs.rmSync(dir, { recursive: true, force: true }); } };
}
export const textOf = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
// Ayudantes dentro de la página
export const PAGE_HELPERS = `(() => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms)); const raf2 = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  const $ = (id) => document.getElementById(id);
  const panelMeshes = () => { const a = []; __dbg.scene.traverse((o) => { if (o.isMesh && o.userData && o.userData.panelIndex !== undefined && o.geometry && o.geometry.type === 'ExtrudeGeometry') a.push(o); }); return a.sort((x, y) => x.userData.panelIndex - y.userData.panelIndex); };
  const fire = (el, t) => el.dispatchEvent(new Event(t, { bubbles: true }));
  const build = async () => { $('extract-btn').click(); await sleep(250); $('continue-3d-btn').click(); await sleep(700); await raf2(); };
  const setAll = async (deg) => { const s = document.querySelector('#fold-panel details.all-creases input[type=range]'); s.value = String(deg); fire(s, 'input'); await sleep(80); await raf2(); };
  window.T = { sleep, raf2, $, panelMeshes, fire, build, setAll };
})()`;
