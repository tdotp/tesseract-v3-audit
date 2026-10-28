// F2A-2 — Adaptador experimental a PanelModel v1 (experimental/plegado/adaptador.js) frente al CONTRATO real de src/core/engine.js y
// frente al ORÁCULO de F2A-0: identidad de paneles y creases, área (bruta v1 y neta), huecos, adyacencias, conservación, conversiones
// declaradas y rechazo de entradas inválidas. No se acepta por número de paneles.
import { test, describe } from 'node:test'; import assert from 'node:assert/strict'; import fs from 'node:fs'; import path from 'node:path';
import { ROOT, clone, gridDieline } from '../lib/fixtures.mjs';
import { adaptarPanelModel, validarEntrada, ErrorPanelModel, construirAdyacencias } from '../../experimental/plegado/index.js';
import { oraculo } from '../lib/f2/oraculo.mjs';
import * as Q from '../lib/f2/racional.mjs';
import { firmaTopologica } from '../lib/f2/comparar.mjs';
import { FIXTURES_F2 } from '../lib/f2/fixtures-f2.mjs';
import { firmasModelo, firmasOraculo, poligonoOraculo, distBorde, clasificarUnionesOraculo } from '../lib/f2/plegado.mjs';
import { aliasPrint } from '../lib/contracts.mjs';
import { createLegacyEngine } from '../../src/core/engine.js';

const rd = (f) => JSON.parse(fs.readFileSync(path.join(ROOT, f), 'utf8'));
const REAL = { 'caja-botanica-real': ['tests/fixtures/real/caja-botanica-real.dieline.json', null], 'ill-real-caja-botanica ε 0.05': ['tests/fixtures/illustrator-real/ill-real-caja-botanica.dieline.json', '0.05'], 'histórico ×0.75 ε 0.05': ['tests/fixtures/real/caja-botanica-illustrator-export.dieline.json', '0.05'], 'ill-real-caja-simple': ['tests/fixtures/illustrator-real/ill-real-caja-simple.dieline.json', null], 'ill-real-compuesto': ['tests/fixtures/illustrator-real/ill-real-compuesto.dieline.json', null], 'ill-real-curvas': ['tests/fixtures/illustrator-real/ill-real-curvas.dieline.json', null] };
const CASOS = [...Object.entries(FIXTURES_F2).map(([n, f]) => [n, f.build, f.eps == null ? null : f.eps]), ...Object.entries(REAL).map(([n, [f, e]]) => [n, () => rd(f), e]), ['rejilla 6×6', () => gridDieline(6), null]];

const areaCon = (ps) => { let s = 0; for (let i = 0; i < ps.length; i++) { const a = ps[i], b = ps[(i + 1) % ps.length]; s += (a.x - ps[0].x) * (b.y - ps[0].y) - (b.x - ps[0].x) * (a.y - ps[0].y); } return s / 2; };

// Contrato v1: forma exacta de los objetos (sin campos extra) y tipos
function contratoV1(m, d) {
  assert.deepEqual(Object.keys(m).sort(), ['creaseEdges', 'creases', 'f2a2', 'panels']);
  assert.equal(m.creases, d.creases || m.creases, 'creases = la lista de la entrada (alias, como el legacy)');
  for (const p of m.panels) {
    assert.deepEqual(Object.keys(p).sort(), ['area', 'centroid', 'edges', 'vertices']);
    assert.ok(p.vertices.length >= 3 && p.vertices.every((v) => Number.isFinite(v.x) && Number.isFinite(v.y) && Object.keys(v).length === 2));
    assert.ok(areaCon(p.vertices) > 0, 'vertices CCW'); assert.ok(p.area >= 0 && Math.abs(p.area - areaCon(p.vertices)) <= 1e-9 * Math.max(1, p.area));
    assert.equal(p.edges.length, p.vertices.length); p.edges.forEach((e, k) => { assert.equal(e.u, p.vertices[k]); assert.equal(e.v, p.vertices[(k + 1) % p.vertices.length]); assert.ok(e.type === 'boundary' || e.type === 'crease'); });
    assert.ok(Number.isFinite(p.centroid.x) && Number.isFinite(p.centroid.y));
  }
  for (const ce of m.creaseEdges) assert.deepEqual(Object.keys(ce).sort(), ['a', 'b', 'creaseIdx', 'segIdx']);
}

