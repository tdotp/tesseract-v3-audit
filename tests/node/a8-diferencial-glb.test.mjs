// A8.0a — N4: ejecución DIFERENCIAL de las 8 funciones de exportación GLB sobre escenas sintéticas, en Node, con three.js r132 real (docs/fase1/A8_PROPUESTA.md §6.2).
// Objetivos: baseline congelado · panel/ (referencia A1) · src/ (texto de main.js o módulos de src/export/ según el paso). Cada escena crea objetos NUEVOS por objetivo (uuids distintos):
// el Blob resultante, el error o el log deben ser IDÉNTICOS al del baseline. También cubre ramas que los troqueles actuales no alcanzan (Uint32, sin normales, opacidad < 0.01…) y KI-28.
// Límites: lienzo y documento simulados (el «PNG» es una cadena determinista), así que NO prueba el codificador PNG de Chrome (eso lo ve la batería de navegador).
import test from 'node:test'; import assert from 'node:assert/strict';
import { sceneCases, loadExporter, sha256, setupEnv, alignmentOf } from '../lib/a8.mjs'; import { parseGLB } from '../lib/glb.mjs';

setupEnv(); const CASES = sceneCases(); const TARGETS = ['baseline', 'panel', 'src'];
async function run(target, make) {
  const { scene, ...meta } = make(); const logs = []; const log = (m) => logs.push(String(m));
  try { const ex = await loadExporter(target, scene, log); const blob = ex.buildGLBBlobFromCurrentView(); const buf = Buffer.from(await blob.arrayBuffer()); return { ok: true, type: blob.type, len: buf.length, sha: sha256(buf), logs, buf, meta }; }
  catch (e) { return { ok: false, error: e.constructor.name + ': ' + e.message, logs, meta }; }
}
const results = {}; // nombre → {baseline, panel, src}
for (const [name, make] of Object.entries(CASES)) test(`N4 · ${name}: baseline, panel y src producen el mismo resultado`, async () => {
  const r = results[name] = {}; for (const t of TARGETS) r[t] = await run(t, make);
  for (const t of ['panel', 'src']) { const a = { ...r[t] }, b = { ...r.baseline }; delete a.buf; delete b.buf; delete a.meta; delete b.meta; assert.deepEqual(a, b, `${name}: ${t} ≠ baseline`); }
  const m = r.baseline.meta; if (m.esperaError) { assert.equal(r.baseline.ok, false); assert.ok(r.baseline.error.includes(m.esperaError), r.baseline.error); }
  else if (!m.ki28 && !name.startsWith('aleatoria ')) { assert.equal(r.baseline.ok, true, name + ': ' + r.baseline.error); assert.equal(r.baseline.type, 'model/gltf-binary'); }
});
// El caso KI-28 documenta el defecto SIN corregirlo: Math.max.apply con ≥ 125 000 índices desborda la pila en V8 (en CEP el límite es [NO VERIFICADO]).
test('N4 · KI-28 (pendiente de confirmación): ≥ 125 000 índices lanzan RangeError en los tres objetivos, igual', () => {
  const r = results['KI-28: ≥ 125 000 índices']; for (const t of TARGETS) { assert.equal(r[t].ok, false, t); assert.match(r[t].error, /^RangeError/, t); }
});
// Guardas de cobertura: cada escena debe ejercer de verdad la rama que dice cubrir (si no, la prueba diferencial sería vacía).
const G = (name) => parseGLB(results[name].baseline.buf); const acc = (g) => g.json.accessors;
test('N4 · cobertura: cada escena produce lo que dice cubrir', () => {
  assert.ok(acc(G('índices Uint32 (máximo ≥ 65535)')).some((a) => a.type === 'SCALAR' && a.componentType === 5125), 'Uint32');
  for (const n of ['máximo justo 65534 (Uint16)']) assert.ok(acc(G(n)).filter((a) => a.type === 'SCALAR').every((a) => a.componentType === 5123), n);
  assert.ok(acc(G('máximo justo 65535 (Uint32)')).some((a) => a.type === 'SCALAR' && a.componentType === 5125), '65535');
  assert.equal(G('malla con opacidad 0.005 transparente (se omite)').json.nodes.length, 1);
  assert.equal(G('opacidad 0.005 sin transparent (se exporta)').json.nodes.length, 1); assert.equal(G('opacidad 0.01 exacta (se exporta)').json.nodes.length, 1);
  assert.deepEqual(G('roles pickCrease y panelLabel (se omiten)').json.nodes.map((n) => n.name), ['foldBridgeTop']);
  assert.equal(G('Line, LineSegments y Sprite no son mallas').json.nodes.length, 1);
  assert.deepEqual(G('mallas con y sin nombre').json.nodes.map((n) => n.name), ['panelA', 'mesh_1', 'rol', 'mesh_3']);
  assert.equal(G('material repetido (deduplicación) y distinto por opacidad/lado').json.materials.length, 3);
  const comp = G('textura compartida por dos materiales distintos').json; assert.deepEqual([comp.images.length, comp.textures.length, comp.samplers.length, comp.materials.length], [1, 1, 1, 2]);
  const dos = G('dos texturas distintas con igual color').json; assert.deepEqual([dos.images.length, dos.textures.length, dos.materials.length], [2, 2, 2]);
  assert.equal(G('textura con lienzo (HTMLCanvasElement)').json.images.length, 1);
  assert.equal((G('textura sin imagen o sin tamaño').json.images || []).length, 0);
  const rota = results['textura cuyo dibujo falla (log «Texture image encode failed»)'].baseline; assert.ok(rota.logs.some((l) => l === 'Texture image encode failed: drawImage boom'), JSON.stringify(rota.logs)); assert.equal(parseGLB(rota.buf).json.images.length, 1);
  assert.equal(G('jerarquía profunda con objetos ocultos (visible=false se exporta)').json.nodes.length, 1);
  assert.deepEqual(G('orden de recorrido: mallas intercaladas con grupos').json.nodes.map((n) => n.name), ['s1', 'g1', 'g2', 's2']);
  assert.equal(G('geometría sin normales ni UV').json.accessors.filter((a) => a.type === 'VEC2').length, 0);
  assert.ok(Object.keys(G('una caja indexada').json).join() === 'asset,scene,scenes,nodes,meshes,materials,accessors,bufferViews,buffers');
  assert.equal(Object.keys(comp).join(), 'asset,scene,scenes,nodes,meshes,materials,accessors,bufferViews,buffers,images,textures,samplers', 'orden de claves con textura');
});
test('N4 · alineación y relleno del contenedor en todas las escenas exportables', () => {
  let n = 0; for (const [name, v] of Object.entries(results)) { if (!v.baseline.ok) continue; n++; const a = alignmentOf(v.baseline.buf);
    assert.deepEqual({ ...a, util: 0 }, { vistasAlineadas: true, huecosOk: true, colaBinOk: true, chunksMultiplo4: true, relleno20: true, jsonTermina: true, longitudCabecera: true, util: 0 }, name); }
  assert.ok(n >= 25, 'pocas escenas exportables: ' + n);
  const tres = alignmentOf(results['índices de 3 entradas (relleno de alineación entre vistas)'].baseline.buf); assert.equal(tres.vistasAlineadas, true);
});
test('N4 · las escenas aleatorias producen GLB válidos (al menos 8 de 16 no vacíos) y distintos entre sí', () => {
  const rs = Object.entries(results).filter(([n]) => n.startsWith('aleatoria ')).map(([, v]) => v.baseline); assert.equal(rs.length, 16);
  assert.ok(rs.filter((r) => r.ok).length >= 8, 'demasiadas escenas vacías'); assert.ok(new Set(rs.filter((r) => r.ok).map((r) => r.sha)).size >= 8);
});

