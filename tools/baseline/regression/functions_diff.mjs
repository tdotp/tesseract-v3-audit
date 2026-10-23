// Compara, función por función, dos versiones de main.js (por defecto baseline vs panel/): qué funciones cambiaron, se añadieron o se quitaron.
// Segmenta por declaraciones `    function nombre(` (4 espacios, nivel del cierre DOMContentLoaded). Uso: node functions_diff.mjs [a.js] [b.js]
import fs from 'node:fs'; import crypto from 'node:crypto'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const [a, b] = [process.argv[2] || root + '/reference/legacy-baseline/main.js', process.argv[3] || root + '/panel/main.js'];
function seg(file) { const L = fs.readFileSync(file, 'utf8').split('\n'); const m = new Map(); let name = '(preámbulo)', buf = [];
  const flush = () => { m.set(name, crypto.createHash('sha256').update(buf.filter((x) => x.trim() !== '').join('\n')).digest('hex').slice(0, 12)); buf = []; };
  for (const l of L) { const x = /^    (?:async )?function (\w+)\(/.exec(l);
    if (x) { // lo que sigue al último cierre de función "    }" (comentarios, var) pertenece a la función que empieza
      let k = buf.length; while (k > 0 && !/^    \}\s*$/.test(buf[k - 1])) k--;
      const carry = k > 0 ? buf.splice(k) : []; flush(); name = x[1]; buf = carry; }
    buf.push(l); } flush(); return m; }
const A = seg(a), B = seg(b); const changed = [], added = [], removed = []; let same = 0;
for (const [k, h] of B) { if (!A.has(k)) added.push(k); else if (A.get(k) !== h) changed.push(k); else same++; }
for (const k of A.keys()) if (!B.has(k)) removed.push(k);
console.log(JSON.stringify({ funciones_identicas: same, modificadas: changed, anadidas: added, eliminadas: removed }, null, 1));
