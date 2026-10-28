#!/usr/bin/env node
// Tesseract V3 · release candidate — validación de las interacciones pendientes y mediciones DENTRO del panel REAL de Illustrator
// («Tesseract V3 (experimental)», DevTools remoto 127.0.0.1:8089). Entrada de confianza: CDP Input.dispatchMouseEvent con las coordenadas
// escaladas por devicePixelRatio (como A9-CEP); diálogo nativo «Save GLB» conducido con Eventos del Sistema (teclado) en Illustrator.
//   node tools/a4/f2a3-rc-real.mjs interacciones --modo=sombra|activo   N0-A abierto: Shift+clic (base), plegado, Shift+clic tras plegar, Alt+clic (crease),
//                                                                       base por selector tras plegar, ángulo por crease, materiales, espesor y PNG
//   node tools/a4/f2a3-rc-real.mjs dialogo --nombre=x.glb [--cancelar]  diálogo NATIVO «Save GLB» (guardar en /private/tmp/tesseract_rc/ o cancelar)
//   node tools/a4/f2a3-rc-real.mjs rendimiento --n=5                     N0-A abierto: n ejecuciones por modo desde un panel recién cargado (tiempos y memoria)
//   node tools/a4/f2a3-rc-real.mjs preparar [--recargar] [--modo=sombra|activo] [--arte]   extracción + 3D (+ arte) desde el estado indicado
//   node tools/a4/f2a3-rc-real.mjs estado                                modo, construcción actual y última línea de estado
// Salida: tests/results/f2a3-rc/<orden>-<fecha>.json (+ capturas). Solo pulsa la interfaz del panel experimental y el diálogo que él mismo abre.
import fs from 'node:fs'; import path from 'node:path'; import crypto from 'node:crypto'; import { execFileSync } from 'node:child_process'; import { fileURLToPath, pathToFileURL } from 'node:url';
import { listTargets, pickTarget, connect } from './cdp-run.mjs';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..'); const OUT = path.join(ROOT, 'tests/results/f2a3-rc'); const DLG = '/private/tmp/tesseract_rc'; const CONF = 'ACTIVAR-EXPERIMENTAL';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms)); const sha = (b) => crypto.createHash('sha256').update(b).digest('hex');
const arg = (k, d) => { const a = process.argv.find((x) => x.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : (process.argv.includes(`--${k}`) ? true : d); };
const osa = (lineas, seg = 30) => execFileSync('perl', ['-e', `alarm ${seg}; exec @ARGV`, 'osascript', ...lineas.flatMap((l) => ['-e', l])], { encoding: 'utf8' }).trim();
const med = (xs) => { const v = xs.filter((x) => typeof x === 'number').sort((a, b) => a - b); if (!v.length) return null; const m = v.length % 2 ? v[(v.length - 1) / 2] : (v[v.length / 2 - 1] + v[v.length / 2]) / 2; return { n: v.length, mediana: +m.toFixed(2), min: +v[0].toFixed(2), max: +v[v.length - 1].toFixed(2) }; };

const AYUDA_PAGINA = `(() => { const $ = (id) => document.getElementById(id); const sleep = (ms) => new Promise((r) => setTimeout(r, ms)); const raf2 = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  const st = () => $('status-area').textContent; const fire = (el, t) => el.dispatchEvent(new Event(t, { bubbles: true }));
  const waitFor = async (fn, ms, label) => { const t0 = performance.now(); while (performance.now() - t0 < ms) { const v = fn(); if (v) return v; await sleep(20); } throw new Error('tiempo agotado: ' + label + ' (' + st() + ')'); };
  const hash = async () => [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode($('preview-3d').toDataURL('image/png'))))].map((x) => x.toString(16).padStart(2, '0')).join('').slice(0, 16);
  const fold = () => $('fold-panel'); const sel = () => fold() && fold().querySelector('select'); const all = () => fold().querySelector('details.all-creases input[type=range]');
  const barra = () => { const b = $('tess-exp-motor'); return b ? { modo: b.querySelector('.tess-exp-modo').textContent, construccion: b.querySelector('.tess-exp-construccion').textContent } : null; };
  const historial = []; if (!window.__rcObs) { window.__rcObs = new MutationObserver(() => historial.push(st())); window.__rcObs.observe($('status-area'), { childList: true, characterData: true, subtree: true }); window.__rcHist = historial; }
  const construir = async () => { if ($('three-view').style.display !== 'none') { $('back-btn').click(); await sleep(250); } const t0 = performance.now(); $('continue-3d-btn').click(); await waitFor(() => /3D ready|3D error/.test(st()), 120000, '3D'); const ms = performance.now() - t0; await raf2(); return ms; };
  const extraer = async () => { const t0 = performance.now(); $('extract-btn').click(); await waitFor(() => /Extraction complete|Error/.test(st()) && st() !== 'Extracting...', 60000, 'extracción'); return performance.now() - t0; };
  window.RC = { $, sleep, raf2, st, fire, waitFor, hash, fold, sel, all, barra, construir, extraer, C: window.__tessMotorExperimental }; return true; })()`;

async function abrir() { const c = await connect(pickTarget(await listTargets(8089), 'tesseract-v3-experimental')); await c.send('Page.enable').catch(() => {}); await c.send('HeapProfiler.enable').catch(() => {}); return c; }
async function captura(c, nombre) { try { const r = await c.send('Page.captureScreenshot', { format: 'png' }); const f = path.join(OUT, 'capturas', nombre + '.png'); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, Buffer.from(r.data, 'base64')); return path.relative(ROOT, f); } catch (e) { return 'sin captura: ' + e.message; } }
const errores = (c) => c.events.filter((e) => e.method === 'Runtime.exceptionThrown' || (e.method === 'Runtime.consoleAPICalled' && e.params.type === 'error')).map((e) => e.method === 'Runtime.exceptionThrown' ? (e.params.exceptionDetails.exception?.description || e.params.exceptionDetails.text) : e.params.args.map((a) => a.value ?? a.description).join(' '));
async function clic(c, x, y, modifiers) { for (const type of ['mouseMoved', 'mousePressed', 'mouseReleased']) await c.send('Input.dispatchMouseEvent', { type, x, y, modifiers, button: type === 'mouseMoved' ? 'none' : 'left', buttons: type === 'mousePressed' ? 1 : 0, clickCount: type === 'mouseMoved' ? 0 : 1 }); await sleep(220); return c.eval('RC.st()'); }
async function lienzo(c) { await c.eval(`(async () => { RC.$('preview-3d').scrollIntoView({ block: 'center' }); await RC.sleep(250); })()`);
  const [L, T, W, H, VH, VW, DPR] = await c.eval(`(() => { const r = RC.$('preview-3d').getBoundingClientRect(); return [r.left, r.top, r.width, r.height, innerHeight, innerWidth, devicePixelRatio]; })()`);
  const y0 = Math.max(T, 0) + 8, y1 = Math.min(T + H, VH) - 8, x0 = Math.max(L, 0) + 8, x1 = Math.min(L + W, VW) - 8; return { punto: (fx, fy) => [(x0 + (x1 - x0) * fx) * DPR, (y0 + (y1 - y0) * fy) * DPR], DPR }; }
