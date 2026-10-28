// F2A-3 · I-1 — Fachada GeometryEngine v1 del motor experimental (experimental/integracion/motor-v1.js). docs/fase2/F2A3_HANDOFF.md §9 (I-1):
//   1. contrato v1 exacto y el MISMO resultado byte a byte que la API experimental directa (casos de plegado, H-01/H-02 y estrés aleatorio);
//   2. C-01: símbolo privado (no exportado, no enumerable, no se serializa) e identidad estricta: copias, mezclas de construcciones (también
//      del mismo documento), modelos del legacy y de otros documentos ⇒ ErrorPanelModel('modelo-ajeno');
//   3. árbol SOLO para la base pedida (ninguno en buildPanels) y todas las bases válidas de la Caja Botánica = construirArbolPlegado;
//   4. validate = el del legacy; 5. entradas inválidas y fallos inyectados por etapa ⇒ error explícito, nunca éxito silencioso ni registro a medias;
//   6. inmutabilidad: entrada intacta, consumidores reales sobre la salida congelada sin escrituras, alias v1 como el legacy.
import { test, describe } from 'node:test'; import assert from 'node:assert/strict'; import fs from 'node:fs'; import path from 'node:path';
import { ROOT, clone } from '../lib/fixtures.mjs';
import { createLegacyEngine } from '../../src/core/engine.js';
import * as E from '../../experimental/plegado/index.js';
import * as MV1 from '../../experimental/integracion/motor-v1.js';
import { createExperimentalEngine, esModeloExperimental, EPS_EXPERIMENTAL } from '../../experimental/integracion/motor-v1.js';
import { CASOS_LEGACY, CASOS_F2A2R } from '../lib/f2/casos-plegado.mjs';
import { generador, sintetico } from '../lib/f2/aleatorios.mjs';
import { ejecutarConsumidores, mapaDeAlias } from '../lib/f2/consumidores.mjs';
import { aliasPrint, engineApi, MALOS, errorOf } from '../lib/contracts.mjs';

const rd = (f) => JSON.parse(fs.readFileSync(path.join(ROOT, f), 'utf8'));
const CAJA = () => rd('tests/fixtures/real/caja-botanica-real.dieline.json'); const ILL = () => rd('tests/fixtures/illustrator-real/ill-real-caja-botanica.dieline.json');
const L = createLegacyEngine({ log: () => {} });
const motor = (o = {}) => createExperimentalEngine({ validate: L.validate, eps: null, ...o });
const epsDe = (c) => (c.eps == null ? null : Number(c.eps));
const ajeno = (e) => e && e.name === 'ErrorPanelModel' && e.codigo === 'modelo-ajeno';
const codigoDe = (f) => { try { f(); return 'sin excepción'; } catch (e) { return e.codigo || e.name; } };
const directo = (d, eps) => { const m = E.adaptarPanelModel(d, { eps }); const A = E.construirAdyacencias(m); const b = E.baseDefecto(m); return { m, A, b, T: E.construirArbolPlegado(m, A, b).aristas }; };
const cadena = (M, d) => { const m = M.buildPanels(d); const A = M.buildAdjacency(m.panels, m.creaseEdges); const b = M.defaultBaseIndex(m); return { m, A, b, T: M.buildFoldTree(m.panels, A, b) }; };
const CASOS = { ...Object.fromEntries(Object.entries(CASOS_LEGACY).map(([n, c]) => [n, [c.build, epsDe(c)]])), ...Object.fromEntries(Object.entries(CASOS_F2A2R).map(([n, f]) => ['F2A-2R ' + n, [f, null]])) };

