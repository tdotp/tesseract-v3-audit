// A8.0a — Los tres GLB validados en Illustrator real son la referencia binaria de N1/N3: no pueden cambiar sin que se note.
// También fija el golden de estructura (solo desde el baseline) y que las cuatro versiones validadas en CEP real (A4–A7) produjeron los mismos bytes.
import test from 'node:test'; import assert from 'node:assert/strict'; import fs from 'node:fs'; import path from 'node:path';
import { ROOT } from '../lib/fixtures.mjs'; import { REAL_SHA, REAL_GLB, readReal, sha256, alignmentOf, N0B_RECT } from '../lib/a8.mjs'; import { parseGLB } from '../lib/glb.mjs';

test('los tres GLB reales de a7-real tienen los hashes validados (33 436 / 54 224 / 295 440 bytes)', () => {
  for (const [k, sha] of Object.entries(REAL_SHA)) assert.equal(sha256(readReal(k)), sha, k);
  assert.deepEqual(['plano', 'todas60', 'arte'].map((k) => readReal(k).length), [33436, 54224, 295440]);
});
test('A4, A5, A6 y A7 en CEP real produjeron exactamente los mismos bytes', () => {
  const dirs = { 'a4-real': { 'pose1.glb': 'plano', 'pose2.glb': 'todas60', 'arte.glb': 'arte' }, 'a5-real': { 'paridad-caja-plano.glb': 'plano', 'paridad-caja-todas60.glb': 'todas60', 'paridad-arte.glb': 'arte' },
    'a6-real': { 'paridad-caja-plano.glb': 'plano', 'paridad-caja-todas60.glb': 'todas60', 'paridad-arte.glb': 'arte' } };
  for (const [d, files] of Object.entries(dirs)) for (const [f, k] of Object.entries(files)) assert.equal(sha256(fs.readFileSync(path.join(ROOT, 'docs/fase1', d, 'glb', f))), REAL_SHA[k], `${d}/${f}`);
});
test('los GLB reales tienen alineación y relleno correctos y el orden de claves esperado (con arte: images, textures, samplers)', () => {
  for (const k of Object.keys(REAL_GLB)) { const a = alignmentOf(readReal(k)); assert.deepEqual({ ...a, util: 0 }, { vistasAlineadas: true, huecosOk: true, colaBinOk: true, chunksMultiplo4: true, relleno20: true, jsonTermina: true, longitudCabecera: true, util: 0 }, k); }
  assert.equal(Object.keys(parseGLB(readReal('plano')).json).join(), 'asset,scene,scenes,nodes,meshes,materials,accessors,bufferViews,buffers');
  assert.equal(Object.keys(parseGLB(readReal('arte')).json).join(), 'asset,scene,scenes,nodes,meshes,materials,accessors,bufferViews,buffers,images,textures,samplers');
});
test('el rectángulo del artboard de N0-B que usa N3 es el medido en Illustrator real', () => {
  const art = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/fase1/nivel0-real/N0-B_caja_simple_arte.svg__art.json'), 'utf8'))._resultado; assert.deepEqual(art.front.rect, N0B_RECT); assert.deepEqual(art.back.rect, N0B_RECT);
});
test('la extracción real de N0-B es el fixture ill-real-caja-simple (la que usa N3)', () => {
  const a = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/fase1/a7-real/extraccion-panel-arte.json'), 'utf8')), b = JSON.parse(fs.readFileSync(path.join(ROOT, 'tests/fixtures/illustrator-real/ill-real-caja-simple.dieline.json'), 'utf8')); assert.deepEqual(a, b);
});
test('el golden de estructura del GLB está fijado por a8.pins.json', () => {
  const pins = JSON.parse(fs.readFileSync(path.join(ROOT, 'tests/golden/a8.pins.json'), 'utf8')); for (const [f, h] of Object.entries(pins.archivos)) assert.equal(sha256(fs.readFileSync(path.join(ROOT, f))), h, f);
});
