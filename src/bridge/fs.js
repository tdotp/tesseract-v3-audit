// Guardado de archivos (A5.4): diálogo «Save GLB» de Illustrator → cep.fs.writeFile en Base64; sin cep.fs, descarga del navegador.
// Copia literal de panel/main.js (referencia A1), incluido el nombre saneado que se calcula y no se usa. Única parte de bridge/ que toca el DOM (descarga).
import { SAVE_GLB_DIALOG_SCRIPT } from '../host/save-dialog.js';

export function triggerDownload(blob, filename){
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(function(){ try{ document.body.removeChild(a); }catch(ex){} URL.revokeObjectURL(url); }, 250);
}

export function blobToBase64(blob){
  return new Promise(function(resolve, reject){
    try{
      var fr = new FileReader();
      fr.onerror = function(){ reject(new Error('Could not read GLB blob')); };
      fr.onloadend = function(){
        try{
          var s = String(fr.result || '');
          var comma = s.indexOf(',');
          resolve(comma >= 0 ? s.slice(comma + 1) : s);
        }catch(ex){ reject(ex); }
      };
      fr.readAsDataURL(blob);
    }catch(ex){ reject(ex); }
  });
}

export function askSavePathViaIllustrator(defaultName){
  return new Promise(function(resolve, reject){
    try{
      var safeName = String(defaultName || 'tesseract_model.glb').replace(/[^A-Za-z0-9._-]+/g,'_');
      var jsx = SAVE_GLB_DIALOG_SCRIPT;
      window.__adobe_cep__.evalScript(jsx, function(result){
        if(result === 'EvalScript error.') return reject(new Error('Illustrator save dialog failed'));
        resolve(String(result || ''));
      });
    }catch(ex){ reject(ex); }
  });
}

export async function saveBlobWithDialog(blob, defaultName){
  var path = await askSavePathViaIllustrator(defaultName || 'tesseract_model.glb');
  if(!path) return { cancelled:true, path:'' };
  if(!(window.cep && window.cep.fs && typeof window.cep.fs.writeFile === 'function')){
    triggerDownload(blob, defaultName || 'tesseract_model.glb');
    return { cancelled:false, path:'', fallback:true };
  }
  var base64 = await blobToBase64(blob);
  var enc = (window.cep.encoding && (window.cep.encoding.Base64 || window.cep.encoding.base64)) || 'Base64';
  var res = window.cep.fs.writeFile(path, base64, enc);
  if(!res || (res.err !== 0 && res.err !== '0')){
    throw new Error('Could not save GLB file' + (res && res.err !== undefined ? ' (err '+res.err+')' : ''));
  }
  return { cancelled:false, path:path };
}
