// A8 — Utilidades de las pruebas del subsistema de exportación GLB (docs/fase1/A8_PROPUESTA.md §6).
//  · Referencia de texto de A8: el src/main.js del commit a322d7a (A7 validada en el CEP real) y, para las 8 funciones, también panel/main.js y el baseline.
//  · N4: ejecución diferencial en Node de las funciones de exportación sobre escenas sintéticas con three.js r132 REAL (el de panel/libs), sin navegador.
//  · Esqueleto de un GLB: todo salvo los bytes de las imágenes PNG y los desplazamientos (para comparar archivos con arte sin exigir el mismo codificador PNG).
import fs from 'node:fs'; import path from 'node:path'; import vm from 'node:vm'; import crypto from 'node:crypto'; import { execFileSync } from 'node:child_process'; import { pathToFileURL } from 'node:url';
import { ROOT } from './fixtures.mjs'; import { TARGETS, extractFunctions } from './legacy.mjs'; import { SRC, srcFiles, functionsAnyIndent } from './a7.mjs'; import { parseGLB } from './glb.mjs';

export const A8_REF = 'a322d7a';
export const refMain = () => execFileSync('git', ['-C', ROOT, 'show', `${A8_REF}:src/main.js`], { encoding: 'utf8' });
// Las 8 funciones que A8.1–A8.4 mueven (exportPNG, exportGLB y el manejador se quedan en main.js: D-A8-2).
export const EXPORT_FUNCTIONS = ['bytesFromDataURL', 'textureToImageBytes', 'padBytes', 'toUint8View', 'typedArrayFromList', 'buildExportSceneMeshes', 'materialKey', 'buildGLBBlobFromCurrentView'];
export const sha256 = (b) => crypto.createHash('sha256').update(b).digest('hex');
export const REAL_GLB_DIR = path.join(ROOT, 'docs/fase1/a7-real/glb');
export const REAL_GLB = { plano: 'paridad-caja-plano.glb', todas60: 'paridad-caja-todas60.glb', arte: 'paridad-arte.glb' };
export const REAL_SHA = { plano: '737bcd2312da1191a57f5b6530749ffd6bf20b6dd1737c454a62d7f38d8e40b4', todas60: '87aa2e4c5cc39092e4b040b77f713bc371f6e7c8b47cc56b8711cb5167275017', arte: 'b4973a54840cd0c1a58e6018fd4927369dd5df5a72d23c3465ed25059dcdd1f6' };
export const readReal = (k) => fs.readFileSync(path.join(REAL_GLB_DIR, REAL_GLB[k]));
// Rectángulo del artboard de N0-B tal como lo devolvió buildArtworkExportScript en Illustrator real (docs/fase1/nivel0-real/N0-B_caja_simple_arte.svg__art.json).
export const N0B_RECT = { left: 0, top: 99.9999991594849, right: 140.000005282837, bottom: 0, width: 140.000005282837, height: 99.9999991594849 };

