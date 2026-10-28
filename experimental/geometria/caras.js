// F2A-1 — Caras del arreglo: semiaristas ordenadas por ángulo con comparación EXACTA de las direcciones de origen (sin atan2), recorrido
// de ciclos, componentes conexas, Euler, unión de islas a la cara que las contiene y paridad par-impar de contornos cerrados por BFS.
// Experimental: no lo importa src/.
import { cruzDireccionesG, orientG, cmpCoord } from './predicados.js';

// Suma compensada (Neumaier) para áreas en double
function sumaComp(xs) { let s = 0, c = 0; for (const x of xs) { const t = s + x; c += Math.abs(s) >= Math.abs(x) ? (s - t) + x : (x - t) + s; s = t; } return s + c; }
export function areaPoligono(ps) { if (ps.length < 3) return 0; const o = ps[0], t = []; for (let i = 1; i + 1 < ps.length; i++) { const a = ps[i], b = ps[i + 1]; t.push((a.x - o.x) * (b.y - o.y) - (b.x - o.x) * (a.y - o.y)); } return sumaComp(t) / 2; }
// Punto ESTRICTAMENTE dentro (paridad de cruces con orientaciones exactas sobre los doubles del polígono); null si p está sobre el borde
export function dentroPoligono(p, ps) {
  let dentro = false;
  for (let i = 0, j = ps.length - 1; i < ps.length; j = i++) {
    const a = ps[j], b = ps[i]; const o = orientG(a, b, p);
    if (o === 0 && Math.min(a.x, b.x) <= p.x && p.x <= Math.max(a.x, b.x) && Math.min(a.y, b.y) <= p.y && p.y <= Math.max(a.y, b.y)) return null;
    if ((a.y > p.y) !== (b.y > p.y)) { if (b.y > a.y ? o > 0 : o < 0) dentro = !dentro; }
  }
  return dentro;
}

export function construirCaras(arr, esContornoCerrado) {
  const { vertices: V, aristas: E } = arr;
  const H = [], sal = V.map(() => []);
  for (const e of E) { const h1 = { o: e.u, t: e.v, e, dir: [e.dir[0], e.dir[1]] }, h2 = { o: e.v, t: e.u, e, dir: [e.dir[1], e.dir[0]] }; h1.tw = h2; h2.tw = h1; e.h = [h1, h2]; H.push(h1, h2); sal[e.u].push(h1); sal[e.v].push(h2); }
  // semiplano superior: dy > 0, o dy = 0 y dx > 0 (exacto: comparaciones de doubles de los extremos de origen)
  const mitad = (h) => { const [p, q] = h.dir; const dy = cmpCoord(q, p, 'y'); return dy > 0 || (dy === 0 && cmpCoord(q, p, 'x') > 0) ? 0 : 1; };
  sal.forEach((l) => { l.sort((a, b) => mitad(a) - mitad(b) || -cruzDireccionesG(a.dir[0], a.dir[1], b.dir[0], b.dir[1])); l.forEach((h, i) => { h.idx = i; }); });
  const ciclos = [];
  for (const h0 of H) {
    if (h0.ciclo != null) continue; const c = { id: ciclos.length, hs: [] }; let h = h0;
    do { h.ciclo = c.id; c.hs.push(h); const l = sal[h.t]; h = l[(h.tw.idx - 1 + l.length) % l.length]; } while (h !== h0 && c.hs.length <= H.length);
    c.poligono = c.hs.map((x) => V[x.o]); c.area = areaPoligono(c.poligono); ciclos.push(c);
  }
  // componentes y Euler
  const pv = V.map((_, i) => i); const rz = (i) => (pv[i] === i ? i : (pv[i] = rz(pv[i]))); for (const e of E) pv[rz(e.u)] = rz(e.v);
  const comp = new Map(); V.forEach((_, i) => { if (sal[i].length) { const r = rz(i); if (!comp.has(r)) comp.set(r, comp.size); } });
  const Vn = V.filter((_, i) => sal[i].length).length; const euler = { V: Vn, E: E.length, ciclos: ciclos.length, componentes: comp.size, ok: Vn - E.length + ciclos.length === 2 * comp.size };
  // exterior de cada componente = ciclo de menor área con signo; se une a la cara acotada que contiene la componente (o a la no acotada)
  const porC = new Map(); ciclos.forEach((c) => { c.comp = comp.get(rz(c.hs[0].o)); if (!porC.has(c.comp)) porC.set(c.comp, []); porC.get(c.comp).push(c); });
  const ext = new Map(); for (const [k, cs] of porC) ext.set(k, cs.reduce((m, c) => (c.area < m.area ? c : m)));
  const region = ciclos.map((c) => c.id); const NO = -1; let islasDudosas = 0;
  for (const [k, ex] of ext) {
    const v = V[ex.hs[0].o]; let cont = null;
    for (const c of ciclos) { if (c.comp === k || c.area <= 0 || c === ext.get(c.comp)) continue; const d = dentroPoligono(v, c.poligono); if (d === null) { islasDudosas++; continue; } if (d && (!cont || c.area < cont.area)) cont = c; }
    region[ex.id] = cont ? cont.id : NO; ex.contenidaEn = cont ? cont.id : NO;
  }
  const reg = (cid) => { let r = region[cid]; while (r !== NO && region[r] !== r) r = region[r]; return r; };
  // paridad
  const pe = (e) => [...e.tags].filter(esContornoCerrado).length % 2;
  const vec = new Map(); const add = (a, b, p) => { if (!vec.has(a)) vec.set(a, []); vec.get(a).push([b, p]); };
  for (const e of E) { const a = reg(e.h[0].ciclo), b = reg(e.h[1].ciclo), p = pe(e); add(a, b, p); add(b, a, p); }
  const par = new Map([[NO, 0]]); const cola = [NO]; let coherente = true;
  while (cola.length) { const a = cola.shift(); for (const [b, p] of vec.get(a) || []) { const v = par.get(a) ^ p; if (!par.has(b)) { par.set(b, v); cola.push(b); } else if (par.get(b) !== v) coherente = false; } }
  return { H, ciclos, reg, par, euler, coherente, islasDudosas, NO };
}
