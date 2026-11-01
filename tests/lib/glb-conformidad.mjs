// Comprobador INDEPENDIENTE de conformidad glTF 2.0 / GLB (3.0.1-dev, KI-02 y H-06). Implementa, a partir de la especificación de Khronos, un SUBCONJUNTO
// de las reglas de ERROR del validador oficial (gltf-validator) que afectan a lo que exporta Tesseract: contenedor y chunks, referencias, límites de
// bufferView/accessor, min/max de POSITION igual a los datos float32, normales unitarias (ACCESSOR_VECTOR3_NON_UNIT), índices dentro de rango y sin el
// valor de reinicio, triángulos (count % 3), recuentos de atributos coherentes, imágenes y texturas. Avisos/información: triángulos degenerados,
// TEXCOORD_0 sin textura e imágenes NPOT. Calibrado con la única medición oficial disponible (Fase 0: el GLB de evidencia
// Tesseract_Test_Claude_export_plugin.glb da 12 errores ACCESSOR_VECTOR3_NON_UNIT y nada más). NO sustituye al validador oficial: si este no se ejecutó, no se declara conformidad completa.
import { parseGLB, readAccessor } from './glb.mjs';

const COMP = { 5120: [Int8Array, 1], 5121: [Uint8Array, 1], 5122: [Int16Array, 2], 5123: [Uint16Array, 2], 5125: [Uint32Array, 4], 5126: [Float32Array, 4] };
const NCOMP = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT2: 4, MAT3: 9, MAT4: 16 };
const RESTART = { 5121: 255, 5123: 65535, 5125: 4294967295 };

