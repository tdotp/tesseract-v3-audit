// A3 — compatibilidad ESTÁTICA con Chromium 99 (CEP 12): sintaxis (esbuild target chrome99), APIs JS y CSS posteriores a la 99.
// LÍMITE: análisis estático + prueba con APIs eliminadas en navegador moderno; no es Chromium 99 real (validar en CEP: A4/Nivel 1).
import test from 'node:test'; import assert from 'node:assert/strict'; import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import * as esbuild from 'esbuild';
import { ROOT } from '../lib/fixtures.mjs'; import { build, TARGET } from '../../tools/build/build.mjs'; import { JS_POST99, CSS_POST99 } from '../lib/chromium99.mjs';
const strip = (js) => js.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, ''); let out;
test('preparación: build en carpeta temporal', async () => { out = (await build({ out: path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'tess-c99-')), 'dist') })).out; assert.equal(TARGET, 'chrome99'); });
test('sintaxis: transformar bundle y fuente con target chrome99 es IDÉNTICO a transformarlos con esnext (ninguna construcción requiere conversión ⇒ todo es ≤ V8 9.9)', async () => {
  for (const f of [path.join(out, 'main.js'), ROOT + '/panel/main.js']) { const code = fs.readFileSync(f, 'utf8'); const r99 = await esbuild.transform(code, { target: 'chrome99', logLevel: 'silent' }); const rNext = await esbuild.transform(code, { target: 'esnext', logLevel: 'silent' });
    assert.deepEqual(r99.warnings, [], f); assert.equal(r99.code, rNext.code, f + ': hay sintaxis posterior a Chromium 99 que esbuild tendría que convertir'); }
});
test('control del chequeo: una sintaxis posterior a la 99 SÍ se convierte con chrome99 (y no con esnext)', async () => {
  const src = '{ using z = x; } let s = a?.b; label: { }';
  const r99 = await esbuild.transform(src, { target: 'chrome99', logLevel: 'silent' }), rNext = await esbuild.transform(src, { target: 'esnext', logLevel: 'silent' });
  assert.match(r99.code, /__using/); assert.doesNotMatch(rNext.code, /__using/); assert.notEqual(r99.code, rNext.code);
  const lowered = await esbuild.transform('let s = a?.b ?? c;', { target: 'chrome60', logLevel: 'silent' }); assert.doesNotMatch(lowered.code, /\?\?|\?\./);
});
test('APIs JS posteriores a Chromium 99: ninguna aparece en el bundle, en la fuente ni en los scripts de index.html', () => {
  const html = fs.readFileSync(path.join(out, 'index.html'), 'utf8'); const inline = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1]).join('\n');
  for (const [name, code] of [['dist/main.js', fs.readFileSync(path.join(out, 'main.js'), 'utf8')], ['panel/main.js', fs.readFileSync(ROOT + '/panel/main.js', 'utf8')], ['index.html (inline)', inline]]) {
    const c = strip(code).replace(/"(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*'/g, '""'); const hits = JS_POST99.filter(([tok]) => c.includes(tok)); assert.deepEqual(hits.map((h) => h[1]), [], name);
  }
});
test('bibliotecas: three.min.js (r132) y OrbitControls.js no usan APIs JS posteriores a la 99', () => {
  for (const f of ['libs/three.min.js', 'libs/OrbitControls.js']) { const c = strip(fs.readFileSync(path.join(out, f), 'utf8')); const hits = JS_POST99.filter(([tok]) => c.includes(tok) && tok !== '.union(' /* Box3.union de three.js, no Set.union */); assert.deepEqual(hits.map((h) => h[1]), [], f); }
});
test('CSS y HTML: sin funciones CSS posteriores a la 99 (:has, container queries, color-mix, dvh, nesting, oklch…)', () => {
  const html = fs.readFileSync(path.join(out, 'index.html'), 'utf8'); const css = fs.readFileSync(path.join(out, 'style.css'), 'utf8') + [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map((m) => m[1]).join('\n') + [...html.matchAll(/style="([^"]*)"/g)].map((m) => m[1]).join('\n');
  const hits = CSS_POST99.filter(([re]) => re.test(css)); assert.deepEqual(hits.map((h) => h[1]), []);
});
test('el bundle usa solo APIs web que existen desde mucho antes de la 99 (inventario informativo)', () => {
  const js = strip(fs.readFileSync(path.join(out, 'main.js'), 'utf8')); const used = ['requestAnimationFrame', 'WebGLRenderer', 'CanvasTexture', 'TextureLoader', 'FileReader', 'TextEncoder', 'Blob', 'URL.createObjectURL', 'PointerEvent', 'addEventListener'].filter((k) => js.includes(k));
  assert.ok(used.length >= 6, used.join(',')); fs.writeFileSync(ROOT + '/tests/results/inventario-apis-bundle.json', JSON.stringify({ usadas: used }, null, 1)) ;
});
