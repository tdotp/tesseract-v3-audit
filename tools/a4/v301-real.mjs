#!/usr/bin/env node
// D-0 · 3.0.1-dev — Validación en Adobe Illustrator REAL del bundle de producto (tesseract-v3-experimental, .debug 8089) para el lote de robustez:
// H-05 (documento cambiado entre extraer y construir; arte de otro documento), H-03 (refrescos de arte seguidos; texturas en uso), H-02 (exportación
// de arte por mesas con la carpeta temporal de arte sin escritura, restaurada al final; OBSERVADO 2026-11-01: Illustrator 30.8.2 NO lanza en exportFile,
// falla en silencio, así que este paso comprueba la mesa activa tras el flujo y registra el hallazgo KI-37, no el camino de excepción), KI-24 (preset antes del
// 3D) y GLB (metros, conformidad) en sombra y activo. Conduce el panel por DevTools remoto (tools/a4/cdp-run.mjs; nunca otro panel) e Illustrator por
// AppleScript con documentos DESECHABLES (copias de N0-A y N0-B en /tmp, preparadas como en el Nivel 0).
//   node tools/a4/v301-real.mjs preflight    solo lectura: Illustrator, documentos abiertos, panel e identidad
//   node tools/a4/v301-real.mjs todo         la validación completa (exige 0 documentos abiertos; cierra SOLO los N0-* que abre, sin guardar)
// Garantías: aborta si hay documentos abiertos al empezar, si el documento activo no es N0-* antes de tocarlo, o si al final la lista de documentos no
// vuelve a ser la inicial. Los diálogos de Illustrator se silencian SOLO durante el paso H-02 (y se restauran). Salida: tests/results/v301-real/*.json,
// capturas del panel y los GLB en /private/tmp/tesseract_f2a3/. No instala nada.
import fs from 'node:fs'; import path from 'node:path'; import crypto from 'node:crypto'; import { execFileSync } from 'node:child_process'; import { fileURLToPath, pathToFileURL } from 'node:url';
import { listTargets, pickTarget, connect } from './cdp-run.mjs'; import { PAGE } from './f2a3-cep.mjs';
import { validarGLB, cajaGLB } from '../../tests/lib/glb-conformidad.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..'); const STAGE = '/tmp/Tesseract_v301_run'; const GLBDIR = '/private/tmp/tesseract_f2a3';
const RES = path.join(ROOT, 'tests/results/v301-real'); const EXT = 'com.tato.tesseract.v3.experimental.panel';
const DOCS = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools/illustrator/docs-prueba/expected.json'), 'utf8')).docs;
const sha = (b) => crypto.createHash('sha256').update(b).digest('hex'); class Anomalia extends Error {}
const SER = `function ser(v){ if(v===null||typeof v==="undefined") return "null"; if(typeof v==="boolean") return v?"true":"false"; if(typeof v==="number") return isFinite(v)?String(v):"null";
 if(typeof v==="string") return '"'+v.replace(/\\\\/g,"\\\\\\\\").replace(/"/g,'\\\\"').replace(/\\n/g,"\\\\n")+'"'; if(v instanceof Array){ var a=[]; for(var i=0;i<v.length;i++) a.push(ser(v[i])); return "["+a.join(",")+"]"; }
 var p=[]; for(var k in v){ if(v.hasOwnProperty(k)) p.push(ser(String(k))+":"+ser(v[k])); } return "{"+p.join(",")+"}"; }
function docs(){ var o=[]; for(var i=0;i<app.documents.length;i++) o.push(app.documents[i].name); return o; }
function activo(){ return app.documents.length ? app.activeDocument.name : null; }
`;
function ai(body, timeout = 120) { fs.mkdirSync(STAGE, { recursive: true }); const f = path.join(STAGE, 'paso.jsx'); fs.writeFileSync(f, SER + body);
  try { return execFileSync('osascript', ['-e', `with timeout of ${timeout} seconds`, '-e', 'tell application "Adobe Illustrator"', '-e', `do javascript (POSIX file "${f}")`, '-e', 'end tell', '-e', 'end timeout'], { encoding: 'utf8', timeout: (timeout + 10) * 1000 }).trim(); }
  catch (e) { throw new Anomalia('osascript/Illustrator: ' + String(e.stderr || e.message).trim().slice(0, 300)); } }
