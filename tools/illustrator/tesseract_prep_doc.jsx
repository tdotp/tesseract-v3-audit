#target illustrator
/*
 * tesseract_prep_doc.jsx — Tesseract V3 (Nivel 0): PREPARA un documento de prueba DESECHABLE (nombre N0-*).
 * Illustrator importa un SVG como UNA capa ("Layer 1") con los <g id> como GRUPOS, no como capas (hallazgo del Nivel 0: suposición M5 refutada).
 * Este script crea una capa por cada nombre de $.global.TESS_PREP_ORDER (arriba→abajo), mueve el CONTENIDO del grupo homónimo a esa capa,
 * borra el grupo vacío y la capa original si queda vacía. Así el documento imita un troquel real con capas Cuts/Creases/Front/Back.
 * SE NEGARÁ A EJECUTARSE si el documento activo no se llama N0-*. Modifica solo el documento desechable (se cierra sin guardar).
 */
var __doc = app.activeDocument;
if (__doc.name.indexOf("N0-") !== 0) { throw new Error("tesseract_prep_doc: el documento activo NO es de prueba (N0-*): " + __doc.name); }
var __order = $.global.TESS_PREP_ORDER; if (!__order || !__order.length) { throw new Error("tesseract_prep_doc: falta $.global.TESS_PREP_ORDER"); }
if (__doc.layers.length !== 1) { throw new Error("tesseract_prep_doc: se esperaba 1 capa inicial y hay " + __doc.layers.length); }
var __base = __doc.layers[0], __log = [];
function __findGroup(layer, name) { for (var i = 0; i < layer.groupItems.length; i++) { if (layer.groupItems[i].name === name) return layer.groupItems[i]; } return null; }
for (var __i = __order.length - 1; __i >= 0; __i--) {
  var __name = __order[__i], __g = __findGroup(__base, __name);
  if (!__g) { throw new Error("tesseract_prep_doc: no hay un grupo raíz llamado «" + __name + "»"); }
  var __layer = __doc.layers.add(); __layer.name = __name; var __kids = [];
  for (var __j = 0; __j < __g.pageItems.length; __j++) { __kids.push(__g.pageItems[__j]); }
  for (var __m = 0; __m < __kids.length; __m++) { __kids[__m].move(__layer, ElementPlacement.PLACEATEND); }
  __g.remove(); __log.push(__name + ":" + __kids.length);
}
if (__base.pageItems.length === 0) { __base.remove(); __log.push("capa original vacía eliminada"); } else { __log.push("la capa original conserva " + __base.pageItems.length + " elementos"); }
var __names = []; for (var __q = 0; __q < __doc.layers.length; __q++) { __names.push(__doc.layers[__q].name); }
"preparado: capas (arriba→abajo) = " + __names.join(", ") + " | " + __log.join("; ");
