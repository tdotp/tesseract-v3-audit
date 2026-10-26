#!/usr/bin/env node
// A6-CEP (preparado) — compara la salida de a4-paridad.mjs en el CEP real con una referencia (por defecto, la evidencia real de A5), campo a campo.
// Ignora SOLO la fecha, los tiempos medidos y el número de eventos de consola que vio DevTools en esa sesión (claves «fecha», «ms» y «eventos»;
// los errores y avisos de consola SÍ se comparan). Cualquier otra diferencia es un fallo. Solo lectura.
//   node tools/a4/a6-comparar-paridad.mjs <nuevo.json> [referencia.json]     → «PARIDAD IDÉNTICA» (salida 0) o la lista de diferencias (salida 1)
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath, pathToFileURL } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const REFERENCIA_A5 = { caja: 'docs/fase1/a5-real/paridad-caja-2026-10-24T22-02-34-826Z.json', arte: 'docs/fase1/a5-real/paridad-arte-2026-10-24T22-06-13-589Z.json' };
export const IGNORADAS = new Set(['fecha', 'ms', 'eventos']);
export function compare(a, b, p = '') {
  const out = [];
  const isObj = (v) => typeof v === 'object' && v !== null;
  if (!isObj(a) || !isObj(b)) { if (JSON.stringify(a) !== JSON.stringify(b)) out.push(`${p || '(raíz)'}: ${JSON.stringify(a)} ≠ ${JSON.stringify(b)}`); return out; }
  if (Array.isArray(a) !== Array.isArray(b)) return [`${p}: tipo distinto`];
  for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) { if (IGNORADAS.has(k)) continue; out.push(...compare(a[k], b[k], p + '.' + k)); }
  return out;
}
if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  const [nuevo, ref] = process.argv.slice(2); if (!nuevo) { console.error('uso: a6-comparar-paridad.mjs <nuevo.json> [referencia.json]'); process.exit(2); }
  const N = JSON.parse(fs.readFileSync(nuevo, 'utf8')); const refPath = ref || path.join(ROOT, REFERENCIA_A5[N.profile] || ''); const R = JSON.parse(fs.readFileSync(refPath, 'utf8'));
  const d = compare(N, R); if (!d.length) { console.log(`PARIDAD IDÉNTICA (perfil ${N.profile}) con ${path.relative(ROOT, refPath)} (ignoradas: fecha, ms, eventos)`); process.exit(0); }
  console.log(`DIFERENCIAS (${d.length}) con ${path.relative(ROOT, refPath)}:`); for (const l of d) console.log('  ' + l.slice(0, 300)); process.exit(1);
}
