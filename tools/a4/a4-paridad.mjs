#!/usr/bin/env node
// A4 — pruebas funcionales de paridad (P-0…P-9) DENTRO del panel V3 real, conducido por DevTools (127.0.0.1:8088). No modifica el panel ni sus archivos.
//   node tools/a4/a4-paridad.mjs caja   [--tag=N0-A]   documento desechable con la Caja Botánica abierto (a4-open N0-A): P-0,1,2,3,4,5,6,8,9
//   node tools/a4/a4-paridad.mjs arte   [--tag=N0-B]   documento desechable con arte Front/Back (a4-open N0-B): P-1,2,7
// Solo en la página: (1) se sustituye window.__adobe_cep__.evalScript SOLO para el diálogo «Guardar GLB» (devuelve una ruta en /private/tmp/tesseract_a4/) y (2) se envuelve cep.fs.writeFile para
// registrar lo guardado; ambos se restauran al terminar. Salida: tests/results/a4/paridad-<perfil>-<fecha>.json
import fs from 'node:fs'; import path from 'node:path'; import crypto from 'node:crypto'; import { fileURLToPath } from 'node:url'; import { pathToFileURL } from 'node:url';
import { listTargets, pickTarget, connect } from './cdp-run.mjs';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..'); const GLB_DIR = '/private/tmp/tesseract_a4';

