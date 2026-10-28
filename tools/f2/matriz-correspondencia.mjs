#!/usr/bin/env node
// F2A-0 — Matriz de correspondencia de paneles y creases de la Caja Botánica: oráculo (3 extracciones) frente al legacy (×1 y ×0.75).
// Identificador estable de panel = conjunto de creases que lo separan (docs/fase2/04 §4); las creases del histórico se reetiquetan por
// geometría. Salida: docs/fase2/evidencia/f2a0-matriz-correspondencia.{md,json}. Uso: node tools/f2/matriz-correspondencia.mjs
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
import { oraculo, resumen } from '../../tests/lib/f2/oraculo.mjs';
import { compararLegacy, compararOraculos, mapaCreasesPorGeometria, transformarDouble } from '../../tests/lib/f2/comparar.mjs';
import * as Q from '../../tests/lib/f2/racional.mjs';
import { buildPanels } from '../../src/core/legacy/panels.js';
import { buildAdjacency } from '../../src/core/legacy/adjacency.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..'); const EV = path.join(ROOT, 'docs/fase2/evidencia');
const rd = (f) => JSON.parse(fs.readFileSync(path.join(ROOT, f), 'utf8'));
const REAL = rd('tests/fixtures/real/caja-botanica-real.dieline.json'), ILL = rd('tests/fixtures/illustrator-real/ill-real-caja-botanica.dieline.json'), HIST = rd('tests/fixtures/real/caja-botanica-illustrator-export.dieline.json');
const cs = (l) => l.slice().sort((a, b) => Number(a.slice(1)) - Number(b.slice(1))).join(' ');
const legacy = (d) => { const pd = buildPanels(JSON.parse(JSON.stringify(d))); return { panels: pd.panels, adj: buildAdjacency(pd.panels, pd.creaseEdges) }; };
const OR = oraculo(REAL, {}), OI = oraculo(ILL, { eps: '0.05' }), OH = oraculo(HIST, { eps: '0.05' });
const mH = mapaCreasesPorGeometria(REAL, HIST).mapa; const mapaH = (id) => mH.get(id);
const porFirma = (R, mapa = (x) => x) => new Map(R.paneles.map((p, i) => [cs(p.creases.map(mapa)), { i, p }]));
const fR = porFirma(OR), fI = porFirma(OI), fH = porFirma(OH, mapaH);
const r075 = transformarDouble(REAL, (p) => ({ x: p.x * 0.75, y: p.y * 0.75 }));
const LEG = { 'legacy original ×1': [OR, legacy(REAL), 1], 'legacy Illustrator ×1': [OI, legacy(ILL), 1], 'legacy original ×0.75': [oraculo(r075, { eps: '0.05' }), legacy(r075), 0.5625] };
const cmpL = Object.fromEntries(Object.entries(LEG).map(([k, [R, L, s2]]) => { const c = compararLegacy(R, L.panels, L.adj, { ruidoMm: 0.005 }); return [k, { R, c, s2, porF: new Map(c.filas.map((f) => [f.creases, f])) }]; }));
const repr = compararOraculos(OR, OI, { ruidoMm: 0.005 });
const filas = [...fR.keys()].sort().map((k) => {
  const a = fR.get(k).p, b = fI.get(k), h = fH.get(k), A = Q.aNumero(a.area);
  const row = { panel: k, areaOriginal: +A.toFixed(4), areaIllustrator: b ? +Q.aNumero(b.p.area).toFixed(4) : null, dA_Illustrator: b ? +(Q.aNumero(b.p.area) - A).toFixed(4) : null, areaHistX075_normalizada: h ? +(Q.aNumero(h.p.area) / 0.5625).toFixed(4) : null, centroideOriginal: resumen(OR).paneles[fR.get(k).i].centroideMm };
  for (const [n, x] of Object.entries(cmpL)) { const f = x.porF.get(k); row[n] = f ? `${f.legacy || '—'} · ${f.clase}${f.dA != null ? ` · ΔA=${(f.dA / x.s2).toFixed(2)}` : ''}` : '—'; }
  return row;
});
const crs = resumen(OR).creases.map((c) => { const i = resumen(OI).creases.find((x) => x.id === c.id); const pares = (S, p) => p.split('-').map((j) => cs(S.paneles[Number(j)].creases)).join(' ⟷ ');
  const S = resumen(OR), SI = resumen(OI); const row = { crease: c.id, separaMm: +c.separaMm.toFixed(3), sobreCorteMm: +c.sobreCorteMm.toFixed(3), une: pares(S, c.pares[0]), une_Illustrator: i.pares.length === 1 ? pares(SI, i.pares[0]) : i.pares.join(','), sobreCorte_Illustrator: +i.sobreCorteMm.toFixed(3), fuera_Illustrator: +i.fueraMm.toFixed(3) };
  for (const [n, [R, L]] of Object.entries(LEG)) row[n + ' (adyacencias con esa crease)'] = L.adj.filter((a) => 'C' + a.creaseIdx === c.id).length; return row; });
const out = { nota: 'Oráculo F2A-0. 13 paneles = candidato (DP-2). ε = 0.05 solo experimental (DP-3).', original_vs_illustrator: repr.clase, paneles: filas, creases: crs, legacyEspurios: Object.fromEntries(Object.entries(cmpL).map(([k, x]) => [k, x.c.espurios])), legacyAdyacenciasQueFaltan: Object.fromEntries(Object.entries(cmpL).map(([k, x]) => [k, x.c.adyFaltan])) };
fs.mkdirSync(EV, { recursive: true }); fs.writeFileSync(path.join(EV, 'f2a0-matriz-correspondencia.json'), JSON.stringify(out, null, 1) + '\n');
const md = (rows) => { const ks = Object.keys(rows[0]); return '| ' + ks.join(' | ') + ' |\n|' + ks.map(() => '---').join('|') + '|\n' + rows.map((r) => '| ' + ks.map((k) => String(r[k] ?? '—').replace(/\|/g, '/')).join(' | ') + ' |').join('\n') + '\n'; };
fs.writeFileSync(path.join(EV, 'f2a0-matriz-correspondencia.md'), `# Matriz de correspondencia — Caja Botánica (F2A-0)\n\nGenerada por \`node tools/f2/matriz-correspondencia.mjs\`. Panel = conjunto de creases que lo separan (estable). Original = \`caja-botanica-real\` sin ajuste (ε = 0); Illustrator = \`ill-real-caja-botanica\` con ε experimental 0.05; histórico ×0.75 reetiquetado por geometría y normalizado (÷ 0.5625). ΔA del legacy normalizado a ×1; «representación» = |ΔA| ≤ ν·perímetro con ν = 0.005 mm. Original frente a Illustrator: **${repr.clase}**.\n\n## Paneles\n\n${md(filas)}\n## Creases\n\n${md(crs)}`);
console.log(md(filas)); console.log(md(crs));