async function barrer(c, lz, modifiers, re, { distinto = null, max = 1 } = {}) { const hallados = [];
  for (let j = 1; j < 9 && hallados.length < max; j++) for (let i = 1; i < 11 && hallados.length < max; i++) { const [x, y] = lz.punto(i / 11, j / 9); const s = await clic(c, x, y, modifiers); const m = re.exec(s); if (m && m[1] !== distinto && !hallados.some((h) => h.id === m[1])) hallados.push({ id: m[1], estado: s, punto: [+(x).toFixed(1), +(y).toFixed(1)] }); }
  return hallados; }

async function interacciones(c, modo) {
  const R = { modo, pasos: {} }; await c.eval(AYUDA_PAGINA); await c.eval(modo === 'activo' ? `RC.C.activar('${CONF}')` : 'RC.C.desactivar()');
  if (await c.eval(`RC.$('three-view').style.display !== 'none'`)) { await c.eval(`(async () => { RC.$('back-btn').click(); await RC.sleep(250); })()`); }
  R.pasos.extraer = { ms: await c.eval('RC.extraer()'), estado: await c.eval('RC.st()') };
  R.pasos.construir = { ms: await c.eval('RC.construir()'), estado: await c.eval('RC.st()'), barra: await c.eval('RC.barra()') }; const lz = await lienzo(c); R.dpr = lz.DPR;
  const base0 = await c.eval('RC.sel().value'); const shift = await barrer(c, lz, 8, /Base set to P(\d+)/, { max: 2 });
  R.pasos.shiftClic = { baseInicial: base0, hallados: shift, selectorTras: await c.eval('RC.sel().value'), pestanaMaterial: await c.eval(`RC.$('tab-btn-material').classList.contains('active')`), barra: await c.eval('RC.barra()') };
  const h0 = await c.eval('RC.hash()'); await c.eval(`(async () => { const a = RC.all(); a.value = '60'; RC.fire(a, 'input'); await RC.sleep(200); await RC.raf2(); })()`); const h60 = await c.eval('RC.hash()');
  const actual = await c.eval('RC.sel().value'); const tras = await barrer(c, lz, 8, /Base set to P(\d+)/, { distinto: actual, max: 1 });
  R.pasos.shiftTrasPlegar = { plegadoCambiaImagen: h60 !== h0, baseAntes: actual, hallado: tras[0] || null, selectorTras: await c.eval('RC.sel().value'), angulosTras: await c.eval(`[...RC.fold().querySelectorAll('input[type=range]')].map((s) => s.value).join(',')`) };
  await c.eval(`(async () => { const a = RC.all(); a.value = '45'; RC.fire(a, 'input'); await RC.sleep(200); await RC.raf2(); })()`); R.pasos.shiftTrasPlegar.replegarCambiaImagen = (await c.eval('RC.hash()')) !== h60;
  const alt = await barrer(c, lz, 1, /Crease C(\d+) selected/, { max: 2 });
  R.pasos.altClic = { hallados: alt, pestanaCreases: await c.eval(`RC.$('tab-btn-creases').classList.contains('active')`), etiquetaSeleccion: await c.eval(`(() => { const e = [...RC.fold().querySelectorAll('*')].find((x) => /^Selected crease: /.test(x.textContent) && x.children.length === 0); return e ? e.textContent : null; })()`),
    filaResaltada: await c.eval(`[...RC.fold().querySelectorAll('*')].filter((x) => /255, 209, 102/.test(x.style.background)).length`) };
  const hA = await c.eval('RC.hash()'); await c.eval(`(async () => { const s = RC.fold().querySelectorAll('input[type=range]'); const sl = [...s].find((x) => !x.disabled && !x.closest('details.all-creases')); sl.value = '-30'; RC.fire(sl, 'input'); await RC.sleep(200); await RC.raf2(); })()`);
  R.pasos.anguloCrease = { cambiaImagen: (await c.eval('RC.hash()')) !== hA };
  const otra = await c.eval(`(() => { const s = RC.sel(); return String((+s.value + 2) % s.options.length); })()`); await c.eval(`(async () => { const s = RC.sel(); s.value = '${otra}'; RC.fire(s, 'change'); await RC.sleep(250); })()`);
  R.pasos.baseSelectorTrasPlegar = { pedida: otra, estado: await c.eval('RC.st()'), selector: await c.eval('RC.sel().value') };
  R.pasos.materialesEspesor = await c.eval(`(async () => { const o = {}; for (const v of ['kraft', 'gray', 'white']) { const mp = RC.$('material-preset'); mp.value = v; RC.fire(mp, 'change'); await RC.sleep(200); o[v] = RC.$('material-pill').textContent; }
    for (const v of ['0.8', '0', '0.25']) { RC.$('thickness-input').value = v; RC.$('apply-thickness-btn').click(); await RC.sleep(250); o['espesor ' + v] = RC.st(); } return o; })()`);
  R.pasos.png = await c.eval(`(async () => { const orig = HTMLAnchorElement.prototype.click; let url = null; HTMLAnchorElement.prototype.click = function () { if (this.download) { url = this.href; return; } return orig.apply(this, arguments); };
    try { RC.$('export-3d-btn').click(); await RC.sleep(200); } finally { HTMLAnchorElement.prototype.click = orig; } if (!url) return { error: 'sin PNG' }; const b64 = url.split(',')[1]; const p = '${DLG}/rc-${modo}.png'; const r = window.cep.fs.writeFile(p, b64, window.cep.encoding.Base64); return { ruta: p, err: r && r.err, bytes: Math.floor(b64.length * 3 / 4) }; })()`);
  R.pasos.pickError = await c.eval(`RC.$('log-area').textContent.split('\\n').filter((l) => /Pick error/.test(l)).length`); R.captura = await captura(c, `interacciones-${modo}`); return R;
}

