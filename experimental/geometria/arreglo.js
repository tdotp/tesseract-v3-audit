// F2A-1 — Arreglo plano de segmentos con decisiones EXACTAS (predicados.js). Experimental: no lo importa src/.
// Puntos de los segmentos: doubles o puntos EXACTOS homogéneos (los produce el ajuste experimental). Vértices SIMBÓLICOS:
// «punto de entrada» (identidad = igualdad exacta de doubles, o el mismo objeto exacto) o «cruce de (i, j)» (sus coordenadas en double
// solo sirven para informar: nunca son extremo de un segmento ni se usan en un predicado del arreglo). Dos puntos de un mismo segmento son
// el mismo vértice si y solo si su parámetro exacto a lo largo del segmento es igual. No hay tolerancia de fusión.
import { orientG, sobreSegmentoG, cmpCoord, fraccionesCruce, fraccionProyeccion, compararFracciones, aprox } from './predicados.js';

const claveDe = (x, y) => x + '|' + y; // String(double) es exacto e inyectivo (ida y vuelta)

// segmentos: [{a, b, tag, ref}] (sin longitud 0)
export function construirArreglo(segmentos) {
  const puntos = []; const porClave = new Map(), porObjeto = new Map();
  const punto = (p) => {
    if (p.H) { let r = porObjeto.get(p); if (!r) { r = { id: puntos.length, x: p.x, y: p.y, H: p.H, tipo: 'entrada' }; puntos.push(r); porObjeto.set(p, r); if (p.sobre) r.sobre = [punto(p.sobre[0]), punto(p.sobre[1])]; } return r; }
    const k = claveDe(p.x, p.y); let r = porClave.get(k); if (!r) { r = { id: puntos.length, x: p.x, y: p.y, tipo: 'entrada' }; puntos.push(r); porClave.set(k, r); } return r;
  };
  const S = segmentos.map((s, i) => { const a = punto(s.a), b = punto(s.b); const m = a.H || b.H ? 1e-9 * (1 + Math.abs(a.x) + Math.abs(a.y) + Math.abs(b.x) + Math.abs(b.y)) : 0; return { i, a, b, tag: s.tag, ref: s.ref, ent: [{ p: a, modo: 'linea' }, { p: b, modo: 'linea' }], x0: Math.min(a.x, b.x) - m, x1: Math.max(a.x, b.x) + m, y0: Math.min(a.y, b.y) - m, y1: Math.max(a.y, b.y) + m }; });
  const estaDentro = (p, s) => p !== s.a && p !== s.b && sobreSegmentoG(p, s.a, s.b);
  let cruces = 0;
  for (let i = 0; i < S.length; i++) for (let j = i + 1; j < S.length; j++) {
    const s = S[i], t = S[j];
    if (s.x1 < t.x0 || t.x1 < s.x0 || s.y1 < t.y0 || t.y1 < s.y0) continue;
    const o1 = orientG(s.a, s.b, t.a), o2 = orientG(s.a, s.b, t.b), o3 = orientG(t.a, t.b, s.a), o4 = orientG(t.a, t.b, s.b);
    if (o1 * o2 < 0 && o3 * o4 < 0) { // cruce propio: punto nuevo con parámetros exactos en ambos segmentos
      const f = fraccionesCruce(s.a, s.b, t.a, t.b); const tt = aprox(f.t.n) / aprox(f.t.d);
      const X = { id: puntos.length, x: s.a.x + tt * (s.b.x - s.a.x), y: s.a.y + tt * (s.b.y - s.a.y), tipo: 'cruce', de: [i, j] }; puntos.push(X); cruces++;
      s.ent.push({ p: X, modo: 'frac', frac: f.t }); t.ent.push({ p: X, modo: 'frac', frac: f.u });
      continue;
    }
    // T y solapes colineales: solo puntos ya existentes (no se crean coordenadas)
    if (o1 === 0 && estaDentro(t.a, s)) s.ent.push({ p: t.a, modo: 'linea' });
    if (o2 === 0 && estaDentro(t.b, s)) s.ent.push({ p: t.b, modo: 'linea' });
    if (o3 === 0 && estaDentro(s.a, t)) t.ent.push({ p: s.a, modo: 'linea' });
    if (o4 === 0 && estaDentro(s.b, t)) t.ent.push({ p: s.b, modo: 'linea' });
  }
  // orden exacto a lo largo de cada segmento y unión de puntos con el mismo parámetro
  const par = puntos.map((_, k) => k); const raiz = (k) => (par[k] === k ? k : (par[k] = raiz(par[k])));
  for (const s of S) {
    const fr = (e) => e.frac || (e.frac = fraccionProyeccion(e.p, s.a, s.b));
    const k = Math.abs(s.b.x - s.a.x) >= Math.abs(s.b.y - s.a.y) ? 'x' : 'y'; let sentido = cmpCoord(s.b, s.a, k); if (sentido === 0) { sentido = cmpCoord(s.b, s.a, k === 'x' ? 'y' : 'x'); }
    const eje = cmpCoord(s.b, s.a, k) !== 0 ? k : (k === 'x' ? 'y' : 'x');
    const cmp = (e, f) => {
      if (e.p === f.p) return 0;
      if (e.modo === 'linea' && f.modo === 'linea') return cmpCoord(e.p, f.p, eje) * sentido; // ambos EXACTAMENTE sobre la recta del segmento
      return compararFracciones(fr(e), fr(f));
    };
    const vistos = new Set(); s.ent = s.ent.filter((e) => (vistos.has(e.p) ? false : (vistos.add(e.p), true))); s.ent.sort(cmp);
    for (let q = 1; q < s.ent.length; q++) if (cmp(s.ent[q - 1], s.ent[q]) === 0) par[raiz(s.ent[q].p.id)] = raiz(s.ent[q - 1].p.id);
  }
  const grupos = new Map(); puntos.forEach((p) => { const r = raiz(p.id); if (!grupos.has(r)) grupos.set(r, []); grupos.get(r).push(p); });
  const vertices = []; const vDe = new Map();
  for (const g of grupos.values()) { const rep = g.find((p) => p.tipo === 'entrada') || g[0]; const v = { id: vertices.length, x: rep.x, y: rep.y, tipo: rep.tipo, exacto: !!rep.H, puntos: g.map((p) => p.id) }; vertices.push(v); g.forEach((p) => vDe.set(p.id, v.id)); }
  // aristas atómicas: conservan la DIRECCIÓN exacta de su segmento de origen (extremos double o exactos) para el orden angular
  const aristas = new Map();
  for (const s of S) {
    const ids = []; for (const e of s.ent) { const v = vDe.get(e.p.id); if (ids[ids.length - 1] !== v) ids.push(v); }
    for (let q = 0; q + 1 < ids.length; q++) {
      const u = ids[q], v = ids[q + 1]; if (u === v) continue; const key = u < v ? u + '|' + v : v + '|' + u;
      if (!aristas.has(key)) aristas.set(key, { u: Math.min(u, v), v: Math.max(u, v), tags: new Set(), dir: u < v ? [s.a, s.b] : [s.b, s.a] });
      aristas.get(key).tags.add(s.tag);
    }
  }
  return { vertices, aristas: [...aristas.values()], segmentos: S.length, cruces, puntosEntrada: puntos.filter((p) => p.tipo === 'entrada').length, puntosExactos: puntos.filter((p) => p.H).length };
}
