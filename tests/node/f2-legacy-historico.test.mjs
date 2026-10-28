// F2A-0 — HISTÓRICO: describe DEFECTOS del motor legacy (src/core/legacy, importado sin modificar) frente al oráculo independiente.
// Estas pruebas NO establecen el comportamiento esperado de F2: fijan el comportamiento actual para detectar cambios no autorizados y
// para medir la distancia al oráculo. Si una falla porque el legacy cambió, no es una mejora automática: requiere una tarea aprobada.
// Comportamiento ESPERADO de F2: f2-oraculo, f2-caja-botanica y f2-metamorficas.
import { test, describe } from 'node:test'; import assert from 'node:assert/strict'; import fs from 'node:fs'; import path from 'node:path';
import { ROOT } from '../lib/fixtures.mjs';
import { buildPanels } from '../../src/core/legacy/panels.js';
import { buildAdjacency } from '../../src/core/legacy/adjacency.js';
import { oraculo } from '../lib/f2/oraculo.mjs';
import { compararLegacy, transformarDouble, invertirTrazado, firmaTopologica } from '../lib/f2/comparar.mjs';
import { FIXTURES_F2 } from '../lib/f2/fixtures-f2.mjs';

const rd = (f) => JSON.parse(fs.readFileSync(path.join(ROOT, f), 'utf8'));
const REAL = rd('tests/fixtures/real/caja-botanica-real.dieline.json'), ILL = rd('tests/fixtures/illustrator-real/ill-real-caja-botanica.dieline.json'), SIMPLE = rd('tests/fixtures/illustrator-real/ill-real-caja-simple.dieline.json');
const legacy = (d) => { const pd = buildPanels(JSON.parse(JSON.stringify(d))); return { panels: pd.panels, adj: buildAdjacency(pd.panels, pd.creaseEdges) }; };
const escala = (d, s) => transformarDouble(d, (p) => ({ x: p.x * s, y: p.y * s }));
const areas = (ps) => ps.map((p) => +p.area.toFixed(4)).sort((a, b) => a - b);
const perdidos = (c) => c.filas.filter((f) => f.clase.startsWith('topología')).map((f) => f.creases).sort();

describe('HISTÓRICO · KI-22 (dependencia de la escala) frente al oráculo', () => {
  test('extracción original ×1: el legacy da 11; respecto al oráculo pierde los paneles de C10 y C7 y desplaza bordes ±19.90 mm² (franjas de 0.4974 × 40 mm)', () => {
    const L = legacy(REAL), c = compararLegacy(oraculo(REAL, {}), L.panels, L.adj);
    assert.equal(L.panels.length, 11); assert.deepEqual(perdidos(c), ['C10', 'C7']); assert.equal(c.adyFaltan.length, 2);
    const des = c.filas.filter((f) => f.clase.startsWith('geometría')).map((f) => Math.abs(f.dA)); assert.equal(des.filter((x) => Math.abs(x - 19.90) < 0.01).length, 3);
  });
  test('extracción de Illustrator real ×1: el legacy da 11 pero pierde OTROS paneles (fusiona C0 con C0 C8 y pierde C7)', () => {
    const L = legacy(ILL), c = compararLegacy(oraculo(ILL, { eps: '0.05' }), L.panels, L.adj);
    assert.equal(L.panels.length, 11); assert.deepEqual(perdidos(c), ['C0', 'C0 C8', 'C7']); assert.ok(c.filas.find((f) => f.creases === 'C0 C8').clase.includes('fusionado'));
  });
  test('×0.75: el legacy acierta el conteo (13) y todas las adyacencias, pero con bordes desplazados (máx. |ΔA| ≈ 33.8 mm² en C6 C7 C9 C10)', () => {
    for (const d of [REAL, ILL]) {
      const ds = escala(d, 0.75), L = legacy(ds), c = compararLegacy(oraculo(ds, { eps: '0.05' }), L.panels, L.adj);
      assert.equal(L.panels.length, 13); assert.equal(perdidos(c).length, 0); assert.equal(c.adyFaltan.length, 0);
      const m = Math.max(...c.filas.map((f) => Math.abs(f.dA))); assert.ok(m > 33 && m < 34, 'máx ΔA ' + m);
    }
  });
  test('resultado no monótono: Illustrator real ×0.995 y ×0.999 ⇒ 12 paneles (entre 13 y 11)', () => { assert.equal(legacy(escala(ILL, 0.995)).panels.length, 12); assert.equal(legacy(escala(ILL, 0.999)).panels.length, 12); });
});

