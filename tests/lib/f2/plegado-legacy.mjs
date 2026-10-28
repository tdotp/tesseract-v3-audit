// F2A-2 — Comparación del adaptador y del árbol experimentales con el LEGACY (src/core/legacy vía createLegacyEngine, solo lectura) y
// clasificación de cada diferencia por separado (docs/fase2/F2A2_INFORME.md §5):
//   topología        panel perdido / dividido / fusionado / espurio, pareja adyacente de más o de menos, árbol con otros niveles
//   geometría        mismo emparejamiento 1:1 pero área bruta o centroide distintos más allá de la representación; lado del pliegue distinto
//   representación   misma topología y geometría con otra forma: una adyacencia por segmento frente a una por pareja, orden de las
//                    aristas del árbol, eje en sentido contrario (signo opuesto con el mismo lado), otra elección de padre en un empate BFS
//   corrige          (marca de cada diferencia) el adaptador coincide con el ORÁCULO y el legacy no: diferencia ESPERADA que corrige un error histórico
//   errores del adaptador  el adaptador NO coincide con el oráculo (lista aparte; debe estar vacía)
// El legacy no es la verdad geométrica: nunca se fuerza la equivalencia con un resultado legacy defectuoso.
import { clone } from '../fixtures.mjs';
import { adaptarPanelModel, construirAdyacencias, construirArbolPlegado, baseDefecto } from '../../../experimental/plegado/index.js';
import { oraculo } from './oraculo.mjs';
import { firmasModelo, firmasOraculo, dentro, convexo, nivelesBFS, clasificarUnionesOraculo } from './plegado.mjs';

const area = (ps) => { let s = 0; for (let i = 0; i < ps.length; i++) { const a = ps[i], b = ps[(i + 1) % ps.length]; s += (a.x - ps[0].x) * (b.y - ps[0].y) - (b.x - ps[0].x) * (a.y - ps[0].y); } return Math.abs(s / 2); };
const nivelesDe = (n, tree, base) => { const L = Array(n).fill(-1); if (base >= 0) L[base] = 0; for (const e of tree) L[e.child] = L[e.parent] + 1; return L; };

