#!/usr/bin/env node
// F2A-2 — Comparación del adaptador PanelModel v1 y del árbol de plegado experimentales con el legacy (src/core/legacy, solo lectura),
// con cada diferencia clasificada por separado (topología / geometría / representación; si corrige un error histórico; errores del
// adaptador frente al oráculo). Uso: node tools/f2/comparar-legacy-plegado.mjs [--json salida.json] [--md salida.md]
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
import { CASOS_LEGACY } from '../../tests/lib/f2/casos-plegado.mjs';
import { compararConLegacy, resumenClases } from '../../tests/lib/f2/plegado-legacy.mjs';
import { createLegacyEngine } from '../../src/core/engine.js';
import { computeFoldSign } from '../../src/core/legacy/fold-tree.js';

const args = process.argv.slice(2); const opt = (k) => (args.includes(k) ? args[args.indexOf(k) + 1] : null);
const L = createLegacyEngine({ log: () => {} }); const filas = [];
for (const [n, c] of Object.entries(CASOS_LEGACY)) { const R = compararConLegacy(c.build(), c.eps, L, { computeFoldSign, ki: c.ki }); filas.push({ caso: n, legacyAcierta: c.legacyAcierta, ki: c.ki.join(' '), ...R.legacy && { legacy: `${R.legacy.paneles} p · ${R.legacy.adyacencias} ady · ${R.legacy.aristas} pl` }, adaptador: `${R.adaptador.paneles} p · ${R.adaptador.adyacencias} ady`, oraculo: R.oraculo.paneles, ...resumenClases(R), diferencias: R.diferencias, signoCentroide: R.signoCentroide, legacySobreModelo: R.legacySobreModelo, adyacenciaLegacySobreModelo: R.adyacenciaLegacySobreModelo, erroresAdaptador: R.erroresAdaptador }); }
console.table(filas.map(({ diferencias, signoCentroide, legacySobreModelo, erroresAdaptador, ...f }) => f));
const md = ['# F2A-2 · Comparación con el legacy (generado por `tools/f2/comparar-legacy-plegado.mjs`)', '', '| Caso | ¿Legacy acierta? | KI | Legacy | Adaptador | Oráculo | Topología | Geometría | Representación | Esperadas (corrigen) | Errores del adaptador |', '|---|---|---|---|---|---|---|---|---|---|---|',
  ...filas.map((f) => `| ${f.caso} | ${f.legacyAcierta ? 'sí' : 'no'} | ${f.ki || '—'} | ${f.legacy} | ${f.adaptador} | ${f.oraculo} | ${f.topología} | ${f.geometría} | ${f.representación} | ${f.esperadas} | ${f.erroresAdaptador.length} |`), '', '## Detalle de cada diferencia', '',
  ...filas.flatMap((f) => [`### ${f.caso}`, '', ...(f.diferencias.length ? f.diferencias.map((x) => `- **${x.clase}**${x.corrige ? ' · corrige (adaptador = oráculo)' : ''}: ${x.que}`) : ['- sin diferencias']), `- legacy buildFoldTree sobre el modelo v1 del adaptador: ${JSON.stringify(f.legacySobreModelo)} · computeFoldSign (centroide) frente al signo del adaptador: ${JSON.stringify(f.signoCentroide)} · buildAdjacency del legacy sobre el modelo: ${f.adyacenciaLegacySobreModelo}`, ''])].join('\n');
if (opt('--json')) { fs.mkdirSync(path.dirname(opt('--json')), { recursive: true }); fs.writeFileSync(opt('--json'), JSON.stringify(filas, null, 1) + '\n'); }
if (opt('--md')) { fs.mkdirSync(path.dirname(opt('--md')), { recursive: true }); fs.writeFileSync(opt('--md'), md + '\n'); }
void fileURLToPath;
