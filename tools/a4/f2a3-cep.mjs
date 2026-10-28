#!/usr/bin/env node
// F2A-3 · I-7 — Validación del bundle EXPERIMENTAL dentro del panel REAL de Illustrator (CEP 12), conducido por DevTools remoto
// (.debug → 127.0.0.1:8089). Reutiliza la conexión de tools/a4/cdp-run.mjs; nunca toca otro panel (solo la URL con «tesseract-v3-experimental»).
//   node tools/a4/f2a3-cep.mjs identidad                   identidad del panel cargado (id de extensión, host, Chromium, three, main.js = dist-experimental/)
//   node tools/a4/f2a3-cep.mjs caja  [--tag=N0-A]          con el documento desechable de la Caja Botánica abierto (run-nivel0.mjs a4-open N0-A)
//   node tools/a4/f2a3-cep.mjs arte  [--tag=N0-B]          con el documento desechable con arte Front/Back abierto (a4-open N0-B)
//   node tools/a4/f2a3-cep.mjs recarga                     recarga el panel: debe volver a SOMBRA sin errores
// Solo en la página: el diálogo «Save GLB» se sustituye por una ruta en /private/tmp/tesseract_f2a3/ y el <a download> del PNG se captura y se
// guarda con cep.fs.writeFile en la misma carpeta (KI-12); ambos se restauran. Las capturas son del panel real (Page.captureScreenshot).
// Salida: tests/results/f2a3-cep/<perfil>-<fecha>.json, capturas/*.png y consola. No escribe nada más.
import fs from 'node:fs'; import path from 'node:path'; import crypto from 'node:crypto'; import { fileURLToPath, pathToFileURL } from 'node:url';
import { listTargets, pickTarget, connect } from './cdp-run.mjs';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..'); const OUTDIR = '/private/tmp/tesseract_f2a3'; const EXT = 'com.tato.tesseract.v3.experimental.panel';

