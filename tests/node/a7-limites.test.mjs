// A7 — Límites de src/app/, src/scene/ y src/fold/ (docs/fase1/A7_PROPUESTA.md §5.3), verificados sobre el texto y cargando cada módulo en Node:
// inventario exacto · app/ sin THREE/window/document · scene/ y fold/ no importan main.js, host/ ni bridge/fs; solo scene/artwork.js importa bridge/cep ·
// de core/ solo getPolyCentroid (geom2d) · document/window solo donde se prevé · sin estado de módulo · sin ciclos · ningún campo de S sin «S.» (regla 8).
import test from 'node:test'; import assert from 'node:assert/strict'; import fs from 'node:fs'; import path from 'node:path'; import { pathToFileURL } from 'node:url';
import { SRC, srcFiles, STATE_FIELDS, codeOnly, functionsAnyIndent } from '../lib/a7.mjs';

// Estado esperado en ESTE paso (se actualiza en cada paso aprobado; igualdad exacta).
const INVENTORY = ['app/state.js', 'fold/angles.js', 'scene/artwork.js', 'scene/labels.js', 'scene/materials.js', 'scene/panel-meshes.js', 'scene/three-utils.js', 'scene/viewport.js']; // A7.4
const S_APPLIED = true; // desde A7.1 main.js y los módulos usan S.<campo> para los 26 campos (regla 8)
const DOC_ALLOWED = { 'scene/labels.js': ['makeLabelCanvas'], 'scene/viewport.js': ['init3D'] }; // document solo dentro de estas funciones
const WIN_ALLOWED = { 'scene/viewport.js': ['init3D'] }; // window solo dentro de estas funciones
const CORE_ALLOWED = { './core/legacy/geom2d.js': ['getPolyCentroid'], '../core/legacy/geom2d.js': ['getPolyCentroid'] };

const files = srcFiles().filter((f) => /^(app|scene|fold)\//.test(f)); const raw = (f) => fs.readFileSync(path.join(SRC, f), 'utf8');
const importsOf = (f) => [...raw(f).matchAll(/^import \{([^}]*)\} from '([^']+)';$/gm)].map((m) => ({ names: m[1].split(',').map((s) => s.trim()).filter(Boolean), spec: m[2], to: path.normalize(path.join(path.dirname(f), m[2])) }));
const countIn = (text, word) => (codeOnly(text).match(new RegExp('\\b' + word + '\\b', 'g')) || []).length;

test('inventario exacto de app/, scene/ y fold/ en este paso', () => { assert.deepEqual(files, INVENTORY); });
test('app/ no usa THREE, window ni document; state.js solo exporta createAppState', () => {
  for (const f of files.filter((f) => f.startsWith('app/'))) for (const w of ['THREE', 'window', 'document']) assert.equal(countIn(raw(f), w), 0, `${f}: ${w}`);
  if (files.includes('app/state.js')) assert.deepEqual([...raw('app/state.js').matchAll(/^export (?:function|const|let|var) (\w+)/gm)].map((m) => m[1]), ['createAppState']);
});
test('scene/ y fold/: imports permitidos (sin main.js, host/, bridge/fs; bridge/cep solo en artwork; de core/ solo getPolyCentroid); ninguna fábrica importa otra', () => {
  for (const f of files) for (const i of importsOf(f)) {
    assert.ok(!/^(main\.js|host\/|bridge\/fs\.js)/.test(i.to), `${f} importa ${i.spec}`);
    if (i.to === path.join('bridge', 'cep.js')) assert.equal(f, 'scene/artwork.js', `${f} importa bridge/cep`);
    if (i.to.startsWith('core' + path.sep)) assert.deepEqual(i.names, ['getPolyCentroid'], `${f}: de core/ solo getPolyCentroid`);
    if (/^(scene|fold|app)\//.test(i.to)) { assert.equal(i.to, path.join('scene', 'three-utils.js'), `${f} importa ${i.spec}: solo se permite scene/three-utils.js (las fábricas las cablea main.js)`); }
  }
  for (const f of files) assert.doesNotMatch(raw(f), /^\s*import\s+(?!\{)/m, `${f}: solo imports con nombre`);
});
test('document y window solo dentro de las funciones previstas', () => {
  for (const f of files) { const fns = functionsAnyIndent(raw(f));
    for (const [w, allowed] of [['document', DOC_ALLOWED[f] || []], ['window', WIN_ALLOWED[f] || []]]) {
      const inAllowed = fns.filter((x) => allowed.includes(x.name)).reduce((s, x) => s + countIn(x.text, w), 0); assert.equal(countIn(raw(f), w), inAllowed, `${f}: ${w} fuera de ${allowed.join(', ') || '(ninguna)'}`);
    } }
});
test('sin estado de módulo: ningún var/let de primer nivel en app/, scene/ ni fold/', () => {
  for (const f of files) assert.deepEqual(codeOnly(raw(f)).split('\n').filter((l) => /^(var|let)\s/.test(l)), [], f);
});
test('regla 8: ningún campo de S aparece suelto (sin «S.») en main.js, scene/ ni fold/ (salvo como clave o tras un punto)', () => {
  if (!S_APPLIED) return;
  for (const f of ['main.js', ...files.filter((f) => !f.startsWith('app/'))]) { const c = codeOnly(raw(f));
    for (const name of STATE_FIELDS) { const bad = c.split('\n').filter((l) => new RegExp('(?<![\\w.$])(?<!get )' + name + '\\b(?!\\s*:)').test(l)); assert.deepEqual(bad, [], `${f}: «${name}» sin S.`); } }
});
test('todos los módulos de app/, scene/ y fold/ se cargan en Node SIN window, document ni THREE', async () => {
  delete globalThis.window; delete globalThis.document; delete globalThis.THREE; for (const f of files) await assert.doesNotReject(import(pathToFileURL(path.join(SRC, f)).href), f);
});
