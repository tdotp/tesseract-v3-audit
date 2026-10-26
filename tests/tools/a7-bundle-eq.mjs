#!/usr/bin/env node
// A7 — Equivalencia de dos bundles función a función A CUALQUIER SANGRÍA (bundle-eq.mjs solo mira el primer nivel y no entra en las fábricas de A7).
// Para cada función del bundle anterior busca la del mismo nombre en el nuevo (una sola definición) y compara el texto sin sangría y sin «S.» delante
// de los 26 campos del estado (tests/lib/a7.mjs). Lista además las funciones nuevas y las que desaparecen.
//   node tests/tools/a7-bundle-eq.mjs anterior.js nuevo.js
import fs from 'node:fs'; import { functionsAnyIndent, norm } from '../lib/a7.mjs';
const [A, B] = process.argv.slice(2).map((f) => functionsAnyIndent(fs.readFileSync(f, 'utf8').split('\n').slice(1).join('\n')));
const byName = (fns) => fns.reduce((m, f) => (m.set(f.name, [...(m.get(f.name) || []), f]), m), new Map()); const a = byName(A), b = byName(B);
const out = { funcionesAnteriores: a.size, funcionesNuevas: b.size, identicas: 0, distintas: [], duplicadas: [], soloEnAnterior: [], soloEnNuevo: [] };
for (const [n, fa] of a) { const fb = b.get(n); if (!fb) { out.soloEnAnterior.push(n); continue; } if (fa.length !== 1 || fb.length !== 1) { out.duplicadas.push(`${n} (${fa.length}→${fb.length})`); continue; }
  if (norm(fa[0].text) === norm(fb[0].text)) out.identicas++; else out.distintas.push(n); }
for (const n of b.keys()) if (!a.has(n)) out.soloEnNuevo.push(n);
console.log(JSON.stringify(out, null, 1)); if (out.distintas.length || out.duplicadas.length) process.exitCode = 1;