// Qué parte de la exportación sale ya de los módulos de src/export/ en este paso (se actualiza en cada paso aprobado; igualdad exacta).
const ORIGEN_ESPERADO = { bytesFromDataURL: 'export/glb-image.js', textureToImageBytes: 'export/glb-image.js', padBytes: 'export/glb-bytes.js', toUint8View: 'export/glb-bytes.js', typedArrayFromList: 'export/glb-bytes.js', buildExportSceneMeshes: 'export/glb-scene.js', materialKey: 'main.js', buildGLBBlobFromCurrentView: 'main.js' }; // A8.3
test('N4 · el objetivo src toma de los módulos reales de export/ exactamente lo ya movido (el resto, del texto de main.js)', async () => {
  const ex = await loadExporter('src', null, () => {}); assert.deepEqual(ex.__origen, ORIGEN_ESPERADO);
});

// I-E3 (contrato de buildExportSceneMeshes): exportar no modifica geometrías, materiales ni la jerarquía de la escena (solo la caché matrixWorld). Se compara una instantánea antes y después.
function snapshot(scene) {
  const rows = []; const sum = (a) => { let s = 0; for (let i = 0; i < a.length; i++) s += a[i] * ((i % 7) + 1); return s; };
  scene.traverse((o) => { const g = o.geometry, m = o.material && !Array.isArray(o.material) ? o.material : null;
    rows.push([o.type, o.name, o.uuid, o.children.length, o.visible, o.userData && o.userData.role || '', o.position.toArray(), o.scale.toArray(),
      g ? [g.uuid, Object.keys(g.attributes).sort(), g.attributes.position ? sum(g.attributes.position.array) : 0, g.index ? sum(g.index.array) : -1] : null, m ? [m.uuid, m.type, m.color ? m.color.getHexString() : null, m.opacity, m.transparent, m.side, m.map ? [m.map.uuid, m.map.version] : null] : null]); });
  return JSON.stringify(rows);
}
test('N4 · I-E3: exportar no modifica geometrías, materiales ni jerarquía (baseline, panel y src)', async () => {
  for (const [name, make] of Object.entries(CASES)) { if (name.startsWith('KI-28') || name === 'sin escena (null)') continue;
    for (const t of TARGETS) { const { scene } = make(); if (!scene) continue; const antes = snapshot(scene); const ex = await loadExporter(t, scene, () => {}); try { ex.buildGLBBlobFromCurrentView(); } catch (e) { /* escena vacía: no hay nada que comparar */ }
      assert.equal(snapshot(scene), antes, `${name} (${t}): la exportación modificó la escena`); } }
});
