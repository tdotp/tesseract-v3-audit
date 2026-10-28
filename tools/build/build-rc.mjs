#!/usr/bin/env node
// Release candidate de Tesseract V3 para EVALUACIÓN (no es una publicación estable). Construye el bundle experimental (selector legacy/experimental,
// modo SOMBRA por defecto; identidad CEP com.tato.tesseract.v3.experimental.panel) DESDE UN COMMIT CONCRETO (git archive en un temporal), de modo que
// el artefacto es reproducible byte a byte desde ese commit aunque después haya commits de documentación.
//   node tools/build/build-rc.mjs --commit <sha> [--version 3.0.0-rc.1] [--out release]     construye release/tesseract-v3-<versión>/ y su .zip
//   node tools/build/build-rc.mjs --commit <sha> --verify                                    reconstruye en un temporal y compara con lo existente
// Contenido: extension/ (carpeta CEP lista para instalar con tools/a4/a4-experimental.sh o empaquetar como ZXP firmado), RELEASE.json, LEEME.txt, SHA256SUMS
// y el .zip determinista (orden fijo, fecha fija, permisos fijos). NO instala, NO firma y NO distribuye nada.
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import crypto from 'node:crypto'; import { execFileSync } from 'node:child_process'; import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const VERSION_RC = '3.0.0-rc.1';
const sha = (b) => crypto.createHash('sha256').update(b).digest('hex');
const listar = (d) => { const out = []; (function w(x) { for (const e of fs.readdirSync(x, { withFileTypes: true }).sort((a, b) => (a.name < b.name ? -1 : 1))) { const p = path.join(x, e.name); e.isDirectory() ? w(p) : out.push(path.relative(d, p).split(path.sep).join('/')); } })(d); return out.sort(); };
const ZIP_PY = `import sys, zipfile, os
src, dst = sys.argv[1], sys.argv[2]; files = sys.argv[3:]
with zipfile.ZipFile(dst, 'w', zipfile.ZIP_DEFLATED, compresslevel=9) as z:
    for f in files:
        i = zipfile.ZipInfo(f, date_time=(2026, 10, 28, 0, 0, 0)); i.external_attr = 0o644 << 16; i.compress_type = zipfile.ZIP_DEFLATED; i.create_system = 3
        z.writestr(i, open(os.path.join(src, f), 'rb').read(), compresslevel=9)
`;

