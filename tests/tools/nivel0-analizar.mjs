#!/usr/bin/env node
// Analiza los JSON que producen los .jsx del Nivel 0 en Illustrator real (carpeta ~/Desktop/Tesseract_Nivel0) y los compara con:
//   · las expectativas de tools/illustrator/docs-prueba/expected.json (contratos del documento de prueba)
//   · el motor vigente (baseline) ejecutado sobre el troquel esperado (golden de comportamiento)
//   · las suposiciones de la maqueta de Illustrator (sondas)
// Genera INFORME_NIVEL0.md y resultados.json. Uso: node tests/tools/nivel0-analizar.mjs <carpeta_con_JSON> [--out <carpeta_salida>]
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
import { TARGETS, loadGeometry } from '../lib/legacy.mjs'; import { analyze, outlineArea } from '../lib/analyze.mjs';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const L = loadGeometry(TARGETS.baseline); const MM = 0.352778;
const near = (a, b, tol) => Math.abs(a - b) <= tol; const rel = (a, b, r = 1e-3, abs = 0.05) => Math.abs(a - b) <= Math.max(abs, r * Math.max(Math.abs(a), Math.abs(b)));
const len = (pts) => pts.slice(1).reduce((s, p, i) => s + Math.hypot(p.anchor.x - pts[i].anchor.x, p.anchor.y - pts[i].anchor.y), 0);
const ring = (b) => b.points.map((p) => p.anchor); const area = (a) => { let s = 0; for (let i = 0; i < a.length; i++) { const p = a[i], q = a[(i + 1) % a.length]; s += p.x * q.y - q.x * p.y; } return Math.abs(s) / 2; };
export function invariants(d) { const handles = []; const all = [d.outerBoundary, ...d.holes, ...d.creases]; let curvos = 0;
  for (const b of all) for (const p of b.points) for (const h of ['left', 'right']) { const l = Math.hypot(p[h].x - p.anchor.x, p[h].y - p.anchor.y); if (l > 1e-4) { handles.push(+l.toFixed(3)); } } for (const b of all) for (const p of b.points) if (['left', 'right'].some((h) => Math.hypot(p[h].x - p.anchor.x, p[h].y - p.anchor.y) > 1e-4)) curvos++;
  const xs = ring(d.outerBoundary); const bb = [Math.min(...xs.map((p) => p.x)), Math.min(...xs.map((p) => p.y)), Math.max(...xs.map((p) => p.x)), Math.max(...xs.map((p) => p.y))];
  return { puntosContorno: d.outerBoundary.points.length, areaContorno: area(xs), bbox: [bb[2] - bb[0], bb[3] - bb[1]], huecos: d.holes.length, areasHuecos: d.holes.map((h) => area(ring(h))).sort((a, b) => a - b), creases: d.creases.length, longCreases: d.creases.map((c) => len(c.points)).sort((a, b) => a - b), puntosConManijas: curvos, manijas: handles.sort((a, b) => a - b) }; }
function cmpInv(a, b) { const bad = []; const chk = (k, ok, va, vb) => { if (!ok) bad.push(`${k}: real ${JSON.stringify(va)} vs esperado ${JSON.stringify(vb)}`); };
  chk('puntosContorno', a.puntosContorno === b.puntosContorno, a.puntosContorno, b.puntosContorno); chk('areaContorno mm²', rel(a.areaContorno, b.areaContorno), +a.areaContorno.toFixed(3), +b.areaContorno.toFixed(3));
  chk('bbox mm', near(a.bbox[0], b.bbox[0], 0.05) && near(a.bbox[1], b.bbox[1], 0.05), a.bbox.map((v) => +v.toFixed(3)), b.bbox.map((v) => +v.toFixed(3))); chk('huecos', a.huecos === b.huecos, a.huecos, b.huecos);
  chk('áreas de huecos', a.areasHuecos.length === b.areasHuecos.length && a.areasHuecos.every((v, i) => rel(v, b.areasHuecos[i])), a.areasHuecos, b.areasHuecos); chk('creases', a.creases === b.creases, a.creases, b.creases);
  chk('longitudes de creases', a.longCreases.length === b.longCreases.length && a.longCreases.every((v, i) => near(v, b.longCreases[i], 0.03)), a.longCreases.map((v) => +v.toFixed(3)), b.longCreases.map((v) => +v.toFixed(3)));
  chk('puntos con manijas', a.puntosConManijas === b.puntosConManijas, a.puntosConManijas, b.puntosConManijas); chk('longitudes de manijas', a.manijas.length === b.manijas.length && a.manijas.every((v, i) => near(v, b.manijas[i], 0.03)), a.manijas, b.manijas); return bad; }
