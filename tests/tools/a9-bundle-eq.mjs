#!/usr/bin/env node
// A9.3 — Equivalencia de dos bundles función a función (como a7-bundle-eq: a cualquier sangría y sin «S.») que además distingue los RENOMBRADOS DE ESBUILD.
// Al mover una función a una fábrica, esbuild puede dejar de renombrar (o empezar a renombrar) un identificador local que ocultaba otro del ámbito exterior
// (A9.3: el `var debugDetails` local de buildFoldUI se imprimía `debugDetails2` dentro de la clausura de main.js y `debugDetails` dentro de createFoldControls).
// Una función «distinta» solo se acepta si TODAS sus diferencias son sustituciones de un identificador `x` por `xN` (o al revés, N = dígitos), con una
// correspondencia biyectiva y consistente en toda la función. Se listan en «renombradosEsbuild»; cualquier otra diferencia sigue en «distintas» (sale con 1).
//   node tests/tools/a9-bundle-eq.mjs anterior.js nuevo.js
import fs from 'node:fs'; import { functionsAnyIndent, norm } from '../lib/a7.mjs';
const [A, B] = process.argv.slice(2).map((f) => functionsAnyIndent(fs.readFileSync(f, 'utf8').split('\n').slice(1).join('\n')));
const byName = (fns) => fns.reduce((m, f) => (m.set(f.name, [...(m.get(f.name) || []), f]), m), new Map()); const a = byName(A), b = byName(B);
const tok = (t) => norm(t).match(/[A-Za-z_$][\w$]*|\d+(?:\.\d+)?|"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|\S/g) || [];
function renameOnly(ta, tb) { // devuelve la lista de pares si la única diferencia son renombrados x ↔ xN biyectivos; si no, null
  const x = tok(ta), y = tok(tb); if (x.length !== y.length) return null; const fwd = new Map(), bwd = new Map();
  for (let i = 0; i < x.length; i++) { if (x[i] === y[i]) { if (fwd.has(x[i]) || bwd.has(y[i])) return null; continue; }
    const ok = /^[A-Za-z_$][\w$]*$/.test(x[i]) && /^[A-Za-z_$][\w$]*$/.test(y[i]) && (y[i].replace(/\d+$/, '') === x[i] || x[i].replace(/\d+$/, '') === y[i]); if (!ok) return null;
    if ((fwd.has(x[i]) && fwd.get(x[i]) !== y[i]) || (bwd.has(y[i]) && bwd.get(y[i]) !== x[i])) return null; fwd.set(x[i], y[i]); bwd.set(y[i], x[i]); }
  // un nombre renombrado no puede aparecer también sin renombrar (la correspondencia debe ser total dentro de la función)
  for (const [k, v] of fwd) if (x.some((t, i) => t === k && y[i] === k) || y.some((t, i) => t === v && x[i] === v)) return null;
  return [...fwd].map(([de, a2]) => ({ de, a: a2 })); }
const out = { funcionesAnteriores: a.size, funcionesNuevas: b.size, identicas: 0, renombradosEsbuild: [], distintas: [], duplicadas: [], soloEnAnterior: [], soloEnNuevo: [] };
for (const [n, fa] of a) { const fb = b.get(n); if (!fb) { out.soloEnAnterior.push(n); continue; } if (fa.length !== 1 || fb.length !== 1) { out.duplicadas.push(`${n} (${fa.length}→${fb.length})`); continue; }
  if (norm(fa[0].text) === norm(fb[0].text)) { out.identicas++; continue; } const r = renameOnly(fa[0].text, fb[0].text); if (r) out.renombradosEsbuild.push({ funcion: n, renombrados: r }); else out.distintas.push(n); }
for (const n of b.keys()) if (!a.has(n)) out.soloEnNuevo.push(n);
console.log(JSON.stringify(out, null, 1)); if (out.distintas.length || out.duplicadas.length || out.soloEnAnterior.length) process.exitCode = 1;
