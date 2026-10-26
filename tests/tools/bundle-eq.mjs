// A6 — Equivalencia del bundle por funciones: compara dos dist/main.js función a función (sangría normalizada) y el multiconjunto de líneas restantes.
// Uso: node tests/tools/bundle-eq.mjs anterior.js nuevo.js   (para comparar con renombres de esbuild, normalizar antes los nombres, p. ej. log2 → log)
import fs from 'node:fs';
const [A, B] = process.argv.slice(2).map((f) => fs.readFileSync(f, 'utf8').split('\n').slice(1)); // sin el banner
function fns(L) { const m = new Map(), rest = []; for (let i = 0; i < L.length; i++) { const r = /^(\s*)function (\w+)\(/.exec(L[i]); if (!r) { rest.push(L[i].trim()); continue; }
  let j = i; if (!L[i].trimEnd().endsWith('}') || (L[i].match(/\{/g) || []).length !== (L[i].match(/\}/g) || []).length) { while (++j < L.length && L[j] !== r[1] + '}'); }
  const body = L.slice(i, j + 1).map((l) => l.trim()).join('\n'); const k = m.has(r[2]) ? r[2] + '#' + i : r[2]; m.set(k, body); i = j; } return { m, rest }; }
const a = fns(A), b = fns(B); const out = { soloEnA: [], soloEnB: [], distintas: [] };
for (const [k, v] of a.m) { if (!b.m.has(k)) out.soloEnA.push(k); else if (b.m.get(k) !== v) out.distintas.push(k); } for (const k of b.m.keys()) if (!a.m.has(k)) out.soloEnB.push(k);
const cnt = (arr) => arr.filter((l) => l && !l.startsWith('// src/')).reduce((o, l) => (o[l] = (o[l] || 0) + 1, o), {});
const ca = cnt(a.rest), cb = cnt(b.rest); out.lineasQuitadas = []; out.lineasAnadidas = [];
for (const l of new Set([...Object.keys(ca), ...Object.keys(cb)])) { const d = (cb[l] || 0) - (ca[l] || 0); if (d < 0) out.lineasQuitadas.push(`${-d}× ${l}`); if (d > 0) out.lineasAnadidas.push(`${d}× ${l}`); }
console.log(JSON.stringify(out, null, 1));
