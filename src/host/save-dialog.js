// Texto ExtendScript (ES3) que se envía a Illustrator por evalScript (A5.2). Copia literal de panel/main.js (referencia A1): no editar sin tarea aprobada.
export const SAVE_GLB_DIALOG_SCRIPT = '(function(){\n'
  + 'var f = File.saveDialog("Save GLB", "*.glb");\n'
  + 'if(!f) return "";\n'
  + 'var name = String(f.name||"");\n'
  + 'if(!/\.glb$/i.test(name)) f = new File(f.fsName + ".glb");\n'
  + 'return f.fsName;\n'
  + '})();';
