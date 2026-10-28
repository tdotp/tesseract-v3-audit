// F2A-2 — Comparación con el LEGACY (src/core/legacy vía createLegacyEngine, solo lectura) clasificada por separado: errores del
// adaptador (frente al oráculo; deben ser 0), diferencias topológicas y geométricas (todas deben ser correcciones: adaptador = oráculo),
// diferencias de representación, y compatibilidad conceptual (buildFoldTree y computeFoldSign del legacy sobre el modelo v1 del adaptador).
// No se fuerza la equivalencia con resultados legacy defectuosos: solo se exige igualdad donde hay evidencia de que el legacy acierta.
import { test, describe } from 'node:test'; import assert from 'node:assert/strict';
import { CASOS_LEGACY, envolvente } from '../lib/f2/casos-plegado.mjs';
import { compararConLegacy, resumenClases } from '../lib/f2/plegado-legacy.mjs';
import { adaptarPanelModel, construirAdyacencias, construirArbolPlegado } from '../../experimental/plegado/index.js';
import { ladoPorSondas, convexo } from '../lib/f2/plegado.mjs';
import { createLegacyEngine } from '../../src/core/engine.js';
import { computeFoldSign } from '../../src/core/legacy/fold-tree.js';

const L = createLegacyEngine({ log: () => {} }); const R = {};
describe('F2A-2 · legacy frente al adaptador, caso a caso', () => {
  for (const [n, c] of Object.entries(CASOS_LEGACY)) test(`${n}${c.legacyAcierta ? ' (el legacy acierta)' : c.ki.length ? ' · ' + c.ki.join(' ') : ''}`, () => {
    const r = (R[n] = compararConLegacy(c.build(), c.eps, L, { computeFoldSign, ki: c.ki })); const k = resumenClases(r);
    assert.deepEqual(r.erroresAdaptador, [], 'errores del adaptador frente al oráculo');
    for (const x of r.diferencias) if (x.clase !== 'representación') assert.equal(x.corrige, true, 'toda diferencia topológica o geométrica es una corrección: ' + x.que);
    if (c.legacyAcierta) { assert.equal(k.topología, 0, 'topología'); assert.equal(k.geometría, 0, 'geometría'); }
    else if (k.topología + k.geometría > 0) assert.ok(c.ki.length, 'toda diferencia esperada se explica con un defecto conocido o una ambigüedad registrada');
    if (r.legacySobreModelo) assert.equal(r.legacySobreModelo.mismosNiveles, true, 'buildFoldTree del legacy sobre el modelo v1: mismos niveles');
    if (r.signoCentroide) assert.equal(r.signoCentroide.convexosDistintos, 0, 'computeFoldSign (centroide) = signo del adaptador en hijos convexos');
  });
});
describe('F2A-2 · hallazgos concretos de la comparación', () => {
  test('Caja Botánica ×1 (original e Illustrator real): el legacy pierde 2 paneles (KI-04/KI-22); el adaptador conserva los 13', () => {
    const r1 = R['caja-botanica-real'], r2 = R['ill-real-caja-botanica ε 0.05'];
    for (const r of [r1, r2]) { assert.equal(r.legacy.paneles, 11); assert.equal(r.adaptador.paneles, 13); }
    assert.deepEqual(r1.diferencias.filter((x) => /perdido en el legacy/.test(x.que)).map((x) => x.que.split(' ')[1]), ['C10#0', 'C7#0'], 'original: pierde las solapas C10 y C7');
    assert.equal(r2.diferencias.filter((x) => /perdido en el legacy|cubre 2 paneles/.test(x.que)).length, 4, 'Illustrator real: funde dos paneles en una cara y deja otros tres sin emparejar (C0 C8, C0, C7)');
  });
  test('x-cruz y líneas completas (KI-09): la cara exterior colada es la BASE por defecto del legacy y su árbol no pliega nada', () => {
    for (const n of ['x-cruz', 'rejilla 3×3 líneas completas']) { const r = R[n] || compararConLegacy(CASOS_LEGACY[n].build(), null, L, { computeFoldSign }); assert.equal(r.legacy.aristas, 0); assert.ok(r.diferencias.some((x) => /BASE por defecto del legacy/.test(x.que))); assert.ok(r.arbol.aristas.length > 0); }
  });
  test('panel no convexo que envuelve al padre: computeFoldSign (centroide) da el lado contrario; el adaptador acierta (sondas)', () => {
    const m = adaptarPanelModel(envolvente()); const A = construirAdyacencias(m); const base = m.panels.findIndex((p) => p.area === 3600); const T = construirArbolPlegado(m, A, base); const e = T.aristas[0];
    assert.equal(convexo(m.panels[e.child].vertices), false); assert.equal(e.sign, ladoPorSondas(m.panels[e.child].vertices, e.crease), 'signo del adaptador = lado real');
    assert.equal(computeFoldSign(m.panels[e.parent], m.panels[e.child], e.crease), -e.sign, 'el legacy se equivoca de lado (propuesta KI-36)');
  });
});