export function compararConLegacy(d, eps, L, { computeFoldSign, ki = [] } = {}) {
  const lp = L.buildPanels(clone(d)); const la = L.buildAdjacency(lp.panels, lp.creaseEdges); const lb = lp.panels.length ? L.defaultBaseIndex(lp) : -1; const lt = lp.panels.length ? L.buildFoldTree(lp.panels, la, lb) : [];
  const m = adaptarPanelModel(d, { eps }); const A = construirAdyacencias(m); const n = m.panels.length;
  const O = oraculo(d, { eps: eps == null ? null : String(eps) }); const fm = firmasModelo(m), fo = firmasOraculo(O);
  const errores = []; if (JSON.stringify(fm.slice().sort()) !== JSON.stringify(fo.slice().sort())) errores.push('paneles distintos del oráculo');
  const parO = new Set(O.adyacencias.map((x) => [fo[x.a], fo[x.b]].sort().join('⟷'))); const parM = new Set(A.uniones.map((x) => [fm[x.panelA], fm[x.panelB]].sort().join('⟷'))); // F2A-2R: uniones (todas las parejas), no solo las plegables
  if ([...parO].sort().join() !== [...parM].sort().join()) errores.push('adyacencias distintas del oráculo');
  const corrige = errores.length === 0; const difs = []; const dif = (clase, que, extra = {}) => difs.push({ clase, que, corrige: clase === 'representación' ? false : corrige, ...extra });
  // correspondencia legacy → adaptador: el polígono exterior más pequeño que contiene el centroide del legacy
  // (una cara del legacy que contiene los centroides de VARIOS paneles es una fusión o la cara exterior colada, KI-09: no se empareja)
  const cubre = lp.panels.map((P) => m.panels.map((_, i) => i).filter((i) => dentro(m.panels[i].centroid, P.vertices)));
  const map = lp.panels.map((P, j) => { if (cubre[j].length > 1) return -3; const ks = m.panels.map((_, i) => i).filter((i) => dentro(P.centroid, m.panels[i].vertices)).sort((i, k) => m.panels[i].area - m.panels[k].area); return ks.length ? ks[0] : -1; });
  cubre.forEach((c, j) => { if (c.length > 1) dif('topología', `cara P${j} del legacy (${lp.panels[j].area.toFixed(3)} mm²) cubre ${c.length} paneles: fusión o cara exterior colada${j === lb ? ' — y es la BASE por defecto del legacy' : ''}`); });
  const filas = m.panels.map((p, i) => {
    const ls = map.map((x, j) => (x === i ? j : -1)).filter((j) => j >= 0); const f = { panel: i, firma: fm[i], area: p.area, areaNeta: m.f2a2.paneles[i].areaNeta, legacy: ls.map((j) => 'P' + j).join(',') };
    if (!ls.length) { f.clase = 'topología'; dif('topología', `panel ${fm[i]} (${p.area.toFixed(3)} mm²) perdido en el legacy`, { panel: i }); return f; }
    if (ls.length > 1) { f.clase = 'topología'; dif('topología', `panel ${fm[i]} dividido en ${ls.length} por el legacy`, { panel: i }); return f; }
    const P = lp.panels[ls[0]];
    f.dA = P.area - p.area; f.dC = Math.hypot(P.centroid.x - p.centroid.x, P.centroid.y - p.centroid.y);
    f.clase = Math.abs(f.dA) <= 1e-9 * Math.max(1, p.area) && f.dC <= 1e-9 * Math.max(1, Math.sqrt(p.area)) ? 'idéntico' : 'geometría';
    if (f.clase === 'geometría') dif('geometría', `panel ${fm[i]}: ΔA bruta ${f.dA.toExponential(2)} mm², Δcentroide ${f.dC.toExponential(2)} mm`, { panel: i });
    return f;
  });
  map.forEach((x, j) => { if (x === -1) dif('topología', `panel espurio del legacy P${j} (${lp.panels[j].area.toFixed(3)} mm²)`); });
  const parL = new Set(la.map((x) => (map[x.panelA] >= 0 && map[x.panelB] >= 0 ? [fm[map[x.panelA]], fm[map[x.panelB]]].sort().join('⟷') : `P${x.panelA}⟷P${x.panelB} (con una cara del legacy sin panel)`)));
  for (const k of parM) if (!parL.has(k)) dif('topología', `adyacencia ${k} ausente en el legacy`); for (const k of parL) if (!parM.has(k)) dif('topología', `adyacencia ${k} del legacy no existe en el adaptador`);
  if (la.length !== A.adyacencias.length && la.length) dif('representación', `${la.length} AdjacencyEdge del legacy (una por segmento de crease) frente a ${A.adyacencias.length} (una por pareja plegable)`);
  for (const u of A.uniones) if (u.clase !== 'plegable') dif('geometría', `unión ${[fm[u.panelA], fm[u.panelB]].sort().join('⟷')} ${u.clase} (${u.grupos.length} rectas): el legacy la usa como bisagra, el adaptador no`);
  // árbol: desde la misma base (la del legacy, traducida)
  const res = { filas, base: { legacy: lb, adaptador: baseDefecto(m), legacyTraducida: lb >= 0 ? map[lb] : -1 } };
  if (res.base.legacyTraducida >= 0 && fm[res.base.adaptador] !== fm[res.base.legacyTraducida]) dif(difs.some((x) => x.clase === 'topología') ? 'topología' : 'representación', `base por defecto distinta: legacy ${fm[res.base.legacyTraducida]} frente a ${fm[res.base.adaptador]} (empate de área o panel perdido)`);
  if (n) {
    // desde la base del legacy traducida; si esa base es una cara colada o perdida, desde la base por defecto del adaptador (sin comparar niveles)
    const comparable = res.base.legacyTraducida >= 0; const b = comparable ? res.base.legacyTraducida : res.base.adaptador; const T = construirArbolPlegado(m, A, b); res.arbol = T;
    if (comparable) {
    const nl = nivelesDe(lp.panels.length, lt, lb); const nlT = Array(n).fill(-1); map.forEach((x, j) => { if (x >= 0) nlT[x] = nl[j]; });
    const mismosNiveles = T.niveles.every((x, i) => nlT[i] === x || (nlT[i] === -1 && !map.includes(i)));
    if (!mismosNiveles) dif('topología', 'niveles del árbol distintos (paneles alcanzados o distancia a la base)');
    const eL = new Set(lt.map((e) => map[e.parent] + '>' + map[e.child])), eM = new Set(T.aristas.map((e) => e.parent + '>' + e.child));
    const distintas = [...eM].filter((k) => !eL.has(k)).length; if (distintas && mismosNiveles) dif('representación', `${distintas} aristas con otro padre en un empate BFS (mismos niveles)`);
    if (lt.length === T.aristas.length && lt.some((e, k) => map[e.parent] + '>' + map[e.child] !== T.aristas[k].parent + '>' + T.aristas[k].child) && distintas === 0) dif('representación', 'mismas aristas en otro orden (índice de FoldEdge = identidad en la interfaz)');
    // signo: lado orientado (sign × sentido del eje respecto del eje del adaptador)
    for (const e of lt) { const k = T.aristas.findIndex((x) => x.parent === map[e.parent] && x.child === map[e.child]); if (k < 0) continue; const t = T.aristas[k];
      const sentido = Math.sign((e.crease.b.x - e.crease.a.x) * (t.crease.b.x - t.crease.a.x) + (e.crease.b.y - e.crease.a.y) * (t.crease.b.y - t.crease.a.y));
      if (e.sign * sentido !== t.sign) dif('geometría', `lado del pliegue ${fm[t.parent]}→${fm[t.child]} distinto (hijo ${convexo(m.panels[t.child].vertices) ? 'convexo' : 'NO convexo: el legacy usa el centroide'})`);
      else if (e.sign !== t.sign) res.ejesInvertidos = (res.ejesInvertidos || 0) + 1; }
    if (res.ejesInvertidos) dif('representación', `${res.ejesInvertidos} ejes en sentido contrario (signo opuesto, mismo lado)`);
    } else dif('topología', `el árbol del legacy parte de una cara que no es un panel (${lt.length} pliegues): no comparable`);
    // compatibilidad conceptual: buildFoldTree y computeFoldSign del LEGACY sobre el modelo v1 del adaptador
    const lt2 = L.buildFoldTree(m.panels, A.adyacencias, b); res.legacySobreModelo = { aristas: lt2.length, mismosNiveles: JSON.stringify(nivelesDe(n, lt2, b)) === JSON.stringify(T.niveles), mismasAristas: lt2.map((e) => e.parent + '>' + e.child).sort().join() === T.aristas.map((e) => e.parent + '>' + e.child).sort().join() };
    if (computeFoldSign) { const s = T.aristas.map((e) => ({ convexo: convexo(m.panels[e.child].vertices), igual: computeFoldSign(m.panels[e.parent], m.panels[e.child], e.crease) === e.sign })); res.signoCentroide = { convexosIguales: s.filter((x) => x.convexo && x.igual).length, convexosDistintos: s.filter((x) => x.convexo && !x.igual).length, noConvexosDistintos: s.filter((x) => !x.convexo && !x.igual).length, noConvexos: s.filter((x) => !x.convexo).length }; }
    res.adyacenciaLegacySobreModelo = L.buildAdjacency(m.panels, m.creaseEdges).length;
    // niveles del adaptador frente a un BFS independiente sobre el oráculo
    const oi = fm.map((x) => fo.indexOf(x)); const paresP = clasificarUnionesOraculo(O, d).filter((x) => x.clase === 'plegable').map((x) => [oi.indexOf(x.a), oi.indexOf(x.b)]); // F2A-2R: grafo de bisagras plegables (clasificación independiente)
    if (!errores.length && JSON.stringify(nivelesBFS(n, paresP, b)) !== JSON.stringify(T.niveles)) errores.push('niveles distintos del BFS sobre el oráculo');
  }
  return { legacy: { paneles: lp.panels.length, adyacencias: la.length, aristas: lt.length }, adaptador: { paneles: n, adyacencias: A.adyacencias.length }, oraculo: { paneles: O.paneles.length }, ki, diferencias: difs, erroresAdaptador: errores, ...res };
}
export const resumenClases = (R) => { const c = { topología: 0, geometría: 0, representación: 0, esperadas: 0 }; for (const x of R.diferencias) { c[x.clase]++; if (x.corrige) c.esperadas++; } c.erroresAdaptador = R.erroresAdaptador.length; return c; };