describe('F2A-2 · contrato PanelModel v1 y oráculo (22 sintéticos de F2A-0, 6 reales, rejilla)', () => {
  for (const [n, build, eps] of CASOS) test(n, () => {
    const d = build(); const antes = JSON.stringify(d);
    const m = adaptarPanelModel(d, { eps }); const O = oraculo(d, { eps });
    assert.equal(JSON.stringify(d), antes, 'no muta la entrada'); contratoV1(m, d);
    assert.doesNotThrow(() => JSON.stringify(m), 'serializable (el detalle del núcleo no es enumerable)');
    // 1 · identidad de paneles: mismo conjunto de firmas (creases que lo separan + rango por área) que el oráculo
    const fm = firmasModelo(m), fo = firmasOraculo(O); assert.deepEqual(fm.slice().sort(), fo.slice().sort(), 'paneles por firma');
    // 2 · área neta = oráculo; bruta − huecos = neta; el anillo exterior de v1 coincide con el borde del oráculo
    let M = 1; for (const p of m.panels) for (const v of p.vertices) M = Math.max(M, Math.abs(v.x), Math.abs(v.y)); const tol = (a) => 1e-9 * Math.max(1, a) + 1e-12 * M * M;
    m.f2a2.paneles.forEach((x, i) => {
      const o = O.paneles[fo.indexOf(fm[i])]; const ao = Q.aNumero(o.area);
      assert.ok(Math.abs(x.areaNeta - ao) <= tol(ao), `${fm[i]}: neta ${x.areaNeta} frente a ${ao}`);
      assert.ok(Math.abs(m.panels[i].area - x.huecos.reduce((s, h) => s + h.area, 0) - x.areaNeta) <= tol(ao), 'bruta − huecos = neta');
      if (x.huecos.length !== o.islas) assert.ok(x.huecos.length < o.islas && m.f2a2.diagnosticos.some((g) => g.tipo === 'crease-sin-efecto'), `${fm[i]}: huecos = islas del oráculo salvo creases sueltas (isla sin área, no es hueco)`);
      for (const h of x.huecos) assert.ok(areaCon(h.vertices) < 0, 'huecos CW');
      const po = poligonoOraculo(o); for (const v of m.panels[i].vertices) assert.ok(distBorde(v, po) <= 1e-9 * M + 1e-12, 'vértice v1 sobre el borde del oráculo');
    });
    // 3 · conservación
    const bruta = m.panels.reduce((s, p) => s + p.area, 0), huecos = m.f2a2.paneles.reduce((s, p) => s + p.huecos.reduce((t, h) => t + h.area, 0), 0);
    assert.ok(Math.abs(bruta - huecos - Q.aNumero(O.conservacion.generada)) <= tol(bruta), 'conservación de área');
    // 4 · UNIONES = parejas adyacentes del oráculo (por firma), con su clase = la clasificación independiente exacta; adyacencias v1 =
    //     solo las uniones plegables (F2A-2R, H-01: antes se exigía adyacencias = todas las parejas del oráculo, que fijaba el defecto)
    const A = construirAdyacencias(m); const par = (a, b) => [a, b].sort().join(' ⟷ ');
    assert.deepEqual(A.uniones.map((x) => par(fm[x.panelA], fm[x.panelB])).sort(), O.adyacencias.map((x) => par(fo[x.a], fo[x.b])).sort(), 'uniones = parejas adyacentes del oráculo');
    const CI = new Map(clasificarUnionesOraculo(O, d).map((x) => [par(fo[x.a], fo[x.b]), x]));
    for (const x of A.uniones) { const c = CI.get(par(fm[x.panelA], fm[x.panelB])); assert.deepEqual(x.creases, c.creases, 'creases de la unión'); if (c.clase !== 'sin-aristas-en-poligono') { assert.equal(x.clase, c.clase, 'clase = clasificación independiente'); assert.equal(x.grupos.length, c.rectas, 'mismas rectas'); } }
    assert.deepEqual(A.adyacencias.map((x) => par(fm[x.panelA], fm[x.panelB])).sort(), A.uniones.filter((x) => x.clase === 'plegable').map((x) => par(fm[x.panelA], fm[x.panelB])).sort(), 'adyacencias v1 = uniones plegables');
    for (const [k, x] of A.adyacencias.entries()) { const o = O.adyacencias.find((y) => [fo[y.a], fo[y.b]].sort().join() === [fm[x.panelA], fm[x.panelB]].sort().join()); assert.ok(o.creases.includes('C' + x.creaseIdx)); assert.deepEqual(A.detalle[k].creases, o.creases, 'creases de la pareja');
      for (const P of [m.panels[x.panelA], m.panels[x.panelB]]) for (const q of [x.crease.a, x.crease.b]) assert.ok(distBorde(q, P.vertices) <= 1e-9 * M + 1e-12, 'el eje está en el borde de los dos paneles'); }
    // 5 · componentes
    assert.equal(m.f2a2.componentes, O.componentesPaneles);
    // 6 · tipo de arista: el punto medio de una arista 'crease' está sobre una crease de la entrada y el de una 'boundary' sobre un corte
    const segs = (pa) => { const q = pa.points.map((x) => x.anchor); return q.map((v, k) => [v, q[(k + 1) % q.length]]).slice(0, pa.closed ? q.length : q.length - 1); };
    const enLinea = (pt, ps) => ps.some(([a, b]) => distBorde(pt, [a, b]) <= (eps ? 0.11 : 1e-9 * M + 1e-12));
    const sC = (d.creases || []).flatMap(segs), sK = [d.outerBoundary, ...(d.holes || []), ...(d.cutLines || []).map((k) => k.geom || k)].flatMap(segs);
    for (const p of m.panels) for (const e of p.edges) { const mid = { x: (e.u.x + e.v.x) / 2, y: (e.u.y + e.v.y) / 2 }; assert.ok(enLinea(mid, e.type === 'crease' ? sC : sK), `${e.type} fuera de su línea`); }
    // conversiones declaradas siempre (con su cuenta)
    assert.deepEqual(m.f2a2.conversiones.map((c) => c.tipo), ['cruce-aproximado', 'punto-ajustado-redondeado', 'antenas-fuera-del-contorno', 'huecos-solo-en-extension', 'curvas-a-polilinea', 'cierre-de-crease-fuera-de-creaseEdges']);
    assert.equal(m.f2a2.conversiones[3].cuantos, m.f2a2.paneles.reduce((s, p) => s + p.huecos.length, 0)); assert.ok(m.f2a2.conversiones[3].cuantos <= O.paneles.reduce((s, p) => s + p.islas, 0));
  });
});