async function dialogo(c, nombre, cancelar) {
  await c.eval(AYUDA_PAGINA); fs.mkdirSync(DLG, { recursive: true }); const antes = new Set(fs.readdirSync(DLG)); await c.eval('window.__rcHist.length = 0, true');
  await c.eval(`(() => { setTimeout(() => RC.$('export-glb-btn').click(), 50); return true; })()`); let ventana = false; // el diálogo modal bloquea el renderizador: el clic se lanza sin esperar
  for (let i = 0; i < 40 && !ventana; i++) { await sleep(500); try { ventana = /Save As/.test(osa(['tell application "System Events" to tell process "Adobe Illustrator" to get name of every window'], 10)); } catch { /* reintenta */ } }
  if (!ventana) return { error: 'no apareció el diálogo nativo' };
  if (cancelar) osa(['tell application "Adobe Illustrator" to activate', 'delay 0.6', 'tell application "System Events" to key code 53']);
  else osa(['tell application "Adobe Illustrator" to activate', 'delay 0.6', 'tell application "System Events"', 'keystroke "a" using command down', `keystroke "${nombre}"`, 'delay 0.4', 'keystroke "g" using {command down, shift down}', 'delay 1.2', `keystroke "${DLG}"`, 'delay 0.8', 'key code 36', 'delay 1.2', 'key code 36', 'end tell'], 40);
  await c.eval(`RC.waitFor(() => window.__rcHist.some((s) => /GLB exported from current 3D pose|GLB export cancelled/.test(s)) && !/Exporting/.test(RC.st()), 30000, 'fin de la exportación')`).catch(() => {}); await sleep(500);
  const nuevos = fs.readdirSync(DLG).filter((f) => !antes.has(f)); const archivo = cancelar ? null : path.join(DLG, nombre); const historial = await c.eval('[...new Set(window.__rcHist)]');
  let sustituido = null; if (!cancelar) { const ruta = path.join(DLG, nombre.replace(/\.glb$/, '') + '.sustituido.glb'); // misma pose, diálogo sustituido: el guardado nativo debe dar los mismos bytes
    await c.eval(`(async () => { const pe = window.__adobe_cep__.evalScript; window.__adobe_cep__.evalScript = (s, cb) => (s.indexOf('saveDialog') > -1 ? setTimeout(() => cb(${JSON.stringify(ruta)}), 0) : pe.call(window.__adobe_cep__, s, cb)); window.__rcHist.length = 0;
      RC.$('export-glb-btn').click(); try { await RC.waitFor(() => window.__rcHist.some((s) => /GLB exported from current 3D pose/.test(s)), 30000, 'GLB sustituido'); } finally { window.__adobe_cep__.evalScript = pe; } })()`); await sleep(300);
    sustituido = fs.existsSync(ruta) ? { ruta, sha256: sha(fs.readFileSync(ruta)) } : null; }
  return { cancelar, modo: await c.eval('RC.C.modo()'), barra: await c.eval('RC.barra()'), historialEstado: historial, archivosNuevos: nuevos, sustituido, archivo: archivo && fs.existsSync(archivo) ? { ruta: archivo, bytes: fs.statSync(archivo).size, sha256: sha(fs.readFileSync(archivo)) } : null };
}

