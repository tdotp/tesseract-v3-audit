// A7.0b — El arnés de navegador (tools/baseline/setup_harness.py) inyecta window.__dbg de forma UNIFORME: si el objetivo trae la vista de solo lectura
// de A7 (__tessDebugView), la usa; si no (baseline, panel/, bundles anteriores a A7), el objeto heredado de 20 propiedades SIN CAMBIOS (docs/fase1/A7_PROPUESTA.md §7.2).
// Se prueba que, para el baseline, la copia instrumentada solo difiere del original en la línea inyectada y en el parche de pathToFileURL, y que el objeto heredado es byte a byte el de siempre.
import test from 'node:test'; import assert from 'node:assert/strict'; import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { execFileSync } from 'node:child_process';
import { ROOT } from '../lib/fixtures.mjs'; import { legacyDbg } from '../lib/a7.mjs';

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'tess-a7arnes-'));
test('baseline: la línea inyectada = vista A7 si existe, si no el objeto heredado intacto; el resto del main.js no cambia (salvo el parche 2)', () => {
  const dest = path.join(tmp, 'base'); execFileSync('python3', [ROOT + '/tools/baseline/setup_harness.py', ROOT + '/reference/legacy-baseline', ROOT + '/tests/fixtures/real/caja-botanica-real.dieline.json', dest], { stdio: 'pipe' });
  const orig = fs.readFileSync(ROOT + '/reference/legacy-baseline/main.js', 'utf8').split('\n'), inst = fs.readFileSync(path.join(dest, 'main.js'), 'utf8').split('\n');
  const injected = inst.filter((l) => l.includes('/* HARNESS */ window.__dbg')); assert.equal(injected.length, 1);
  assert.equal(injected[0].trim().replace(/function setStatus.*$/, '').trim(), "/* HARNESS */ window.__dbg=(typeof __tessDebugView==='function')?__tessDebugView():" + legacyDbg() + ';');
  const o = new Set(orig.map((l) => l.trim())); const extra = inst.filter((l) => !o.has(l.trim())); // (el arnés de siempre deja la línea de setStatus sin sangría)
  assert.deepEqual(extra.map((l) => l.includes('/* HARNESS */')), [true, true], 'solo 2 líneas nuevas: __dbg y pathToFileURL');
  assert.equal(inst.length, orig.length + 2);
});
test('el objeto heredado tiene las 20 propiedades de siempre (18 getters + upd + fold)', () => {
  const keys = [...legacyDbg().matchAll(/[{,](?:get )?(\w+)(?=\(\)\{|:function)/g)].map((m) => m[1]);
  assert.deepEqual(keys, ['renderer', 'scene', 'camera', 'orbit', 'upd', 'fold', 'nFold', 'panels', 'foldData', 'art', 'panelData', 'thickness', 'preset', 'baseIndex', 'angles', 'tree', 'bridges', 'selectedEdge', 'creaseVisuals', 'adj']);
});
test('limpieza', () => { fs.rmSync(tmp, { recursive: true, force: true }); });
