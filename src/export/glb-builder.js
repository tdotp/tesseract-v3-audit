// A8.4 — Constructor del GLB: clave de deduplicación de materiales y ensamblado del contenedor binario glTF 2.0 (JSON + BIN) a partir de la lista de mallas en espacio MUNDO.
// Texto idéntico al de src/main.js de a322d7a salvo la sangría (docs/fase1/A8_PROPUESTA.md §4.1). Recibe inyectadas buildExportSceneMeshes (glb-scene) y textureToImageBytes (glb-image);
// no lee S ni toca el DOM. Conserva las invariantes I-G1…G6 (orden de nodos, materiales, imágenes, vistas y claves del JSON; alineación a 4 B; constantes de KI-03). THREE es el global de index.html.
import { padBytes, toUint8View } from './glb-bytes.js';

export function createGlbBuilder(deps){
  var { buildExportSceneMeshes, textureToImageBytes } = deps;

  function materialKey(mat){
    if(!mat) return 'default';
    var c = mat.color ? mat.color.getHexString() : 'ffffff';
    var op = (mat.opacity!==undefined ? mat.opacity : 1);
    var ds = (mat.side===THREE.DoubleSide) ? 'd' : 's';
    var mapId = (mat.map && (mat.map.uuid || (mat.map.image && (mat.map.image.currentSrc || mat.map.image.src)) )) || 'nomap';
    return [c,op,ds,mapId].join('|');
  }

  function buildGLBBlobFromCurrentView(){
    var meshes = buildExportSceneMeshes();
    if(!meshes.length) throw new Error('Nothing exportable in current 3D view');

    var gltf = {
      asset:{version:'2.0', generator:'Tesseract Phase 7B'},
      scene:0,
      scenes:[{nodes:[]}],
      nodes:[],
      meshes:[],
      materials:[],
      accessors:[],
      bufferViews:[],
      buffers:[{byteLength:0}]
    };

    var binaryParts = [];
    var byteOffset = 0;
    function appendBytes(u8, target){
      var pad = (4 - (byteOffset % 4)) % 4;
      if(pad){ binaryParts.push(new Uint8Array(pad)); byteOffset += pad; }
      var viewIndex = gltf.bufferViews.length;
      gltf.bufferViews.push({ buffer:0, byteOffset:byteOffset, byteLength:u8.length });
      if(target) gltf.bufferViews[viewIndex].target = target;
      binaryParts.push(u8);
      byteOffset += u8.length;
      return viewIndex;
    }
    function addAccessorFromTyped(typed, type, componentType, target, extras){
      var viewIndex = appendBytes(toUint8View(typed), target);
      var acc = { bufferView:viewIndex, componentType:componentType, count: typed.length / ({SCALAR:1,VEC2:2,VEC3:3,VEC4:4}[type]||1), type:type };
      if(extras){ for(var k in extras) acc[k]=extras[k]; }
      var accIndex = gltf.accessors.length;
      gltf.accessors.push(acc);
      return accIndex;
    }

    var samplerIndex = null;
    var textureMap = {};
    var materialMap = {};

    function ensureSampler(){
      if(gltf.samplers && gltf.samplers.length) return 0;
      gltf.samplers = [{ magFilter:9729, minFilter:9729, wrapS:10497, wrapT:10497 }];
      return 0;
    }

    function ensureTexture(texture){
      if(!texture || !texture.image) return null;
      var key = texture.uuid || (texture.image.currentSrc || texture.image.src || ('tex_'+Object.keys(textureMap).length));
      if(textureMap[key]!==undefined) return textureMap[key];
      var imgBytes = textureToImageBytes(texture);
      if(!imgBytes || !imgBytes.bytes || !imgBytes.bytes.length) return null;
      var imgView = appendBytes(imgBytes.bytes, null);
      if(!gltf.images) gltf.images = [];
      if(!gltf.textures) gltf.textures = [];
      var imgIndex = gltf.images.length;
      gltf.images.push({ bufferView:imgView, mimeType: imgBytes.mime || 'image/png', name:'image_'+imgIndex });
      var texIndex = gltf.textures.length;
      gltf.textures.push({ sampler: ensureSampler(), source: imgIndex, name:'texture_'+texIndex });
      textureMap[key] = texIndex;
      return texIndex;
    }

    function ensureMaterial(mat){
      var key = materialKey(mat);
      if(materialMap[key]!==undefined) return materialMap[key];
      var color = mat && mat.color ? mat.color : new THREE.Color(0xffffff);
      var alpha = (mat && mat.opacity!==undefined) ? mat.opacity : 1;
      var out = {
        name: 'mat_'+gltf.materials.length,
        pbrMetallicRoughness: {
          baseColorFactor: [color.r, color.g, color.b, alpha],
          metallicFactor: 0,
          roughnessFactor: 1
        },
        doubleSided: true
      };
      if(mat && mat.map){
        var texIndex = ensureTexture(mat.map);
        if(texIndex!==null) out.pbrMetallicRoughness.baseColorTexture = { index: texIndex };
      }
      if(alpha < 0.999 || (mat && mat.transparent)) out.alphaMode = 'BLEND';
      var idx = gltf.materials.length;
      gltf.materials.push(out);
      materialMap[key] = idx;
      return idx;
    }

    meshes.forEach(function(meshInfo){
      var attr = {};
      attr.POSITION = addAccessorFromTyped(meshInfo.positions, 'VEC3', 5126, 34962, { min: meshInfo.min, max: meshInfo.max });
      if(meshInfo.normals) attr.NORMAL = addAccessorFromTyped(meshInfo.normals, 'VEC3', 5126, 34962);
      if(meshInfo.uvs) attr.TEXCOORD_0 = addAccessorFromTyped(meshInfo.uvs, 'VEC2', 5126, 34962);
      var idxType = (meshInfo.indices instanceof Uint32Array) ? 5125 : 5123;
      var indicesAccessor = addAccessorFromTyped(meshInfo.indices, 'SCALAR', idxType, 34963);
      var primitive = { attributes: attr, indices: indicesAccessor, material: ensureMaterial(meshInfo.material), mode: 4 };
      var meshIndex = gltf.meshes.length;
      gltf.meshes.push({ name: meshInfo.name, primitives:[primitive] });
      var nodeIndex = gltf.nodes.length;
      gltf.nodes.push({ mesh: meshIndex, name: meshInfo.name });
      gltf.scenes[0].nodes.push(nodeIndex);
    });

    var totalBinLen = 0;
    binaryParts.forEach(function(p){ totalBinLen += p.length; });
    gltf.buffers[0].byteLength = totalBinLen;

    var enc = new TextEncoder();
    var jsonBytes = padBytes(enc.encode(JSON.stringify(gltf)), 0x20);
    var binBytes = new Uint8Array(totalBinLen);
    var cursor = 0;
    binaryParts.forEach(function(p){ binBytes.set(p, cursor); cursor += p.length; });
    var binPadded = padBytes(binBytes, 0x00);

    var totalLen = 12 + 8 + jsonBytes.length + 8 + binPadded.length;
    var header = new ArrayBuffer(12);
    var hv = new DataView(header);
    hv.setUint32(0, 0x46546C67, true);
    hv.setUint32(4, 2, true);
    hv.setUint32(8, totalLen, true);

    var jsonHeader = new ArrayBuffer(8);
    var jv = new DataView(jsonHeader);
    jv.setUint32(0, jsonBytes.length, true);
    jv.setUint32(4, 0x4E4F534A, true);

    var binHeader = new ArrayBuffer(8);
    var bv = new DataView(binHeader);
    bv.setUint32(0, binPadded.length, true);
    bv.setUint32(4, 0x004E4942, true);

    return new Blob([header, jsonHeader, jsonBytes, binHeader, binPadded], { type:'model/gltf-binary' });
  }

  return { materialKey, buildGLBBlobFromCurrentView };
}