const R = (id, estado, detalle) => ({ id, estado, detalle }); // estado: OK | DIF | FALLA | NO_VERIFICABLE | NO_EJECUTADO

export function analyzeDir(dir) {
  const spec = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools/illustrator/docs-prueba/expected.json'), 'utf8')).docs; const files = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith('.json')) : [];
  const out = { carpeta: dir, docs: {}, env: null, diferencias: [], resumen: {} };
  const load = (id, kind) => { const f = files.find((x) => x.startsWith(id) && x.endsWith(`__${kind}.json`)); return f ? { f, j: JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')) } : null; };
  for (const [id, ex] of Object.entries(spec)) {
    const r = []; const sv = load(id, 'survey'), xt = load(id, 'extract'), ar = load(id, 'art'); const expAn = analyze(L, ex.dieline); const expInv = invariants(ex.dieline);
    for (const [k, x] of [['survey', sv], ['extract', xt], ['art', ar]]) if (x) { out.env ||= x.j._env; r.push(x.j._integridad?.identicos === true ? R(`INT-${k}`, 'OK', 'estado del documento idéntico antes/después') : R(`INT-${k}`, 'FALLA', 'el guardián NO confirma identidad: ' + JSON.stringify({ restaurado: x.j._integridad?.restaurado }))); }
    // L0-1/L0-2/L0-5 desde el inventario
    if (!sv) r.push(R('L0-1', 'NO_EJECUTADO', 'falta __survey.json')); else { const res = sv.j._resultado; if (res.error) r.push(R('L0-1', 'FALLA', res.error)); else {
      const names = res.layers.map((l) => l.name); r.push(JSON.stringify(names) === JSON.stringify(ex.esLayers) ? R('L0-2', 'OK', `capas (arriba→abajo): ${names.join(', ')}`) : R('L0-2', 'DIF', `capas reales ${JSON.stringify(names)} vs esperadas ${JSON.stringify(ex.esLayers)} (¿orden o importación de <g id> distintos?)`));
      const depth = Object.fromEntries(res.layers.map((l) => [l.name, l.items.maxGroupDepth])); const okd = Object.entries(ex.maxGroupDepth).every(([n, v]) => depth[n] === v); r.push(okd ? R('L0-1', 'OK', `profundidad de grupos ${JSON.stringify(depth)}`) : R('L0-1', 'DIF', `profundidad real ${JSON.stringify(depth)} vs esperada ${JSON.stringify(ex.maxGroupDepth)}`));
      const ab = res.artboards[0]; r.push(near(ab.widthMm, ex.artboardMm[0], 0.5) && near(ab.heightMm, ex.artboardMm[1], 0.5) ? R('L0-5', 'OK', `artboard ${ab.widthMm.toFixed(2)}×${ab.heightMm.toFixed(2)} mm (1 px = 1 pt confirmado)`) : R('L0-5', 'DIF', `artboard real ${ab.widthMm.toFixed(2)}×${ab.heightMm.toFixed(2)} mm vs esperado ${ex.artboardMm.join('×')} (¿escala o unidades distintas?)`));
      out.sondas ||= {}; out.sondas[id] = res.sondas; } }
    // L0-3/L0-4/L0-6 desde la extracción
    if (!xt) r.push(R('L0-3', 'NO_EJECUTADO', 'falta __extract.json')); else { const e = xt.j._resultado;
      if (ex.extractError) r.push(e.error && e.error.startsWith(ex.extractError) ? R('L0-3', 'OK', `KI-10 REPRODUCIDO en Illustrator real: «${e.error}»`) : R('L0-3', 'DIF', e.error ? `error distinto: «${e.error}»` : 'KI-10 NO se reproduce: el extractor real SOPORTA grupos anidados (la maqueta predecía "Script error")'));
      else if (e.error) r.push(R('L0-3', 'FALLA', e.error)); else {
        r.push(R('L0-3', 'OK', `extracción sin error (capa de corte «${e.meta.cutLayer}», de pliegue «${e.meta.creaseLayer}»)`));
        if (ex.cutLayer) r.push(e.meta.cutLayer === ex.cutLayer ? R('L0-2b', 'OK', `capa de corte elegida «${e.meta.cutLayer}»${ex.extractExpect === 'decoy' ? ' (KI-10 por subcadena REPRODUCIDO en real)' : ''}`) : R('L0-2b', 'DIF', `capa de corte real «${e.meta.cutLayer}» vs esperada «${ex.cutLayer}»${ex.extractExpect === 'decoy' ? ' — KI-10 por subcadena NO se reproduce en real' : ''}`));
        if (ex.extractExpect === 'decoy') { /* el señuelo es un triángulo: no comparar invariantes con el troquel */ } else {
          const bad = cmpInv(invariants(e), expInv); r.push(bad.length ? R('L0-4', 'DIF', bad.join(' · ')) : R('L0-4', 'OK', `invariantes del troquel iguales a los esperados (puntos, áreas, bbox, huecos, creases, manijas)`));
          const an = analyze(L, e); const ok = an.nPanels === expAn.nPanels && rel(an.areaSum, expAn.areaSum) && an.adjacency.length === expAn.adjacency.length && an.validate.problems.length === expAn.validate.problems.length;
          r.push(ok ? R('L0-6', 'OK', `motor vigente sobre la extracción real: ${an.nPanels} paneles, área ${an.areaSum}, ${an.adjacency.length} adyacencias, ${an.validate.problems.length} avisos (= esperado)`) : R('L0-6', 'DIF', `real ${an.nPanels}p/${an.areaSum}mm²/${an.adjacency.length}adj/${an.validate.problems.length}avisos vs esperado ${expAn.nPanels}p/${expAn.areaSum}mm²/${expAn.adjacency.length}adj/${expAn.validate.problems.length}avisos`)); } } }
    // L0-7 arte
    if (ex.art) { if (!ar) r.push(R('L0-7', 'NO_EJECUTADO', 'falta __art.json')); else { const a = ar.j._resultado; if (a.error) r.push(R('L0-7', 'FALLA', a.error)); else { const probs = [];
      if (a.mode !== ex.art.mode) probs.push(`modo ${a.mode} vs esperado ${ex.art.mode}`); for (const s of ['front', 'back']) { if (!!a[s] !== !!ex.art[s]) probs.push(`${s}: ${a[s] ? 'presente' : 'ausente'}`); }
      const ab = ex.artboardMm; const ptW = ab[0] / MM, ptH = ab[1] / MM; const scale = Math.min(800, Math.max(100, (4096 / Math.max(ptW, ptH)) * 100)); let pngNote = '';
      for (const s of ['front', 'back']) if (a[s]) { if (!a[s].png) pngNote = 'PNG no verificable (no se pudo leer el archivo)'; else { const ew = Math.round(ptW * scale / 100), eh = Math.round(ptH * scale / 100); if (Math.abs(a[s].png.ancho - ew) > 2 || Math.abs(a[s].png.alto - eh) > 2) probs.push(`${s}: PNG ${a[s].png.ancho}×${a[s].png.alto} vs esperado ≈${ew}×${eh} (escala ${scale.toFixed(1)} %)`); } if (a[s].exportScale && Math.abs(a[s].exportScale - scale) > 0.5) probs.push(`${s}: escala ${a[s].exportScale} vs esperada ${scale.toFixed(2)}`); }
      r.push(probs.length ? R('L0-7', 'DIF', probs.join(' · ')) : pngNote ? R('L0-7', 'NO_VERIFICABLE', pngNote + '; modo/lados/escala correctos') : R('L0-7', 'OK', `modo ${a.mode}, front y back exportados, PNG ${a.front.png.ancho}×${a.front.png.alto} (escala ${scale.toFixed(1)} %), estado restaurado`)); } } }
    out.docs[id] = { archivo: ex.archivo, desc: ex.desc, resultados: r };
  }
  // sondas vs suposiciones de la maqueta
  const P = Object.values(out.sondas || {}); const first = (f) => P.map(f).find((v) => v !== undefined && v !== null); const probes = [];
  const add = (nombre, maqueta, real) => probes.push({ sonda: nombre, maqueta, real, estado: real === undefined || real === null ? 'NO_EJECUTADO' : JSON.stringify(real) === JSON.stringify(maqueta) ? 'OK' : 'DIF' });
  add('GroupItem: typeof .layers', 'undefined', first((p) => p.groupItem?.typeofLayers)); add('GroupItem: leer .layers.length lanza', true, first((p) => p.groupItem?.layersLengthLanza)); add('Layer: typeof .layers', 'object', first((p) => p.layer0?.tieneLayers));
  add('PathPoint.anchor es Array de 2', ['[object Array]', 2], (() => { const q = first((p) => p.pathPoint); return q ? [q.anchorTipo, q.anchorLen] : null; })()); add('leftDirection/rightDirection de longitud 2', [2, 2], (() => { const q = first((p) => p.pathPoint); return q ? [q.left, q.right] : null; })());
  add('CompoundPathItem: hijos son PathItem con padre CompoundPathItem', ['PathItem', 'CompoundPathItem'], (() => { const q = first((p) => p.compound?.hijo0); return q ? [q.typename, q.parentTypename] : null; })());
  add('PathItem.typename', 'PathItem', first((p) => p.pathItem?.typename)); add('Layer.typename', 'Layer', first((p) => p.layer0?.typename));
  out.sondasContraMaqueta = probes; out.diferencias = [...Object.entries(out.docs).flatMap(([id, d]) => d.resultados.filter((x) => x.estado === 'DIF' || x.estado === 'FALLA').map((x) => ({ doc: id, ...x }))), ...probes.filter((p) => p.estado === 'DIF').map((p) => ({ doc: 'sondas', id: p.sonda, estado: 'DIF', detalle: `maqueta ${JSON.stringify(p.maqueta)} vs real ${JSON.stringify(p.real)}` }))];
  const all = Object.values(out.docs).flatMap((d) => d.resultados); out.resumen = { OK: all.filter((x) => x.estado === 'OK').length, DIF: all.filter((x) => x.estado === 'DIF').length, FALLA: all.filter((x) => x.estado === 'FALLA').length, NO_VERIFICABLE: all.filter((x) => x.estado === 'NO_VERIFICABLE').length, NO_EJECUTADO: all.filter((x) => x.estado === 'NO_EJECUTADO').length, sondasDIF: probes.filter((p) => p.estado === 'DIF').length };
  return out; }

export function markdown(o) { const icon = { OK: '✅', DIF: '🔶', FALLA: '❌', NO_VERIFICABLE: '◻︎', NO_EJECUTADO: '⏳' }; let s = `# Informe Nivel 0 — validación en Illustrator real\n\nCarpeta analizada: \`${o.carpeta}\`\n\n`;
  s += o.env ? `Entorno real: Illustrator **${o.env.illustrator}** · ExtendScript **${o.env.extendscript}** · SO **${o.env.os}** · locale ${o.env.locale}\n\n` : 'Entorno: sin datos (no hay JSON)\n\n';
  s += `**Resumen:** ✅ ${o.resumen.OK} · 🔶 diferencias ${o.resumen.DIF} · ❌ fallas ${o.resumen.FALLA} · ◻︎ no verificables ${o.resumen.NO_VERIFICABLE} · ⏳ no ejecutadas ${o.resumen.NO_EJECUTADO} · sondas distintas de la maqueta: ${o.resumen.sondasDIF}\n\n`;
  for (const [id, d] of Object.entries(o.docs)) { s += `## ${id} — ${d.archivo}\n${d.desc}\n\n| Comprobación | Estado | Detalle |\n|---|---|---|\n` + d.resultados.map((x) => `| ${x.id} | ${icon[x.estado]} ${x.estado} | ${x.detalle.replace(/\|/g, '\\|')} |`).join('\n') + '\n\n'; }
  s += `## Sondas de ExtendScript real vs suposiciones de la maqueta\n\n| Sonda | Maqueta | Real | Estado |\n|---|---|---|---|\n` + o.sondasContraMaqueta.map((p) => `| ${p.sonda} | ${JSON.stringify(p.maqueta)} | ${JSON.stringify(p.real)} | ${icon[p.estado]} ${p.estado} |`).join('\n') + '\n\n';
  s += `## Diferencias a registrar (maqueta ↔ ExtendScript real)\n\n` + (o.diferencias.length ? o.diferencias.map((x) => `- **${x.doc} · ${x.id}** (${x.estado}): ${x.detalle}`).join('\n') : 'Ninguna diferencia respecto a la maqueta en lo ejecutado.') + '\n'; return s; }

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const dir = process.argv[2]; if (!dir) { console.error('uso: nivel0-analizar.mjs <carpeta_con_JSON> [--out <carpeta>]'); process.exit(2); }
  const oi = process.argv.indexOf('--out'); const outDir = oi > 0 ? process.argv[oi + 1] : path.join(ROOT, 'tests/results/nivel0'); fs.mkdirSync(outDir, { recursive: true });
  const o = analyzeDir(path.resolve(dir)); fs.writeFileSync(path.join(outDir, 'resultados.json'), JSON.stringify(o, null, 1)); fs.writeFileSync(path.join(outDir, 'INFORME_NIVEL0.md'), markdown(o));
  console.log(markdown(o).split('\n').slice(0, 12).join('\n')); console.log('\n→ ' + path.join(outDir, 'INFORME_NIVEL0.md')); process.exit(o.resumen.FALLA ? 1 : 0);
}
