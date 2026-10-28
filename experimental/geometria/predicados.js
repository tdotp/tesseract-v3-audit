// F2A-1 — Predicados geométricos ROBUSTOS en double (sin BigInt, sin dependencias). Experimental: no lo importa src/.
// Esquema adaptativo (Shewchuk 1997, implementado desde el artículo): 1) filtro estático en double con cota de error; 2) si el filtro no
// decide, evaluación EXACTA con expansiones de punto flotante (sumas y productos sin error: TwoSum, TwoProduct de Dekker). El resultado
// es el signo exacto del determinante sobre los doubles de entrada (supuesto: redondeo al par más cercano, sin desbordamiento).
// Una expansión es un array de doubles no solapados en orden creciente de magnitud cuya suma exacta es el valor representado.

const SPLITTER = 134217729; // 2^27 + 1
const EPS = 2 ** -53;
const ERR_ORIENT = (3 + 16 * EPS) * EPS; // ccwerrboundA

export const contadores = { filtro: 0, exacto: 0 }; // para medir cuántas veces se necesita la vía exacta

// x + y = a + b exactamente (y es el error de redondeo de x)
function twoSum(a, b) { const x = a + b, bv = x - a, av = x - bv; return [(a - av) + (b - bv), x]; }
function split(a) { const c = SPLITTER * a, big = c - a, hi = c - big; return [hi, a - hi]; }
// x + y = a · b exactamente
function twoProduct(a, b) {
  const x = a * b; const [ah, al] = split(a), [bh, bl] = split(b);
  const e1 = x - ah * bh, e2 = e1 - al * bh, e3 = e2 - ah * bl; return [al * bl - e3, x];
}
// Añade un double b a la expansión e (Grow-Expansion con eliminación de ceros).
function grow(e, b) { const h = []; let q = b; for (let i = 0; i < e.length; i++) { const [lo, hi] = twoSum(q, e[i]); if (lo !== 0) h.push(lo); q = hi; } if (q !== 0 || h.length === 0) h.push(q); return h; }
export function suma(e, f) { let r = e; for (let i = 0; i < f.length; i++) r = grow(r, f[i]); return r; }
export const negar = (e) => e.map((x) => -x);
export const resta = (e, f) => suma(e, negar(f));
// e · b exacto (b double)
export function escalar(e, b) { let r = [0]; for (let i = 0; i < e.length; i++) { const [lo, hi] = twoProduct(e[i], b); r = grow(grow(r, lo), hi); } return r; }
// e · f exacto (dos expansiones)
export function producto(e, f) { let r = [0]; for (let j = 0; j < f.length; j++) r = suma(r, escalar(e, f[j])); return r; }
export function signo(e) { for (let i = e.length - 1; i >= 0; i--) if (e[i] !== 0) return e[i] > 0 ? 1 : -1; return 0; }
export const diferencia = (a, b) => { const [lo, hi] = twoSum(a, -b); return lo === 0 ? [hi] : [lo, hi]; }; // a − b exacto como expansión
export const aprox = (e) => { let s = 0; for (let i = 0; i < e.length; i++) s += e[i]; return s; };

