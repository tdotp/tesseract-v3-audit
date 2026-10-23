// La evidencia del Nivel 0 ejecutado en Illustrator 30.8.2 real (docs/fase1/nivel0-real) fijada como prueba: integridad, KI-10, sondas, unidades de N0-A y KI-04/KI-22.
import test from 'node:test'; import assert from 'node:assert/strict'; import fs from 'node:fs'; import path from 'node:path';
import { ROOT } from '../lib/fixtures.mjs'; import { TARGETS, loadGeometry } from '../lib/legacy.mjs'; import { analyze } from '../lib/analyze.mjs'; import { analyzeDir, invariants } from '../tools/nivel0-analizar.mjs';
const DIR = path.join(ROOT, 'docs/fase1/nivel0-real'); const J = (f) => JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf8')); const L = loadGeometry(TARGETS.baseline);
const scaled = (d, k) => { const sp = (p) => ({ x: p.x * k, y: p.y * k }); const sb = (b) => ({ ...b, points: b.points.map((q) => ({ anchor: sp(q.anchor), left: sp(q.left), right: sp(q.right) })) }); return { ...d, outerBoundary: sb(d.outerBoundary), holes: d.holes.map(sb), creases: d.creases.map(sb) }; };
const o = analyzeDir(DIR); const find = (doc, id) => o.docs[doc].resultados.find((x) => x.id === id);

test('Nivel 0 real: entorno y resumen (sin fallas, sin sondas distintas; solo la escala de N0-A difiere)', () => {
  assert.match(o.env.illustrator || JSON.stringify(o.env), /30\.8\.2/); assert.equal(o.resumen.FALLA, 0); assert.equal(o.resumen.NO_EJECUTADO, 0); assert.equal(o.resumen.sondasDIF, 0);
  const dif = Object.entries(o.docs).flatMap(([d, v]) => v.resultados.filter((r) => r.estado === 'DIF').map((r) => `${d}:${r.id}`)); assert.deepEqual(dif.sort(), ['N0-A:L0-4k', 'N0-A:L0-6']);
});
test('Nivel 0 real: el guardián confirmó estado idéntico en TODAS las ejecuciones (incl. opcionales) y nunca tuvo que restaurar nada', () => {
  const files = fs.readdirSync(DIR).filter((f) => /^N0-.*__.*\.json$/.test(f)); assert.equal(files.length, 16);
  for (const f of files) { const j = J(f); assert.equal(j._integridad.identicos, true, f); assert.deepEqual(j._integridad.restaurado, [], f); }
  const log = J('run-log-rest.json'); assert.ok(Array.isArray(log) ? log.length > 10 : Object.keys(log).length > 0);
});
test('Nivel 0 real: KI-10 confirmado en Illustrator (grupo anidado ⇒ error; subcadena "Studies"; capas ocultas/bloqueadas se leen igual)', () => {
  assert.match(J('N0-C_grupos_anidados.svg__extract.json')._resultado.error, /^Script error: undefined is not an object/);
  assert.equal(J('N0-D_capa_Studies.svg__extract.json')._resultado.meta.cutLayer, 'Studies');
  const base = J('N0-B_caja_simple_arte.svg__extract.json'), ob = J('N0-B_caja_simple_arte.svg__extract-oculta-bloqueada.json');
  assert.deepEqual(ob._resultado, base._resultado); assert.deepEqual(ob._integridad.antes.capas.map((c) => [c.n, c.v, c.l]), [['Cuts', true, true], ['Creases', false, false], ['Front', true, false], ['Back', true, false]]);
});
test('Nivel 0 real: arte — modo capas y modo artboards exportan 2 caras y el PNG es el artboard redondeado a pt enteros × 8 (3176×2264, no 3175×2268)', () => {
  for (const f of ['art', 'art-artboards']) { const r = J(`N0-B_caja_simple_arte.svg__${f}.json`)._resultado; assert.equal(r.mode, f === 'art' ? 'layers' : 'artboards'); for (const s of ['front', 'back']) { assert.equal(r[s].exportScale, 800); assert.deepEqual([r[s].png.ancho, r[s].png.alto], [3176, 2264]); } }
});
test('Nivel 0 real: N0-A — Illustrator reabre el SVG (viewBox en pt) 1 px = 1 pt; la extracción real equivale a la salida REAL del plugin y el motor vigente da 11 de 13 paneles (KI-04) sin avisos', () => {
  const real = J('N0-A_caja_real_export.svg__extract.json')._resultado; assert.equal(real.error, undefined);
  const plugin = JSON.parse(fs.readFileSync(path.join(ROOT, 'tests/fixtures/real/caja-botanica-real.dieline.json'), 'utf8')); const pd = plugin.dieline || plugin; const a = invariants(real), b = invariants(pd);
  assert.deepEqual(a.bbox.map((v) => +v.toFixed(1)), b.bbox.map((v) => +v.toFixed(1))); assert.deepEqual(a.longCreases.map((v) => +v.toFixed(1)), b.longCreases.map((v) => +v.toFixed(1))); assert.equal(a.creases, 12);
  const an = analyze(L, real); assert.deepEqual([an.nPanels, an.adjacency.length, an.validate.problems.length], [11, 10, 0]);
});
test('KI-22: el resultado del motor depende de la escala absoluta del troquel — la MISMA geometría da 13 paneles a ×0.75 y 11 a ×1.0 (sin avisos en ambos)', () => {
  const real = J('N0-A_caja_real_export.svg__extract.json')._resultado; const r = (k) => { const an = analyze(L, scaled(real, k)); return [an.nPanels, an.validate.problems.length]; };
  assert.deepEqual(r(0.75), [13, 0]); assert.deepEqual(r(0.99), [13, 0]); assert.deepEqual(r(1), [11, 0]); assert.deepEqual(r(4 / 3), [11, 0]);
});
