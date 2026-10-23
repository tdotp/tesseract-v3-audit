// Caracterización del script ExtendScript de extracción (EXTRACT_SCRIPT) sobre una maqueta de Illustrator.
// LÍMITE: maqueta, no Illustrator. Valida la LÓGICA del script (clasificación, heurísticas, errores); el comportamiento real de las
// colecciones de Illustrator se valida con tools/illustrator/*.jsx (docs/fase1/PROCEDIMIENTO_VALIDACION_ILLUSTRATOR.md).
import test from 'node:test'; import assert from 'node:assert/strict';
import { TARGETS, extractScripts, sha256 } from '../lib/legacy.mjs'; import { FIXTURES } from '../lib/fixtures.mjs';
import { makeIllustrator, runScript, path, poly, group, compound, layer } from '../lib/mock-illustrator.mjs';

const PT = 0.352778; const near = (a, b, e = 1e-9) => assert.ok(Math.abs(a - b) <= e, `${a} vs ${b}`);
const scripts = Object.fromEntries(Object.entries(TARGETS).map(([k, f]) => [k, extractScripts(f)]));
test('el EXTRACT_SCRIPT y el script de arte son idénticos en baseline y panel', () => {
  assert.equal(scripts.baseline.extract, scripts.panel.extract); assert.equal(scripts.baseline.art, scripts.panel.art);
});
const rect = [[0, 0], [100, 0], [100, 60], [0, 60]], cr = [[50, 0], [50, 60]];