async function rendimiento(n) {
  const R = { n, metodologia: 'Panel recién cargado en cada ejecución (Page.reload); N0-A abierto; mismos pasos en sombra y activo; tiempos con performance.now en la página real (extracción y 3D: clic → texto de estado final, sondeo cada 20 ms; motor: tiempos() del selector con performance.now; plegado: evento input del deslizador ALL → applyFolding síncrono y hasta 2 frames; GLB: clic → estado final, con el diálogo sustituido por una ruta en /private/tmp); memoria: Runtime.getHeapUsage tras HeapProfiler.collectGarbage', ejecuciones: [] };
  for (const modo of ['sombra', 'activo']) for (let i = 0; i < n; i++) {
    let c = await abrir(); await c.send('Page.reload', { ignoreCache: true }); await c.close(); await sleep(3500); c = await abrir(); await c.eval(AYUDA_PAGINA);
    const heap = async () => { await c.send('HeapProfiler.collectGarbage'); await sleep(150); return (await c.send('Runtime.getHeapUsage')).usedSize / 1048576; };
    if (modo === 'activo') await c.eval(`RC.C.activar('${CONF}')`); const h0 = await heap();
    const ext = await c.eval('RC.extraer()'); const con = await c.eval('RC.construir()'); await sleep(400); const T = await c.eval('RC.C.tiempos()');
    const sombra = modo === 'sombra' ? await c.eval(`RC.C.registro().filter((x) => x.sombra && x.ms !== undefined).map((x) => ({ etapa: x.etapa, ms: x.ms }))`) : [];
    const pleg = await c.eval(`(async () => { const a = RC.all(); a.value = '60'; const t0 = performance.now(); RC.fire(a, 'input'); const t1 = performance.now(); await RC.raf2(); return [t1 - t0, performance.now() - t0]; })()`);
    const h1 = await heap();
    const glb = await c.eval(`(async () => { const pe = window.__adobe_cep__.evalScript; window.__adobe_cep__.evalScript = (s, cb) => (s.indexOf('saveDialog') > -1 ? setTimeout(() => cb('${DLG}/rend-${modo}-${i}.glb'), 0) : pe.call(window.__adobe_cep__, s, cb));
      const t0 = performance.now(); RC.$('export-glb-btn').click(); try { await RC.waitFor(() => /GLB exported from current 3D pose/.test(RC.st()), 60000, 'GLB'); } finally { window.__adobe_cep__.evalScript = pe; } return performance.now() - t0; })()`);
    const ultimo = (op) => { const x = T.filter((t) => t.op === op); return x.length ? x[x.length - 1] : null; };
    R.ejecuciones.push({ modo, i, extraccionMs: ext, construccion3dMs: con, motor: { buildPanels: ultimo('buildPanels'), buildAdjacency: ultimo('buildAdjacency'), buildFoldTree: ultimo('buildFoldTree') }, sombra, plegadoSincronoMs: pleg[0], plegadoHastaPintarMs: pleg[1], exportGlbMs: glb, heapAntesMB: h0, heapTrasConstruirMB: h1, barra: await c.eval('RC.barra()'), errores: errores(c) });
    await c.close();
  }
  const resumen = {}; for (const modo of ['sombra', 'activo']) { const E = R.ejecuciones.filter((e) => e.modo === modo); const s = (f) => med(E.map(f));
    resumen[modo] = { extraccionMs: s((e) => e.extraccionMs), construccion3dMs: s((e) => e.construccion3dMs), motorBuildPanelsMs: s((e) => e.motor.buildPanels && e.motor.buildPanels.ms), motorBuildAdjacencyMs: s((e) => e.motor.buildAdjacency && e.motor.buildAdjacency.ms), motorBuildFoldTreeMs: s((e) => e.motor.buildFoldTree && e.motor.buildFoldTree.ms),
      sombraExperimentalBuildPanelsMs: s((e) => (e.sombra.find((x) => x.etapa === 'buildPanels') || {}).ms), plegadoSincronoMs: s((e) => e.plegadoSincronoMs), plegadoHastaPintarMs: s((e) => e.plegadoHastaPintarMs), exportGlbMs: s((e) => e.exportGlbMs),
      heapTrasConstruirMB: s((e) => e.heapTrasConstruirMB), heapDeltaConstruirMB: s((e) => e.heapTrasConstruirMB - e.heapAntesMB), origen: [...new Set(E.map((e) => e.motor.buildPanels && e.motor.buildPanels.origen))], errores: E.reduce((k, e) => k + e.errores.length, 0) }; }
  R.resumen = resumen; return R;
}

