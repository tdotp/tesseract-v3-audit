#!/usr/bin/env python3
"""Crea un ARNÉS de medición a partir de una COPIA del plugin (nunca toca el original).

  python3 setup_harness.py <ruta-al-plugin> <ruta-fixture.json> <carpeta-destino>

Genera <carpeta-destino>/ con:
  - shim.js : simula window.__adobe_cep__ (extracción devuelve el fixture; arte -> 'none')
  - index.html : igual al del plugin + <script src="shim.js"> antes de main.js
  - main.js : IGUAL al del plugin salvo 2 parches de instrumentación (marcados) -> window.__dbg y
              pathToFileURL acepta blob:/http: (para simular arte)
  - measure_ui.js, harness_art.js (de esta carpeta)
Luego servir <carpeta-destino> por http (python3 -m http.server) y abrir index.html en un navegador.
Las sondas de measure_ui.js NO necesitan __dbg; __dbg solo se usó para costos internos de render.
"""
import json, shutil, sys, pathlib

plugin, fixture, dest = map(pathlib.Path, sys.argv[1:4])
if dest.exists():
    sys.exit(f"{dest} ya existe; elige una carpeta nueva (este script no sobrescribe)")
shutil.copytree(plugin, dest)
here = pathlib.Path(__file__).parent

shim = """/* SHIM de medición: simula el puente CEP. Solo vive en la copia. */
window.__FIXTURE__ = %s;
window.__adobe_cep__ = { evalScript: function(script, cb){
  var r;
  if(script.indexOf('OK_FROM_ILLUSTRATOR')>-1) r='OK_FROM_ILLUSTRATOR';
  else if(script.indexOf('tesseract_art')>-1) r=JSON.stringify({ok:true,mode:'none',front:null,back:null,available:{artboards:[],layers:[]}});
  else r=JSON.stringify(window.__FIXTURE__);
  setTimeout(function(){cb(r)},0);
}};
""" % fixture.read_text()
(dest / "shim.js").write_text(shim)

html = (dest / "index.html").read_text()
assert '<script src="main.js"></script>' in html
(dest / "index.html").write_text(html.replace('<script src="main.js"></script>', '<script src="shim.js"></script>\n  <script src="main.js"></script>'))

m = (dest / "main.js").read_text()
a = "    function setStatus(m){ statusArea.textContent = m; }"
assert a in m
m = m.replace(a, "    /* HARNESS */ window.__dbg={get renderer(){return renderer3d},get scene(){return scene3d},get camera(){return camera3d},get orbit(){return orbitState},upd:function(){updateCameraFromOrbit()},fold:function(i,a){foldAngles[i]=a;applyFolding();},get nFold(){return foldTree.length},get panels(){return panelMeshes.length}};\n" + a, 1)
b = "      var path = String(fsPath || '');\n      if(!path) return '';"
assert b in m
m = m.replace(b, b + "\n      if(/^(blob:|https?:)/i.test(path)) return path;  /* HARNESS */", 1)
(dest / "main.js").write_text(m)
for f in ("measure_ui.js", "harness_art.js"):
    shutil.copy(here / f, dest / f)
print("Arnés listo en", dest)
