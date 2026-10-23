// Aislamiento y límites de modificación: baseline intacto, extensión instalada idéntica, panel/ fijado por huella.
import test from 'node:test'; import assert from 'node:assert/strict'; import fs from 'node:fs'; import { execFileSync, spawnSync } from 'node:child_process';
import { ROOT } from '../lib/fixtures.mjs'; import { sha256 } from '../lib/legacy.mjs';
const pins = JSON.parse(fs.readFileSync(ROOT + '/tests/golden/panel.pins.json', 'utf8'));

test('tools/verify-isolation.sh termina con código 0 (baseline, extensión instalada y V3 no instalado)', () => {
  const r = spawnSync(ROOT + '/tools/verify-isolation.sh', { encoding: 'utf8' }); assert.equal(r.status, 0, r.stdout + r.stderr);
});
test('panel/ solo difiere del baseline en main.js (parche A1) y en la ausencia de main.js.bak', () => {
  const out = spawnSync('diff', ['-rq', ROOT + '/reference/legacy-baseline', ROOT + '/panel'], { encoding: 'utf8' }).stdout.split('\n').filter((l) => l && !l.includes('.DS_Store'));
  assert.equal(out.length, 2, out.join('\n')); assert.ok(out.some((l) => /main\.js and .*main\.js differ/.test(l))); assert.ok(out.some((l) => /Only in .*legacy-baseline: main\.js\.bak/.test(l)));
});
test('PIN: ningún archivo de panel/ ha cambiado desde el punto de control 1 (A2 no modifica el panel)', () => {
  for (const [f, h] of Object.entries(pins.files)) assert.equal(sha256(ROOT + '/panel/' + f), h, `panel/${f} cambió: si es intencional, actualiza tests/golden/panel.pins.json en una tarea aprobada`);
  const files = execFileSync('find', [ROOT + '/panel', '-type', 'f', '!', '-name', '.DS_Store'], { encoding: 'utf8' }).split('\n').filter(Boolean).map((p) => p.replace(ROOT + '/panel/', '')).sort();
  assert.deepEqual(files, Object.keys(pins.files).sort(), 'archivos de más o de menos en panel/');
});
test('git: la historia local tiene un único autor y ningún trailer de coautoría', () => {
  const authors = execFileSync('git', ['-C', ROOT, 'log', '--format=%an'], { encoding: 'utf8' }).split('\n').filter(Boolean); assert.equal(new Set(authors).size, 1);
  const bodies = execFileSync('git', ['-C', ROOT, 'log', '--format=%B'], { encoding: 'utf8' }); assert.doesNotMatch(bodies, /Co-Authored-By|Generated with/i);
  assert.equal(execFileSync('git', ['-C', ROOT, 'remote'], { encoding: 'utf8' }).trim(), '', 'no debe haber remotos');
});
