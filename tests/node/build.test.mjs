// A3 — el build: reproducible, huellas fijadas, solo cambia la identidad del manifiesto, script clásico (sin módulos), zonas protegidas.
import test from 'node:test'; import assert from 'node:assert/strict'; import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import crypto from 'node:crypto'; import { spawnSync, execFileSync } from 'node:child_process';
import { ROOT } from '../lib/fixtures.mjs'; import { build, verifyDir, V3_IDS, TARGET } from '../../tools/build/build.mjs'; import { DIST_PIN } from '../lib/dist.mjs';
const sha = (f) => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'tess-build-test-')); const walk = (root, d = root, o = []) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); e.isDirectory() ? walk(root, p, o) : o.push(path.relative(root, p)); } return o.sort(); };
const cli = (args) => spawnSync('node', [ROOT + '/tools/build/build.mjs', ...args], { encoding: 'utf8' });
let A, B; const dirs = [];
test('el build se ejecuta dos veces y produce EXACTAMENTE los mismos bytes (reproducible)', async () => {
  const t = tmp(); dirs.push(t); A = await build({ out: path.join(t, 'a') }); B = await build({ out: path.join(t, 'b') }); assert.equal(A.sums, B.sums);
  for (const f of walk(path.join(t, 'a'))) if (f !== 'BUILD_INFO.json') assert.equal(sha(path.join(t, 'a', f)), sha(path.join(t, 'b', f)), f);
});
test('HUELLAS FIJADAS: SHA256SUMS del build = tests/golden/dist-a8.SHA256SUMS (huella vigente; detecta cambios en src/, en los estáticos de panel/ o en la versión de esbuild)', () => {
  assert.equal(A.sums, fs.readFileSync(DIST_PIN, 'utf8'), 'si el cambio es intencional (paso aprobado de A8), regenera la huella vigente con: node tools/build/build.mjs && cp dist/SHA256SUMS tests/golden/dist-a8.SHA256SUMS');
});
test('HISTÓRICO A5 (T7): el src/ del commit 31459fc (bundle validado en el CEP real) sigue reproduciendo EXACTAMENTE tests/golden/dist-a5.SHA256SUMS', () => {
  const t = tmp(); dirs.push(t); execFileSync('/bin/sh', ['-c', `git -C "${ROOT}" archive 31459fc src | tar -x -C "${t}"`]);
  const r = spawnSync('node', [ROOT + '/tools/build/build.mjs', '--entry', 'src/main.js', '--assets', ROOT + '/panel', '--out', path.join(t, 'out')], { cwd: t, encoding: 'utf8' }); assert.equal(r.status, 0, r.stderr);
  assert.equal(fs.readFileSync(path.join(t, 'out', 'SHA256SUMS'), 'utf8'), fs.readFileSync(ROOT + '/tests/golden/dist-a5.SHA256SUMS', 'utf8'));
  assert.match(fs.readFileSync(ROOT + '/tests/golden/dist-a5.SHA256SUMS', 'utf8'), /^70de82a82f90c91b3f794bc62fa02f34d86d06d11dfe0c77af4ed8d660e70701  \.\/main\.js$/m);
});
test('HISTÓRICO A6: el src/ del commit 2939dbc (bundle validado en el CEP real) sigue reproduciendo EXACTAMENTE tests/golden/dist-a6.SHA256SUMS', () => {
  const t = tmp(); dirs.push(t); execFileSync('/bin/sh', ['-c', `git -C "${ROOT}" archive 2939dbc src | tar -x -C "${t}"`]);
  const r = spawnSync('node', [ROOT + '/tools/build/build.mjs', '--entry', 'src/main.js', '--assets', ROOT + '/panel', '--out', path.join(t, 'out')], { cwd: t, encoding: 'utf8' }); assert.equal(r.status, 0, r.stderr);
  assert.equal(fs.readFileSync(path.join(t, 'out', 'SHA256SUMS'), 'utf8'), fs.readFileSync(ROOT + '/tests/golden/dist-a6.SHA256SUMS', 'utf8'));
  assert.match(fs.readFileSync(ROOT + '/tests/golden/dist-a6.SHA256SUMS', 'utf8'), /^6e36e32534104a7863f087ba876cd981f41d81b88aafcf09f4860640eaf78c8b  \.\/main\.js$/m);
});
test('HISTÓRICO A7: el src/ del commit a322d7a (bundle validado en el CEP real) sigue reproduciendo EXACTAMENTE tests/golden/dist-a7.SHA256SUMS', () => {
  const t = tmp(); dirs.push(t); execFileSync('/bin/sh', ['-c', `git -C "${ROOT}" archive a322d7a src | tar -x -C "${t}"`]);
  const r = spawnSync('node', [ROOT + '/tools/build/build.mjs', '--entry', 'src/main.js', '--assets', ROOT + '/panel', '--out', path.join(t, 'out')], { cwd: t, encoding: 'utf8' }); assert.equal(r.status, 0, r.stderr);
  assert.equal(fs.readFileSync(path.join(t, 'out', 'SHA256SUMS'), 'utf8'), fs.readFileSync(ROOT + '/tests/golden/dist-a7.SHA256SUMS', 'utf8'));
  assert.match(fs.readFileSync(ROOT + '/tests/golden/dist-a7.SHA256SUMS', 'utf8'), /^9784ec70e103a1eb8f91d8d58e2104585466f498a94e554d41d994bcce8944fc  \.\/main\.js$/m);
});
test('HISTÓRICO A3/A4: construir desde la carpeta de plugin panel/ (referencia A1 congelada) reproduce EXACTAMENTE tests/golden/dist.SHA256SUMS (bundle validado en el CEP real)', async () => {
  const t = tmp(); dirs.push(t); const h = await build({ src: ROOT + '/panel', out: path.join(t, 'h') }); assert.equal(h.sums, fs.readFileSync(ROOT + '/tests/golden/dist.SHA256SUMS', 'utf8'));
  assert.match(h.sums, /^bc2606957595d086ac8b81d2e3af019e0c1d44344bd8c273c9ddb45bb159b5bd  \.\/main\.js$/m);
});
test('el conjunto de archivos de dist = panel/ − (main.js.bak, *.md) + SHA256SUMS + BUILD_INFO.json; los estáticos son idénticos byte a byte', () => {
  const panel = walk(ROOT + '/panel').filter((f) => !/main\.js\.bak$|\.md$|\.DS_Store$/.test(f)); const dist = walk(A.out);
  assert.deepEqual(dist, [...panel, 'BUILD_INFO.json', 'SHA256SUMS'].sort());
  for (const f of panel) if (!['main.js', 'CSXS/manifest.xml'].includes(f)) assert.equal(sha(path.join(A.out, f)), sha(path.join(ROOT, 'panel', f)), f);
});
test('manifiesto: solo cambia la identidad (bundle, versión, nombre, extensión, menú); deshaciendo esos 6 cambios se recupera el original; XML válido', () => {
  const orig = fs.readFileSync(ROOT + '/panel/CSXS/manifest.xml', 'utf8'), v3 = fs.readFileSync(path.join(A.out, 'CSXS/manifest.xml'), 'utf8');
  const back = v3.replace(`ExtensionBundleId="${V3_IDS.bundleId}"`, 'ExtensionBundleId="com.tato.tesseract"').replace(`ExtensionBundleVersion="${V3_IDS.version}"`, 'ExtensionBundleVersion="0.1.0"').replace(`ExtensionBundleName="${V3_IDS.name}"`, 'ExtensionBundleName="Tesseract"')
    .replace(`<Extension Id="${V3_IDS.extensionId}" Version="${V3_IDS.version}" />`, '<Extension Id="com.tato.tesseract.panel" Version="0.1.0" />').replace(`<Extension Id="${V3_IDS.extensionId}">`, '<Extension Id="com.tato.tesseract.panel">').replace(`<Menu>${V3_IDS.menu}</Menu>`, '<Menu>Tesseract</Menu>');
  assert.equal(back, orig); assert.notEqual(v3, orig); assert.match(v3, /CSXS" Version="12\.0"/); assert.ok(!/Tesseract<\/Menu>/.test(v3.replace('Tesseract V3</Menu>', '')));
  assert.equal(spawnSync('python3', ['-c', 'import sys,xml.etree.ElementTree as E; E.parse(sys.argv[1])', path.join(A.out, 'CSXS/manifest.xml')]).status, 0);
  assert.ok(!v3.includes('"com.tato.tesseract"') && !v3.includes('"com.tato.tesseract.panel"'), 'no puede quedar la identidad del plugin instalado');
});
test('main.js es un script CLÁSICO autocontenido: IIFE, sin import/export/require/process/module ni import() dinámico', () => {
  const js = fs.readFileSync(path.join(A.out, 'main.js'), 'utf8');
  assert.match(js, /^\/\* Tesseract V3 · bundle IIFE · fuente main\.js sha256:[0-9a-f]{16} · esbuild 0\.28\.2 · target chrome99/); assert.match(js, /\n\(\(\) => \{\n/); assert.match(js.trimEnd(), /\}\)\(\);$/);
  const code = js.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '').replace(/"(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*'/g, '""');
  for (const [re, w] of [[/^\s*import\s/m, 'import'], [/^\s*export\s/m, 'export'], [/\brequire\s*\(/, 'require('], [/\bprocess\./, 'process.'], [/\bmodule\.exports\b/, 'module.exports'], [/\bimport\s*\(/, 'import()'], [/\bimport\.meta\b/, 'import.meta']]) assert.doesNotMatch(code, re, w);
  assert.doesNotMatch(fs.readFileSync(path.join(A.out, 'index.html'), 'utf8'), /type=["']module["']/); assert.match(fs.readFileSync(path.join(A.out, 'index.html'), 'utf8'), /<script src="main\.js"><\/script>/);
});
test('BUILD_INFO.json: herramientas y versiones, huella de la fuente, huellas de la salida, instalado=false', () => {
  const i = JSON.parse(fs.readFileSync(path.join(A.out, 'BUILD_INFO.json'), 'utf8')); const pk = JSON.parse(fs.readFileSync(ROOT + '/package.json', 'utf8')); const es = JSON.parse(fs.readFileSync(ROOT + '/node_modules/esbuild/package.json', 'utf8'));
  assert.equal(i.herramientas.esbuild, pk.devDependencies.esbuild); assert.equal(i.herramientas.esbuild, es.version); assert.equal(i.herramientas.target, TARGET); assert.equal(i.herramientas.formato, 'iife'); assert.equal(i.herramientas.minify, false);
  assert.equal(i.fuente.main_js_sha256, sha(ROOT + '/src/main.js')); assert.equal(i.fuente.entrada, 'src/main.js'); assert.equal(i.fuente.estaticos, 'panel'); assert.equal(i.instalado, false); assert.equal(i.depuracion, null);
  for (const [f, v] of Object.entries(i.salida)) assert.equal(sha(path.join(A.out, f)), v.sha256, f); assert.deepEqual(verifyDir(A.out), []);
});
test('dependencias fijadas: esbuild exacto (sin ^/~), MIT, presente en el lockfile', () => {
  const pk = JSON.parse(fs.readFileSync(ROOT + '/package.json', 'utf8')); assert.match(pk.devDependencies.esbuild, /^\d+\.\d+\.\d+$/); assert.deepEqual(Object.keys(pk.dependencies || {}), [], 'sin dependencias de producción');
  assert.equal(JSON.parse(fs.readFileSync(ROOT + '/node_modules/esbuild/package.json', 'utf8')).license, 'MIT'); assert.match(fs.readFileSync(ROOT + '/pnpm-lock.yaml', 'utf8'), new RegExp('esbuild@' + pk.devDependencies.esbuild.replace(/\./g, '\\.')));
});
test('--debug-port añade .debug (solo validación), queda en SHA256SUMS y en BUILD_INFO; sin la opción no existe', async () => {
  const t = tmp(); dirs.push(t); const r = await build({ out: path.join(t, 'd'), debugPort: 8088 }); assert.ok(fs.existsSync(path.join(r.out, '.debug'))); assert.match(fs.readFileSync(path.join(r.out, '.debug'), 'utf8'), /Port="8088"/); assert.match(r.sums, /\.debug/);
  assert.equal(JSON.parse(fs.readFileSync(path.join(r.out, 'BUILD_INFO.json'), 'utf8')).depuracion.puerto, 8088); assert.deepEqual(verifyDir(r.out), []); assert.ok(!fs.existsSync(path.join(A.out, '.debug')));
});
test('zonas protegidas: el build rechaza --out en panel/, reference/, la raíz del repo, /Library y ~/Library y no crea nada', () => {
  const before = { panel: sha(ROOT + '/panel/main.js'), ref: sha(ROOT + '/reference/legacy-baseline/main.js') };
  for (const out of [ROOT + '/panel', ROOT + '/panel/sub', ROOT + '/src', ROOT + '/src/x', ROOT + '/reference/x', ROOT, ROOT + '/tests/x', '/Library/Application Support/Adobe/CEP/extensions/tesseract-v3-x', os.homedir() + '/Library/Application Support/Adobe/CEP/extensions/tesseract-v3-x', '/tmp/../etc/x']) {
    const r = cli(['--out', out]); assert.equal(r.status, 1, out + ' → ' + r.stdout + r.stderr); assert.match(r.stderr, /rechazado/, out);
  }
  assert.ok(!fs.existsSync(os.homedir() + '/Library/Application Support/Adobe/CEP/extensions/tesseract-v3-x')); assert.ok(!fs.existsSync(ROOT + '/panel/sub')); assert.ok(!fs.existsSync(ROOT + '/tests/x'));
  assert.equal(sha(ROOT + '/panel/main.js'), before.panel); assert.equal(sha(ROOT + '/reference/legacy-baseline/main.js'), before.ref);
});
test('--verify: acepta un dist íntegro y rechaza uno manipulado', async () => {
  const t = tmp(); dirs.push(t); const d = path.join(t, 'dist'); await build({ out: d });
  // verify reconstruye desde src/ (+ estáticos de panel/) y compara con el dist indicado
  assert.equal(cli(['--verify', '--out', d]).status, 0); fs.appendFileSync(path.join(d, 'main.js'), '\n// manipulado\n'); const r = cli(['--verify', '--out', d]); assert.equal(r.status, 1); assert.match(r.stderr, /VERIFICACIÓN FALLIDA/);
});
test('limpieza', () => { for (const d of dirs) fs.rmSync(d, { recursive: true, force: true }); });