describe('F2A-2 · creaseEdges e invariantes de alias: idénticos al legacy (I4)', () => {
  const L = createLegacyEngine({ log: () => {} });
  for (const [n, f] of [['caja-botanica-real', 'tests/fixtures/real/caja-botanica-real.dieline.json'], ['ill-real-caja-botanica', 'tests/fixtures/illustrator-real/ill-real-caja-botanica.dieline.json'], ['ill-real-compuesto', 'tests/fixtures/illustrator-real/ill-real-compuesto.dieline.json']]) test(n, () => {
    const d = rd(f); const m = adaptarPanelModel(d, { eps: 0.05 }); const lg = L.buildPanels(clone(d));
    assert.equal(m.creaseEdges.length, lg.creaseEdges.length); m.creaseEdges.forEach((ce, k) => { const l = lg.creaseEdges[k]; assert.deepEqual([ce.creaseIdx, ce.segIdx, ce.a, ce.b], [l.creaseIdx, l.segIdx, l.a, l.b]); assert.equal(ce.a, d.creases[ce.creaseIdx].points[ce.segIdx].anchor, 'a ES el anchor de la entrada'); });
    // huella de alias con la forma del cargador (tests/lib/contracts.mjs): creaseEdges y creases son la entrada
    const api = { buildPanels: (x) => adaptarPanelModel(x, { eps: 0.05 }), buildAdjacency: (P, C) => [], buildFoldTree: () => [], getDefaultBaseIndex: () => 0, validateGeometry: () => {}, getProblems: () => [] };
    const a = aliasPrint({ api }, d); assert.equal(a.creasesEsLaEntrada, true); assert.equal(a.creaseEdgesConExtremosDeLaEntrada, a.creaseEdges);
  });
  test('crease cerrada: el cierre no entra en creaseEdges (como el legacy) y se declara en f2a2.cierres', () => {
    const p = (x, y) => ({ anchor: { x, y }, left: { x, y }, right: { x, y } });
    const d = { version: '1.0', units: 'mm', holes: [], cutLines: [], outerBoundary: { closed: true, points: [p(0, 0), p(100, 0), p(100, 100), p(0, 100)] }, creases: [{ closed: true, points: [p(25, 25), p(75, 25), p(75, 75), p(25, 75)] }] };
    const m = adaptarPanelModel(d); assert.equal(m.creaseEdges.length, 3); assert.equal(m.f2a2.cierres.length, 1); assert.equal(m.f2a2.conversiones[5].cuantos, 1);
    assert.equal(m.panels.length, 2); const anillo = m.f2a2.paneles.find((x) => x.huecos.length); assert.equal(anillo.huecos[0].tipo, 'crease', 'el disco interior es otro panel, no un hueco de material');
    // F2A-2R (H-01): antes 1 adyacencia v1 con el lado más largo como eje; ahora la unión se conserva como no plegable y no hay AdjacencyEdge
    const A = construirAdyacencias(m); assert.equal(A.adyacencias.length, 0); assert.equal(A.uniones.length, 1); assert.equal(A.uniones[0].clase, 'no-plegable');
    assert.equal(A.uniones[0].grupos.length, 4, 'cuatro lados no colineales, todos conservados'); assert.equal(A.diagnosticos.find((x) => x.tipo === 'union-no-plegable').rectas, 4);
  });
});

