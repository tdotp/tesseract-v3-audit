// Tesseract V3 · release candidate — artefacto (tools/build/build-rc.mjs) y evidencia de la validación final en Illustrator REAL
// (docs/release/evidencia/, ejecutada con tools/a4/f2a3-rc-real.mjs y tools/a4/f2a3-cep.mjs el 2026-10-28). No vuelve a ejecutar Illustrator.
//   1. el RC se construye desde un commit: determinista (mismo .zip byte a byte), SHA256SUMS verificables, identidad y manifiesto declarados, y el
//      main.js es el del árbol actual cuando el código no ha cambiado desde HEAD; desde ec5f5d8 reproduce el main.js validado en la Entrega 2;
//   2. evidencia real: identidad del main.js validado (= este árbol), Shift+clic y Alt+clic, diálogo NATIVO «Save GLB» (guardar y cancelar; con y sin
//      arte; = referencias legacy byte a byte en sombra), cambio de documento, recarga, rendimiento y memoria medidos en CEP.
import { test, before, after } from 'node:test'; import assert from 'node:assert/strict'; import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import crypto from 'node:crypto'; import { execFileSync, spawnSync } from 'node:child_process';
import { ROOT } from '../lib/fixtures.mjs'; import { REAL_SHA } from '../lib/a8.mjs'; import { summarize, parseGLB } from '../lib/glb.mjs';
import { construirRC, VERSION_RC } from '../../tools/build/build-rc.mjs'; import { construirExperimental, EXP_IDS } from '../../tools/build/build-experimental.mjs'; import { verifyDir } from '../../tools/build/build.mjs';

const E = path.join(ROOT, 'docs/release/evidencia'); const leer = (f) => JSON.parse(fs.readFileSync(path.join(E, f), 'utf8')); const sha = (b) => crypto.createHash('sha256').update(b).digest('hex');
let tmp, A, B, HEAD; const codigoIgualQueHead = () => spawnSync('git', ['-C', ROOT, 'diff', '--quiet', 'HEAD', '--', 'src', 'panel', 'experimental', 'tools/build']).status === 0;
before(async () => { tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'tess-rc-test-')); HEAD = execFileSync('git', ['-C', ROOT, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(); A = await construirRC({ commit: HEAD, out: path.join(tmp, 'a') }); B = await construirRC({ commit: HEAD, out: path.join(tmp, 'b') }); });
after(() => fs.rmSync(tmp, { recursive: true, force: true }));

