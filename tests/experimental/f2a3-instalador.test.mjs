// F2A-3 · I-5 — Instalador aislado del bundle experimental (tools/a4/a4-experimental.sh) y modo --experimental-instalado de verify-isolation.sh,
// ejecutados en un HOME TEMPORAL con extensiones CEP falsas (TesserArt_Validator en el usuario; «tesseract» en un CEP de sistema temporal):
// autorización obligatoria, nunca sobrescribe, verificación de identidad e integridad, retirada automática si la verificación falla,
// desinstalación que solo borra la experimental (y se niega con otra identidad), extensiones protegidas intactas y reinstalación.
import { test, before, after } from 'node:test'; import assert from 'node:assert/strict'; import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { spawnSync } from 'node:child_process';
import { ROOT } from '../lib/fixtures.mjs'; import { construirExperimental, EXP_IDS } from '../../tools/build/build-experimental.mjs'; import { build } from '../../tools/build/build.mjs';

const SH = path.join(ROOT, 'tools/a4/a4-experimental.sh'); const AUT = '--autorizado-por-usuario=2026-10-28';
let tmp, HOME, SYS, DIST, NORMAL, STATE, CEP, DEST;
const run = (args, extra = {}) => spawnSync('bash', [SH, ...args], { encoding: 'utf8', env: { ...process.env, HOME, TESS_SYS_CEP: SYS, TESS_DIST_EXP_DIR: DIST, TESS_EXP_STATE: STATE, TESS_SKIP_SYSTEM_CHECKS: '1', ...extra } });
const iso = (args = []) => spawnSync('bash', [path.join(ROOT, 'tools/verify-isolation.sh'), ...args], { encoding: 'utf8', env: { ...process.env, HOME, TESS_DIST_EXP_DIR: DIST } });
const arbol = (d) => { const out = []; (function w(x) { for (const e of fs.readdirSync(x, { withFileTypes: true })) { const p = path.join(x, e.name); e.isDirectory() ? w(p) : out.push(path.relative(d, p) + ':' + fs.readFileSync(p).toString('base64').length); } })(d); return out.sort().join('\n'); };
before(async () => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'tess-f2a3-inst-')); HOME = path.join(tmp, 'home'); SYS = path.join(tmp, 'sys-cep'); STATE = path.join(tmp, 'estado');
  CEP = path.join(HOME, 'Library/Application Support/Adobe/CEP/extensions'); DEST = path.join(CEP, 'tesseract-v3-experimental');
  fs.mkdirSync(path.join(CEP, 'TesserArt_Validator/CSXS'), { recursive: true }); fs.writeFileSync(path.join(CEP, 'TesserArt_Validator/CSXS/manifest.xml'), '<ExtensionManifest ExtensionBundleId="com.tesserart.validator"><ExtensionList><Extension Id="com.tesserart.validator.panel"/></ExtensionList></ExtensionManifest>');
  fs.writeFileSync(path.join(CEP, 'TesserArt_Validator/index.html'), '<p>validador</p>'); fs.mkdirSync(path.join(SYS, 'tesseract/CSXS'), { recursive: true }); fs.writeFileSync(path.join(SYS, 'tesseract/CSXS/manifest.xml'), '<ExtensionManifest ExtensionBundleId="com.tato.tesseract"/>');
  DIST = path.join(tmp, 'dist-experimental'); await construirExperimental({ out: DIST }); NORMAL = path.join(tmp, 'normal'); await build({ out: NORMAL });
});
after(() => fs.rmSync(tmp, { recursive: true, force: true }));

