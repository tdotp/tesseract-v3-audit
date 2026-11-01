# D-0 / H-06 — Consumidor glTF EXTERNO e independiente: Cinema 4D (c4dpy) importa un GLB con su importador oficial y mide la caja envolvente en mundo.
# Uso (solo lectura; no guarda nada):  "/Applications/Maxon Cinema 4D 2026/c4dpy.app/Contents/MacOS/c4dpy" tools/glb/c4d-medir.py <archivo.glb> [...]
# Salida: una línea JSON por archivo con la unidad del documento de Cinema 4D, el tamaño en esa unidad y en metros, y el número de objetos poligonales.
import sys, json
import c4d
from c4d import documents

UNIDAD_A_M = {c4d.DOCUMENT_UNIT_KM: 1000.0, c4d.DOCUMENT_UNIT_M: 1.0, c4d.DOCUMENT_UNIT_CM: 0.01, c4d.DOCUMENT_UNIT_MM: 0.001,
              c4d.DOCUMENT_UNIT_MICRO: 1e-6, c4d.DOCUMENT_UNIT_NM: 1e-9, c4d.DOCUMENT_UNIT_MILE: 1609.344, c4d.DOCUMENT_UNIT_YARD: 0.9144,
              c4d.DOCUMENT_UNIT_FOOT: 0.3048, c4d.DOCUMENT_UNIT_INCH: 0.0254}

def objetos(o):
    while o:
        yield o
        for h in objetos(o.GetDown()):
            yield h
        o = o.GetNext()

for ruta in sys.argv[1:]:
    doc = documents.LoadDocument(ruta, c4d.SCENEFILTER_OBJECTS | c4d.SCENEFILTER_MATERIALS, None)
    if doc is None:
        print(json.dumps({"archivo": ruta, "error": "Cinema 4D no pudo importar el archivo"})); continue
    usd = doc[c4d.DOCUMENT_DOCUNIT]; escala, unidad = usd.GetUnitScale()
    mn = [float("inf")] * 3; mx = [float("-inf")] * 3; n = 0
    for o in objetos(doc.GetFirstObject()):
        if not isinstance(o, c4d.PolygonObject): continue
        n += 1; mg = o.GetMg()
        for p in o.GetAllPoints():
            w = mg * p
            for i, v in enumerate((w.x, w.y, w.z)):
                mn[i] = min(mn[i], v); mx[i] = max(mx[i], v)
    tam = [mx[i] - mn[i] for i in range(3)] if n else None
    a_m = escala * UNIDAD_A_M.get(unidad, float("nan"))
    print(json.dumps({"archivo": ruta.split("/")[-1], "objetos": n, "unidad_c4d": unidad, "escala_unidad": escala,
                      "tamano_unidades_c4d": tam, "tamano_m": [t * a_m for t in tam] if tam else None}))
    documents.KillDocument(doc)
