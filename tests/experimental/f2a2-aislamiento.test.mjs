// F2A-2 — Aislamiento del adaptador y del árbol experimentales y compatibilidad con Chromium 99 (CEP 12): fuera de src/ y del bundle de
// producción; sin DOM, CEP, Illustrator, THREE ni estado global; empaquetable con esbuild --target=chrome99; mismo resultado en Node, en un
// contexto vm aislado y en Chrome headless con las APIs posteriores a la 99 eliminadas (piso optimista: no es Chromium 99 auténtico ni CEP).
import { test, after } from 'node:test'; import assert from 'node:assert/strict'; import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import vm from 'node:vm';
import * as esbuild from 'esbuild';
import { ROOT, gridDieline } from '../lib/fixtures.mjs';
import { JS_POST99 } from '../lib/chromium99.mjs';
import { serveDir, launchChrome } from '../browser/cdp.mjs';
import { FIXTURES_F2 } from '../lib/f2/fixtures-f2.mjs';
import * as E from '../../experimental/plegado/index.js';

const DIR = path.join(ROOT, 'experimental/plegado'); const mods = fs.readdirSync(DIR).filter((f) => f.endsWith('.js'));
const leer = (f) => fs.readFileSync(path.join(DIR, f), 'utf8').replace(/\/\/.*$/gm, '');
const srcFiles = []; (function walk(d) { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) walk(p); else if (/\.(js|mjs|json)$/.test(e.name)) srcFiles.push(p); } })(path.join(ROOT, 'src'));

