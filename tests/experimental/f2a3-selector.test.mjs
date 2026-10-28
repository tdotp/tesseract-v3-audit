// F2A-3 · I-2 — Selector legacy / experimental (experimental/integracion/selector.js). docs/fase2/F2A3_HANDOFF.md §9 (I-2) y la Entrega 1:
//   1. SOMBRA por defecto: salidas, excepciones y líneas de log idénticas al legacy solo (casos de plegado, MALOS y el flujo de la interfaz
//      simulado con cambio de base y segundo documento); la sombra se ejecuta DESPUÉS y solo anota una comparación estructurada.
//   2. C-03 adversarial: experimentales inyectados que lanzan (Error y no Error), tardan, mutan su entrada o devuelven basura en cada etapa ⇒
//      salida y log del legacy idénticos, ningún objeto legacy llega al experimental, sin globales nuevos, cada fallo anotado.
//   3. C-02 en modo ACTIVO: fallo antes o dentro de buildPanels ⇒ modelo legacy COMPLETO (fallback atómico, visible y anotado); fallo
//      posterior (árbol, base) ⇒ construcción DETENIDA con error explícito, nunca un árbol legacy para paneles experimentales; todas las
//      combinaciones de origen de paneles / creaseEdges / adyacencias: solo pasan las coherentes.
//   4. activación explícita (confirmación), visible, no persistente y por instancia; despacho por el ORIGEN del modelo, no por el modo.
//   5. cambio de base y de documento; H-01/H-02; 6. escena, plegado y GLB con las salidas del modo activo (también congeladas).
import { test, describe } from 'node:test'; import assert from 'node:assert/strict'; import fs from 'node:fs'; import path from 'node:path';
import { ROOT, clone, gridDieline } from '../lib/fixtures.mjs';
import { createLegacyEngine as crearLegacy } from '../../src/core/engine.js';
import * as E from '../../experimental/plegado/index.js';
import { createExperimentalEngine } from '../../experimental/integracion/motor-v1.js';
import { createLegacyEngine as crearSelector, CONFIRMACION_ACTIVO, MAX_REGISTRO } from '../../experimental/integracion/selector.js';
import { CASOS_LEGACY, CASOS_F2A2R } from '../lib/f2/casos-plegado.mjs';
import { ejecutarConsumidores } from '../lib/f2/consumidores.mjs';
import { engineApi, MALOS, errorOf } from '../lib/contracts.mjs';

const rd = (f) => JSON.parse(fs.readFileSync(path.join(ROOT, f), 'utf8'));
const CAJA = () => rd('tests/fixtures/real/caja-botanica-real.dieline.json'); const ILL = () => rd('tests/fixtures/illustrator-real/ill-real-caja-botanica.dieline.json');
const CASOS = { ...Object.fromEntries(Object.entries(CASOS_LEGACY).map(([n, c]) => [n, c.build])), ...Object.fromEntries(Object.entries(CASOS_F2A2R).map(([n, f]) => ['F2A-2R ' + n, f])) };
const SYNC = (f) => f();
const sel = (o = {}) => { const logs = []; const S = crearSelector({ log: (m) => logs.push(m), programar: SYNC, ...o }); return { S, logs }; };
const activo = (o = {}) => { const r = sel(o); assert.equal(r.S.cambiarModo('activo', { confirmacion: CONFIRMACION_ACTIVO }), true); r.logs.length = 0; return r; };
const codigo = (f) => { try { f(); return 'sin excepción'; } catch (e) { return e.codigo || e.name; } };
const ajeno = (e) => e && e.codigo === 'modelo-ajeno';
const directo = (d, eps = 0.05) => { const m = E.adaptarPanelModel(d, { eps }); const A = E.construirAdyacencias(m); return { m, A, T: (b) => E.construirArbolPlegado(m, A, b).aristas, b: E.baseDefecto(m) }; };
// Flujo de la interfaz (controller.js «Continue to 3D» → fold-controls.js buildFoldUI / setBasePanel), documento a documento, con la base
// heredada entre documentos como en la interfaz real (KI-30). Devuelve las salidas serializadas y las excepciones (texto completo).
function flujoUI(motor, docs) {
  const out = []; let base = -1;
  for (const d of docs) { try { const m = motor.buildPanels(d); if (!m.panels.length) { out.push({ paneles: 0 }); continue; }
    if (base < 0 || base >= m.panels.length) base = motor.defaultBaseIndex(m); const A = motor.buildAdjacency(m.panels, m.creaseEdges); const T = motor.buildFoldTree(m.panels, A, base);
    const otras = [0, m.panels.length - 1].map((b) => motor.buildFoldTree(m.panels, A, b)); out.push({ m, A, base, T, otras }); } catch (e) { out.push({ error: `${e.name}: ${e.message}` }); } }
  return JSON.stringify(out);
}
const legacySolo = (docs) => { const logs = []; const L = crearLegacy({ log: (m) => logs.push(m) }); return { salida: flujoUI(L, docs()), logs }; };

