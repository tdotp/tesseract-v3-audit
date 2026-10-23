// Convierte la exportación REAL de Illustrator (SVG) al formato DielineV1 del plugin, usando el parser de tesseract-web.
// Solo se ejecuta para (re)generar fixtures; las pruebas NO dependen de tesseract-web.
// Uso: WEB_DIR=<COPIA construida de tesseract-web> node tests/tools/make-illustrator-fixture.mjs
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const core = await import(process.env.WEB_DIR + '/packages/core/dist/index.js');
const svg = fs.readFileSync(path.join(here, '../fixtures/real/caja-botanica-illustrator-export.svg'), 'utf8');
const f = core.parseDieline(svg);
const d = { version: '1.0', units: 'mm', thickness_mm: 0.25, outerBoundary: f.outerBoundary, holes: f.holes ?? [], cutLines: [], creases: f.creases,
  meta: { cutLayer: '(derivado de SVG)', creaseLayer: '(derivado de SVG)', closedCutCount: 1 + (f.holes ?? []).length, openCutCount: 0, creaseCount: f.creases.length, source: 'caja-botanica-illustrator-export.svg vía parseDieline de tesseract-web (HEAD c0aeb34)' } };
fs.writeFileSync(path.join(here, '../fixtures/real/caja-botanica-illustrator-export.dieline.json'), JSON.stringify(d, null, 1));
console.log('OK', d.outerBoundary.points.length, 'puntos de contorno,', d.creases.length, 'creases');
