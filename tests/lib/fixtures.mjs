// Fixtures de troqueles en formato DielineV1 (el JSON que produce el extractor del plugin). Reales (archivos) + sintéticos (código determinista).
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(here, '../..');
const pt = (x, y) => ({ anchor: { x, y }, left: { x, y }, right: { x, y } });
const path_ = (pts, closed) => ({ closed, points: pts.map(([x, y]) => pt(x, y)) });
const wrap = (o) => ({ version: '1.0', units: 'mm', thickness_mm: 0.25, holes: [], cutLines: [], meta: { synthetic: true }, ...o });

export function gridDieline(n, { extra = 0, cell = 40, fullLines = false } = {}) {
  const W = n * cell, H = n * cell, pts = [];
  const edge = (x0, y0, x1, y1) => { for (let k = 0; k <= extra; k++) { const t = k / (extra + 1); pts.push([x0 + (x1 - x0) * t, y0 + (y1 - y0) * t]); } };
  edge(0, 0, W, 0); edge(W, 0, W, H); edge(W, H, 0, H); edge(0, H, 0, 0);
  const creases = [];
  if (fullLines) for (let i = 1; i < n; i++) { creases.push(path_([[i * cell, 0], [i * cell, H]], false)); creases.push(path_([[0, i * cell], [W, i * cell]], false)); }
  else for (let i = 1; i < n; i++) for (let j = 0; j < n; j++) { creases.push(path_([[i * cell, j * cell], [i * cell, (j + 1) * cell]], false)); creases.push(path_([[j * cell, i * cell], [(j + 1) * cell, i * cell]], false)); }
  return wrap({ outerBoundary: path_(pts, true), creases });
}
export function twoPanel({ undershoot = 0, overshoot = 0 } = {}) { // 80×40, una crease vertical en x=40; extremos desplazados (mm)
  const y0 = undershoot - overshoot, y1 = 40 - undershoot + overshoot;
  return wrap({ outerBoundary: path_([[0, 0], [80, 0], [80, 40], [0, 40]], true), creases: [path_([[40, y0], [40, y1]], false)] });
}
export function tLayout(offset = 0) { // tres paneles en T: crease vertical x=40 (y 0..40) y horizontal y=20 (x 40..80) que arranca a `offset` mm del T
  return wrap({ outerBoundary: path_([[0, 0], [80, 0], [80, 40], [0, 40]], true), creases: [path_([[40, 0], [40, 40]], false), path_([[40 + offset, 20], [80, 20]], false)] });
}
export function holeCase(centered) { // 2 paneles 40×80, hueco 20×40 (centrado en el panel derecho: centroide dentro del hueco) o 10×20 descentrado
  const d = gridDieline(2, { cell: 40 }); d.creases = [path_([[40, 0], [40, 80]], false)];
  d.holes = [centered ? path_([[50, 20], [70, 20], [70, 60], [50, 60]], true) : path_([[65, 5], [75, 5], [75, 25], [65, 25]], true)]; return d;
}
export function rounded() { // 120×60 con esquinas redondeadas de radio 10 (Bézier) y una crease en x=60
  const k = 0.5523 * 10, W = 120, H = 60, r = 10;
  const P = (ax, ay, lx, ly, rx, ry) => ({ anchor: { x: ax, y: ay }, left: { x: lx, y: ly }, right: { x: rx, y: ry } });
  const pts = [P(r, 0, r, 0, W - r, 0), P(W - r, 0, W - r, 0, W - r + k, 0), P(W, r, W, r - k, W, r), P(W, H - r, W, H - r, W, H - r + k), P(W - r, H, W - r + k, H, W - r, H), P(r, H, r, H, r - k, H), P(0, H - r, 0, H - r + k, 0, H - r), P(0, r, 0, r, 0, r - k)];
  return wrap({ outerBoundary: { closed: true, points: pts }, creases: [path_([[60, 0], [60, 60]], false)] });
}
export function strip(w, h, creaseX) { // rectángulo w×h con una crease vertical en creaseX: el panel pequeño mide (w−creaseX)×h
  return wrap({ outerBoundary: path_([[0, 0], [w, 0], [w, h], [0, h]], true), creases: [path_([[creaseX, 0], [creaseX, h]], false)] });
}
export function singlePanel() { return wrap({ outerBoundary: path_([[0, 0], [60, 0], [60, 40], [0, 40]], true), creases: [] }); }

