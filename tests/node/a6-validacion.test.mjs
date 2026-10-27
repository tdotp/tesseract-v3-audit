// A6.5 (D-A6-3) — validateGeometry se parte en cálculo (validateDieline, pura, core/legacy/validate.js) y presentación (DOM, main.js):
// (1) validateDieline contiene, línea a línea, EXACTAMENTE el cálculo original (desde «var allS» hasta el forEach), sin otra lógica que el envoltorio;
// (2) la validateGeometry de main.js = la original con ese cálculo sustituido por UNA línea que obtiene «problems» de la función pura;
// (3) los problemas COMPLETOS (id, tipo, distancia, punto) son idénticos al baseline en todos los troqueles (el golden no incluye el id).
import test from 'node:test'; import assert from 'node:assert/strict'; import fs from 'node:fs';
import { FIXTURES, clone } from '../lib/fixtures.mjs'; import { TARGETS, sourceText, extractFunctions, loadGeometry, indent2Allowed } from '../lib/legacy.mjs';
import { FAMILY } from '../tools/make-illustrator-real-fixtures.mjs'; import { ROOT } from '../lib/fixtures.mjs';

const CALL = 'problems=geometryEngine.validate(data).problems; /* A6.5/A6.6: cálculo puro del motor (core/legacy/validate.js); aquí solo la presentación */';
const orig = extractFunctions(fs.readFileSync(TARGETS.panel, 'utf8')).get('validateGeometry').split('\n');
const src = extractFunctions(sourceText(TARGETS.src), { indent2: indent2Allowed(TARGETS.src) }); // A9.5: validateGeometry vive en createController (sangría 2)
// A9.5 (D-A9-5): normalización UNIFORME de la sangría: se quita la de la primera línea a TODAS (cada línea debe empezar por ella); el resto del texto, igual
const dedent = (lines) => { const k = /^ */.exec(lines[0])[0].length; return lines.map((l) => { assert.ok(l.startsWith(' '.repeat(k)), 'sangría no uniforme: ' + l); return l.slice(k); }); };
const a = orig.indexOf('      var allS=buildAllSegs(data);'); let b = a + 1; while (orig[b] !== '      });') b++;
const calc = orig.slice(a, b + 1);

test('el cálculo original ocupa 12 líneas (var allS + forEach) y termina justo antes de la presentación', () => {
  assert.equal(calc.length, 12); assert.equal(orig[b + 1], '      if(problems.length===0){');
});
test('(1) validateDieline = envoltorio puro + el cálculo original, línea a línea (solo cambia la sangría)', () => {
  const v = src.get('validateDieline').split('\n');
  assert.deepEqual(v.slice(0, 3), ['function validateDieline(data){', '  var problems=[];', '  if(!data||data.error) return {problems:problems};']);
  assert.deepEqual(v.slice(3, 3 + calc.length), calc.map((l) => l.slice(4))); assert.deepEqual(v.slice(3 + calc.length), ['  return {problems:problems};', '}']);
});
test('(2) validateGeometry (ui/controller.js desde A9.5) = la original con el cálculo sustituido por una sola línea', () => {
  const expected = [...orig.slice(0, a), '      ' + CALL, ...orig.slice(b + 1)];
  assert.deepEqual(dedent(src.get('validateGeometry').split('\n')), dedent(expected));
});
const real = (id) => JSON.parse(fs.readFileSync(`${ROOT}/tests/fixtures/illustrator-real/${id}.dieline.json`, 'utf8'));
const full = (L, d) => { L.api.validateGeometry(clone(d)); return JSON.parse(JSON.stringify(L.api.getProblems())); };
const REF = loadGeometry(TARGETS.baseline); const cases = [...Object.entries(FIXTURES).map(([id, f]) => [id, f.build()]), ...Object.keys(FAMILY).map((id) => [id, real(id)])];
test('hay troqueles con problemas (si no, (3) no probaría nada)', () => { assert.ok(cases.filter(([, d]) => full(REF, d).length).length >= 4); });
for (const [target, file] of Object.entries(TARGETS)) {
  const L = loadGeometry(file);
  test(`[${target}] (3) problemas completos (id, tipo, distancia, punto) = baseline en todos los troqueles`, () => { for (const [id, d] of cases) assert.deepEqual(full(L, d), full(REF, d), id); });
}
