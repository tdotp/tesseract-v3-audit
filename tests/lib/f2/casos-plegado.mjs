// F2A-2 — Casos de la comparación con el legacy. `legacyAcierta` = hay evidencia previa de que el legacy es correcto en ese caso
// (rejillas, cruces completos, caja simple: Plan §5 criterio 3 y F2A-0); solo ahí se exige ausencia de diferencias topológicas y
// geométricas. `ki` = defecto conocido o ambigüedad que explica la diferencia esperada (docs/KNOWN_ISSUES.md, F2A0_04).
import fs from 'node:fs'; import path from 'node:path';
import { ROOT, gridDieline } from '../fixtures.mjs';
import { FIXTURES_F2 } from './fixtures-f2.mjs';

const rd = (f) => () => JSON.parse(fs.readFileSync(path.join(ROOT, f), 'utf8'));
const KI = { 'x-cruz': ['KI-09'], 't-exacta': ['KI-04'], 't-ruido': ['KI-04'], 't-ruido-sin-ajuste': ['A-7'], 't-desalineada-0.375': ['A-3'], 'crease-corta-ruido': ['KI-17'], 'crease-corta-banda': ['A-4', 'KI-17'], 'crease-corta-0.6': ['A-5', 'KI-17'], 'crease-paralela-ruido': ['A-6'],
  'escalon-crease': ['A-1'], 'escalon-contorno': ['A-1'], 'hueco-centrado': ['KI-05'], 'hueco-descentrado': ['KI-06'], 'corte-abierto-divide': ['A-9'], 'corte-abierto-parcial': ['A-9'], 'panel-pequeno-1.5mm2': ['KI-19'], 'panel-delgado-40x1': ['KI-19'], 'esquinas-redondeadas-anclas': ['A-10', 'KI-07'] };
const ACIERTA = new Set(['rejilla-4x4', 'rejilla 2×2', 'rejilla 6×6', 'rejilla 8×8', 'rejilla 4×4 densa', 'ill-real-caja-simple']);
// Panel no convexo que envuelve a su padre: su centroide cae al otro lado de la recta de la crease (computeFoldSign del legacy usa el
// centroide; el adaptador, la semiarista). Padre 60×60; hijo = franja 10×70 a la derecha + barra 220×10 por encima (2 900 mm²).
const q = (x, y) => ({ anchor: { x, y }, left: { x, y }, right: { x, y } });
export const envolvente = () => ({ version: '1.0', units: 'mm', thickness_mm: 0.25, holes: [], cutLines: [], meta: { synthetic: true, f2a2: true },
  outerBoundary: { closed: true, points: [[0, 0], [60, 0], [70, 0], [70, 80], [-150, 80], [-150, 70], [60, 70], [60, 60], [0, 60]].map(([x, y]) => q(x, y)) }, creases: [{ closed: false, points: [q(60, 0), q(60, 60)] }] });
export const CASOS_LEGACY = {};
for (const [n, f] of Object.entries(FIXTURES_F2)) CASOS_LEGACY[n] = { build: f.build, eps: f.eps, ki: KI[n] || [] };
Object.assign(CASOS_LEGACY, {
  'caja-botanica-real': { build: rd('tests/fixtures/real/caja-botanica-real.dieline.json'), eps: null, ki: ['KI-22', 'KI-04'] },
  'ill-real-caja-botanica ε 0.05': { build: rd('tests/fixtures/illustrator-real/ill-real-caja-botanica.dieline.json'), eps: '0.05', ki: ['KI-22', 'KI-04'] },
  'histórico ×0.75 ε 0.05': { build: rd('tests/fixtures/real/caja-botanica-illustrator-export.dieline.json'), eps: '0.05', ki: ['KI-22'] },
  'ill-real-caja-simple': { build: rd('tests/fixtures/illustrator-real/ill-real-caja-simple.dieline.json'), eps: null, ki: ['KI-06'] },
  'ill-real-compuesto': { build: rd('tests/fixtures/illustrator-real/ill-real-compuesto.dieline.json'), eps: null, ki: [] },
  'ill-real-curvas': { build: rd('tests/fixtures/illustrator-real/ill-real-curvas.dieline.json'), eps: null, ki: ['A-10', 'KI-07'] },
  'panel no convexo envolvente': { build: envolvente, eps: null, ki: ['KI-36 (propuesto): signo por centroide'] },
  'rejilla 2×2': { build: () => gridDieline(2), eps: null, ki: [] }, 'rejilla 6×6': { build: () => gridDieline(6), eps: null, ki: [] }, 'rejilla 8×8': { build: () => gridDieline(8), eps: null, ki: [] },
  'rejilla 3×3 líneas completas': { build: () => gridDieline(3, { fullLines: true }), eps: null, ki: ['KI-09'] }, 'rejilla 4×4 densa': { build: () => gridDieline(4, { extra: 25 }), eps: null, ki: [] },
});
for (const [n, c] of Object.entries(CASOS_LEGACY)) c.legacyAcierta = ACIERTA.has(n);
