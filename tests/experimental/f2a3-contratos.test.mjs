// F2A-3 (preparación) — Caracterización de contratos e INMUTABILIDAD para la futura integración (docs/fase2/F2A3_PROPUESTA.md), en un
// entorno aislado: no cambia src/, experimental/, fixtures ni goldens.
//   1. Los consumidores reales de producción (escena, plegado, puentes de pliegue, GLB) se ejecutan sobre modelos CONGELADOS en profundidad
//      del legacy y del experimental: ninguna escritura (TypeError en módulos estrictos) y la instantánea no cambia. Control negativo.
//   2. Mapa de alias de la salida experimental: qué arreglos se comparten (D-F2A2P-2) y que ninguno pertenece a un objeto v1.
//   3. Prototipo de la alternativa B (adyacencias exactas adjuntas a `panels` con clave Symbol): firma v1 intacta, identidad comprobada.
//   4. Alarma estática: operaciones que mutan en sitio dentro de los consumidores (lista fijada; un cambio exige revisión).
import { test, describe } from 'node:test'; import assert from 'node:assert/strict'; import fs from 'node:fs'; import path from 'node:path';
import { ROOT, clone, gridDieline } from '../lib/fixtures.mjs';
import { createLegacyEngine } from '../../src/core/engine.js';
import * as E from '../../experimental/plegado/index.js';
import { CASOS_LEGACY, CASOS_F2A2R } from '../lib/f2/casos-plegado.mjs';
import { ejecutarConsumidores, congelar, instantanea, mapaDeAlias } from '../lib/f2/consumidores.mjs';
import { crearMotorExperimentalPrototipo, MODELO_F2A3 } from '../lib/f2/motor-v1-prototipo.mjs';
import { aliasPrint, engineApi, MALOS, errorOf } from '../lib/contracts.mjs';

const rd = (f) => JSON.parse(fs.readFileSync(path.join(ROOT, f), 'utf8'));
const CASOS = { 'caja-botanica-real': [() => rd('tests/fixtures/real/caja-botanica-real.dieline.json'), null], 'ill-real ε 0.05': [() => rd('tests/fixtures/illustrator-real/ill-real-caja-botanica.dieline.json'), 0.05],
  'hueco-descentrado': [CASOS_LEGACY['hueco-descentrado'].build, null], 'rejilla 3×3 líneas completas': [() => gridDieline(3, { fullLines: true }), null], 'A-7 sin ajuste (no plegables)': [() => rd('tests/fixtures/illustrator-real/ill-real-caja-botanica.dieline.json'), null], 'F2A-2R dos componentes': [CASOS_F2A2R.dosComponentes, null] };
const legacy = (d) => { const L = createLegacyEngine({ log: () => {} }); const m = L.buildPanels(clone(d)); const A = L.buildAdjacency(m.panels, m.creaseEdges); const b = m.panels.length ? L.defaultBaseIndex(m) : 0; return { modelo: m, adyacencias: A, arbol: m.panels.length ? L.buildFoldTree(m.panels, A, b) : [], base: b }; };
const experimental = (d, eps) => { const m = E.adaptarPanelModel(d, { eps }); const A = E.construirAdyacencias(m); const b = E.baseDefecto(m); return { modelo: m, adyacencias: A.adyacencias, arbol: E.construirArbolPlegado(m, A, b).aristas, base: b, A }; };

