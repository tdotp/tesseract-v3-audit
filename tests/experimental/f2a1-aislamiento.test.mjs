// F2A-1 — Aislamiento del núcleo experimental y compatibilidad con Chromium 99 (CEP 12): fuera de src/, fuera del bundle de producción,
// sin DOM/THREE/estado global, sin dependencias externas, y empaquetable con esbuild --target=chrome99 con el mismo resultado.
import { test } from 'node:test'; import assert from 'node:assert/strict'; import fs from 'node:fs'; import path from 'node:path'; import vm from 'node:vm';
import { ROOT } from '../lib/fixtures.mjs';
import * as esbuild from 'esbuild';

const EXP = path.join(ROOT, 'experimental/geometria');
const mods = fs.readdirSync(EXP).filter((f) => f.endsWith('.js'));
const srcFiles = []; (function walk(d) { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) walk(p); else if (/\.(js|mjs|json)$/.test(e.name)) srcFiles.push(p); } })(path.join(ROOT, 'src'));

test('src/ no menciona ni importa experimental/ (el producto no conoce el núcleo)', () => { for (const f of srcFiles) assert.doesNotMatch(fs.readFileSync(f, 'utf8'), /experimental/, path.relative(ROOT, f)); });
test('el bundle de producción (dist/main.js, si existe) no contiene el núcleo', () => { const f = path.join(ROOT, 'dist/main.js'); if (!fs.existsSync(f)) return; const t = fs.readFileSync(f, 'utf8'); for (const marca of ['experimental-f2a1', 'construirArreglo', 'fraccionesCruce', 'ajustarExtremos']) assert.ok(!t.includes(marca), marca); });
test('el núcleo solo importa módulos relativos propios; sin THREE, window, document, console, localStorage, require, process ni BigInt', () => {
  for (const f of mods) { const t = fs.readFileSync(path.join(EXP, f), 'utf8').replace(/\/\/.*$/gm, '');
    for (const m of t.matchAll(/^(?:import|export)[^'"]*from '([^']+)'/gm)) assert.ok(/^\.\/[\w-]+\.js$/.test(m[1]), `${f}: ${m[1]}`);
    assert.doesNotMatch(t, /\b(THREE|window|document|console|localStorage|require|process|BigInt)\b/, f); }
});
test('estado de módulo: solo el objeto de contadores de predicados.js (diagnóstico de rendimiento)', () => {
  for (const f of mods) { const t = fs.readFileSync(path.join(EXP, f), 'utf8'); const tops = [...t.matchAll(/^(?:export )?(?:let|var) /gm)]; assert.equal(tops.length, 0, f + ': let/var de módulo'); }
  assert.match(fs.readFileSync(path.join(EXP, 'predicados.js'), 'utf8'), /^export const contadores = \{/m);
});
test('esbuild --target=chrome99 (IIFE) empaqueta el núcleo sin avisos y el resultado ejecutado en un contexto aislado da los 13 paneles', async () => {
  const r = await esbuild.build({ entryPoints: [path.join(EXP, 'index.js')], bundle: true, write: false, format: 'iife', globalName: 'TessNucleo', target: 'chrome99', logLevel: 'silent' });
  assert.equal(r.errors.length, 0); assert.equal(r.warnings.length, 0);
  const ctx = vm.createContext({ Math, JSON, Object, Array, Number, String, Map, Set, Float64Array, Infinity }); vm.runInContext(r.outputFiles[0].text, ctx);
  const d = JSON.parse(fs.readFileSync(path.join(ROOT, 'tests/fixtures/real/caja-botanica-real.dieline.json'), 'utf8'));
  const R = vm.runInContext('TessNucleo.nucleo(' + JSON.stringify(d) + ')', ctx); assert.equal(R.paneles.length, 13); assert.equal(R.adyacencias.length, 12);
});
