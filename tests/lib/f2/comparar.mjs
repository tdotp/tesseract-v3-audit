// F2A-0 — Comparación y CLASIFICACIÓN de diferencias (docs/fase2/F2A0_03_CLASIFICACION.md):
//   topología       panel perdido / fusionado / espurio, adyacencia o asignación de crease distinta
//   geometría       mismo emparejamiento 1:1 pero el borde de un panel se movió más que la cota de representación (p. ej. fusión de vértices)
//   representación  misma topología; |ΔA| dentro de la cota del redondeo de la entrada (cota = ν·perímetro; ν = ruido declarado)
//   discretización  misma topología; ΔA atribuible al tratamiento de curvas (anclas frente a muestras)
// Transformaciones EXACTAS (sobre racionales) para las metamórficas y equivalentes en double (lo que vería el producto).
import * as Q from './racional.mjs';

// ---------- transformaciones exactas (para `opciones.transformar` del oráculo) ----------
export const T = {
  escala: (s) => { const k = Q.deTexto(s); return (p) => ({ x: Q.mul(p.x, k), y: Q.mul(p.y, k) }); },
  traslacion: (dx, dy) => { const a = Q.deTexto(dx), b = Q.deTexto(dy); return (p) => ({ x: Q.suma(p.x, a), y: Q.suma(p.y, b) }); },
  rot90: () => (p) => ({ x: Q.neg(p.y), y: p.x }),
  rot180: () => (p) => ({ x: Q.neg(p.x), y: Q.neg(p.y) }),
  rotPitagorica: () => { const c = Q.deTexto('3/5'), s = Q.deTexto('4/5'); return (p) => ({ x: Q.resta(Q.mul(c, p.x), Q.mul(s, p.y)), y: Q.suma(Q.mul(s, p.x), Q.mul(c, p.y)) }); }, // 53.13°, exacta
  reflexionX: () => (p) => ({ x: Q.neg(p.x), y: p.y }),
};
// ---------- equivalentes en double (redondeo de coma flotante, como un documento transformado en Illustrator) ----------
export function transformarDouble(d, f) {
  const c = JSON.parse(JSON.stringify(d));
  const tp = (p) => { for (const k of ['anchor', 'left', 'right']) if (p[k]) { const q = f(p[k]); p[k].x = q.x; p[k].y = q.y; } };
  const tPath = (pa) => { if (pa && pa.points) pa.points.forEach(tp); };
  tPath(c.outerBoundary); (c.holes || []).forEach(tPath); (c.cutLines || []).forEach((cl) => tPath(cl.geom || cl)); (c.creases || []).forEach(tPath);
  return c;
}
export const invertirTrazado = (pa) => ({ ...pa, points: pa.points.slice().reverse().map((p) => ({ anchor: p.anchor, left: p.right, right: p.left })) });
export const PERMUTACIONES = {
  'creases en orden inverso': (d) => ({ d: { ...d, creases: d.creases.slice().reverse() }, mapa: (id) => 'C' + (d.creases.length - 1 - Number(id.slice(1))) }),
  'cada crease invertida': (d) => ({ d: { ...d, creases: d.creases.map(invertirTrazado) }, mapa: (id) => id }),
  'contorno en sentido contrario': (d) => ({ d: { ...d, outerBoundary: invertirTrazado(d.outerBoundary) }, mapa: (id) => id }),
  'contorno con inicio desplazado': (d) => ({ d: { ...d, outerBoundary: { ...d.outerBoundary, points: d.outerBoundary.points.slice(3).concat(d.outerBoundary.points.slice(0, 3)) } }, mapa: (id) => id }),
};