describe('HISTÓRICO · defectos registrados reproducidos sobre fixtures sintéticos (oráculo = valor analítico)', () => {
  const casos = [
    ['t-exacta', 'KI-04 a: la T exacta pierde el panel de 1600 mm²', [800, 800]],
    ['hueco-centrado', 'KI-05/KI-09: el panel con el centroide en el hueco se descarta y se cuela la cara exterior (6400)', [3200, 6400]],
    ['hueco-descentrado', 'KI-06: el hueco no se resta (3200 en vez de 3000)', [3200, 3200]],
    ['panel-pequeno-1.5mm2', 'KI-19: el panel de 1.5 mm² desaparece y la cara exterior ocupa su lugar', [45, 46.5]],
    ['panel-delgado-40x1', 'KI-19: la solapa 40×1 desaparece', [400, 440]],
    ['escalon-crease', 'D1: el escalón de 0.498 mm se fusiona y la franja se reparte (1590.04/1609.96 frente a 1580.08/1619.92)', [1590.0391, 1609.9609]],
    ['escalon-contorno', 'D1: el escalón del contorno se fusiona (1609.96 frente a 1619.92)', [1600, 1609.9609]],
    ['t-desalineada-0.375', 'KI-18/KI-04: la tolerancia cose la rama a 0.375 mm y además se pierde el panel izquierdo', [796.25, 796.25]],
  ];
  for (const [n, desc, esp] of casos) test(`${n}: ${desc}`, () => { const L = legacy(FIXTURES_F2[n].build()); assert.deepEqual(areas(L.panels), esp); assert.notDeepEqual(esp, FIXTURES_F2[n].esperado.paneles.slice().sort((a, b) => a - b)); });
  test('crease-paralela-ruido: el legacy funde la crease con el corte (1 panel de 3200) — caso INDETERMINADO: aquí la tolerancia probablemente acierta la intención', () => {
    assert.deepEqual(areas(legacy(FIXTURES_F2['crease-paralela-ruido'].build()).panels), [3200]);
  });
});

describe('HISTÓRICO · defectos nuevos registrados en F2A-0 (KI-31…KI-33)', () => {
  test('KI-31: invertir el sentido del contorno cambia el resultado del legacy (Illustrator real: 12 en vez de 11; original: −12.80 mm²); el oráculo no cambia', () => {
    const rev = (d) => ({ ...d, outerBoundary: invertirTrazado(d.outerBoundary) });
    assert.equal(legacy(rev(ILL)).panels.length, 12); assert.equal(legacy(ILL).panels.length, 11);
    const a = legacy(REAL).panels.reduce((s, p) => s + p.area, 0), b = legacy(rev(REAL)).panels.reduce((s, p) => s + p.area, 0); assert.ok(Math.abs(a - b - 12.797) < 0.01);
    assert.deepEqual(firmaTopologica(oraculo(rev(ILL), { eps: '0.05' })), firmaTopologica(oraculo(ILL, { eps: '0.05' })));
  });
  test('KI-32: con coordenadas trasladadas +1e7 mm el legacy da 7 paneles (precisión de coma flotante); el oráculo exacto no cambia', () => {
    const t = transformarDouble(ILL, (p) => ({ x: p.x + 1e7, y: p.y + 1e7 })); assert.equal(legacy(t).panels.length, 7);
  });
  test('KI-33: caja simple ×0.5 ⇒ el legacy suelda el hueco (a 5 mm laterales) al borde: 3 paneles y 11 350 mm² normalizados; el oráculo da 2 y 5 900 netos', () => {
    const d = escala(SIMPLE, 0.5), L = legacy(d); assert.equal(L.panels.length, 3); assert.ok(Math.abs(L.panels.reduce((s, p) => s + p.area, 0) / 0.25 - 11350) < 1e-3);
    const R = oraculo(d, {}); assert.equal(R.paneles.length, 2);
  });
});
