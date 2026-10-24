#!/usr/bin/env node
// A4 — diagnóstico y medición DENTRO del panel V3 cargado por CEP, vía DevTools remoto (.debug → http://127.0.0.1:<puerto>). Sin dependencias (WebSocket global de Node ≥ 22).
//   node tools/a4/cdp-run.mjs targets                     lista los objetivos de DevTools (solo lectura)
//   node tools/a4/cdp-run.mjs identity [--simulated]      prueba de identidad del panel cargado (id de extensión, host, Chromium, three, huella de main.js vs dist/)
//   node tools/a4/cdp-run.mjs console [--seconds=10] [--reload]   recoge (con --reload recarga el panel para ver la consola desde la carga) errores/avisos de la consola y excepciones durante N segundos (solo lectura)
//   node tools/a4/cdp-run.mjs measure                     tools/baseline/measure_ui.js → tesseractBaseline({skipGlb:true})   [MUEVE el panel: pulsa botones de la UI]
//   node tools/a4/cdp-run.mjs leak [--cycles=6]           tools/baseline/leak_cycles.js → tesseractLeakCycles               [MUEVE el panel]
// Salvaguardas: solo 127.0.0.1; solo el objetivo cuya URL contiene --url-match (por defecto «tesseract-v3»); NUNCA el panel del plugin instalado (URL con /extensions/tesseract/);
// si hay 0 o más de 1 objetivo, se niega. No escribe fuera de --out (por defecto tests/results/a4). `measure`/`leak` necesitan un documento de prueba con capas Cuts/Creases abierto en Illustrator.
import fs from 'node:fs'; import http from 'node:http'; import path from 'node:path'; import crypto from 'node:crypto'; import { fileURLToPath, pathToFileURL } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const EXPECT_EXT = 'com.tato.tesseract.v3.panel';

export function parseArgs(argv) { const o = { cmd: argv[0], port: 8088, urlMatch: 'tesseract-v3', out: path.join(ROOT, 'tests/results/a4'), seconds: 10, cycles: 6, simulated: false, reload: false, dist: path.join(ROOT, 'dist') };
  for (const a of argv.slice(1)) { const [k, v] = a.replace(/^--/, '').split('='); if (k === 'port') o.port = +v; else if (k === 'url-match') o.urlMatch = v; else if (k === 'out') o.out = path.resolve(v); else if (k === 'seconds') o.seconds = +v; else if (k === 'cycles') o.cycles = +v; else if (k === 'simulated') o.simulated = true; else if (k === 'reload') o.reload = true; else if (k === 'dist') o.dist = path.resolve(v); else throw new Error('opción desconocida: ' + a); }
  if (!Number.isInteger(o.port) || o.port < 1 || o.port > 65535) throw new Error('puerto inválido'); return o; }

export function listTargets(port) { // http.get sin keep-alive (agent:false): no deja sockets abiertos
  return new Promise((resolve, reject) => { const req = http.get({ host: '127.0.0.1', port, path: '/json', agent: false, timeout: 5000 }, (res) => { let b = ''; res.setEncoding('utf8'); res.on('data', (d) => { b += d; }); res.on('end', () => { try { resolve(JSON.parse(b).filter((t) => t.type === 'page')); } catch (e) { reject(new Error('respuesta de DevTools no válida: ' + b.slice(0, 120))); } }); });
    req.on('timeout', () => req.destroy(new Error('tiempo agotado consultando DevTools en el puerto ' + port))); req.on('error', (e) => reject(new Error('no se pudo consultar DevTools en 127.0.0.1:' + port + ' (' + (e.code || e.message) + ')'))); }); }
export function pickTarget(targets, urlMatch) { // jamás el panel del plugin instalado
  const installed = (u) => /\/extensions\/tesseract\//.test(u);
  const cand = targets.filter((t) => decodeURIComponent(t.url).includes(urlMatch) && !installed(decodeURIComponent(t.url)));
  if (cand.length !== 1) throw new Error(`se esperaba exactamente 1 objetivo con «${urlMatch}» y hay ${cand.length}. Objetivos: ${targets.map((t) => t.url).join(' | ') || '(ninguno)'}`);
  return cand[0]; }