export function validarGLB(buf, { tolNormal = 5e-4 } = {}) {
  const errores = [], avisos = [], info = []; const E = (codigo, ruta, mensaje) => errores.push({ codigo, ruta, mensaje });
  let g; try { g = parseGLB(buf); } catch (e) { E('GLB_INVALIDO', '/', e.message); return { errores, avisos, info }; }
  buf = Buffer.isBuffer(buf) ? buf : Buffer.from(buf);
  if (buf.readUInt32LE(4) !== 2) E('GLB_VERSION', '/', 'versión de contenedor ≠ 2');
  const jl = buf.readUInt32LE(12); if (jl % 4) E('GLB_CHUNK_ALIGN', '/json', 'chunk JSON no múltiplo de 4');
  const { json, bin } = g;
  if (!json.asset || json.asset.version !== '2.0') E('ASSET_VERSION', '/asset', 'asset.version debe ser "2.0"');
  const arr = (k) => json[k] || [];
  const ref = (k, i, ruta) => { if (!Number.isInteger(i) || i < 0 || i >= arr(k).length) { E('UNRESOLVED_REFERENCE', ruta, `${k}[${i}] no existe`); return false; } return true; };
  if (arr('buffers').length !== 1) E('BUFFERS', '/buffers', 'se espera un único buffer (el chunk BIN)');
  else if (arr('buffers')[0].byteLength > bin.length || bin.length - arr('buffers')[0].byteLength > 3) E('BUFFER_LENGTH', '/buffers/0', `byteLength ${arr('buffers')[0].byteLength} vs BIN ${bin.length}`);
  arr('bufferViews').forEach((v, i) => { const r = `/bufferViews/${i}`; if (!ref('buffers', v.buffer, r + '/buffer')) return;
    if (!(v.byteLength >= 1)) E('BUFFER_VIEW_LENGTH', r, 'byteLength < 1'); if ((v.byteOffset || 0) + v.byteLength > arr('buffers')[0].byteLength) E('BUFFER_VIEW_TOO_LONG', r, 'excede el buffer'); });
  const datos = arr('accessors').map((a, i) => { const r = `/accessors/${i}`; const c = COMP[a.componentType], n = NCOMP[a.type];
    if (!c) { E('ACCESSOR_COMPONENT_TYPE', r, String(a.componentType)); return null; } if (!n) { E('ACCESSOR_TYPE', r, String(a.type)); return null; }
    if (!(a.count >= 1)) { E('ACCESSOR_COUNT', r, 'count < 1'); return null; } if (!ref('bufferViews', a.bufferView, r + '/bufferView')) return null;
    const v = arr('bufferViews')[a.bufferView], off = (v.byteOffset || 0) + (a.byteOffset || 0), len = a.count * n * c[1];
    if (((v.byteOffset || 0) + (a.byteOffset || 0)) % c[1]) E('ACCESSOR_ALIGNMENT', r, 'desalineado');
    if ((a.byteOffset || 0) + len > v.byteLength) { E('ACCESSOR_TOO_LONG', r, 'excede su bufferView'); return null; }
    const copia = new Uint8Array(bin.buffer.slice(bin.byteOffset + off, bin.byteOffset + off + len)); const d = new c[0](copia.buffer);
    if (a.componentType === 5126) for (let k = 0; k < d.length; k++) if (!Number.isFinite(d[k])) { E('ACCESSOR_INVALID_FLOAT', r, `elemento ${k}`); break; }
    if (a.min || a.max) for (let j = 0; j < n; j++) { let mn = Infinity, mx = -Infinity; for (let k = j; k < d.length; k += n) { mn = Math.min(mn, d[k]); mx = Math.max(mx, d[k]); }
      const decl = (x) => (a.componentType === 5126 ? Math.fround(x) : x); // como el validador oficial: el valor declarado se lleva a float32 antes de comparar
      if (a.min && decl(a.min[j]) !== mn) E('ACCESSOR_MIN_MISMATCH', r, `min[${j}] declarado ${a.min[j]} ≠ real ${mn}`); if (a.max && decl(a.max[j]) !== mx) E('ACCESSOR_MAX_MISMATCH', r, `max[${j}] declarado ${a.max[j]} ≠ real ${mx}`); }
    return { d, n, a }; });
  let degenerados = 0, triangulos = 0;
  arr('meshes').forEach((m, mi) => (m.primitives || []).forEach((p, pi) => { const r = `/meshes/${mi}/primitives/${pi}`; const at = p.attributes || {};
    if (at.POSITION === undefined) { E('MESH_PRIMITIVE_NO_POSITION', r, 'sin POSITION'); return; }
    for (const [k, idx] of Object.entries(at)) ref('accessors', idx, `${r}/attributes/${k}`);
    const P = datos[at.POSITION]; if (!P) return; if (P.a.type !== 'VEC3' || P.a.componentType !== 5126) E('MESH_PRIMITIVE_POSITION_FORMAT', r, 'POSITION debe ser VEC3 float');
    if (!P.a.min || !P.a.max) E('MESH_PRIMITIVE_POSITION_MINMAX', r, 'POSITION sin min/max');
    for (const [k, idx] of Object.entries(at)) { const A = datos[idx]; if (A && A.a.count !== P.a.count) E('MESH_PRIMITIVE_UNEQUAL_ACCESSOR_COUNT', `${r}/attributes/${k}`, `${A.a.count} ≠ ${P.a.count}`); }
    if (at.NORMAL !== undefined && datos[at.NORMAL]) { const N = datos[at.NORMAL].d; for (let k = 0; k < N.length; k += 3) { const l = Math.hypot(N[k], N[k + 1], N[k + 2]); if (Math.abs(l - 1) > tolNormal) E('ACCESSOR_VECTOR3_NON_UNIT', `/accessors/${at.NORMAL}`, `elemento ${k / 3}: longitud ${l}`); } }
    const mode = p.mode === undefined ? 4 : p.mode; let I = null;
    if (p.indices !== undefined && ref('accessors', p.indices, r + '/indices') && datos[p.indices]) { const X = datos[p.indices]; I = X.d;
      if (X.a.type !== 'SCALAR' || ![5121, 5123, 5125].includes(X.a.componentType)) E('MESH_PRIMITIVE_INDICES_FORMAT', r, 'índices: SCALAR entero sin signo');
      for (let k = 0; k < I.length; k++) { if (I[k] >= P.a.count) { E('ACCESSOR_INDEX_OOB', `/accessors/${p.indices}`, `índice ${I[k]} ≥ ${P.a.count}`); break; } if (I[k] === RESTART[X.a.componentType]) { E('ACCESSOR_INDEX_PRIMITIVE_RESTART', `/accessors/${p.indices}`, `valor ${I[k]}`); break; } } }
    const nIdx = I ? I.length : P.a.count; if (mode === 4 && nIdx % 3) E('MESH_PRIMITIVE_INCOMPATIBLE_MODE', r, `${nIdx} índices no forman triángulos`);
    if (mode === 4) for (let t = 0; t + 2 < nIdx; t += 3) { triangulos++; const [a, b, c] = I ? [I[t], I[t + 1], I[t + 2]] : [t, t + 1, t + 2]; const X = P.d;
      const u = [0, 1, 2].map((q) => X[3 * b + q] - X[3 * a + q]), v = [0, 1, 2].map((q) => X[3 * c + q] - X[3 * a + q]); const cr = Math.hypot(u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]);
      if (a === b || b === c || a === c || cr === 0) degenerados++; }
    if (p.material !== undefined) ref('materials', p.material, r + '/material');
    if (at.TEXCOORD_0 !== undefined && p.material !== undefined && arr('materials')[p.material] && !arr('materials')[p.material].pbrMetallicRoughness?.baseColorTexture) info.push({ codigo: 'UNUSED_TEXCOORD', ruta: r });
  }));
  if (degenerados) info.push({ codigo: 'ACCESSOR_INDEX_TRIANGLE_DEGENERATE', ruta: '/meshes', mensaje: `${degenerados} triángulos degenerados` });
  arr('materials').forEach((m, i) => { const t = m.pbrMetallicRoughness?.baseColorTexture; if (t) ref('textures', t.index, `/materials/${i}/pbrMetallicRoughness/baseColorTexture`); });
  arr('textures').forEach((t, i) => { ref('images', t.source, `/textures/${i}/source`); if (t.sampler !== undefined) ref('samplers', t.sampler, `/textures/${i}/sampler`); });
  arr('images').forEach((im, i) => { const r = `/images/${i}`; if (!ref('bufferViews', im.bufferView, r + '/bufferView')) return; if (!['image/png', 'image/jpeg'].includes(im.mimeType)) E('IMAGE_MIME', r, String(im.mimeType));
    const v = arr('bufferViews')[im.bufferView], b = bin.subarray(v.byteOffset || 0, (v.byteOffset || 0) + v.byteLength);
    if (im.mimeType === 'image/png') { if (b.readUInt32BE(0) !== 0x89504e47) E('IMAGE_UNRECOGNIZED_FORMAT', r, 'no es PNG'); else { const w = b.readUInt32BE(16), h = b.readUInt32BE(20); if ((w & (w - 1)) || (h & (h - 1))) info.push({ codigo: 'IMAGE_NPOT_DIMENSIONS', ruta: r }); } } });
  arr('nodes').forEach((n, i) => { if (n.mesh !== undefined) ref('meshes', n.mesh, `/nodes/${i}/mesh`); (n.children || []).forEach((c, k) => ref('nodes', c, `/nodes/${i}/children/${k}`)); });
  if (json.scene !== undefined) ref('scenes', json.scene, '/scene'); arr('scenes').forEach((s, i) => (s.nodes || []).forEach((n, k) => ref('nodes', n, `/scenes/${i}/nodes/${k}`)));
  return { errores, avisos, info, triangulos, degenerados };
}