const load = (f) => JSON.parse(fs.readFileSync(path.join(ROOT, 'tests/fixtures/real', f), 'utf8'));
// id → { desc, build, tags }
export const FIXTURES = {
  'real-caja-botanica': { desc: 'Troquel real (salida del extractor del plugin)', build: () => load('caja-botanica-real.dieline.json'), tags: ['real', 'KI-04', 'KI-07'] },
  'real-illustrator-export': { desc: 'Exportación real de Illustrator (SVG→DielineV1)', build: () => load('caja-botanica-illustrator-export.dieline.json'), tags: ['real', 'illustrator'] },
  'sin-creases': { desc: 'Un solo panel sin creases', build: singlePanel, tags: ['KI-09'] },
  'crease-exacta': { desc: '2 paneles, crease que toca el contorno', build: () => twoPanel(), tags: ['normalizacion'] },
  'crease-corta-0.3': { desc: 'Crease que no alcanza el contorno 0.3 mm por extremo', build: () => twoPanel({ undershoot: 0.3 }), tags: ['normalizacion'] },
  'crease-corta-0.6': { desc: 'Crease que no alcanza el contorno 0.6 mm (> 0.5 de tolerancia)', build: () => twoPanel({ undershoot: 0.6 }), tags: ['normalizacion'] },
  'crease-sobresale-0.3': { desc: 'Crease que sobresale 0.3 mm', build: () => twoPanel({ overshoot: 0.3 }), tags: ['normalizacion'] },
  'crease-sobresale-0.6': { desc: 'Crease que sobresale 0.6 mm', build: () => twoPanel({ overshoot: 0.6 }), tags: ['normalizacion'] },
  't-exacta': { desc: 'T de creases exacta', build: () => tLayout(0), tags: ['normalizacion'] },
  't-desalineada-0.375': { desc: 'T con la segunda crease a 0.375 mm del cruce (caso Illustrator)', build: () => tLayout(0.375), tags: ['normalizacion'] },
  't-desalineada-0.6': { desc: 'T con la segunda crease a 0.6 mm del cruce', build: () => tLayout(0.6), tags: ['normalizacion'] },
  't-desalineada-1.0': { desc: 'T con la segunda crease a 1.0 mm lateral del cruce', build: () => tLayout(1.0), tags: ['normalizacion'] },
  't-desalineada-2.5': { desc: 'T con la segunda crease a 2.5 mm lateral del cruce', build: () => tLayout(2.5), tags: ['normalizacion'] },
  't-desalineada-5': { desc: 'T con la segunda crease a 5 mm lateral del cruce', build: () => tLayout(5), tags: ['normalizacion'] },
  'hueco-descentrado': { desc: 'Panel con hueco que no contiene el centroide', build: () => holeCase(false), tags: ['KI-06'] },
  'hueco-centrado': { desc: 'Panel con ventana centrada (centroide dentro del hueco)', build: () => holeCase(true), tags: ['KI-05', 'KI-06'] },
  'panel-pequeno-4.5mm2': { desc: 'Panel de 1.5×3 mm = 4.5 mm² (justo sobre el umbral de 4 mm²)', build: () => strip(31.5, 3, 30), tags: ['paneles-pequenos'] },
  'panel-muy-pequeno-1.5mm2': { desc: 'Panel de 1×1.5 mm = 1.5 mm² (bajo el umbral: se descarta)', build: () => strip(31, 1.5, 30), tags: ['paneles-pequenos'] },
  'panel-delgado-40x1': { desc: 'Solapa de 40×1 mm (relación 40:1 y 40 mm²: se descarta)', build: () => ({ ...strip(40, 11, 0), creases: [path_([[0, 1], [40, 1]], false)] }), tags: ['paneles-pequenos'] },
  'esquinas-redondeadas': { desc: 'Esquinas Bézier', build: rounded, tags: ['KI-07'] },
  'rejilla-2x2': { desc: 'Rejilla 2×2 (creases por arista)', build: () => gridDieline(2), tags: [] },
  'rejilla-4x4': { desc: 'Rejilla 4×4', build: () => gridDieline(4), tags: [] },
  'rejilla-6x6': { desc: 'Rejilla 6×6', build: () => gridDieline(6), tags: [] },
  'rejilla-8x8': { desc: 'Rejilla 8×8', build: () => gridDieline(8), tags: ['KI-08'] },
  'rejilla-lineas-completas-3x3': { desc: 'Rejilla 3×3 con creases de largo completo', build: () => gridDieline(3, { fullLines: true }), tags: ['KI-09'] },
  'rejilla-4x4-densa-25': { desc: 'Rejilla 4×4 con 25 puntos colineales por arista', build: () => gridDieline(4, { extra: 25 }), tags: ['KI-08'] },
};
export const clone = (o) => JSON.parse(JSON.stringify(o));
