// F2A-2 — Comprobaciones INDEPENDIENTES del adaptador PanelModel v1 y del árbol de plegado experimentales (solo para pruebas).
// No usan el núcleo ni el adaptador: trabajan sobre el resultado del ORÁCULO de F2A-0 (polígonos racionales pasados a double) o sobre
// los objetos v1 publicados (vertices, crease {a, b}, sign), con geometría elemental en double.
import * as Q from './racional.mjs';

const cs = (l, mapa = (id) => id) => l.map(mapa).sort((a, b) => Number(a.slice(1)) - Number(b.slice(1))).join(' ');
// Firma de cada panel = conjunto de creases que lo separan + rango por área entre los de igual conjunto (como areasPorFirma de F2A-0)
// (a igualdad de área, el vértice mínimo (x, y) del polígono: identifica paneles simétricos sin depender del orden de la entrada)
const vmin = (ps) => ps.reduce((m, v) => (v.x < m.x || (v.x === m.x && v.y < m.y) ? v : m));
export function firmas(paneles, area, mapa, poli) {
  const g = new Map(); paneles.forEach((p, i) => { const k = cs(p.creases, mapa); if (!g.has(k)) g.set(k, []); g.get(k).push({ i, a: area(p), v: vmin(poli(i)) }); });
  const out = []; for (const [k, ps] of g) ps.sort((x, y) => x.a - y.a || x.v.x - y.v.x || x.v.y - y.v.y).forEach((p, r) => { out[p.i] = k + '#' + r; }); return out;
}
export const firmasModelo = (m, mapa) => firmas(m.f2a2.paneles, (p) => p.areaNeta, mapa, (i) => m.panels[i].vertices);
export const poligonoOraculo = (p) => p.poligono.map((v) => ({ x: Q.aNumero(v.x), y: Q.aNumero(v.y) }));
export const firmasOraculo = (O) => firmas(O.paneles, (p) => Q.aNumero(p.area), undefined, (i) => poligonoOraculo(O.paneles[i]));

// Punto estrictamente dentro de un polígono (paridad de cruces, double); suficiente para sondas alejadas del borde
export function dentro(p, ps) { let r = false; for (let i = 0, j = ps.length - 1; i < ps.length; j = i++) { const a = ps[j], b = ps[i]; if ((a.y > p.y) !== (b.y > p.y) && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) r = !r; } return r; }
export function distBorde(p, ps) { let m = Infinity; for (let i = 0; i < ps.length; i++) { const a = ps[i], b = ps[(i + 1) % ps.length]; const dx = b.x - a.x, dy = b.y - a.y, l2 = dx * dx + dy * dy; const t = l2 ? Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / l2)) : 0; m = Math.min(m, Math.hypot(p.x - a.x - t * dx, p.y - a.y - t * dy)); } return m; }

// Lado del hijo respecto del eje a→b por SONDAS (independiente de las semiaristas): +1 izquierda, −1 derecha, 0 indeciso
export function ladoPorSondas(poli, eje) {
  const { a, b } = eje; const dx = b.x - a.x, dy = b.y - a.y, L = Math.hypot(dx, dy); const nx = -dy / L, ny = dx / L; const d = Math.min(1e-3, 1e-3 * L);
  let iz = 0, de = 0; for (const t of [0.13, 0.31, 0.5, 0.69, 0.87]) { const m = { x: a.x + t * dx, y: a.y + t * dy }; if (dentro({ x: m.x + d * nx, y: m.y + d * ny }, poli)) iz++; if (dentro({ x: m.x - d * nx, y: m.y - d * ny }, poli)) de++; }
  return iz > de ? 1 : de > iz ? -1 : 0;
}

// BFS independiente: niveles desde la base sobre una lista de parejas [i, j]
export function nivelesBFS(n, pares, base) { const v = Array.from({ length: n }, () => []); for (const [i, j] of pares) { v[i].push(j); v[j].push(i); } const L = Array(n).fill(-1); L[base] = 0; const q = [base]; while (q.length) { const x = q.shift(); for (const y of v[x]) if (L[y] < 0) { L[y] = L[x] + 1; q.push(y); } } return L; }

// Plegado rígido con la MISMA convención que src/fold/folding.js (pivote en a, rotación de ángulo interno = visible × sign alrededor de a→b,
// regla de la mano derecha). Devuelve, por panel, una función punto 2D → punto 3D.
function rot(a, b, th) { const ux0 = b.x - a.x, uy0 = b.y - a.y, L = Math.hypot(ux0, uy0); const ux = ux0 / L, uy = uy0 / L, c = Math.cos(th), s = Math.sin(th);
  return (p) => { const x = p.x - a.x, y = p.y - a.y, z = p.z || 0; const d = ux * x + uy * y; // Rodrigues con u = (ux, uy, 0)
    const cx = uy * z, cy = -ux * z, cz = ux * y - uy * x; return { x: a.x + x * c + cx * s + ux * d * (1 - c), y: a.y + y * c + cy * s + uy * d * (1 - c), z: z * c + cz * s }; }; }