describe('F2A-3 · I-1 · 1. contrato v1 y equivalencia con la API experimental directa', () => {
  test('forma: objeto congelado con las 7 claves v1 + diagnosticos; id experimental-f2a2, contract 1; validate ES el del legacy (D-F2A3-4); ε por defecto 0.05 mm', () => {
    const M = createExperimentalEngine({ validate: L.validate }); assert.ok(Object.isFrozen(M));
    assert.deepEqual(Object.keys(M).sort(), ['buildAdjacency', 'buildFoldTree', 'buildPanels', 'contract', 'defaultBaseIndex', 'diagnosticos', 'id', 'validate']);
    assert.equal(M.id, 'experimental-f2a2'); assert.equal(M.contract, 1); assert.equal(M.validate, L.validate); assert.equal(EPS_EXPERIMENTAL, 0.05);
    assert.deepEqual(M.validate(CAJA()), L.validate(CAJA()));
    assert.throws(() => createExperimentalEngine({}), TypeError, 'sin validate inyectado no se crea'); for (const eps of [-1, NaN, '0.05', Infinity]) assert.throws(() => motor({ eps }), TypeError, String(eps));
  });
  test(`${Object.keys(CASOS).length} casos de plegado (incluidos H-01/H-02): modelo, f2a2, adyacencias, base y árbol idénticos byte a byte a la API directa; la entrada no cambia`, () => {
    let n = 0;
    for (const [nombre, [build, eps]] of Object.entries(CASOS)) {
      const d = build(); const antes = JSON.stringify(d); let ref; try { ref = directo(clone(d), eps); } catch (e) { assert.equal(codigoDe(() => motor({ eps }).buildPanels(d)), e.codigo, nombre + ': mismo error que la API directa'); continue; }
      const r = cadena(motor({ eps }), d); n++;
      assert.equal(JSON.stringify([r.m.panels, r.m.creaseEdges, r.m.f2a2, r.A, r.b, r.T]), JSON.stringify([ref.m.panels, ref.m.creaseEdges, ref.m.f2a2, ref.A.adyacencias, ref.b, ref.T]), nombre);
      assert.equal(JSON.stringify(d), antes, nombre + ': la entrada no se muta');
    }
    assert.ok(n >= 38, `casos comparados: ${n}`);
  });
  test('estrés: 150 troqueles sintéticos degenerados aleatorios (semilla fija) = API directa', () => {
    const r = generador(20261028); let n = 0;
    for (let i = 0; i < 150; i++) { const d = sintetico(r); let ref; try { ref = directo(clone(d), null); } catch (e) { assert.equal(codigoDe(() => motor().buildPanels(clone(d))), e.codigo); continue; }
      if (!ref.m.panels.length) continue; const x = cadena(motor(), clone(d)); n++; assert.equal(JSON.stringify([x.m.panels, x.A, x.b, x.T]), JSON.stringify([ref.m.panels, ref.A.adyacencias, ref.b, ref.T]), 'semilla #' + i); }
    assert.ok(n > 100, `casos con paneles: ${n}`);
  });
  test('log por el sink inyectado: una línea por operación; sin sink no escribe nada', () => {
    const logs = []; const M = motor({ log: (m) => logs.push(m), eps: 0.05 }); const r = cadena(M, CAJA());
    assert.deepEqual(logs, ['=== buildPanels (experimental-f2a2, ε=0.05 mm) === panels=13', 'Adjacency edges: 12 (experimental exacto)', `Fold tree edges: 12 (base=P${r.b}, experimental)`]);
  });
});

