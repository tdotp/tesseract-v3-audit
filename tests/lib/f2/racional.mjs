// F2A-0 — Aritmética racional EXACTA (BigInt) para el oráculo geométrico. Sin tolerancias: todo double se convierte a su valor
// binario exacto (m·2^e) y las operaciones +, −, ×, ÷ y comparaciones son exactas. No importa nada del producto ni del motor web.
// Representación: {n, d} con d > 0 y gcd(|n|, d) = 1. Puntos: {x, y} de racionales.

const ZERO = { n: 0n, d: 1n }, ONE = { n: 1n, d: 1n };
const abs = (a) => (a < 0n ? -a : a);
function gcd(a, b) { a = abs(a); b = abs(b); while (b) { const t = a % b; a = b; b = t; } return a; }
function mk(n, d) {
  if (d === 0n) throw new Error('racional: división por cero');
  if (d < 0n) { n = -n; d = -d; }
  if (n === 0n) return ZERO;
  const g = gcd(n, d); return g === 1n ? { n, d } : { n: n / g, d: d / g };
}

// Valor exacto de un double (incluidos subnormales). Lanza con NaN/Infinity.
export function deDouble(x) {
  if (!Number.isFinite(x)) throw new Error('racional: no finito ' + x);
  if (x === 0) return ZERO;
  const dv = new DataView(new ArrayBuffer(8)); dv.setFloat64(0, x);
  const hi = dv.getUint32(0), lo = dv.getUint32(4);
  const neg = hi >>> 31, ex = (hi >>> 20) & 0x7ff;
  let m = (BigInt(hi & 0xfffff) << 32n) | BigInt(lo), e;
  if (ex === 0) e = -1074; else { m |= 1n << 52n; e = ex - 1075; }
  let n = m, d = 1n; if (e >= 0) n <<= BigInt(e); else d <<= BigInt(-e);
  return mk(neg ? -n : n, d);
}
// Decimal exacto desde texto ('0.05' = 1/20; '-3/4' también vale).
export function deTexto(s) {
  s = String(s).trim(); if (s.includes('/')) { const [a, b] = s.split('/'); return mk(BigInt(a), BigInt(b)); }
  const m = /^(-?)(\d*)(?:\.(\d*))?(?:e(-?\d+))?$/i.exec(s); if (!m) throw new Error('racional: texto inválido ' + s);
  const dec = m[3] || ''; let n = BigInt((m[2] || '0') + dec), d = 10n ** BigInt(dec.length); const e = Number(m[4] || 0);
  if (e > 0) n *= 10n ** BigInt(e); else if (e < 0) d *= 10n ** BigInt(-e);
  return mk(m[1] ? -n : n, d);
}
export const entero = (k) => mk(BigInt(k), 1n);
export const suma = (a, b) => mk(a.n * b.d + b.n * a.d, a.d * b.d);
export const resta = (a, b) => mk(a.n * b.d - b.n * a.d, a.d * b.d);
export const mul = (a, b) => mk(a.n * b.n, a.d * b.d);
export const div = (a, b) => mk(a.n * b.d, a.d * b.n);
export const neg = (a) => (a.n === 0n ? ZERO : { n: -a.n, d: a.d });
export const signo = (a) => (a.n > 0n ? 1 : a.n < 0n ? -1 : 0);
export const cmp = (a, b) => { const v = a.n * b.d - b.n * a.d; return v > 0n ? 1 : v < 0n ? -1 : 0; };
export const igual = (a, b) => a.n === b.n && a.d === b.d;
export const esCero = (a) => a.n === 0n;
export const min = (a, b) => (cmp(a, b) <= 0 ? a : b);
export const max = (a, b) => (cmp(a, b) >= 0 ? a : b);
export const media = (lista) => { let s = ZERO; for (const v of lista) s = suma(s, v); return div(s, entero(lista.length)); };
export const texto = (a) => (a.d === 1n ? String(a.n) : a.n + '/' + a.d);
// Aproximación a double (solo para informar; nunca para decidir).
export function aNumero(a) {
  if (a.n === 0n) return 0;
  const bits = (v) => abs(v).toString(2).length; const sh = Math.max(0, Math.max(bits(a.n), bits(a.d)) - 1000);
  return Number(a.n >> BigInt(sh)) / Number(a.d >> BigInt(sh));
}
export { ZERO, ONE };

