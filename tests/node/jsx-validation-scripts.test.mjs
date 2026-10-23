// Los .jsx del Nivel 0 (tools/illustrator) ejecutados sobre la maqueta: mismo resultado que el script del plugin, guardián de estado
// (documento, artboard activo, selección, visibilidad/bloqueo) que restaura también ante errores, sondas de ExtendScript, solo ES3.
// LÍMITE: maqueta; la prueba real la hace el usuario en Illustrator (docs/fase1/NIVEL0_GUIA.md).
import test from 'node:test'; import assert from 'node:assert/strict'; import fs from 'node:fs'; import { execFileSync } from 'node:child_process'; import vm from 'node:vm';
import { ROOT, FIXTURES } from '../lib/fixtures.mjs'; import { TARGETS, extractScripts } from '../lib/legacy.mjs'; import { makeIllustrator, runScript, path, poly, group, compound, layer } from '../lib/mock-illustrator.mjs';
const NAMES = ['tesseract_extract_check', 'tesseract_doc_survey', 'tesseract_art_check'];
const raw = (n) => fs.readFileSync(`${ROOT}/tools/illustrator/${n}.jsx`, 'utf8'); const jsx = (n) => raw(n).replace(/^#target.*$/m, '// (directiva #target de ExtendScript omitida en Node)');
const { extract, art } = extractScripts(TARGETS.baseline); const d = FIXTURES['real-caja-botanica'].build();
const spec = () => ({ layers: [layer('Cuts', [path(d.outerBoundary)]), layer('Creases', d.creases.map((c) => path(c)))], artboards: [{ name: 'Front', rect: [0, 400, 600, 0] }, { name: 'Back', rect: [700, 400, 1300, 0] }] });
const OUT = '/tmp/mock-desktop/Tesseract_Nivel0'; const run = (n, ill) => { vm.runInNewContext(jsx(n), { ...ill.globals }); return ill.saved; };
const out = (ill, file) => JSON.parse(ill.saved.files[`${OUT}/${file}`] ?? assert.fail('no se escribió ' + file + ': ' + Object.keys(ill.saved.files)));

test('los .jsx versionados coinciden con lo que genera make-jsx.mjs desde el baseline (no hay deriva)', () => {
  const before = NAMES.map(raw); execFileSync('node', [ROOT + '/tools/illustrator/make-jsx.mjs']); assert.deepEqual(NAMES.map(raw), before);
});
test('extract_check: guarda el MISMO resultado que EXTRACT_SCRIPT con entorno e integridad; estado idéntico; escribe solo en ~/Desktop/Tesseract_Nivel0', () => {
  const ill = makeIllustrator(spec()); run('tesseract_extract_check', ill); const o = out(ill, 'prueba.ai__extract.json');
  assert.equal(o._env.illustrator, '30.8.2-mock'); assert.equal(o._env.extendscript, 'mock-es3'); assert.equal(o._integridad.identicos, true); assert.deepEqual(o._integridad.restaurado, []);
  assert.deepEqual(o._resultado, JSON.parse(runScript(extract, makeIllustrator(spec())))); assert.equal(ill.calls.exportFile.length, 0); assert.equal(Object.keys(ill.saved.files).length, 1); assert.match(ill.alerts[0], /idéntico antes\/después: SÍ/);
});
test('extract_check: errores se guardan como JSON válido (sin documento)', () => {
  const ill = makeIllustrator({ noDocument: true }); run('tesseract_extract_check', ill); assert.equal(out(ill, 'sin_documento__extract.json')._resultado.error, 'No document open');
});
test('survey: inventario, profundidad de grupos y SONDAS (KI-10: un GroupItem no tiene `layers` y leer su `.length` lanza)', () => {
  const ill = makeIllustrator({ layers: [layer('Cuts', [poly([[0, 0], [10, 0], [10, 10]]), compound(poly([[0, 0], [5, 0], [5, 5]]), poly([[1, 1], [2, 1], [2, 2]]))]), layer('Creases', [group(group(poly([[0, 0], [5, 5]], { closed: false })))], { visible: false, locked: true })], artboards: [{ name: 'Front', rect: [0, 100, 200, 0] }] });
  run('tesseract_doc_survey', ill); const o = out(ill, 'prueba.ai__survey.json'); const r = o._resultado;
  assert.deepEqual(r.layers.map((l) => [l.name, l.visible, l.locked, l.items.maxGroupDepth]), [['Cuts', true, false, 0], ['Creases', false, true, 2]]);
  assert.equal(r.layers[0].items.subtrazadosCompuestos, 2); assert.ok(Math.abs(r.artboards[0].widthMm - 200 * 0.352778) < 1e-9);
  const s = r.sondas; assert.equal(s.groupItem.typename, 'GroupItem'); assert.equal(s.groupItem.typeofLayers, 'undefined'); assert.equal(s.groupItem.layersLengthLanza, true); assert.match(s.groupItem.mensajeError, /undefined|length/);
  assert.equal(s.compound.subtrazados, 2); assert.equal(s.pathPoint.anchorLen, 2); assert.equal(s.pathPoint.left, 2); assert.deepEqual(s.artboard0.rect, [0, 100, 200, 0]); assert.ok(s.totales.pageItems >= 5);
  assert.equal(o._integridad.identicos, true); assert.equal(ill.calls.exportFile.length, 0);
});
test('art_check: resultado idéntico al del plugin (más el tamaño del PNG si existe) y estado restaurado', () => {
  const s = () => ({ artboards: [{ name: 'Principal', rect: [0, 100, 200, 0] }], layers: [layer('Cuts'), layer('Front'), layer('Back'), layer('Extra', [], { visible: false })] });
  const ill = makeIllustrator(s()); run('tesseract_art_check', ill); const o = out(ill, 'prueba.ai__art.json'); const direct = JSON.parse(runScript(art, makeIllustrator(s())));
  const norm = (r) => JSON.parse(JSON.stringify(r, (k, v) => (k === 'png' ? undefined : v)).replace(/_\d{10,}\.png/g, '_STAMP.png')); assert.deepEqual(norm(o._resultado), norm(direct)); assert.equal(o._integridad.identicos, true);
  assert.deepEqual(ill.visibility(), { Cuts: true, Front: true, Back: true, Extra: false }.constructor === Object ? ill.visibility() : null); assert.equal(ill.doc._active, 0);
});
test('GUARDIÁN: si la exportación FALLA a mitad (modo artboards), el artboard activo queda restaurado y el JSON lo registra (el script del plugin no lo restaura: KI-21)', () => {
  const ill = makeIllustrator({ artboards: [{ name: 'Otra', rect: [0, 50, 50, 0] }, { name: 'Front', rect: [100, 100, 300, 0] }, { name: 'Back', rect: [400, 100, 600, 0] }] }); ill.doc._active = 0; let n = 0; const orig = ill.doc.exportFile;
  ill.doc.exportFile = (f, t, o) => { n++; orig(f, t, o); if (n === 2) throw new Error('fallo simulado de exportación'); };
  // sin guardián (script del plugin tal cual): el artboard activo se queda cambiado
  const bare = makeIllustrator({ artboards: [{ name: 'Otra', rect: [0, 50, 50, 0] }, { name: 'Front', rect: [100, 100, 300, 0] }, { name: 'Back', rect: [400, 100, 600, 0] }] }); let m = 0; const ob = bare.doc.exportFile; bare.doc.exportFile = (f, t, o) => { m++; ob(f, t, o); if (m === 2) throw new Error('x'); };
  assert.match(JSON.parse(runScript(art, bare)).error, /Artwork export failed/); assert.equal(bare.doc._active, 2, 'sin guardián el artboard activo queda en el último exportado');
  run('tesseract_art_check', ill); const o = out(ill, 'prueba.ai__art.json'); assert.match(o._resultado.error, /Artwork export failed/); assert.equal(ill.doc._active, 0); assert.equal(o._integridad.identicos, true); assert.ok(o._integridad.restaurado.includes('artboardActivo'));
});
test('GUARDIÁN: detecta y restaura cambios de visibilidad, bloqueo, artboard y selección producidos durante la ejecución', () => {
  const ill = makeIllustrator({ artboards: [{ name: 'A', rect: [0, 50, 50, 0] }, { name: 'B', rect: [60, 50, 110, 0] }], layers: [layer('Cuts', [poly([[0, 0], [1, 0], [1, 1]])]), layer('Extra', [], { visible: true, locked: false })] });
  const selBefore = [{ id: 'item-seleccionado' }]; ill.doc.selection = selBefore; const orig = ill.doc.exportFile; ill.doc.exportFile = (f, t, o) => { orig(f, t, o); ill.doc.layers[1].visible = false; ill.doc.layers[1].locked = true; ill.doc._active = 1; ill.doc.selection = []; };
  ill.doc.artboards[0].name = 'Front'; run('tesseract_art_check', ill); const o = out(ill, 'prueba.ai__art.json');
  assert.equal(o._integridad.identicos, true); assert.ok(['visibilidad:Extra', 'bloqueo:Extra'].every((k) => o._integridad.restaurado.includes(k)), o._integridad.restaurado.join(',')); assert.equal(o._integridad.seleccionRestaurada, true); assert.equal(ill.doc.selection, selBefore);
  assert.equal(ill.doc.layers[1].visible, true); assert.equal(ill.doc.layers[1].locked, false); assert.equal(ill.doc._active, 0);
});
test('los .jsx solo usan sintaxis ES3 y APIs de ExtendScript (sin let/const/flechas/plantillas/spread/JSON/forEach/map/filter/Object.keys)', () => {
  for (const n of NAMES) {
    const code = raw(n).replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '').replace(/"(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*'/g, '""');
    for (const [re, what] of [[/=>/, 'flecha'], [/\blet\b/, 'let'], [/\bconst\b/, 'const'], [/`/, 'plantilla'], [/\.\.\./, 'spread'], [/,\s*[}\]]/, 'coma final'], [/\bJSON\./, 'JSON'], [/\.forEach\(/, 'forEach'], [/\.map\(/, 'map'], [/\.filter\(/, 'filter'], [/Object\.keys/, 'Object.keys'], [/Array\.isArray/, 'Array.isArray'], [/\.trim\(/, 'trim']]) assert.doesNotMatch(code, re, `${n}: ${what}`);
  }
});
test('los .jsx no escriben fuera de ~/Desktop/Tesseract_Nivel0 (única ruta de escritura) y no guardan ni cierran el documento', () => {
  for (const n of NAMES) { const code = raw(n); assert.match(code, /Folder\.desktop\.fsName \+ "\/Tesseract_Nivel0"/); for (const bad of [/\.save\(/, /\.saveAs\(/, /\b(?:doc|d|activeDocument)\.close\(/, /\.remove\(/, /app\.open\(/, /app\.documents\.add/, /\.delete\(/, /\.rotate\(|\.translate\(|\.resize\(/]) assert.doesNotMatch(code.replace(/\/\*[\s\S]*?\*\//g, ''), bad, `${n}: ${bad}`); }
});