// ───────────────────────── Esqueleto y comparación estructural de GLB ─────────────────────────
export function imageViewSet(g) { return new Set((g.json.images || []).map((i) => i.bufferView)); }
export function imageBytes(g) { return (g.json.images || []).map((im) => { const bv = g.json.bufferViews[im.bufferView]; return g.bin.subarray(bv.byteOffset, bv.byteOffset + bv.byteLength); }); }
// JSON sin desplazamientos (byteOffset), sin la longitud del buffer y sin la longitud de las vistas de imagen: lo único que puede variar si cambia el codificador PNG.
export function skeleton(g) {
  const j = JSON.parse(JSON.stringify(g.json)); const iv = imageViewSet(g);
  j.bufferViews.forEach((v, i) => { delete v.byteOffset; if (iv.has(i)) delete v.byteLength; }); delete j.buffers[0].byteLength; return j;
}
// Compara dos GLB sin exigir bytes de imagen iguales. Devuelve el detalle para el informe (equivalencia ESTRUCTURAL, separada de la BINARIA).
export function compareStructural(a, b) {
  const ga = parseGLB(a), gb = parseGLB(b); const sa = skeleton(ga), sb = skeleton(gb);
  const vistasDistintas = []; const iva = imageViewSet(ga);
  ga.json.bufferViews.forEach((v, i) => { if (iva.has(i)) return; const w = gb.json.bufferViews[i]; if (!w) { vistasDistintas.push(i); return; }
    if (!ga.bin.subarray(v.byteOffset, v.byteOffset + v.byteLength).equals(gb.bin.subarray(w.byteOffset, w.byteOffset + w.byteLength))) vistasDistintas.push(i); });
  const ia = imageBytes(ga), ib = imageBytes(gb);
  return { esqueletoJson: JSON.stringify(sa) === JSON.stringify(sb), ordenClaves: Object.keys(ga.json).join() === Object.keys(gb.json).join(), nVistas: [ga.json.bufferViews.length, gb.json.bufferViews.length],
    vistasNoImagenDistintas: vistasDistintas, imagenes: ia.length === ib.length ? ia.map((x, i) => ({ bytesA: x.length, bytesB: ib[i].length, binarioIdentico: x.equals(ib[i]), dims: [pngDims(x), pngDims(ib[i])] })) : { nA: ia.length, nB: ib.length } };
}
// Alineación y relleno del contenedor (invisibles en la comparación por contenido): cada vista empieza en múltiplo de 4, los huecos entre vistas son de 0-3 bytes a cero,
// el JSON se rellena con 0x20, el BIN con 0x00 y ambos chunks miden múltiplo de 4.
export function alignmentOf(buf) {
  const g = parseGLB(buf), jl = buf.readUInt32LE(12), bo = 20 + jl, bl = buf.readUInt32LE(bo); const jsonChunk = buf.subarray(20, 20 + jl);
  const vs = g.json.bufferViews.map((v) => ({ o: v.byteOffset, l: v.byteLength })).sort((x, y) => x.o - y.o); let huecosOk = true, fin = 0;
  for (const v of vs) { const gap = g.bin.subarray(fin, v.o); if (gap.length > 3 || gap.some((x) => x !== 0)) huecosOk = false; fin = v.o + v.l; }
  const cola = g.bin.subarray(fin); const jsonTxt = jsonChunk.toString('utf8'); const util = JSON.stringify(g.json).length;
  return { vistasAlineadas: g.json.bufferViews.every((v) => v.byteOffset % 4 === 0), huecosOk, colaBinOk: cola.length <= 3 && cola.every((x) => x === 0), chunksMultiplo4: jl % 4 === 0 && bl % 4 === 0, relleno20: jsonChunk.subarray(Buffer.byteLength(JSON.stringify(g.json))).every((x) => x === 0x20), jsonTermina: jsonTxt.trimEnd().endsWith('}'), longitudCabecera: buf.readUInt32LE(8) === buf.length, util };
}
export function pngDims(buf) { return buf.readUInt32BE(0) === 0x89504e47 ? [buf.readUInt32BE(16), buf.readUInt32BE(20)] : null; }
// Resumen de estructura por nodo para el golden «estructura del GLB» (sin desplazamientos ni longitudes de imagen).
export function structureOf(buf) {
  const g = parseGLB(buf), j = g.json, iv = imageViewSet(g);
  return { claves: Object.keys(j), asset: j.asset, escena: j.scenes, nodos: j.nodes.map((n, i) => { const p = j.meshes[n.mesh].primitives[0]; const acc = (k) => (k === undefined ? null : j.accessors[k]);
      const vistas = [p.attributes.POSITION, p.attributes.NORMAL, p.attributes.TEXCOORD_0, p.indices].map((k) => (k === undefined ? null : [j.accessors[k].type, j.accessors[k].componentType, j.accessors[k].count, j.bufferViews[j.accessors[k].bufferView].byteLength, j.bufferViews[j.accessors[k].bufferView].target]));
      return { nombre: n.name, malla: j.meshes[n.mesh].name, material: p.material, modo: p.mode, vistas, minmax: acc(p.attributes.POSITION) && [acc(p.attributes.POSITION).min, acc(p.attributes.POSITION).max] }; }),
    materiales: j.materials, imagenes: (j.images || []).map((im) => ({ ...im, imagenVista: im.bufferView, esVistaImagen: iv.has(im.bufferView) })), texturas: j.textures || null, samplers: j.samplers || null, vistasTotal: j.bufferViews.length, accesores: j.accessors.length };
}

