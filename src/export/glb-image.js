// A8.2 — Codificación de texturas a bytes de imagen para el GLB: data URL → bytes, y textura (lienzo o imagen) → PNG con un lienzo desconectado.
// Texto idéntico al de src/main.js de a322d7a salvo la sangría (docs/fase1/A8_PROPUESTA.md §4.1). Único módulo de export/ con DOM (document, HTMLCanvasElement), solo dentro de
// textureToImageBytes; el log de su rama de fallo está dentro de un try/catch silencioso, así que su cableado lo vigila la prueba E4. THREE no interviene.

export function createGlbImage(deps){
  var { log } = deps;

  function bytesFromDataURL(dataURL){
    var parts = String(dataURL||'').split(',');
    var meta = parts[0] || '';
    var base64 = parts[1] || '';
    var mimeMatch = meta.match(/data:([^;]+)/i);
    var mime = mimeMatch ? mimeMatch[1] : 'application/octet-stream';
    var bin = atob(base64);
    var out = new Uint8Array(bin.length);
    for(var i=0;i<bin.length;i++) out[i] = bin.charCodeAt(i);
    return { mime:mime, bytes:out };
  }

  function textureToImageBytes(texture){
    if(!texture || !texture.image) return null;
    var img = texture.image;
    try{
      if(typeof HTMLCanvasElement !== 'undefined' && img instanceof HTMLCanvasElement){
        return bytesFromDataURL(img.toDataURL('image/png'));
      }
    }catch(ex0){}
    try{
      var w = img.naturalWidth || img.videoWidth || img.width;
      var h = img.naturalHeight || img.videoHeight || img.height;
      if(!w || !h) return null;
      var cvs = document.createElement('canvas');
      cvs.width = w; cvs.height = h;
      var ictx = cvs.getContext('2d');
      ictx.drawImage(img,0,0,w,h);
      return bytesFromDataURL(cvs.toDataURL('image/png'));
    }catch(ex1){
      try{ log('Texture image encode failed: '+ex1.message); }catch(exlog){}
      return null;
    }
  }

  return { bytesFromDataURL, textureToImageBytes };
}
