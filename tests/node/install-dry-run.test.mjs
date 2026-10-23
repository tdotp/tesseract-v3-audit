// A3 — tools/install.sh en modo DRY-RUN: verifica sin escribir; la instalación real está rechazada. NADA se instala en el CEP del usuario.
import test from 'node:test'; import assert from 'node:assert/strict'; import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { spawnSync, execFileSync } from 'node:child_process';
import { ROOT } from '../lib/fixtures.mjs'; import { build } from '../../tools/build/build.mjs';
const SH = ROOT + '/tools/install.sh'; const USER_CEP = os.homedir() + '/Library/Application Support/Adobe/CEP/extensions'; const DEST = USER_CEP + '/tesseract-v3';
const run = (args, env = {}) => spawnSync(SH, args, { encoding: 'utf8', env: { ...process.env, ...env } });
const listing = () => spawnSync('find', [USER_CEP, '-maxdepth', '2'], { encoding: 'utf8' }).stdout; const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'tess-inst-test-'));
await build({ out: ROOT + '/dist' }); const tmps = [];
test('dry-run correcto: 6 bloques de comprobaciones en verde, plan con huellas, rollback descrito y NADA escrito', () => {
  const before = listing(), snap0 = run(['--snapshot']).stdout; const r = run(['--dry-run']); assert.equal(r.status, 0, r.stdout);
  for (const t of ['SHA256SUMS verifica', 'identidad V3', 'sin colisión', 'dentro de ~/Library', 'el destino no existe', 'verify-isolation.sh verde', 'DRY-RUN CORRECTO', 'La instalación real sigue sin autorización', 'rollback']) assert.match(r.stdout, new RegExp(t), t);
  assert.doesNotMatch(r.stdout, /FALLA/); assert.equal(listing(), before); assert.ok(!fs.existsSync(DEST)); assert.equal(run(['--snapshot']).stdout, snap0);
  assert.equal(run([]).status, 0, 'sin argumentos = dry-run');
});
test('la instalación real y sus variantes están RECHAZADAS (código 3) y no crean el destino', () => {
  for (const a of [['--install'], ['--yes'], ['--force'], ['--dry-run', '--install'], ['--install', '--dry-run']]) { const r = run(a); assert.equal(r.status, 3, a.join(' ')); assert.match(r.stdout, /RECHAZADO/); }
  assert.ok(!fs.existsSync(DEST)); assert.equal(run(['--bogus']).status, 2);
});
test('rollback (--uninstall --dry-run): describe qué se retiraría, sin borrar nada', () => {
  const r = run(['--uninstall', '--dry-run']); assert.equal(r.status, 0); assert.match(r.stdout, /no existe: no hay nada que retirar|se borraría SOLO/); assert.match(r.stdout, /DRY-RUN: no se borró nada/); assert.equal(run(['--uninstall']).status, 0, '--uninstall sin --dry-run solo muestra el plan (el modo por defecto es dry-run)');
});
test('detecta un dist manipulado (huella distinta), un archivo no listado y un manifiesto ausente', () => {
  const t = tmp(); tmps.push(t); const d = path.join(t, 'dist'); fs.cpSync(ROOT + '/dist', d, { recursive: true });
  fs.appendFileSync(d + '/main.js', '\n// x\n'); let r = run(['--dry-run'], { TESS_DIST_DIR: d }); assert.equal(r.status, 1); assert.match(r.stdout, /FALLA las huellas/);
  fs.cpSync(ROOT + '/dist', d, { recursive: true }); fs.writeFileSync(d + '/intruso.txt', 'x'); r = run(['--dry-run'], { TESS_DIST_DIR: d }); assert.equal(r.status, 1); assert.match(r.stdout, /intruso\.txt/);
  fs.rmSync(d, { recursive: true }); fs.cpSync(ROOT + '/dist', d, { recursive: true }); fs.rmSync(d + '/CSXS/manifest.xml'); r = run(['--dry-run'], { TESS_DIST_DIR: d }); assert.equal(r.status, 1);
  assert.ok(!fs.existsSync(DEST));
});
test('detecta colisión de identidad con otra extensión instalada y un manifiesto con la identidad del plugin actual', () => {
  const t = tmp(); tmps.push(t); const ext = path.join(t, 'otra/CSXS'); fs.mkdirSync(ext, { recursive: true }); fs.writeFileSync(ext + '/manifest.xml', '<ExtensionManifest ExtensionBundleId="com.tato.tesseract.v3" Version="12.0"><ExtensionList><Extension Id="com.tato.tesseract.v3.panel" Version="1"/></ExtensionList></ExtensionManifest>');
  let r = run(['--dry-run'], { TESS_EXTRA_CEP_DIRS: t }); assert.equal(r.status, 1); assert.match(r.stdout, /colisión de identidad/);
  const d = path.join(t, 'dist'); fs.cpSync(ROOT + '/dist', d, { recursive: true }); const m = fs.readFileSync(d + '/CSXS/manifest.xml', 'utf8').replaceAll('com.tato.tesseract.v3', 'com.tato.tesseract');
  fs.writeFileSync(d + '/CSXS/manifest.xml', m); execFileSync('bash', ['-c', `cd "${d}" && find . -type f ! -name SHA256SUMS ! -name BUILD_INFO.json ! -name .DS_Store | LC_ALL=C sort | xargs shasum -a 256 > SHA256SUMS`]);
  r = run(['--dry-run'], { TESS_DIST_DIR: d }); assert.equal(r.status, 1); assert.match(r.stdout, /identidad inesperada|colisión/);
});
test('el instalador no deja residuos y no toca el plugin instalado ni el baseline', () => {
  run(['--dry-run']); assert.equal(spawnSync('bash', ['-c', 'ls /tmp/tess-iso.* 2>/dev/null | wc -l'], { encoding: 'utf8' }).stdout.trim(), '0'); assert.equal(run(['--dry-run']).status, 0);
  assert.equal(spawnSync(ROOT + '/tools/verify-isolation.sh', { encoding: 'utf8' }).status, 0);
});
test('limpieza', () => { for (const d of tmps) fs.rmSync(d, { recursive: true, force: true }); });