// ───────────────────────── N4: entorno Node con three.js r132 real ─────────────────────────
let envReady = false;
export function setupEnv() {
  if (envReady) return; envReady = true;
  vm.runInThisContext(fs.readFileSync(path.join(ROOT, 'panel/libs/three.min.js'), 'utf8'), { filename: 'three.min.js' });
  if (globalThis.THREE.REVISION !== '132') throw new Error('three.js r132 esperado, hay ' + globalThis.THREE.REVISION);
  // Lienzo y documento simulados: el «PNG» es una cadena determinista derivada de la identidad de la imagen y su tamaño (distingue texturas y su orden).
  globalThis.HTMLCanvasElement = class HTMLCanvasElement {
    constructor(w, h, id) { this.width = w; this.height = h; this.__id = id; }
    toDataURL(t) { return 'data:' + (t || 'image/png') + ';base64,' + Buffer.from('PNG:' + this.__id + ':' + this.width + 'x' + this.height).toString('base64'); }
    getContext() { const self = this; return { drawImage(img) { if (img && img.__fail) throw new Error('drawImage boom'); self.__id = img ? img.__id : 'none'; } }; } };
  globalThis.document = { createElement(tag) { if (tag !== 'canvas') throw new Error('createElement(' + tag + ') no simulado'); return new globalThis.HTMLCanvasElement(0, 0, 'nuevo'); } };
}
export function mulberry32(a) { return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

// Adaptador de objetivos. baseline y panel: las 8 funciones se evalúan por TEXTO con la variable de clausura `scene3d`. src: cada función se toma del módulo ES real si ya
// vive en src/export/ (A8.1+), y por texto de src/main.js (con `S.`) si todavía no. Así el mismo test sirve en cada paso.
const MODULE_LAYOUT = { // archivo → cómo se obtiene lo que exporta
  'export/glb-bytes.js': async (m) => ({ padBytes: m.padBytes, toUint8View: m.toUint8View, typedArrayFromList: m.typedArrayFromList }),
  'export/glb-image.js': async (m, ctx) => m.createGlbImage({ log: ctx.log }),
  'export/glb-scene.js': async (m, ctx) => m.createGlbScene(ctx.S),
  'export/glb-builder.js': async (m, ctx, got) => { for (const d of ['buildExportSceneMeshes', 'textureToImageBytes']) if (typeof got[d] !== 'function') throw new Error('glb-builder.js: la dependencia ' + d + ' no está cargada (orden de MODULE_ORDER)');
    return m.createGlbBuilder({ buildExportSceneMeshes: got.buildExportSceneMeshes, textureToImageBytes: got.textureToImageBytes }); } };
// A8.4: orden de carga EXPLÍCITO (orden de composición de main.js), no alfabético: glb-builder.js recibe lo que exportan glb-image.js y glb-scene.js, así que va el último.
export const MODULE_ORDER = ['export/glb-bytes.js', 'export/glb-image.js', 'export/glb-scene.js', 'export/glb-builder.js'];
export function orderExportFiles(files) { const out = files.filter((f) => /^export\//.test(f)); for (const f of out) if (!MODULE_ORDER.includes(f)) throw new Error('módulo de export/ sin lugar en MODULE_ORDER: ' + f);
  return out.sort((a, b) => MODULE_ORDER.indexOf(a) - MODULE_ORDER.indexOf(b)); }
export async function loadExporter(target, scene, log) {
  setupEnv(); const S = { scene3d: scene }; const ctx = { S, log }; const got = {};
  if (target === 'baseline' || target === 'panel') {
    const fns = extractFunctions(fs.readFileSync(TARGETS[target], 'utf8')); const body = EXPORT_FUNCTIONS.map((n) => { if (!fns.has(n)) throw new Error(target + ': falta ' + n); return fns.get(n); }).join('\n');
    return new Function('log', 'scene3d', `${body}\nreturn { ${EXPORT_FUNCTIONS.join(', ')} };`)(log, scene);
  }
  if (target !== 'src') throw new Error('objetivo desconocido: ' + target);
  const files = srcFiles(); const where = {};
  for (const f of orderExportFiles(files)) { const mod = await import(pathToFileURL(path.join(SRC, f)).href); if (!MODULE_LAYOUT[f]) throw new Error('módulo de export/ sin adaptador N4: ' + f); const antes = new Set(Object.keys(got)); Object.assign(got, await MODULE_LAYOUT[f](mod, ctx, got)); for (const n of Object.keys(got)) if (!antes.has(n)) where[n] = f; }
  const rest = EXPORT_FUNCTIONS.filter((n) => !(n in got)); const mainFns = functionsAnyIndent(fs.readFileSync(path.join(SRC, 'main.js'), 'utf8')).filter((f) => f.indent === 4);
  const body = rest.map((n) => { const f = mainFns.find((x) => x.name === n); if (!f) throw new Error('src/main.js: falta ' + n); return f.text; }).join('\n');
  const names = Object.keys(got); const fn = new Function('S', 'log', ...names, `${body}\nreturn { ${rest.join(', ')} };`); const loc = fn(S, log, ...names.map((k) => got[k]));
  const origen = Object.fromEntries(EXPORT_FUNCTIONS.map((n) => [n, where[n] || 'main.js']));
  return { ...got, ...loc, __origen: origen };
}

// ───────────────────────── Escenas sintéticas ─────────────────────────
const T = () => globalThis.THREE;
function tex(id, img) { const t = new (T().Texture)(img === undefined ? { naturalWidth: 8, naturalHeight: 4, __id: id } : img); return t; }
function customGeom(positions, indices, { normals = null, uvs = null } = {}) {
  const g = new (T().BufferGeometry)(); g.setAttribute('position', new (T().BufferAttribute)(new Float32Array(positions), 3));
  if (normals) g.setAttribute('normal', new (T().BufferAttribute)(new Float32Array(normals), 3)); if (uvs) g.setAttribute('uv', new (T().BufferAttribute)(new Float32Array(uvs), 2));
  if (indices) g.setIndex(indices); return g; }
function tri(off = 0) { return [off, 0, 0, off + 1, 0, 0, off, 1, 0]; }
function newScene() { const s = new (T().Scene)(); return s; }
function addLights(s) { s.add(new (T().AmbientLight)(0xffffff, 0.6)); s.add(new (T().GridHelper)(10, 10)); s.add(new (T().AxesHelper)(5)); }
const mesh = (g, m, name) => { const o = new (T().Mesh)(g, m); if (name) o.name = name; return o; };
const phong = (hex, extra = {}) => new (T().MeshPhongMaterial)({ color: hex, ...extra });
const basic = (extra = {}) => new (T().MeshBasicMaterial)(extra);
export function sceneCases() { // nombre → () => { scene, meta } ; cada llamada crea objetos NUEVOS (uuids distintos)
  const C = {};
  C['vacía'] = () => ({ scene: newScene(), esperaError: 'Nothing exportable in current 3D view' });
  C['solo luces y rejillas'] = () => { const s = newScene(); addLights(s); return { scene: s, esperaError: 'Nothing exportable in current 3D view' }; };
  C['sin escena (null)'] = () => ({ scene: null, esperaError: 'Nothing exportable in current 3D view' });
  C['una caja indexada'] = () => { const s = newScene(); addLights(s); s.add(mesh(new (T().BoxGeometry)(2, 3, 4), phong(0xd9d5cc))); return { scene: s, cubre: 'índices Uint16, normales y UV de BoxGeometry' }; };
  C['extrusión no indexada con TRS anidados'] = () => { const s = newScene(); const sh = new (T().Shape)(); sh.moveTo(0, 0); sh.lineTo(10, 0); sh.lineTo(10, 6); sh.lineTo(0, 6); sh.closePath();
    const g1 = new (T().Group)(); g1.position.set(3, -2, 1); g1.rotation.set(0.3, 0.7, -0.2); g1.scale.set(1, 2, 0.5); const g2 = new (T().Group)(); g2.rotation.z = Math.PI / 5; g2.position.x = 7;
    g2.add(mesh(new (T().ExtrudeGeometry)(sh, { depth: 0.25, bevelEnabled: false }), phong(0xe9e7dd), '')); g1.add(g2); s.add(g1); return { scene: s, cubre: 'matrixWorld con escala no uniforme (normalMatrix), geometría sin índice' }; };
  C['geometría sin normales ni UV'] = () => { const s = newScene(); s.add(mesh(customGeom([...tri(0), ...tri(2)], [0, 1, 2, 3, 4, 5]), phong(0x336699))); return { scene: s, cubre: 'computeVertexNormals en el clon, sin UV' }; };
  C['geometría sin índice'] = () => { const s = newScene(); s.add(mesh(customGeom([...tri(0), ...tri(2)], null, { uvs: [0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1] }), phong(0x993366))); return { scene: s, cubre: 'índices secuenciales' }; };
  C['índices Uint32 (máximo ≥ 65535)'] = () => { const s = newScene(); const n = 65540; const pos = new Array(n * 3).fill(0); pos.splice(0, 9, ...tri(0)); pos.splice(65535 * 3, 9, ...tri(5));
    s.add(mesh(customGeom(pos, [0, 1, 2, 65535, 65536, 65537]), phong(0x112233))); return { scene: s, cubre: 'componentType 5125' }; };
  C['máximo justo 65534 (Uint16)'] = () => { const s = newScene(); const n = 65540; const pos = new Array(n * 3).fill(0); pos.splice(0, 9, ...tri(0)); pos.splice(65532 * 3, 9, ...tri(5));
    s.add(mesh(customGeom(pos, [0, 1, 2, 65532, 65533, 65534]), phong(0x112233))); return { scene: s, cubre: 'frontera del umbral 65535' }; };
  C['máximo justo 65535 (Uint32)'] = () => { const s = newScene(); const n = 65540; const pos = new Array(n * 3).fill(0); pos.splice(0, 9, ...tri(0)); pos.splice(65533 * 3, 9, ...tri(5));
    s.add(mesh(customGeom(pos, [0, 1, 2, 65533, 65534, 65535]), phong(0x112233))); return { scene: s, cubre: 'frontera del umbral 65535' }; };
  C['malla con opacidad 0.005 transparente (se omite)'] = () => { const s = newScene(); s.add(mesh(new (T().BoxGeometry)(1, 1, 1), phong(0xff0000, { transparent: true, opacity: 0.005 }))); s.add(mesh(new (T().BoxGeometry)(1, 1, 1), phong(0x00ff00))); return { scene: s, cubre: 'filtro opacity < 0.01' }; };
  C['opacidad 0.005 sin transparent (se exporta)'] = () => { const s = newScene(); s.add(mesh(new (T().BoxGeometry)(1, 1, 1), phong(0xff0000, { opacity: 0.005 }))); return { scene: s, cubre: 'el filtro exige transparent' }; };
  C['opacidad 0.01 exacta (se exporta)'] = () => { const s = newScene(); s.add(mesh(new (T().BoxGeometry)(1, 1, 1), phong(0xff0000, { transparent: true, opacity: 0.01 }))); return { scene: s, cubre: 'frontera del filtro (< 0.01)' }; };
  C['roles pickCrease y panelLabel (se omiten)'] = () => { const s = newScene(); const a = mesh(new (T().BoxGeometry)(1, 1, 1), phong(0x111111)); a.userData = { role: 'pickCrease' }; const b = mesh(new (T().BoxGeometry)(1, 1, 1), phong(0x222222)); b.userData = { role: 'panelLabel' };
    const c = mesh(new (T().BoxGeometry)(1, 1, 1), phong(0x333333)); c.userData = { role: 'foldBridgeTop', edgeIdx: 1 }; s.add(a, b, c); return { scene: s, cubre: 'filtro de roles y nombre por rol' }; };
  C['Line, LineSegments y Sprite no son mallas'] = () => { const s = newScene(); s.add(new (T().LineSegments)(new (T().BufferGeometry)(), new (T().LineBasicMaterial)())); s.add(new (T().Sprite)(new (T().SpriteMaterial)())); s.add(mesh(new (T().BoxGeometry)(1, 1, 1), phong(0x445566))); return { scene: s, cubre: 'isMesh' }; };
  C['mallas con y sin nombre'] = () => { const s = newScene(); s.add(mesh(new (T().BoxGeometry)(1, 1, 1), phong(0x010101), 'panelA')); s.add(mesh(new (T().BoxGeometry)(1, 1, 1), phong(0x020202))); const r = mesh(new (T().BoxGeometry)(1, 1, 1), phong(0x030303)); r.userData = { role: 'rol' }; s.add(r); s.add(mesh(new (T().BoxGeometry)(1, 1, 1), phong(0x040404))); return { scene: s, cubre: 'nombre: name || role || mesh_<índice de la lista exportada>' }; };
  C['material repetido (deduplicación) y distinto por opacidad/lado'] = () => { const s = newScene(); const m1 = phong(0xaaaaaa); const m2 = phong(0xaaaaaa); const m3 = phong(0xaaaaaa, { opacity: 0.5, transparent: true }); const m4 = phong(0xaaaaaa, { side: T().DoubleSide });
    for (const m of [m1, m2, m3, m4, m1]) s.add(mesh(new (T().BoxGeometry)(1, 1, 1), m)); return { scene: s, cubre: 'materialKey: color|opacidad|lado|mapa' }; };
  C['material sin color y material ausente'] = () => { const s = newScene(); const a = mesh(new (T().BoxGeometry)(1, 1, 1), basic({ transparent: false })); a.material = undefined; s.add(a); const b = mesh(new (T().BoxGeometry)(1, 1, 1), new (T().ShaderMaterial)()); s.add(b); return { scene: s, cubre: 'material undefined y sin color' }; };
  C['textura compartida por dos materiales distintos'] = () => { const s = newScene(); const t = tex('compartida'); s.add(mesh(new (T().PlaneGeometry)(1, 1), basic({ map: t, transparent: true, side: T().DoubleSide }))); s.add(mesh(new (T().PlaneGeometry)(2, 2), basic({ map: t, transparent: true, side: T().DoubleSide })));
    s.add(mesh(new (T().PlaneGeometry)(3, 3), basic({ map: t, color: 0x808080 }))); return { scene: s, cubre: 'una imagen, un sampler, varios materiales según color' }; };
  C['dos texturas distintas con igual color'] = () => { const s = newScene(); s.add(mesh(new (T().PlaneGeometry)(1, 1), basic({ map: tex('frontal'), transparent: true }))); s.add(mesh(new (T().PlaneGeometry)(1, 1), basic({ map: tex('trasera'), transparent: true }))); return { scene: s, cubre: 'orden de imágenes y texturas por primer uso' }; };
  C['textura con lienzo (HTMLCanvasElement)'] = () => { const s = newScene(); s.add(mesh(new (T().PlaneGeometry)(1, 1), basic({ map: new (T().Texture)(new globalThis.HTMLCanvasElement(16, 8, 'lienzo')), transparent: true }))); return { scene: s, cubre: 'rama img instanceof HTMLCanvasElement' }; };
  C['textura sin imagen o sin tamaño'] = () => { const s = newScene(); s.add(mesh(new (T().PlaneGeometry)(1, 1), basic({ map: new (T().Texture)(), transparent: true }))); s.add(mesh(new (T().PlaneGeometry)(1, 1), basic({ map: tex('sinTamaño', { __id: 'x' }) }))); return { scene: s, cubre: 'textureToImageBytes → null' }; };
  C['textura cuyo dibujo falla (log «Texture image encode failed»)'] = () => { const s = newScene(); s.add(mesh(new (T().PlaneGeometry)(1, 1), basic({ map: tex('rota', { naturalWidth: 4, naturalHeight: 4, __id: 'rota', __fail: true }), transparent: true }))); s.add(mesh(new (T().PlaneGeometry)(1, 1), basic({ map: tex('buena') }))); return { scene: s, cubre: 'rama de fallo y log' }; };
  C['material con matriz de materiales (arreglo)'] = () => { const s = newScene(); s.add(mesh(new (T().BoxGeometry)(1, 1, 1), [phong(0x111111), phong(0x222222)])); return { scene: s, cubre: 'obj.material como arreglo (sin color propio)' }; };
  C['jerarquía profunda con objetos ocultos (visible=false se exporta)'] = () => { const s = newScene(); let p = s; for (let i = 0; i < 6; i++) { const g = new (T().Group)(); g.position.set(i, -i, 0.5 * i); g.rotation.y = 0.1 * i; p.add(g); p = g; } const m = mesh(new (T().BoxGeometry)(1, 1, 1), phong(0xabcdef)); m.visible = false; p.add(m); return { scene: s, cubre: 'visible no se consulta' }; };
  C['orden de recorrido: mallas intercaladas con grupos'] = () => { const s = newScene(); const g = new (T().Group)(); g.add(mesh(new (T().BoxGeometry)(1, 1, 1), phong(0x101010), 'g1')); s.add(mesh(new (T().BoxGeometry)(1, 1, 1), phong(0x202020), 's1')); s.add(g); s.add(mesh(new (T().BoxGeometry)(1, 1, 1), phong(0x303030), 's2')); g.add(mesh(new (T().BoxGeometry)(1, 1, 1), phong(0x404040), 'g2')); return { scene: s, cubre: 'preorden (G1)' }; };
  C['índices de 3 entradas (relleno de alineación entre vistas)'] = () => { const s = newScene(); for (let i = 0; i < 3; i++) s.add(mesh(customGeom(tri(i), [0, 1, 2], { uvs: [0, 0, 1, 0, 0, 1] }), phong(0x123456 + i))); return { scene: s, cubre: 'Uint16 de 6 bytes ⇒ relleno de 2 bytes antes de la vista siguiente' }; };
  C['KI-28: ≥ 125 000 índices'] = () => { const s = newScene(); const n = 130000; const idx = new Array(n).fill(0).map((_, i) => i % 3); s.add(mesh(customGeom(tri(0), idx), phong(0x777777))); return { scene: s, ki28: true, cubre: 'Math.max.apply con muchos índices (RangeError en V8)' }; };
  // aleatorias con semilla fija: mezcla de geometrías, materiales, texturas y jerarquías
  for (let seed = 1; seed <= 16; seed++) C['aleatoria ' + seed] = () => {
    const r = mulberry32(seed * 7919); const s = newScene(); addLights(s); const texs = [tex('A' + seed), tex('B' + seed)]; const groups = [s];
    const nGroups = Math.floor(r() * 4); for (let i = 0; i < nGroups; i++) { const g = new (T().Group)(); g.position.set(r() * 10 - 5, r() * 10 - 5, r() * 2); g.rotation.set(r(), r(), r()); g.scale.set(0.5 + r(), 0.5 + r(), 0.5 + r()); groups[Math.floor(r() * groups.length)].add(g); groups.push(g); }
    const nMesh = 1 + Math.floor(r() * 9); for (let i = 0; i < nMesh; i++) {
      const gk = Math.floor(r() * 5); const g = gk === 0 ? new (T().BoxGeometry)(1 + r(), 1 + r(), 1 + r()) : gk === 1 ? new (T().PlaneGeometry)(1 + r(), 1 + r()) : gk === 2 ? new (T().CylinderGeometry)(1, 1 + r(), 2, 3 + Math.floor(r() * 6)) : gk === 3 ? new (T().ShapeGeometry)(new (T().Shape)([new (T().Vector2)(0, 0), new (T().Vector2)(1 + r(), 0), new (T().Vector2)(r(), 1 + r())])) : customGeom([...tri(0), ...tri(1)], null);
      const mk = Math.floor(r() * 4); const m = mk === 0 ? phong(Math.floor(r() * 0xffffff)) : mk === 1 ? phong(Math.floor(r() * 0xffffff), { transparent: true, opacity: r() < 0.3 ? 0.005 : 0.3 + r() * 0.7 }) : mk === 2 ? basic({ map: texs[Math.floor(r() * 2)], transparent: true, side: T().DoubleSide }) : basic({ color: Math.floor(r() * 0xffffff), side: r() < 0.5 ? T().DoubleSide : T().FrontSide });
      const o = mesh(g, m, r() < 0.4 ? 'n' + i : ''); if (r() < 0.15) o.userData = { role: r() < 0.5 ? 'pickCrease' : 'foldBridgeTop' }; groups[Math.floor(r() * groups.length)].add(o); }
    return { scene: s, cubre: 'mezcla aleatoria (semilla ' + seed + ')' }; };
  return C;
}

// ───────────────────────── Identificadores libres (regla 8 de A8; lección de KI-24) ─────────────────────────
// Un nombre mal cableado dentro de una clausura solo falla AL EJECUTAR esa ruta (así nació KI-24). Esta comprobación estática y deliberadamente tosca (el código es ES5 con
// un estilo regular) lista los identificadores que una función usa sin declarar, para exigir que sean globales esperados o dependencias inyectadas.
const KEYWORDS = new Set('var let const function return if else for while do break continue new typeof instanceof in of this null true false undefined try catch finally throw switch case default void delete async await class extends super import export from yield NaN Infinity'.split(' '));
export const KNOWN_GLOBALS = new Set(['THREE', 'document', 'window', 'HTMLCanvasElement', 'atob', 'btoa', 'TextEncoder', 'Blob', 'DataView', 'Uint8Array', 'Uint16Array', 'Uint32Array', 'Float32Array', 'ArrayBuffer', 'Array', 'Object', 'Math', 'JSON', 'Error', 'String', 'Number', 'isFinite', 'parseFloat', 'parseInt']);
export function freeIdentifiers(fnText) {
  const code0 = fnText.replace(/^\s*\/\/.*$/gm, '').replace(/\/\/[^\n]*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '').replace(/'(?:[^'\\\n]|\\.)*'|"(?:[^"\\\n]|\\.)*"/g, "''");
  const code = code0.replace(/([=(,:!&|]\s*)\/(?![*\/])(?:[^\/\n\\]|\\.)+\/[gimsuy]*/g, '$1'); // literales de expresión regular
  const declared = new Set(); let m;
  // function nombre(a, b) / function(a, b): nombre y parámetros
  const reFn = /function\s*([A-Za-z_$][\w$]*)?\s*\(([^)]*)\)/g; while ((m = reFn.exec(code))) { if (m[1]) declared.add(m[1]); for (const p of m[2].split(',')) { const n = p.trim().replace(/=.*$/, '').trim(); if (n) declared.add(n); } }
  const reImp = /\bimport\s*\{([^}]*)\}\s*from/g; while ((m = reImp.exec(code))) for (const x of m[1].split(',')) { const n = x.split(' as ').pop().trim(); if (n) declared.add(n); }
  const reCatch = /catch\s*\(\s*([A-Za-z_$][\w$]*)\s*\)/g; while ((m = reCatch.exec(code))) declared.add(m[1]);
  // var a = 1, b = [x, y], { c, d } = z; → recorre la lista de declaradores respetando la profundidad de ()[]{}
  const reVar = /\b(?:var|let|const)\s+/g; while ((m = reVar.exec(code))) { let i = m.index + m[0].length, depth = 0, start = true;
    for (; i < code.length; i++) { const c = code[i];
      if (start && /\s/.test(c)) continue;
      if (start) { const mm = /^(?:\{([^}]*)\}|([A-Za-z_$][\w$]*))/.exec(code.slice(i)); if (mm) { if (mm[1] !== undefined) mm[1].split(',').forEach((x) => { const n = x.split(':').pop().trim(); if (n) declared.add(n); }); else declared.add(mm[2]); i += mm[0].length - 1; } start = false; continue; }
      if ('([{'.includes(c)) depth++; else if (')]}'.includes(c)) { if (depth === 0) break; depth--; } else if (c === ';' && depth === 0) break; else if (c === ',' && depth === 0) start = true; else if (c === '\n' && depth === 0 && /^\s*(\}|var\b|if\b|for\b|return\b)/.test(code.slice(i + 1, i + 12)) && !/[,=]\s*$/.test(code.slice(0, i))) break; } }
  const used = new Set(); const reId = /(^|[^\w$.])([A-Za-z_$][\w$]*)/g;
  while ((m = reId.exec(code))) { const id = m[2]; if (KEYWORDS.has(id)) continue; const before = code.slice(0, m.index + m[1].length); const after = code.slice(m.index + m[0].length);
    if (/^\s*:(?!:)/.test(after) && /[{,]\s*$/.test(before)) continue; // clave de objeto literal ({ a: 1, b: 2 })
    used.add(id); }
  return [...used].filter((n) => !declared.has(n)).sort();
}

// Árbol src/ (sin core/) del commit de referencia: [{file, text}]
export function refTree() {
  const names = execFileSync('git', ['-C', ROOT, 'ls-tree', '-r', '--name-only', A8_REF, 'src'], { encoding: 'utf8' }).split('\n').filter((f) => f.endsWith('.js') && !f.startsWith('src/core/'));
  return names.map((n) => ({ file: n.slice(4), text: execFileSync('git', ['-C', ROOT, 'show', `${A8_REF}:${n}`], { encoding: 'utf8' }) }));
}
