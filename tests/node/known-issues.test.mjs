// Defectos conocidos del motor vigente (docs/KNOWN_ISSUES.md) fijados con valores concretos. Si una prueba de este archivo FALLA porque
// el defecto desapareció, no es una regresión: hay que actualizar KNOWN_ISSUES.md y el golden en una tarea aprobada (Fase 2).
// Cada bloque cita el valor "correcto" esperado y de dónde sale.
import test from 'node:test'; import assert from 'node:assert/strict';
import { FIXTURES, ROOT } from '../lib/fixtures.mjs'; import { TARGETS, loadGeometry } from '../lib/legacy.mjs'; import { analyze, outlineArea } from '../lib/analyze.mjs';
const near = (a, b, eps, msg) => assert.ok(Math.abs(a - b) <= eps, `${msg ?? ''} esperado ${b} ± ${eps}, obtenido ${a}`);

for (const [target, file] of Object.entries(TARGETS)) {
  const L = loadGeometry(file); const run = (id) => { const d = FIXTURES[id].build(); return { d, a: analyze(L, d) }; };

  test(`[${target}] KI-04 pérdida de paneles: el troquel real da 11 paneles (correcto: 13, resultado del motor candidato de tesseract-web) y pierde 1347.57 mm²`, () => {
    const { d, a } = run('real-caja-botanica');
    assert.equal(a.nPanels, 11); near(a.areaSum - outlineArea(d), -1347.573, 0.01, 'Δ área vs contorno de anclas');
    assert.match(a.logSummary.connectivity, /keeping 11 of 14 panels/); // 14 caras: 13 paneles + la cara exterior; el filtro conserva 11
  });
  test(`[${target}] el export REAL de Illustrator sí da 13 paneles / 12 adyacencias con el motor vigente`, () => {
    const { a } = run('real-illustrator-export'); assert.equal(a.nPanels, 13); assert.equal(a.adjacency.length, 12);
  });
  test(`[${target}] KI-05 ventana centrada: el panel con ventana desaparece y se cuela la cara exterior (6400 mm²) — correcto: 2 paneles que suman 5600 mm²`, () => {
    const { a } = run('hueco-centrado'); assert.equal(a.nPanels, 2); assert.equal(a.adjacency.length, 0); assert.equal(a.areaSum, 9600);
    assert.ok(a.panels.some((p) => p.area === 6400), 'falta la cara exterior colada');
  });
  test(`[${target}] KI-06 los huecos no se restan del panel: sobran 200 mm² (hueco de 200) — correcto: 6200`, () => {
    const { a } = run('hueco-descentrado'); assert.equal(a.areaSum, 6400);
  });
  test(`[${target}] KI-07 curvas ignoradas: esquinas redondeadas se aplanan a chaflán (7000 mm²) — correcto ≈ 7114.16 mm² (7200 − (4−π)·r²)`, () => {
    const { a } = run('esquinas-redondeadas'); near(a.areaSum, 7000, 1e-6); near(7200 - (4 - Math.PI) * 100, 7114.16, 0.01);
  });
  test(`[${target}] KI-07 curvas del troquel real: el motor usa solo anclas; el contorno curvo real difiere en +143 mm² (0.52 %)`, () => {
    const d = FIXTURES['real-caja-botanica'].build(); const anchors = outlineArea(d);
    const flat = []; const P = d.outerBoundary.points; const bz = (a, b, c, e, t) => ({ x: (1 - t) ** 3 * a.x + 3 * (1 - t) ** 2 * t * b.x + 3 * (1 - t) * t * t * c.x + t ** 3 * e.x, y: (1 - t) ** 3 * a.y + 3 * (1 - t) ** 2 * t * b.y + 3 * (1 - t) * t * t * c.y + t ** 3 * e.y });
    flat.push({ ...P[0].anchor }); for (let i = 0; i < P.length; i++) { const p = P[i], q = P[(i + 1) % P.length]; const curved = [p.right.x - p.anchor.x, p.right.y - p.anchor.y, q.left.x - q.anchor.x, q.left.y - q.anchor.y].some((v) => Math.abs(v) > 1e-4);
      if (curved) for (let s = 1; s <= 16; s++) flat.push(bz(p.anchor, p.right, q.left, q.anchor, s / 16)); else flat.push({ ...q.anchor }); }
    flat.pop(); let s = 0; for (let i = 0; i < flat.length; i++) { const a = flat[i], b = flat[(i + 1) % flat.length]; s += a.x * b.y - b.x * a.y; }
    near(Math.abs(s) / 2 - anchors, 143.27, 0.05);
  });
  test(`[${target}] KI-08 topología: el costo ≈ reinicios × pares² crece de forma superlineal (proxy determinista del ≈n^2.5 medido)`, () => {
    const work = (id) => { const t = run(id).a.topology; return t.iterations * (t.splitSegments ** 2) / 2; };
    assert.ok(work('rejilla-8x8') / work('rejilla-4x4') > 20, 'la relación de trabajo 8x8/4x4 debería ser > 20');
  });
  test(`[${target}] KI-09 la cara exterior se cuela como panel cuando no hay adyacencia por crease (creases de largo completo: 10 paneles en vez de 9; crease que sobresale 0.6 mm: 3 en vez de 2)`, () => {
    const a = run('rejilla-lineas-completas-3x3').a; assert.equal(a.nPanels, 10); assert.ok(a.panels.some((p) => p.area === 14400), 'falta la cara exterior (14400 mm², el contorno completo)');
    const b = run('crease-sobresale-0.6').a; assert.equal(b.nPanels, 3); assert.equal(b.areaSum, 6400);
  });
  test(`[${target}] pliegues que no alcanzan/sobresalen (insumo de la sub-fase 2A): comportamiento actual fijado`, () => {
    const r = (id) => { const a = run(id).a; return [a.nPanels, a.areaSum, a.adjacency.length, a.validate.problems.length]; };
    assert.deepEqual(r('crease-exacta'), [2, 3200, 1, 0]);
    assert.deepEqual(r('crease-corta-0.3'), [2, 3176, 1, 0]);   // pierde 24 mm² (0.75 %) con un hueco de 0.3 mm
    assert.deepEqual(r('crease-corta-0.6'), [2, 3152, 1, 2]);   // el validador avisa (> 0.5 mm) pero el modelo se construye igual
    assert.deepEqual(r('crease-sobresale-0.3'), [2, 3200, 1, 0]);
    assert.deepEqual(r('crease-sobresale-0.6'), [3, 6400, 1, 2]);
    assert.deepEqual(r('t-exacta'), [2, 1600, 1, 0]);
    assert.deepEqual(r('t-desalineada-0.375'), [2, 1592.5, 1, 0]);
    assert.deepEqual(r('t-desalineada-0.6'), [2, 1588, 1, 1]);
  });
  test(`[${target}] el validador previo solo avisa: nunca bloquea (extremos a > 0.5 mm)`, () => {
    const a = run('crease-corta-0.6').a; assert.ok(a.validate.problems.every((p) => p.type === 'Crease endpoint unconnected' && p.dist > 0.5));
  });
}