test('src/ y las herramientas de build e instalación no mencionan experimental/ (producción no importa ningún módulo experimental)', () => {
  for (const f of [...srcFiles, path.join(ROOT, 'tools/build/build.mjs'), path.join(ROOT, 'tools/install.sh')]) assert.doesNotMatch(fs.readFileSync(f, 'utf8'), /experimental|adaptarPanelModel|construirArbolPlegado/, path.relative(ROOT, f));
});
test('el bundle de producción (dist/main.js, si existe) no contiene el adaptador ni el árbol', () => { const f = path.join(ROOT, 'dist/main.js'); if (!fs.existsSync(f)) return; const t = fs.readFileSync(f, 'utf8'); for (const marca of ['experimental-f2a2', 'adaptarPanelModel', 'construirArbolPlegado', 'construirAdyacencias', 'ErrorPanelModel']) assert.ok(!t.includes(marca), marca); });
test('solo importa módulos propios (./x.js) o del núcleo (../geometria/x.js); sin THREE, window, document, console, localStorage, require, process, globalThis, CEP ni Illustrator', () => {
  for (const f of mods) { const t = leer(f);
    for (const m of t.matchAll(/^(?:import|export)[^'"]*from '([^']+)'/gm)) assert.ok(/^\.\/[\w-]+\.js$|^\.\.\/geometria\/[\w-]+\.js$/.test(m[1]), `${f}: ${m[1]}`);
    assert.doesNotMatch(t, /\b(THREE|window|document|console|localStorage|sessionStorage|require|process|globalThis|BigInt|__adobe_cep__|csInterface|app\.activeDocument)\b/, f); }
});
test('sin estado de módulo mutable (ni let/var de módulo) y sin APIs posteriores a Chromium 99 en el código fuente', () => {
  for (const f of mods) { const t = leer(f); assert.equal([...t.matchAll(/^(?:export )?(?:let|var) /gm)].length, 0, f); for (const [tok, desc] of JS_POST99) assert.ok(!t.includes(tok), `${f}: ${desc}`); }
});

const CASOS = { 'caja-botanica-real': [JSON.parse(fs.readFileSync(path.join(ROOT, 'tests/fixtures/real/caja-botanica-real.dieline.json'), 'utf8')), null], 'ill-real-caja-botanica ε 0.05': [JSON.parse(fs.readFileSync(path.join(ROOT, 'tests/fixtures/illustrator-real/ill-real-caja-botanica.dieline.json'), 'utf8')), 0.05], 'hueco-descentrado': [FIXTURES_F2['hueco-descentrado'].build(), null], 'rejilla 4×4': [gridDieline(4), null], 't-ruido': [FIXTURES_F2['t-ruido'].build(), 0.05] };
const CADENA = `(d, eps) => { const m = M.adaptarPanelModel(d, { eps }); const A = M.construirAdyacencias(m); const T = M.construirArbolPlegado(m, A, M.baseDefecto(m)); return JSON.stringify({ panels: m.panels, creaseEdges: m.creaseEdges, f2a2: m.f2a2, A, T }); }`;
const enNode = (d, eps) => { const M = E; return (0, eval)('(M) => ' + CADENA)(M)(d, eps); }; // misma cadena de texto que en vm y en Chrome
let bundle = null;
async function empaquetar() { if (bundle) return bundle; const r = await esbuild.build({ entryPoints: [path.join(DIR, 'index.js')], bundle: true, write: false, format: 'iife', globalName: 'TessPlegado', target: 'chrome99', logLevel: 'silent' }); assert.equal(r.errors.length, 0); assert.equal(r.warnings.length, 0, 'sin avisos de esbuild para chrome99'); bundle = r.outputFiles[0].text; return bundle; }

test('esbuild --target=chrome99 (IIFE): sin errores ni avisos, sin APIs posteriores a la 99, y en un contexto vm aislado = Node en 5 casos', async () => {
  const b = await empaquetar(); for (const [tok, desc] of JS_POST99) assert.ok(!b.includes(tok), desc);
  const ctx = vm.createContext({ Math, JSON, Object, Array, Number, String, Map, Set, WeakMap, Error, TypeError, Symbol, Infinity, NaN, isFinite }); vm.runInContext(b, ctx); vm.runInContext('var M = TessPlegado; var cadena = ' + CADENA, ctx);
  for (const [n, [d, eps]] of Object.entries(CASOS)) assert.equal(vm.runInContext(`cadena(${JSON.stringify(d)}, ${eps})`, ctx), enNode(d, eps), n);
});

const REDUCIR = `(() => { const del = (o, k) => { try { delete o[k]; } catch (e) {} }; const TA = Object.getPrototypeOf(Uint8Array.prototype);
  for (const k of ['toSorted', 'toReversed', 'toSpliced', 'with', 'group', 'groupBy']) { del(Array.prototype, k); del(TA, k); }
  del(Object, 'groupBy'); del(Map, 'groupBy'); del(Promise, 'withResolvers'); del(Promise, 'try'); del(Array, 'fromAsync'); del(String.prototype, 'isWellFormed'); del(String.prototype, 'toWellFormed');
  for (const k of ['union', 'intersection', 'difference', 'symmetricDifference', 'isSubsetOf', 'isSupersetOf', 'isDisjointFrom']) del(Set.prototype, k);
  del(globalThis, 'Iterator'); del(JSON, 'rawJSON'); del(globalThis, 'Float16Array'); window.__bajas = { toSorted: 'toSorted' in Array.prototype, union: 'union' in Set.prototype, iter: typeof Iterator }; })()`;
let chrome = null, server = null, tmp = null;
after(async () => { await chrome?.close(); await server?.close(); if (tmp) fs.rmSync(tmp, { recursive: true, force: true }); });
test('Chrome headless con las APIs posteriores a Chromium 99 eliminadas: el bundle chrome99 da exactamente lo mismo que Node (5 casos), sin errores', async () => {
  const b = await empaquetar(); tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'tess-f2a2-')); fs.writeFileSync(path.join(tmp, 'plegado.js'), b);
  fs.writeFileSync(path.join(tmp, 'index.html'), '<!doctype html><meta charset="utf-8"><script src="plegado.js"></script><script>window.M = TessPlegado; window.cadena = ' + CADENA + ';</script>');
  server = await serveDir(tmp); chrome = await launchChrome(); await chrome.addInitScript(REDUCIR); await chrome.goto(server.url + '/index.html');
  assert.deepEqual(await chrome.eval('window.__bajas'), { toSorted: false, union: false, iter: 'undefined' }, 'APIs posteriores eliminadas');
  assert.equal(await chrome.eval('typeof window.M.adaptarPanelModel'), 'function');
  for (const [n, [d, eps]] of Object.entries(CASOS)) assert.equal(await chrome.eval(`cadena(${JSON.stringify(d)}, ${eps})`), enNode(d, eps), n);
  assert.equal(await chrome.eval(`(() => { try { M.adaptarPanelModel({ outerBoundary: null }); return 'sin error'; } catch (e) { return e.name + ':' + e.codigo; } })()`), 'ErrorPanelModel:entrada-invalida', 'errores explícitos también en el navegador');
  assert.deepEqual(chrome.errors, [], 'sin excepciones de página');
});