test('preflight en verde con el bundle experimental reproducible y sin nada instalado; detecta un origen con otra identidad', () => {
  const r = run(['preflight']); assert.equal(r.status, 0, r.stdout); assert.match(r.stdout, /origen reproducible/); assert.match(r.stdout, /protegida presente \(no se toca\): .*TesserArt_Validator/); assert.match(r.stdout, /PREFLIGHT CORRECTO/);
  const n = run(['preflight'], { TESS_DIST_EXP_DIR: NORMAL, TESS_SKIP_BUILD_VERIFY: '1' }); assert.equal(n.status, 1); assert.match(n.stdout, /bundle inesperado com\.tato\.tesseract\.v3\b/);
});
test('install exige autorización con fecha; sin ella no crea nada', () => {
  for (const a of [[], ['--autorizado-por-usuario=hoy'], ['--autorizado-por-usuario=']]) { const r = run(['install', ...a]); assert.equal(r.status, 3, r.stdout); assert.ok(!fs.existsSync(DEST)); }
  assert.equal(run(['install', AUT], { TESS_DIST_EXP_DIR: NORMAL, TESS_SKIP_BUILD_VERIFY: '1' }).status, 3, 'origen con otra identidad: rechazado'); assert.ok(!fs.existsSync(DEST));
});
test('install autorizado: copia idéntica + .debug con la identidad experimental; protegidas intactas; verify e isolation experimental en verde; el modo estricto lo detecta', () => {
  const antes = arbol(CEP); const r = run(['install', AUT, '--debug-port=8089']); assert.equal(r.status, 0, r.stdout); assert.match(r.stdout, /INSTALACIÓN CORRECTA/);
  assert.match(fs.readFileSync(path.join(DEST, '.debug'), 'utf8'), new RegExp(`Extension Id="${EXP_IDS.extensionId.replace(/\./g, '\\.')}".*Port="8089"`));
  for (const l of fs.readFileSync(path.join(DIST, 'SHA256SUMS'), 'utf8').trim().split('\n')) { const f = l.slice(66).replace(/^\.\//, ''); assert.ok(fs.readFileSync(path.join(DEST, f)).equals(fs.readFileSync(path.join(DIST, f))), f); }
  assert.equal(arbol(CEP).split('\n').filter((l) => !l.startsWith('tesseract-v3-experimental')).join('\n'), antes, 'las demás extensiones del usuario no cambian');
  assert.equal(JSON.parse(fs.readFileSync(path.join(STATE, 'install-record.json'), 'utf8')).autorizacion_usuario, '2026-10-28');
  assert.equal(run(['verify']).status, 0); const x = iso(['--experimental-instalado']); assert.match(x.stdout, /OK \(modo experimental: tesseract-v3-experimental idéntica a dist-experimental\/, salvo \.debug\)/);
  const e = iso(); assert.equal(e.status, 1, 'el modo estricto (run-all) marca la copia instalada'); assert.match(e.stdout, /existe una copia tesseract-v3\*/);
  assert.equal(run(['install', AUT]).status, 3, 'nunca sobrescribe');
});
test('verify detecta una copia alterada; uninstall se niega con otra identidad en el destino', () => {
  const f = path.join(DEST, 'style.css'); const orig = fs.readFileSync(f); fs.chmodSync(f, 0o644); fs.appendFileSync(f, '/* alterado */'); const v = run(['verify']); assert.equal(v.status, 1); assert.match(v.stdout, /huellas .* no coinciden/); fs.writeFileSync(f, orig);
  assert.equal(run(['verify']).status, 0);
  const m = path.join(DEST, 'CSXS/manifest.xml'); const om = fs.readFileSync(m); fs.chmodSync(m, 0o644); fs.writeFileSync(m, om.toString().replace(/com\.tato\.tesseract\.v3\.experimental/g, 'com.tato.tesseract.v3'));
  const u = run(['uninstall', AUT]); assert.equal(u.status, 3); assert.match(u.stdout, /no es el bundle experimental/); assert.ok(fs.existsSync(DEST)); fs.writeFileSync(m, om);
});
test('uninstall autorizado: borra SOLO la experimental; TesserArt_Validator y el resto intactos; estricto en verde; reinstalación correcta', () => {
  const val = arbol(path.join(CEP, 'TesserArt_Validator')); assert.equal(run(['uninstall']).status, 3, 'sin autorización no desinstala'); assert.ok(fs.existsSync(DEST));
  const u = run(['uninstall', AUT]); assert.equal(u.status, 0, u.stdout); assert.ok(!fs.existsSync(DEST)); assert.match(u.stdout, /las demás extensiones siguen idénticas/); assert.match(u.stdout, /estado = snapshot previo a la instalación/);
  assert.equal(arbol(path.join(CEP, 'TesserArt_Validator')), val); assert.ok(fs.existsSync(path.join(SYS, 'tesseract/CSXS/manifest.xml'))); assert.equal(iso().status, 0, 'estricto en verde tras desinstalar');
  assert.equal(run(['uninstall', AUT]).status, 0, 'idempotente: nada que retirar');
  const r = run(['install', AUT]); assert.equal(r.status, 0, r.stdout); assert.equal(run(['verify']).status, 0); assert.equal(run(['uninstall', AUT]).status, 0); assert.ok(!fs.existsSync(DEST));
});
test('salvaguardas estáticas: destino único, extensiones protegidas, sin escrituras en /Library ni cambios de preferencias', () => {
  const t = fs.readFileSync(SH, 'utf8').split('\n').filter((l) => !/^\s*#/.test(l)).join('\n');
  assert.match(t, /DEST="\$USER_CEP\/tesseract-v3-experimental"/); assert.match(t, /PROTEGIDAS="TesserArt_Validator tesseract tesseract-v3"/);
  assert.doesNotMatch(t, /defaults write|sudo|chown|xattr -d|killall|osascript -e 'tell application "Adobe Illustrator" to (quit|close)'/); assert.equal((t.match(/rm -rf "\$\{DEST:\?\}"/g) || []).length, 3, "solo se borra el destino experimental (fallo de copia, retirada automática y uninstall)");
  assert.doesNotMatch(t, /rm -rf[^\n]*(SYS_CEP|USER_CEP"\/?\s|TesserArt)/);
});