export const PAGE = `(async (profile) => {
  const $ = (id) => document.getElementById(id), sleep = (ms) => new Promise((r) => setTimeout(r, ms)), raf = () => new Promise((r) => requestAnimationFrame(r));
  const status = () => $('status-area').textContent; const R = { profile, pasos: {} };
  const waitFor = async (fn, ms, label) => { const t0 = performance.now(); while (performance.now() - t0 < ms) { const v = fn(); if (v) return v; await sleep(40); } throw new Error('tiempo agotado esperando: ' + label + ' (estado: ' + status() + ')'); };
  const fire = (el, t) => el.dispatchEvent(new Event(t, { bubbles: true })); const lines = (re) => $('log-area').textContent.split('\\n').filter((l) => re.test(l));
  const canvasHash = async () => { const c = $('preview-3d'); const u = c.toDataURL('image/png'); const b = new TextEncoder().encode(u); const h = await crypto.subtle.digest('SHA-256', b); return [...new Uint8Array(h)].map((x) => x.toString(16).padStart(2, '0')).join('').slice(0, 16); };
  const sha = async (b64) => { const bin = atob(b64); const u8 = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i); const h = await crypto.subtle.digest('SHA-256', u8); return { bytes: u8.length, sha256: [...new Uint8Array(h)].map((x) => x.toString(16).padStart(2, '0')).join('') }; };
  const step = async (id, fn) => { try { R.pasos[id] = await fn(); } catch (e) { R.pasos[id] = { error: String(e.message || e) }; } };
  if ($('three-view').style.display !== 'none') { $('back-btn').click(); await sleep(300); }

  if (profile === 'caja') await step('P-0 test de conexión', async () => { $('test-btn').click(); await waitFor(() => status() !== 'Testing...' && status() !== 'Ready', 20000, 'Test Connection'); return { status: status() }; });
  await step('P-1 extracción y validación', async () => { $('extract-btn').click(); await waitFor(() => /Extraction complete|Error|error/.test(status()), 60000, 'extracción'); const out = $('output-json').value;
    return { status: status(), validacion: $('validation-status').textContent, avisos: [...$('problems-list').querySelectorAll('li')].map((l) => l.textContent), continuarHabilitado: !$('continue-3d-btn').disabled, jsonBytes: out.length, jsonSha256: out ? await sha(btoa(unescape(encodeURIComponent(out)))).then((x) => x.sha256) : null, json: out }; });
  await step('P-2 paso a 3D', async () => { const t0 = performance.now(); $('continue-3d-btn').click(); await waitFor(() => /3D ready|3D error|Error/.test(status()), 120000, '3D'); await sleep(400);
    return { status: status(), ms: +(performance.now() - t0).toFixed(0), logPaneles: lines(/Panels after shell filter|Faces traced|Connectivity filter|3D model ready/), paneles3D: (lines(/Panels after shell filter/).pop() || '').replace(/\\D+/g, '') }; });
  if (profile === 'caja') {
    const fold = () => $('fold-panel'); const sel = () => fold().querySelector('select');
    await step('P-3 base', async () => { const s = sel(); const orig = s.value; const opts = [...s.options].map((o) => o.value); const other = opts.find((v) => v !== orig); s.value = other; fire(s, 'change'); await sleep(200); const st1 = status(); const s2 = sel(); s2.value = orig; fire(s2, 'change'); await sleep(200); return { baseInicial: orig, opciones: opts.length, cambiadaA: other, statusTrasCambio: st1, statusTrasVolver: status(), baseFinal: sel().value }; });
    await step('P-4 plegado', async () => { const sliders = fold().querySelectorAll('input[type=range]'); const sel0 = sliders[0]; const all = fold().querySelector('details.all-creases input[type=range]'); const h0 = await canvasHash();
      for (let a = 0; a <= 60; a += 10) { sel0.value = String(a); fire(sel0, 'input'); await raf(); } await sleep(150); const hSel = await canvasHash(); sel0.value = '0'; fire(sel0, 'input'); await sleep(150);
      all.value = '60'; fire(all, 'input'); await sleep(250); const hAll = await canvasHash(); const reset = [...fold().querySelectorAll('button')].find((b) => /Reset Flat/.test(b.textContent)); reset.click(); await sleep(250); const hFlat = await canvasHash();
      return { sliders: sliders.length, hashPlano: h0, hashCreaseSeleccionada60: hSel, hashTodas60: hAll, hashTrasReset: hFlat, plegadoCambiaLaImagen: hSel !== h0 && hAll !== h0, resetVuelveAlPlano: hFlat === h0 }; });
    await step('P-5 espesor', async () => { const th = $('thickness-input'); const out = {}; for (const v of ['0.5', '0.25', '0.05', '25', 'abc', '']) { th.value = v; $('apply-thickness-btn').click(); await sleep(250); out[v === '' ? '(vacío)' : v] = { status: status(), valorTrasAplicar: th.value }; } th.value = '0.25'; $('apply-thickness-btn').click(); await sleep(250); out.final = status(); return out; });
    await step('P-6 presets de material', async () => { const mp = $('material-preset'); const out = {}; for (const v of ['kraft', 'gray', 'white']) { mp.value = v; fire(mp, 'change'); await sleep(250); out[v] = { pill: $('material-pill').textContent, status: status() }; } return out; });
    await step('P-8 exportar GLB (diálogo sustituido por ruta en /private/tmp/tesseract_a4/)', async () => {
      const prevEval = window.__adobe_cep__.evalScript, prevWrite = window.cep.fs.writeFile; const saved = []; let n = 0;
      window.__adobe_cep__.evalScript = (s, cb) => (s.indexOf('saveDialog') > -1 ? setTimeout(() => cb('${GLB_DIR}/pose' + (++n) + '.glb'), 0) : prevEval.call(window.__adobe_cep__, s, cb));
      window.cep.fs.writeFile = function (p, b64, enc) { const r = prevWrite.apply(this, arguments); saved.push({ p, b64len: b64.length, err: r && r.err, b64 }); return r; };
      try { const poses = {};
        for (const [name, setup] of [['plano', async () => { const reset = [...fold().querySelectorAll('button')].find((b) => /Reset Flat/.test(b.textContent)); reset.click(); await sleep(250); }], ['todas60', async () => { const all = fold().querySelector('details.all-creases input[type=range]'); all.value = '60'; fire(all, 'input'); await sleep(300); }]]) {
          await setup(); const before = saved.length; $('export-glb-btn').click(); await waitFor(() => saved.length > before, 60000, 'GLB ' + name); await sleep(200); const s = saved[saved.length - 1]; poses[name] = { ruta: s.p, err: s.err, ...(await sha(s.b64)), status: status() }; }
        return poses; } finally { window.__adobe_cep__.evalScript = prevEval; window.cep.fs.writeFile = prevWrite; } });
    await step('estado final del panel', async () => ({ status: status(), vista3D: $('three-view').style.display !== 'none' }));
  } else {
    await step('P-7b exportar GLB con arte', async () => {
      const prevEval = window.__adobe_cep__.evalScript, prevWrite = window.cep.fs.writeFile; const saved = [];
      window.__adobe_cep__.evalScript = (s, cb) => (s.indexOf('saveDialog') > -1 ? setTimeout(() => cb('${GLB_DIR}/arte.glb'), 0) : prevEval.call(window.__adobe_cep__, s, cb));
      window.cep.fs.writeFile = function (p, b64, enc) { const r = prevWrite.apply(this, arguments); saved.push({ p, err: r && r.err, b64 }); return r; };
      try { $('export-glb-btn').click(); await waitFor(() => saved.length > 0, 120000, 'GLB con arte'); await sleep(200); return { ruta: saved[0].p, err: saved[0].err, ...(await sha(saved[0].b64)), status: status() }; } finally { window.__adobe_cep__.evalScript = prevEval; window.cep.fs.writeFile = prevWrite; } });
    await step('P-7 arte Front/Back', async () => { $('tab-btn-artwork').click(); await sleep(150); const t0 = performance.now(); const before = { pill: $('art-source-pill').textContent, st: $('art-status').textContent }; $('refresh-art-btn').click();
      await waitFor(() => $('art-source-pill').textContent !== before.pill || $('art-status').textContent !== before.st, 120000, 'arte'); await sleep(1500);
      return { antes: before, pill: $('art-source-pill').textContent, artStatus: $('art-status').textContent, status: status(), ms: +(performance.now() - t0).toFixed(0), logArte: lines(/art|Art|PNG|overlay/i).slice(-12) }; });
  }
  R.consolaPanel = { errores: (window.__a4err || []).length };
  return R; })`;