// Caja envolvente en mundo (sin jerarquía: Tesseract exporta nodos planos sin transformaciones) y en las unidades del archivo.
export function cajaGLB(buf) { const { json } = parseGLB(buf); const mn = [Infinity, Infinity, Infinity], mx = [-Infinity, -Infinity, -Infinity];
  json.nodes.forEach((n) => { if (n.mesh === undefined) return; if (n.matrix || n.scale || n.translation || n.rotation) throw new Error('nodo con transformación: no previsto');
    for (const p of json.meshes[n.mesh].primitives) { const a = json.accessors[p.attributes.POSITION]; for (let i = 0; i < 3; i++) { mn[i] = Math.min(mn[i], a.min[i]); mx[i] = Math.max(mx[i], a.max[i]); } } });
  return { min: mn, max: mx, size: mx.map((v, i) => v - mn[i]) }; }

// Equivalencia SEMÁNTICA entre un GLB de la línea 3.0.1-dev (metros) y una exportación HISTÓRICA del legacy (mm, misma escena y pose): mismos nodos
// en el mismo orden (salvo mallas que solo tenían triángulos degenerados), mismos triángulos no degenerados en el mismo orden con posiciones ×0,001,
// mismas UV y misma dirección de normal donde la histórica era válida. Implementación independiente de src/export (criterio de degenerado de la
// especificación de la línea: área exactamente nula —vértices alineados o repetidos—; los triángulos finos con área se conservan).
function triangulosDe(g, mesh) { const p = mesh.primitives[0]; const P = readAccessor(g, p.attributes.POSITION).data; const N = p.attributes.NORMAL !== undefined ? readAccessor(g, p.attributes.NORMAL).data : null;
  const U = p.attributes.TEXCOORD_0 !== undefined ? readAccessor(g, p.attributes.TEXCOORD_0).data : null; const I = p.indices !== undefined ? readAccessor(g, p.indices).data : null; const out = [];
  const nIdx = I ? I.length : P.length / 3;
  for (let t = 0; t + 2 < nIdx; t += 3) { const v = I ? [I[t], I[t + 1], I[t + 2]] : [t, t + 1, t + 2]; out.push(v.map((i) => ({ p: [P[3 * i], P[3 * i + 1], P[3 * i + 2]], n: N ? [N[3 * i], N[3 * i + 1], N[3 * i + 2]] : null, uv: U ? [U[2 * i], U[2 * i + 1]] : null }))); }
  return out; }
