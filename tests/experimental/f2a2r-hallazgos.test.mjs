// F2A-2R — Regresiones de los hallazgos de la auditoría independiente de F2A-2:
//   H-01  una unión cuyas aristas no están sobre un único eje colineal NO puede producir un FoldEdge (antes: el tramo más largo era la bisagra)
//   H-02  una adyacencia de una componente no alcanzada NO es un ciclo (antes: toda adyacencia fuera del árbol de la base se daba como ciclo)
// Con referencias independientes (clasificación exacta sobre el oráculo, componentes y ν por union-find propio), estrés aleatorio y
// controles negativos: el módulo real se copia, se le reintroduce cada defecto y las comprobaciones deben detectarlo.
import { test, describe, after } from 'node:test'; import assert from 'node:assert/strict'; import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { pathToFileURL } from 'node:url';
import { ROOT } from '../lib/fixtures.mjs';
import * as M from '../../experimental/plegado/index.js';
import { oraculo } from '../lib/f2/oraculo.mjs';
import { FIXTURES_F2 } from '../lib/f2/fixtures-f2.mjs';
import { CASOS_F2A2R } from '../lib/f2/casos-plegado.mjs';
import { sintetico, generador } from '../lib/f2/aleatorios.mjs';
import { firmasModelo, firmasOraculo, clasificarUnionesOraculo, componentesYCiclomatico, plegar, distBorde } from '../lib/f2/plegado.mjs';

const P = (pts, closed) => ({ closed, points: pts.map(([x, y]) => ({ anchor: { x, y }, left: { x, y }, right: { x, y } })) });
const W = (o, w = 80, h = 40) => ({ version: '1.0', units: 'mm', holes: [], cutLines: [], outerBoundary: P([[0, 0], [w, 0], [w, h], [0, h]], true), ...o });
const todo = (Mod, d, base) => { const m = Mod.adaptarPanelModel(d); const A = Mod.construirAdyacencias(m); const b = base == null ? Mod.baseDefecto(m) : base; return { m, A, T: Mod.construirArbolPlegado(m, A, b), b }; };
const tipos = (R) => new Set([...R.A.diagnosticos, ...R.T.diagnosticos].map((x) => x.tipo));
const CASOS_R = CASOS_F2A2R;