test('RC determinista desde un commit: mismo .zip byte a byte; SHA256SUMS del RC y de la extensión verificables; contenido fijo', () => {
  assert.equal(A.zipSha, B.zipSha); assert.equal(A.sumsSha, B.sumsSha); assert.equal(fs.readFileSync(A.zip + '.sha256', 'utf8'), `${A.zipSha}  tesseract-v3-${VERSION_RC}.zip\n`);
  assert.deepEqual(verifyDir(path.join(A.dir, 'extension')), []); for (const l of fs.readFileSync(path.join(A.dir, 'SHA256SUMS'), 'utf8').trim().split('\n')) assert.equal(sha(fs.readFileSync(path.join(A.dir, l.slice(66).replace(/^\.\//, '')))), l.slice(0, 64), l);
  const enZip = execFileSync('python3', ['-I', '-c', 'import sys, zipfile; print("\\n".join(zipfile.ZipFile(sys.argv[1]).namelist()))', A.zip], { encoding: 'utf8' }).trim().split('\n');
  assert.ok(enZip.every((f) => f.startsWith(`tesseract-v3-${VERSION_RC}/`))); for (const f of ['RELEASE.json', 'LEEME.txt', 'SHA256SUMS', 'extension/main.js', 'extension/CSXS/manifest.xml', 'extension/SHA256SUMS', 'extension/BUILD_INFO.json']) assert.ok(enZip.includes(`tesseract-v3-${VERSION_RC}/${f}`), f);
  assert.ok(!enZip.some((f) => /\.debug$|\.DS_Store$/.test(f)), 'sin .debug ni basura');
});
test('RELEASE.json: versión, commit, identidad CEP propia, manifiesto (ILST, CSXS 12), motores y compatibilidad declarados; BUILD_INFO sin commit (reproducible)', () => {
  const r = A.release; assert.equal(r.version, VERSION_RC); assert.equal(r.fuente.commit, HEAD); assert.equal(r.identidad.extensionId, EXP_IDS.extensionId); assert.equal(r.identidad.manifiesto.bundleId, EXP_IDS.bundleId);
  assert.deepEqual([r.identidad.manifiesto.bundleVersion, r.identidad.manifiesto.host, r.identidad.manifiesto.csxs], ['3.0.0', '[0.0,99.9]', '12.0']); assert.match(r.motores.predeterminado, /^sombra/); assert.match(r.compatibilidad.validado, /Illustrator 30\.8\.2/);
  assert.match(r.tipo, /EVALUACIÓN/); assert.equal(JSON.parse(fs.readFileSync(path.join(A.dir, 'extension/BUILD_INFO.json'), 'utf8')).repo.commit, null);
});
test('el main.js del RC es el del árbol actual (si el código no cambió desde HEAD) y el de ec5f5d8 reproduce el validado en la Entrega 2', async () => {
  if (codigoIgualQueHead()) { const t = path.join(tmp, 'arbol'); await construirExperimental({ out: t }); assert.equal(A.release.main_js_sha256, sha(fs.readFileSync(path.join(t, 'main.js')))); }
  const h = await construirRC({ commit: 'ec5f5d8', out: path.join(tmp, 'ec5') }); assert.equal(h.release.main_js_sha256, '3b1106ab25a4e334ca6978d822226971a9982c2797e07cead0024b7b5f675c53');
});

const ID = leer('identidad-2026-10-28T18-44-03-193Z.json');
test('evidencia real · identidad del panel validado: ILST 30.8.2, CEP 12.1.1, Chromium 99; main.js = construcción limpia de este árbol', async () => {
  assert.deepEqual(ID.veredicto, { extension: true, host: true, mainJs: true, three: true, sombra: true, barra: true, chromium: true }); assert.equal(ID.identidad.host.appVersion, '30.8.2'); assert.match(ID.identidad.ua, /Chrome\/99\.0\.4844\.84 AdobeCEP\/12\.1\.1/);
  const t = path.join(tmp, 'id'); await construirExperimental({ out: t }); assert.equal(sha(fs.readFileSync(path.join(t, 'main.js'))), ID.identidad.mainJs.sha256, 'el main.js validado en real es el que construye este árbol');
});
test('evidencia real · Shift+clic (base, también tras plegar) y Alt+clic (crease) con entrada de confianza escalada por devicePixelRatio, en sombra y activo; sin «Pick error»', () => {
  for (const f of fs.readdirSync(E).filter((x) => x.startsWith('interacciones-'))) { const r = leer(f); const p = r.pasos; assert.deepEqual(r.errores, [], f); assert.equal(r.dpr, 1.25);
    assert.ok(p.shiftClic.hallados.length >= 2 && p.shiftClic.hallados.every((h) => /^Base set to P\d+ · Shift \+ click/.test(h.estado)), f); assert.equal(p.shiftClic.selectorTras, p.shiftClic.hallados.at(-1).id); assert.equal(p.shiftClic.pestanaMaterial, true);
    assert.equal(p.shiftTrasPlegar.plegadoCambiaImagen, true); assert.ok(p.shiftTrasPlegar.hallado && p.shiftTrasPlegar.selectorTras === p.shiftTrasPlegar.hallado.id && p.shiftTrasPlegar.hallado.id !== p.shiftTrasPlegar.baseAntes); assert.equal(p.shiftTrasPlegar.replegarCambiaImagen, true);
    assert.match(p.altClic.hallados[0].estado, /^Crease C\d+ selected · Alt\/Option \+ click/); assert.equal(p.altClic.pestanaCreases, true); assert.match(p.altClic.etiquetaSeleccion, new RegExp(`^Selected crease: C${p.altClic.hallados[0].id} `)); assert.equal(p.altClic.filaResaltada, 1);
    assert.equal(p.anguloCrease.cambiaImagen, true); assert.equal(p.baseSelectorTrasPlegar.selector, p.baseSelectorTrasPlegar.pedida); assert.equal(p.pickError, 0); assert.equal(p.png.err, 0);
    assert.equal(p.materialesEspesor['espesor 0'], 'Thickness must be greater than 0'); assert.equal(p.materialesEspesor.kraft, 'Kraft board');
    assert.match(p.construir.barra.construccion, r.modo === 'activo' ? /EXPERIMENTAL .* 13 paneles · 12 pliegues/ : /LEGACY · 11 paneles · 10 pliegues/); }
});
test('evidencia real · diálogo NATIVO «Save GLB»: guardar = mismos bytes que la ruta sustituida; sombra = GLB legacy real (plano 737bcd23…, arte b4973a54…); cancelar no escribe; KI-25 visible', () => {
  const D = Object.fromEntries(fs.readdirSync(E).filter((x) => x.startsWith('dialogo-')).map((f) => { const r = leer(f); return [r.cancelar ? 'cancelar' : path.basename(r.archivo.ruta, '.glb'), r]; }));
  assert.deepEqual(Object.keys(D).sort(), ['cancelar', 'rc-activo-arte', 'rc-activo-plano', 'rc-sombra-arte', 'rc-sombra-plano']);
  for (const [k, r] of Object.entries(D)) { assert.deepEqual(r.errores, [], k); if (k === 'cancelar') continue; assert.equal(r.archivo.sha256, r.sustituido.sha256, k + ': nativo = sustituido'); assert.deepEqual(r.historialEstado, ['Exporting GLB…', `GLB saved: ${r.archivo.ruta}`, 'GLB exported from current 3D pose'], k + ' (KI-25: el mensaje final tapa la ruta)');
    assert.equal(sha(fs.readFileSync(path.join(E, 'exportaciones', path.basename(r.archivo.ruta)))), r.archivo.sha256); }
  assert.equal(D['rc-sombra-plano'].archivo.sha256, REAL_SHA.plano); assert.equal(D['rc-sombra-arte'].archivo.sha256, REAL_SHA.arte); assert.equal(D['rc-activo-arte'].archivo.sha256, 'f497a5487b0e7c15db8ce245d867f8abd112b13dd35561a05ec59fbda17f9bfb', 'mismo GLB con arte experimental que en la Entrega 2');
  assert.deepEqual(D.cancelar.historialEstado, ['Exporting GLB…', 'GLB export cancelled', 'GLB exported from current 3D pose']); assert.deepEqual(D.cancelar.archivosNuevos, []);
  assert.equal(summarize(parseGLB(fs.readFileSync(path.join(E, 'exportaciones/rc-activo-arte.glb')))).images, 2); assert.match(D['rc-activo-plano'].barra.construccion, /EXPERIMENTAL .* 13 paneles/);
});
test('evidencia real · cambio de documento en activo (KI-30), recarga ⇒ sombra, caja y arte completos sobre esta versión; documento N0-B intacto', () => {
  const P = leer('preparar-2026-10-28T18-42-00-285Z.json'); assert.match(P.barra.construccion, /EXPERIMENTAL .* 2 paneles · 1 pliegues · base P0/); assert.match(P.arte, /Artwork loaded from layers/);
  assert.deepEqual(leer('recarga-2026-10-28T18-44-47-305Z.json').tras, { modo: 'sombra', barra: 'SOMBRA (legacy)', status: 'Ready' });
  const C = leer('caja-2026-10-28T18-44-03-337Z.json'), A2 = leer('arte-2026-10-28T18-44-22-658Z.json'); for (const r of [C, A2]) { assert.deepEqual(r.consola, []); assert.deepEqual(Object.entries(r.pasos).filter(([, v]) => v && v.error), []); }
  assert.equal(C.pasos.V8.conservaAngulos, true); assert.equal(C.archivos['f2a3-sombra.glb'].sha256, REAL_SHA.plano); assert.equal(A2.archivos['f2a3-arte-sombra.glb'].sha256, REAL_SHA.arte); assert.match(C.pasos.V4.barra.items.at(-1), /^… y 17 más: extremo de crease ajustado/);
  assert.equal(fs.readFileSync(path.join(E, 'n0b-antes.txt'), 'utf8'), fs.readFileSync(path.join(E, 'n0b-despues.txt'), 'utf8'));
});
test('evidencia real · rendimiento y memoria medidos en CEP (5 ejecuciones por modo, panel recién cargado): sin errores; activo con el experimental y sombra con el legacy', () => {
  const R = leer('rendimiento-2026-10-28T18-42-35-756Z.json'); assert.equal(R.n, 5); assert.equal(R.ejecuciones.length, 10); assert.match(R.metodologia, /Panel recién cargado/);
  for (const m of ['sombra', 'activo']) { const s = R.resumen[m]; assert.equal(s.errores, 0); for (const k of ['extraccionMs', 'construccion3dMs', 'motorBuildPanelsMs', 'plegadoSincronoMs', 'exportGlbMs', 'heapTrasConstruirMB']) assert.equal(s[k].n, 5, `${m} ${k}`); }
  assert.deepEqual(R.resumen.sombra.origen, ['legacy']); assert.deepEqual(R.resumen.activo.origen, ['experimental']); assert.equal(R.resumen.sombra.sombraExperimentalBuildPanelsMs.n, 5);
  assert.ok(R.resumen.activo.construccion3dMs.mediana < 1000 && R.resumen.activo.exportGlbMs.mediana < 1000, 'tiempos interactivos');
});
