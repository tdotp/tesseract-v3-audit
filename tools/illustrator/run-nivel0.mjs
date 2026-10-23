#!/usr/bin/env node
// Orquestador del Nivel 0 sobre Adobe Illustrator REAL (macOS, AppleScript `do javascript`). Solo para los 6 documentos de prueba desechables.
//   node tools/illustrator/run-nivel0.mjs preflight   solo lectura: permiso de Automatización y estado de documentos abiertos
//   node tools/illustrator/run-nivel0.mjs minimal     las 7 ejecuciones mínimas (N0-A survey+extract · N0-B survey+extract+art · N0-C survey+extract)
//   node tools/illustrator/run-nivel0.mjs rest        el resto: N0-D, N0-F, N0-G (survey+extract) y los pasos opcionales sobre N0-B (artboards Front/Back; capa oculta/bloqueada)
// Garantías (aborta ante cualquier anomalía):
//   · trabaja con COPIAS de los scripts y de los SVG en /tmp (se verifica su SHA-256 contra el repo); nunca abre ni modifica documentos de trabajo
//   · antes de cada ejecución comprueba que el documento ACTIVO es de prueba (nombre N0-*); tras cada una exige `_integridad.identicos === true` y que el guardián no haya tenido que restaurar nada
//   · los documentos de prueba se cierran SIN guardar; al final la lista de documentos abiertos debe ser idéntica a la inicial
//   · no instala nada y no toca la extensión instalada; salida de JSON en /tmp/Tesseract_Nivel0 (se copian a tests/results/nivel0-real)
import fs from 'node:fs'; import path from 'node:path'; import crypto from 'node:crypto'; import { execFileSync } from 'node:child_process'; import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..'); const STAGE = '/tmp/Tesseract_Nivel0_run'; const OUT = '/tmp/Tesseract_Nivel0'; const RES = path.join(ROOT, 'tests/results/nivel0-real');
const SCRIPTS = { survey: 'tesseract_doc_survey.jsx', extract: 'tesseract_extract_check.jsx', art: 'tesseract_art_check.jsx', prep: 'tesseract_prep_doc.jsx' };
const DOCS = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools/illustrator/docs-prueba/expected.json'), 'utf8')).docs;
const sha = (f) => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex'); const log = []; const note = (o) => { log.push({ t: new Date().toISOString(), ...o }); fs.mkdirSync(RES, { recursive: true }); fs.writeFileSync(path.join(RES, `run-log-${process.argv[2] || 'preflight'}.json`), JSON.stringify(log, null, 1)); console.log(' ', JSON.stringify(o).slice(0, 300)); };
class Anomaly extends Error {}

const PRELUDE = `function ser(v){ if(v===null||typeof v==="undefined") return "null"; if(typeof v==="boolean") return v?"true":"false"; if(typeof v==="number") return isFinite(v)?String(v):"null";
 if(typeof v==="string") return '"'+v.replace(/\\\\/g,"\\\\\\\\").replace(/"/g,'\\\\"').replace(/\\n/g,"\\\\n").replace(/\\r/g,"\\\\r")+'"'; if(v instanceof Array){ var a=[]; for(var i=0;i<v.length;i++) a.push(ser(v[i])); return "["+a.join(",")+"]"; }
 var p=[]; for(var k in v){ if(v.hasOwnProperty(k)) p.push(ser(String(k))+":"+ser(v[k])); } return "{"+p.join(",")+"}"; }
function snap(){ var o={ n:app.documents.length, docs:[], activo:null, interaccion:String(app.userInteractionLevel) }; for(var i=0;i<app.documents.length;i++){ var d=app.documents[i], s=null; try{ s=d.saved; }catch(e){} o.docs.push({ nombre:d.name, guardado:s }); } if(app.documents.length) o.activo=app.activeDocument.name; return o; }
`;
function ai(body, timeout = 150) { // ejecuta JSX en Illustrator y devuelve el texto del último valor
  fs.mkdirSync(STAGE, { recursive: true }); const f = path.join(STAGE, 'step.jsx'); fs.writeFileSync(f, PRELUDE + body);
  try { return execFileSync('osascript', ['-e', `with timeout of ${timeout} seconds`, '-e', 'tell application "Adobe Illustrator"', '-e', `do javascript (POSIX file "${f}")`, '-e', 'end tell', '-e', 'end timeout'], { encoding: 'utf8', timeout: (timeout + 20) * 1000, killSignal: 'SIGKILL' }).trim(); }
  catch (e) { throw new Anomaly('osascript/Illustrator: ' + String(e.stderr || e.message).trim().slice(0, 400)); } }
const aiJson = (body, t) => { const r = ai(body, t); try { return JSON.parse(r); } catch { throw new Anomaly('respuesta no JSON de Illustrator: ' + r.slice(0, 300)); } };