describe('F2A-3 · I-2 · 1. modo SOMBRA (predeterminado): exactamente el legacy', () => {
  test('forma: congelado, v1 + controles; arranca en sombra; validate ES el del legacy', () => {
    const { S } = sel(); assert.ok(Object.isFrozen(S)); assert.equal(S.modo(), 'sombra'); assert.equal(S.contract, 1); assert.equal(S.validate, crearLegacy({}).validate);
    for (const k of ['validate', 'buildPanels', 'buildAdjacency', 'buildFoldTree', 'defaultBaseIndex']) assert.equal(typeof S[k], 'function', k);
    assert.deepEqual(Object.keys(S).sort(), ['buildAdjacency', 'buildFoldTree', 'buildPanels', 'cambiarModo', 'congelarSalidas', 'contract', 'defaultBaseIndex', 'diagnosticos', 'eps', 'id', 'modo', 'origenDelModelo', 'registro', 'simularFallo', 'suscribir', 'tiempos', 'validate']);
  });
  test(`${Object.keys(CASOS).length} casos, uno a uno: salidas, excepciones y log idénticos al legacy solo; la sombra anota una comparación por etapa`, () => {
    let comparados = 0;
    for (const [n, build] of Object.entries(CASOS)) { const ref = legacySolo(() => [build()]); const { S, logs } = sel(); assert.equal(flujoUI(S, [build()]), ref.salida, n); assert.deepEqual(logs, ref.logs, n + ': log');
      comparados += S.registro().filter((e) => e.sombra && e.comparacion).length; }
    assert.ok(comparados > 100, 'comparaciones anotadas: ' + comparados);
  });
  test('flujo completo de la interfaz con cambio de base y SEGUNDO y TERCER documento (base heredada, KI-30): idéntico al legacy', () => {
    const docs = () => [CAJA(), ILL(), gridDieline(3), CAJA()]; const ref = legacySolo(docs); const { S, logs } = sel(); assert.equal(flujoUI(S, docs()), ref.salida); assert.deepEqual(logs, ref.logs);
    assert.ok(S.registro().every((e) => !e.fallo), 'la sombra no falló'); assert.equal(S.origenDelModelo(S.buildPanels(CAJA())), 'legacy');
  });
  test('entradas malformadas (MALOS de A6): misma excepción (tipo y texto) que el legacy solo', () => {
    for (const [n, f] of Object.entries(MALOS)) assert.equal(errorOf(() => f(engineApi(sel().S, []))), errorOf(() => f(engineApi(crearLegacy({ log: () => {} }), []))), n);
  });
  test('con programación diferida (setTimeout en el bundle) el legacy termina ANTES de que el experimental empiece', () => {
    const cola = []; let llamadas = 0; const fab = (o) => { const M = createExperimentalEngine(o); return { ...M, buildPanels: (d) => { llamadas++; return M.buildPanels(d); } }; };
    const { S } = sel({ programar: (f) => cola.push(f), crearExperimental: fab }); const m = S.buildPanels(CAJA()); const A = S.buildAdjacency(m.panels, m.creaseEdges); S.buildFoldTree(m.panels, A, 0);
    assert.equal(llamadas, 0, 'nada experimental durante la operación'); assert.equal(cola.length, 3); cola.splice(0).forEach((f) => f()); assert.equal(llamadas, 1);
    assert.deepEqual(S.registro().map((e) => [e.etapa, !!e.comparacion]), [['buildPanels', true], ['buildAdjacency', true], ['buildFoldTree', true]], 'orden FIFO: cada etapa encuentra el modelo en sombra');
  });
  test('comparación estructurada (Caja Botánica): 11 paneles legacy frente a 13 experimentales, adyacencias, árbol con base correspondiente y diagnósticos', () => {
    const { S } = sel(); const m = S.buildPanels(CAJA()); const A = S.buildAdjacency(m.panels, m.creaseEdges); const b = S.defaultBaseIndex(m); S.buildFoldTree(m.panels, A, b); const [P, Ad, T] = S.registro();
    assert.deepEqual([P.comparacion.legacy.paneles, P.comparacion.experimental.paneles, Ad.comparacion.legacy.adyacencias, Ad.comparacion.experimental.adyacencias], [11, 13, 10, 12]);
    assert.deepEqual(P.comparacion.diferencias.map((x) => x.campo), ['paneles', 'areaTotal', 'areas']); assert.equal(T.baseLegacy, b); assert.ok(Number.isInteger(T.baseExperimental)); assert.deepEqual(T.comparacion.experimental, { aristas: 12 });
    assert.deepEqual(T.diagnosticos, {}); assert.ok(typeof P.ms === 'number' && P.lento === false);
    const r = S.registro(); r[0].comparacion = null; assert.notEqual(S.registro()[0].comparacion, null, 'registro() devuelve una copia');
    for (let i = 0; i < MAX_REGISTRO; i++) S.buildAdjacency(m.panels, m.creaseEdges); assert.equal(S.registro().length, MAX_REGISTRO, 'registro acotado (sin crecimiento)');
  });
});