// (ax − bx)·(cy − dy) − (ay − by)·(cx − dx) exacto, como expansión: el producto vectorial de (a − b) y (c − d)
export function cruzExacto(ax, ay, bx, by, cx, cy, dx, dy) {
  const ux = diferencia(ax, bx), uy = diferencia(ay, by), vx = diferencia(cx, dx), vy = diferencia(cy, dy);
  return resta(producto(ux, vy), producto(uy, vx));
}
// Signo del producto vectorial (b − a) × (d − c) de dos DIRECCIONES de segmentos de entrada: exacto, con filtro.
export function cruzDirecciones(a, b, c, d) {
  const ux = b.x - a.x, uy = b.y - a.y, vx = d.x - c.x, vy = d.y - c.y;
  const l = ux * vy, r = uy * vx, det = l - r;
  // cota conservadora: las diferencias ya tienen error relativo ≤ EPS; 8·EPS cubre restas y productos
  const cota = 8 * EPS * (Math.abs(l) + Math.abs(r));
  if (det > cota || -det > cota) { contadores.filtro++; return det > 0 ? 1 : -1; }
  contadores.exacto++; return signo(cruzExacto(b.x, b.y, a.x, a.y, d.x, d.y, c.x, c.y));
}
// orient(a, b, c) = signo de (b − a) × (c − a): +1 izquierda (CCW), −1 derecha, 0 colineal. Exacto.
export function orient(a, b, c) {
  const l = (b.x - a.x) * (c.y - a.y), r = (b.y - a.y) * (c.x - a.x), det = l - r, cota = ERR_ORIENT * (Math.abs(l) + Math.abs(r));
  if (det > cota || -det > cota) { contadores.filtro++; return det > 0 ? 1 : -1; }
  contadores.exacto++; return signo(cruzExacto(b.x, b.y, a.x, a.y, c.x, c.y, a.x, a.y));
}
// ¿p está sobre el segmento cerrado [a, b]? (exacto)
export function sobreSegmento(p, a, b) {
  if (orient(a, b, p) !== 0) return false;
  return Math.min(a.x, b.x) <= p.x && p.x <= Math.max(a.x, b.x) && Math.min(a.y, b.y) <= p.y && p.y <= Math.max(a.y, b.y);
}
// Fracción exacta n/d (expansiones, d > 0) — parámetro de un punto a lo largo de un segmento.
export function compararFracciones(f, g) { return signo(resta(producto(f.n, g.d), producto(g.n, f.d))); }

