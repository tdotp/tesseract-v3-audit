#!/usr/bin/env node
// F2A-0 — Genera tests/golden/f2-caja-botanica.golden.json desde el ORÁCULO (tests/lib/f2/oraculo.mjs). Nunca desde el legacy.
// Regenerar solo en una tarea aprobada que cambie el oráculo; la prueba f2-caja-botanica compara el oráculo con este archivo.
import fs from 'node:fs'; import path from 'node:path'; import crypto from 'node:crypto'; import { fileURLToPath } from 'node:url';
import { ROOT } from '../lib/fixtures.mjs';
import { oraculo, resumen } from '../lib/f2/oraculo.mjs';

export const CASOS = {
  'caja-botanica-real@eps=null': { fixture: 'tests/fixtures/real/caja-botanica-real.dieline.json', eps: null },
  'caja-botanica-real@eps=0.05': { fixture: 'tests/fixtures/real/caja-botanica-real.dieline.json', eps: '0.05' },
  'ill-real-caja-botanica@eps=0.05': { fixture: 'tests/fixtures/illustrator-real/ill-real-caja-botanica.dieline.json', eps: '0.05' },
  'caja-botanica-illustrator-export@eps=0.05': { fixture: 'tests/fixtures/real/caja-botanica-illustrator-export.dieline.json', eps: '0.05' },
};
export function generar() {
  const out = { _nota: 'Golden del ORÁCULO independiente (F2A-0). 13 paneles = resultado CANDIDATO (DP-2), no criterio único. ε = 0.05 solo experimental (DP-3).', casos: {} };
  for (const [k, c] of Object.entries(CASOS)) {
    const txt = fs.readFileSync(path.join(ROOT, c.fixture));
    out.casos[k] = { fixture: c.fixture, sha256Fixture: crypto.createHash('sha256').update(txt).digest('hex'), ...resumen(oraculo(JSON.parse(txt), { eps: c.eps })) };
  }
  return out;
}
if (fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const f = path.join(ROOT, 'tests/golden/f2-caja-botanica.golden.json'); fs.writeFileSync(f, JSON.stringify(generar(), null, 1) + '\n'); console.log('→ ' + path.relative(ROOT, f));
}