export function parseP(argv) { const o = { profile: argv[0], port: 8088, tag: null, urlMatch: 'tesseract-v3', out: path.join(ROOT, 'tests/results/a4') }; for (const a of argv.slice(1)) { const [k, v] = a.replace(/^--/, '').split('='); if (k === 'tag') o.tag = v; else if (k === 'port') o.port = +v; else if (k === 'out') o.out = path.resolve(v); else throw new Error('opción desconocida: ' + a); } if (!['caja', 'arte'].includes(o.profile)) throw new Error('uso: a4-paridad.mjs caja|arte [--tag=N0-A]'); return o; }
export async function main(argv) {
  const o = parseP(argv); fs.mkdirSync(GLB_DIR, { recursive: true }); fs.mkdirSync(o.out, { recursive: true });
  const target = pickTarget(await listTargets(o.port), o.urlMatch); const c = await connect(target);
  try {
    const res = await c.eval(`${PAGE}(${JSON.stringify(o.profile)})`, 900000);
    const ev = c.events.map((e) => e.method === 'Runtime.consoleAPICalled' ? { tipo: e.params.type, texto: e.params.args.map((a) => a.value ?? a.description).join(' ') } : e.method === 'Runtime.exceptionThrown' ? { tipo: 'excepcion', texto: e.params.exceptionDetails.exception?.description || e.params.exceptionDetails.text } : e.method === 'Log.entryAdded' ? { tipo: 'log-' + e.params.entry.level, texto: e.params.entry.text + (e.params.entry.url ? ' @' + e.params.entry.url : '') } : null).filter(Boolean);
    res.consola = { eventos: ev.length, errores: ev.filter((e) => ['error', 'excepcion', 'log-error', 'assert'].includes(e.tipo)), avisos: ev.filter((e) => ['warning', 'log-warning'].includes(e.tipo)) };
    const withFile = [...Object.values(res.pasos['P-8 exportar GLB (diálogo sustituido por ruta en /private/tmp/tesseract_a4/)'] || {}), res.pasos['P-7b exportar GLB con arte']]; for (const p of withFile) if (p && p.ruta && fs.existsSync(p.ruta)) { const b = fs.readFileSync(p.ruta); p.archivo = { bytes: b.length, sha256: crypto.createHash('sha256').update(b).digest('hex') }; }
    const p1 = res.pasos['P-1 extracción y validación']; if (p1 && p1.json) { try { fs.writeFileSync(path.join(o.out, `extraccion-panel-${o.profile}.json`), p1.json); } catch {} delete p1.json; }
    const f = path.join(o.out, `paridad-${o.profile}-${new Date().toISOString().replace(/[:.]/g, '-')}.json`); fs.writeFileSync(f, JSON.stringify({ fecha: new Date().toISOString(), tag: o.tag, ...res }, null, 1));
    for (const [k, v] of Object.entries(res.pasos)) console.log((v.error ? 'FALLA ' : 'ok    ') + k + (v.error ? ' → ' + v.error : '')); console.log(`consola: ${res.consola.eventos} eventos, ${res.consola.errores.length} errores, ${res.consola.avisos.length} avisos →`, f); return res;
  } finally { await c.close(); } }
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main(process.argv.slice(2)).catch((e) => { console.error('ERROR:', e.message); process.exit(1); });
