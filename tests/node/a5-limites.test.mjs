// A5.5 — Límites de los módulos extraídos en A5 (reglas de docs/fase1/A5_PROPUESTA.md §3), verificados sobre el texto de src/ y cargando cada módulo en Node:
// config y host no importan nada · bridge/cep solo toca window.__adobe_cep__ · bridge/fs solo importa host/save-dialog y toca el DOM únicamente para la descarga ·
// ningún módulo salvo main.js usa THREE · ninguno lee window/document al cargarse · main.js solo importa config/, host/ y bridge/.
import test from 'node:test'; import assert from 'node:assert/strict'; import fs from 'node:fs'; import path from 'node:path'; import { pathToFileURL } from 'node:url';
import { TARGETS } from '../lib/legacy.mjs';
const SRC = path.dirname(TARGETS.src);
const files = []; (function walk(d) { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) walk(p); else if (e.name.endsWith('.js')) files.push(path.relative(SRC, p)); } })(SRC); files.sort();
const code = (f) => fs.readFileSync(path.join(SRC, f), 'utf8').replace(/^\s*\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '').replace(/'(?:[^'\\\n]|\\.)*'|"(?:[^"\\\n]|\\.)*"/g, "''");
const imports = (f) => [...fs.readFileSync(path.join(SRC, f), 'utf8').matchAll(/^import .* from '([^']+)';$/gm)].map((m) => m[1]);
const fnBody = (f, name) => { const s = fs.readFileSync(path.join(SRC, f), 'utf8'); const i = s.indexOf('function ' + name + '('); return s.slice(i, s.indexOf('\n}\n', i)); };

test('inventario de src/ al cierre de A5 (los módulos aprobados y nada más)', () => {
  assert.deepEqual(files.filter((f) => !/^(core|app|scene|fold|export|ui)\//.test(f)), ['bridge/cep.js', 'bridge/fs.js', 'config/look.js', 'host/art.js', 'host/extract.js', 'host/save-dialog.js', 'host/test-connection.js', 'main.js']); // core/ (A6): inventario exacto en a6-limites · app/, scene/, fold/ (A7): en a7-limites · ui/ (A9): en a9-limites
});
test('main.js solo importa config/, host/ y bridge/; ningún módulo se importa a sí mismo ni hay ciclos', () => {
  assert.deepEqual(imports('main.js').filter((i) => !/^\.\/(core|app|scene|fold|export|ui)\//.test(i)).sort(), ['./bridge/cep.js', './config/look.js']); // A9.5: host/extract.js y host/test-connection.js pasan a ui/controller.js · A9.2: host/art.js y bridge/fs.js pasan a app/actions.js
  for (const f of files.filter((f) => f !== 'main.js')) for (const i of imports(f)) assert.notEqual(path.join(path.dirname(f), i), 'main.js', f);
});
test('config/ y host/ no importan nada; bridge/cep no importa nada; bridge/fs solo importa host/save-dialog', () => {
  for (const f of files.filter((f) => /^(config|host)\//.test(f)).concat('bridge/cep.js')) assert.deepEqual(imports(f), [], f);
  assert.deepEqual(imports('bridge/fs.js'), ['../host/save-dialog.js']);
});
test('THREE solo en main.js; document solo en main.js y en triggerDownload (bridge/fs); window.cep solo en saveBlobWithDialog', () => {
  for (const f of files.filter((f) => f !== 'main.js' && f !== 'app/actions.js' && f !== 'ui/fold-controls.js' && f !== 'ui/controller.js' && !/^(scene|fold|export)\//.test(f))) { // A9.2: app/actions.js (document solo en exportPNG) A9.3: ui/fold-controls.js (document solo en buildFoldUI) y A9.5: ui/controller.js (document solo en validateGeometry y bindEvents) los rige a9-limites · A7: THREE, document y window en scene/ y fold/ los regula a7-limites; A8: en export/, a8-limites
    assert.doesNotMatch(code(f), /\bTHREE\b/, f);
    const doc = code(f).match(/\bdocument\b/g) || []; if (f === 'bridge/fs.js') assert.equal(doc.length, (fnBody(f, 'triggerDownload').match(/\bdocument\b/g) || []).length, 'document fuera de triggerDownload'); else assert.equal(doc.length, 0, f);
    if (/^(config|host)\//.test(f)) assert.doesNotMatch(code(f), /\bwindow\b/, f);
  }
  assert.doesNotMatch(code('bridge/cep.js'), /window\.(?!__adobe_cep__)/, 'bridge/cep solo usa window.__adobe_cep__');
  assert.equal((code('bridge/fs.js').match(/window\.cep\b/g) || []).length, (fnBody('bridge/fs.js', 'saveBlobWithDialog').match(/window\.cep\b/g) || []).length);
});
test('todos los módulos (salvo main.js) se cargan en Node SIN window ni document: no hay lecturas al cargar', async () => {
  delete globalThis.window; delete globalThis.document;
  for (const f of files.filter((f) => f !== 'main.js')) await assert.doesNotReject(import(pathToFileURL(path.join(SRC, f)).href), f);
});
