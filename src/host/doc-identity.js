// 3.0.1-dev (H-05) — Identidad del documento activo de Illustrator, leída en la MISMA llamada que la extracción o el arte (sin vigilancia continua).
// withDocIdentity(script) envuelve un texto ExtendScript que devuelve JSON y responde {"tessDoc": <identidad|null>, "r": <resultado original>}; el script
// interior no cambia (EXTRACT_SCRIPT y buildArtworkExportScript siguen siendo los de siempre). Identidad = nombre + ruta completa (vacía si nunca se
// guardó) + xmpMM:DocumentID del XMP del documento: dos documentos con el mismo nombre se distinguen por la ruta o por el DocumentID. Solo lectura.
const IDENTITY_FN = [
  'function __tessDocIdentity(){',
  '  if(!app.documents.length) return null;',
  '  var d=app.activeDocument, fp="", did="";',
  '  try{ if(String(d.path)!=="") fp=String(d.fullName.fsName); }catch(e1){}',
  '  try{ var m=/xmpMM:DocumentID(?:>|=")([^<"]+)/.exec(String(d.XMPString)); if(m) did=m[1]; }catch(e2){}',
  '  return {name:String(d.name), path:fp, documentID:did};',
  '}',
  'function __tessQ(s){ var r="",c; s=String(s); for(var i=0;i<s.length;i++){ c=s.charAt(i);',
  '  if(c==String.fromCharCode(92)) r+=String.fromCharCode(92,92); else if(c==String.fromCharCode(34)) r+=String.fromCharCode(92,34);',
  '  else if(c.charCodeAt(0)<32) r+=" "; else r+=c; } return String.fromCharCode(34)+r+String.fromCharCode(34); }',
  'function __tessIdJSON(id){ return id ? "{"+__tessQ("name")+":"+__tessQ(id.name)+","+__tessQ("path")+":"+__tessQ(id.path)+","+__tessQ("documentID")+":"+__tessQ(id.documentID)+"}" : "null"; }',
].join('\n');

export function withDocIdentity(script){
  var inner = String(script).replace(/;\s*$/, '');
  return [
    '(function(){',
    IDENTITY_FN,
    'var __id=null; try{ __id=__tessDocIdentity(); }catch(eId){}',
    'var __r=' + inner + ';',
    'return "{"+__tessQ("tessDoc")+":"+__tessIdJSON(__id)+","+__tessQ("r")+":"+__r+"}";',
    '})();'
  ].join('\n');
}

// Solo la identidad (comprobación puntual antes de construir el 3D).
export const DOC_IDENTITY_SCRIPT = withDocIdentity('(function(){ return "{}"; })();');

// {identity, result}: identity === undefined si la respuesta no trae identidad (p. ej. un simulador de CEP de pruebas que ignora el envoltorio).
export function unwrapDocIdentity(parsed){
  if(parsed && typeof parsed === 'object' && Object.prototype.hasOwnProperty.call(parsed, 'tessDoc') && Object.prototype.hasOwnProperty.call(parsed, 'r')) return { identity: parsed.tessDoc, result: parsed.r };
  return { identity: undefined, result: parsed };
}

// undefined = desconocida (no se puede comparar): no bloquea. null = sin documento abierto: nunca coincide.
export function sameDocument(a, b){
  if(a === undefined || b === undefined) return true;
  if(!a || !b) return false;
  return a.name === b.name && a.path === b.path && a.documentID === b.documentID;
}