export function esDegenerado(tri) { const [a, b, c] = tri.map((v) => v.p); const d = (x, y) => [0, 1, 2].map((k) => y[k] - x[k]); const u = d(a, b), v = d(a, c);
  return !(Math.hypot(u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]) > 0); }
export function equivalenciaHistorica(nuevoBuf, historicoBuf, { escala = 0.001, tolPos = 1e-7, tolN = 1e-4, tolUV = 1e-6 } = {}) {
  const gN = parseGLB(nuevoBuf), gH = parseGLB(historicoBuf); const dif = []; const nodos = (g) => g.json.nodes.filter((n) => n.mesh !== undefined);
  const H = nodos(gH).map((n) => ({ nombre: n.name, tris: triangulosDe(gH, gH.json.meshes[n.mesh]).filter((t) => !esDegenerado(t)), mat: gH.json.meshes[n.mesh].primitives[0].material })).filter((x) => x.tris.length);
  const N = nodos(gN).map((n) => ({ nombre: n.name, tris: triangulosDe(gN, gN.json.meshes[n.mesh]), mat: gN.json.meshes[n.mesh].primitives[0].material }));
  if (H.length !== N.length) dif.push(`nodos: ${N.length} frente a ${H.length} históricos con triángulos`);
  let tris = 0, quitados = 0; nodos(gH).forEach((n) => { quitados += triangulosDe(gH, gH.json.meshes[n.mesh]).filter(esDegenerado).length; });
  for (let i = 0; i < Math.min(H.length, N.length) && dif.length < 20; i++) { const h = H[i], n = N[i];
    if (h.nombre !== n.nombre) dif.push(`nodo ${i}: «${n.nombre}» ≠ «${h.nombre}»`); if (h.tris.length !== n.tris.length) { dif.push(`nodo ${i} (${h.nombre}): ${n.tris.length} triángulos ≠ ${h.tris.length}`); continue; }
    const mh = gH.json.materials[h.mat], mn = gN.json.materials[n.mat]; if (JSON.stringify({ ...mh, name: 0 }) !== JSON.stringify({ ...mn, name: 0 })) dif.push(`nodo ${i}: material distinto`);
    for (let t = 0; t < h.tris.length; t++) for (let k = 0; k < 3; k++) { tris++; const a = h.tris[t][k], b = n.tris[t][k];
      for (let c = 0; c < 3; c++) if (Math.abs(a.p[c] * escala - b.p[c]) > tolPos) { dif.push(`nodo ${i} tri ${t} v${k}: posición ${b.p} ≠ ${a.p.map((x) => x * escala)}`); break; }
      if (a.uv && b.uv && (Math.abs(a.uv[0] - b.uv[0]) > tolUV || Math.abs(a.uv[1] - b.uv[1]) > tolUV)) dif.push(`nodo ${i} tri ${t} v${k}: uv`);
      if (a.n && Math.abs(Math.hypot(...a.n) - 1) < 5e-4 && Math.hypot(a.n[0] - b.n[0], a.n[1] - b.n[1], a.n[2] - b.n[2]) > tolN) dif.push(`nodo ${i} tri ${t} v${k}: normal ${b.n} ≠ ${a.n}`); } }
  return { ok: dif.length === 0, diferencias: dif.slice(0, 20), nodos: N.length, verticesComparados: tris, triangulosDegeneradosHistoricos: quitados };
}
