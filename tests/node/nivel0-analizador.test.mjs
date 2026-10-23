// El analizador de resultados del Nivel 0 y los documentos de prueba: autoprueba con salidas generadas por la maqueta, controles negativos y consistencia de los SVG.
import test from 'node:test'; import assert from 'node:assert/strict'; import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import vm from 'node:vm'; import { spawnSync, execFileSync } from 'node:child_process';
import { ROOT } from '../lib/fixtures.mjs'; import { DOCS } from '../../tools/illustrator/docs-prueba.mjs'; import { makeIllustrator } from '../lib/mock-illustrator.mjs'; import { analyzeDir, markdown } from '../tools/nivel0-analizar.mjs';
const tmpDirs = []; const mk = () => { const d = fs.mkdtempSync(path.join(os.tmpdir(), 'n0-test-')); tmpDirs.push(d); return d; };
function produce(dir, only) { for (const [id, d] of Object.entries(DOCS)) for (const n of ['doc_survey', 'extract_check', 'art_check']) { if ((n === 'art_check' && !d.art) || (only && !only.includes(id))) continue;
  const ill = makeIllustrator({ ...d.mock(), name: d.archivo }); vm.runInNewContext(fs.readFileSync(`${ROOT}/tools/illustrator/tesseract_${n}.jsx`, 'utf8').replace(/^#target.*$/m, ''), { ...ill.globals }); for (const [p, t] of Object.entries(ill.saved.files)) fs.writeFileSync(path.join(dir, path.basename(p)), t); } return dir; }
const edit = (dir, id, kind, fn) => { const f = fs.readdirSync(dir).find((x) => x.startsWith(id) && x.endsWith(`__${kind}.json`)); const j = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')); fn(j); fs.writeFileSync(path.join(dir, f), JSON.stringify(j)); };
const find = (o, doc, id) => o.docs[doc].resultados.find((x) => x.id === id);
const base = produce(mk());

test('autoprueba: con las salidas de la maqueta no hay fallas, diferencias ni sondas distintas (solo el PNG no es verificable fuera de Illustrator)', () => {
  const o = analyzeDir(base); assert.deepEqual([o.resumen.FALLA, o.resumen.DIF, o.resumen.NO_EJECUTADO, o.resumen.sondasDIF], [0, 0, 0, 0], JSON.stringify(o.diferencias)); assert.equal(o.resumen.NO_VERIFICABLE, 1); assert.ok(o.resumen.OK >= 45);
  assert.equal(find(o, 'N0-C', 'L0-3').estado, 'OK'); assert.match(find(o, 'N0-C', 'L0-3').detalle, /KI-10 REPRODUCIDO/); assert.match(find(o, 'N0-D', 'L0-2b').detalle, /KI-10 por subcadena REPRODUCIDO/);
  assert.match(find(o, 'N0-A', 'L0-6').detalle, /13 paneles/); assert.match(markdown(o), /Informe Nivel 0/);
});
test('control negativo: integridad no confirmada ⇒ FALLA', () => { const d = mk(); fs.cpSync(base, d, { recursive: true }); edit(d, 'N0-B', 'extract', (j) => { j._integridad.identicos = false; }); const o = analyzeDir(d); assert.equal(find(o, 'N0-B', 'INT-extract').estado, 'FALLA'); assert.ok(o.resumen.FALLA >= 1); });
test('control negativo: orden/nombres de capa distintos ⇒ DIF (L0-2)', () => { const d = mk(); fs.cpSync(base, d, { recursive: true }); edit(d, 'N0-B', 'survey', (j) => { j._resultado.layers.reverse(); }); assert.equal(find(analyzeDir(d), 'N0-B', 'L0-2').estado, 'DIF'); });
test('control negativo: un vértice del troquel desplazado 5 mm ⇒ DIF en invariantes (L0-4)', () => { const d = mk(); fs.cpSync(base, d, { recursive: true }); edit(d, 'N0-B', 'extract', (j) => { j._resultado.outerBoundary.points[1].anchor.x += 5; }); const x = find(analyzeDir(d), 'N0-B', 'L0-4'); assert.equal(x.estado, 'DIF'); assert.match(x.detalle, /areaContorno|bbox/); });
test('control negativo: crease con longitud distinta ⇒ DIF; un hueco menos ⇒ DIF', () => { const d = mk(); fs.cpSync(base, d, { recursive: true }); edit(d, 'N0-B', 'extract', (j) => { j._resultado.creases[0].points[1].anchor.y += 1; j._resultado.holes = []; }); assert.match(find(analyzeDir(d), 'N0-B', 'L0-4').detalle, /longitudes de creases[\s\S]*huecos|huecos[\s\S]*longitudes de creases/); });
test('control negativo: si el extractor real NO falla con grupos anidados, se registra que KI-10 no se reproduce', () => {
  const d = mk(); fs.cpSync(base, d, { recursive: true }); const ok = JSON.parse(fs.readFileSync(path.join(d, fs.readdirSync(d).find((x) => x.startsWith('N0-B') && x.endsWith('__extract.json'))), 'utf8')); edit(d, 'N0-C', 'extract', (j) => { j._resultado = ok._resultado; }); const x = find(analyzeDir(d), 'N0-C', 'L0-3'); assert.equal(x.estado, 'DIF'); assert.match(x.detalle, /KI-10 NO se reproduce/);
});
test('control negativo: sondas distintas de la maqueta ⇒ DIF registrada', () => { const d = mk(); fs.cpSync(base, d, { recursive: true }); edit(d, 'N0-A', 'survey', (j) => { j._resultado.sondas.groupItem.typeofLayers = 'object'; j._resultado.sondas.groupItem.layersLengthLanza = false; }); const o = analyzeDir(d); assert.ok(o.sondasContraMaqueta.some((p) => p.estado === 'DIF')); assert.ok(o.diferencias.some((x) => x.doc === 'sondas')); });
test('control negativo: PNG de arte con tamaño incorrecto ⇒ DIF (L0-7)', () => { const d = mk(); fs.cpSync(base, d, { recursive: true }); edit(d, 'N0-B', 'art', (j) => { j._resultado.front.png = { ancho: 1000, alto: 800, bytes: 1 }; }); assert.equal(find(analyzeDir(d), 'N0-B', 'L0-7').estado, 'DIF'); });
test('carpeta vacía o inexistente ⇒ todo NO_EJECUTADO; el CLI sale con código 0 si no hay fallas y 1 si las hay', () => {
  const o = analyzeDir(mk()); assert.equal(o.resumen.OK, 0); assert.ok(o.resumen.NO_EJECUTADO > 0);
  const out = mk(); assert.equal(spawnSync('node', [ROOT + '/tests/tools/nivel0-analizar.mjs', base, '--out', out]).status, 0); assert.ok(fs.existsSync(out + '/INFORME_NIVEL0.md')); assert.ok(fs.existsSync(out + '/resultados.json'));
  const bad = mk(); fs.cpSync(base, bad, { recursive: true }); edit(bad, 'N0-B', 'extract', (j) => { j._integridad.identicos = false; }); assert.equal(spawnSync('node', [ROOT + '/tests/tools/nivel0-analizar.mjs', bad, '--out', mk()]).status, 1);
});
test('documentos de prueba: los SVG versionados coinciden con el generador, son XML válido y no tienen puntos de cierre duplicados', () => {
  const dir = ROOT + '/tools/illustrator/docs-prueba'; const before = fs.readdirSync(dir).sort().map((f) => [f, fs.readFileSync(path.join(dir, f), 'utf8')]); execFileSync('node', [ROOT + '/tools/illustrator/make-test-docs.mjs']);
  assert.deepEqual(fs.readdirSync(dir).sort().map((f) => [f, fs.readFileSync(path.join(dir, f), 'utf8')]), before);
  for (const d of Object.values(DOCS)) { assert.equal(spawnSync('python3', ['-c', 'import sys,xml.etree.ElementTree as E; E.parse(sys.argv[1])', path.join(dir, d.archivo)]).status, 0, d.archivo); }
  assert.deepEqual(fs.readFileSync(path.join(dir, DOCS['N0-A'].archivo)), fs.readFileSync(ROOT + '/tests/fixtures/real/caja-botanica-illustrator-export.svg'), 'N0-A es el SVG real sin tocar');
  const b = fs.readFileSync(path.join(dir, DOCS['N0-B'].archivo), 'utf8'); const ds = [...b.matchAll(/ d="([^"]+)"/g)].map((m) => m[1]); assert.ok(ds.length >= 3); for (const dd of ds) assert.match(dd, /Z$/.test(dd) ? /^M[\d.,-]+(L[\d.,-]+)+Z$/ : /^M[\d.,-]+(L[\d.,-]+)+$/);
  const rect = ds.find((x) => x.endsWith('Z')); const pts = rect.slice(1, -1).split(/[ML]/).filter(Boolean); assert.equal(pts.length, 4, 'contorno rectangular con 4 puntos (sin duplicar el de cierre)');
});
test('documentos de prueba: expected.json es coherente (capas, artboard en mm, troquel esperado)', () => {
  const e = JSON.parse(fs.readFileSync(ROOT + '/tools/illustrator/docs-prueba/expected.json', 'utf8')).docs; assert.deepEqual(Object.keys(e), Object.keys(DOCS));
  for (const [id, d] of Object.entries(DOCS)) { assert.deepEqual(e[id].esLayers, d.esLayers); const svg = fs.readFileSync(ROOT + '/tools/illustrator/docs-prueba/' + d.archivo, 'utf8'); const ids = [...svg.matchAll(/<g id="([^"]+)">/g)].map((m) => m[1]).filter((n) => e[id].esLayers.includes(n)); assert.deepEqual([...ids].reverse(), e[id].esLayers, id + ': orden de capas (la última <g> es la superior)');
    const vb = /viewBox="0 0 ([\d.]+) ([\d.]+)"/.exec(svg); assert.ok(Math.abs(vb[1] * 0.352778 - e[id].artboardMm[0]) < 0.01 || id === 'N0-A', id); }
});
test('limpieza', () => { for (const d of tmpDirs) fs.rmSync(d, { recursive: true, force: true }); });
