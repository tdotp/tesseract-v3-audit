// Familia de fixtures "illustrator-real" (extracción de Illustrator 30.8.2 real a escala ×1,0): golden del motor vigente (baseline y panel), enlace con la evidencia,
// discrepancia 13 ↔ 11 paneles frente al fixture histórico (KI-22) y congelación por huellas de los fixtures/goldens históricos de A2/A3.
import test from 'node:test'; import assert from 'node:assert/strict'; import fs from 'node:fs'; import crypto from 'node:crypto';
import { ROOT, FIXTURES } from '../lib/fixtures.mjs'; import { TARGETS, loadGeometry } from '../lib/legacy.mjs'; import { analyze } from '../lib/analyze.mjs'; import { invariants } from '../tools/nivel0-analizar.mjs'; import { build, FAMILY } from '../tools/make-illustrator-real-fixtures.mjs';
const J = (p) => JSON.parse(fs.readFileSync(`${ROOT}/${p}`, 'utf8')); const sha = (p) => crypto.createHash('sha256').update(fs.readFileSync(`${ROOT}/${p}`)).digest('hex');
const golden = J('tests/golden/illustrator-real.golden.json'); const pins = J('tests/golden/fixtures.pins.json'); const fx = (id) => J(`tests/fixtures/illustrator-real/${id}.dieline.json`);

test('la familia versionada coincide con lo que genera el generador desde la evidencia (determinista) y cubre todos los ids', () => {
  const files = build(); for (const [rel, content] of Object.entries(files)) assert.equal(fs.readFileSync(`${ROOT}/${rel}`, 'utf8'), content, rel);
  assert.deepEqual(Object.keys(golden.fixtures).sort(), Object.keys(FAMILY).sort());
  for (const [id, g] of Object.entries(golden.fixtures)) assert.equal(g.sha256Fuente, sha(`docs/fase1/nivel0-real/${g.fuente}`), id);
});
for (const [target, file] of Object.entries(TARGETS)) {
  const L = loadGeometry(file);
  for (const id of Object.keys(FAMILY)) test(`[${target}] ${id}: paneles, adyacencias, árboles y validación = golden de la extracción real`, () => { const { desc, tags, fuente, sha256Fuente, ...expected } = golden.fixtures[id]; assert.deepEqual(analyze(L, fx(id)), expected); });
}
test('KI-22 · discrepancia registrada: la misma Caja Botánica da 13 paneles en el fixture histórico (×0.75) y 11 en la extracción real (×1.0), sin avisos en ambos', () => {
  const L = loadGeometry(TARGETS.baseline); const hist = analyze(L, J('tests/fixtures/real/caja-botanica-illustrator-export.dieline.json')), real = analyze(L, fx('ill-real-caja-botanica'));
  assert.deepEqual([hist.nPanels, real.nPanels], [13, 11]); assert.deepEqual([hist.validate.problems.length, real.validate.problems.length], [0, 0]); assert.deepEqual([hist.adjacency.length, real.adjacency.length], [12, 10]);
  assert.match(golden.discrepancia_KI22.descripcion, /13 paneles/); assert.match(golden.discrepancia_KI22.descripcion, /11/);
});
test('KI-22 · el fixture real es el histórico escalado ×4/3 (mismos puntos, bbox, creases y manijas salvo la escala)', () => {
  const a = invariants(fx('ill-real-caja-botanica')), h = invariants(J('tests/fixtures/real/caja-botanica-illustrator-export.dieline.json')), k = 4 / 3;
  assert.equal(a.puntosContorno, h.puntosContorno); assert.equal(a.creases, h.creases); assert.equal(a.huecos, h.huecos);
  a.bbox.forEach((v, i) => assert.ok(Math.abs(v - h.bbox[i] * k) < 0.05, `bbox ${i}`)); assert.ok(Math.abs(a.areaContorno - h.areaContorno * k * k) / a.areaContorno < 1e-3);
  a.longCreases.forEach((v, i) => assert.ok(Math.abs(v - h.longCreases[i] * k) < 0.05, `crease ${i}`)); a.manijas.forEach((v, i) => assert.ok(Math.abs(v - h.manijas[i] * k) < 0.05, `manija ${i}`));
});
test('fixtures y goldens HISTÓRICOS de A2/A3 congelados por huella (no se modifican; la familia nueva no los sustituye)', () => {
  for (const [rel, h] of Object.entries(pins.archivos)) assert.equal(sha(rel), h, rel);
  assert.equal(Object.keys(pins.archivos).length, 7); for (const id of Object.keys(FAMILY)) assert.ok(!(id in FIXTURES), `${id} no debe mezclarse con FIXTURES históricos`);
});
test('control negativo: alterar un solo punto de la extracción real cambia el resultado respecto del golden', () => {
  const L = loadGeometry(TARGETS.baseline); const d = fx('ill-real-caja-simple'); d.outerBoundary.points[1].anchor.x += 5; const { desc, tags, fuente, sha256Fuente, ...expected } = golden.fixtures['ill-real-caja-simple']; assert.notDeepEqual(analyze(L, d), expected);
});
