// Carga de las funciones PURAS de un main.js del plugin (baseline o panel) por NOMBRE (no por número de línea).
// Extrae las declaraciones `    function nombre(` (4 espacios) y las evalúa en un contexto aislado con stubs mínimos de DOM.
import fs from 'node:fs'; import vm from 'node:vm'; import path from 'node:path'; import crypto from 'node:crypto';
import { ROOT } from './fixtures.mjs';

// baseline = plugin instalado congelado · panel = referencia A1 congelada (panel/main.js) · src = fuente modular del build desde A5 (entrada src/main.js)
export const TARGETS = { baseline: path.join(ROOT, 'reference/legacy-baseline/main.js'), panel: process.env.TESS_PANEL_MAIN || path.join(ROOT, 'panel/main.js'), src: path.join(process.env.TESS_SRC_DIR || path.join(ROOT, 'src'), 'main.js') }; // TESS_PANEL_MAIN / TESS_SRC_DIR solo para controles negativos (mutaciones)
export const sha256 = (f) => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');

// Texto fuente de un objetivo. El objetivo src/ (A5) es main.js + los módulos .js de su árbol, concatenados (main.js primero, el resto en orden alfabético).
export function sourceText(file) {
  if (path.resolve(file) !== path.resolve(TARGETS.src)) return fs.readFileSync(file, 'utf8');
  const files = []; (function walk(d) { for (const e of fs.readdirSync(d, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) { const p = path.join(d, e.name); if (e.isDirectory()) walk(p); else if (/\.js$/.test(e.name) && p !== path.resolve(file)) files.push(p); } })(path.dirname(path.resolve(file)));
  return [path.resolve(file), ...files].map((f) => fs.readFileSync(f, 'utf8')).join('\n');
}
// Funciones de la clausura (4 espacios) o de módulo (sin sangría, con o sin export: se devuelve sin «export»). A9.5 (D-A9-5): con { indent2: true } también las de 2 espacios
// (funciones de una fábrica createX(S, deps): validateGeometry vive en createController). Solo se pide para el objetivo src (indent2Allowed).
export function extractFunctions(src, { indent2 = false } = {}) {
  const L = src.split('\n'), out = new Map();
  for (let i = 0; i < L.length; i++) {
    const m = (indent2 ? /^( {4}| {2}|)(?:export )?(?:async )?function (\w+)\(/ : /^( {4}|)(?:export )?(?:async )?function (\w+)\(/).exec(L[i]); if (!m) continue;
    const bal = (s) => (s.match(/\{/g) || []).length - (s.match(/\}/g) || []).length;
    let j = i, text = L[i].replace(/^export /, '');
    if (bal(L[i]) !== 0) { while (++j < L.length) { text += '\n' + L[j]; if (L[j] === m[1] + '}') break; } }
    out.set(m[2], text); if (!(indent2 && m[1] === '' && /function create[A-Z]\w*\(/.test(L[i]))) i = j; // A9.5: con indent2 se entra en el cuerpo de las fábricas createX(…) para ver sus funciones de 2 espacios
  }
  return out;
}
export function extractConstants(src) {
  const consts = {};
  for (const name of ['TOLERANCE_MM', 'GRAPH_EPS', 'DEFAULT_THICKNESS_MM', 'CREASE_HINGE_RADIUS_FACTOR', 'CREASE_HINGE_MIN_RADIUS', 'CREASE_HINGE_SEGMENTS', 'CREASE_HINGE_SHOW_THRESHOLD_DEG', 'FOLD_BRIDGE_TOP_Z', 'FOLD_BRIDGE_BOTTOM_Z', 'CREASE_LINE_Z_OFFSET', 'ART_TOP_OFFSET', 'ART_BOTTOM_OFFSET']) {
    const m = new RegExp('^(?:    var|export const) ' + name + '\\s*=\\s*([^;]+);', 'm').exec(src); if (!m) throw new Error('constante no encontrada: ' + name); consts[name] = Number(m[1]);
  }
  const mp = /^(?:    var|export const) MATERIAL_PRESETS = (\{[\s\S]*?\n(?: {4})?\});/m.exec(src); if (!mp) throw new Error('MATERIAL_PRESETS no encontrado');
  consts.MATERIAL_PRESETS = JSON.parse(JSON.stringify(vm.runInNewContext('(' + mp[1] + ')')));
  return consts;
}
export const GEOMETRY_FUNCTIONS = ['distPtSeg', 'segsFromPath', 'buildAllSegs', 'validateGeometry', 'dist2d', 'ptEq', 'segSegIntersect', 'pointOnSeg', 'buildTopology',
  'polygonSignedArea', 'polygonCentroid', 'pointOnSegment2D', 'pointInPolygonInclusive', 'contourContainsContour', 'classifyClosedCutContours', 'faceBounds', 'buildPanels',
  'getPolyCentroid', 'edgeMatch', 'buildAdjacencyStrict', 'buildAdjacency', 'buildFoldTree', 'computeFoldSign', 'getDefaultBaseIndex'];

// A6.5 (D-A6-3): el cálculo de la validación vive en validateDieline (core/legacy/validate.js) solo en src/; la validateGeometry de main.js queda como presentación.
const SRC_ONLY_FUNCTIONS = ['validateDieline'];
// A9.5 (D-A9-5): la sangría de 2 espacios se admite SOLO para src, nunca para baseline ni panel/ (lo fija a9-limites; TESS_LOADER_INDENT2=all solo existe para el control negativo n.º 22).
export function indent2Allowed(file) { if (process.env.TESS_LOADER_INDENT2 === 'all') return true; return path.resolve(file) === path.resolve(TARGETS.src); }
export function loadGeometry(file) {
  const ind2 = indent2Allowed(file); const src = sourceText(file), fns = extractFunctions(src, { indent2: ind2 }), consts = extractConstants(src);
  const isSrc = path.resolve(file) === path.resolve(TARGETS.src); const extra = isSrc ? SRC_ONLY_FUNCTIONS : [];
  for (const n of SRC_ONLY_FUNCTIONS) if (fns.has(n) !== isSrc) throw new Error(`${n}: ${isSrc ? 'falta en src/' : 'no debe existir en ' + file}`);
  const missing = GEOMETRY_FUNCTIONS.filter((n) => !fns.has(n)); if (missing.length) throw new Error('funciones no encontradas: ' + missing.join(', '));
  const count = (re) => (src.match(re) || []).length; // A6: definición única (si quedara una copia vieja, extractFunctions se quedaría con la última sin avisar)
  for (const n of [...GEOMETRY_FUNCTIONS, ...extra]) { const k = count(new RegExp('^(?: {4}' + (ind2 ? '| {2}' : '') + '|)(?:export )?function ' + n + '\\(', 'gm')); if (k !== 1) throw new Error(`función ${n} definida ${k} veces`); }
  for (const n of ['TOLERANCE_MM', 'GRAPH_EPS']) { const k = count(new RegExp('^(?:    var|export const) ' + n + '\\s*=', 'gm')); if (k !== 1) throw new Error(`constante ${n} definida ${k} veces`); }
  const code = `(function(){
    var TOLERANCE_MM=${consts.TOLERANCE_MM}, GRAPH_EPS=${consts.GRAPH_EPS};
    var logs=[]; function log(m){ logs.push(String(m)); }
    var problems=[]; var problemsList={innerHTML:'',appendChild:function(){}}; var validationStatus={textContent:'',className:''}; var continueBtn={disabled:true};
    var document={createElement:function(){return {textContent:'',onclick:null};}}; var lastData=null; function render2D(){}
    ${isSrc ? 'var geometryEngine={validate:validateDieline}; /* A6.6: la presentación usa el motor; el adaptador real lo prueba a6-engine con el módulo ES */' : ''}
    ${[...GEOMETRY_FUNCTIONS, ...extra].map((n) => fns.get(n)).join('\n')}
    return { ${GEOMETRY_FUNCTIONS.join(', ')}, logs:logs, getProblems:function(){return problems;}, resetLogs:function(){logs.length=0;}, problemsList:problemsList, validationStatus:validationStatus, continueBtn:continueBtn };
  })()`;
  const api = vm.runInNewContext(code, {}, { filename: file });
  return { api, consts, functions: fns };
}

// Texto de los scripts ExtendScript embebidos en main.js
export function extractScripts(file) {
  const src = sourceText(file);
  const m = /^(?:    var|export const) EXTRACT_SCRIPT = (\[[\s\S]*?\n(?: {4})?\]\.join\('\\n'\));/m.exec(src); if (!m) throw new Error('EXTRACT_SCRIPT no encontrado');
  const extract = vm.runInNewContext(m[1]);
  const fn = extractFunctions(src).get('buildArtworkExportScript'); if (!fn) throw new Error('buildArtworkExportScript no encontrado');
  const art = vm.runInNewContext('(' + fn.replace(/^ *function buildArtworkExportScript/, 'function') + ')')();
  const t = /(?:var jsx=|export const TEST_CONNECTION_SCRIPT = )('\(function\(\)\{ return "OK_FROM_ILLUSTRATOR"; \}\)\(\);')/.exec(src); if (!t) throw new Error('script de Test Connection no encontrado');
  const sv = /(?:var jsx = |export const SAVE_GLB_DIALOG_SCRIPT = )('\(function\(\)\{\\n'[\s\S]*?'\}\)\(\);');/.exec(src); if (!sv) throw new Error('script del diálogo de guardado no encontrado');
  return { extract, art, test: vm.runInNewContext(t[1]), save: vm.runInNewContext(sv[1]) };
}
