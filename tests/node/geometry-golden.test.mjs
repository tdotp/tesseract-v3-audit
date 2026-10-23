// Caracterización: el motor geométrico vigente (baseline Y copia de trabajo panel/) produce EXACTAMENTE los golden masters
// generados desde el baseline. Incluye los defectos conocidos: aquí se fijan como "comportamiento actual", no se corrigen.
import test from 'node:test'; import assert from 'node:assert/strict'; import fs from 'node:fs';
import { FIXTURES, ROOT } from '../lib/fixtures.mjs'; import { TARGETS, loadGeometry, sha256 } from '../lib/legacy.mjs'; import { analyze } from '../lib/analyze.mjs';
const golden = JSON.parse(fs.readFileSync(ROOT + '/tests/golden/geometry.golden.json', 'utf8'));
const consts = JSON.parse(fs.readFileSync(ROOT + '/tests/golden/constants.golden.json', 'utf8'));

test('el golden proviene del baseline congelado (huella de main.js)', () => { assert.equal(golden._sha256_main_js, sha256(TARGETS.baseline)); });
test('cobertura: todos los fixtures tienen golden y viceversa', () => { assert.deepEqual(Object.keys(golden.fixtures).sort(), Object.keys(FIXTURES).sort()); });

for (const [target, file] of Object.entries(TARGETS)) {
  const L = loadGeometry(file);
  test(`[${target}] constantes (tolerancias, materiales, offsets) iguales al golden`, () => {
    const { _fuente, ...expected } = consts; assert.deepEqual(L.consts, expected);
  });
  for (const [id, f] of Object.entries(FIXTURES)) {
    test(`[${target}] ${id}: paneles, adyacencias, árboles de plegado y validación = golden`, () => {
      const { desc, tags, ...expected } = golden.fixtures[id];
      assert.deepEqual(analyze(L, f.build()), expected);
    });
  }
  test(`[${target}] determinismo: dos ejecuciones dan el mismo resultado`, () => {
    const f = FIXTURES['real-illustrator-export'].build(); assert.deepEqual(analyze(L, f), analyze(L, f));
  });
  test(`[${target}] la entrada no se muta (el motor trabaja sobre copia del troquel)`, () => {
    const f = FIXTURES['real-caja-botanica'].build(); const before = JSON.stringify(f); analyze(L, f); assert.equal(JSON.stringify(f), before);
  });
}