export async function connect(target) { const ws = new WebSocket(target.webSocketDebuggerUrl); await new Promise((r, j) => { ws.onopen = r; ws.onerror = () => j(new Error('no se pudo abrir el WebSocket de DevTools')); });
  let id = 0; const pending = new Map(); const events = [];
  ws.onmessage = (ev) => { const m = JSON.parse(ev.data); if (m.id && pending.has(m.id)) { const { resolve, reject } = pending.get(m.id); pending.delete(m.id); m.error ? reject(new Error(m.error.message)) : resolve(m.result); } else if (m.method) events.push(m); };
  const send = (method, params = {}) => new Promise((resolve, reject) => { const i = ++id; pending.set(i, { resolve, reject }); ws.send(JSON.stringify({ id: i, method, params })); });
  await send('Runtime.enable'); await send('Log.enable').catch(() => {});
  return { events, send, close: () => new Promise((r) => { const t = setTimeout(r, 1500); ws.onclose = () => { clearTimeout(t); r(); }; try { ws.close(); } catch { clearTimeout(t); r(); } }),
    async eval(expression, timeout = 600000) { let to; const r = await Promise.race([send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }), new Promise((_, j) => { to = setTimeout(() => j(new Error('timeout evaluando en el panel')), timeout); })]).finally(() => clearTimeout(to));
      if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text); return r.result.value; } }; }

const IDENTITY_JS = `(async () => { const o = { href: location.href, title: document.title, ua: navigator.userAgent, dpr: devicePixelRatio, viewport: innerWidth + 'x' + innerHeight };
  o.hasCep = typeof window.__adobe_cep__ === 'object' || typeof window.__adobe_cep__ === 'function';
  const t = (f) => { try { return f(); } catch (e) { return 'ERROR: ' + e.message; } };
  if (o.hasCep) { o.extensionId = t(() => window.__adobe_cep__.getExtensionId()); o.hostEnvironment = t(() => JSON.parse(window.__adobe_cep__.getHostEnvironment())); o.apiVersion = t(() => window.__adobe_cep__.getCurrentApiVersion && JSON.stringify(window.__adobe_cep__.getCurrentApiVersion())); }
  o.three = t(() => typeof THREE !== 'undefined' ? THREE.REVISION : null); o.scripts = [...document.scripts].map((s) => s.getAttribute('src')).filter(Boolean);
  o.mainJs = null; try { const src = [...document.scripts].map((s) => s.src).find((u) => /\\/main\\.js(\\?|$)/.test(u)); if (src) { const b = await (await fetch(src)).arrayBuffer(); const h = await crypto.subtle.digest('SHA-256', b); o.mainJs = { src, bytes: b.byteLength, sha256: [...new Uint8Array(h)].map((x) => x.toString(16).padStart(2, '0')).join('') }; } } catch (e) { o.mainJs = { error: e.message }; }
  o.ui = { importView: !!document.getElementById('import-view'), extractBtn: !!document.getElementById('extract-btn'), preview3d: !!document.getElementById('preview-3d') };
  return o; })()`;
export function verdict(id, { simulated, distSums }) { const c = []; const add = (name, ok, detail) => c.push({ name, ok: !!ok, detail });
  add('panel V3 (URL con tesseract-v3 o harness)', true, id.href);
  if (!simulated) { add('puente CEP presente', id.hasCep, String(id.hasCep)); add('id de extensión = ' + EXPECT_EXT, id.extensionId === EXPECT_EXT, String(id.extensionId)); add('host = ILST (Illustrator)', id.hostEnvironment && id.hostEnvironment.appName === 'ILST', JSON.stringify(id.hostEnvironment && { appName: id.hostEnvironment.appName, appVersion: id.hostEnvironment.appVersion })); add('Chromium 99 (CEP 12)', /Chrome\/99\./.test(id.ua), id.ua); }
  add('three.js r132', String(id.three) === '132', String(id.three)); add('IIFE: un solo main.js cargado', id.scripts.filter((s) => /main\.js/.test(s)).length === 1, id.scripts.join(', '));
  const want = distSums && distSums['main.js']; add('main.js cargado = bundle de dist/ (SHA-256)', want && id.mainJs && id.mainJs.sha256 === want, id.mainJs ? `${id.mainJs.sha256 || id.mainJs.error} (esperado ${want})` : 'no se pudo leer main.js desde la página');
  add('interfaz del panel presente', id.ui.importView && id.ui.extractBtn && id.ui.preview3d, JSON.stringify(id.ui)); return { ok: c.every((x) => x.ok), checks: c }; }