// ---------- Puntos homogéneos exactos ----------
// Un punto es un double {x, y} o un punto EXACTO {x, y, H: {X, Y, W}} con X, Y, W expansiones y W > 0 (x, y = aproximación para informar).
// Lo producen el ajuste experimental (media exacta de un grupo, proyección exacta sobre un segmento). Todos los predicados de abajo
// aceptan ambos tipos; con dos doubles usan la vía rápida.
export const H = (p) => p.H || { X: [p.x], Y: [p.y], W: [1] };
export const esExacto = (p) => !!p.H;
export function puntoExacto(X, Y, W) { return { x: aprox(X) / aprox(W), y: aprox(Y) / aprox(W), H: { X, Y, W } }; }
// det |Xa Ya Wa; Xb Yb Wb; Xc Yc Wc| (su signo = orient, porque W > 0)
function det3(a, b, c) {
  const A = H(a), B = H(b), C = H(c);
  const m1 = resta(producto(B.Y, C.W), producto(C.Y, B.W)), m2 = resta(producto(B.X, C.W), producto(C.X, B.W)), m3 = resta(producto(B.X, C.Y), producto(C.X, B.Y));
  return suma(resta(producto(A.X, m1), producto(A.Y, m2)), producto(A.W, m3));
}
// orient con puntos exactos o double
export function orientG(a, b, c) { return a.H || b.H || c.H ? (contadores.exacto++, signo(det3(a, b, c))) : orient(a, b, c); }
// signo(p.k − q.k) exacto (k = 'x' | 'y')
export function cmpCoord(p, q, k) {
  if (!p.H && !q.H) return p[k] === q[k] ? 0 : p[k] > q[k] ? 1 : -1;
  const P = H(p), Qq = H(q), K = k === 'x' ? 'X' : 'Y'; return signo(resta(producto(P[K], Qq.W), producto(Qq[K], P.W)));
}
// vector (q − p) con denominador positivo omitido: (Xq·Wp − Xp·Wq, Yq·Wp − Yp·Wq)
function vec(p, q) { const P = H(p), Q2 = H(q); return { x: resta(producto(Q2.X, P.W), producto(P.X, Q2.W)), y: resta(producto(Q2.Y, P.W), producto(P.Y, Q2.W)) }; }
const cruzV = (u, v) => resta(producto(u.x, v.y), producto(u.y, v.x));
const puntoV = (u, v) => suma(producto(u.x, v.x), producto(u.y, v.y));
// signo de (q − p) × (s − r), general
export function cruzDireccionesG(p, q, r, s) { return p.H || q.H || r.H || s.H ? (contadores.exacto++, signo(cruzV(vec(p, q), vec(r, s)))) : cruzDirecciones(p, q, r, s); }
// ¿p sobre el segmento cerrado [a, b]? (general)
export function sobreSegmentoG(p, a, b) {
  if (orientG(a, b, p) !== 0) return false;
  const entre = (k) => { const s1 = cmpCoord(p, a, k), s2 = cmpCoord(p, b, k); return s1 === 0 || s2 === 0 || s1 !== s2; };
  return entre('x') && entre('y');
}
// Parámetros EXACTOS del cruce de [a, b] con [c, d]: t en [a, b] y u en [c, d] como fracciones de expansiones (denominador > 0)
export function fraccionesCruce(a, b, c, d) {
  const uca = vec(a, c), udc = vec(c, d), uba = vec(a, b);
  const den = cruzV(uba, udc), nt = producto(cruzV(uca, udc), H(b).W), dt = producto(den, H(c).W), nu = producto(cruzV(uca, uba), H(d).W), du = producto(den, H(a).W);
  const fix = (n, d2) => (signo(d2) > 0 ? { n, d: d2 } : { n: negar(n), d: negar(d2) });
  return { t: fix(nt, dt), u: fix(nu, du) };
}
// Parámetro EXACTO de la proyección de p sobre la recta de [a, b]: t = (p − a)·(b − a) / |b − a|²
export function fraccionProyeccion(p, a, b) { const upa = vec(a, p), uba = vec(a, b); return { n: producto(puntoV(upa, uba), H(b).W), d: producto(puntoV(uba, uba), H(p).W) }; }
// Proyección EXACTA de p sobre el segmento [a, b] acotada a [0, 1]: devuelve {extremo: a|b|null, punto, distanciaAprox}
export function proyectarExacto(p, a, b) {
  const A = H(a), P = H(p), R = vec(a, b), dRR = puntoV(R, R);
  if (signo(dRR) === 0) return { extremo: a, punto: a, d: Math.hypot(p.x - a.x, p.y - a.y) };
  const U = vec(a, p), dUR = puntoV(U, R);
  if (signo(dUR) <= 0) return { extremo: a, punto: a, d: Math.hypot(p.x - a.x, p.y - a.y) };
  if (signo(resta(producto(dUR, H(b).W), producto(P.W, dRR))) >= 0) return { extremo: b, punto: b, d: Math.hypot(p.x - b.x, p.y - b.y) };
  // P' = (XA·Wp·dRR + dUR·R) / (WA·Wp·dRR)
  const base = producto(P.W, dRR); const q = puntoExacto(suma(producto(A.X, base), producto(dUR, R.x)), suma(producto(A.Y, base), producto(dUR, R.y)), producto(A.W, base));
  return { extremo: null, punto: q, d: Math.hypot(p.x - q.x, p.y - q.y) };
}
// Media EXACTA de puntos double: (Σx, Σy) / k
export function mediaExacta(ps) { let X = [0], Y = [0]; for (const p of ps) { X = suma(X, [p.x]); Y = suma(Y, [p.y]); } return puntoExacto(X, Y, [ps.length]); }
// Comparación EXACTA de |p − q|² frente a |r − s|² (puntos double o exactos): signo de la diferencia
export function compararDistancias2(p, q, r, s) {
  const u = vec(q, p), v = vec(s, r), wu = producto(H(p).W, H(q).W), wv = producto(H(r).W, H(s).W);
  return signo(resta(producto(puntoV(u, u), producto(wv, wv)), producto(puntoV(v, v), producto(wu, wu))));
}