describe('F2A-3 · I-1 · 2. C-01: símbolo privado e identidad estricta', () => {
  test('el símbolo no se exporta, no es enumerable, no es modificable y no se serializa', () => {
    assert.deepEqual(Object.keys(MV1).sort(), ['CONTRATO_MOTOR', 'EPS_EXPERIMENTAL', 'ID_MOTOR_EXPERIMENTAL', 'congelarProfundo', 'createExperimentalEngine', 'esModeloExperimental']);
    for (const v of Object.values(MV1)) assert.notEqual(typeof v, 'symbol');
    const { m } = cadena(motor(), CAJA()); const s = Object.getOwnPropertySymbols(m.panels); assert.equal(s.length, 1); assert.equal(s[0].description, 'tesseract.f2a3.modelo');
    const desc = Object.getOwnPropertyDescriptor(m.panels, s[0]); assert.deepEqual([desc.enumerable, desc.writable, desc.configurable], [false, false, false]); assert.ok(Object.isFrozen(desc.value), 'registro congelado');
    assert.equal(JSON.stringify(m.panels), JSON.stringify(directo(CAJA(), null).m.panels)); assert.ok(!Object.keys(m.panels).some((k) => !/^\d+$/.test(k)));
    assert.throws(() => { 'use strict'; m.panels[s[0]] = null; }, TypeError); assert.throws(() => Object.defineProperty(m.panels, s[0], { value: null }), TypeError);
  });
  test('copias de `panels`, `creaseEdges` o de las adyacencias ⇒ modelo-ajeno (también por reflexión del símbolo o herencia por prototipo)', () => {
    const M = motor(); const { m, A, b } = cadena(M, CAJA()); const sym = Object.getOwnPropertySymbols(m.panels)[0];
    const forjada = m.panels.slice(); Object.defineProperty(forjada, sym, { value: m.panels[sym] }); // reflexión: el registro apunta a OTRO arreglo
    const copias = { 'slice()': m.panels.slice(), spread: [...m.panels], 'Array.from': Array.from(m.panels), 'Object.assign([])': Object.assign([], m.panels), structuredClone: structuredClone(m.panels), 'Object.create(panels)': Object.create(m.panels), 'símbolo copiado por reflexión': forjada };
    for (const [n, p] of Object.entries(copias)) { assert.ok(!esModeloExperimental(p), n); assert.throws(() => M.buildAdjacency(p, m.creaseEdges), ajeno, 'buildAdjacency ' + n); assert.throws(() => M.buildFoldTree(p, A, b), ajeno, 'buildFoldTree ' + n); assert.throws(() => M.defaultBaseIndex({ panels: p, creaseEdges: m.creaseEdges }), ajeno, 'defaultBaseIndex ' + n); }
    assert.throws(() => M.buildAdjacency(m.panels, m.creaseEdges.slice()), ajeno); assert.throws(() => M.buildFoldTree(m.panels, A.slice(), b), ajeno); assert.throws(() => M.buildFoldTree(m.panels, structuredClone(A), b), ajeno);
    assert.equal(M.buildAdjacency(m.panels, m.creaseEdges), A, 'con los objetos originales devuelve SIEMPRE el mismo arreglo'); assert.equal(M.defaultBaseIndex({ ...m }), b, 'un envoltorio con los mismos panels y creaseEdges es el mismo modelo');
  });
  test('mezclas: dos construcciones del MISMO documento, dos documentos, dos motores, legacy ↔ experimental ⇒ modelo-ajeno', () => {
    const M = motor({ eps: 0.05 }), M2 = motor({ eps: 0.05 }); const A1 = cadena(M, CAJA()), A2 = cadena(M, CAJA()), O = cadena(M2, ILL());
    const Lm = L.buildPanels(CAJA()); const LA = L.buildAdjacency(Lm.panels, Lm.creaseEdges);
    const malos = { 'panels A + creaseEdges B (mismo documento)': () => M.buildAdjacency(A1.m.panels, A2.m.creaseEdges), 'panels A + adyacencias B (mismo documento)': () => M.buildFoldTree(A1.m.panels, A2.A, 0),
      'otro documento': () => M.buildFoldTree(A1.m.panels, O.A, 0), 'creaseEdges de otro documento': () => M.buildAdjacency(O.m.panels, A1.m.creaseEdges), 'modelo mezclado en defaultBaseIndex': () => M.defaultBaseIndex({ panels: A1.m.panels, creaseEdges: A2.m.creaseEdges }),
      'modelo legacy': () => M.buildAdjacency(Lm.panels, Lm.creaseEdges), 'árbol con modelo legacy': () => M.buildFoldTree(Lm.panels, LA, 0), 'adyacencias legacy con panels experimentales': () => M.buildFoldTree(A1.m.panels, LA, 0),
      'defaultBaseIndex del legacy': () => M.defaultBaseIndex(Lm), 'null': () => M.buildAdjacency(null, []), 'undefined': () => M.buildFoldTree(undefined, A1.A, 0), 'diagnosticos con copia': () => M.diagnosticos(A1.m.panels.slice(), 0) };
    for (const [n, f] of Object.entries(malos)) assert.throws(f, ajeno, n);
    assert.equal(JSON.stringify(cadena(M2, CAJA()).T), JSON.stringify(A1.T), 'otra instancia del motor acepta sus propios modelos (sin estado de instancia)');
    assert.equal(JSON.stringify(M2.buildFoldTree(A1.m.panels, A1.A, A1.b)), JSON.stringify(A1.T), 'y los de otra instancia: los datos viajan con el objeto');
  });
});