const readSums = (dist) => Object.fromEntries(fs.readFileSync(path.join(dist, 'SHA256SUMS'), 'utf8').split('\n').filter(Boolean).map((l) => { const [h, f] = l.split(/\s+/); return [f.replace(/^\.\//, ''), h]; }));
const save = (o, name, cmd) => { fs.mkdirSync(o.out, { recursive: true }); const f = path.join(o.out, `cdp-${cmd}-${new Date().toISOString().replace(/[:.]/g, '-')}.json`); fs.writeFileSync(f, JSON.stringify(name, null, 1)); return f; };

export async function run(argv) {
  const o = parseArgs(argv); if (!['targets', 'identity', 'console', 'measure', 'leak'].includes(o.cmd)) throw new Error('uso: cdp-run.mjs targets|identity [--simulated]|console [--seconds=N]|measure|leak [--cycles=N]  [--port=8088] [--url-match=tesseract-v3] [--out=dir]');
  const targets = await listTargets(o.port); if (o.cmd === 'targets') { const t = targets.map((x) => ({ title: x.title, url: x.url })); console.log(JSON.stringify(t, null, 1)); return { targets: t }; }
  const target = pickTarget(targets, o.urlMatch); const c = await connect(target);
  try {
    if (o.cmd === 'identity') { const id = await c.eval(IDENTITY_JS, 30000); const v = verdict(id, { simulated: o.simulated, distSums: readSums(o.dist) }); const out = { fecha: new Date().toISOString(), simulated: o.simulated, identidad: id, veredicto: v }; const f = save(o, out, 'identity'); for (const k of v.checks) console.log(`  ${k.ok ? 'OK   ' : 'FALLA'} ${k.name}: ${k.detail}`); console.log(v.ok ? 'IDENTIDAD CORRECTA' : 'IDENTIDAD INCORRECTA', '→', f); return out; }
    if (o.cmd === 'console') { if (o.reload) { await c.send('Page.enable'); await c.send('Page.reload', { ignoreCache: true }); } await new Promise((r) => setTimeout(r, o.seconds * 1000)); const ev = c.events.map((e) => e.method === 'Runtime.consoleAPICalled' ? { tipo: e.params.type, texto: e.params.args.map((a) => a.value ?? a.description).join(' ') } : e.method === 'Runtime.exceptionThrown' ? { tipo: 'excepcion', texto: e.params.exceptionDetails.exception?.description || e.params.exceptionDetails.text } : e.method === 'Log.entryAdded' ? { tipo: 'log-' + e.params.entry.level, texto: e.params.entry.text } : null).filter(Boolean);
      const malos = ev.filter((e) => ['error', 'excepcion', 'log-error', 'assert'].includes(e.tipo)); const out = { fecha: new Date().toISOString(), segundos: o.seconds, eventos: ev, errores: malos.length }; console.log(`  ${ev.length} eventos, ${malos.length} errores`, '→', save(o, out, 'console')); return out; }
    const file = o.cmd === 'measure' ? 'measure_ui.js' : 'leak_cycles.js'; await c.eval(fs.readFileSync(path.join(ROOT, 'tools/baseline', file), 'utf8'), 30000);
    const call = o.cmd === 'measure' ? 'tesseractBaseline({ skipGlb: true })' : `tesseractLeakCycles({ cycles: ${o.cycles} })`; const res = await c.eval(call); const out = { fecha: new Date().toISOString(), orden: o.cmd, resultado: res }; console.log(`  ${o.cmd} terminado →`, save(o, out, o.cmd)); return out;
  } finally { await c.close(); }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) run(process.argv.slice(2)).catch((e) => { console.error('ERROR:', e.message); process.exit(1); });
