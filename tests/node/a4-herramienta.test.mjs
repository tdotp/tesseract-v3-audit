// A4 — tools/a4/a4.sh y verify-isolation.sh --a4-instalado, ejercitados SOLO en un HOME temporal (nunca en el CEP real): la instalación real exige autorización expresa.
import test from 'node:test'; import assert from 'node:assert/strict'; import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { spawnSync } from 'node:child_process';
import { ROOT } from '../lib/fixtures.mjs'; import { build } from '../../tools/build/build.mjs';
const A4 = ROOT + '/tools/a4/a4.sh', ISO = ROOT + '/tools/verify-isolation.sh'; const REAL_USER_CEP = os.homedir() + '/Library/Application Support/Adobe/CEP/extensions'; const AUTH = '--autorizado-por-usuario=2026-10-23';
const listing = () => spawnSync('find', [REAL_USER_CEP, '-maxdepth', '2'], { encoding: 'utf8' }).stdout;
await build({ out: ROOT + '/dist' }); const realBefore = listing(); const tmps = [];
function sandbox() { const t = fs.mkdtempSync(path.join(os.tmpdir(), 'tess-a4-')); tmps.push(t); const home = path.join(t, 'home'), cep = path.join(home, 'Library/Application Support/Adobe/CEP/extensions'), sys = path.join(t, 'sys'), state = path.join(t, 'state');
  for (const [d, n] of [[cep, 'OtraExt'], [sys, 'ExtSistema']]) { fs.mkdirSync(path.join(d, n, 'CSXS'), { recursive: true }); fs.writeFileSync(path.join(d, n, 'CSXS/manifest.xml'), `<ExtensionManifest Version="12.0" ExtensionBundleId="com.otro.${n}"><ExtensionList><Extension Id="com.otro.${n}.panel"/></ExtensionList></ExtensionManifest>`); fs.writeFileSync(path.join(d, n, 'index.html'), n); }
  const env = { ...process.env, HOME: home, TESS_SYS_CEP: sys, TESS_A4_STATE: state, TESS_SKIP_SYSTEM_CHECKS: '1' };
  return { t, home, cep, sys, state, dest: path.join(cep, 'tesseract-v3'), env, run: (script, args = [], extra = {}) => spawnSync(script, args, { encoding: 'utf8', env: { ...env, ...extra } }) }; }
const tree = (d) => spawnSync('find', [d, '-type', 'f', '-exec', 'shasum', '{}', '+'], { encoding: 'utf8' }).stdout.split('\n').sort().join('\n');

