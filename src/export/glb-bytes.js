// A8.1 — Ayudantes puros de la exportación GLB: relleno a múltiplo de 4, vista Uint8Array y lista → typed array. Sin THREE, DOM, window ni estado.
// Texto idéntico al de src/main.js de a322d7a salvo la sangría y «export» (docs/fase1/A8_PROPUESTA.md §4.1). Los usan buildExportSceneMeshes y buildGLBBlobFromCurrentView.

export function padBytes(u8, padVal){
  var pad = (4 - (u8.length % 4)) % 4;
  if(!pad) return u8;
  var out = new Uint8Array(u8.length + pad);
  out.set(u8,0);
  for(var i=u8.length;i<out.length;i++) out[i] = padVal || 0;
  return out;
}

export function toUint8View(typed){
  return new Uint8Array(typed.buffer, typed.byteOffset||0, typed.byteLength);
}

export function typedArrayFromList(list, ctor){
  var arr = new ctor(list.length);
  for(var i=0;i<list.length;i++) arr[i] = list[i];
  return arr;
}
