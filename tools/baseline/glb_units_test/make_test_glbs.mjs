// Genera dos GLB de calibración (un "triedro" de barras) para averiguar cómo interpreta cada visor las UNIDADES y los EJES.
//   axes_METROS.glb       barras X=0.100, Y=0.150, Z=0.200 (convención glTF: 1 unidad = 1 m)  -> deben verse de 10, 15 y 20 cm
//   axes_MILIMETROS.glb   las mismas barras con X=100, Y=150, Z=200 (convención del plugin actual: 1 unidad = 1 mm)
//   axes_MILIMETROS_nodo_escala.glb  igual que el anterior pero con un nodo raíz de escala 0.001 (mm en los vértices, metros en el mundo)
// Colores: X rojo, Y verde, Z azul; cada barra de 10 mm de sección. Cubo de 10 mm en el origen (blanco).
// Uso: node make_test_glbs.mjs <carpeta-salida>
import fs from 'node:fs'; import path from 'node:path';
const out = process.argv[2] || '.';
function box(cx, cy, cz, sx, sy, sz) { // 24 vértices, 12 triángulos, normales por cara
  const hx = sx / 2, hy = sy / 2, hz = sz / 2, P = [], N = [], I = [];
  const faces = [[[1,0,0],[[1,-1,-1],[1,1,-1],[1,1,1],[1,-1,1]]],[[-1,0,0],[[-1,-1,1],[-1,1,1],[-1,1,-1],[-1,-1,-1]]],[[0,1,0],[[-1,1,-1],[-1,1,1],[1,1,1],[1,1,-1]]],[[0,-1,0],[[-1,-1,1],[-1,-1,-1],[1,-1,-1],[1,-1,1]]],[[0,0,1],[[-1,-1,1],[1,-1,1],[1,1,1],[-1,1,1]]],[[0,0,-1],[[1,-1,-1],[-1,-1,-1],[-1,1,-1],[1,1,-1]]]];
  faces.forEach(([n, vs], f) => { vs.forEach(v => { P.push(cx + v[0] * hx, cy + v[1] * hy, cz + v[2] * hz); N.push(...n); }); const b = f * 4; I.push(b, b + 1, b + 2, b, b + 2, b + 3); });
  return { P, N, I };
}
function build(unit, rootScale) { // unit = 1 (metros) o 1000 (milímetros); rootScale = nodo raíz con escala (opcional)
  const k = unit, s = 0.010 * k; // sección 10 mm
  const parts = [
    { name: 'origen_10mm', color: [1, 1, 1, 1], g: box(0, 0, 0, s, s, s) },
    { name: 'X_rojo_100mm', color: [1, 0, 0, 1], g: box(0.050 * k, 0, 0, 0.100 * k, s, s) },
    { name: 'Y_verde_150mm', color: [0, 0.7, 0, 1], g: box(0, 0.075 * k, 0, s, 0.150 * k, s) },
    { name: 'Z_azul_200mm', color: [0, 0.3, 1, 1], g: box(0, 0, 0.100 * k, s, s, 0.200 * k) },
  ];
  const gltf = { asset: { version: '2.0', generator: 'Tesseract V3 unit test' }, scene: 0, scenes: [{ nodes: [] }], nodes: [], meshes: [], materials: [], accessors: [], bufferViews: [], buffers: [{ byteLength: 0 }] };
  const bin = []; let off = 0;
  const add = (typed, target) => { const u8 = new Uint8Array(typed.buffer, typed.byteOffset, typed.byteLength); const pad = (4 - off % 4) % 4; if (pad) { bin.push(new Uint8Array(pad)); off += pad; } gltf.bufferViews.push({ buffer: 0, byteOffset: off, byteLength: u8.length, target }); bin.push(u8); off += u8.length; return gltf.bufferViews.length - 1; };
  for (const p of parts) {
    const pos = new Float32Array(p.g.P), nor = new Float32Array(p.g.N), idx = new Uint16Array(p.g.I);
    const mn = [0, 1, 2].map(i => Math.min(...p.g.P.filter((_, j) => j % 3 === i))), mx = [0, 1, 2].map(i => Math.max(...p.g.P.filter((_, j) => j % 3 === i)));
    const a = (bv, ct, count, type, extra) => { gltf.accessors.push({ bufferView: bv, componentType: ct, count, type, ...extra }); return gltf.accessors.length - 1; };
    const aPos = a(add(pos, 34962), 5126, 24, 'VEC3', { min: mn, max: mx }), aNor = a(add(nor, 34962), 5126, 24, 'VEC3'), aIdx = a(add(idx, 34963), 5123, 36, 'SCALAR');
    gltf.materials.push({ name: p.name, pbrMetallicRoughness: { baseColorFactor: p.color, metallicFactor: 0, roughnessFactor: 0.8 } });
    gltf.meshes.push({ name: p.name, primitives: [{ attributes: { POSITION: aPos, NORMAL: aNor }, indices: aIdx, material: gltf.materials.length - 1 }] });
    gltf.nodes.push({ name: p.name, mesh: gltf.meshes.length - 1 }); gltf.scenes[0].nodes.push(gltf.nodes.length - 1);
  }
  if (rootScale) { const kids = gltf.scenes[0].nodes; gltf.nodes.push({ name: 'raiz_escala', scale: [rootScale, rootScale, rootScale], children: kids }); gltf.scenes[0].nodes = [gltf.nodes.length - 1]; }
  gltf.buffers[0].byteLength = off;
  const pad4 = (u8, v) => { const n = (4 - u8.length % 4) % 4; if (!n) return u8; const o = new Uint8Array(u8.length + n).fill(v); o.set(u8); return o; };
  const json = pad4(new TextEncoder().encode(JSON.stringify(gltf)), 0x20);
  let binAll = new Uint8Array(off); let c = 0; for (const b of bin) { binAll.set(b, c); c += b.length; } binAll = pad4(binAll, 0);
  const total = 12 + 8 + json.length + 8 + binAll.length, h = new DataView(new ArrayBuffer(12));
  h.setUint32(0, 0x46546C67, true); h.setUint32(4, 2, true); h.setUint32(8, total, true);
  const jh = new DataView(new ArrayBuffer(8)); jh.setUint32(0, json.length, true); jh.setUint32(4, 0x4E4F534A, true);
  const bh = new DataView(new ArrayBuffer(8)); bh.setUint32(0, binAll.length, true); bh.setUint32(4, 0x004E4942, true);
  return Buffer.concat([Buffer.from(h.buffer), Buffer.from(jh.buffer), json, Buffer.from(bh.buffer), binAll]);
}
fs.writeFileSync(path.join(out, 'axes_METROS.glb'), build(1));
fs.writeFileSync(path.join(out, 'axes_MILIMETROS.glb'), build(1000));
fs.writeFileSync(path.join(out, 'axes_MILIMETROS_nodo_escala.glb'), build(1000, 0.001));
console.log('GLB de calibración escritos en', out);
