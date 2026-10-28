#!/usr/bin/env node
// Build EXPERIMENTAL de Tesseract V3 (F2A-3 · I-3): el MISMO src/main.js y la MISMA configuración de esbuild que tools/build/build.mjs
// (IIFE, chrome99, sin minificar), con una única diferencia: el import './core/engine.js' de src/main.js se resuelve a
// experimental/integracion/entrada-cep.js (selector legacy/experimental; modo SOMBRA por defecto). src/ no cambia y el bundle normal
// (dist/, huella tests/golden/dist-a9.SHA256SUMS) no se toca: este script nunca escribe en dist/.
//   node tools/build/build-experimental.mjs [--out dist-experimental] [--debug-port 8089] [--verify]
// - NO instala nada. Solo escribe en una carpeta dist-experimental* del repo (ignorada por git) o en un directorio temporal del sistema.
// - Identidad CEP PROPIA (com.tato.tesseract.v3.experimental.panel, menú «Tesseract V3 (experimental)»): nunca sustituye al plugin
//   original ni a la instalación normal de V3.
// - Determinista: misma fuente + misma versión de esbuild ⇒ mismos bytes.
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import crypto from 'node:crypto'; import { execFileSync } from 'node:child_process'; import { fileURLToPath } from 'node:url';
import * as esbuild from 'esbuild';
import { TARGET, DEFAULT_ENTRY, DEFAULT_ASSETS, verifyDir } from './build.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const EXP_IDS = { bundleId: 'com.tato.tesseract.v3.experimental', extensionId: 'com.tato.tesseract.v3.experimental.panel', version: '3.0.0', name: 'Tesseract V3 (experimental)', menu: 'Tesseract V3 (experimental)' };
export const MODULO_SUSTITUIDO = './core/engine.js';
export const ENTRADA_EXPERIMENTAL = path.join(ROOT, 'experimental', 'integracion', 'entrada-cep.js');
export const DEFAULT_OUT = path.join(ROOT, 'dist-experimental');
const sha = (buf) => crypto.createHash('sha256').update(buf).digest('hex');
const SKIP = new Set(['.DS_Store', 'main.js.bak']); const isDoc = (n) => /\.md$/i.test(n);
function listFiles(dir) { const out = []; (function walk(d) { for (const e of fs.readdirSync(d, { withFileTypes: true })) { if (SKIP.has(e.name) || isDoc(e.name)) continue; const p = path.join(d, e.name); e.isDirectory() ? walk(p) : out.push(path.relative(dir, p)); } })(dir); return out.sort(); }

export function transformManifestExperimental(xml) { // mismas 6 reglas que transformManifest de build.mjs, con la identidad experimental
  const rules = [
    ['ExtensionBundleId="com.tato.tesseract"', `ExtensionBundleId="${EXP_IDS.bundleId}"`],
    ['ExtensionBundleVersion="0.1.0"', `ExtensionBundleVersion="${EXP_IDS.version}"`],
    ['ExtensionBundleName="Tesseract"', `ExtensionBundleName="${EXP_IDS.name}"`],
    ['<Extension Id="com.tato.tesseract.panel" Version="0.1.0" />', `<Extension Id="${EXP_IDS.extensionId}" Version="${EXP_IDS.version}" />`],
    ['<Extension Id="com.tato.tesseract.panel">', `<Extension Id="${EXP_IDS.extensionId}">`],
    ['<Menu>Tesseract</Menu>', `<Menu>${EXP_IDS.menu}</Menu>`],
  ];
  for (const [from, to] of rules) { const n = xml.split(from).length - 1; if (n !== 1) throw new Error(`manifest: se esperaba exactamente 1 aparición de «${from}», hay ${n}`); xml = xml.replace(from, to); }
  return xml;
}

