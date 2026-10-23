// Genera los documentos de prueba desechables (SVG) y expected.json para el Nivel 0. Uso: node tools/illustrator/make-test-docs.mjs
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url'; import { DOCS } from './docs-prueba.mjs'; import { ROOT } from '../../tests/lib/fixtures.mjs';
const here = path.dirname(fileURLToPath(import.meta.url)); const out = path.join(here, 'docs-prueba'); fs.mkdirSync(out, { recursive: true });
const expected = {};
for (const [id, d] of Object.entries(DOCS)) {
  fs.writeFileSync(path.join(out, d.archivo), d.svgFile ? fs.readFileSync(path.join(ROOT, d.svgFile)) : d.svg);
  expected[id] = { archivo: d.archivo, desc: d.desc, esLayers: d.esLayers, maxGroupDepth: d.maxGroupDepth, cutLayer: d.cutLayer ?? null, creaseLayer: d.creaseLayer ?? null, extractError: d.extractError ?? null, extractExpect: d.extractExpect ?? null, artboardMm: d.artboardMm, art: d.art, dieline: d.dieline };
}
fs.writeFileSync(path.join(out, 'expected.json'), JSON.stringify({ _nota: 'Expectativas del Nivel 0 (generadas por make-test-docs.mjs). Supuestos a confirmar en Illustrator real: 1 px = 1 pt; <g id> de primer nivel = capa; doc.layers[0] = capa superior.', docs: expected }, null, 1));
console.log('documentos de prueba en', out, Object.values(DOCS).map((d) => d.archivo).join(', '));
