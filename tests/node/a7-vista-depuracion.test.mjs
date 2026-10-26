// A7.1 — Vista de depuración __tessDebugView (D-A7-4 con la restricción del usuario: SOLO lectura, solo para pruebas, sin uso en producción).
// Su objeto es el DBG heredado del arnés SIN upd ni fold (las dos funciones de escritura) y con «S.» delante de los campos; solo getters `return <campo>`;
// src/ nunca la llama ni la publica en window; el bundle la conserva con su nombre (el arnés la busca por nombre).
import test from 'node:test'; import assert from 'node:assert/strict'; import fs from 'node:fs'; import path from 'node:path';
import { ROOT } from '../lib/fixtures.mjs'; import { SRC, srcFiles, functionsAnyIndent, stripS, legacyDbg, codeOnly } from '../lib/a7.mjs'; import { ensureDist } from '../lib/dist.mjs';

const main = fs.readFileSync(path.join(SRC, 'main.js'), 'utf8'); const fn = functionsAnyIndent(main).find((f) => f.name === '__tessDebugView');
const obj = fn && /return (\{.*\});/.exec(fn.text)?.[1];
test('existe una sola __tessDebugView, en la clausura de main.js', () => { assert.ok(fn); assert.equal(fn.indent, 4); assert.equal(srcFiles().flatMap((f) => functionsAnyIndent(fs.readFileSync(path.join(SRC, f), 'utf8'))).filter((f) => f.name === '__tessDebugView').length, 1); });
test('= DBG heredado sin upd ni fold, con S. delante de los campos (18 getters, mismos nombres y mismo orden)', () => {
  const legacy = legacyDbg().replace('upd:function(){updateCameraFromOrbit()},', '').replace('fold:function(i,a){foldAngles[i]=a;applyFolding();},', '');
  assert.equal(stripS(obj), legacy); assert.equal((obj.match(/get \w+\(\)\{return S\.\w+(?:\.length)?\}/g) || []).length, 18);
});
test('solo lectura: ninguna asignación, llamada ni función dentro del objeto', () => {
  assert.doesNotMatch(obj, /=|function|\w\(\w/); assert.doesNotMatch(obj, /set \w+\(/); assert.doesNotMatch(obj, /\b(upd|fold)\s*:/);
});
test('src/ nunca llama a __tessDebugView ni la publica en window', () => {
  for (const f of srcFiles()) { const c = codeOnly(fs.readFileSync(path.join(SRC, f), 'utf8')); const n = (c.match(/__tessDebugView/g) || []).length; assert.equal(n, f === 'main.js' ? 1 : 0, f); assert.doesNotMatch(c, /window\.__dbg|window\.__tessDebugView/, f); }
});
test('el bundle conserva el nombre __tessDebugView (esbuild no la renombra) y sigue sin llamarla', async () => {
  await ensureDist(); const js = fs.readFileSync(path.join(ROOT, 'dist/main.js'), 'utf8');
  assert.equal((js.match(/function __tessDebugView\(/g) || []).length, 1); assert.equal((js.match(/__tessDebugView/g) || []).length, 1);
});
