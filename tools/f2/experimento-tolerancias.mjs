#!/usr/bin/env node
// F2.0 — Experimento E-TOL: ¿existe una banda de tolerancia que separe el ruido de coordenadas de las características reales del troquel?
// Ejecuta la SOMBRA parametrizada del legacy (GRAPH_EPS = ε) y del motor web (snap = ε, fusión = ε) sobre los fixtures reales a varias escalas.
// Oráculo independiente del legacy: conservación de área (Σ paneles = área del contorno; el legacy no resta huecos por KI-06, el web sí) y
// estabilidad del resultado normalizado frente a la escala. Control: la sombra con ε = 0.5 debe reproducir el motor real (se comprueba).
// Uso: node tools/f2/experimento-tolerancias.mjs [--json salida.json]
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
import { legacySombra, webSombra } from './lib/sombra.mjs';
import { ejecutarEtapas, escalar } from './lib/etapas.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const args = process.argv.slice(2); const salida = args.includes('--json') ? args[args.indexOf('--json') + 1] : null;
const FIX = { 'ill-real-caja-botanica': 'tests/fixtures/illustrator-real/ill-real-caja-botanica.dieline.json', 'caja-botanica-real': 'tests/fixtures/real/caja-botanica-real.dieline.json', 'ill-real-caja-simple': 'tests/fixtures/illustrator-real/ill-real-caja-simple.dieline.json', 'ill-real-compuesto': 'tests/fixtures/illustrator-real/ill-real-compuesto.dieline.json', 'ill-real-curvas': 'tests/fixtures/illustrator-real/ill-real-curvas.dieline.json' };
const ESCALAS = [0.25, 0.5, 0.75, 1, 1.5, 2, 4];
const EPS = [0.5, 0.25, 0.1, 0.05, 0.02, 0.01, 0.005, 0.002, 0.001];
const areaPoligono = (pa) => { const p = pa.points.map((q) => q.anchor); let s = 0; for (let i = 0; i < p.length; i++) { const a = p[i], b = p[(i + 1) % p.length]; s += a.x * b.y - b.x * a.y; } return Math.abs(s) / 2; };
const W = await webSombra();

// Control de la sombra: ε = 0.5 ⇒ mismos paneles que el motor real en todas las escalas y fixtures
const L05 = legacySombra(0.5); let controlOK = true;
for (const [n, f] of Object.entries(FIX)) { const d = JSON.parse(fs.readFileSync(path.join(ROOT, f), 'utf8')); for (const s of ESCALAS) { const ds = escalar(d, s); const a = JSON.stringify(L05.buildPanels(JSON.parse(JSON.stringify(ds))).panels.map((p) => [p.area, p.centroid])); const b = JSON.stringify(ejecutarEtapas(ds).panels.map((p) => [p.area, p.centroid])); if (a !== b) { controlOK = false; console.log('CONTROL FALLA', n, s); } } }
console.log('Control (sombra legacy ε=0.5 ≡ motor real en 5 fixtures × 7 escalas):', controlOK ? 'OK' : 'FALLA');

const filas = [];
for (const eps of EPS) {
  const L = legacySombra(eps);
  for (const [n, f] of Object.entries(FIX)) {
    const d = JSON.parse(fs.readFileSync(path.join(ROOT, f), 'utf8'));
    const res = ESCALAS.map((s) => {
      const ds = escalar(d, s); const pd = L.buildPanels(JSON.parse(JSON.stringify(ds)));
      const area = pd.panels.reduce((t, p) => t + p.area, 0) / (s * s); const esperada = areaPoligono(ds.outerBoundary) / (s * s);
      const adj = L.buildAdjacency(pd.panels, pd.creaseEdges); const base = pd.panels.length ? L.getDefaultBaseIndex(pd) : -1; const tree = pd.panels.length ? L.buildFoldTree(pd.panels, adj, base) : [];
      let w; try { w = W.topologiaParam(ds, { snap: eps, fusion: Math.min(eps, 1e-6 > eps ? eps : 1e-6) }); } catch (e) { w = { error: e.message }; }
      let w2; try { w2 = W.topologiaParam(ds, { snap: eps, fusion: eps }); } catch (e) { w2 = { error: e.message }; }
      return { s, lp: pd.panels.length, lArea: area, lEsp: esperada, lConexo: pd.panels.length === 0 || tree.length === pd.panels.length - 1, wp: w.paneles, wCons: w.conserva, w2p: w2.paneles, w2Cons: w2.conserva };
    });
    const firmasL = new Set(res.map((r) => r.lp + '|' + r.lArea.toFixed(2)));
    filas.push({ eps, troquel: n,
      legacy_paneles: res.map((r) => r.lp).join(','), legacy_invariante: firmasL.size === 1, legacy_conservaArea: res.every((r) => Math.abs(r.lArea - r.lEsp) <= r.lEsp * 1e-6), legacy_conexo: res.every((r) => r.lConexo),
      legacy_areaRel: res.map((r) => (r.lArea / r.lEsp).toFixed(4)).join(','),
      web_snap_paneles: res.map((r) => r.wp).join(','), web_snap_conserva: res.every((r) => r.wCons),
      web_snapFusion_paneles: res.map((r) => r.w2p).join(','), web_snapFusion_conserva: res.every((r) => r.w2Cons) });
  }
}
console.log(`Escalas: ${ESCALAS.join(', ')}`);
console.table(filas.map((f) => ({ eps: f.eps, troquel: f.troquel, 'legacy paneles': f.legacy_paneles, inv: f.legacy_invariante ? '✓' : '✗', area: f.legacy_conservaArea ? '✓' : '✗', conexo: f.legacy_conexo ? '✓' : '✗', 'web snap': f.web_snap_paneles, wA: f.web_snap_conserva ? '✓' : '✗', 'web snap+fusión': f.web_snapFusion_paneles, wfA: f.web_snapFusion_conserva ? '✓' : '✗' })));
if (salida) { fs.mkdirSync(path.dirname(salida), { recursive: true }); fs.writeFileSync(salida, JSON.stringify({ control: controlOK, escalas: ESCALAS, eps: EPS, filas }, null, 1) + '\n'); console.log('→ ' + salida); }
