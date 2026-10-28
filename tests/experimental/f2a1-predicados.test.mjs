// F2A-1 — Predicados robustos del núcleo experimental (experimental/geometria/predicados.js) frente a la aritmética racional EXACTA
// de F2A-0 (tests/lib/f2/racional.mjs). Cada operación con su prueba: sumas y productos sin error, orient, producto vectorial de
// direcciones y comparación de fracciones. Generador pseudoaleatorio con semilla fija (determinista).
import { test, describe } from 'node:test'; import assert from 'node:assert/strict';
import * as E from '../../experimental/geometria/predicados.js';
import * as Q from '../lib/f2/racional.mjs';

let semilla = 20261027; const rnd = () => { semilla = (semilla * 1103515245 + 12345) % 2147483648; return semilla / 2147483648; };
const ulp = (x, k) => { const b = new Float64Array([x]), i = new BigInt64Array(b.buffer); i[0] += BigInt(k); return b[0]; }; // x desplazado k ulps
const valor = (e) => e.reduce((s, x) => Q.suma(s, Q.deDouble(x)), Q.ZERO); // valor exacto de una expansión
const P = (x, y) => ({ x, y }); const QP = (p) => Q.pDouble(p);

function triples(n) {
  const out = [];
  for (let k = 0; k < n; k++) {
    const tipo = k % 6;
    if (tipo === 0) out.push([P(rnd() * 400, rnd() * 400), P(rnd() * 400, rnd() * 400), P(rnd() * 400, rnd() * 400)]);                       // aleatorio
    else if (tipo === 1) { const g = () => Math.floor(rnd() * 20) * 0.5; out.push([P(g(), g()), P(g(), g()), P(g(), g())]); }                 // rejilla (muchos colineales)
    else if (tipo === 2) { const a = P(rnd() * 300, rnd() * 300), b = P(rnd() * 300, rnd() * 300), t = rnd(); const c = P(a.x + t * (b.x - a.x), a.y + t * (b.y - a.y)); out.push([a, b, c]); } // casi colineal (redondeo)
    else if (tipo === 3) { const x = 0.5 + Math.floor(rnd() * 64) * 2 ** -53, y = 0.5 + Math.floor(rnd() * 64) * 2 ** -53; out.push([P(x, y), P(12, 12), P(24, 24)]); } // perturbaciones de ulps (Kettner)
    else if (tipo === 4) { const o = 1e7; out.push([P(o + rnd(), o + rnd()), P(o + rnd(), o + rnd()), P(o + rnd(), o + rnd())]); }         // coordenadas grandes
    else { const a = P(rnd() * 200, 148.354), b = P(rnd() * 200 + 200, 148.354), c = P(rnd() * 400, ulp(148.354, Math.floor(rnd() * 5) - 2)); out.push([a, b, c]); } // horizontales con 0–2 ulps
  }
  return out;
}

describe('F2A-1 · aritmética de expansiones (sin error)', () => {
  test('diferencia, producto y suma de expansiones son EXACTOS (10 000 pares aleatorios)', () => {
    for (let k = 0; k < 10000; k++) {
      const a = (rnd() - 0.5) * 10 ** Math.floor(rnd() * 10 - 3), b = (rnd() - 0.5) * 10 ** Math.floor(rnd() * 10 - 3);
      assert.ok(Q.igual(valor(E.diferencia(a, b)), Q.resta(Q.deDouble(a), Q.deDouble(b))));
      assert.ok(Q.igual(valor(E.producto(E.diferencia(a, b), [b])), Q.mul(Q.resta(Q.deDouble(a), Q.deDouble(b)), Q.deDouble(b))));
      assert.ok(Q.igual(valor(E.suma([a], [b])), Q.suma(Q.deDouble(a), Q.deDouble(b))));
    }
  });
});

describe('F2A-1 · orient y producto vectorial de direcciones', () => {
  const T = triples(100000);
  test('orient = signo exacto en 100 000 triples (aleatorios, rejilla, casi colineales, ulps, 1e7, horizontales)', () => {
    E.contadores.filtro = 0; E.contadores.exacto = 0; let mal = 0;
    for (const [a, b, c] of T) if (E.orient(a, b, c) !== Q.orient(QP(a), QP(b), QP(c))) mal++;
    assert.equal(mal, 0); assert.ok(E.contadores.exacto > 0 && E.contadores.filtro > 0, 'se ejercitan las dos vías');
  });
  test('el double ingenuo SÍ se equivoca en esos triples (el respaldo exacto es necesario)', () => {
    let mal = 0; for (const [a, b, c] of T) { const d = Math.sign((b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x)); if (d !== Q.orient(QP(a), QP(b), QP(c))) mal++; } assert.ok(mal > 0, 'errores del double ingenuo: ' + mal);
  });
  test('contraejemplo fijado en F2A-0: (0.5, 0.5000000000000001), (12, 12), (24, 24) ⇒ +1', () => { assert.equal(E.orient(P(0.5, 0.5000000000000001), P(12, 12), P(24, 24)), 1); });
  test('cruzDirecciones = signo exacto de (b − a) × (d − c) en 20 000 casos', () => {
    let mal = 0; for (let k = 0; k < 20000; k++) { const [a, b, c] = T[k], [, d] = T[k + 1]; const ex = Q.signo(Q.cruz(Q.pResta(QP(b), QP(a)), Q.pResta(QP(d), QP(c)))); if (E.cruzDirecciones(a, b, c, d) !== ex) mal++; } assert.equal(mal, 0);
  });
  test('sobreSegmento exacto: punto a 1 ulp de un borde horizontal NO está encima; el punto exacto sí', () => {
    const a = P(257.609, 148.354), b = P(297.607, 148.354); assert.equal(E.sobreSegmento(P(270, 148.354), a, b), true); assert.equal(E.sobreSegmento(P(270, ulp(148.354, 1)), a, b), false);
  });
});

describe('F2A-1 · comparación exacta de fracciones (parámetros a lo largo de un segmento)', () => {
  test('compararFracciones = comparación racional exacta en 5 000 pares de fracciones de expansiones', () => {
    for (let k = 0; k < 5000; k++) {
      const n1 = E.diferencia(rnd() * 100, rnd() * 100), d1 = E.diferencia(100 + rnd(), rnd()), n2 = k % 3 ? E.diferencia(rnd() * 100, rnd() * 100) : n1.slice(), d2 = k % 3 ? E.diferencia(100 + rnd(), rnd()) : d1.slice();
      const ex = Q.cmp(Q.div(valor(n1), valor(d1)), Q.div(valor(n2), valor(d2)));
      assert.equal(E.compararFracciones({ n: n1, d: d1 }, { n: n2, d: d2 }), ex);
    }
  });
});