describe('F2A-3 · I-2 · 2. C-03 sombra aislada: pruebas adversariales', () => {
  const lento = () => { const t = Date.now(); while (Date.now() - t < 30); };
  const getterHostil = { get name() { throw new Error('getter hostil'); }, get message() { throw new Error('getter hostil'); } };
  const COMPORTAMIENTOS = { 'lanza Error': () => { throw new Error('fallo inyectado'); }, 'lanza una cadena': () => { throw 'cadena'; }, 'lanza undefined': () => { throw undefined; }, 'lanza un Symbol': () => { throw Symbol('x'); },
    'lanza un objeto con getters hostiles': () => { throw getterHostil; }, 'tarda 30 ms': lento, 'devuelve basura': () => 'BASURA' };
  const ETAPAS = ['buildPanels', 'buildAdjacency', 'buildFoldTree', 'diagnosticos'];
  // Experimental hostil: envuelve el real; en `etapa` aplica `hacer`; registra TODO lo que recibe y muta lo que puede de su entrada
  const hostil = (etapa, hacer, recibidos) => (o) => { const M = createExperimentalEngine(o); const w = {};
    for (const k of Object.keys(M)) w[k] = typeof M[k] !== 'function' ? M[k] : (...args) => { recibidos.push(args);
      if (k === 'buildPanels' && args[0] && typeof args[0] === 'object') { const r = M.buildPanels(args[0]); args[0].outerBoundary = null; args[0].creases.length = 0; // muta su (copia de la) entrada
        if (k === etapa && hacer() === 'BASURA') return { panels: 5 }; return r; }
      if (k === etapa) { const x = hacer(); if (x === 'BASURA') return k === 'buildPanels' ? { panels: 5 } : null; } return M[k](...args); };
    return w; };
  const alcanzables = (raiz) => { const s = new Set(); const ir = (o) => { if (!o || typeof o !== 'object' || s.has(o)) return; s.add(o); for (const k of Object.keys(o)) ir(o[k]); }; ir(raiz); return s; };
  for (const [nc, hacer] of Object.entries(COMPORTAMIENTOS)) for (const etapa of ETAPAS) test(`experimental que ${nc} en ${etapa}: legacy idéntico (salida y log), sin objetos legacy en el experimental, fallo anotado`, () => {
    const docs = () => [CAJA(), gridDieline(3)]; const ref = legacySolo(docs); const recibidos = []; const { S, logs } = sel({ crearExperimental: hostil(etapa, hacer, recibidos) });
    const entrada = docs(); const antes = JSON.stringify(entrada); const salida = flujoUI(S, entrada);
    assert.equal(salida, ref.salida); assert.deepEqual(logs, ref.logs, 'el log del legacy no cambia'); assert.equal(JSON.stringify(entrada), antes, 'la entrada de la interfaz no cambia');
    const legacyObjs = alcanzables(entrada);
    const m = S.buildPanels(entrada[0]); for (const o of alcanzables(m)) legacyObjs.add(o); const A = S.buildAdjacency(m.panels, m.creaseEdges); for (const o of alcanzables(A)) legacyObjs.add(o); S.buildFoldTree(m.panels, A, 0);
    for (const args of recibidos) for (const a of args) for (const o of alcanzables(a)) assert.ok(!legacyObjs.has(o), 'un objeto del legacy (o de la entrada de la interfaz) llegó al experimental');
    const esperaFallo = !/tarda/.test(nc) && !(etapa === 'diagnosticos' && nc === 'devuelve basura'); const reg = S.registro();
    assert.equal(reg.some((e) => e.sombra && e.fallo), esperaFallo, 'fallo anotado'); if (/tarda/.test(nc) && etapa !== 'diagnosticos') assert.ok(reg.some((e) => e.sombra && e.ms >= 30), 'duración anotada');
  });
  test('un experimental que no se puede ni crear no impide el legacy (y el modo activo queda bloqueado)', () => {
    const ref = legacySolo(() => [CAJA()]); const { S, logs } = sel({ crearExperimental: () => { throw new Error('sin motor'); } }); assert.equal(flujoUI(S, [CAJA()]), ref.salida); assert.deepEqual(logs, ref.logs);
    assert.equal(S.cambiarModo('activo', { confirmacion: CONFIRMACION_ACTIVO }), false); assert.equal(S.modo(), 'sombra'); assert.ok(S.registro().some((e) => e.etapa === 'crear-experimental'));
  });
  test('una programación que lanza (p. ej. setTimeout no disponible) no impide el legacy y queda anotada', () => {
    const ref = legacySolo(() => [CAJA()]); const { S } = sel({ programar: () => { throw new Error('sin temporizador'); } }); assert.equal(flujoUI(S, [CAJA()]), ref.salida); assert.ok(S.registro().some((e) => e.programacion));
  });
  test('sin globales nuevos ni modificados en los dos modos (el estado vive en la clausura)', () => {
    const antes = Object.getOwnPropertyNames(globalThis).sort(); const { S } = sel(); flujoUI(S, [CAJA(), ILL()]); S.cambiarModo('activo', { confirmacion: CONFIRMACION_ACTIVO }); flujoUI(S, [CAJA(), { units: 'in' }]); S.congelarSalidas(true); flujoUI(S, [CAJA()]);
    assert.deepEqual(Object.getOwnPropertyNames(globalThis).sort(), antes);
  });
  test('escena, plegado a 60° y GLB (consumidores reales) idénticos con el selector en sombra y con el legacy solo', async () => {
    for (const build of [CAJA, ILL, CASOS_F2A2R.dosComponentes]) { const r = []; for (const motor of [crearLegacy({ log: () => {} }), sel().S]) { const m = motor.buildPanels(build()); const A = motor.buildAdjacency(m.panels, m.creaseEdges); const b = motor.defaultBaseIndex(m); const T = motor.buildFoldTree(m.panels, A, b);
      r.push(JSON.stringify([await ejecutarConsumidores({ modelo: m, adyacencias: A, arbol: T, base: b }), m, A, T])); } assert.equal(r[1], r[0]); }
  });
});