function stage() { // copias en /tmp con verificación de huellas
  fs.rmSync(STAGE, { recursive: true, force: true }); fs.mkdirSync(path.join(STAGE, 'scripts'), { recursive: true }); fs.mkdirSync(path.join(STAGE, 'docs'), { recursive: true }); const hashes = {};
  for (const f of Object.values(SCRIPTS)) { const src = path.join(ROOT, 'tools/illustrator', f), dst = path.join(STAGE, 'scripts', f); fs.copyFileSync(src, dst); if (sha(src) !== sha(dst)) throw new Anomaly('copia distinta: ' + f); hashes[f] = sha(src); }
  for (const d of Object.values(DOCS)) { const src = path.join(ROOT, 'tools/illustrator/docs-prueba', d.archivo), dst = path.join(STAGE, 'docs', d.archivo); fs.copyFileSync(src, dst); if (sha(src) !== sha(dst)) throw new Anomaly('copia distinta: ' + d.archivo); hashes[d.archivo] = sha(src); }
  note({ paso: 'staging', carpeta: STAGE, sha256: hashes }); return hashes; }

const snapshot = () => aiJson('ser(snap());');
function sameSnapshots(a, b) { return JSON.stringify(a.docs) === JSON.stringify(b.docs) && a.activo === b.activo && a.interaccion === b.interaccion; }
function openDoc(id) { const d = DOCS[id]; const r = aiJson(`var lvl=app.userInteractionLevel; app.userInteractionLevel=UserInteractionLevel.DONTDISPLAYALERTS; var dd; try{ dd=app.open(new File("${STAGE}/docs/${d.archivo}")); } finally { app.userInteractionLevel=lvl; }
  ser({ nombre: dd.name, activo: app.activeDocument.name, n: app.documents.length, interaccion: String(app.userInteractionLevel), artboards: dd.artboards.length, capas: dd.layers.length });`);
  if (r.activo !== r.nombre || !r.nombre.startsWith('N0-')) throw new Anomaly('tras abrir, el documento activo no es el de prueba: ' + JSON.stringify(r)); note({ paso: 'abrir', doc: id, ...r }); return r; }
function closeActiveTest() { // Observado: Illustrator cierra el documento pero la RESPUESTA del AppleEvent puede no llegar; se limita el tiempo y se verifica por instantánea
  let lost = false; let r = null;
  try { r = aiJson(`var dd=app.activeDocument; if(dd.name.indexOf("N0-")!==0) throw new Error("el documento activo NO es de prueba: "+dd.name); var nombre=dd.name; dd.close(SaveOptions.DONOTSAVECHANGES); var s=snap(); s.cerrado=nombre; ser(s);`, 25); }
  catch (e) { if (!/ETIMEDOUT|timed out|-1712/.test(e.message)) throw e; lost = true; spawnPkill(); r = snapshot(); }
  note({ paso: 'cerrar sin guardar', respuestaPerdida: lost, ...r }); return r; }
function spawnPkill() { try { execFileSync('pkill', ['osascript']); } catch {} }
function prepDoc(id) { const order = DOCS[id].esLayers; const out = ai(`$.global.TESS_PREP_ORDER=${JSON.stringify(order)}; var __f=new File("${STAGE}/scripts/${SCRIPTS.prep}"); __f.open("r"); var __src=__f.read(); __f.close(); __src=__src.replace(/^#target.*$/m,""); eval(__src);`, 60);
  if (!/^preparado:/.test(out)) throw new Anomaly('la preparación no terminó bien: ' + out.slice(0, 300)); note({ paso: 'preparar documento desechable (grupos → capas)', doc: id, resultado: out }); return out; }
function runScript(kind, label = kind) { // guardia 1: el documento activo debe ser de prueba; guardia 2: leer el JSON y exigir integridad
  const active = aiJson(`ser({ activo: app.activeDocument.name, n: app.documents.length });`); if (!active.activo.startsWith('N0-')) throw new Anomaly('el documento activo NO es de prueba: ' + active.activo);
  const t0 = Date.now(); const ret = ai(`$.global.TESS_NO_ALERT=true; $.global.TESS_OUT_DIR="${OUT}"; var __f=new File("${STAGE}/scripts/${SCRIPTS[kind]}"); __f.open("r"); var __src=__f.read(); __f.close(); __src=__src.replace(/^#target.*$/m,""); eval(__src); "ok";`, 240);
  if (ret !== 'ok') throw new Anomaly('el script no devolvió ok: ' + ret.slice(0, 200)); const file = path.join(OUT, `${active.activo.replace(/[^A-Za-z0-9_\-\.]+/g, '_')}__${kind === 'survey' ? 'survey' : kind}.json`);
  if (!fs.existsSync(file)) throw new Anomaly('no se escribió ' + file); const j = JSON.parse(fs.readFileSync(file, 'utf8')); const ig = j._integridad;
  note({ paso: 'script', script: kind, etiqueta: label, doc: active.activo, ms: Date.now() - t0, archivo: path.basename(file), identicos: ig.identicos, restaurado: ig.restaurado, seleccionRestaurada: ig.seleccionRestaurada, error: j._resultado && j._resultado.error ? String(j._resultado.error).slice(0, 160) : null });
  const dest = label === kind ? file : file.replace(`__${kind}.json`, `__${label}.json`); if (dest !== file) { fs.renameSync(file, dest); }
  if (ig.identicos !== true) throw new Anomaly('RESTAURACIÓN FALLIDA: el estado no es idéntico antes/después en ' + path.basename(file));
  if (ig.restaurado && ig.restaurado.length) throw new Anomaly('comportamiento no previsto: el guardián tuvo que restaurar ' + JSON.stringify(ig.restaurado) + ' en ' + path.basename(file));
  return j; }