export async function run(argv) {
  const cmd = argv[0]; fs.mkdirSync(OUT, { recursive: true }); const fecha = new Date().toISOString().replace(/[:.]/g, '-'); let R;
  if (cmd === 'rendimiento') R = await rendimiento(+arg('n', 5));
  else { const c = await abrir(); try {
    if (cmd === 'interacciones') R = await interacciones(c, arg('modo', 'sombra'));
    else if (cmd === 'dialogo') R = await dialogo(c, arg('nombre', 'rc.glb'), !!arg('cancelar', false));
    else if (cmd === 'preparar') { if (arg('recargar', false)) { await c.send('Page.reload', { ignoreCache: true }); await sleep(3500); } await c.eval(AYUDA_PAGINA); await c.eval(arg('modo', 'sombra') === 'activo' ? `RC.C.activar('${CONF}')` : 'RC.C.desactivar()');
      if (await c.eval(`RC.$('three-view').style.display !== 'none'`)) await c.eval(`(async () => { RC.$('back-btn').click(); await RC.sleep(250); })()`); const ext = await c.eval('RC.extraer()'); const con = await c.eval('RC.construir()');
      let arte = null; if (arg('arte', false)) arte = await c.eval(`(async () => { RC.$('refresh-art-btn').click(); await RC.waitFor(() => /Artwork loaded|No art|failed/i.test(RC.$('art-status').textContent) && !/Loading|Exporting/i.test(RC.st()), 90000, 'arte'); await RC.sleep(800); return RC.$('art-status').textContent; })()`);
      R = { modo: await c.eval('RC.C.modo()'), extraccionMs: ext, construccionMs: con, arte, barra: await c.eval('RC.barra()'), estado: await c.eval('RC.st()') }; R.captura = await captura(c, `preparar-${arg('modo', 'sombra')}${arg('arte', false) ? '-arte' : ''}`); }
    else if (cmd === 'estado') { await c.eval(AYUDA_PAGINA); R = { modo: await c.eval('RC.C.modo()'), barra: await c.eval('RC.barra()'), estado: await c.eval('RC.st()') }; }
    else throw new Error('uso: f2a3-rc-real.mjs interacciones --modo=sombra|activo | dialogo --nombre=x.glb [--cancelar] | rendimiento --n=5 | estado');
    R.errores = errores(c); } finally { await c.close(); } }
  R = { fecha: new Date().toISOString(), orden: cmd, ...R }; const f = path.join(OUT, `${cmd}-${fecha}.json`); fs.writeFileSync(f, JSON.stringify(R, null, 1)); console.log(path.relative(ROOT, f)); return R;
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) run(process.argv.slice(2)).catch((e) => { console.error('ERROR:', e.message); process.exit(1); });