describe('F2A-3 · 1. consumidores reales sobre modelos congelados: ninguna mutación', () => {
  for (const [n, [build, eps]] of Object.entries(CASOS)) for (const [motor, f] of [['legacy', legacy], ['experimental', experimental]]) test(`${n} · ${motor}`, async () => {
    const R = f(build(), eps); const antes = instantanea([R.modelo, R.adyacencias, R.arbol, R.A ? [R.A.uniones, R.A.detalle] : null]);
    congelar(R.modelo); congelar(R.adyacencias); congelar(R.arbol); if (R.A) congelar(R.A);
    const r = await ejecutarConsumidores({ modelo: R.modelo, adyacencias: R.adyacencias, arbol: R.arbol, base: R.base });
    assert.equal(r.mallas, R.modelo.panels.length, 'una malla por panel'); assert.ok(r.glbBytes > 1000, 'GLB construido'); assert.equal(r.puentes, R.arbol.length, 'un visual de pliegue por FoldEdge');
    assert.equal(instantanea([R.modelo, R.adyacencias, R.arbol, R.A ? [R.A.uniones, R.A.detalle] : null]), antes, 'instantánea idéntica tras escena, plegado a 60° y GLB');
  });
  test('control negativo: un consumidor que muta (invierte los vértices de un panel) se detecta con el modelo congelado', async () => {
    const R = experimental(CASOS['caja-botanica-real'][0](), null); congelar(R.modelo); congelar(R.adyacencias); congelar(R.arbol);
    await assert.rejects(ejecutarConsumidores({ ...R, espia: (S) => S.currentPanelData.panels[0].vertices.reverse() }), TypeError);
    await assert.rejects(ejecutarConsumidores({ ...R, espia: (S) => { S.foldTree[0].crease.a.x += 1; } }), TypeError);
    await assert.rejects(ejecutarConsumidores({ ...R, espia: (S) => { S.currentPanelData.f2a2.paneles[0].creases.sort(); } }), TypeError);
  });
});

describe('F2A-3 · 2. referencias compartidas de la salida experimental (D-F2A2P-2)', () => {
  test('Caja Botánica: los arreglos compartidos están solo dentro de uniones/detalle; ningún objeto v1 (panels, creaseEdges, adyacencias v1, FoldEdge) comparte con ellos', () => {
    const R = experimental(CASOS['caja-botanica-real'][0](), null); const raiz = { panels: R.modelo.panels, creaseEdges: R.modelo.creaseEdges, f2a2: R.modelo.f2a2, adyacencias: R.adyacencias, detalle: R.A.detalle, uniones: R.A.uniones, arbol: R.arbol };
    const al = mapaDeAlias(raiz);
    for (const a of al) {
      const enV1 = a.rutas.filter((r) => /^\$\.(panels|creaseEdges|adyacencias|arbol)/.test(r)); const enExp = a.rutas.filter((r) => /^\$\.(uniones|detalle|f2a2)/.test(r));
      // alias permitidos dentro de v1 (como el legacy): edges u/v = objetos de vertices; FoldEdge.crease = AdjacencyEdge.crease
      if (enV1.length && enExp.length) assert.fail('un objeto v1 comparte referencia con datos experimentales: ' + a.rutas.join(' , '));
    }
    const compartidos = al.filter((a) => a.rutas.every((r) => /^\$\.(uniones|detalle)/.test(r))); assert.ok(compartidos.length > 0, 'hay arreglos compartidos (optimización de F2A-2P)');
    assert.ok(compartidos.every((a) => a.tipo === 'array'), 'solo se comparten arreglos (creases/segmentos)');
  });
});