export async function construirRC({ commit, version = VERSION_RC, out = path.join(ROOT, 'release') } = {}) {
  if (!/^[0-9a-f]{7,40}$/.test(String(commit || ''))) throw new Error('--commit <sha> obligatorio (el RC se construye desde un commit concreto)');
  const completo = execFileSync('git', ['-C', ROOT, 'rev-parse', '--verify', commit + '^{commit}'], { encoding: 'utf8' }).trim();
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'tess-rc-')); const arbol = path.join(tmp, 'arbol'); fs.mkdirSync(arbol);
  try {
    execFileSync('/bin/sh', ['-c', `git -C "${ROOT}" archive ${completo} src panel experimental tools/build package.json | tar -x -C "${arbol}"`]); fs.symlinkSync(path.join(ROOT, 'node_modules'), path.join(arbol, 'node_modules'));
    const B = await import(pathToFileURL(path.join(arbol, 'tools/build/build-experimental.mjs')).href); const ext = path.join(tmp, 'extension');
    // Con cwd = el árbol archivado (esbuild escribe rutas relativas al directorio de trabajo en los comentarios del bundle) y fuera de un
    // repositorio git (BUILD_INFO sin commit): mismos bytes que una construcción normal desde la raíz del repositorio, e independientes de commits posteriores
    execFileSync(process.execPath, ['tools/build/build-experimental.mjs', '--out', ext], { cwd: arbol, stdio: 'pipe' }); const r = { info: JSON.parse(fs.readFileSync(path.join(ext, 'BUILD_INFO.json'), 'utf8')) };
    const nombre = `tesseract-v3-${version}`; const dir = path.join(out, nombre); fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(path.join(dir, 'extension'), { recursive: true });
    for (const f of listar(ext)) { fs.mkdirSync(path.dirname(path.join(dir, 'extension', f)), { recursive: true }); fs.copyFileSync(path.join(ext, f), path.join(dir, 'extension', f)); }
    const manifest = fs.readFileSync(path.join(dir, 'extension/CSXS/manifest.xml'), 'utf8'); const attr = (re) => (re.exec(manifest) || [])[1] || null;
    const release = { producto: 'Tesseract V3', version, tipo: 'release candidate PARA EVALUACIÓN (no estable; no distribuir)', fuente: { repositorio: 'Tesseract v3 (local; auditoría tdotp/tesseract-v3-audit)', commit: completo },
      identidad: { ...B.EXP_IDS, manifiesto: { bundleId: attr(/ExtensionBundleId="([^"]+)"/), bundleVersion: attr(/ExtensionBundleVersion="([^"]+)"/), host: attr(/<Host Name="ILST" Version="([^"]+)"/), csxs: attr(/<RequiredRuntime Name="CSXS" Version="([^"]+)"/) } },
      motores: { predeterminado: 'sombra (legacy; el experimental solo se compara)', activo: 'experimental-f2a2 (ε = 0,05 mm), solo con confirmación explícita en el panel; no persistente' },
      compatibilidad: { validado: 'Adobe Illustrator 30.8.2 (2026), CEP 12.1.1, Chromium 99.0.4844.84, macOS', requisito: 'paquete sin firmar: requiere PlayerDebugMode=1 en com.adobe.CSXS.12 (no lo modifica esta herramienta)' },
      main_js_sha256: sha(fs.readFileSync(path.join(dir, 'extension/main.js'))), extension_sha256sums_sha256: sha(fs.readFileSync(path.join(dir, 'extension/SHA256SUMS'))), modulos_experimentales: r.info.motor.modulos_experimentales };
    fs.writeFileSync(path.join(dir, 'RELEASE.json'), JSON.stringify(release, null, 1) + '\n');
    fs.writeFileSync(path.join(dir, 'LEEME.txt'), `Tesseract V3 ${version} — release candidate PARA EVALUACIÓN (no estable; no distribuir).\nCommit de origen: ${completo}\nIdentidad CEP: ${B.EXP_IDS.extensionId} · menú «${B.EXP_IDS.menu}» · versión de manifiesto ${release.identidad.manifiesto.bundleVersion}\n` +
      'Instalar / desinstalar (macOS, desde el repositorio, con autorización con fecha):\n  tools/a4/a4-experimental.sh install --autorizado-por-usuario=AAAA-MM-DD\n  tools/a4/a4-experimental.sh uninstall --autorizado-por-usuario=AAAA-MM-DD\n' +
      'Arranca en modo SOMBRA (resultado = legacy). Activar el motor experimental: barra del panel → «Activar experimental» → «Confirmar».\nDocumentación: docs/release/TESSERACT_V3_RELEASE_CANDIDATE.md\n');
    const archivos = listar(dir).filter((f) => f !== 'SHA256SUMS'); fs.writeFileSync(path.join(dir, 'SHA256SUMS'), archivos.map((f) => `${sha(fs.readFileSync(path.join(dir, f)))}  ./${f}`).join('\n') + '\n');
    const zip = path.join(out, nombre + '.zip'); fs.rmSync(zip, { force: true }); const enZip = listar(dir).map((f) => nombre + '/' + f);
    execFileSync('python3', ['-I', '-c', ZIP_PY, out, zip, ...enZip]); const zipSha = sha(fs.readFileSync(zip)); fs.writeFileSync(zip + '.sha256', `${zipSha}  ${nombre}.zip\n`);
    return { dir, zip, zipSha, release, sumsSha: sha(fs.readFileSync(path.join(dir, 'SHA256SUMS'))) };
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const a = process.argv.slice(2); const get = (k) => (a.includes(k) ? a[a.indexOf(k) + 1] : null);
  try {
    if (a.includes('--verify')) { const out = path.resolve(get('--out') || path.join(ROOT, 'release')); const v = get('--version') || VERSION_RC; const z = path.join(out, `tesseract-v3-${v}.zip`);
      const t = fs.mkdtempSync(path.join(os.tmpdir(), 'tess-rc-v-')); const r = await construirRC({ commit: get('--commit'), version: v, out: t }); const igual = fs.existsSync(z) && sha(fs.readFileSync(z)) === r.zipSha; fs.rmSync(t, { recursive: true, force: true });
      if (!igual) { console.error(`VERIFICACIÓN FALLIDA: ${z} no coincide con una reconstrucción desde ${get('--commit')} (${r.zipSha})`); process.exit(1); } console.log(`OK: ${path.relative(process.cwd(), z)} reproducible desde ${r.release.fuente.commit} (sha256 ${r.zipSha})`); process.exit(0); }
    const r = await construirRC({ commit: get('--commit'), version: get('--version') || VERSION_RC, out: path.resolve(get('--out') || path.join(ROOT, 'release')) });
    console.log(`RC ${r.release.version} desde ${r.release.fuente.commit}\n  carpeta: ${path.relative(process.cwd(), r.dir)}\n  zip:     ${path.relative(process.cwd(), r.zip)}  sha256 ${r.zipSha}\n  main.js sha256 ${r.release.main_js_sha256}\nNo se instaló, firmó ni distribuyó nada.`);
  } catch (e) { console.error('ERROR:', e.message); process.exit(1); }
}
