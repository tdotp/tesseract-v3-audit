// A6 (T6, D-A6-6) — El log del motor geométrico (texto y orden de cada mensaje, etapa por etapa) es IDÉNTICO al del baseline congelado
// en los 26 fixtures y en la familia de Illustrator real, para los tres objetivos (baseline, panel = referencia A1, src).
import test from 'node:test'; import assert from 'node:assert/strict'; import fs from 'node:fs'; import path from 'node:path';
import { FIXTURES, ROOT } from '../lib/fixtures.mjs'; import { TARGETS, loadGeometry, sha256 } from '../lib/legacy.mjs'; import { trace } from '../lib/engine-trace.mjs';
import { FAMILY } from '../tools/make-illustrator-real-fixtures.mjs';
const GOLDEN = path.join(ROOT, 'tests/golden/geometry-logs.golden.json');
const golden = JSON.parse(fs.readFileSync(GOLDEN, 'utf8')); const pins = JSON.parse(fs.readFileSync(path.join(ROOT, 'tests/golden/a6.pins.json'), 'utf8'));
const real = (id) => JSON.parse(fs.readFileSync(path.join(ROOT, `tests/fixtures/illustrator-real/${id}.dieline.json`), 'utf8'));

test('el golden de logs proviene del baseline congelado y está fijado por huella', () => {
  assert.equal(golden._sha256_main_js, sha256(TARGETS.baseline));
  assert.equal(sha256(GOLDEN), pins.archivos['tests/golden/geometry-logs.golden.json']);
  assert.deepEqual(Object.keys(golden.fixtures).sort(), Object.keys(FIXTURES).sort()); assert.deepEqual(Object.keys(golden.illustratorReal).sort(), Object.keys(FAMILY).sort());
});
test('el golden de logs no es trivial: contiene los mensajes de las cuatro etapas', () => {
  const g = golden.fixtures['real-caja-botanica'];
  assert.match(g.buildPanels.join('\n'), /^=== buildPanels ===\nClosed cut contours reclassified .*\nTotal topo segments .*\nbuildTopology: \d+ input segments\nAfter splitting: .*\nGraph: .*\nFaces traced: \d+/m);
  assert.match(g.buildPanels.at(-1), /^Connectivity filter: keeping 11 of 14 panels/);
  assert.deepEqual(g.buildAdjacency, ['Adjacency edges: 10 (strict)']); assert.deepEqual(g.buildFoldTree.base0, ['Fold tree edges: 10 (base=P0)']);
});
for (const [target, file] of Object.entries(TARGETS)) {
  const L = loadGeometry(file);
  test(`[${target}] log del motor = golden del baseline (26 fixtures)`, () => { for (const [id, f] of Object.entries(FIXTURES)) assert.deepEqual(trace(L, f.build()), golden.fixtures[id], id); });
  test(`[${target}] log del motor = golden del baseline (familia Illustrator real ×1.0)`, () => { for (const id of Object.keys(FAMILY)) assert.deepEqual(trace(L, real(id)), golden.illustratorReal[id], id); });
}