describe('F2A-2R · H-01: una unión sin eje único colineal no produce ningún FoldEdge', () => {
  test('escalón de crease (A-1): unión no plegable con sus 3 rectas, segmentos y aristas conservados; 0 adyacencias v1, 0 pliegues; la desconexión que causa se diagnostica', () => {
    const R = todo(M, CASOS_R.escalon()); const u = R.A.uniones[0];
    assert.equal(R.A.uniones.length, 1); assert.equal(u.clase, 'no-plegable'); assert.equal(u.adyacencia, -1); assert.equal(R.A.adyacencias.length, 0); assert.equal(R.T.aristas.length, 0);
    assert.deepEqual(u.creases, ['C0', 'C1', 'C2']); assert.deepEqual(u.segmentos, ['C0:0', 'C1:0', 'C2:0']); assert.equal(u.grupos.length, 3);
    assert.ok(Math.abs(u.longitudTotal - (40 + 40 + FIXTURES_F2['escalon-crease'].build().creases[2].points[1].anchor.y - 20)) < 1e-9, 'longitud total = todas las aristas (nada descartado)');
    assert.equal(u.grupos.reduce((s, g) => s + g.aristas.length, 0), u.grupos.flatMap((g) => g.aristas).length); for (const g of u.grupos) for (const a of g.aristas) assert.ok(a.segmentos.length && a.u && a.v, 'cada arista lleva coordenadas y segmento de origen');
    const dg = R.A.diagnosticos.find((x) => x.tipo === 'union-no-plegable'); assert.deepEqual([dg.union, dg.rectas, dg.segmentos], [0, 3, ['C0:0', 'C1:0', 'C2:0']]); assert.match(dg.motivo, /no paralelas/);
    const dc = R.T.diagnosticos.find((x) => x.tipo === 'componente-desconectado'); assert.equal(R.T.componentes.length, 2); assert.deepEqual(dc.unionesNoPlegablesEntreComponentes, [{ union: 0, clase: 'no-plegable', componentes: [0, 1] }]);
    assert.ok(!tipos(R).has('ciclo'));
  });
  test('rectas paralelas desplazadas unidas por un corte: unión AMBIGUA (requiere una decisión geométrica explícita); 0 pliegues', () => {
    const R = todo(M, CASOS_R.ambigua()); const u = R.A.uniones[0]; assert.equal(u.clase, 'ambigua'); assert.equal(u.grupos.length, 2); assert.equal(R.T.aristas.length, 0);
    assert.ok(tipos(R).has('union-ambigua')); assert.match(R.A.diagnosticos.find((x) => x.tipo === 'union-ambigua').motivo, /decisión geométrica explícita/);
  });
  test('crease en L: unión no plegable; si otra ruta conecta los paneles, no hay desconexión ni ciclo falso', () => {
    const L1 = todo(M, CASOS_R.ele()); assert.equal(L1.A.uniones[0].clase, 'no-plegable'); assert.equal(L1.T.aristas.length, 0); assert.equal(L1.T.componentes.length, 2);
    const L2 = todo(M, CASOS_R.eleConectada()); assert.equal(L2.m.panels.length, 3); assert.deepEqual(L2.A.uniones.map((x) => x.clase).sort(), ['no-plegable', 'plegable', 'plegable']);
    assert.equal(L2.T.aristas.length, 2); assert.equal(L2.T.componentes.length, 1); assert.ok(!tipos(L2).has('componente-desconectado') && !tipos(L2).has('ciclo')); assert.ok(tipos(L2).has('union-no-plegable'));
    for (const e of L2.T.aristas) { const u = L2.A.uniones.find((x) => [x.panelA, x.panelB].sort().join() === [e.parent, e.child].sort().join()); assert.equal(u.clase, 'plegable', 'ningún FoldEdge sale de una unión no plegable'); }
  });
  test('por qué no basta el tramo más largo: con esa bisagra, al plegar, la otra recta de la unión se despega (las aristas compartidas dejan de coincidir)', () => {
    const R = todo(M, CASOS_R.ele()); const u = R.A.uniones[0]; const G = u.grupos.reduce((m, g) => (g.longitud > m.longitud ? g : m)); const otra = u.grupos.find((g) => g !== G);
    const ps = G.aristas.flatMap((a) => [a.u, a.v]); const lo = ps.reduce((m, p) => (p.x + p.y < m.x + m.y ? p : m)), hi = ps.reduce((m, p) => (p.x + p.y > m.x + m.y ? p : m));
    const forzada = [{ parent: u.panelA, child: u.panelB, crease: { a: lo, b: hi }, sign: 1 }]; const T = plegar(R.m.panels.length, forzada, u.panelA, [90]);
    const p = otra.aristas[0].v; const wp = T[u.panelA](p), wc = T[u.panelB](p); assert.ok(Math.hypot(wp.x - wc.x, wp.y - wc.y, wp.z - wc.z) > 1, 'la arista fuera del eje se separa: plegado geométricamente inválido');
  });
  test('uniones válidas sin cambios: Caja Botánica (3 extracciones), rejillas y T: todas plegables, mismas 12 bisagras', () => {
    for (const f of ['tests/fixtures/real/caja-botanica-real.dieline.json', 'tests/fixtures/illustrator-real/ill-real-caja-botanica.dieline.json', 'tests/fixtures/real/caja-botanica-illustrator-export.dieline.json']) {
      const d = JSON.parse(fs.readFileSync(path.join(ROOT, f), 'utf8')); const m = M.adaptarPanelModel(d, { eps: 0.05 }); const A = M.construirAdyacencias(m); assert.equal(A.uniones.length, 12); assert.ok(A.uniones.every((x) => x.clase === 'plegable')); assert.equal(A.adyacencias.length, 12);
      assert.ok(A.uniones.every((x, k) => x.adyacencia === k && A.detalle[k].union === k)); }
  });
});