describe('F2A-3 · I-1 · 3. árbol solo para la base pedida', () => {
  test('buildPanels, buildAdjacency y defaultBaseIndex no construyen ningún árbol; buildFoldTree construye exactamente uno, para la base pedida', () => {
    const llamadas = []; const M = motor({ dependencias: { construirArbolPlegado: (m, A, b) => { llamadas.push(b); return E.construirArbolPlegado(m, A, b); } } });
    const m = M.buildPanels(CAJA()); const A = M.buildAdjacency(m.panels, m.creaseEdges); const b = M.defaultBaseIndex(m); assert.deepEqual(llamadas, []);
    M.buildFoldTree(m.panels, A, 3); assert.deepEqual(llamadas, [3]); M.buildFoldTree(m.panels, A, b); assert.deepEqual(llamadas, [3, b]);
  });
  test('Caja Botánica (13 paneles): todas las bases válidas dan el mismo árbol que construirArbolPlegado; bases inválidas ⇒ base-invalida', () => {
    const M = motor(); const { m, A } = cadena(M, CAJA()); const ref = directo(CAJA(), null); assert.equal(m.panels.length, 13);
    for (let b = 0; b < 13; b++) assert.equal(JSON.stringify(M.buildFoldTree(m.panels, A, b)), JSON.stringify(E.construirArbolPlegado(ref.m, ref.A, b).aristas), 'base ' + b);
    for (const b of [-1, 13, 1.5, NaN, '0', null]) assert.equal(codigoDe(() => M.buildFoldTree(m.panels, A, b)), 'base-invalida', String(b));
  });
});

describe('F2A-3 · I-1 · 4–5. errores explícitos y fallos por etapa', () => {
  test('entradas malformadas (MALOS de A6): nunca un éxito silencioso; código explícito', () => {
    const api = engineApi(motor(), []); const fila = {};
    for (const [n, f] of Object.entries(MALOS)) { fila[n] = errorOf(() => f(api)); if (!/validateGeometry/.test(n)) assert.notEqual(fila[n], 'sin excepción', n); }
    assert.match(fila['buildPanels(null)'], /ErrorPanelModel: entrada-invalida/); assert.match(fila['buildFoldTree([], [], 0) (sin error)'], /ErrorPanelModel: modelo-ajeno/); assert.match(fila['getDefaultBaseIndex(null)'], /ErrorPanelModel: modelo-ajeno/);
    assert.equal(fila['validateGeometry(crease sin anclas)'], errorOf(() => MALOS['validateGeometry(crease sin anclas)'](engineApi(L, []))), 'validate = legacy también en sus errores');
  });
  test('fallo inyectado en cada etapa: se propaga SIN envolver y no deja ningún modelo registrado a medias', () => {
    const boom = new Error('fallo inyectado'); let visto = null;
    const enAdaptador = motor({ dependencias: { adaptarPanelModel: () => { throw boom; } } }); assert.throws(() => enAdaptador.buildPanels(CAJA()), (e) => e === boom);
    const enAdyacencias = motor({ dependencias: { adaptarPanelModel: (d, o) => (visto = E.adaptarPanelModel(d, o)), construirAdyacencias: () => { throw boom; } } });
    assert.throws(() => enAdyacencias.buildPanels(CAJA()), (e) => e === boom); assert.ok(visto && !esModeloExperimental(visto.panels), 'el modelo del adaptador NO queda registrado');
    const malformado = motor({ dependencias: { adaptarPanelModel: () => ({ panels: [{}], creaseEdges: null }) } }); assert.equal(codigoDe(() => malformado.buildPanels(CAJA())), 'adaptador-incoherente');
    const fueraDeRango = motor({ dependencias: { construirAdyacencias: (m) => ({ adyacencias: [{ panelA: 0, panelB: m.panels.length }] }) } }); assert.equal(codigoDe(() => fueraDeRango.buildPanels(CAJA())), 'adaptador-incoherente');
    let fallar = true; const enArbol = motor({ dependencias: { construirArbolPlegado: (m, A, b) => { if (fallar) throw boom; return E.construirArbolPlegado(m, A, b); } } });
    const m = enArbol.buildPanels(CAJA()); const A = enArbol.buildAdjacency(m.panels, m.creaseEdges); assert.throws(() => enArbol.buildFoldTree(m.panels, A, 0), (e) => e === boom);
    fallar = false; assert.equal(enArbol.buildFoldTree(m.panels, A, 0).length, 12, 'el modelo sigue íntegro tras el fallo');
    const sinAristas = motor({ dependencias: { construirArbolPlegado: () => ({}) } }); const m2 = sinAristas.buildPanels(CAJA()); assert.equal(codigoDe(() => sinAristas.buildFoldTree(m2.panels, sinAristas.buildAdjacency(m2.panels, m2.creaseEdges), 0)), 'adaptador-incoherente');
  });
});