export const PAGE = `(() => { const OUT = ${JSON.stringify(OUTDIR)};
  const $ = (id) => document.getElementById(id), sleep = (ms) => new Promise((r) => setTimeout(r, ms)), raf2 = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  const status = () => $('status-area').textContent; const C = window.__tessMotorExperimental; const fire = (el, t) => el.dispatchEvent(new Event(t, { bubbles: true }));
  const waitFor = async (fn, ms, label) => { const t0 = performance.now(); while (performance.now() - t0 < ms) { const v = fn(); if (v) return v; await sleep(50); } throw new Error('tiempo agotado: ' + label + ' (estado: ' + status() + ')'); };
  const lines = (re) => $('log-area').textContent.split('\\n').filter((l) => re.test(l));
  const hex = async (u8) => [...new Uint8Array(await crypto.subtle.digest('SHA-256', u8))].map((x) => x.toString(16).padStart(2, '0')).join('');
  const canvasHash = async (id) => (await hex(new TextEncoder().encode($(id).toDataURL('image/png')))).slice(0, 16);
  const tinta = (id) => { const c = $(id); const x = c.getContext('2d'); if (!x) return null; const d = x.getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 3; i < d.length; i += 16) if (d[i] > 0 && (d[i - 1] < 250 || d[i - 2] < 250 || d[i - 3] < 250)) n++; return n; };
  const barra = () => { const b = $('tess-exp-motor'); if (!b) return null; const q = (c) => b.querySelector(c); const vis = (c) => q(c).style.display !== 'none';
    return { modo: q('.tess-exp-modo').textContent, construccion: q('.tess-exp-construccion').textContent, origen: q('.tess-exp-construccion').dataset.origen, mensaje: vis('.tess-exp-mensaje') ? q('.tess-exp-mensaje').textContent : null, tipo: q('.tess-exp-mensaje').dataset.tipo, diag: q('.tess-exp-diag summary').textContent, items: [...q('.tess-exp-diag ul').children].map((li) => li.textContent).slice(0, 12) }; };
  const fold = () => $('fold-panel'); const sel = () => fold() && fold().querySelector('select'); const all = () => fold().querySelector('details.all-creases input[type=range]');
  const plegado = () => ({ foldPanel: !!fold(), deslizadores: fold() ? fold().querySelectorAll('input[type=range]').length : 0, opcionesBase: sel() ? sel().options.length : 0, base: sel() ? sel().value : null });
  const construir = async () => { if ($('three-view').style.display !== 'none') { $('back-btn').click(); await sleep(250); } $('continue-3d-btn').click(); await waitFor(() => /3D ready|3D error|Error/.test(status()), 120000, '3D'); await sleep(500); await raf2(); return { status: status(), barra: barra(), plegado: plegado() }; };
  const base = async (v) => { const s = sel(); s.value = String(v); fire(s, 'change'); await sleep(250); await raf2(); return { status: status(), plegado: plegado(), barra: barra() }; };
  const ALL = async (v) => { const a = all(); a.value = String(v); fire(a, 'input'); await sleep(250); await raf2(); };
  const guardarB64 = (nombre, b64) => { const p = OUT + '/' + nombre; window.cep.fs.makedir && window.cep.fs.makedir(OUT); const r = window.cep.fs.writeFile(p, b64, window.cep.encoding.Base64); return { ruta: p, err: r && r.err }; };
  const glb = async (nombre) => { const prevEval = window.__adobe_cep__.evalScript, prevWrite = window.cep.fs.writeFile; const w = [];
    window.__adobe_cep__.evalScript = (s, cb) => (s.indexOf('saveDialog') > -1 ? setTimeout(() => cb(OUT + '/' + nombre), 0) : prevEval.call(window.__adobe_cep__, s, cb));
    window.cep.fs.writeFile = function (p, b64, enc) { const r = prevWrite.apply(this, arguments); w.push({ p, bytes: Math.floor(b64.length * 3 / 4), err: r && r.err }); return r; };
    try { $('export-glb-btn').click(); await waitFor(() => /GLB saved|GLB export|GLB exported|failed|error/i.test(status()) && w.length, 60000, 'GLB'); await sleep(300); return { status: status(), escrituras: w, log: lines(/GLB/).slice(-3) }; }
    finally { window.__adobe_cep__.evalScript = prevEval; window.cep.fs.writeFile = prevWrite; } };
  const png = async (nombre) => { const orig = HTMLAnchorElement.prototype.click; let url = null; HTMLAnchorElement.prototype.click = function () { if (this.download) { url = this.href; return; } return orig.apply(this, arguments); };
    try { $('export-3d-btn').click(); await sleep(200); } finally { HTMLAnchorElement.prototype.click = orig; }
    if (!url) return { error: 'exportPNG no produjo URL' }; const b64 = url.split(',')[1]; return { botonVisible: getComputedStyle($('export-3d-btn')).display !== 'none', bytes: Math.floor(b64.length * 3 / 4), ...guardarB64(nombre, b64) }; };
  const P = {
    async V0() { if ($('three-view').style.display !== 'none') { $('back-btn').click(); await sleep(300); } return { ext: window.__adobe_cep__.getExtensionId(), host: JSON.parse(window.__adobe_cep__.getHostEnvironment()).appName, ua: navigator.userAgent, modo: C.modo(), barra: barra(), titulo: document.title }; },
    async V1() { $('extract-btn').click(); await waitFor(() => /Extraction complete|Error|error/.test(status()), 60000, 'extracción'); await sleep(300);
      return { status: status(), validacion: $('validation-status').textContent, avisos: [...$('problems-list').querySelectorAll('li')].map((l) => l.textContent), continuar: !$('continue-3d-btn').disabled, jsonBytes: $('output-json').value.length, lienzo2d: { hash: await canvasHash('preview-canvas'), pixelesConTrazo: tinta('preview-canvas') } }; },
    async V2() { const r = await construir(); await sleep(400); r.logPaneles = lines(/Panels after shell filter|Connectivity filter|3D ready/); r.comparacionSombra = C.registro().filter((x) => x.sombra).slice(-3); r.barra = barra(); r.hashPlano = await canvasHash('preview-3d'); return r; },
    async V3() { const out = { antes: C.modo() }; $('tess-exp-motor').querySelector('.tess-exp-activar').click(); await sleep(150); out.confirmacionVisible = $('tess-exp-motor').querySelector('.tess-exp-confirmar').style.display !== 'none'; out.modoTrasPrimerClic = C.modo();
      $('tess-exp-motor').querySelector('.tess-exp-confirmar-si').click(); await sleep(150); out.modo = C.modo(); out.barra = barra(); out.log = lines(/modo ACTIVO/).slice(-1); return out; },
    async V4() { const r = await construir(); r.log = lines(/modo ACTIVO|=== buildPanels \\(experimental|Adjacency edges|Fold tree edges|Base reiniciada/); r.hashPlano = await canvasHash('preview-3d'); return r; },
    async V5() { const out = { bases: {} }; for (const b of [12, 5, 0]) out.bases[b] = await base(b); const h0 = await canvasHash('preview-3d'); await ALL(60); const h60 = await canvasHash('preview-3d');
      const s0 = fold().querySelectorAll('input[type=range]')[1]; s0.value = '-45'; fire(s0, 'input'); await sleep(200); const hUna = await canvasHash('preview-3d');
      const reset = [...fold().querySelectorAll('button')].find((b) => /Reset Flat/.test(b.textContent)); reset.click(); await sleep(250); const hR = await canvasHash('preview-3d');
      Object.assign(out, { hashBase0Plano: h0, hashTodas60: h60, hashUnaCrease: hUna, hashTrasReset: hR, plegadoCambiaLaImagen: h60 !== h0 && hUna !== h60, resetVuelveAlPlano: hR === h0 }); await ALL(60); return out; },
    async V6() { const out = {}; for (const v of ['kraft', 'gray', 'white']) { const mp = $('material-preset'); mp.value = v; fire(mp, 'change'); await sleep(250); out[v] = { pill: $('material-pill').textContent, status: status() }; }
      for (const v of ['0.8', '0']) { $('thickness-input').value = v; $('apply-thickness-btn').click(); await sleep(300); out['espesor ' + v] = status(); } $('thickness-input').value = '0.25'; $('apply-thickness-btn').click(); await sleep(300); await ALL(60); return out; },
    async V7(etiqueta) { return { png: await png('f2a3-' + etiqueta + '.png'), glb: await glb('f2a3-' + etiqueta + '.glb') }; },
    async V8() { const antes = { ...plegado(), angulos: [...fold().querySelectorAll('input[type=range]')].map((s) => s.value).join(',') }; C.simularFallo('buildFoldTree'); const otra = (+antes.base + 3) % antes.opcionesBase;
      const r = await base(otra); await sleep(150); const despues = { ...plegado(), angulos: [...fold().querySelectorAll('input[type=range]')].map((s) => s.value).join(',') }; C.simularFallo(null); const ok = await base(otra);
      return { pedida: otra, antes, durante: { status: r.status, barra: r.barra, ...despues }, conservaBase: despues.base === antes.base, conservaAngulos: despues.angulos === antes.angulos, trasQuitarElFallo: { base: ok.plegado.base, status: ok.status } }; },
    async V9() { C.simularFallo('buildFoldTree'); const det = await construir(); C.simularFallo('buildPanels'); const fb = await construir(); C.simularFallo(null); const ok = await construir(); return { detencion: det, fallback: fb, recuperacion: ok }; },
    async V10() { $('tess-exp-motor').querySelector('.tess-exp-desactivar').click(); await sleep(150); const m = C.modo(); const r = await construir(); r.modo = m; r.log = lines(/Base reiniciada|modo SOMBRA/); return r; },
    async ARTE() { $('refresh-art-btn').click(); await waitFor(() => /Artwork|artwork|Art /.test($('art-status').textContent + status()) && !/Loading|Exporting/i.test(status()), 90000, 'arte'); await sleep(800); return { status: status(), arte: $('art-status').textContent, fuente: $('art-source-pill') && $('art-source-pill').textContent, log: lines(/Artwork|artwork/).slice(-3) }; },
    final() { return { modo: C.modo(), registro: C.registro().slice(-40), log: $('log-area').textContent.split('\\n').slice(-60), barra: barra() }; },
  };
  window.__F2A3 = { run: async (k, a) => { try { return await P[k](a); } catch (e) { return { error: String(e && e.message || e), status: status() }; } } }; return Object.keys(P); })()`;

