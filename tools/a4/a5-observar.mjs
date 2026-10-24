#!/usr/bin/env node
// A5-CEP — observación PASIVA del puente CEP en el panel V3 cargado por CEP (DevTools en 127.0.0.1). No sustituye nada: envuelve __adobe_cep__.evalScript
// y cep.fs.writeFile delegando siempre en el original, y registra cada mensaje de estado/arte, cada script enviado (tipo, longitud, SHA-256) y cada escritura.
// Sirve para validar con clics REALES el diálogo «Save GLB» de Illustrator y que los textos ExtendScript de src/host/ llegan idénticos al baseline.
//   node tools/a4/a5-observar.mjs instalar [--port=8088] [--url-match=tesseract-v3]      registro en la memoria de la página (se pierde al recargar el panel)
//   node tools/a4/a5-observar.mjs leer [--restaurar] [--out=tests/results/a5-cep]        lo registrado + SHA-256 de los archivos escritos (leídos del disco) + veredicto
// Salvaguardas: las de cdp-run.mjs (solo loopback, exactamente 1 objetivo, nunca el panel del plugin instalado). No escribe fuera de --out.
import fs from 'node:fs'; import path from 'node:path'; import crypto from 'node:crypto'; import { fileURLToPath, pathToFileURL } from 'node:url';
import { listTargets, pickTarget, connect } from './cdp-run.mjs';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
// Textos ExtendScript esperados (baseline congelado; fijados en tests/node/host-scripts.test.mjs) y GLB del CEP real de A4 (docs/fase1/a4-real)
export const EXPECTED_SCRIPTS = { test: [48, '444efa9b8bdb7395'], extraer: [5536, 'bd4c215d56fb4cdc'], arte: [5677, 'ab1c20da805454b7'], guardar: [188, 'be6c47e148487d9d'] };
export const GLB_A4 = { plano: '737bcd2312da1191a57f5b6530749ffd6bf20b6dd1737c454a62d7f38d8e40b4', todas60: '87aa2e4c5cc39092e4b040b77f713bc371f6e7c8b47cc56b8711cb5167275017', arte: 'b4973a54840cd0c1' };

const INSTALL = `(() => { if (window.__a5rec) return 'ya estaba instalado';
  const rec = window.__a5rec = { inicio: new Date().toISOString(), status: [], art: [], scripts: [], writes: [], restore: [] };
  const d = Object.getOwnPropertyDescriptor(Node.prototype, 'textContent');
  for (const [id, arr] of [['status-area', rec.status], ['art-status', rec.art]]) { const el = document.getElementById(id);
    Object.defineProperty(el, 'textContent', { configurable: true, get() { return d.get.call(this); }, set(v) { arr.push(String(v)); d.set.call(this, v); } }); rec.restore.push(() => { delete el.textContent; }); }
  const cep = window.__adobe_cep__; const ev = cep.evalScript;
  cep.evalScript = function (s, cb) { rec.scripts.push(String(s)); return ev.apply(this, arguments); }; rec.restore.push(() => { cep.evalScript = ev; });
  if (window.cep && window.cep.fs) { const fsx = window.cep.fs, wf = fsx.writeFile;
    fsx.writeFile = function (p, data, enc) { const r = wf.apply(this, arguments); rec.writes.push({ ruta: String(p), enc: enc, longitudBase64: String(data).length, err: r && r.err }); return r; }; rec.restore.push(() => { fsx.writeFile = wf; }); }
  else rec.sinCepFs = true;
  return 'instalado'; })()`;