describe('F2A-2R · H-02: ninguna componente desconectada se confunde con un ciclo', () => {
  test('prueba mínima: dos componentes de dos paneles con una adyacencia interna cada una ⇒ 2 componentes, ningún ciclo, árbol solo en la de la base', () => {
    const R = todo(M, CASOS_R.dosComponentes()); assert.equal(R.m.panels.length, 4); assert.equal(R.A.adyacencias.length, 2);
    assert.equal(R.T.componentes.length, 2); assert.equal(R.T.numeroCiclomatico, 0); assert.deepEqual(R.T.adyacenciasCiclo, []); assert.ok(!tipos(R).has('ciclo'));
    const base = new Set(R.T.componentes[0]); assert.ok(base.has(R.b)); assert.equal(R.T.aristas.length, 1); for (const e of R.T.aristas) assert.ok(base.has(e.parent) && base.has(e.child), 'el árbol solo usa paneles de la componente de la base');
    assert.deepEqual(R.T.noAlcanzados, R.T.componentes[1].slice().sort((a, b) => a - b)); assert.equal(R.T.adyacenciasNoAlcanzadas.length, 1); assert.ok(!base.has(R.A.adyacencias[R.T.adyacenciasNoAlcanzadas[0]].panelA));
    const dc = R.T.diagnosticos.find((x) => x.tipo === 'componente-desconectado'); assert.deepEqual(dc.adyacenciasNoAlcanzadas, R.T.adyacenciasNoAlcanzadas); assert.deepEqual(dc.unionesNoPlegablesEntreComponentes, []);
  });
  test('ciclo REAL en una componente desconectada: ν = 1, una sola adyacencia de ciclo, en esa componente; las otras 3 son del bosque, no ciclos', () => {
    const R = todo(M, CASOS_R.cicloFuera()); assert.equal(R.m.panels.length, 5); assert.equal(R.T.componentes.length, 2); assert.equal(R.T.aristas.length, 0, 'la base (1 600 mm²) no tiene bisagras');
    assert.equal(R.T.numeroCiclomatico, 1); assert.equal(R.T.adyacenciasCiclo.length, 1); assert.equal(R.T.adyacenciasNoAlcanzadas.length, 3);
    const c = R.T.diagnosticos.find((x) => x.tipo === 'ciclo'); assert.deepEqual(c.porComponente, [{ componente: 1, adyacencias: R.T.adyacenciasCiclo }]);
  });
  test('ciclo en la componente de la base y bosque en otra: solo la arista que cierra el ciclo 2×2 es ciclo', () => {
    const R = todo(M, CASOS_R.cicloEnBaseYBosque()); assert.equal(R.T.componentes.length, 2); assert.equal(R.T.numeroCiclomatico, 1); assert.equal(R.T.adyacenciasCiclo.length, 1);
    assert.deepEqual(R.T.diagnosticos.find((x) => x.tipo === 'ciclo').porComponente.map((x) => x.componente), [0]); assert.equal(R.T.adyacenciasNoAlcanzadas.length, 1);
  });
  test('rejilla 4×4 de líneas completas, una sola componente: ν = m − 16 + 1 ciclos reales y 0 no alcanzadas', () => {
    const cs = []; for (let i = 1; i < 4; i++) { cs.push(P([[i * 40, 0], [i * 40, 160]], false)); cs.push(P([[0, i * 40], [160, i * 40]], false)); }
    const R = todo(M, W({ creases: cs }, 160, 160)); assert.equal(R.m.panels.length, 16); assert.equal(R.T.componentes.length, 1); assert.equal(R.T.numeroCiclomatico, R.A.adyacencias.length - 16 + 1); assert.equal(R.T.adyacenciasCiclo.length, R.T.numeroCiclomatico); assert.equal(R.T.adyacenciasNoAlcanzadas.length, 0);
  });
});