async function abrir(port = 8089) { const t = pickTarget(await listTargets(port), 'tesseract-v3-experimental'); const c = await connect(t); await c.send('Page.enable').catch(() => {}); return c; }
const sha = (b) => crypto.createHash('sha256').update(b).digest('hex');
async function captura(c, dir, nombre) { try { const r = await c.send('Page.captureScreenshot', { format: 'png' }); const f = path.join(dir, 'capturas', nombre + '.png'); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, Buffer.from(r.data, 'base64')); return path.relative(ROOT, f); } catch (e) { return 'sin captura: ' + e.message; } }
const consola = (c) => c.events.filter((e) => e.method === 'Runtime.exceptionThrown' || (e.method === 'Runtime.consoleAPICalled' && ['error', 'assert'].includes(e.params.type)) || (e.method === 'Log.entryAdded' && e.params.entry.level === 'error'))
  .map((e) => e.method === 'Runtime.exceptionThrown' ? { tipo: 'excepcion', texto: e.params.exceptionDetails.exception?.description || e.params.exceptionDetails.text } : e.method === 'Log.entryAdded' ? { tipo: 'log-error', texto: e.params.entry.text, url: e.params.entry.url } : { tipo: e.params.type, texto: e.params.args.map((a) => a.value ?? a.description).join(' ') });