const aiJson = (b, t) => { const r = ai(b, t); try { return JSON.parse(r); } catch { throw new Anomalia('respuesta no JSON de Illustrator: ' + r.slice(0, 200)); } };
const estado = () => aiJson('ser({ docs: docs(), activo: activo(), interaccion: String(app.userInteractionLevel), temp: Folder.temp.fsName });');

function preparar() { fs.rmSync(STAGE, { recursive: true, force: true }); fs.mkdirSync(path.join(STAGE, 'docs'), { recursive: true }); const h = {};
  for (const id of ['N0-A', 'N0-B']) { const src = path.join(ROOT, 'tools/illustrator/docs-prueba', DOCS[id].archivo), dst = path.join(STAGE, 'docs', DOCS[id].archivo); fs.copyFileSync(src, dst); if (sha(fs.readFileSync(src)) !== sha(fs.readFileSync(dst))) throw new Anomalia('copia distinta'); h[id] = sha(fs.readFileSync(dst)); }
  const prep = path.join(ROOT, 'tools/illustrator/tesseract_prep_doc.jsx'); fs.copyFileSync(prep, path.join(STAGE, 'prep.jsx')); return h; }
function abrirDoc(id) { const d = DOCS[id];
  const r = aiJson(`var lvl=app.userInteractionLevel; app.userInteractionLevel=UserInteractionLevel.DONTDISPLAYALERTS; var dd; try{ dd=app.open(new File("${STAGE}/docs/${d.archivo}")); } finally { app.userInteractionLevel=lvl; } ser({ nombre: dd.name, activo: activo(), docs: docs() });`);
  if (r.activo !== r.nombre || !r.nombre.startsWith('N0-')) throw new Anomalia('tras abrir, el activo no es el de prueba: ' + JSON.stringify(r));
  const p = ai(`$.global.TESS_PREP_ORDER=${JSON.stringify(d.esLayers)}; var __f=new File("${STAGE}/prep.jsx"); __f.open("r"); var __s=__f.read(); __f.close(); __s=__s.replace(/^#target.*$/m,""); eval(__s);`, 60);
  if (!/^preparado:/.test(p)) throw new Anomalia('preparación: ' + p.slice(0, 200)); return { ...r, preparado: p.slice(0, 120) }; }
function activar(id) { const n = DOCS[id].archivo; return aiJson(`var d=app.documents.getByName("${n}"); if(d.name.indexOf("N0-")!==0) throw new Error("no es de prueba"); app.activeDocument=d; ser({ activo: activo() });`); }
function cerrarPrueba() { const r = []; for (let i = 0; i < 4; i++) { const s = estado(); const n = s.docs.find((x) => x.startsWith('N0-')); if (!n) break;
  try { r.push(aiJson(`var d=app.documents.getByName("${n}"); d.close(SaveOptions.DONOTSAVECHANGES); ser({ cerrado: "${n}", docs: docs() });`, 25)); } catch (e) { if (!/timed out|-1712/.test(e.message)) throw e; r.push({ cerrado: n, respuestaPerdida: true }); } } return r; }