for (const [target, { extract }] of Object.entries(scripts)) {
  const run = (spec) => JSON.parse(runScript(extract, makeIllustrator(spec)));
  const std = () => run({ layers: [layer('Cuts', [poly(rect)]), layer('Creases', [poly(cr, { closed: false })])] });

  test(`[${target}] ida y vuelta del troquel real: la extracción reproduce el fixture (anclas, manijas, conteos, unidades mm)`, () => {
    const d = FIXTURES['real-caja-botanica'].build();
    const out = run({ layers: [layer('Cuts', [path(d.outerBoundary)]), layer('Creases', d.creases.map((c) => path(c)))] });
    assert.equal(out.version, '1.0'); assert.equal(out.units, 'mm'); assert.equal(out.thickness_mm, 0.25);
    assert.equal(out.outerBoundary.points.length, d.outerBoundary.points.length); assert.equal(out.creases.length, 12);
    out.outerBoundary.points.forEach((p, i) => ['anchor', 'left', 'right'].forEach((k) => { near(p[k].x, d.outerBoundary.points[i][k].x, 1e-9); near(p[k].y, d.outerBoundary.points[i][k].y, 1e-9); }));
    out.creases.forEach((c, i) => c.points.forEach((p, j) => near(p.anchor.x, d.creases[i].points[j].anchor.x, 1e-9)));
    assert.deepEqual(out.meta, { cutLayer: 'Cuts', creaseLayer: 'Creases', closedCutCount: 1, openCutCount: 0, creaseCount: 12, totalCutPaths: 1, totalCreasePaths: 12 });
  });
  test(`[${target}] conversión de unidades: 1 pt = 0.352778 mm`, () => {
    const o = run({ layers: [layer('Cuts', [{ typename: 'PathItem', closed: true, guides: false, clipping: false, pathPoints: [[0, 0], [100 / PT, 0], [100 / PT, 50 / PT], [0, 50 / PT]].map((a) => ({ anchor: a, leftDirection: a, rightDirection: a })) }])] });
    near(o.outerBoundary.points[1].anchor.x, 100, 1e-6); near(o.outerBoundary.points[2].anchor.y, 50, 1e-6);
  });
  test(`[${target}] nombres de capa de corte aceptados (subcadena, sin distinguir mayúsculas)`, () => {
    for (const n of ['Cuts', 'cut', 'Corte', 'TROQUEL', 'die', 'Dieline', 'Die-Line', 'die line']) assert.equal(run({ layers: [layer(n, [poly(rect)])] }).meta.cutLayer, n, n);
  });
  test(`[${target}] nombres de capa de crease aceptados`, () => {
    for (const n of ['Creases', 'crease', 'fold', 'Doblez', 'plegado', 'Pliegue', 'score']) assert.equal(run({ layers: [layer('Cuts', [poly(rect)]), layer(n, [poly(cr, { closed: false })])] }).meta.creaseLayer, n, n);
  });
  test(`[${target}] KI-10 coincidencia por subcadena: una capa "Studies" ("die") ANTES de "Cuts" se toma como capa de corte`, () => {
    const o = run({ layers: [layer('Studies', [poly([[0, 0], [10, 0], [10, 10]])]), layer('Cuts', [poly(rect)])] }); assert.equal(o.meta.cutLayer, 'Studies');
  });
  test(`[${target}] la capa de corte debe ser de primer nivel: una subcapa "Cuts" dentro de otra capa no se encuentra`, () => {
    assert.match(run({ layers: [layer('Produccion', [], { sublayers: [layer('Cuts', [poly(rect)])] })] }).error, /CUT layer not found/);
  });
  test(`[${target}] errores: sin documento / sin capa de corte / sin contorno`, () => {
    assert.equal(run({ noDocument: true }).error, 'No document open');
    assert.match(run({ layers: [layer('Arte', [poly(rect)])] }).error, /CUT layer not found/);
    assert.match(run({ layers: [layer('Cuts', [])] }).error, /No CUT boundary found/);
  });
  test(`[${target}] sin capa de crease: creases [] y meta.creaseLayer "(none)"`, () => {
    const o = run({ layers: [layer('Cuts', [poly(rect)])] }); assert.deepEqual(o.creases, []); assert.equal(o.meta.creaseLayer, '(none)');
  });
  test(`[${target}] grupo de un nivel dentro de la capa: se recorre`, () => {
    const o = run({ layers: [layer('Cuts', [poly(rect)]), layer('Creases', [group(poly(cr, { closed: false }), poly([[20, 0], [20, 60]], { closed: false }))])] }); assert.equal(o.creases.length, 2);
  });
  test(`[${target}] KI-10 grupo anidado (grupo dentro de grupo): el script FALLA con "Script error"`, () => {
    const o = run({ layers: [layer('Cuts', [poly(rect)]), layer('Creases', [group(group(poly(cr, { closed: false })))])] }); assert.match(o.error, /^Script error:/);
  });
  test(`[${target}] trazado compuesto: sus subtrazados se tratan como trazados independientes`, () => {
    const o = run({ layers: [layer('Cuts', [compound(poly(rect), poly([[10, 10], [20, 10], [20, 20], [10, 20]]))])] }); assert.equal(o.holes.length, 1); assert.equal(o.meta.totalCutPaths, 2);
  });
  test(`[${target}] capas ocultas o bloqueadas se leen igual (no se consideran visibilidad ni bloqueo)`, () => {
    const o = run({ layers: [layer('Cuts', [poly(rect)], { visible: false, locked: true }), layer('Creases', [poly(cr, { closed: false })], { visible: false })] }); assert.equal(o.creases.length, 1); assert.equal(o.meta.cutLayer, 'Cuts');
  });
  test(`[${target}] guías y trazados de recorte se excluyen`, () => {
    const o = run({ layers: [layer('Cuts', [poly(rect), poly([[0, 0], [5, 5], [9, 1]], { guides: true }), poly([[1, 1], [8, 1], [8, 8]], { clipping: true })])] }); assert.equal(o.meta.totalCutPaths, 1);
  });
  test(`[${target}] contorno abierto con bbox > 2× el área del cerrado más grande: se usa como contorno y los cerrados pasan a huecos`, () => {
    const open = poly([[0, 0], [200, 0], [200, 100], [0, 100]], { closed: false }); const small = poly([[10, 10], [20, 10], [20, 20], [10, 20]]);
    const o = run({ layers: [layer('Cuts', [open, small])] }); assert.equal(o.outerBoundary.closed, true); assert.equal(o.outerBoundary.points.length, 4); assert.equal(o.holes.length, 1);
  });
  test(`[${target}] cortes abiertos (cutLines) se conservan aparte`, () => {
    const o = run({ layers: [layer('Cuts', [poly(rect), poly([[10, 10], [40, 10]], { closed: false })])] }); assert.equal(o.cutLines.length, 1); assert.equal(o.meta.openCutCount, 1);
  });
  test(`[${target}] un trazado abierto con extremos a ≤ 0.5 mm se considera cerrado`, () => {
    const o = run({ layers: [layer('Cuts', [poly([[0, 0], [100, 0], [100, 60], [0, 60], [0, 0.3]], { closed: false })])] }); assert.equal(o.meta.closedCutCount, 1); assert.equal(o.meta.openCutCount, 0);
  });
  test(`[${target}] crease cerrada diminuta (< 10 mm de perímetro) se descarta`, () => {
    const o = run({ layers: [layer('Cuts', [poly(rect)]), layer('Creases', [poly([[0, 0], [2, 0], [2, 2]], { closed: true }), poly(cr, { closed: false })])] }); assert.equal(o.creases.length, 1);
  });
  test(`[${target}] caso estándar: 1 contorno cerrado + 1 crease`, () => { const o = std(); assert.equal(o.outerBoundary.points.length, 4); assert.equal(o.creases.length, 1); assert.equal(o.holes.length, 0); });
}
