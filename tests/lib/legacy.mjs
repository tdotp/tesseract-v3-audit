// Carga de las funciones PURAS de un main.js del plugin (baseline o panel) por NOMBRE (no por número de línea).
// Extrae las declaraciones `    function nombre(` (4 espacios) y las evalúa en un contexto aislado con stubs mínimos de DOM.
import fs from 'node:fs'; import vm from 'node:vm'; import path from 'node:path'; import crypto from 'node:crypto';
import { ROOT } from './fixtures.mjs';

export const TARGETS = { baseline: path.join(ROOT, 'reference/legacy-baseline/main.js'), panel: process.env.TESS_PANEL_MAIN || path.join(ROOT, 'panel/main.js') }; // TESS_PANEL_MAIN solo para controles negativos (mutaciones)
export const sha256 = (f) => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');

export function extractFunctions(src) {
  const L = src.split('\n'), out = new Map();
  for (let i = 0; i < L.length; i++) {
    const m = /^    (?:async )?function (\w+)\(/.exec(L[i]); if (!m) continue;
    const bal = (s) => (s.match(/\{/g) || []).length - (s.match(/\}/g) || []).length;
    let j = i, text = L[i];
    if (bal(L[i]) !== 0) { while (++j < L.length) { text += '\n' + L[j]; if (L[j] === '    }') break; } }
    out.set(m[1], text); i = j;
  }
  return out;
}
export function extractConstants(src) {
  const consts = {};
  for (const name of ['TOLERANCE_MM', 'GRAPH_EPS', 'DEFAULT_THICKNESS_MM', 'CREASE_HINGE_RADIUS_FACTOR', 'CREASE_HINGE_MIN_RADIUS', 'CREASE_HINGE_SEGMENTS', 'CREASE_HINGE_SHOW_THRESHOLD_DEG', 'FOLD_BRIDGE_TOP_Z', 'FOLD_BRIDGE_BOTTOM_Z', 'CREASE_LINE_Z_OFFSET', 'ART_TOP_OFFSET', 'ART_BOTTOM_OFFSET']) {
    const m = new RegExp('^    var ' + name + '\\s*=\\s*([^;]+);', 'm').exec(src); if (!m) throw new Error('constante no encontrada: ' + name); consts[name] = Number(m[1]);
  }
  const mp = /^    var MATERIAL_PRESETS = (\{[\s\S]*?\n    \});/m.exec(src); if (!mp) throw new Error('MATERIAL_PRESETS no encontrado');
  consts.MATERIAL_PRESETS = JSON.parse(JSON.stringify(vm.runInNewContext('(' + mp[1] + ')')));
  return consts;
}
const GEOMETRY_FUNCTIONS = ['distPtSeg', 'segsFromPath', 'buildAllSegs', 'validateGeometry', 'dist2d', 'ptEq', 'segSegIntersect', 'pointOnSeg', 'buildTopology',
  'polygonSignedArea', 'polygonCentroid', 'pointOnSegment2D', 'pointInPolygonInclusive', 'contourContainsContour', 'classifyClosedCutContours', 'faceBounds', 'buildPanels',
  'getPolyCentroid', 'edgeMatch', 'buildAdjacencyStrict', 'buildAdjacency', 'buildFoldTree', 'computeFoldSign', 'getDefaultBaseIndex'];

export function loadGeometry(file) {
  const src = fs.readFileSync(file, 'utf8'), fns = extractFunctions(src), consts = extractConstants(src);
  const missing = GEOMETRY_FUNCTIONS.filter((n) => !fns.has(n)); if (missing.length) throw new Error('funciones no encontradas: ' + missing.join(', '));
  const code = `(function(){
    var TOLERANCE_MM=${consts.TOLERANCE_MM}, GRAPH_EPS=${consts.GRAPH_EPS};
    var logs=[]; function log(m){ logs.push(String(m)); }
    var problems=[]; var problemsList={innerHTML:'',appendChild:function(){}}; var validationStatus={textContent:'',className:''}; var continueBtn={disabled:true};
    var document={createElement:function(){return {textContent:'',onclick:null};}}; var lastData=null; function render2D(){}
    ${GEOMETRY_FUNCTIONS.map((n) => fns.get(n)).join('\n')}
    return { ${GEOMETRY_FUNCTIONS.join(', ')}, logs:logs, getProblems:function(){return problems;}, resetLogs:function(){logs.length=0;}, problemsList:problemsList, validationStatus:validationStatus, continueBtn:continueBtn };
  })()`;
  const api = vm.runInNewContext(code, {}, { filename: file });
  return { api, consts, functions: fns };
}

// Texto de los scripts ExtendScript embebidos en main.js
export function extractScripts(file) {
  const src = fs.readFileSync(file, 'utf8');
  const m = /^    var EXTRACT_SCRIPT = (\[[\s\S]*?\n    \]\.join\('\\n'\));/m.exec(src); if (!m) throw new Error('EXTRACT_SCRIPT no encontrado');
  const extract = vm.runInNewContext(m[1]);
  const fn = extractFunctions(src).get('buildArtworkExportScript'); if (!fn) throw new Error('buildArtworkExportScript no encontrado');
  const art = vm.runInNewContext('(' + fn.replace(/^    function buildArtworkExportScript/, 'function') + ')')();
  return { extract, art };
}