// Firma topológica de un resultado del oráculo (independiente de coordenadas): paneles por conjunto de creases, adyacencias, creases.
const cs = (l, mapa = (id) => id) => l.map(mapa).sort((a, b) => Number(a.slice(1)) - Number(b.slice(1))).join(' ');
export function firmaTopologica(R, mapa = (id) => id) {
  const paneles = R.paneles.map((p) => cs(p.creases, mapa)).sort();
  const porId = new Map(R.paneles.map((p, i) => [i, cs(p.creases, mapa)]));
  const ady = R.adyacencias.map((x) => [porId.get(x.a), porId.get(x.b)].sort().join(' ⟷ ') + ' por ' + cs(x.creases, mapa)).sort();
  return { paneles, ady, componentes: R.componentesPaneles };
}
// Áreas por firma (exactas, racionales) para comparar resultados equivalentes.
// Clave = conjunto de creases + rango por área entre los paneles con el mismo conjunto (dos paneles a ambos lados de una única crease comparten conjunto).
export function areasPorFirma(R, mapa = (id) => id) { const m = new Map(); const g = new Map(); R.paneles.forEach((p) => { const k = cs(p.creases, mapa); if (!g.has(k)) g.set(k, []); g.get(k).push(p); }); for (const [k, ps] of g) ps.slice().sort((a, b) => Q.cmp(a.area, b.area)).forEach((p, i) => m.set(k + '#' + i, p)); return m; }

// Compara dos resultados del oráculo de entradas equivalentes (p. ej. dos extracciones del mismo troquel) y clasifica la diferencia.
export function compararOraculos(A, B, { ruidoMm = 0, mapa = (id) => id } = {}) {
  const fa = firmaTopologica(A), fb = firmaTopologica(B, mapa);
  const topologiaIgual = JSON.stringify(fa) === JSON.stringify(fb);
  const aa = areasPorFirma(A), ab = areasPorFirma(B, mapa); const filas = [];
  for (const [k, pA] of aa) {
    const pB = ab.get(k); if (!pB) { filas.push({ firma: k, clase: 'topología' }); continue; } const x = pA.area, y = pB.area; let per = 0; for (let i = 0; i < pA.poligono.length; i++) per += Math.sqrt(Q.aNumero(Q.dist2(pA.poligono[i], pA.poligono[(i + 1) % pA.poligono.length])));
    const dA = Q.aNumero(Q.resta(y, x)); const cota = ruidoMm * per;
    filas.push({ firma: k, dA, cota, clase: Q.igual(x, y) ? 'idéntico' : Math.abs(dA) <= cota ? 'representación' : 'geometría' });
  }
  return { topologiaIgual, filas, clase: !topologiaIgual ? 'topología' : filas.some((f) => f.clase === 'geometría') ? 'geometría' : filas.some((f) => f.clase === 'representación') ? 'representación' : 'idéntico' };
}