test('install y rollback se RECHAZAN (código 3) sin autorización o con un formato inválido; no escriben nada', () => {
  const s = sandbox(); const before = tree(s.home);
  for (const a of [[], ['--autorizado-por-usuario='], ['--autorizado-por-usuario=si'], ['--autorizado-por-usuario=hoy']]) for (const c of ['install', 'rollback']) { const r = s.run(A4, [c, ...a]); assert.equal(r.status, 3, c + ' ' + a.join(' ')); assert.match(r.stdout, /RECHAZADO/); }
  assert.ok(!fs.existsSync(s.dest)); assert.ok(!fs.existsSync(s.state)); assert.equal(tree(s.home), before); assert.equal(s.run(A4, ['install', AUTH, '--bogus']).status, 2); assert.equal(s.run(A4, ['nada']).status, 2);
});
test('ciclo completo en HOME temporal: preflight → install → verify → aislamiento A4 → rollback; las demás extensiones intactas', () => {
  const s = sandbox(); const others0 = tree(path.join(s.cep, 'OtraExt')); const sys0 = tree(s.sys);
  let r = s.run(A4, ['preflight']); assert.equal(r.status, 0, r.stdout); assert.match(r.stdout, /PREFLIGHT CORRECTO/); assert.match(r.stdout, /NO está autorizada/); assert.ok(!fs.existsSync(s.dest) && !fs.existsSync(s.state), 'preflight no escribe');
  r = s.run(A4, ['install', AUTH, '--debug-port=8099']); assert.equal(r.status, 0, r.stdout + r.stderr); assert.match(r.stdout, /INSTALACIÓN CORRECTA/); assert.match(r.stdout, /Illustrator|reiniciar/i);
  assert.ok(fs.existsSync(s.dest + '/CSXS/manifest.xml')); assert.match(fs.readFileSync(s.dest + '/.debug', 'utf8'), /Id="com\.tato\.tesseract\.v3\.panel".*Port="8099"/s);
  const rec = JSON.parse(fs.readFileSync(s.state + '/install-record.json', 'utf8')); assert.equal(rec.autorizacion_usuario, '2026-10-23'); assert.equal(rec.puerto_debug, 8099); assert.equal(rec.destino, s.dest); assert.ok(Object.keys(rec.huellas).includes('main.js'));
  assert.equal(tree(path.join(s.cep, 'OtraExt')), others0, 'las demás extensiones del usuario no cambian'); assert.deepEqual(fs.readdirSync(s.cep).sort(), ['OtraExt', 'tesseract-v3'], 'solo se añadió tesseract-v3'); assert.equal(tree(s.sys), sys0, 'el CEP del sistema no se toca');
  r = s.run(A4, ['verify']); assert.equal(r.status, 0, r.stdout); assert.match(r.stdout, /huellas SHA-256 = dist/); assert.match(r.stdout, /verify-isolation\.sh --a4-instalado verde/);
  assert.equal(s.run(ISO, []).status, 1, 'el modo estricto debe seguir rechazando una copia V3'); assert.equal(s.run(ISO, ['--a4-instalado']).status, 0);
  r = s.run(A4, ['diagnose', '--port=8099']); assert.equal(r.status, 0); assert.match(r.stdout, /Diagnóstico A4/); assert.ok(fs.readdirSync(s.state).some((f) => f.startsWith('diagnostico-')));
  assert.equal(s.run(A4, ['rollback']).status, 3); assert.ok(fs.existsSync(s.dest), 'rollback sin autorización no borra');
  r = s.run(A4, ['rollback', AUTH]); assert.equal(r.status, 0, r.stdout); assert.match(r.stdout, /ROLLBACK CORRECTO/); assert.ok(!fs.existsSync(s.dest)); assert.equal(tree(path.join(s.cep, 'OtraExt')), others0); assert.deepEqual(fs.readdirSync(s.cep), ['OtraExt']); assert.equal(tree(s.sys), sys0); assert.equal(s.run(ISO, []).status, 0, 'aislamiento estricto vuelve a verde');
  assert.equal(s.run(A4, ['rollback', AUTH]).status, 0, 'idempotente'); assert.equal(listing(), realBefore, 'el CEP REAL del usuario no cambió');
});
test('verify y el modo A4 de aislamiento detectan manipulación (archivo alterado, archivo extra, segunda copia tesseract-v3*)', () => {
  const s = sandbox(); assert.equal(s.run(A4, ['install', AUTH]).status, 0); fs.appendFileSync(s.dest + '/main.js', '\n// x\n');
  let r = s.run(A4, ['verify']); assert.equal(r.status, 1); assert.match(r.stdout, /huellas de .* no coinciden/); assert.equal(s.run(ISO, ['--a4-instalado']).status, 1);
  fs.rmSync(s.dest, { recursive: true }); assert.equal(s.run(A4, ['install', AUTH]).status, 0); fs.writeFileSync(s.dest + '/intruso.txt', 'x'); r = s.run(A4, ['verify']); assert.equal(r.status, 1); assert.match(r.stdout, /intruso\.txt/);
  fs.rmSync(s.dest + '/intruso.txt'); assert.equal(s.run(A4, ['verify']).status, 0); fs.cpSync(s.dest, s.cep + '/tesseract-v3-copia', { recursive: true }); assert.equal(s.run(ISO, ['--a4-instalado']).status, 1);
  assert.equal(s.run(A4, ['rollback', AUTH]).status, 1, 'con una copia extra el estado NO vuelve al previo: el rollback lo señala'); fs.rmSync(s.cep + '/tesseract-v3-copia', { recursive: true }); assert.equal(s.run(A4, ['rollback', AUTH]).status, 0);
});
test('install se niega si el destino ya existe (no sobrescribe) y rollback se niega a borrar algo que no es el bundle V3', () => {
  const s = sandbox(); fs.mkdirSync(s.dest + '/CSXS', { recursive: true }); fs.writeFileSync(s.dest + '/CSXS/manifest.xml', '<ExtensionManifest ExtensionBundleId="com.ajeno.cosa"/>'); fs.writeFileSync(s.dest + '/dato.txt', 'importante'); const before = tree(s.dest);
  let r = s.run(A4, ['install', AUTH]); assert.equal(r.status, 3); assert.match(r.stdout, /ya existe/); assert.equal(tree(s.dest), before);
  r = s.run(A4, ['rollback', AUTH]); assert.equal(r.status, 3); assert.match(r.stdout, /no es el bundle V3/); assert.equal(tree(s.dest), before);
});
test('rollback AUTOMÁTICO si la verificación posterior falla: solo se retira lo creado por la ejecución; el resto queda como estaba', () => {
  const s = sandbox(); const shim = path.join(s.t, 'shim'); fs.mkdirSync(shim); const real = spawnSync('which', ['shasum'], { encoding: 'utf8' }).stdout.trim();
  fs.writeFileSync(shim + '/shasum', `#!/bin/bash\n[ "$PWD" = "${s.dest}" ] && exit 1\nexec ${real} "$@"\n`, { mode: 0o755 }); const others0 = tree(s.cep);
  const r = s.run(A4, ['install', AUTH], { PATH: shim + ':' + process.env.PATH }); assert.equal(r.status, 1, r.stdout); assert.match(r.stdout, /rollback automático/); assert.match(r.stdout, /estado restaurado = snapshot previo/); assert.ok(!fs.existsSync(s.dest)); assert.equal(tree(s.cep), others0); assert.ok(!fs.existsSync(s.state + '/install-record.json'));
});
test('análisis estático de a4.sh: no cierra/abre/reinicia Illustrator, no usa sudo ni cambia preferencias, no escribe en /Library, y osascript solo cuenta documentos', () => {
  const code = fs.readFileSync(A4, 'utf8').replace(/^\s*#.*$/gm, '');
  for (const re of [/\bsudo\b/, /defaults\s+write/, /killall|pkill/, /open\s+-a/, /\bquit\b/, /do javascript/, /\bcp\b[^\n]*"\$SYS_CEP/, /\brm\b[^\n]*SYS_CEP/, /\/Library\/Application Support\/Adobe\/CEP\/extensions\/tesseract["' ]/]) assert.doesNotMatch(code, re, String(re));
  const osa = code.match(/osascript[^\n]*/g) || []; assert.equal(osa.length, 1); assert.match(osa[0], /count documents/); const rms = (code.match(/\brm -rf[^\n]*/g) || []).map((l) => l.match(/"\$\{(\w+):\?\}"/)?.[1]); assert.ok(rms.length >= 4 && rms.every((v) => ['DEST', 'STAGE_D'].includes(v)), JSON.stringify(rms));
});
test('el CEP REAL del usuario no cambió durante toda esta batería', () => { assert.equal(listing(), realBefore); for (const t of tmps) fs.rmSync(t, { recursive: true, force: true }); });