export function safeOutExperimental(out) {
  const r = path.resolve(out), tmp = fs.realpathSync(os.tmpdir());
  const underRepo = r.startsWith(ROOT + path.sep) && /^dist-experimental[\w.-]*$/.test(path.relative(ROOT, r).split(path.sep)[0]);
  const underTmp = r.startsWith(tmp + path.sep) || r.startsWith(os.tmpdir() + path.sep) || r.startsWith('/private' + os.tmpdir() + path.sep);
  if (!underRepo && !underTmp) throw new Error(`--out rechazado: «${r}». Solo se permite una carpeta dist-experimental* del repo o un directorio temporal (nunca dist/)`);
  for (const bad of [path.join(ROOT, 'dist'), path.join(ROOT, 'panel'), path.join(ROOT, 'reference'), path.join(ROOT, 'src'), '/Library', path.join(os.homedir(), 'Library')]) if (r === bad || r.startsWith(bad + path.sep)) throw new Error(`--out rechazado (zona protegida): ${r}`);
  return r;
}

// redirigir=false: control de paridad (misma configuración SIN sustituir el motor ⇒ el main.js del bundle normal, salvo la cabecera)
export async function construirExperimental({ entry = DEFAULT_ENTRY, assets = DEFAULT_ASSETS, out = DEFAULT_OUT, redirigir = true, debugPort = null } = {}) {
  entry = path.resolve(entry); assets = path.resolve(assets); out = safeOutExperimental(out);
  if (!fs.existsSync(entry)) throw new Error('no existe ' + entry);
  fs.rmSync(out, { recursive: true, force: true }); fs.mkdirSync(out, { recursive: true });
  const srcMain = fs.readFileSync(entry); const srcHash = sha(srcMain); const redirecciones = [];
  const banner = redirigir
    ? `/* Tesseract V3 EXPERIMENTAL · bundle IIFE · fuente main.js sha256:${srcHash.slice(0, 16)} · motor: selector F2A-3 (experimental/integracion/entrada-cep.js en lugar de ${MODULO_SUSTITUIDO}; modo SOMBRA por defecto) · esbuild ${esbuild.version} · target ${TARGET} · NO editar a mano (tools/build/build-experimental.mjs) */`
    : `/* Tesseract V3 · bundle IIFE · fuente main.js sha256:${srcHash.slice(0, 16)} · esbuild ${esbuild.version} · target ${TARGET} · NO editar a mano (tools/build/build.mjs) */`;
  const selector = { name: 'tesseract-f2a3-selector', setup(b) { b.onResolve({ filter: /^\.\/core\/engine\.js$/ }, (args) => {
    if (!redirigir || path.resolve(args.importer) !== entry) return undefined; redirecciones.push(path.relative(ROOT, args.importer)); return { path: ENTRADA_EXPERIMENTAL }; }); } };
  const res = await esbuild.build({ entryPoints: [entry], bundle: true, format: 'iife', target: TARGET, platform: 'browser', minify: false, charset: 'utf8', legalComments: 'inline', banner: { js: banner },
    write: false, outfile: path.join(out, 'main.js'), logLevel: 'silent', sourcemap: false, metafile: true, plugins: [selector] });
  if (res.warnings.length || res.errors.length) throw new Error('esbuild: ' + JSON.stringify([...res.errors, ...res.warnings].map((m) => m.text)));
  const entradas = Object.keys(res.metafile.inputs).map((f) => path.relative(ROOT, path.resolve(f)));
  const experimentales = entradas.filter((f) => f.startsWith('experimental' + path.sep)).sort();
  if (redirigir) { if (redirecciones.length !== 1) throw new Error(`se esperaba exactamente 1 sustitución de ${MODULO_SUSTITUIDO} (desde src/main.js), hubo ${redirecciones.length}`);
    for (const f of ['experimental/integracion/entrada-cep.js', 'experimental/integracion/selector.js', 'experimental/integracion/motor-v1.js', 'src/core/engine.js']) if (!entradas.includes(f.split('/').join(path.sep))) throw new Error('falta en el bundle: ' + f); }
  else if (experimentales.length) throw new Error('control de paridad con código experimental: ' + experimentales.join(', '));
  fs.writeFileSync(path.join(out, 'main.js'), res.outputFiles[0].contents);
  for (const rel of listFiles(assets)) { if (rel === 'main.js') continue; const to = path.join(out, rel); fs.mkdirSync(path.dirname(to), { recursive: true });
    if (rel === path.join('CSXS', 'manifest.xml')) fs.writeFileSync(to, transformManifestExperimental(fs.readFileSync(path.join(assets, rel), 'utf8'))); else fs.copyFileSync(path.join(assets, rel), to); }
  if (debugPort) fs.writeFileSync(path.join(out, '.debug'), `<?xml version="1.0" encoding="UTF-8"?>\n<ExtensionList><Extension Id="${EXP_IDS.extensionId}"><HostList><Host Name="ILST" Port="${Number(debugPort)}"/></HostList></Extension></ExtensionList>\n`);
  const uniq = [...new Set(listFiles(out).concat(debugPort ? ['.debug'] : []).filter((f) => !['SHA256SUMS', 'BUILD_INFO.json'].includes(f)))].sort();
  const sums = uniq.map((f) => `${sha(fs.readFileSync(path.join(out, f)))}  ./${f}`).join('\n') + '\n'; fs.writeFileSync(path.join(out, 'SHA256SUMS'), sums);
  let commit = null, dirty = null; try { commit = execFileSync('git', ['-C', ROOT, 'rev-parse', '--short', 'HEAD'], { encoding: 'utf8' }).trim(); dirty = execFileSync('git', ['-C', ROOT, 'status', '--porcelain'], { encoding: 'utf8' }).trim() !== ''; } catch {}
  const info = { producto: 'Tesseract V3 EXPERIMENTAL (bundle IIFE; mismo src/main.js que el bundle normal; motor = selector F2A-3)', herramientas: { node: process.version, esbuild: esbuild.version, target: TARGET, formato: 'iife', minify: false },
    fuente: { entrada: path.relative(ROOT, entry) || entry, estaticos: path.relative(ROOT, assets) || '.', main_js_sha256: srcHash, main_js_bytes: srcMain.length },
    motor: redirigir ? { modulo_sustituido: MODULO_SUSTITUIDO, sustituido_por: path.relative(ROOT, ENTRADA_EXPERIMENTAL), sustituciones: redirecciones, modo_predeterminado: 'sombra', control: '__tessMotorExperimental', modulos_experimentales: experimentales } : { control_de_paridad: true },
    identidad: EXP_IDS, depuracion: debugPort ? { puerto: Number(debugPort), nota: '.debug solo para validación; NO distribuir' } : null,
    salida: Object.fromEntries(uniq.map((f) => [f, { sha256: sha(fs.readFileSync(path.join(out, f))), bytes: fs.statSync(path.join(out, f)).size }])), repo: { commit, con_cambios_sin_confirmar: dirty }, instalado: false };
  fs.writeFileSync(path.join(out, 'BUILD_INFO.json'), JSON.stringify(info, null, 1) + '\n');
  return { out, info, sums, entradas };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const a = process.argv.slice(2); const get = (k) => (a.includes(k) ? a[a.indexOf(k) + 1] : null);
  try {
    if (a.includes('--verify')) { // la carpeta coincide con su SHA256SUMS y con una reconstrucción limpia
      const dir = path.resolve(get('--out') || DEFAULT_OUT); const p1 = verifyDir(dir); const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'tess-verify-exp-'));
      const { sums } = await construirExperimental({ out: path.join(tmp, 'dist-experimental'), debugPort: fs.existsSync(path.join(dir, '.debug')) ? get('--debug-port') : null });
      const same = fs.existsSync(path.join(dir, 'SHA256SUMS')) && fs.readFileSync(path.join(dir, 'SHA256SUMS'), 'utf8') === sums; fs.rmSync(tmp, { recursive: true, force: true });
      if (p1.length || !same) { console.error('VERIFICACIÓN FALLIDA', p1, same ? '' : '· no coincide con una reconstrucción limpia'); process.exit(1); }
      console.log(`OK: ${path.relative(process.cwd(), dir) || dir} íntegro y reproducible`); process.exit(0);
    }
    const r = await construirExperimental({ out: get('--out') || DEFAULT_OUT, debugPort: get('--debug-port') });
    console.log(`Build EXPERIMENTAL OK → ${path.relative(process.cwd(), r.out) || r.out}  (${Object.keys(r.info.salida).length} archivos, main.js ${r.info.salida['main.js'].bytes} B, ${r.info.motor.modulos_experimentales.length} módulos experimentales, id ${EXP_IDS.extensionId})\nNo se instaló nada. El bundle normal (dist/) no se tocó.`);
  } catch (e) { console.error('ERROR:', e.message); process.exit(1); }
}
