#!/usr/bin/env node
// Genera la familia de fixtures "illustrator-real" (extracción hecha por Illustrator 30.8.2 real a escala ×1,0: 1 px del SVG = 1 pt) y su golden de comportamiento
// del motor vigente, a partir de la evidencia del Nivel 0 (docs/fase1/nivel0-real). NO modifica fixtures ni goldens históricos de A2/A3; escribe solo:
//   tests/fixtures/illustrator-real/*.dieline.json · tests/golden/illustrator-real.golden.json · tests/golden/fixtures.pins.json (huellas que congelan los históricos)
// Uso: node tests/tools/make-illustrator-real-fixtures.mjs [--check]   (--check no escribe: falla si lo versionado difiere de lo que se generaría)
import fs from 'node:fs'; import path from 'node:path'; import crypto from 'node:crypto'; import { pathToFileURL } from 'node:url';
import { ROOT } from '../lib/fixtures.mjs'; import { TARGETS, loadGeometry, sha256 } from '../lib/legacy.mjs'; import { analyze } from '../lib/analyze.mjs';
const sha = (b) => crypto.createHash('sha256').update(b).digest('hex'); const EV = path.join(ROOT, 'docs/fase1/nivel0-real'); const OUT = path.join(ROOT, 'tests/fixtures/illustrator-real');
export const FAMILY = {
  'ill-real-caja-botanica': { src: 'N0-A_caja_real_export.svg__extract.json', desc: 'Caja Botánica: exportación SVG real de Illustrator reabierta en Illustrator real (1 px = 1 pt); 175.0 × 223.5 mm; equivale a la salida real del plugin', tags: ['real', 'KI-04', 'KI-22', 'x1.0'] },
  'ill-real-caja-simple': { src: 'N0-B_caja_simple_arte.svg__extract.json', desc: 'Caja simple 100×60 con hueco 10×10 y 1 crease, extraída por Illustrator real (fuente SVG sintética)', tags: ['extraccion-real', 'sintetico', 'x1.0'] },
  'ill-real-compuesto': { src: 'N0-F_trazado_compuesto.svg__extract.json', desc: 'Contorno + hueco como trazado compuesto, extraído por Illustrator real (fuente SVG sintética)', tags: ['extraccion-real', 'sintetico', 'x1.0'] },
  'ill-real-curvas': { src: 'N0-G_curvas.svg__extract.json', desc: 'Rectángulo 120×60 con esquinas Bézier y 1 crease, extraído por Illustrator real (fuente SVG sintética)', tags: ['extraccion-real', 'sintetico', 'x1.0'] },
};
const HIST = ['tests/fixtures/real/caja-botanica-real.dieline.json', 'tests/fixtures/real/caja-botanica-illustrator-export.dieline.json', 'tests/fixtures/real/caja-botanica-illustrator-export.svg', 'tests/golden/geometry.golden.json', 'tests/golden/glb.golden.json', 'tests/golden/constants.golden.json', 'tests/golden/panel.pins.json'];
export function build() {
  const L = loadGeometry(TARGETS.baseline); const files = {}; const golden = { _fuente: 'docs/fase1/nivel0-real (Nivel 0, Illustrator 30.8.2 real)', _sha256_main_js: sha256(TARGETS.baseline), fixtures: {} };
  for (const [id, f] of Object.entries(FAMILY)) {
    const raw = fs.readFileSync(path.join(EV, f.src)); const j = JSON.parse(raw); const dieline = j._resultado; if (dieline.error) throw new Error(id + ': extracción con error');
    files[path.join('tests/fixtures/illustrator-real', id + '.dieline.json')] = JSON.stringify(dieline, null, 1) + '\n';
    golden.fixtures[id] = { desc: f.desc, tags: f.tags, fuente: f.src, sha256Fuente: sha(raw), ...analyze(L, dieline) };
  }
  golden.discrepancia_KI22 = { descripcion: 'La MISMA Caja Botánica: el fixture histórico (derivado del SVG a ×0.75, px CSS) da 13 paneles; la extracción real de Illustrator a ×1.0 da 11. Ambos sin avisos.', historico: 'real/caja-botanica-illustrator-export', real: 'ill-real-caja-botanica', factor: 4 / 3 };
  const pins = { _nota: 'Huellas SHA-256 que CONGELAN los fixtures y goldens históricos de A2/A3. Un cambio exige una decisión explícita del usuario.', archivos: {} };
  for (const h of HIST) pins.archivos[h] = sha(fs.readFileSync(path.join(ROOT, h)));
  files['tests/golden/illustrator-real.golden.json'] = JSON.stringify(golden, null, 1) + '\n'; files['tests/golden/fixtures.pins.json'] = JSON.stringify(pins, null, 1) + '\n';
  return files;
}
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const files = build(); const check = process.argv.includes('--check'); let diff = 0;
  for (const [rel, content] of Object.entries(files)) { const p = path.join(ROOT, rel); if (check) { if (!fs.existsSync(p) || fs.readFileSync(p, 'utf8') !== content) { console.log('DIFIERE: ' + rel); diff++; } } else { fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, content); console.log('escrito ' + rel); } }
  if (check) { console.log(diff ? `${diff} archivo(s) difieren` : 'OK: lo versionado coincide con lo generado'); process.exit(diff ? 1 : 0); }
}