async function withDoc(id, pre, fn) { const before = snapshot(); if (before.docs.some((d) => d.nombre.startsWith('N0-'))) throw new Anomaly('ya hay un documento N0-* abierto: ' + JSON.stringify(before.docs)); openDoc(id);
  try { prepDoc(id); if (pre) pre(); fn(); } finally { try { const s = closeActiveTest(); if (!sameSnapshots(before, s)) throw new Anomaly('al cerrar, el estado de documentos NO coincide con el inicial: ' + JSON.stringify({ antes: before, despues: s })); } catch (e) { if (e instanceof Anomaly) throw e; throw new Anomaly('error al cerrar: ' + e.message); } } }

const MIN = [['N0-A', ['survey', 'extract']], ['N0-B', ['survey', 'extract', 'art']], ['N0-C', ['survey', 'extract']]];
const REST = [['N0-D', ['survey', 'extract']], ['N0-F', ['survey', 'extract']], ['N0-G', ['survey', 'extract']]];
const cmd = process.argv[2];
async function main() {
  if (!['preflight', 'minimal', 'rest'].includes(cmd)) { console.error('uso: run-nivel0.mjs preflight|minimal|rest'); process.exit(2); }
  const hashes = stage(); fs.mkdirSync(OUT, { recursive: true }); const start = snapshot(); note({ paso: 'estado inicial de Illustrator', ...start });
  const ver = ai('app.version + " | " + $.version + " | " + $.os;'); note({ paso: 'versión', illustrator_extendscript_so: ver });
  if (cmd === 'preflight') { console.log('PREFLIGHT OK: permiso de Automatización concedido y estado leído (solo lectura).'); return; }
  if (cmd === 'minimal') for (const [id, kinds] of MIN) await withDoc(id, null, () => { for (const k of kinds) runScript(k); });
  if (cmd === 'rest') {
    for (const [id, kinds] of REST) await withDoc(id, null, () => { for (const k of kinds) runScript(k); });
    // Opcional 1: artboards Front/Back en N0-B (modo artboards del script de arte)
    await withDoc('N0-B', () => { const r = aiJson(`var dd=app.activeDocument; var a0=dd.artboards[0]; var r=a0.artboardRect; var w=r[2]-r[0]; a0.name="Front"; var a1=dd.artboards.add([r[2]+20, r[1], r[2]+20+w, r[3]]); a1.name="Back"; ser({ artboards: dd.artboards.length, nombres: [dd.artboards[0].name, dd.artboards[1].name] });`); note({ paso: 'preparar artboards Front/Back (documento desechable)', ...r }); }, () => { runScript('survey', 'survey-artboards'); runScript('art', 'art-artboards'); });
    // Opcional 2: capa Creases oculta y Cuts bloqueada en N0-B (extractor lee igual)
    await withDoc('N0-B', () => { const r = aiJson(`var dd=app.activeDocument; dd.layers.getByName("Creases").visible=false; dd.layers.getByName("Cuts").locked=true; ser({ creasesVisible: dd.layers.getByName("Creases").visible, cutsLocked: dd.layers.getByName("Cuts").locked });`); note({ paso: 'preparar capa oculta/bloqueada (documento desechable)', ...r }); }, () => { runScript('extract', 'extract-oculta-bloqueada'); });
  }
  const end = snapshot(); if (!sameSnapshots(start, end)) throw new Anomaly('estado final distinto del inicial: ' + JSON.stringify({ start, end })); note({ paso: 'estado final = inicial', ok: true, docs: end.docs });
  fs.mkdirSync(RES, { recursive: true }); for (const f of fs.readdirSync(OUT)) fs.copyFileSync(path.join(OUT, f), path.join(RES, f)); fs.writeFileSync(path.join(RES, `huellas-${cmd}.json`), JSON.stringify(hashes, null, 1)); console.log(`NIVEL 0 (${cmd}) COMPLETADO SIN ANOMALÍAS. JSON en ${RES}`);
}
main().catch((e) => { note({ paso: 'ABORTADO', anomalia: e.message }); console.error('\nABORTADO:', e.message); try { const s = aiJson('ser(snap());'); note({ paso: 'estado tras abortar', ...s }); if (s.activo && s.activo.startsWith('N0-')) { const c = closeActiveTest(); note({ paso: 'limpieza: documento de prueba cerrado sin guardar', ...c }); } } catch (e2) { console.error('(no se pudo limpiar automáticamente:', e2.message, ')'); } process.exit(1); });