// ---- Geometría exacta sobre puntos racionales ----
export const P = (x, y) => ({ x, y });
export const pDouble = (p) => ({ x: deDouble(p.x), y: deDouble(p.y) });
export const pIgual = (a, b) => igual(a.x, b.x) && igual(a.y, b.y);
export const pClave = (p) => texto(p.x) + ',' + texto(p.y);
export const pResta = (a, b) => ({ x: resta(a.x, b.x), y: resta(a.y, b.y) });
export const pSuma = (a, b) => ({ x: suma(a.x, b.x), y: suma(a.y, b.y) });
export const pEscala = (a, k) => ({ x: mul(a.x, k), y: mul(a.y, k) });
export const cruz = (a, b) => resta(mul(a.x, b.y), mul(a.y, b.x));
export const punto = (a, b) => suma(mul(a.x, b.x), mul(a.y, b.y));
export const orient = (a, b, c) => signo(cruz(pResta(b, a), pResta(c, a))); // +1 izquierda (CCW), −1 derecha, 0 colineal: EXACTO
export const dist2 = (a, b) => { const d = pResta(a, b); return punto(d, d); };
export const pLex = (a, b) => cmp(a.x, b.x) || cmp(a.y, b.y);
export const pMedia = (ps) => ({ x: media(ps.map((p) => p.x)), y: media(ps.map((p) => p.y)) });
export const aDouble = (p) => ({ x: aNumero(p.x), y: aNumero(p.y) });

// Proyección exacta de p sobre el segmento [a, b] (parámetro acotado a [0, 1]); devuelve {t, q, d2}.
export function proyectar(p, a, b) {
  const r = pResta(b, a), L = punto(r, r);
  if (esCero(L)) return { t: ZERO, q: a, d2: dist2(p, a) };
  let t = div(punto(pResta(p, a), r), L); if (signo(t) < 0) t = ZERO; else if (cmp(t, ONE) > 0) t = ONE;
  const q = pSuma(a, pEscala(r, t)); return { t, q, d2: dist2(p, q) };
}
// ¿p está EXACTAMENTE sobre el segmento cerrado [a, b]?
export function sobreSegmento(p, a, b) {
  if (orient(a, b, p) !== 0) return false;
  return cmp(min(a.x, b.x), p.x) <= 0 && cmp(p.x, max(a.x, b.x)) <= 0 && cmp(min(a.y, b.y), p.y) <= 0 && cmp(p.y, max(a.y, b.y)) <= 0;
}
// Área con signo exacta (fórmula del área de Gauss).
export function areaPoligono(ps) { let s = ZERO; for (let i = 0; i < ps.length; i++) s = suma(s, cruz(ps[i], ps[(i + 1) % ps.length])); return div(s, entero(2)); }
// Punto estrictamente dentro / fuera (paridad de cruces). El llamador garantiza que p NO está sobre el borde (lo comprueba aquí y lanza).
export function dentroPoligono(p, ps) {
  let dentro = false;
  for (let i = 0, j = ps.length - 1; i < ps.length; j = i++) {
    const a = ps[j], b = ps[i];
    if (sobreSegmento(p, a, b)) throw new Error('dentroPoligono: el punto está sobre el borde');
    const ya = cmp(a.y, p.y) > 0, yb = cmp(b.y, p.y) > 0;
    if (ya !== yb) { // x del cruce > p.x ⇔ orient según el sentido del lado
      const o = orient(a, b, p); if (cmp(b.y, a.y) > 0 ? o > 0 : o < 0) dentro = !dentro;
    }
  }
  return dentro;
}
