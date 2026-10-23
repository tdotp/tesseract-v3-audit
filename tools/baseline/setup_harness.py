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
for p in [dest, *dest.rglob('*')]:
    p.chmod(p.stat().st_mode | 0o200)   # el baseline de referencia es de solo lectura; la copia del arnés debe ser editable
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

import re
m = (dest / "main.js").read_text()
# Parche 1: expone el estado interno (solo en la copia). Tolera el formato del código original Y el reimpreso por esbuild (espacios/comillas).
DBG = ("window.__dbg={get renderer(){return renderer3d},get scene(){return scene3d},get camera(){return camera3d},get orbit(){return orbitState},upd:function(){updateCameraFromOrbit()},fold:function(i,a){foldAngles[i]=a;applyFolding();},get nFold(){return foldTree.length},get panels(){return panelMeshes.length},get foldData(){return foldData},get art(){return currentArtState},get panelData(){return currentPanelData},get thickness(){return currentThicknessMm},get preset(){return currentMaterialPreset},get baseIndex(){return currentBasePanelIndex},get angles(){return foldAngles},get tree(){return foldTree},get bridges(){return foldBridgeGroup},get selectedEdge(){return selectedFoldEdgeIdx},get creaseVisuals(){return creaseVisuals},get adj(){return currentAdjEdges}};")
pat1 = re.compile(r"function setStatus\(m\)\s*\{\s*statusArea\.textContent\s*=\s*m;\s*\}")
assert len(pat1.findall(m)) == 1, "no se encontró setStatus"
m = pat1.sub(lambda mo: "/* HARNESS */ " + DBG + "\n" + mo.group(0), m, count=1)
# Parche 2: pathToFileURL acepta blob:/http: (para simular arte)
pat2 = re.compile(r"(var path = String\(fsPath \|\| (['\"])\2\);\s*if\s*\(\s*!path\s*\)\s*return (['\"])\3;)")
assert len(pat2.findall(m)) == 1, "no se encontró pathToFileURL"
m = pat2.sub(lambda mo: mo.group(1) + "\n      if(/^(blob:|https?:)/i.test(path)) return path;  /* HARNESS */", m, count=1)
(dest / "main.js").write_text(m)
for f in ("measure_ui.js", "harness_art.js", "leak_cycles.js"):
    shutil.copy(here / f, dest / f)
print("Arnés listo en", dest)
