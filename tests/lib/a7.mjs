// A7 — Utilidades de las pruebas de equivalencia de texto y de límites (docs/fase1/A7_PROPUESTA.md §9.2, §5.3).
// Referencia de A7: el src/main.js del commit 2939dbc (A6 validada en el CEP real). Las funciones que A7 mueve deben conservar su texto
// salvo la sangría y el prefijo «S.» delante de los 26 campos del estado compartido (src/app/state.js).
import fs from 'node:fs'; import path from 'node:path'; import { execFileSync } from 'node:child_process'; import { ROOT } from './fixtures.mjs';

export const A7_REF = '2939dbc';
// Los 26 campos de dominio que pasan a S (D-A7-2). lastData, problems y los widgets DOM se quedan en main.js; labelCache y creaseLinesGroup son privados de su módulo.
export const STATE_FIELDS = ['currentThicknessMm', 'currentMaterialPreset', 'currentPanelData', 'currentAdjEdges', 'currentBasePanelIndex', 'baseSelectionConfirmed',
  'foldTree', 'foldSigns', 'foldAngles', 'foldCenter', 'selectedFoldEdgeIdx', 'foldRoot', 'panelGroupMap', 'panelLabelSprites',
  'renderer3d', 'scene3d', 'camera3d', 'raycaster3d', 'pointer3d', 'orbitState', 'panelMeshes', 'foldData', 'creasePickables', 'creaseVisuals', 'foldBridgeGroup', 'currentArtState'];
export const refMain = () => execFileSync('git', ['-C', ROOT, 'show', `${A7_REF}:src/main.js`], { encoding: 'utf8' });
export const SRC = process.env.TESS_SRC_DIR || path.join(ROOT, 'src'); // TESS_SRC_DIR: copia mutada de src/ (controles negativos de Node)
export function srcFiles(dir = SRC) { const out = []; (function walk(d) { for (const e of fs.readdirSync(d, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) { const p = path.join(d, e.name); if (e.isDirectory()) walk(p); else if (e.name.endsWith('.js')) out.push(path.relative(dir, p)); } })(dir); return out; }

// Funciones declaradas a cualquier sangría (con o sin export/async). Devuelve [{name, indent, start, end, text}] en orden de aparición.
export function functionsAnyIndent(src) {
  const L = src.split('\n'), out = [];
  for (let i = 0; i < L.length; i++) {
    const m = /^(\s*)(?:export )?(?:async )?function (\w+)\(/.exec(L[i]); if (!m) continue;
    const bal = (s) => (s.match(/\{/g) || []).length - (s.match(/\}/g) || []).length; let j = i;
    if (bal(L[i]) !== 0) { while (++j < L.length) { if (L[j] === m[1] + '}') break; } }
    out.push({ name: m[2], indent: m[1].length, start: i, end: j, text: L.slice(i, j + 1).join('\n').replace(/^(\s*)export /, '$1') });
  }
  return out;
}
// Solo las funciones de primer nivel de la clausura de main.js (sangría de 4), como en el cargador de A2.
export const closureFunctions = (src) => functionsAnyIndent(src).filter((f) => f.indent === 4);
// Normalización: sin sangría ni espacios finales, y sin «S.» delante de los campos de STATE_FIELDS (solo cuando S no va precedido de \w, . o $).
const RE_S = new RegExp('(?<![\\w.$])S\\.(' + STATE_FIELDS.join('|') + ')\\b', 'g');
export const stripS = (t) => t.replace(RE_S, '$1');
export const norm = (t) => stripS(t).split('\n').map((l) => l.trim()).join('\n');
// Líneas de main.js que no pertenecen a ninguna función de primer nivel de la clausura (declaraciones, cableado, raíz de composición), normalizadas.
export function residual(src) {
  const L = src.split('\n'), inFn = new Array(L.length).fill(false);
  for (const f of closureFunctions(src)) for (let k = f.start; k <= f.end; k++) inFn[k] = true;
  return L.filter((_, k) => !inFn[k]).map((l) => stripS(l).trim()).filter((l) => l && !/^\/\//.test(l));
}
export function multisetDiff(a, b) { // líneas en a que no están en b y viceversa (multiconjunto)
  const c = (arr) => arr.reduce((o, l) => (o.set(l, (o.get(l) || 0) + 1), o), new Map()); const ca = c(a), cb = c(b); const quitadas = [], anadidas = [];
  for (const l of new Set([...ca.keys(), ...cb.keys()])) { const d = (cb.get(l) || 0) - (ca.get(l) || 0); for (let i = 0; i < -d; i++) quitadas.push(l); for (let i = 0; i < d; i++) anadidas.push(l); }
  return { quitadas, anadidas };
}
// Texto de código sin comentarios ni cadenas (para las reglas de límites).
export const codeOnly = (t) => t.replace(/^\s*\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '').replace(/'(?:[^'\\\n]|\\.)*'|"(?:[^"\\\n]|\\.)*"/g, "''");
// El DBG heredado que inyecta tools/baseline/setup_harness.py (20 propiedades) y la vista de solo lectura de A7 (18 getters, sin upd ni fold).
export function legacyDbg() { const py = fs.readFileSync(path.join(ROOT, 'tools/baseline/setup_harness.py'), 'utf8'); const m = /^DBG = \("window\.__dbg=(\{.*\});"\)$/m.exec(py); if (!m) throw new Error('DBG no encontrado en setup_harness.py'); return m[1]; }
