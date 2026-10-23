// Caracterización del script ExtendScript de exportación de arte (buildArtworkExportScript) sobre la maqueta de Illustrator.
import test from 'node:test'; import assert from 'node:assert/strict';
import { TARGETS, extractScripts } from '../lib/legacy.mjs'; import { makeIllustrator, runScript, layer, poly } from '../lib/mock-illustrator.mjs';
const PT = 0.352778; const near = (a, b, e = 1e-6) => assert.ok(Math.abs(a - b) <= e, `${a} vs ${b}`);
const ab = (name, w = 600, h = 400, x = 0) => ({ name, rect: [x, h, x + w, 0] }); // [left, top, right, bottom] en pt

for (const [target, file] of Object.entries(TARGETS)) {
  const { art } = extractScripts(file); const run = (spec) => { const ill = makeIllustrator(spec); return { out: JSON.parse(runScript(art, ill)), ill }; };

  test(`[${target}] artboards Front/Back: modo "artboards", 2 PNG24 con escala = 4096 px / lado largo (100–800 %), rect en mm, artboard activo restaurado`, () => {
    const r2 = run({ artboards: [ab('Otra', 100, 100), ab('Front', 600, 400, 700), ab('Back', 600, 400, 1400)] });
    assert.equal(r2.out.mode, 'artboards'); assert.equal(r2.out.front.label, 'front'); assert.equal(r2.out.back.label, 'back');
    assert.match(r2.out.front.path, /\/tmp\/mock-illustrator\/tesseract_art\/prueba_front_\d+\.png$/);
    near(r2.out.front.exportScale, 4096 / 600 * 100); near(r2.out.front.rect.width, 600 * PT); near(r2.out.front.rect.height, 400 * PT); near(r2.out.front.rect.left, 700 * PT);
    assert.equal(r2.ill.calls.exportFile.length, 2); const o = r2.ill.calls.exportFile[0].opt;
    assert.deepEqual([o.antiAliasing, o.transparency, o.artBoardClipping], [true, true, true]); assert.equal(o.horizontalScale, o.verticalScale);
    assert.equal(r2.ill.calls.exportFile[0].type, 'PNG24'); assert.equal(r2.ill.calls.exportFile[0].activeArtboard, 1); assert.equal(r2.ill.calls.exportFile[1].activeArtboard, 2);
    assert.equal(r2.ill.doc._active, 0, 'el artboard activo original debe restaurarse');
  });
  test(`[${target}] límites de escala: artboard enorme → 100 %, diminuto → 800 %`, () => {
    assert.equal(run({ artboards: [ab('Front', 5000, 3000)] }).out.front.exportScale, 100);
    assert.equal(run({ artboards: [ab('Front', 100, 50)] }).out.front.exportScale, 800);
  });
  test(`[${target}] nombres aceptados: Front/Back/Tiro/Retiro, sin distinguir mayúsculas ni espacios; "Front Art" NO`, () => {
    assert.equal(run({ artboards: [ab('  TIRO '), ab('retiro')] }).out.mode, 'artboards');
    const o = run({ artboards: [ab('Front Art')] }).out; assert.equal(o.mode, 'none'); assert.equal(o.front, null);
  });
  test(`[${target}] solo un lado: devuelve front y back null`, () => { const o = run({ artboards: [ab('Back')] }).out; assert.equal(o.front, null); assert.ok(o.back); });
  test(`[${target}] modo capas: exporta cada rama visible sola y RESTAURA la visibilidad original`, () => {
    const { out, ill } = run({ artboards: [ab('Principal')], layers: [layer('Cuts', [poly([[0, 0], [1, 0], [1, 1]])]), layer('Front'), layer('Back'), layer('Extra', [], { visible: false })] });
    assert.equal(out.mode, 'layers'); assert.equal(ill.calls.exportFile.length, 2);
    assert.deepEqual(ill.calls.exportFile[0].visible, { Cuts: false, Front: true, Back: false, Extra: false });
    assert.deepEqual(ill.calls.exportFile[1].visible, { Cuts: false, Front: false, Back: true, Extra: false });
    assert.deepEqual(ill.visibility(), { Cuts: true, Front: true, Back: true, Extra: false }); // restaurado
  });
  test(`[${target}] los artboards tienen prioridad sobre las capas`, () => {
    const { out, ill } = run({ artboards: [ab('Front')], layers: [layer('Back')] }); assert.equal(out.mode, 'artboards'); assert.equal(out.back, null); assert.equal(ill.calls.exportFile.length, 1);
  });
  test(`[${target}] sin arte: modo "none" y listas de disponibles`, () => {
    const o = run({ artboards: [ab('A')], layers: [layer('X')] }).out; assert.equal(o.mode, 'none'); assert.deepEqual(o.available.artboards.map((a) => a.name), ['A']); assert.deepEqual(o.available.layers.map((a) => a.name), ['X']);
  });
  test(`[${target}] sin documento: error "No document open"`, () => { assert.equal(run({ noDocument: true }).out.error, 'No document open'); });
}