export async function run(argv) {
  const cmd = argv[0]; const tag = (argv.find((a) => a.startsWith('--tag=')) || '').slice(6) || (cmd === 'arte' ? 'N0-B' : 'N0-A'); const out = path.join(ROOT, 'tests/results/f2a3-cep'); fs.mkdirSync(out, { recursive: true });
  const fecha = new Date().toISOString().replace(/[:.]/g, '-'); const c = await abrir(); const R = { fecha: new Date().toISOString(), orden: cmd, documento: tag, pasos: {}, capturas: {} };
  try {
    if (cmd === 'identidad') { R.identidad = await c.eval(`(async () => { const s = [...document.scripts].map((x) => x.src).find((u) => /main\\.js/.test(u)); const b = await (await fetch(s)).arrayBuffer(); const h = [...new Uint8Array(await crypto.subtle.digest('SHA-256', b))].map((x) => x.toString(16).padStart(2, '0')).join('');
        return { href: location.href, ext: window.__adobe_cep__.getExtensionId(), host: JSON.parse(window.__adobe_cep__.getHostEnvironment()), ua: navigator.userAgent, three: typeof THREE !== 'undefined' && THREE.REVISION, mainJs: { bytes: b.byteLength, sha256: h }, control: typeof window.__tessMotorExperimental, modo: window.__tessMotorExperimental && window.__tessMotorExperimental.modo(), barra: !!document.getElementById('tess-exp-motor') }; })()`, 30000);
      const esperado = fs.readFileSync(path.join(ROOT, 'dist-experimental/SHA256SUMS'), 'utf8').split('\n').find((l) => / \.\/main\.js$/.test(l)).slice(0, 64);
      R.veredicto = { extension: R.identidad.ext === EXT, host: R.identidad.host.appName === 'ILST', mainJs: R.identidad.mainJs.sha256 === esperado, three: String(R.identidad.three) === '132', sombra: R.identidad.modo === 'sombra', barra: R.identidad.barra, chromium: /Chrome\/99\./.test(R.identidad.ua) };
      R.capturas.inicio = await captura(c, out, `identidad-${fecha}`);
    } else if (cmd === 'recarga') { await c.send('Page.reload', { ignoreCache: true }); await new Promise((r) => setTimeout(r, 4000)); R.tras = await c.eval(`({ modo: window.__tessMotorExperimental.modo(), barra: document.getElementById('tess-exp-motor') && document.getElementById('tess-exp-motor').querySelector('.tess-exp-modo').textContent, status: document.getElementById('status-area').textContent })`); R.capturas.recarga = await captura(c, out, `recarga-${fecha}`);
    } else {
      await c.eval(PAGE, 30000); const paso = async (k, a, cap) => { R.pasos[k + (a ? '-' + a : '')] = await c.eval(`__F2A3.run(${JSON.stringify(k)}, ${JSON.stringify(a || null)})`); if (cap) R.capturas[k + (a ? '-' + a : '')] = await captura(c, out, `${cmd}-${k}${a ? '-' + a : ''}-${fecha}`); };
      if (cmd === 'caja') { await paso('V0', null, true); await paso('V1', null, true); await paso('V2', null, true); await paso('V7', 'sombra'); await paso('V3', null, true); await paso('V4', null, true); await paso('V5', null, true); await paso('V6');
        await paso('V7', 'activo', true); await paso('V8', null, true); await paso('V9', null, true); await paso('V10', null, true); }
      else if (cmd === 'arte') { await paso('V0'); await paso('V1', null, true); await paso('V2'); await paso('ARTE', null, true); await paso('V7', 'arte-sombra'); await paso('V3'); await paso('V4'); await paso('ARTE', null, true); await paso('V7', 'arte-activo', true); await paso('V10'); }
      else throw new Error('uso: f2a3-cep.mjs identidad|caja|arte|recarga [--tag=N0-A]');
      R.final = await c.eval('__F2A3.run("final")');
      R.archivos = fs.existsSync(OUTDIR) ? Object.fromEntries(fs.readdirSync(OUTDIR).filter((f) => f.startsWith('f2a3-')).map((f) => { const b = fs.readFileSync(path.join(OUTDIR, f)); return [f, { bytes: b.length, sha256: sha(b) }]; })) : {};
    }
    R.consola = consola(c);
  } finally { await c.close(); }
  const f = path.join(out, `${cmd}-${fecha}.json`); fs.writeFileSync(f, JSON.stringify(R, null, 1)); console.log(path.relative(ROOT, f)); return R;
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) run(process.argv.slice(2)).catch((e) => { console.error('ERROR:', e.message); process.exit(1); });
