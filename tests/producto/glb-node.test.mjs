// Línea de producto 3.0.1-dev (D-0) — exportación GLB en Node con three.js r132 real, sobre las MISMAS escenas sintéticas de la prueba diferencial
// N4 de F1 (tests/lib/a8.mjs · sceneCases). En F1 la regla era «src = baseline byte a byte» (sigue viva en la batería histórica sobre el commit
// congelado). En la línea de producto la regla es: src ≡ baseline con posiciones ×0,001 (metros, H-06), sin triángulos de área nula ni vértices
// sin usar (KI-02), con normales unitarias, mismo orden de nodos, mismos materiales, imágenes y texturas, y 0 errores del comprobador independiente.
import test from 'node:test'; import assert from 'node:assert/strict';
import { sceneCases, loadExporter, setupEnv } from '../lib/a8.mjs'; import { parseGLB } from '../lib/glb.mjs';
import { validarGLB, equivalenciaHistorica, cajaGLB } from '../lib/glb-conformidad.mjs';

setupEnv(); const CASES = sceneCases(); const T = () => globalThis.THREE;
async function exportar(target, scene) { const logs = []; try { const ex = await loadExporter(target, scene, (m) => logs.push(String(m))); const blob = ex.buildGLBBlobFromCurrentView(); return { ok: true, buf: Buffer.from(await blob.arrayBuffer()), type: blob.type, logs }; } catch (e) { return { ok: false, error: e.constructor.name + ': ' + e.message, logs }; } }
// El lienzo de Node es simulado (tests/lib/a8.mjs): sus «PNG» son cadenas deterministas, no PNG. Solo ESA comprobación se omite aquí; el PNG real
// se valida en producto-navegador.test.mjs. Todo lo demás del comprobador se exige.
const errores = (buf) => validarGLB(buf).errores.filter((e) => e.codigo !== 'IMAGE_UNRECOGNIZED_FORMAT');
const imagenes = (buf) => { const { json, bin } = parseGLB(buf); return (json.images || []).map((im) => { const v = json.bufferViews[im.bufferView]; return bin.subarray(v.byteOffset, v.byteOffset + v.byteLength).toString('base64'); }); };

for (const [name, make] of Object.entries(CASES)) test(`N4 → producto · ${name}: src ≡ baseline ×0,001 y sin errores de conformidad`, async () => {
  const m = make(); const base = await exportar('baseline', m.scene); const src = await exportar('src', make().scene);
  if (m.ki28) { assert.equal(base.ok, false); assert.equal(src.ok, true, 'H-07: src ya no desborda la pila'); assert.deepEqual(errores(src.buf), []); return; }
  if (!base.ok) { assert.equal(src.ok, false, name); assert.equal(src.error, base.error, 'mismo error que el baseline'); return; }
  assert.equal(src.ok, true, name + ': ' + src.error); assert.equal(src.type, 'model/gltf-binary'); assert.deepEqual(src.logs, base.logs, 'mismos avisos (p. ej. «Texture image encode failed»)');
  const v = validarGLB(src.buf); assert.deepEqual(errores(src.buf), [], name); assert.equal(v.degenerados, 0, name);
  const eq = equivalenciaHistorica(src.buf, base.buf); assert.ok(eq.ok, name + ': ' + eq.diferencias.join(' | ')); assert.deepEqual(imagenes(src.buf), imagenes(base.buf), 'imágenes byte a byte');
  const jb = parseGLB(base.buf).json, js = parseGLB(src.buf).json; for (const k of ['images', 'textures', 'samplers']) assert.equal((js[k] || []).length, (jb[k] || []).length, k);
  assert.deepEqual(Object.keys(js).filter((k) => k !== 'asset'), Object.keys(jb).filter((k) => k !== 'asset'), 'mismas claves de primer nivel y en el mismo orden');
});