describe('F2A-3 · I-2 · 3. C-02 modo ACTIVO: fallback atómico o construcción detenida, nunca mezclas', () => {
  const boom = () => { throw new E.ErrorPanelModel('nucleo-incoherente', [{ tipo: 'error', codigo: 'euler', mensaje: 'fallo inyectado' }]); };
  const legacyCompleto = (d) => { const L = crearLegacy({ log: () => {} }); const m = L.buildPanels(d); const A = L.buildAdjacency(m.panels, m.creaseEdges); const b = L.defaultBaseIndex(m); return JSON.stringify([m, A, b, L.buildFoldTree(m.panels, A, b)]); };
  for (const [n, dep] of Object.entries({ 'el adaptador lanza': { adaptarPanelModel: boom }, 'construirAdyacencias lanza': { construirAdyacencias: boom }, 'el adaptador devuelve un modelo malformado': { adaptarPanelModel: () => ({ panels: null }) },
    'adyacencia fuera de rango': { construirAdyacencias: () => ({ adyacencias: [{ panelA: 0, panelB: 99 }] }) } })) test(`${n} ⇒ modelo, adyacencias, base y árbol TODOS del legacy, con mensaje visible y registro`, () => {
    const { S, logs } = activo({ dependenciasExperimentales: dep }); const m = S.buildPanels(CAJA()); assert.equal(S.origenDelModelo(m), 'legacy');
    const A = S.buildAdjacency(m.panels, m.creaseEdges); const b = S.defaultBaseIndex(m); assert.equal(JSON.stringify([m, A, b, S.buildFoldTree(m.panels, A, b)]), legacyCompleto(CAJA()));
    assert.ok(logs.some((l) => /FALLBACK ATÓMICO/.test(l)), 'mensaje visible'); const e = S.registro().find((x) => x.fallback); assert.ok(e && e.origen === 'legacy' && e.causa && e.paneles === 11, JSON.stringify(e));
  });
  test('fallo en construirArbolPlegado (cualquier base) ⇒ construccion-detenida con etapa y causa; nunca un árbol del legacy', () => {
    let arbolesLegacy = 0; const crearLegacyEspia = (o) => { const L = crearLegacy(o); return { ...L, buildFoldTree: (...a) => { arbolesLegacy++; return L.buildFoldTree(...a); } }; };
    const { S, logs } = activo({ crearLegacy: crearLegacyEspia, dependenciasExperimentales: { construirArbolPlegado: boom } }); const m = S.buildPanels(CAJA()); assert.equal(S.origenDelModelo(m), 'experimental'); const A = S.buildAdjacency(m.panels, m.creaseEdges);
    for (let b = 0; b < m.panels.length; b++) assert.throws(() => S.buildFoldTree(m.panels, A, b), (e) => e.codigo === 'construccion-detenida' && e.diagnosticos[0].etapa === 'buildFoldTree' && e.diagnosticos[0].causa === 'nucleo-incoherente');
    assert.equal(arbolesLegacy, 0, 'ningún árbol legacy'); assert.ok(logs.some((l) => /se DETIENE sin mezclar/.test(l))); assert.equal(S.registro().filter((e) => e.detenida).length, m.panels.length);
  });
  test('base inválida y fallo en baseDefecto ⇒ construccion-detenida (explícito)', () => {
    const { S } = activo(); const m = S.buildPanels(CAJA()); const A = S.buildAdjacency(m.panels, m.creaseEdges); assert.equal(codigo(() => S.buildFoldTree(m.panels, A, 99)), 'construccion-detenida');
    const x = activo({ dependenciasExperimentales: { baseDefecto: boom } }).S; assert.equal(codigo(() => x.defaultBaseIndex(x.buildPanels(CAJA()))), 'construccion-detenida');
  });
  test('si el experimental modifica la entrada antes de fallar no hay fallback (el legacy no recibiría la entrada original): construcción detenida', () => {
    let legacyLlamado = 0; const crearLegacyEspia = (o) => { const L = crearLegacy(o); return { ...L, buildPanels: (d) => { legacyLlamado++; return L.buildPanels(d); } }; };
    const { S } = activo({ crearLegacy: crearLegacyEspia, dependenciasExperimentales: { adaptarPanelModel: (d) => { d.creases.pop(); return boom(); } } });
    assert.throws(() => S.buildPanels(CAJA()), (e) => e.codigo === 'construccion-detenida' && e.diagnosticos[0].motivo === 'entrada-mutada'); assert.equal(legacyLlamado, 0);
  });
  test('si el legacy también falla, su excepción se propaga sin cambios (como con el legacy solo) y queda anotada', () => {
    const { S } = activo(); assert.equal(errorOf(() => S.buildPanels(null)), errorOf(() => crearLegacy({ log: () => {} }).buildPanels(null))); assert.ok(S.registro().some((e) => e.legacyLanzo));
  });
  test('todas las combinaciones de origen (legacy, experimental A y B del MISMO documento, experimental de OTRO documento): solo las coherentes pasan', () => {
    const { S } = sel(); const Lm = S.buildPanels(CAJA()); S.cambiarModo('activo', { confirmacion: CONFIRMACION_ACTIVO }); const X1 = S.buildPanels(CAJA()), X2 = S.buildPanels(CAJA()), Y = S.buildPanels(ILL());
    const M = { L: Lm, X1, X2, Y }; const ADY = {}; for (const [k, m] of Object.entries(M)) ADY[k] = S.buildAdjacency(m.panels, m.creaseEdges); let ok = 0, rechazos = 0;
    for (const [kp, mp] of Object.entries(M)) for (const [kc, mc] of Object.entries(M)) {
      const f1 = () => S.buildAdjacency(mp.panels, mc.creaseEdges), f2 = () => S.buildFoldTree(mp.panels, ADY[kc], 0), f3 = () => S.defaultBaseIndex({ panels: mp.panels, creaseEdges: mc.creaseEdges });
      for (const f of [f1, f2, f3]) { if (kp === kc) { f(); ok++; } else if (kp === 'L' && kc === 'L') f(); else { assert.throws(f, ajeno, `${kp}+${kc}`); rechazos++; } } }
    assert.equal(ok, 12); assert.equal(rechazos, 36);
    assert.throws(() => S.buildFoldTree(X1.panels.slice(), ADY.X1, 0), ajeno, 'copia de panels experimentales: tampoco pasa al legacy'); assert.throws(() => S.buildAdjacency([...X1.panels], X1.creaseEdges), ajeno);
    assert.throws(() => S.buildFoldTree(Lm.panels, ADY.X1.slice(), 0), ajeno, 'copia de adyacencias experimentales con panels legacy');
  });
});

