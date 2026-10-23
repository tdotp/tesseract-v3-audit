// El inspector de GLB y el kit de calibración de unidades: demuestra que la herramienta distingue metros de milímetros,
// aplica la escala de nodo y reproduce KI-02 (normales de longitud 0) sobre el GLB real de evidencia cuando está disponible.
import test from 'node:test'; import assert from 'node:assert/strict'; import fs from 'node:fs';
import { summarizeFile, parseGLB } from '../lib/glb.mjs'; import { ROOT } from '../lib/fixtures.mjs';
const kit = ROOT + '/tools/baseline/glb_units_test/'; const evidence = ROOT + '/../TESSERACT_MEJORA/evidencia/glb/Tesseract_Test_Claude_export_plugin.glb';

test('kit de calibración: METROS = 0.2 m de lado largo, MILIMETROS = 200 unidades, nodo con escala 0.001 = 0.2 en mundo', () => {
  assert.deepEqual(summarizeFile(kit + 'axes_METROS.glb').bbox.size.map((v) => +v.toFixed(3)), [0.105, 0.155, 0.205]);
  assert.deepEqual(summarizeFile(kit + 'axes_MILIMETROS.glb').bbox.size, [105, 155, 205]);
  assert.deepEqual(summarizeFile(kit + 'axes_MILIMETROS_nodo_escala.glb').bbox.size.map((v) => +v.toFixed(3)), [0.105, 0.155, 0.205]);
});
test('kit de calibración: GLB válidos (sin normales inválidas, sin extensiones)', () => {
  for (const f of ['axes_METROS', 'axes_MILIMETROS', 'axes_MILIMETROS_nodo_escala']) { const s = summarizeFile(kit + f + '.glb'); assert.equal(s.normals.zeroLength + s.normals.nonUnit, 0); assert.deepEqual(s.extensionsUsed, []); assert.equal(s.nodes >= 4, true); }
});
test('el inspector rechaza archivos que no son GLB', () => { assert.throws(() => parseGLB(Buffer.from('hola mundo, esto no es un glb'))); });
test('KI-02 en el GLB real de evidencia: 93 nodos, 4 materiales, 2 imágenes, unidades mm y 12 normales de longitud 0 en mesh_9 y mesh_30', { skip: !fs.existsSync(evidence) && 'GLB de evidencia no disponible (TESSERACT_MEJORA)' }, () => {
  const s = summarizeFile(evidence);
  assert.equal(s.generator, 'Tesseract Phase 7B'); assert.deepEqual([s.nodes, s.meshes, s.materials, s.images, s.textures], [93, 93, 4, 2, 2]); assert.deepEqual(s.extensionsUsed, []);
  assert.equal(s.normals.zeroLength, 12); assert.deepEqual(s.normals.meshesWithZeroLength, [9, 30]);
  assert.ok(Math.max(...s.bbox.size) > 100, 'el modelo debería medir cientos de unidades (milímetros)');
});