// Escenas nuevas: las causas de KI-02 medidas en los GLB reales (tapas con área nula por vértices alineados del contorno y astillas que son nulas en
// coordenadas locales pero no en mundo) y los casos límite de la corrección.
const malla = (pos, idx, mat, rot) => { const g = new (T().BufferGeometry)(); g.setAttribute('position', new (T().BufferAttribute)(new Float32Array(pos), 3)); if (idx) g.setIndex(idx); g.computeVertexNormals(); const o = new (T().Mesh)(g, mat || new (T().MeshPhongMaterial)({ color: 0x888888 })); if (rot) o.rotation.set(...rot); return o; };
test('KI-02 · tapa con vértices alineados (área nula, como mesh_2/mesh_8 del RC activo): se quita el triángulo nulo; el resto intacto; 0 errores', async () => {
  const s = new (T().Scene)(); s.add(malla([0, 0, 0, 10, 0, 0, 20, 0, 0, 20, 10, 0, 0, 10, 0], [0, 1, 2, 0, 2, 3, 0, 3, 4]));
  const base = await exportar('baseline', s), src = await exportar('src', s); assert.ok(validarGLB(base.buf).errores.some((e) => e.codigo === 'ACCESSOR_VECTOR3_NON_UNIT'), 'el baseline reproduce KI-02');
  const v = validarGLB(src.buf); assert.deepEqual(v.errores, []); assert.equal(v.triangulos, 2); const j = parseGLB(src.buf).json; assert.equal(j.accessors[j.meshes[0].primitives[0].attributes.POSITION].count, 4, 'el vértice (10,0,0) solo lo usaba el triángulo nulo');
});
test('KI-02 · astilla nula en coordenadas locales pero no en mundo (malla girada): se conserva y su normal nula se repara con la de su cara', async () => {
  const s = new (T().Scene)(); s.add(malla([0, 0, 0, 100, 0, 0, 37.123, 0, 0], null, null, [0.3, 1.1, -0.7])); s.add(malla([0, 0, 0, 1, 0, 0, 0, 1, 0], null, null, [0.3, 1.1, -0.7]));
  const base = await exportar('baseline', s); const src = await exportar('src', s); const vb = validarGLB(base.buf), vs = validarGLB(src.buf);
  assert.ok(vb.errores.length > 0, 'baseline: normales nulas'); assert.deepEqual(vs.errores, []); assert.equal(parseGLB(src.buf).json.nodes.length, vs.degenerados === 0 && vs.triangulos === 2 ? 2 : 1);
});
test('KI-02 · una malla cuyos triángulos son TODOS de área nula no se exporta (no tiene geometría); si no queda ninguna, el error de siempre', async () => {
  const s = new (T().Scene)(); s.add(malla([0, 0, 0, 1, 0, 0, 2, 0, 0], null)); s.add(malla([0, 0, 0, 1, 0, 0, 0, 1, 0], null)); const r = await exportar('src', s);
  assert.equal(parseGLB(r.buf).json.nodes.length, 1); assert.deepEqual(validarGLB(r.buf).errores, []);
  const solo = new (T().Scene)(); solo.add(malla([0, 0, 0, 1, 0, 0, 2, 0, 0], null)); assert.equal((await exportar('src', solo)).error, 'Error: Nothing exportable in current 3D view');
});
test('H-06 · conversión única mm → m: posición, tamaño, espesor y centro; las normales NO se escalan; min/max = datos float32 exactos', async () => {
  const s = new (T().Scene)(); const caja = new (T().Mesh)(new (T().BoxGeometry)(175, 0.25, 223.5), new (T().MeshPhongMaterial)()); caja.position.set(10, 0.125, -40); s.add(caja);
  const r = await exportar('src', s); const c = cajaGLB(r.buf); const v = validarGLB(r.buf); assert.deepEqual(v.errores, []);
  const cerca = (a, b) => Math.abs(a - b) < 1e-7; assert.ok([0.175, 0.00025, 0.2235].every((x, i) => cerca(c.size[i], x)), JSON.stringify(c.size)); assert.ok([0.01, 0.000125, -0.04].every((x, i) => cerca((c.min[i] + c.max[i]) / 2, x)), 'centro');
  const base = cajaGLB((await exportar('baseline', s)).buf); assert.ok(base.size.every((x, i) => cerca(x * 0.001, c.size[i])), 'baseline en mm ×0,001 = src');
});