describe('F2A-3 · I-2 · 4. activación explícita, visible, no persistente; despacho por origen', () => {
  test('sin la confirmación exacta no se activa (y queda visible en el log); con ella sí; volver a sombra no exige confirmación', () => {
    const { S, logs } = sel();
    for (const o of [undefined, {}, { confirmacion: 'activar-experimental' }, { confirmacion: 'SI' }, { confirmar: CONFIRMACION_ACTIVO }, CONFIRMACION_ACTIVO]) { assert.equal(S.cambiarModo('activo', o), false); assert.equal(S.modo(), 'sombra'); }
    assert.equal(logs.filter((l) => /activación RECHAZADA/.test(l)).length, 6); assert.throws(() => S.cambiarModo('experimental'), TypeError);
    assert.equal(S.cambiarModo('activo', { confirmacion: CONFIRMACION_ACTIVO }), true); assert.equal(S.modo(), 'activo'); assert.match(logs.at(-1), /modo ACTIVO .* No es persistente/);
    assert.equal(S.cambiarModo('activo', { confirmacion: CONFIRMACION_ACTIVO }), true); assert.equal(logs.filter((l) => /modo ACTIVO/.test(l)).length, 1, 'idempotente');
    assert.equal(S.cambiarModo('sombra'), true); assert.equal(S.modo(), 'sombra'); assert.match(logs.at(-1), /modo SOMBRA/);
    assert.equal(sel().S.modo(), 'sombra', 'un selector nuevo arranca en sombra'); const a = activo().S, b = sel().S; assert.deepEqual([a.modo(), b.modo()], ['activo', 'sombra'], 'sin estado compartido entre instancias');
  });
  test('los modelos conservan su motor de origen al cambiar de modo (sin mezclas en ninguna dirección)', () => {
    const { S } = sel(); const L = crearLegacy({ log: () => {} }); const ml = S.buildPanels(CAJA()); const Al = S.buildAdjacency(ml.panels, ml.creaseEdges);
    S.cambiarModo('activo', { confirmacion: CONFIRMACION_ACTIVO }); const ref = L.buildPanels(CAJA()); const Ar = L.buildAdjacency(ref.panels, ref.creaseEdges);
    assert.equal(JSON.stringify(S.buildFoldTree(ml.panels, Al, 3)), JSON.stringify(L.buildFoldTree(ref.panels, Ar, 3)), 'modelo legacy tras activar: árbol legacy');
    const mx = S.buildPanels(CAJA()); const Ax = S.buildAdjacency(mx.panels, mx.creaseEdges); S.cambiarModo('sombra'); const D = directo(CAJA());
    assert.equal(JSON.stringify(S.buildFoldTree(mx.panels, Ax, 5)), JSON.stringify(D.T(5)), 'modelo experimental tras desactivar: árbol experimental'); assert.equal(S.origenDelModelo(mx), 'experimental');
    assert.equal(S.origenDelModelo(S.buildPanels(CAJA())), 'legacy', 'tras desactivar, los modelos nuevos son legacy'); assert.equal(S.origenDelModelo({ panels: [] }), 'desconocido');
  });
  test('aislamiento estático: motor-v1.js y selector.js sin DOM, CEP, THREE, consola, temporizadores, almacenamiento ni globales; sin let/var de módulo; imports permitidos', () => {
    const dir = path.join(ROOT, 'experimental/integracion'); const permitidos = { 'motor-v1.js': [/^\.\.\/plegado\/index\.js$/], 'selector.js': [/^\.\.\/\.\.\/src\/core\/engine\.js$/, /^\.\/motor-v1\.js$/, /^\.\.\/plegado\/index\.js$/] };
    for (const [f, ok] of Object.entries(permitidos)) { const t = fs.readFileSync(path.join(dir, f), 'utf8').replace(/\/\/.*$/gm, '');
      for (const m of t.matchAll(/^(?:import|export)[^'"\n]*from '([^']+)'/gm)) assert.ok(ok.some((r) => r.test(m[1])), `${f}: ${m[1]}`);
      assert.doesNotMatch(t, /\b(THREE|window|document|console|localStorage|sessionStorage|indexedDB|require|process|globalThis|setTimeout|setInterval|__adobe_cep__|csInterface|app\.activeDocument)\b/, f);
      assert.equal([...t.matchAll(/^(?:export )?(?:let|var) /gm)].length, 0, f + ': let/var de módulo'); }
  });
});

describe('F2A-3 · I-2 · 5–6. base, documento, H-01/H-02, plegado y GLB en modo ACTIVO', () => {
  test('Caja Botánica: 13 paneles; cada base = construirArbolPlegado; segundo documento ⇒ modelo nuevo; objetos del documento anterior rechazados; aviso KI-30 al cambiar de origen', () => {
    const { S, logs } = sel(); S.buildPanels(CAJA()); S.cambiarModo('activo', { confirmacion: CONFIRMACION_ACTIVO }); const m = S.buildPanels(CAJA()); const A = S.buildAdjacency(m.panels, m.creaseEdges); const D = directo(CAJA()); assert.equal(m.panels.length, 13);
    for (let b = 0; b < 13; b++) assert.equal(JSON.stringify(S.buildFoldTree(m.panels, A, b)), JSON.stringify(D.T(b)), 'base ' + b);
    const m2 = S.buildPanels(ILL()); assert.equal(m2.panels.length, 13); assert.notEqual(m2.panels, m.panels); assert.throws(() => S.buildFoldTree(m2.panels, A, 0), ajeno); assert.throws(() => S.buildAdjacency(m.panels, m2.creaseEdges), ajeno);
    const g = S.buildPanels(gridDieline(3)); assert.equal(g.panels.length, 9); assert.equal(S.buildFoldTree(g.panels, S.buildAdjacency(g.panels, g.creaseEdges), S.defaultBaseIndex(g)).length, 8);
    assert.ok(logs.some((l) => /KI-30/.test(l)), 'aviso de cambio de origen respecto al modelo legacy anterior'); assert.equal(logs.filter((l) => /KI-30/.test(l)).length, 1, 'solo cuando cambia el origen');
  });
  test('H-01/H-02 (CASOS_F2A2R) por el selector activo sin ajuste: árbol = API directa en todas las bases', () => {
    const { S } = activo({ eps: null });
    for (const [n, f] of Object.entries(CASOS_F2A2R)) { const m = S.buildPanels(f()); const A = S.buildAdjacency(m.panels, m.creaseEdges); const D = directo(f(), null);
      for (let b = 0; b < m.panels.length; b++) assert.equal(JSON.stringify(S.buildFoldTree(m.panels, A, b)), JSON.stringify(D.T(b)), `${n} base ${b}`); }
  });
  for (const [n, [build, eps]] of Object.entries({ 'Caja Botánica': [CAJA, 0.05], 'Illustrator real ε 0.05': [ILL, 0.05], 'A-7 sin ajuste (no plegables)': [ILL, null], 'dos componentes': [CASOS_F2A2R.dosComponentes, null], 'rejilla 3×3 líneas completas': [() => gridDieline(3, { fullLines: true }), null] }))
    test(`${n}: escena, plegado a 60° y GLB con las salidas del modo activo, congeladas en profundidad: una malla por panel, un puente por pliegue, sin escrituras`, async () => {
      const { S } = activo({ eps }); S.congelarSalidas(true); const m = S.buildPanels(build()); const A = S.buildAdjacency(m.panels, m.creaseEdges); const b = S.defaultBaseIndex(m); const T = S.buildFoldTree(m.panels, A, b);
      assert.ok(Object.isFrozen(m.panels[0].vertices) && Object.isFrozen(A) && Object.isFrozen(T)); const antes = JSON.stringify([m, A, T]);
      const x = await ejecutarConsumidores({ modelo: m, adyacencias: A, arbol: T, base: b }); assert.equal(x.mallas, m.panels.length); assert.equal(x.puentes, T.length); assert.ok(x.glbBytes > 1000); assert.equal(JSON.stringify([m, A, T]), antes);
    });
});

describe('F2A-3 · Entrega 2 · controles del selector para la interfaz: suscripción, diagnósticos y fallo simulado', () => {
  test('suscribir: aviso en cada cambio REAL de modo; se puede cancelar; un suscriptor que lanza no rompe nada', () => {
    const { S } = sel(); const vistos = []; const fuera = S.suscribir((m) => vistos.push(m)); S.suscribir(() => { throw new Error('suscriptor roto'); });
    S.cambiarModo('activo', { confirmacion: 'no' }); S.cambiarModo('activo', { confirmacion: CONFIRMACION_ACTIVO }); S.cambiarModo('activo', { confirmacion: CONFIRMACION_ACTIVO }); S.cambiarModo('sombra'); S.cambiarModo('sombra');
    assert.deepEqual(vistos, ['activo', 'sombra']); fuera(); S.cambiarModo('activo', { confirmacion: CONFIRMACION_ACTIVO }); assert.deepEqual(vistos, ['activo', 'sombra']); assert.throws(() => S.suscribir(null), TypeError);
  });
  test('diagnosticos: [] para modelos legacy o ajenos; los del motor v1 para modelos experimentales (H-01); nunca lanza', () => {
    const { S } = sel({ eps: null }); assert.deepEqual(S.diagnosticos(S.buildPanels(CAJA()), 0), []); assert.deepEqual(S.diagnosticos(null, 0), []);
    S.cambiarModo('activo', { confirmacion: CONFIRMACION_ACTIVO }); const m = S.buildPanels(CASOS_F2A2R.ele()); const M = createExperimentalEngine({ validate: crearLegacy({}).validate, eps: null }); const r = M.buildPanels(CASOS_F2A2R.ele());
    assert.deepEqual(S.diagnosticos(m, 0), M.diagnosticos(r.panels, 0)); assert.deepEqual(S.diagnosticos(m, 0).map((d) => d.tipo), ['union-no-plegable', 'componente-desconectado']);
    assert.equal(S.diagnosticos(m, 99)[0].codigo, 'base-invalida', 'un fallo se devuelve como diagnóstico');
  });
  test('simularFallo: buildPanels ⇒ fallback legacy completo; buildFoldTree ⇒ construccion-detenida (causa fallo-simulado); null lo quita; la sombra y el legacy no se ven afectados', () => {
    const ref = legacySolo(() => [CAJA()]); const { S, logs } = sel(); S.simularFallo('buildPanels'); assert.equal(flujoUI(S, [CAJA()]), ref.salida, 'en sombra no afecta'); assert.ok(logs.some((l) => /FALLARÁ \(simulado\) en buildPanels/.test(l)));
    S.cambiarModo('activo', { confirmacion: CONFIRMACION_ACTIVO }); const m = S.buildPanels(CAJA()); assert.equal(S.origenDelModelo(m), 'legacy'); assert.equal(S.registro().find((e) => e.fallback).causa.codigo, 'fallo-simulado');
    S.simularFallo('buildFoldTree'); const x = S.buildPanels(CAJA()); const A = S.buildAdjacency(x.panels, x.creaseEdges); assert.throws(() => S.buildFoldTree(x.panels, A, 0), (e) => e.codigo === 'construccion-detenida' && e.diagnosticos[0].causa === 'fallo-simulado');
    S.simularFallo(null); assert.equal(S.buildFoldTree(x.panels, A, 0).length, 12); assert.throws(() => S.simularFallo('validate'), TypeError);
  });
  test('avisarCambioDeOrigen: false (lo usa la interfaz experimental, que reinicia la base) ⇒ sin aviso KI-30 del selector', () => {
    const { S, logs } = sel({ avisarCambioDeOrigen: false }); S.buildPanels(CAJA()); S.cambiarModo('activo', { confirmacion: CONFIRMACION_ACTIVO }); S.buildPanels(CAJA()); assert.ok(!logs.some((l) => /KI-30/.test(l)));
  });
});

describe('RC · tiempos por operación (medición en CEP real)', () => {
  test('cada operación v1 anota op, modo, origen y ms con el reloj inyectado; medir no cambia salidas, excepciones ni log; acotado', () => {
    let t = 0; const reloj = () => (t += 5); const ref = legacySolo(() => [CAJA()]); const { S, logs } = sel({ reloj }); assert.equal(flujoUI(S, [CAJA()]), ref.salida); assert.deepEqual(logs, ref.logs);
    const T = S.tiempos(); assert.deepEqual([...new Set(T.map((x) => x.op))].sort(), ['buildAdjacency', 'buildFoldTree', 'buildPanels', 'defaultBaseIndex']); assert.ok(T.every((x) => x.modo === 'sombra' && x.origen === 'legacy' && x.ms > 0), JSON.stringify(T));
    S.cambiarModo('activo', { confirmacion: CONFIRMACION_ACTIVO }); const m = S.buildPanels(CAJA()); S.buildFoldTree(m.panels, S.buildAdjacency(m.panels, m.creaseEdges), 0); assert.deepEqual(S.tiempos().slice(-3).map((x) => [x.op, x.origen]), [['buildPanels', 'experimental'], ['buildAdjacency', 'experimental'], ['buildFoldTree', 'experimental']]);
    assert.equal(errorOf(() => S.buildPanels(null)), errorOf(() => crearLegacy({ log: () => {} }).buildPanels(null)), 'la excepción del legacy pasa intacta'); assert.equal(S.tiempos().at(-1).op, 'buildPanels');
    for (let i = 0; i < MAX_REGISTRO + 5; i++) S.buildAdjacency(m.panels, m.creaseEdges); assert.equal(S.tiempos().length, MAX_REGISTRO); const c = S.tiempos(); c[0].ms = -1; assert.notEqual(S.tiempos()[0].ms, -1, 'copia');
  });
});