describe('F2A-3 · 3. prototipo de la alternativa B: firma GeometryEngine v1 intacta, adyacencias exactas adjuntas a `panels`', () => {
  const P = crearMotorExperimentalPrototipo();
  test('forma v1 y mismo resultado que la API experimental directa', () => {
    const d = CASOS['caja-botanica-real'][0](); const m = P.buildPanels(d); const A = P.buildAdjacency(m.panels, m.creaseEdges); const b = P.defaultBaseIndex(m); const T = P.buildFoldTree(m.panels, A, b);
    const R = experimental(d, null); assert.equal(JSON.stringify([m.panels, m.creaseEdges, A, T, b]), JSON.stringify([R.modelo.panels, R.modelo.creaseEdges, R.adyacencias, R.arbol, R.base]));
    assert.deepEqual(Object.keys(P).sort(), ['buildAdjacency', 'buildFoldTree', 'buildPanels', 'contract', 'defaultBaseIndex', 'diagnosticos', 'id', 'validate']); assert.equal(P.contract, 1);
    assert.ok(!Object.keys(m.panels).includes(String(MODELO_F2A3)) && JSON.stringify(m.panels) === JSON.stringify(R.modelo.panels), 'la clave Symbol no es enumerable ni se serializa');
  });
  test('identidad comprobada: una copia del arreglo `panels` o de `creaseEdges` produce un error explícito (sin recalcular en silencio)', () => {
    const m = P.buildPanels(CASOS['caja-botanica-real'][0]());
    for (const f of [() => P.buildAdjacency(m.panels.slice(), m.creaseEdges), () => P.buildAdjacency(m.panels, m.creaseEdges.slice()), () => P.buildFoldTree(m.panels, P.buildAdjacency(m.panels, m.creaseEdges).slice(), 0)]) assert.throws(f, (e) => e.codigo === 'modelo-ajeno');
  });
  test('el flujo real de la interfaz (buildPanels → buildAdjacency(panelData.panels, panelData.creaseEdges) → buildFoldTree) funciona con los consumidores sobre el modelo congelado', async () => {
    const m = P.buildPanels(CASOS['A-7 sin ajuste (no plegables)'][0]()); const A = P.buildAdjacency(m.panels, m.creaseEdges); const b = P.defaultBaseIndex(m); const T = P.buildFoldTree(m.panels, A, b);
    congelar(m); congelar(A); congelar(T); const r = await ejecutarConsumidores({ modelo: m, adyacencias: A, arbol: T, base: b }); assert.equal(r.mallas, m.panels.length);
    const dg = P.diagnosticos(m.panels, b).map((x) => x.tipo); assert.ok(dg.includes('union-no-plegable') && dg.includes('componente-desconectado'), 'diagnósticos visibles fuera de v1');
  });
  test('alias del contrato (tests/lib/contracts.mjs aliasPrint): creases y creaseEdges con anchors de la entrada, igual que el legacy', () => {
    const d = CASOS['caja-botanica-real'][0](); const a = aliasPrint({ api: engineApi(P, []) }, d), l = aliasPrint({ api: engineApi(createLegacyEngine({ log: () => {} }), []) }, d);
    for (const k of ['creasesEsLaEntrada', 'creaseEdges', 'creaseEdgesConExtremosDeLaEntrada']) assert.equal(a[k], l[k], k);
    assert.equal(a.aristasDeArbolQueGuardanElCreaseDeLaAdyacencia, a.aristasDeArbol, 'FoldEdge.crease = AdjacencyEdge.crease (como el legacy)');
  });
  test('entradas malformadas (MALOS de A6): el prototipo nunca termina en silencio con un resultado; se registran las diferencias con el legacy', () => {
    const api = engineApi(P, []), L = engineApi(createLegacyEngine({ log: () => {} }), []); const fila = {};
    for (const [n, f] of Object.entries(MALOS)) { fila[n] = { legacy: errorOf(() => f(L)), experimental: errorOf(() => f(api)) }; if (!/validateGeometry/.test(n)) assert.notEqual(fila[n].experimental, 'sin excepción', n); }
    assert.match(fila['buildPanels(null)'].experimental, /ErrorPanelModel: entrada-invalida/); assert.equal(fila['buildFoldTree([], [], 0) (sin error)'].legacy, 'sin excepción');
  });
  test('el motor legacy no cambia: mismas 7 claves y mismas funciones que src/core/legacy', async () => {
    const L = createLegacyEngine({ log: () => {} }); assert.deepEqual(Object.keys(L).sort(), ['buildAdjacency', 'buildFoldTree', 'buildPanels', 'contract', 'defaultBaseIndex', 'id', 'validate']); assert.equal(L.id, 'legacy');
    const { buildFoldTree } = await import('../../src/core/legacy/fold-tree.js'); assert.equal(L.buildFoldTree, buildFoldTree);
  });
});

describe('F2A-3 · 4. alarma estática: operaciones que mutan en sitio en los consumidores de producción', () => {
  test('lista fijada (si cambia, revisar que no muta datos del motor y actualizar la lista con su justificación)', () => {
    const ops = []; const dir = path.join(ROOT, 'src');
    for (const sub of ['ui', 'fold', 'scene', 'app', 'export']) for (const f of fs.readdirSync(path.join(dir, sub))) { const t = fs.readFileSync(path.join(dir, sub, f), 'utf8').split('\n');
      t.forEach((l, i) => { for (const m of l.matchAll(/\.(sort|reverse|splice|copyWithin|unshift)\(/g)) ops.push(`${sub}/${f}:${i + 1} ${m[1]}`); }); }
    // única aparición: picking.js ordena el arreglo NUEVO de impactos del raycaster (no datos del motor)
    assert.deepEqual(ops, ['ui/picking.js:36 sort']);
  });
});
