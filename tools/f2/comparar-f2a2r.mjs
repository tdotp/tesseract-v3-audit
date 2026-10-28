#!/usr/bin/env node
// F2A-2R — Comparación ANTES (código auditado de F2A-2, commit 2a00433, extraído con git archive a un temporal) / DESPUÉS (árbol de trabajo)
// de adyacencias, uniones, árbol, componentes y ciclos en los 34 casos de F2A-2 y los 7 casos mínimos de F2A-2R.
// Uso: node tools/f2/comparar-f2a2r.mjs [--json salida.json] [--md salida.md]
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { execFileSync } from 'node:child_process'; import { fileURLToPath, pathToFileURL } from 'node:url';
import { CASOS_LEGACY, CASOS_F2A2R } from '../../tests/lib/f2/casos-plegado.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..'); const ANTES = '2a00433850be2ab252d92601fc41c00acc247f76';
const args = process.argv.slice(2); const opt = (k) => (args.includes(k) ? args[args.indexOf(k) + 1] : null);
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'tess-f2a2r-antes-'));
try {
  execFileSync('sh', ['-c', `git -C "${ROOT}" archive ${ANTES} experimental | tar -x -C "${tmp}"`]);
  const A0 = await import(pathToFileURL(path.join(tmp, 'experimental/plegado/index.js')).href); const A1 = await import('../../experimental/plegado/index.js');
  const ver = (Mod, d, eps) => { const m = Mod.adaptarPanelModel(d, { eps: eps == null ? null : Number(eps) }); const A = Mod.construirAdyacencias(m); const T = Mod.construirArbolPlegado(m, A, Mod.baseDefecto(m)); const dg = [...A.diagnosticos, ...T.diagnosticos];
    const ciclo = dg.find((x) => x.tipo === 'ciclo');
    return { paneles: m.panels.length, adyacencias: A.adyacencias.length, uniones: A.uniones ? A.uniones.map((x) => x.clase) : null, pliegues: T.aristas.length, componentes: T.componentes.length, cicloDiag: ciclo ? ciclo.adyacencias.length : 0, nu: ciclo ? ciclo.numeroCiclomatico : (T.numeroCiclomatico ?? 0), diag: [...new Set(dg.map((x) => x.tipo))].sort(), arbol: JSON.stringify(T.aristas), ady: JSON.stringify(A.adyacencias) }; };
  const filas = [];
  for (const [n, build, eps] of [...Object.entries(CASOS_LEGACY).map(([n, c]) => [n, c.build, c.eps]), ...Object.entries(CASOS_F2A2R).map(([n, b]) => ['F2A-2R ' + n, b, null]), ['A-7 ill-real-caja-botanica sin ajuste (fuera de dominio)', () => JSON.parse(fs.readFileSync(path.join(ROOT, 'tests/fixtures/illustrator-real/ill-real-caja-botanica.dieline.json'), 'utf8')), null]]) {
    const a = ver(A0, build(), eps), b = ver(A1, build(), eps);
    const cambios = []; if (a.ady !== b.ady) cambios.push('adyacencias v1'); if (a.arbol !== b.arbol) cambios.push('árbol'); if (a.componentes !== b.componentes) cambios.push('componentes'); if (a.cicloDiag !== b.cicloDiag) cambios.push('ciclos');
    const noPleg = b.uniones.filter((x) => x !== 'plegable').length;
    filas.push({ caso: n, antes: `${a.adyacencias} ady · ${a.pliegues} pl · ${a.componentes} comp · ciclo ${a.cicloDiag} (ν ${a.nu})`, despues: `${b.adyacencias} ady (${b.uniones.length} uniones, ${noPleg} no plegables/ambiguas) · ${b.pliegues} pl · ${b.componentes} comp · ciclo ${b.cicloDiag} (ν ${b.nu})`, cambios: cambios.join(', ') || 'idéntico', diagAntes: a.diag.join(' '), diagDespues: b.diag.join(' '), hallazgo: noPleg ? 'H-01' : a.cicloDiag !== a.nu ? 'H-02' : '' });
  }
  console.table(filas.map(({ diagAntes, diagDespues, ...f }) => f));
  const md = ['# F2A-2R · Comparación antes (`2a00433`) / después (generado por `tools/f2/comparar-f2a2r.mjs`)', '', '«ciclo k (ν m)»: adyacencias en el diagnóstico `ciclo` y número ciclomático; antes, k ≠ ν delata H-02.', '', '| Caso | Antes | Después | Cambios | Hallazgo |', '|---|---|---|---|---|',
    ...filas.map((f) => `| ${f.caso} | ${f.antes} | ${f.despues} | ${f.cambios} | ${f.hallazgo || '—'} |`), '', `Casos idénticos (adyacencias v1, árbol, componentes y ciclos): ${filas.filter((f) => f.cambios === 'idéntico').length} de ${filas.length}.`].join('\n');
  if (opt('--json')) fs.writeFileSync(opt('--json'), JSON.stringify(filas, null, 1) + '\n'); if (opt('--md')) fs.writeFileSync(opt('--md'), md + '\n');
} finally { fs.rmSync(tmp, { recursive: true, force: true }); }
