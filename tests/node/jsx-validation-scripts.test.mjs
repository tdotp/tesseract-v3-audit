// Los .jsx de validación para Illustrator real (tools/illustrator) ejecutados sobre la maqueta: producen el mismo resultado que el script del plugin,
// no modifican el documento y detectan grupos anidados (KI-10). LÍMITE: maqueta; la prueba real la hace Tato en Illustrator.
import test from 'node:test'; import assert from 'node:assert/strict'; import fs from 'node:fs'; import { execFileSync } from 'node:child_process'; import vm from 'node:vm';
import { ROOT, FIXTURES } from '../lib/fixtures.mjs'; import { TARGETS, extractScripts } from '../lib/legacy.mjs'; import { makeIllustrator, runScript, path, poly, group, layer } from '../lib/mock-illustrator.mjs';
const raw = (n) => fs.readFileSync(`${ROOT}/tools/illustrator/${n}.jsx`, 'utf8'); const jsx = (n) => raw(n).replace(/^#target.*$/m, '// (directiva #target de ExtendScript omitida en Node)'); const { extract, art } = extractScripts(TARGETS.baseline);
const d = FIXTURES['real-caja-botanica'].build();
const spec = () => ({ layers: [layer('Cuts', [path(d.outerBoundary)]), layer('Creases', d.creases.map((c) => path(c)))], artboards: [{ name: 'Front', rect: [0, 400, 600, 0] }, { name: 'Back', rect: [700, 400, 1300, 0] }] });

test('los .jsx versionados coinciden con lo que genera make-jsx.mjs desde el baseline (no hay deriva)', () => {
  const names = ['tesseract_extract_check', 'tesseract_doc_survey', 'tesseract_art_check']; const before = names.map(raw); execFileSync('node', [ROOT + '/tools/illustrator/make-jsx.mjs']);
  assert.deepEqual(names.map(raw), before);
});
test('tesseract_extract_check.jsx: guarda el MISMO resultado que EXTRACT_SCRIPT, envuelto con versión y documento; no modifica el documento', () => {
  const ill = makeIllustrator(spec()); const vis = JSON.stringify(ill.visibility()); vm.runInNewContext(jsx('tesseract_extract_check'), { ...ill.globals });
  const saved = JSON.parse(ill.saved.text); assert.equal(saved._illustrator, '30.8.2-mock'); assert.equal(saved._documento, 'prueba.ai');
  assert.deepEqual(saved._resultado, JSON.parse(runScript(extract, makeIllustrator(spec())))); assert.equal(JSON.stringify(ill.visibility()), vis); assert.equal(ill.calls.exportFile.length, 0); assert.match(ill.alerts[0], /Guardado en/);
});
test('tesseract_extract_check.jsx: errores se guardan como JSON válido (sin documento)', () => {
  const ill = makeIllustrator({ noDocument: true }); vm.runInNewContext(jsx('tesseract_extract_check'), { ...ill.globals }); assert.equal(JSON.parse(ill.saved.text)._resultado.error, 'No document open');
});
test('tesseract_doc_survey.jsx: inventario de capas/artboards y detección de grupos anidados (KI-10); no modifica nada', () => {
  const ill = makeIllustrator({ layers: [layer('Cuts', [poly([[0, 0], [10, 0], [10, 10]])]), layer('Creases', [group(group(poly([[0, 0], [5, 5]], { closed: false })))], { visible: false, locked: true })], artboards: [{ name: 'Front', rect: [0, 100, 200, 0] }] });
  vm.runInNewContext(jsx('tesseract_doc_survey'), { ...ill.globals }); const o = JSON.parse(ill.saved.text);
  assert.equal(o.illustrator, '30.8.2-mock'); assert.deepEqual(o.layers.map((l) => [l.name, l.visible, l.locked, l.items.maxGroupDepth]), [['Cuts', true, false, 0], ['Creases', false, true, 2]]);
  assert.equal(o.artboards[0].name, 'Front'); assert.ok(Math.abs(o.artboards[0].widthMm - 200 * 0.352778) < 1e-9); assert.equal(ill.calls.exportFile.length, 0);
});
test('tesseract_art_check.jsx: resultado idéntico al del plugin y visibilidad/artboard activo restaurados', () => {
  const s = () => ({ artboards: [{ name: 'Principal', rect: [0, 100, 200, 0] }], layers: [layer('Cuts'), layer('Front'), layer('Back'), layer('Extra', [], { visible: false })] });
  const ill = makeIllustrator(s()); const vis = JSON.stringify(ill.visibility()); vm.runInNewContext(jsx('tesseract_art_check'), { ...ill.globals });
  const o = JSON.parse(ill.saved.text); const direct = JSON.parse(runScript(art, makeIllustrator(s())));
  const norm = (r) => JSON.parse(JSON.stringify(r).replace(/_\d{10,}\.png/g, '_STAMP.png')); assert.deepEqual(norm(o._resultado), norm(direct)); assert.equal(JSON.stringify(ill.visibility()), vis); assert.equal(ill.doc._active, 0);
});

test('los .jsx solo usan sintaxis ES3 (ExtendScript): sin let/const/flechas/plantillas/spread', () => {
  for (const n of ['tesseract_extract_check', 'tesseract_doc_survey', 'tesseract_art_check']) {
    const code = raw(n).replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '').replace(/"(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*'/g, '""');
    for (const [re, what] of [[/=>/, 'flecha'], [/\blet\b/, 'let'], [/\bconst\b/, 'const'], [/`/, 'plantilla'], [/\.\.\./, 'spread'], [/,\s*[}\]]/, 'coma final']]) assert.doesNotMatch(code, re, `${n}: ${what}`);
  }
});
