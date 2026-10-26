// A6 (T5) — Límites de src/core/ (docs/fase1/A6_PROPUESTA.md §4), verificados sobre el texto y cargando cada módulo en Node:
// inventario exacto · core/ no importa nada de fuera de core/ · legacy/ no importa engine.js · sin ciclos · sin THREE/window/document/console/localStorage ·
// sin estado de módulo salvo el sink de legacy/log.js · main.js importa de core/ exactamente lo previsto (D-A6-7: getPolyCentroid es la excepción temporal).
import test from 'node:test'; import assert from 'node:assert/strict'; import fs from 'node:fs'; import path from 'node:path'; import { pathToFileURL } from 'node:url';
import { TARGETS } from '../lib/legacy.mjs';
const SRC = path.dirname(TARGETS.src); const CORE = path.join(SRC, 'core');

// Estado esperado en ESTE paso de A6 (se actualiza en cada paso aprobado; igualdad exacta, no «contiene»).
const CORE_INVENTORY = ['core/legacy/constants.js', 'core/legacy/geom2d.js', 'core/legacy/log.js', 'core/legacy/topology.js'];
const MAIN_CORE_IMPORTS = { './core/legacy/constants.js': ['TOLERANCE_MM', 'GRAPH_EPS'], './core/legacy/geom2d.js': ['distPtSeg', 'polygonSignedArea', 'polygonCentroid', 'pointInPolygonInclusive', 'faceBounds', 'getPolyCentroid', 'edgeMatch'],
  './core/legacy/log.js': ['setLogSink'], './core/legacy/topology.js': ['buildTopology'] }; // especificador → nombres importados

const files = []; if (fs.existsSync(CORE)) (function walk(d) { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) walk(p); else if (e.name.endsWith('.js')) files.push(path.relative(SRC, p)); } })(CORE); files.sort();
const raw = (f) => fs.readFileSync(path.join(SRC, f), 'utf8');
const code = (f) => raw(f).replace(/^\s*\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '').replace(/'(?:[^'\\\n]|\\.)*'|"(?:[^"\\\n]|\\.)*"/g, "''");
const importsOf = (f) => [...raw(f).matchAll(/^import \{([^}]*)\} from '([^']+)';$/gm)].map((m) => ({ names: m[1].split(',').map((s) => s.trim()).filter(Boolean), spec: m[2] }));
const resolve = (f, spec) => path.normalize(path.join(path.dirname(f), spec));

test('inventario exacto de src/core/ en este paso', () => { assert.deepEqual(files, CORE_INVENTORY); });
test('core/ solo importa módulos de core/ (rutas relativas existentes); legacy/ nunca importa engine.js', () => {
  for (const f of files) for (const { spec } of importsOf(f)) {
    const r = resolve(f, spec); assert.ok(spec.startsWith('./') || spec.startsWith('../'), `${f}: ${spec}`); assert.ok(r.startsWith('core' + path.sep), `${f} importa fuera de core/: ${spec}`); assert.ok(fs.existsSync(path.join(SRC, r)), `${f}: ${spec} no existe`);
    if (f.startsWith('core/legacy/')) assert.notEqual(r, path.join('core', 'engine.js'), `${f} importa engine.js`);
  }
  for (const f of files) assert.doesNotMatch(raw(f), /^\s*import\s+(?!\{)/m, `${f}: solo imports con nombre`);
});
test('sin ciclos de importación dentro de core/', () => {
  const g = Object.fromEntries(files.map((f) => [f, importsOf(f).map(({ spec }) => resolve(f, spec))])); const st = {};
  const dfs = (f, stack) => { if (st[f] === 2) return; assert.notEqual(st[f], 1, 'ciclo: ' + [...stack, f].join(' → ')); st[f] = 1; for (const n of g[f] || []) dfs(n, [...stack, f]); st[f] = 2; };
  for (const f of files) dfs(f, []);
});
test('core/ no menciona THREE, window, document, console ni localStorage', () => {
  for (const f of files) for (const w of ['THREE', 'window', 'document', 'console', 'localStorage']) assert.doesNotMatch(code(f), new RegExp('\\b' + w + '\\b'), `${f}: ${w}`);
});
test('sin estado de módulo: solo legacy/log.js declara variables de módulo (var/let); el resto solo export function/export const', () => {
  for (const f of files) { const top = code(f).split('\n').filter((l) => /^(var|let)\s/.test(l)); if (f === path.join('core', 'legacy', 'log.js')) assert.ok(top.length <= 1, f); else assert.deepEqual(top, [], f); }
});
test('todos los módulos de core/ se cargan en Node SIN window ni document', async () => {
  delete globalThis.window; delete globalThis.document; for (const f of files) await assert.doesNotReject(import(pathToFileURL(path.join(SRC, f)).href), f);
});
test('main.js importa de core/ exactamente lo previsto en este paso', () => {
  const got = Object.fromEntries(importsOf('main.js').filter(({ spec }) => spec.startsWith('./core/')).map(({ spec, names }) => [spec, names.slice().sort()]));
  assert.deepEqual(got, Object.fromEntries(Object.entries(MAIN_CORE_IMPORTS).map(([k, v]) => [k, v.slice().sort()])));
});
