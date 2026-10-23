// Inspector de GLB sin dependencias: estructura, materiales, caja envolvente (con escala de nodos) y normales inválidas.
import fs from 'node:fs';
export function parseGLB(buf) {
  buf = Buffer.isBuffer(buf) ? buf : Buffer.from(buf);
  if (buf.readUInt32LE(0) !== 0x46546c67) throw new Error('no es GLB (magic)'); if (buf.readUInt32LE(8) !== buf.length) throw new Error('longitud de cabecera ≠ tamaño real');
  const jl = buf.readUInt32LE(12); if (buf.readUInt32LE(16) !== 0x4e4f534a) throw new Error('falta chunk JSON');
  const json = JSON.parse(buf.slice(20, 20 + jl).toString('utf8')); const bo = 20 + jl; let bin = Buffer.alloc(0);
  if (bo < buf.length) { const bl = buf.readUInt32LE(bo); if (buf.readUInt32LE(bo + 4) !== 0x004e4942) throw new Error('falta chunk BIN'); bin = buf.slice(bo + 8, bo + 8 + bl); }
  return { json, bin };
}
const COMP = { 5126: [Float32Array, 4], 5123: [Uint16Array, 2], 5125: [Uint32Array, 4] }; const NCOMP = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 };
export function readAccessor({ json, bin }, idx) {
  const a = json.accessors[idx], bv = json.bufferViews[a.bufferView], [T, sz] = COMP[a.componentType], n = NCOMP[a.type];
  const off = (bv.byteOffset || 0) + (a.byteOffset || 0); const copy = new Uint8Array(bin.buffer.slice(bin.byteOffset + off, bin.byteOffset + off + a.count * n * sz));
  return { data: new T(copy.buffer), count: a.count, n };
}
export function summarize(glb) {
  const { json } = glb; const nodeScale = (n) => (n.scale ? n.scale : [1, 1, 1]);
  const mn = [Infinity, Infinity, Infinity], mx = [-Infinity, -Infinity, -Infinity];
  const visit = (ni, s) => { const n = json.nodes[ni]; const sc = [s[0] * nodeScale(n)[0], s[1] * nodeScale(n)[1], s[2] * nodeScale(n)[2]];
    if (n.mesh !== undefined) for (const p of json.meshes[n.mesh].primitives) { const a = json.accessors[p.attributes.POSITION]; if (a.min) for (let i = 0; i < 3; i++) { mn[i] = Math.min(mn[i], a.min[i] * sc[i]); mx[i] = Math.max(mx[i], a.max[i] * sc[i]); } }
    (n.children || []).forEach((c) => visit(c, sc)); };
  (json.scenes[json.scene || 0].nodes || []).forEach((n) => visit(n, [1, 1, 1]));
  let zero = 0, nonUnit = 0, normalsChecked = 0; const zeroMeshes = new Set();
  json.meshes.forEach((m, mi) => m.primitives.forEach((p) => { if (p.attributes.NORMAL === undefined) return; const { data, count } = readAccessor(glb, p.attributes.NORMAL);
    for (let i = 0; i < count; i++) { const l = Math.hypot(data[3 * i], data[3 * i + 1], data[3 * i + 2]); normalsChecked++; if (l < 1e-9) { zero++; zeroMeshes.add(mi); } else if (Math.abs(l - 1) > 1e-3) nonUnit++; } }));
  const mats = json.materials.map((m) => ({ color: (m.pbrMetallicRoughness?.baseColorFactor || []).map((v) => +v.toFixed(4)), metallic: m.pbrMetallicRoughness?.metallicFactor, roughness: m.pbrMetallicRoughness?.roughnessFactor,
    texture: m.pbrMetallicRoughness?.baseColorTexture !== undefined, alphaMode: m.alphaMode || 'OPAQUE', doubleSided: !!m.doubleSided }));
  const key = (m) => JSON.stringify(m);
  return { generator: json.asset.generator, extensionsUsed: json.extensionsUsed || [], nodes: json.nodes.length, meshes: json.meshes.length, primitives: json.meshes.reduce((s, m) => s + m.primitives.length, 0), materials: json.materials.length,
    accessors: json.accessors.length, bufferViews: json.bufferViews.length, images: (json.images || []).length, textures: (json.textures || []).length, samplers: (json.samplers || []).length,
    imageMime: [...new Set((json.images || []).map((i) => i.mimeType))],
    materialSummary: mats.map(key).sort().filter((v, i, a) => a.indexOf(v) === i).map((s) => JSON.parse(s)),
    bbox: { min: mn.map((v) => +v.toFixed(3)), max: mx.map((v) => +v.toFixed(3)), size: mx.map((v, i) => +(v - mn[i]).toFixed(3)) },
    normals: { checked: normalsChecked, zeroLength: zero, nonUnit, meshesWithZeroLength: [...zeroMeshes].sort((a, b) => a - b) } };
}
export const summarizeFile = (f) => summarize(parseGLB(fs.readFileSync(f)));