export function plegar(n, aristas, base, visibles) {
  const T = Array(n).fill(null); T[base] = (p) => ({ x: p.x, y: p.y, z: p.z || 0 });
  const hijos = new Map(); aristas.forEach((e, k) => { if (!hijos.has(e.parent)) hijos.set(e.parent, []); hijos.get(e.parent).push(k); });
  const q = [base]; while (q.length) { const p = q.shift(); for (const k of hijos.get(p) || []) { const e = aristas[k]; const R = rot(e.crease.a, e.crease.b, ((visibles[k] || 0) * Math.PI / 180) * e.sign); const Tp = T[p]; T[e.child] = (x) => Tp(R(x)); q.push(e.child); } }
  return T;
}
export const centroidePoli = (ps) => { let A = 0, cx = 0, cy = 0; const o = ps[0]; for (let i = 0; i < ps.length; i++) { const p = ps[i], q = ps[(i + 1) % ps.length]; const px = p.x - o.x, py = p.y - o.y, qx = q.x - o.x, qy = q.y - o.y, k = px * qy - qx * py; A += k; cx += (px + qx) * k; cy += (py + qy) * k; } return { x: o.x + cx / (3 * A), y: o.y + cy / (3 * A) }; };
export const convexo = (ps) => { let s = 0; for (let i = 0; i < ps.length; i++) { const a = ps[i], b = ps[(i + 1) % ps.length], c = ps[(i + 2) % ps.length]; const k = (b.x - a.x) * (c.y - b.y) - (b.y - a.y) * (c.x - b.x); if (k < -1e-9) return false; s += k; } return s > 0; };

// Árbol en forma independiente del etiquetado: [firma padre, firma hijo, eje como pareja ordenada de puntos redondeados, lado canónico]
export function arbolCanonico(m, T, mapa, dec = 6) {
  const f = firmasModelo(m, mapa); const k = (p) => p.x.toFixed(dec) + ',' + p.y.toFixed(dec);
  return T.aristas.map((e) => { const ka = k(e.crease.a), kb = k(e.crease.b); const orden = ka < kb; return [f[e.parent], f[e.child], orden ? ka + ' ' + kb : kb + ' ' + ka, orden ? e.sign : -e.sign].join(' | '); });
}

// F2A-2R — Clasificación INDEPENDIENTE de cada unión del oráculo (pareja de paneles adyacentes) con aritmética racional exacta y sin el
// núcleo: aristas compartidas por los polígonos exactos de los dos paneles que NO están sobre un corte de la entrada (los cortes nunca se
// ajustan), agrupadas por recta exacta ⇒ 'plegable' (una recta), 'ambigua' (varias, todas paralelas) o 'no-plegable'. Las uniones que
// el oráculo da a través de una isla (sin aristas compartidas en los polígonos) quedan como 'sin-aristas-en-poligono'.
export function clasificarUnionesOraculo(O, d) {
  const corte = []; const segs = (pa, cerrado) => { const q = pa.points.map((x) => Q.pDouble(x.anchor)); for (let i = 0; i < q.length - (cerrado ? 0 : 1); i++) corte.push([q[i], q[(i + 1) % q.length]]); };
  segs(d.outerBoundary, true); (d.holes || []).forEach((h) => segs(h, true)); (d.cutLines || []).forEach((k) => { const g = k.geom || k; segs(g, !!g.closed); });
  const enSeg = (p, [a, b]) => Q.orient(a, b, p) === 0 && Q.cmp(p.x, Q.min(a.x, b.x)) >= 0 && Q.cmp(p.x, Q.max(a.x, b.x)) <= 0 && Q.cmp(p.y, Q.min(a.y, b.y)) >= 0 && Q.cmp(p.y, Q.max(a.y, b.y)) <= 0;
  const esCorte = (u, v) => corte.some((s) => enSeg(u, s) && enSeg(v, s));
  const aristas = (poli) => poli.map((p, i) => [p, poli[(i + 1) % poli.length]]);
  return O.adyacencias.map((x) => {
    const kB = new Set(aristas(O.paneles[x.b].poligono).map(([u, v]) => Q.pClave(v) + '>' + Q.pClave(u)));
    const comp = aristas(O.paneles[x.a].poligono).filter(([u, v]) => kB.has(Q.pClave(u) + '>' + Q.pClave(v)) && !esCorte(u, v));
    const rectas = []; for (const [u, v] of comp) { const r = rectas.find(([p, q]) => Q.orient(p, q, u) === 0 && Q.orient(p, q, v) === 0); if (!r) rectas.push([u, v]); }
    const dir = ([p, q]) => Q.pResta(q, p); const clase = !rectas.length ? 'sin-aristas-en-poligono' : rectas.length === 1 ? 'plegable' : rectas.every((r) => Q.esCero(Q.cruz(dir(rectas[0]), dir(r)))) ? 'ambigua' : 'no-plegable';
    return { a: x.a, b: x.b, creases: x.creases, clase, rectas: rectas.length };
  });
}
// Componentes y número ciclomático de un grafo (n nodos, lista de parejas): referencia independiente para H-02
export function componentesYCiclomatico(n, pares) { const p = Array.from({ length: n }, (_, i) => i); const r = (i) => (p[i] === i ? i : (p[i] = r(p[i]))); for (const [a, b] of pares) p[r(a)] = r(b); const c = new Set(Array.from({ length: n }, (_, i) => r(i))).size; return { componentes: c, ciclomatico: pares.length - n + c }; }
