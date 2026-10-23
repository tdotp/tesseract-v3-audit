#!/usr/bin/env node
// Build de Tesseract V3 (A3): empaqueta panel/main.js como UN script clásico (IIFE) para Chromium 99 (CEP 12) y arma una carpeta lista para CEP.
//   node tools/build/build.mjs [--src panel] [--out dist] [--debug-port 8088] [--verify]
// - NO instala nada. Solo escribe dentro de --out, que debe ser una carpeta `dist*` del repo o un directorio temporal del sistema.
// - Determinista: misma fuente + misma versión de esbuild ⇒ mismos bytes (sin marcas de tiempo en main.js ni SHA256SUMS).
// - Cambia SOLO la identidad del manifiesto (bundle id, versión, nombre y menú) para convivir con el plugin instalado.
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import crypto from 'node:crypto'; import { execFileSync } from 'node:child_process'; import { fileURLToPath } from 'node:url';
import * as esbuild from 'esbuild';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const TARGET = 'chrome99';
export const V3_IDS = { bundleId: 'com.tato.tesseract.v3', extensionId: 'com.tato.tesseract.v3.panel', version: '3.0.0', name: 'Tesseract V3', menu: 'Tesseract V3' };
const sha = (buf) => crypto.createHash('sha256').update(buf).digest('hex');
const SKIP = new Set(['.DS_Store', 'main.js.bak']); const isDoc = (n) => /\.md$/i.test(n); // los .md (p. ej. TECH_BRIEF_V1.md) no son parte del paquete CEP

function listFiles(dir) { const out = []; (function walk(d) { for (const e of fs.readdirSync(d, { withFileTypes: true })) { if (SKIP.has(e.name) || isDoc(e.name)) continue; const p = path.join(d, e.name); e.isDirectory() ? walk(p) : out.push(path.relative(dir, p)); } })(dir); return out.sort(); }

export function transformManifest(xml) {
  const rules = [
    ['ExtensionBundleId="com.tato.tesseract"', `ExtensionBundleId="${V3_IDS.bundleId}"`],
    ['ExtensionBundleVersion="0.1.0"', `ExtensionBundleVersion="${V3_IDS.version}"`],
    ['ExtensionBundleName="Tesseract"', `ExtensionBundleName="${V3_IDS.name}"`],
    ['<Extension Id="com.tato.tesseract.panel" Version="0.1.0" />', `<Extension Id="${V3_IDS.extensionId}" Version="${V3_IDS.version}" />`],
    ['<Extension Id="com.tato.tesseract.panel">', `<Extension Id="${V3_IDS.extensionId}">`],
    ['<Menu>Tesseract</Menu>', `<Menu>${V3_IDS.menu}</Menu>`],
  ];
  for (const [from, to] of rules) { const n = xml.split(from).length - 1; if (n !== 1) throw new Error(`manifest: se esperaba exactamente 1 aparición de «${from}», hay ${n}`); xml = xml.replace(from, to); }
  return xml;
}

function safeOut(out) {
  const r = path.resolve(out), tmp = fs.realpathSync(os.tmpdir());
  const underRepoDist = r.startsWith(ROOT + path.sep) && /^dist[\w.-]*$/.test(path.relative(ROOT, r).split(path.sep)[0]);
  const underTmp = r.startsWith(tmp + path.sep) || r.startsWith(os.tmpdir() + path.sep) || r.startsWith('/private' + os.tmpdir() + path.sep);
  if (!underRepoDist && !underTmp) throw new Error(`--out rechazado: «${r}». Solo se permite una carpeta dist* del repo o un directorio temporal`);
  for (const bad of [path.join(ROOT, 'panel'), path.join(ROOT, 'reference'), '/Library', path.join(os.homedir(), 'Library')]) if (r === bad || r.startsWith(bad + path.sep)) throw new Error(`--out rechazado (zona protegida): ${r}`);
  return r;
}

