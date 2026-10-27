#!/usr/bin/env node
// A9.5 — Los 15 manejadores en el BUNDLE: el bloque de registros de la referencia (dentro de la clausura de DOMContentLoaded, desde testBtn.addEventListener hasta el de
// debug-toggle) frente al cuerpo de bindEvents del bundle actual, línea a línea sin sangría. Informa de cualquier diferencia (incluidos renombrados de esbuild).
//   node tests/tools/a9-manejadores-bundle.mjs anterior.js nuevo.js      (sale con 1 si difieren)
import fs from 'node:fs'; import { functionsAnyIndent } from '../lib/a7.mjs';
const [A, B] = process.argv.slice(2).map((f) => fs.readFileSync(f, 'utf8'));
const region = (t) => { const L = t.split('\n'); const i = L.findIndex((l) => /^\s*testBtn\.addEventListener\("click", function\(\) \{$/.test(l)); let j = L.findIndex((l, k) => k > i && /^\s*debugToggle\.addEventListener\("change", function\(\) \{$/.test(l));
  while (!/^\s*\}\);$/.test(L[j])) j++; return L.slice(i, j + 1).map((l) => l.trim()).filter(Boolean); };
const ref = region(A); const be = functionsAnyIndent(B).filter((f) => f.name === 'bindEvents'); if (be.length !== 1) { console.log('bindEvents: ' + be.length + ' definiciones'); process.exit(1); }
const act = be[0].text.split('\n').slice(1, -1).map((l) => l.trim()).filter(Boolean);
const dif = []; for (let i = 0; i < Math.max(ref.length, act.length); i++) if (ref[i] !== act[i]) dif.push({ linea: i, referencia: ref[i], actual: act[i] });
console.log(JSON.stringify({ lineasReferencia: ref.length, lineasBindEvents: act.length, identicas: dif.length === 0, diferencias: dif.slice(0, 20) }, null, 1)); if (dif.length) process.exitCode = 1;