describe('F2A-2 · rechazo de entradas inválidas con diagnóstico explícito (nunca se corrige la entrada)', () => {
  const p = (x, y) => ({ anchor: { x, y }, left: { x, y }, right: { x, y } }); const ok = () => ({ version: '1.0', units: 'mm', holes: [], cutLines: [], outerBoundary: { closed: true, points: [p(0, 0), p(80, 0), p(80, 40), p(0, 40)] }, creases: [{ closed: false, points: [p(40, 0), p(40, 40)] }] });
  const CASOS_MALOS = {
    null: [() => null, 'dieline'], lista: [() => [], 'dieline'], 'sin contorno': [() => ({ creases: [] }), 'trazado'], 'contorno de 2 puntos': [() => { const d = ok(); d.outerBoundary.points.length = 2; return d; }, 'trazado-corto'],
    'ancla NaN': [() => { const d = ok(); d.creases[0].points[1].anchor.x = NaN; return d; }, 'ancla'], 'ancla ausente': [() => { const d = ok(); delete d.outerBoundary.points[0].anchor; return d; }, 'ancla'],
    'manejador infinito': [() => { const d = ok(); d.outerBoundary.points[0].left.y = Infinity; return d; }, 'manejador'], 'unidades pt': [() => ({ ...ok(), units: 'pt' }), 'unidades'],
    'creases no es lista': [() => ({ ...ok(), creases: {} }), 'lista'], 'crease de un punto': [() => { const d = ok(); d.creases[0].points.length = 1; return d; }, 'trazado-corto'],
    'coordenada 1e12': [() => { const d = ok(); d.outerBoundary.points[1].anchor.x = 1e12; return d; }, 'dominio'], 'error de extracción': [() => ({ ...ok(), error: 'sin capas' }), 'dieline-error'],
  };
  for (const [n, [build, codigo]] of Object.entries(CASOS_MALOS)) test(n, () => {
    assert.ok(validarEntrada(build()).some((x) => x.codigo === codigo), 'validarEntrada');
    assert.throws(() => adaptarPanelModel(build()), (e) => e instanceof ErrorPanelModel && e.codigo === 'entrada-invalida' && e.diagnosticos.some((x) => x.codigo === codigo && x.mensaje));
  });
  for (const [n, op, codigo] of [['ε = 0', { eps: 0 }, 'opcion-eps'], ['ε negativo', { eps: -1 }, 'opcion-eps'], ['ε texto', { eps: 'abc' }, 'opcion-eps'], ['ρ < 1', { rho: 0.5 }, 'opcion-rho'], ['muestras 1', { curvas: { muestras: 1 } }, 'opcion-curvas'], ['curvas desconocidas', { curvas: 'bezier' }, 'opcion-curvas']]) test('opción ' + n, () => {
    assert.throws(() => adaptarPanelModel(ok(), op), (e) => e.codigo === 'entrada-invalida' && e.diagnosticos.some((x) => x.codigo === codigo));
  });
  test('una entrada válida no da diagnósticos de entrada', () => { assert.deepEqual(validarEntrada(ok()), []); assert.equal(adaptarPanelModel(ok()).panels.length, 2); });
  test('construirAdyacencias rechaza un modelo que no viene del adaptador (p. ej. el del legacy)', () => {
    const L = createLegacyEngine({ log: () => {} }); assert.throws(() => construirAdyacencias(L.buildPanels(ok())), (e) => e.codigo === 'modelo');
  });
});