const READ = (restore) => `(async () => { const rec = window.__a5rec; if (!rec) return null;
  const sha = async (s) => [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)))].map((b) => b.toString(16).padStart(2, '0')).join('').slice(0, 16);
  const kind = (s) => s.indexOf('OK_FROM_ILLUSTRATOR') > -1 ? 'test' : s.indexOf('tesseract_art') > -1 ? 'arte' : s.indexOf('saveDialog') > -1 ? 'guardar' : s.indexOf('outerBoundary') > -1 ? 'extraer' : 'otro';
  const out = { inicio: rec.inicio, sinCepFs: !!rec.sinCepFs, historialEstado: rec.status.slice(), historialArte: rec.art.slice(), escrituras: rec.writes.slice(),
    scripts: await Promise.all(rec.scripts.map(async (s) => ({ tipo: kind(s), longitud: s.length, sha256_16: await sha(s) }))) };
  if (${restore ? 'true' : 'false'}) { rec.restore.reverse().forEach((f) => { try { f(); } catch (e) {} }); delete window.__a5rec; out.restaurado = true; }
  return out; })()`;

export function veredicto(r) { // comprobaciones automáticas; lo visual y los diálogos los confirma el usuario
  const checks = [];
  for (const s of r.scripts) { const e = EXPECTED_SCRIPTS[s.tipo]; checks.push({ name: `script ${s.tipo} = baseline (${s.longitud} B, ${s.sha256_16})`, ok: !!e && e[0] === s.longitud && e[1] === s.sha256_16 }); }
  for (const w of r.escrituras) checks.push({ name: `escritura ${w.ruta}: err 0 y archivo en disco`, ok: (w.err === 0 || w.err === '0') && !!w.archivo });
  return { ok: checks.every((c) => c.ok), checks, tiposDeScriptVistos: [...new Set(r.scripts.map((s) => s.tipo))].sort() };
}
export function parseArgs(argv) { const o = { cmd: argv[0], port: 8088, urlMatch: 'tesseract-v3', out: path.join(ROOT, 'tests/results/a5-cep'), restore: false };
  for (const a of argv.slice(1)) { const [k, v] = a.replace(/^--/, '').split('='); if (k === 'port') o.port = +v; else if (k === 'url-match') o.urlMatch = v; else if (k === 'out') o.out = path.resolve(v); else if (k === 'restaurar') o.restore = true; else throw new Error('opción desconocida: ' + a); }
  if (!['instalar', 'leer'].includes(o.cmd)) throw new Error('uso: a5-observar.mjs instalar|leer [--restaurar] [--port=N] [--url-match=X] [--out=dir]');
  if (!Number.isInteger(o.port) || o.port < 1 || o.port > 65535) throw new Error('puerto inválido'); return o; }
export async function run(argv) {
  const o = parseArgs(argv); const c = await connect(pickTarget(await listTargets(o.port), o.urlMatch));
  try {
    if (o.cmd === 'instalar') { const r = await c.eval(INSTALL); console.log('observador:', r); return r; }
    const r = await c.eval(READ(o.restore)); if (!r) throw new Error('no hay observador instalado en el panel (¿se recargó?): ejecuta «instalar» primero');
    for (const w of r.escrituras) { const f = w.ruta.replace(/^file:\/\//, ''); if (fs.existsSync(f)) { const b = fs.readFileSync(f); w.archivo = { bytes: b.length, sha256: crypto.createHash('sha256').update(b).digest('hex') }; } }
    r.veredicto = veredicto(r); fs.mkdirSync(o.out, { recursive: true }); const file = path.join(o.out, `observacion-${new Date().toISOString().replace(/[:.]/g, '-')}.json`); fs.writeFileSync(file, JSON.stringify(r, null, 1));
    for (const ch of r.veredicto.checks) console.log((ch.ok ? 'ok    ' : 'FALLA ') + ch.name); console.log('historial de estado:', JSON.stringify(r.historialEstado)); console.log(r.veredicto.ok ? 'OBSERVACIÓN CORRECTA' : 'OBSERVACIÓN CON FALLOS', '→', file);
    r.archivo = file; return r;
  } finally { await c.close(); } }
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) run(process.argv.slice(2)).catch((e) => { console.error('ERROR:', e.message); process.exit(1); });