async function panel() { const c = await connect(pickTarget(await listTargets(8089), 'tesseract-v3-experimental')); await c.send('Page.enable').catch(() => {}); return c; }
const errores = (c, desde) => c.events.slice(desde).filter((e) => e.method === 'Runtime.exceptionThrown' || (e.method === 'Runtime.consoleAPICalled' && ['error', 'assert'].includes(e.params.type))).map((e) => e.params.exceptionDetails ? (e.params.exceptionDetails.exception?.description || e.params.exceptionDetails.text) : JSON.stringify(e.params.args.map((a) => a.value)));
async function captura(c, nombre) { try { const r = await c.send('Page.captureScreenshot', { format: 'png' }); const f = path.join(RES, 'capturas', nombre + '.png'); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, Buffer.from(r.data, 'base64')); return path.relative(ROOT, f); } catch (e) { return 'sin captura: ' + e.message; } }
const H = `(() => { const $ = (id) => document.getElementById(id), sleep = (ms) => new Promise((r) => setTimeout(r, ms)); const status = () => $('status-area').textContent;
  const waitFor = async (fn, ms, l) => { const t0 = performance.now(); while (performance.now() - t0 < ms) { const v = fn(); if (v) return v; await sleep(50); } throw new Error('tiempo agotado: ' + l + ' (' + status() + ')'); };
  window.__V = { $, sleep, status, waitFor,
    extraer: async () => { $('extract-btn').click(); await waitFor(() => /Extraction complete|Error|error/.test(status()), 60000, 'extracción'); await sleep(200); return { status: status(), continuar: !$('continue-3d-btn').disabled }; },
    continuar: async () => { $('continue-3d-btn').click(); await waitFor(() => /3D ready|3D error|changed since the extraction|Nothing to build|Could not check/.test(status()), 60000, 'continuar'); await sleep(500); return { status: status(), vista3d: $('three-view').style.display !== 'none', continuarActivo: !$('continue-3d-btn').disabled }; },
    arte: async () => { const a0 = $('art-status').textContent; $('refresh-art-btn').click(); await waitFor(() => /loaded|failed|not applied|No Front/.test($('art-status').textContent) && !/Searching/.test($('art-status').textContent), 90000, 'arte'); await sleep(600); return { arte: $('art-status').textContent, fuente: $('art-source-pill').textContent }; },
    rastrear: () => { if (window.__lib) return; window.__lib = new Set(); const d = THREE.Texture.prototype.dispose; THREE.Texture.prototype.dispose = function () { window.__lib.add(this.uuid); return d.call(this); }; } };
  return true; })()`;

async function preflight() { const s = estado(); const c = await panel(); const id = await c.eval(`(async () => { const s = [...document.scripts].map((x) => x.src).find((u) => /main\\.js/.test(u)); const b = await (await fetch(s)).arrayBuffer();
  const h = [...new Uint8Array(await crypto.subtle.digest('SHA-256', b))].map((x) => x.toString(16).padStart(2, '0')).join(''); return { ext: window.__adobe_cep__.getExtensionId(), host: JSON.parse(window.__adobe_cep__.getHostEnvironment()).appVersion, ua: navigator.userAgent, mainJs: h, modo: window.__tessMotorExperimental.modo() }; })()`);
  await c.close(); const esperado = fs.readFileSync(path.join(ROOT, 'dist-experimental/SHA256SUMS'), 'utf8').split('\n').find((l) => / \.\/main\.js$/.test(l)).slice(0, 64);
  return { illustrator: s, panel: id, mainJsEsperado: esperado, ok: id.ext === EXT && id.mainJs === esperado }; }