test('KI-04 causa raíz medida en el troquel real: 8 pares de extremos de crease a 0.497–0.501 mm entre sí, a ambos lados del corte de 0.5 mm', () => {
  const d = FIXTURES['real-caja-botanica'].build(); const E = []; d.creases.forEach((c, i) => { E.push([i, c.points[0].anchor]); E.push([i, c.points[c.points.length - 1].anchor]); });
  const pairs = []; for (let x = 0; x < E.length; x++) for (let y = x + 1; y < E.length; y++) { const dd = Math.hypot(E[x][1].x - E[y][1].x, E[x][1].y - E[y][1].y); if (E[x][0] !== E[y][0] && dd > 0.49 && dd < 0.51) pairs.push(+dd.toFixed(3)); }
  assert.equal(pairs.length, 8); assert.ok(Math.min(...pairs) >= 0.497 && Math.max(...pairs) <= 0.501, pairs.join(','));
  assert.ok(pairs.some((p) => p < 0.5) && pairs.some((p) => p > 0.5), 'hay pares a ambos lados del corte (GRAPH_EPS = 0.5 con comparación estricta)');
});
test('herramienta de corpus: analyze-dieline.mjs resume el troquel real (11 paneles, filtro de conectividad, 8 extremos casi coincidentes)', async () => {
  const { execFileSync } = await import('node:child_process'); const o = JSON.parse(execFileSync('node', [ROOT + '/tests/tools/analyze-dieline.mjs', ROOT + '/tests/fixtures/real/caja-botanica-real.dieline.json'], { encoding: 'utf8' }));
  assert.equal(o.paneles, 11); assert.equal(o.extremos_casi_coincidentes_0_a_1mm.length, 8); assert.match(o.filtro_de_conectividad, /keeping 11 of 14/);
});

for (const [target, file] of Object.entries(TARGETS)) {
  const L = loadGeometry(file);
  test(`[${target}] KI-04 reproducción mínima: una T de creases EXACTA (sin imprecisión alguna) ya pierde un panel — 2 paneles que suman 1600 de 3200 mm² (correcto: 3 paneles, 3200)`, () => {
    const d = FIXTURES['t-exacta'].build(); const a = analyze(L, d);
    assert.equal(a.nPanels, 2); assert.equal(a.areaSum, 1600); assert.equal(outlineArea(d), 3200);
    assert.match(a.logSummary.connectivity, /keeping 2 of 4 panels/); // la crease vertical no empareja con la arista del panel derecho (partida por la T): el panel izquierdo queda sin adyacencia y se descarta
  });
  test(`[${target}] KI-18 tolerancia lateral real de las T: el criterio "suma de distancias" acepta extremos a 2.5 mm del cruce (pierde 50 mm²) y a 5 mm deja de hacerlo (se cuela la cara exterior)`, () => {
    const r = (id) => { const a = analyze(L, FIXTURES[id].build()); return [a.nPanels, a.areaSum]; };
    assert.deepEqual(r('t-desalineada-1.0'), [2, 1580]); assert.deepEqual(r('t-desalineada-2.5'), [2, 1550]); assert.deepEqual(r('t-desalineada-5'), [2, 3200]);
  });
  test(`[${target}] KI-19 paneles pequeños o delgados se descartan en silencio (< 4 mm²; relación > 30:1 con < 120 mm²) y la cara exterior ocupa su lugar`, () => {
    const a = analyze(L, FIXTURES['panel-muy-pequeno-1.5mm2'].build()); assert.deepEqual([a.nPanels, a.areaSum], [2, 91.5]);   // 1.5 mm² descartado; 46.5 = contorno completo colado (+45 del panel grande)
    const b = analyze(L, FIXTURES['panel-delgado-40x1'].build()); assert.deepEqual([b.nPanels, b.areaSum], [2, 840]);          // la solapa de 40 mm² desaparece; 440 mm² de contorno colado
    const c = analyze(L, FIXTURES['panel-pequeno-4.5mm2'].build()); assert.deepEqual([c.nPanels, c.areaSum], [2, 94.5]);         // 4.5 mm² (sobre el umbral) sí se conserva
  });
}
