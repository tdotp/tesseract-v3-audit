// Modelo de objetos de Illustrator MÍNIMO para ejecutar los scripts ExtendScript del plugin fuera de Illustrator.
// ADVERTENCIA: es una maqueta. Reproduce la forma de las colecciones (array-like, GroupItem sin `layers`) pero NO sustituye una prueba en Illustrator real.
import vm from 'node:vm';
const PT = 0.352778; // mm por punto (el mismo factor que usa el plugin)
const toPt = (p) => [p.x / PT, p.y / PT];

export function path(bezier, opts = {}) { // bezier: {closed, points:[{anchor,left,right}]} en mm (formato DielineV1)
  return { typename: 'PathItem', closed: opts.closed ?? bezier.closed, guides: !!opts.guides, clipping: !!opts.clipping,
    pathPoints: bezier.points.map((q) => ({ anchor: toPt(q.anchor), leftDirection: toPt(q.left), rightDirection: toPt(q.right) })) };
}
export const poly = (pts, opts) => path({ closed: opts?.closed ?? true, points: pts.map(([x, y]) => ({ anchor: { x, y }, left: { x, y }, right: { x, y } })) }, opts);
export const group = (...items) => ({ typename: 'GroupItem', items });
export const compound = (...paths) => ({ typename: 'CompoundPathItem', items: paths });
export const layer = (name, items = [], opts = {}) => ({ typename: 'Layer', name, items, sublayers: opts.sublayers || [], visible: opts.visible ?? true, locked: opts.locked ?? false });

function buildContainer(spec, parent) { // convierte la especificación en objetos con la API de Illustrator
  const c = { typename: spec.typename, parent, pathItems: [], groupItems: [], compoundPathItems: [] };
  if (spec.typename === 'Layer') { c.name = spec.name; c.visible = spec.visible; c.locked = spec.locked; c.layers = spec.sublayers.map((s) => buildContainer(s, c)); }
  for (const it of spec.items || []) {
    if (it.typename === 'PathItem') c.pathItems.push(it);
    else if (it.typename === 'GroupItem') c.groupItems.push(buildContainer(it, c)); // GroupItem: sin propiedad `layers` (como en Illustrator)
    else if (it.typename === 'CompoundPathItem') { const cp = { typename: 'CompoundPathItem', pathItems: it.items.slice() }; c.compoundPathItems.push(cp); }
  }
  return c;
}

export function makeIllustrator({ layers = [], artboards = [], name = 'prueba.ai', noDocument = false } = {}) {
  const calls = { exportFile: [] };
  const doc = { typename: 'Document', name, layers: [], artboards: [], _active: 0 };
  doc.layers = layers.map((l) => buildContainer(l, doc));
  doc.artboards = artboards.map((a) => ({ name: a.name, artboardRect: a.rect })); // rect en puntos: [left, top, right, bottom]
  doc.artboards.getActiveArtboardIndex = () => doc._active;
  doc.artboards.setActiveArtboardIndex = (i) => { doc._active = i; };
  const visibility = () => { const m = {}; const walk = (arr, pre) => arr.forEach((l) => { m[pre + l.name] = l.visible; walk(l.layers, pre + l.name + '/'); }); walk(doc.layers, ''); return m; };
  doc.exportFile = (file, type, opt) => calls.exportFile.push({ path: file.fsName, type, opt: { ...opt }, activeArtboard: doc._active, visible: visibility() });
  const saved = { text: null }; const alerts = [];
  const File = function (p) { this.fsName = p; }; File.saveDialog = () => { const f = new File('/tmp/resultado.json'); f.open = () => true; f.write = (t) => { saved.text = t; }; f.close = () => {}; return f; }; const Folder = function (p) { this.fsName = p; this.exists = true; this.create = () => {}; }; Folder.temp = { fsName: '/tmp/mock-illustrator' };
  const app = { documents: { length: noDocument ? 0 : 1 }, activeDocument: doc, version: '30.8.2-mock' };
  return { globals: { app, File, Folder, ExportOptionsPNG24: function () {}, ExportType: { PNG24: 'PNG24' }, Date, alert: (m) => alerts.push(String(m)) }, doc, calls, visibility, saved, alerts };
}

export function runScript(script, ill) { // equivale a evalScript: valor de la última expresión (cadena JSON)
  return vm.runInNewContext(script, { ...ill.globals }, { filename: 'extendscript-mock' });
}