describe('F2A-3 · I-1 · 6. inmutabilidad y referencias compartidas', () => {
  const CONS = { 'caja-botanica-real': [CAJA, null], 'ill-real ε 0.05': [ILL, 0.05], 'A-7 sin ajuste (no plegables)': [ILL, null], 'F2A-2R dos componentes': [CASOS_F2A2R.dosComponentes, null], 'H-01 escalón': [CASOS_F2A2R.escalon, null] };
  for (const [n, [build, eps]] of Object.entries(CONS)) test(`${n}: con congelar=true la salida queda congelada en profundidad y los consumidores reales (escena, plegado 60°, puentes, GLB) no escriben nada`, async () => {
    const M = motor({ eps, congelar: true }); const r = cadena(M, build()); const antes = JSON.stringify([r.m, r.A, r.T]);
    for (const o of [r.m, r.m.panels, r.m.panels[0], r.m.panels[0].vertices, r.m.creaseEdges, r.A, r.T, r.m.f2a2]) assert.ok(Object.isFrozen(o));
    const x = await ejecutarConsumidores({ modelo: r.m, adyacencias: r.A, arbol: r.T, base: r.b }); assert.equal(x.mallas, r.m.panels.length); assert.equal(x.puentes, r.T.length); assert.ok(x.glbBytes > 1000);
    assert.equal(JSON.stringify([r.m, r.A, r.T]), antes, 'instantánea idéntica');
  });
  test('control negativo: con la salida congelada, un consumidor que muta se detecta (TypeError)', async () => {
    const r = cadena(motor({ congelar: true }), CAJA()); await assert.rejects(ejecutarConsumidores({ modelo: r.m, adyacencias: r.A, arbol: r.T, base: r.b, espia: (S) => S.currentPanelData.panels[0].vertices.reverse() }), TypeError);
    const s = cadena(motor(), CAJA()); assert.ok(!Object.isFrozen(s.m.panels[0]), 'sin congelar (por defecto) la salida no se congela: paridad con el legacy');
  });
  test('referencias compartidas: ningún objeto v1 comparte referencia con datos experimentales; alias del contrato iguales al legacy', () => {
    const r = cadena(motor(), CAJA()); const A = r.m.panels[Object.getOwnPropertySymbols(r.m.panels)[0]].ady;
    for (const a of mapaDeAlias({ panels: r.m.panels, creaseEdges: r.m.creaseEdges, f2a2: r.m.f2a2, adyacencias: r.A, detalle: A.detalle, uniones: A.uniones, arbol: r.T }))
      if (a.rutas.some((x) => /^\$\.(panels|creaseEdges|adyacencias|arbol)/.test(x)) && a.rutas.some((x) => /^\$\.(uniones|detalle|f2a2)/.test(x))) assert.fail('objeto v1 compartido con datos experimentales: ' + a.rutas.join(' , '));
    const a = aliasPrint({ api: engineApi(motor(), []) }, CAJA()), l = aliasPrint({ api: engineApi(L, []) }, CAJA());
    for (const k of ['creasesEsLaEntrada', 'creaseEdges', 'creaseEdgesConExtremosDeLaEntrada']) assert.equal(a[k], l[k], k);
    assert.equal(a.aristasDeArbolQueGuardanElCreaseDeLaAdyacencia, a.aristasDeArbol, 'FoldEdge.crease = AdjacencyEdge.crease (como el legacy)');
  });
});