describe('F2A-2R · estrés aleatorio (semilla fija): clases = clasificación independiente exacta; componentes, ν y partición = referencia propia', () => {
  test('600 troqueles sintéticos degenerados, la mitad partidos por cortes', () => {
    const r = generador(20261028); let n = { varias: 0, ciclos: 0, noPlegables: 0, ambiguas: 0, componentesSinCiclo: 0 };
    for (let k = 0; k < 600; k++) {
      const d = sintetico(r); if (r() < 0.5) { const vert = r() < 0.5, c = 1 + Math.floor(r() * (vert ? 7 : 5)); d.cutLines = [{ geom: P(vert ? [[c, 0], [c, 6]] : [[0, c], [8, c]], false) }]; }
      const m = M.adaptarPanelModel(d); if (!m.panels.length) continue; const A = M.construirAdyacencias(m); const T = M.construirArbolPlegado(m, A, M.baseDefecto(m)); const O = oraculo(d);
      const fm = firmasModelo(m), fo = firmasOraculo(O); const par = (a, b) => [a, b].sort().join(' ⟷ '); const CI = new Map(clasificarUnionesOraculo(O, d).map((x) => [par(fo[x.a], fo[x.b]), x]));
      for (const u of A.uniones) { const c = CI.get(par(fm[u.panelA], fm[u.panelB])); assert.ok(c, 'unión del oráculo'); if (c.clase !== 'sin-aristas-en-poligono') assert.equal(u.clase, c.clase, `caso ${k}: clase`); }
      for (const j of T.adyacenciaDeArista) assert.equal(A.uniones[A.detalle[j].union].clase, 'plegable', `caso ${k}: FoldEdge de unión no plegable`);
      const ref = componentesYCiclomatico(m.panels.length, A.adyacencias.map((x) => [x.panelA, x.panelB]));
      assert.equal(T.componentes.length, ref.componentes); assert.equal(T.numeroCiclomatico, ref.ciclomatico); assert.equal(T.adyacenciasCiclo.length, ref.ciclomatico); assert.equal(T.diagnosticos.some((x) => x.tipo === 'ciclo'), ref.ciclomatico > 0, `caso ${k}: ciclo solo si ν > 0`);
      assert.deepEqual([...T.adyacenciaDeArista, ...T.adyacenciasCiclo, ...T.adyacenciasNoAlcanzadas].sort((a, b) => a - b), A.adyacencias.map((_, j) => j));
      if (ref.componentes > 1) n.varias++; if (ref.ciclomatico > 0) n.ciclos++; if (ref.componentes > 1 && ref.ciclomatico === 0 && A.adyacencias.length) n.componentesSinCiclo++;
      n.noPlegables += A.uniones.filter((x) => x.clase === 'no-plegable').length; n.ambiguas += A.uniones.filter((x) => x.clase === 'ambigua').length;
    }
    assert.ok(n.varias > 40 && n.ciclos > 10 && n.componentesSinCiclo > 3 && n.noPlegables > 20, 'el estrés cubre los casos que importan: ' + JSON.stringify(n)); console.log('# cobertura del estrés F2A-2R: ' + JSON.stringify(n));
  });
});

// Controles negativos: copia de experimental/ en un temporal, se reintroduce el defecto y las comprobaciones deben detectarlo
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'tess-f2a2r-')); after(() => fs.rmSync(tmp, { recursive: true, force: true }));
async function mutante(nombre, cambios) {
  const dir = path.join(tmp, nombre); fs.cpSync(path.join(ROOT, 'experimental'), path.join(dir, 'experimental'), { recursive: true });
  const f = path.join(dir, 'experimental/plegado/arbol.js'); let t = fs.readFileSync(f, 'utf8'); for (const [a, b] of cambios) { assert.equal(t.split(a).length, 2, 'ancla única: ' + a.slice(0, 60)); t = t.replace(a, b); } fs.writeFileSync(f, t);
  return import(pathToFileURL(path.join(dir, 'experimental/plegado/index.js')).href);
}
const defectoH01 = (Mod) => { const R = todo(Mod, CASOS_R.escalon()); return R.T.aristas.length > 0; };
const defectoH02 = (Mod) => { try { const R = todo(Mod, CASOS_R.dosComponentes()); return R.T.diagnosticos.some((x) => x.tipo === 'ciclo'); } catch (e) { return true; } };
describe('F2A-2R · controles negativos (reintroducción de los defectos)', () => {
  test('el módulo real no tiene ninguno de los dos defectos', () => { assert.equal(defectoH01(M), false); assert.equal(defectoH02(M), false); });
  test('H-01 reintroducido (toda unión se trata como plegable) ⇒ detectado', async () => {
    const Mut = await mutante('h01', [["const clase = grupos.length === 1 ? 'plegable' : grupos.every(paralelo) ? 'ambigua' : 'no-plegable';", "const clase = 'plegable';"]]); assert.equal(defectoH01(Mut), true);
  });
  test('H-02 reintroducido (ciclo = toda adyacencia fuera del árbol de la base) ⇒ detectado, con o sin la comprobación interna de ν', async () => {
    const a = "const ciclo = todas.filter((k) => !enArbol.has(k) && !bosque.has(k));"; const g = "  if (numeroCiclomatico !== ciclo.length) throw";
    assert.equal(defectoH02(await mutante('h02a', [[a, 'const ciclo = fuera;']])), true);
    assert.equal(defectoH02(await mutante('h02b', [[a, 'const ciclo = fuera;'], [g, '  if (false) throw']])), true);
  });
});
