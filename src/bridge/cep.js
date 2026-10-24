// Puente CEP (A5.3): única puerta a window.__adobe_cep__. Se consulta en CADA llamada, nunca al cargar el módulo (CEP o el shim de pruebas
// lo instalan antes de usar el panel). evalScriptJSON y pathToFileURL son copia literal de panel/main.js (referencia A1).
export function hasCep(){ return !!window.__adobe_cep__; }

// Envía el script tal cual; la interpretación del resultado es de quien llama (Test Connection y Extract conservan su propio manejo).
export function evalScript(script, callback){ window.__adobe_cep__.evalScript(script, callback); }

export function pathToFileURL(fsPath){
  var path = String(fsPath || '');
  if(!path) return '';
  if(/^file:\/\//i.test(path)) return path;
  path = path.replace(/\\/g,'/');
  if(path.charAt(0)!=='/') path = '/' + path;
  return 'file://' + encodeURI(path);
}

export function evalScriptJSON(script){
  return new Promise(function(resolve,reject){
    window.__adobe_cep__.evalScript(script,function(result){
      try{
        if(!result || result==='undefined' || result==='null' || result==='EvalScript error.') throw new Error(String(result || 'No result returned'));
        var parsed = JSON.parse(result);
        if(parsed && parsed.error) throw new Error(parsed.error);
        resolve(parsed);
      }catch(err){
        reject(err);
      }
    });
  });
}