export async function build({ src = process.env.TESS_BUILD_SRC || path.join(ROOT, 'panel'), /* TESS_BUILD_SRC: solo controles negativos */ out = path.join(ROOT, 'dist'), debugPort = null } = {}) {
  src = path.resolve(src); out = safeOut(out);
  if (!fs.existsSync(path.join(src, 'main.js'))) throw new Error('no existe ' + path.join(src, 'main.js'));
  fs.rmSync(out, { recursive: true, force: true }); fs.mkdirSync(out, { recursive: true });
  const srcMain = fs.readFileSync(path.join(src, 'main.js')); const srcHash = sha(srcMain);
  const banner = `/* Tesseract V3 · bundle IIFE · fuente main.js sha256:${srcHash.slice(0, 16)} · esbuild ${esbuild.version} · target ${TARGET} · NO editar a mano (tools/build/build.mjs) */`;
  const res = await esbuild.build({ entryPoints: [path.join(src, 'main.js')], bundle: true, format: 'iife', target: TARGET, platform: 'browser', minify: false, charset: 'utf8', legalComments: 'inline', banner: { js: banner },
    write: false, outfile: path.join(out, 'main.js'), logLevel: 'silent', sourcemap: false });
  if (res.warnings.length || res.errors.length) throw new Error('esbuild: ' + JSON.stringify([...res.errors, ...res.warnings].map((m) => m.text)));
  fs.writeFileSync(path.join(out, 'main.js'), res.outputFiles[0].contents);
  for (const rel of listFiles(src)) { if (rel === 'main.js') continue; const to = path.join(out, rel); fs.mkdirSync(path.dirname(to), { recursive: true });
    if (rel === path.join('CSXS', 'manifest.xml')) fs.writeFileSync(to, transformManifest(fs.readFileSync(path.join(src, rel), 'utf8'))); else fs.copyFileSync(path.join(src, rel), to); }
  if (debugPort) fs.writeFileSync(path.join(out, '.debug'), `<?xml version="1.0" encoding="UTF-8"?>\n<ExtensionList><Extension Id="${V3_IDS.extensionId}"><HostList><Host Name="ILST" Port="${Number(debugPort)}"/></HostList></Extension></ExtensionList>\n`);
  const files = listFiles(out).concat(debugPort ? ['.debug'] : []).filter((f) => !['SHA256SUMS', 'BUILD_INFO.json'].includes(f)); const uniq = [...new Set(files)].sort();
  const sums = uniq.map((f) => `${sha(fs.readFileSync(path.join(out, f)))}  ./${f}`).join('\n') + '\n'; fs.writeFileSync(path.join(out, 'SHA256SUMS'), sums);
  let commit = null, dirty = null; try { commit = execFileSync('git', ['-C', ROOT, 'rev-parse', '--short', 'HEAD'], { encoding: 'utf8' }).trim(); dirty = execFileSync('git', ['-C', ROOT, 'status', '--porcelain'], { encoding: 'utf8' }).trim() !== ''; } catch {}
  const info = { producto: 'Tesseract V3 (A3: bundle sin refactorización; el código es el de panel/main.js)', herramientas: { node: process.version, esbuild: esbuild.version, target: TARGET, formato: 'iife', minify: false },
    fuente: { carpeta: path.relative(ROOT, src) || '.', main_js_sha256: srcHash, main_js_bytes: srcMain.length }, identidad: V3_IDS, depuracion: debugPort ? { puerto: Number(debugPort), nota: '.debug solo para validación; NO distribuir' } : null,
    salida: Object.fromEntries(uniq.map((f) => [f, { sha256: sha(fs.readFileSync(path.join(out, f))), bytes: fs.statSync(path.join(out, f)).size }])), repo: { commit, con_cambios_sin_confirmar: dirty }, instalado: false };
  fs.writeFileSync(path.join(out, 'BUILD_INFO.json'), JSON.stringify(info, null, 1) + '\n');
  return { out, info, sums };
}

export function verifyDir(dir) { // comprueba SHA256SUMS contra los archivos reales; devuelve lista de problemas
  const problems = []; const sumsFile = path.join(dir, 'SHA256SUMS'); if (!fs.existsSync(sumsFile)) return ['falta SHA256SUMS'];
  const listed = new Set();
  for (const line of fs.readFileSync(sumsFile, 'utf8').trim().split('\n')) { const [h, f] = [line.slice(0, 64), line.slice(66).replace(/^\.\//, '')]; listed.add(f); const p = path.join(dir, f);
    if (!fs.existsSync(p)) problems.push('falta ' + f); else if (sha(fs.readFileSync(p)) !== h) problems.push('huella distinta: ' + f); }
  for (const f of listFiles(dir).concat(fs.existsSync(path.join(dir, '.debug')) ? ['.debug'] : [])) if (!listed.has(f) && !['SHA256SUMS', 'BUILD_INFO.json'].includes(f)) problems.push('archivo no listado: ' + f);
  return problems;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const a = process.argv.slice(2); const get = (k) => (a.includes(k) ? a[a.indexOf(k) + 1] : null);
  try {
    if (a.includes('--verify')) { // dist/ coincide con SHA256SUMS y con una reconstrucción limpia
      const dist = path.resolve(get('--out') || path.join(ROOT, 'dist')); const p1 = verifyDir(dist);
      const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'tess-verify-')); const { sums } = await build({ src: get('--src') || process.env.TESS_BUILD_SRC || path.join(ROOT, 'panel'), out: path.join(tmp, 'dist') });
      const same = fs.existsSync(path.join(dist, 'SHA256SUMS')) && fs.readFileSync(path.join(dist, 'SHA256SUMS'), 'utf8') === sums; fs.rmSync(tmp, { recursive: true, force: true });
      if (p1.length || !same) { console.error('VERIFICACIÓN FALLIDA', p1, same ? '' : '· dist/ no coincide con una reconstrucción limpia'); process.exit(1); }
      console.log('OK: dist/ íntegro y reproducible'); process.exit(0);
    }
    const r = await build({ src: get('--src') || process.env.TESS_BUILD_SRC || path.join(ROOT, 'panel'), out: get('--out') || path.join(ROOT, 'dist'), debugPort: get('--debug-port') });
    console.log(`Build OK → ${path.relative(process.cwd(), r.out) || r.out}  (${Object.keys(r.info.salida).length} archivos, main.js ${r.info.salida['main.js'].bytes} B, esbuild ${r.info.herramientas.esbuild}, target ${TARGET})\nNo se instaló nada.`);
  } catch (e) { console.error('ERROR:', e.message); process.exit(1); }
}
