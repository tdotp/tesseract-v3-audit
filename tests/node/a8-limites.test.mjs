// A8 — Límites de src/export/ (docs/fase1/A8_PROPUESTA.md §4.2), verificados sobre el texto y cargando cada módulo en Node:
// inventario exacto · exportaciones exactas · THREE, document y window solo en las funciones previstas · S solo como S.scene3d en glb-scene · imports permitidos (solo glb-bytes dentro de export/) ·
// sin estado de módulo ni imports sin nombre · identificadores libres solo globales esperados (lección de KI-24) · carga en Node sin window, document ni THREE.
import test from 'node:test'; import assert from 'node:assert/strict'; import fs from 'node:fs'; import path from 'node:path'; import { pathToFileURL } from 'node:url';
import { SRC, srcFiles, codeOnly, functionsAnyIndent } from '../lib/a7.mjs'; import { freeIdentifiers, KNOWN_GLOBALS } from '../lib/a8.mjs';

// Estado esperado en ESTE paso (se actualiza en cada paso aprobado; igualdad exacta).
const INVENTORY = ['export/glb-bytes.js', 'export/glb-image.js']; // A8.2
const RULES = { // por módulo: lo que exporta y dónde se permiten THREE / document (y HTMLCanvasElement) / S.scene3d / imports
  'export/glb-bytes.js': { exports: ['padBytes', 'toUint8View', 'typedArrayFromList'], three: [], doc: [], S: false, imports: [] },
  'export/glb-image.js': { exports: ['createGlbImage'], three: [], doc: ['textureToImageBytes'], S: false, imports: [] },
  'export/glb-scene.js': { exports: ['createGlbScene'], three: ['buildExportSceneMeshes'], doc: [], S: true, imports: [] },
  'export/glb-builder.js': { exports: ['createGlbBuilder'], three: ['materialKey', 'buildGLBBlobFromCurrentView'], doc: [], S: false, imports: ['./glb-bytes.js'] } };

const files = srcFiles().filter((f) => /^export\//.test(f)); const raw = (f) => fs.readFileSync(path.join(SRC, f), 'utf8');
const countIn = (text, word) => (codeOnly(text).match(new RegExp('\\b' + word + '\\b', 'g')) || []).length;
const inFns = (f, names, word) => functionsAnyIndent(raw(f)).filter((x) => names.includes(x.name)).reduce((s, x) => s + countIn(x.text, word), 0);

test('inventario exacto de export/ en este paso', () => { assert.deepEqual(files, INVENTORY); });
test('cada módulo exporta exactamente lo previsto', () => { for (const f of files) assert.deepEqual([...raw(f).matchAll(/^export (?:function|const|let|var) (\w+)/gm)].map((m) => m[1]).sort(), [...RULES[f].exports].sort(), f); });
test('imports: ninguno hacia main.js, host/, bridge/, scene/, fold/, core/, app/ ni config/; solo los previstos; solo imports con nombre', () => {
  for (const f of files) { const imps = [...raw(f).matchAll(/^import \{([^}]*)\} from '([^']+)';$/gm)].map((m) => m[2]); assert.deepEqual(imps.sort(), [...RULES[f].imports].sort(), f);
    assert.doesNotMatch(raw(f), /^\s*import\s+(?!\{)/m, `${f}: solo imports con nombre`); for (const i of imps) assert.ok(/^\.\/glb-bytes\.js$/.test(i), `${f} importa ${i}`); }
});
test('THREE solo dentro de las funciones previstas; document y HTMLCanvasElement solo en textureToImageBytes; window en ninguno', () => {
  for (const f of files) { const r = RULES[f];
    assert.equal(countIn(raw(f), 'THREE'), inFns(f, r.three, 'THREE'), `${f}: THREE fuera de ${r.three.join(', ') || '(ninguna)'}`);
    for (const w of ['document', 'HTMLCanvasElement']) assert.equal(countIn(raw(f), w), inFns(f, r.doc, w), `${f}: ${w} fuera de ${r.doc.join(', ') || '(ninguna)'}`);
    assert.equal(countIn(raw(f), 'window'), 0, `${f}: window`); }
});
test('S: solo glb-scene.js lo usa, y únicamente como S.scene3d', () => {
  for (const f of files) { const c = codeOnly(raw(f)); const usos = c.match(/(?<![\w.$])S\b(?!\s*:)/g) || [];
    if (!RULES[f].S) { assert.equal(usos.length, 0, `${f}: S`); continue; }
    const bien = c.match(/(?<![\w.$])S\.scene3d\b/g) || []; assert.equal(usos.length, bien.length, `${f}: S solo como S.scene3d`); }
});
test('sin estado de módulo: ningún var/let de primer nivel', () => { for (const f of files) assert.deepEqual(codeOnly(raw(f)).split('\n').filter((l) => /^(var|let)\s/.test(l)), [], f); });
test('identificadores libres: solo globales esperados (un nombre mal cableado fallaría solo al ejecutar esa ruta: KI-24)', () => {
  for (const f of files) { const libres = freeIdentifiers(raw(f)).filter((n) => !KNOWN_GLOBALS.has(n)); assert.deepEqual(libres, [], `${f}: ${libres.join(', ')}`); }
});
test('la comprobación de identificadores libres detecta un nombre sin declarar y respeta lo declarado', () => {
  assert.deepEqual(freeIdentifiers('export function f(a){ var b = a + c; return g(b); }'), ['c', 'g']);
  assert.deepEqual(freeIdentifiers("import { x } from './x.js';\nexport function f(a){ var { y, z } = a, w = [1, 2]; try{ x(y, z, w); }catch(e){ return e; } return { k: 1, m: Math.max(1, 2) }; }"), ['Math']);
  assert.deepEqual(freeIdentifiers('function f(){ var min=[1,2], max=[3,4]; return max[0] + min[0]; }'), []);
});
test('todos los módulos de export/ se cargan en Node SIN window, document ni THREE', async () => {
  delete globalThis.window; delete globalThis.document; delete globalThis.THREE; for (const f of files) await assert.doesNotReject(import(pathToFileURL(path.join(SRC, f)).href), f);
});