describe('F2A-2 · identificadores, unidades y orientación', () => {
  test('repetición: salida idéntica (determinista)', () => { const d = rd('tests/fixtures/real/caja-botanica-real.dieline.json'); assert.equal(JSON.stringify(adaptarPanelModel(d)), JSON.stringify(adaptarPanelModel(d))); });
  test('f2a2.paneles[i].id/creases = paneles del núcleo en su orden canónico; firmaTopologica del modelo = la del oráculo', () => {
    const d = rd('tests/fixtures/real/caja-botanica-real.dieline.json'); const m = adaptarPanelModel(d); assert.deepEqual(m.f2a2.paneles.map((p) => p.id).sort(), m.panels.map((_, i) => 'F' + i).sort()); assert.deepEqual(m.f2a2.paneles.map((p) => p.creases.join(' ') + '|' + p.areaNeta.toFixed(6)), m.f2a2.paneles.map((p) => p.creases.join(' ') + '|' + p.areaNeta.toFixed(6)).sort(), 'orden canónico del núcleo (creases + área)');
    const R = { paneles: m.f2a2.paneles.map((p) => ({ creases: p.creases })), adyacencias: construirAdyacencias(m).adyacencias.map((x) => ({ a: x.panelA, b: x.panelB, creases: [] })), componentesPaneles: m.f2a2.componentes };
    const O = oraculo(d, {}); assert.deepEqual(firmaTopologica(R).paneles, firmaTopologica(O).paneles);
  });
  test('mm, eje Y arriba, CCW: sin conversión de unidades ni de escala (coordenadas = las de la entrada en los vértices de entrada)', () => {
    const d = rd('tests/fixtures/real/caja-botanica-real.dieline.json'); const m = adaptarPanelModel(d); assert.equal(m.f2a2.unidades, 'mm'); assert.equal(m.f2a2.ejeY, 'arriba');
    const entrada = new Set([d.outerBoundary, ...d.creases].flatMap((pa) => pa.points.map((q) => q.anchor.x + '|' + q.anchor.y)));
    const todos = new Set(m.panels.flatMap((p) => p.vertices).map((v) => v.x + '|' + v.y)); const fuera = [...todos].filter((k) => !entrada.has(k)).length;
    assert.ok(fuera / todos.size < 0.1, 'casi todos los vértices son puntos de la entrada, sin redondeo');
    assert.equal(m.f2a2.conversiones[0].cuantos, fuera, 'los demás son cruces aproximados y están declarados');
  });
});
