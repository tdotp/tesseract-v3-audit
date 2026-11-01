// D-0 — coherencia de la decisión de producto: la línea histórica está congelada y es alcanzable, sus huellas no cambiaron, el manifiesto de
// diferencias (tests/lib/d0.mjs) describe exactamente la fuente actual y el bundle de producto lleva su propia identidad de desarrollo.
import test from 'node:test'; import assert from 'node:assert/strict'; import fs from 'node:fs'; import path from 'node:path'; import crypto from 'node:crypto'; import { execFileSync } from 'node:child_process';
import { ROOT } from '../lib/fixtures.mjs'; import { functionsAnyIndent } from '../lib/a7.mjs';
import { HIST_COMMIT, VERSION_PRODUCTO, D0_FUNCIONES_NUEVAS, D0_MODULOS_NUEVOS, D0_IMPORTS_NUEVOS } from '../lib/d0.mjs';
import { DIST_PIN, DIST_PIN_HISTORICO } from '../lib/dist.mjs'; import { EXP_IDS, VERSION_PRODUCTO as VERSION_BUILD } from '../../tools/build/build-experimental.mjs';
const git = (...a) => execFileSync('git', ['-C', ROOT, ...a], { encoding: 'utf8' }).trim(); const existe = (spec) => { try { execFileSync('git', ['-C', ROOT, 'cat-file', '-e', spec], { stdio: 'ignore' }); return true; } catch { return false; } }; const sha = (b) => crypto.createHash('sha256').update(b).digest('hex');

test('D-0 · el commit congelado de la línea histórica existe, es antecesor de HEAD y su src/ es el que produjo dist-a9', () => {
  assert.equal(git('rev-parse', '--verify', HIST_COMMIT + '^{commit}'), HIST_COMMIT); execFileSync('git', ['-C', ROOT, 'merge-base', '--is-ancestor', HIST_COMMIT, 'HEAD']);
  assert.equal(git('show', `${HIST_COMMIT}:tests/golden/dist-a9.SHA256SUMS`), fs.readFileSync(DIST_PIN_HISTORICO, 'utf8').trim(), 'la huella histórica es la misma que en el commit congelado');
});
test('D-0 · las huellas y goldens históricos NO cambiaron respecto del commit congelado (solo se AÑADEN huellas nuevas)', () => {
  const golden = git('ls-tree', '--name-only', HIST_COMMIT, 'tests/golden/').split('\n');
  for (const f of golden) assert.equal(sha(fs.readFileSync(path.join(ROOT, f))), sha(Buffer.from(execFileSync('git', ['-C', ROOT, 'show', `${HIST_COMMIT}:${f}`]))), f);
  for (const d of ['reference', 'tests/fixtures', 'panel']) assert.equal(git('diff', '--stat', HIST_COMMIT, '--', d), '', `${d} sin cambios`);
  assert.notEqual(DIST_PIN, DIST_PIN_HISTORICO); assert.ok(!golden.includes(path.relative(ROOT, DIST_PIN)), 'la huella vigente es nueva, no una histórica reescrita');
});
test('D-0 · el manifiesto de diferencias describe la fuente actual: funciones nuevas una vez en su módulo, módulos e imports nuevos presentes', () => {
  for (const [n, f] of Object.entries(D0_FUNCIONES_NUEVAS)) { const fns = functionsAnyIndent(fs.readFileSync(path.join(ROOT, 'src', f), 'utf8')).filter((x) => x.name === n); assert.equal(fns.length, 1, `${n} en ${f}`); }
  for (const m of D0_MODULOS_NUEVOS) { assert.ok(fs.existsSync(path.join(ROOT, 'src', m)), m); assert.equal(existe(`${HIST_COMMIT}:src/${m}`), false, `${m} es nuevo`); }
  for (const [f, imps] of Object.entries(D0_IMPORTS_NUEVOS)) for (const i of imps) assert.match(fs.readFileSync(path.join(ROOT, 'src', f), 'utf8'), new RegExp(`from '${i.replace(/\./g, '\\.')}';`), `${f} → ${i}`);
});
test('D-0 · identidad de la línea de producto: 3.0.1-dev.1 (manifiesto 3.0.1), misma extensión CEP aislada; el RC 3.0.0-rc.1 sigue cerrado en 7258524', () => {
  assert.equal(VERSION_BUILD, VERSION_PRODUCTO); assert.equal(EXP_IDS.version, '3.0.1'); assert.equal(EXP_IDS.extensionId, 'com.tato.tesseract.v3.experimental.panel');
  assert.match(git('show', '7258524:tools/build/build-experimental.mjs'), /version: '3\.0\.0'/); assert.match(git('show', '7258524:tools/build/build-rc.mjs'), /VERSION_RC = '3\.0\.0-rc\.1'/);
});
test('D-0 · huella NUEVA del bundle de producto 3.0.1-dev.1: una construcción limpia reproduce tests/golden/producto-3.0.1-dev.1.SHA256SUMS', async () => {
  const os = await import('node:os'); const { construirExperimental } = await import('../../tools/build/build-experimental.mjs');
  const t = fs.mkdtempSync(path.join(os.tmpdir(), 'tess-producto-pin-')); try { const r = await construirExperimental({ out: path.join(t, 'p') }); assert.equal(r.sums, fs.readFileSync(path.join(ROOT, 'tests/golden/producto-3.0.1-dev.1.SHA256SUMS'), 'utf8'), 'si el cambio es intencional y aprobado, registra una huella NUEVA con otra versión');
    assert.equal(JSON.parse(fs.readFileSync(path.join(t, 'p', 'BUILD_INFO.json'), 'utf8')).version, VERSION_PRODUCTO); } finally { fs.rmSync(t, { recursive: true, force: true }); }
});