// Compara la salida del LEGACY (paneles con vertices/area/centroid, adyacencias con creaseIdx) con el oráculo sobre la MISMA entrada.
export function compararLegacy(R, legacyPanels, legacyAdj, { ruidoMm = 0 } = {}) {
  const poli = R.paneles.map((p) => p.poligono);
  const enOraculo = (c) => { const p = Q.pDouble(c); for (let i = 0; i < poli.length; i++) { try { if (Q.dentroPoligono(p, poli[i])) return i; } catch (e) { return -2; } } return -1; };
  const map = legacyPanels.map((L) => enOraculo(L.centroid));
  const filas = R.paneles.map((p, i) => {
    const ls = map.map((m, j) => (m === i ? j : -1)).filter((j) => j >= 0);
    const oc = centroideR(p.poligono);
    const fusion = ls.length === 1 ? R.paneles.some((q, k) => { if (k === i) return false; const c = centroideR(q.poligono); try { return Q.dentroPoligono(c, legacyPanels[ls[0]].vertices.map(Q.pDouble)); } catch (e) { return false; } }) : false;
    const dA = ls.length === 1 ? legacyPanels[ls[0]].area - Q.aNumero(p.area) : null;
    let per = 0; for (let k = 0; k < p.poligono.length; k++) per += Math.sqrt(Q.aNumero(Q.dist2(p.poligono[k], p.poligono[(k + 1) % p.poligono.length])));
    const clase = ls.length === 0 ? 'topología: perdido' : ls.length > 1 ? 'topología: dividido' : fusion ? 'topología: fusionado con otro' : Math.abs(dA) <= 1e-9 * Q.aNumero(p.area) + 1e-9 ? 'idéntico' : Math.abs(dA) <= ruidoMm * per ? 'representación' : 'geometría: borde desplazado';
    return { oraculo: 'F' + i, creases: p.creases.join(' '), areaOraculo: Q.aNumero(p.area), legacy: ls.map((j) => 'P' + j).join(','), dA, clase, centroideOraculo: oc && Q.aDouble(oc) };
  });
  const espurios = map.map((m, j) => (m < 0 ? 'P' + j : null)).filter(Boolean);
  // adyacencias: pares del legacy traducidos a paneles del oráculo
  const ladj = new Set((legacyAdj || []).map((a) => [map[a.panelA], map[a.panelB]].sort((x, y) => x - y).join('-')));
  const oadj = new Set(R.adyacencias.map((a) => a.a + '-' + a.b));
  return { filas, espurios, adyFaltan: [...oadj].filter((k) => !ladj.has(k)), adySobran: [...ladj].filter((k) => !oadj.has(k)) };
}
function centroideR(poli) { const A = Q.areaPoligono(poli); if (Q.esCero(A)) return null; let cx = Q.ZERO, cy = Q.ZERO; for (let i = 0; i < poli.length; i++) { const p = poli[i], q = poli[(i + 1) % poli.length], k = Q.cruz(p, q); cx = Q.suma(cx, Q.mul(Q.suma(p.x, q.x), k)); cy = Q.suma(cy, Q.mul(Q.suma(p.y, q.y), k)); } const s = Q.mul(Q.entero(6), A); return { x: Q.div(cx, s), y: Q.div(cy, s) }; }

// Correspondencia de creases entre dos extracciones del mismo troquel (orden de lectura distinto, otra escala, otro origen o Y invertida):
// se normaliza cada troquel a su caja envolvente (ancho = 1) y se casa cada crease con la de punto medio más cercano. Solo sirve para
// NOMBRAR (reetiquetar ids antes de comparar); no interviene en el oráculo. Devuelve mapa idB → idA o lanza si no es biyectivo.
export function mapaCreasesPorGeometria(dA, dB) {
  const norm = (d, flip) => { const ps = d.outerBoundary.points.map((p) => p.anchor); const x0 = Math.min(...ps.map((p) => p.x)), x1 = Math.max(...ps.map((p) => p.x)), y0 = Math.min(...ps.map((p) => p.y)), y1 = Math.max(...ps.map((p) => p.y)), w = x1 - x0;
    return d.creases.map((c) => { const a = c.points[0].anchor, b = c.points[c.points.length - 1].anchor; const f = (p) => ({ x: (p.x - x0) / w, y: flip ? (y1 - p.y) / w : (p.y - y0) / w }); const A = f(a), B = f(b); return { x: (A.x + B.x) / 2, y: (A.y + B.y) / 2 }; }); };
  const mA = norm(dA, false); let mejor = null;
  for (const flip of [false, true]) {
    const mB = norm(dB, flip); let coste = 0; const mapa = new Map();
    mB.forEach((q, j) => { let bi = -1, bd = Infinity; mA.forEach((p, i) => { const dd = Math.hypot(p.x - q.x, p.y - q.y); if (dd < bd) { bd = dd; bi = i; } }); coste += bd; mapa.set('C' + j, 'C' + bi); });
    if (new Set(mapa.values()).size === mB.length && (!mejor || coste < mejor.coste)) mejor = { coste, mapa, flip };
  }
  if (!mejor) throw new Error('mapaCreasesPorGeometria: sin correspondencia biyectiva');
  return mejor;
}