async function todo() { fs.mkdirSync(RES, { recursive: true }); fs.mkdirSync(GLBDIR, { recursive: true }); const R = { fecha: new Date().toISOString(), pasos: {} }; const paso = (k, v) => { R.pasos[k] = v; fs.writeFileSync(path.join(RES, 'ultimo.json'), JSON.stringify(R, null, 1)); return v; };
  const inicio = estado(); R.inicio = inicio; if (inicio.docs.length) throw new Anomalia('Illustrator tiene documentos abiertos; la validación exige 0 (no se toca ningún documento del usuario): ' + JSON.stringify(inicio.docs));
  R.copias = preparar(); R.identidad = await preflight(); if (!R.identidad.ok) throw new Anomalia('el panel no es el bundle de producto esperado: ' + JSON.stringify(R.identidad));
  let c = await panel(); const ev = (x) => c.eval(x);
  const artDir = path.join(inicio.temp, 'tesseract_art'); let artDirModo = null;
  try {
    // KI-24 — preset antes de construir, con el panel recién cargado
    await c.send('Page.reload', { ignoreCache: true }); await new Promise((r) => setTimeout(r, 4000)); await c.close(); c = await panel(); await ev(H); await ev(PAGE); let e0 = c.events.length;
    paso('KI24', await ev(`(async () => { const mp = __V.$('material-preset'); mp.value = 'kraft'; mp.dispatchEvent(new Event('change', { bubbles: true })); await __V.sleep(300); return { pill: __V.$('material-pill').textContent, log: __V.$('log-area').textContent.slice(-300), status: __V.status() }; })()`));
    R.pasos.KI24.errores = errores(c, e0); await ev(`(() => { const mp = __V.$('material-preset'); mp.value = 'white'; mp.dispatchEvent(new Event('change', { bubbles: true })); })()`);
    // H-05 — extraer en N0-A, cambiar a N0-B, construir ⇒ rechazado
    paso('abrirA', abrirDoc('N0-A')); e0 = c.events.length; paso('extraerA', await ev('__V.extraer()'));
    paso('abrirB', abrirDoc('N0-B')); paso('H05_continuarConB', await ev('__V.continuar()')); R.pasos.H05_continuarConB.capturas = await captura(c, 'H05-rechazo');
    paso('volverA', activar('N0-A')); paso('extraerA2', await ev('__V.extraer()')); paso('construirA', await ev('__V.continuar()'));
    paso('GLB_sombra_plano', await ev(`window.__F2A3.run('V7', 'v301-sombra-plano')`)); // V7 de f2a3-cep: PNG + GLB con el diálogo sustituido por una ruta en /private/tmp
    await ev(`(async () => { const a = document.querySelector('#fold-panel details.all-creases input[type=range]'); a.value = '60'; a.dispatchEvent(new Event('input', { bubbles: true })); await __V.sleep(400); })()`);
    paso('GLB_sombra_60', await ev(`window.__F2A3.run('V7', 'v301-sombra-60')`)); R.pasos.construirA.capturas = await captura(c, 'sombra-60');
    // H-05 — arte desde otro documento ⇒ no se aplica
    paso('activarB', activar('N0-B')); paso('H05_arteDesdeB', await ev('__V.arte()')); R.pasos.H05_arteDesdeB.capturas = await captura(c, 'H05-arte-rechazado');
    // activo (experimental) sobre N0-A
    paso('volverA2', activar('N0-A')); paso('activarExperimental', await ev(`window.__F2A3.run('V3')`)); paso('construirActivo', await ev(`window.__F2A3.run('V4')`));
    paso('GLB_activo_plano', await ev(`window.__F2A3.run('V7', 'v301-activo-plano')`));
    await ev(`(async () => { const a = document.querySelector('#fold-panel details.all-creases input[type=range]'); a.value = '60'; a.dispatchEvent(new Event('input', { bubbles: true })); await __V.sleep(400); })()`);
    paso('GLB_activo_60', await ev(`window.__F2A3.run('V7', 'v301-activo-60')`)); R.pasos.construirActivo.capturas = await captura(c, 'activo-60');
    await ev(`(async () => { window.__tessMotorExperimental && document.getElementById('tess-exp-motor').querySelector('.tess-exp-desactivar').click(); await __V.sleep(200); })()`);
    // H-03 — N0-B con arte por capas: dos refrescos seguidos; ninguna textura en uso liberada
    paso('activarB2', activar('N0-B')); paso('extraerB', await ev('__V.extraer()')); paso('construirB', await ev('__V.continuar()')); await ev(`__V.waitFor(() => /loaded|No Front|failed/.test(__V.$('art-status').textContent), 60000, 'arte inicial')`);
    await ev('__V.rastrear()'); await ev(`(async () => { const a = document.querySelector('#fold-panel details.all-creases input[type=range]'); a.value = '60'; a.dispatchEvent(new Event('input', { bubbles: true })); await __V.sleep(300); })()`);
    paso('H03_dobleRefresco', await ev(`(async () => { __V.$('refresh-art-btn').click(); await __V.sleep(30); __V.$('refresh-art-btn').click(); await __V.sleep(200);
      await __V.waitFor(() => /loaded|failed/.test(__V.$('art-status').textContent) && !/Searching/.test(__V.$('art-status').textContent), 90000, 'doble refresco'); await __V.sleep(1500);
      return { arte: __V.$('art-status').textContent, liberadas: [...window.__lib].length }; })()`)); // el panel real no expone la escena: la vida de las texturas se prueba en headless
    paso('GLB_sombra_arte_60', await ev(`window.__F2A3.run('V7', 'v301-sombra-arte-60')`)); R.pasos.H03_dobleRefresco.capturas = await captura(c, 'H03-arte-60');
    // H-02 — exportación de arte por mesas con la carpeta temporal sin escritura (Illustrator falla en silencio: KI-37); la mesa activa debe seguir siendo la original
    paso('H02_preparar', aiJson(`var dd=app.activeDocument; if(dd.name.indexOf("N0-")!==0) throw new Error("no es de prueba"); var a0=dd.artboards[0]; var r=a0.artboardRect; var w=r[2]-r[0]; var aF=dd.artboards.add([r[2]+20, r[1], r[2]+20+w, r[3]]); aF.name="Front"; var aB=dd.artboards.add([r[2]+40+w, r[1], r[2]+40+2*w, r[3]]); aB.name="Back"; dd.artboards.setActiveArtboardIndex(0); ser({ mesas: dd.artboards.length, activa: dd.artboards.getActiveArtboardIndex() });`));
    fs.mkdirSync(artDir, { recursive: true }); artDirModo = fs.statSync(artDir).mode & 0o777; fs.chmodSync(artDir, 0o555);
    ai('app.userInteractionLevel=UserInteractionLevel.DONTDISPLAYALERTS; "ok";');
    try { paso('H02_arteFalla', await ev('__V.arte()')); R.pasos.H02_arteFalla.mesaActiva = aiJson('ser({ activa: app.activeDocument.artboards.getActiveArtboardIndex(), nombre: app.activeDocument.artboards[app.activeDocument.artboards.getActiveArtboardIndex()].name });'); }
    finally { fs.chmodSync(artDir, artDirModo); artDirModo = null; ai('app.userInteractionLevel=UserInteractionLevel.DISPLAYALERTS; "ok";'); }
    paso('H02_arteRestaurado', await ev('__V.arte()')); R.pasos.H02_arteRestaurado.mesaActiva = aiJson('ser({ activa: app.activeDocument.artboards.getActiveArtboardIndex() });');
    R.erroresConsola = errores(c, 0);
  } finally {
    if (artDirModo !== null) { try { fs.chmodSync(artDir, artDirModo); } catch {} try { ai('app.userInteractionLevel=UserInteractionLevel.DISPLAYALERTS; "ok";'); } catch {} }
    try { await c.close(); } catch {} R.cierre = cerrarPrueba(); R.fin = estado(); fs.writeFileSync(path.join(RES, 'ultimo.json'), JSON.stringify(R, null, 1));
    if (JSON.stringify(R.fin.docs) !== JSON.stringify(inicio.docs)) throw new Anomalia('la lista de documentos no volvió a la inicial: ' + JSON.stringify(R.fin.docs));
  }
  R.glb = {}; for (const k of ['sombra-plano', 'sombra-60', 'activo-plano', 'activo-60', 'sombra-arte-60']) { const f = path.join(GLBDIR, `f2a3-v301-${k}.glb`); if (!fs.existsSync(f)) { R.glb[k] = { error: 'no existe ' + f }; continue; }
    const b = fs.readFileSync(f); const v = validarGLB(b); R.glb[k] = { sha256: sha(b), bytes: b.length, errores: v.errores, degenerados: v.degenerados, triangulos: v.triangulos, caja_m: cajaGLB(b).size, generador: JSON.parse(b.slice(20, 20 + b.readUInt32LE(12)).toString()).asset.generator }; }
  const f = path.join(RES, `todo-${R.fecha.replace(/[:.]/g, '-')}.json`); fs.writeFileSync(f, JSON.stringify(R, null, 1)); return { archivo: path.relative(ROOT, f), R };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const cmd = process.argv[2];
  (cmd === 'preflight' ? preflight() : cmd === 'todo' ? todo() : Promise.reject(new Error('uso: v301-real.mjs preflight|todo')))
    .then((r) => console.log(JSON.stringify(r.R ? { archivo: r.archivo, pasos: Object.fromEntries(Object.entries(r.R.pasos).map(([k, v]) => [k, v && (v.status || v.arte || v.error || v.activo || 'ok')])), glb: r.R.glb, erroresConsola: r.R.erroresConsola } : r, null, 1)))
    .catch((e) => { console.error('ABORTADO:', e.message); process.exit(1); });
}
