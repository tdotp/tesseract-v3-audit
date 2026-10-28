// F2A-3 · I-3 — Bundle experimental independiente (tools/build/build-experimental.mjs) e integridad del bundle normal.
//   1. una sola sustitución (./core/engine.js de src/main.js → experimental/integracion/entrada-cep.js), módulos experimentales dentro,
//      determinista, SHA256SUMS verificable, identidad CEP propia, sin APIs posteriores a Chromium 99;
//   2. control de paridad: la misma configuración SIN sustituir el motor produce byte a byte el main.js del bundle normal, y los estáticos
//      del experimental son los del normal salvo el manifiesto;
//   3. el bundle normal (dist/) sigue en dist-a9, no contiene nada experimental y construir el experimental no lo toca; salida protegida;
//   4. punto de control de entrada-cep.js (no enumerable, de solo lectura, no persistente) y aislamiento estático de experimental/integracion/;
//   5. aislamiento de extensiones CEP: ningún manifiesto instalado declara la identidad experimental (V3 y el experimental NO instalados).
import { test, before, after } from 'node:test'; import assert from 'node:assert/strict'; import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { execFileSync, spawnSync } from 'node:child_process';
import { ROOT } from '../lib/fixtures.mjs'; import { JS_POST99 } from '../lib/chromium99.mjs'; import { DIST_PIN, ensureDist } from '../lib/dist.mjs';
import { build, verifyDir, V3_IDS } from '../../tools/build/build.mjs';
import { construirExperimental, safeOutExperimental, EXP_IDS, DEFAULT_OUT } from '../../tools/build/build-experimental.mjs';
import { CONFIRMACION_ACTIVO } from '../../experimental/integracion/selector.js';

let tmp, X, X2, P, N; const leer = (d, f) => fs.readFileSync(path.join(d, f));
const MARCAS = ['experimental-f2a2', 'adaptarPanelModel', 'construirArbolPlegado', 'construirAdyacencias', 'ErrorPanelModel', '__tessMotorExperimental', 'ACTIVAR-EXPERIMENTAL', 'selector-f2a3', 'tesseract.f2a3.modelo', 'tess-exp-motor', 'Base reiniciada (KI-30)'];
before(async () => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'tess-f2a3-bundle-')); await ensureDist(); const pinAntes = fs.readFileSync(path.join(ROOT, 'dist/SHA256SUMS'), 'utf8');
  X = await construirExperimental({ out: path.join(tmp, 'exp') }); X2 = await construirExperimental({ out: path.join(tmp, 'exp2') });
  P = await construirExperimental({ out: path.join(tmp, 'paridad'), redirigir: false }); N = await build({ out: path.join(tmp, 'normal') });
  assert.equal(fs.readFileSync(path.join(ROOT, 'dist/SHA256SUMS'), 'utf8'), pinAntes, 'construir el experimental no toca dist/');
});
after(() => fs.rmSync(tmp, { recursive: true, force: true }));

test('exactamente 3 sustituciones (solo desde src/main.js): motor ⇒ selector, controles de plegado y controlador ⇒ envoltorios de las fábricas REALES; todo lo demás, el src/ de siempre', () => {
  assert.deepEqual(X.info.motor.sustituciones, { './core/engine.js': 'experimental/integracion/entrada-cep.js', './ui/fold-controls.js': 'experimental/integracion/fold-controls-cep.js', './ui/controller.js': 'experimental/integracion/controller-cep.js' });
  assert.equal(X.info.motor.modulo_sustituido, './core/engine.js'); assert.equal(X.info.motor.modo_predeterminado, 'sombra');
  for (const f of ['experimental/integracion/entrada-cep.js', 'experimental/integracion/selector.js', 'experimental/integracion/motor-v1.js', 'experimental/integracion/interfaz-cep.js', 'experimental/integracion/fold-controls-cep.js', 'experimental/integracion/controller-cep.js', 'experimental/plegado/arbol.js', 'experimental/plegado/adaptador.js']) assert.ok(X.info.motor.modulos_experimentales.includes(f), f);
  assert.ok(X.info.motor.modulos_experimentales.some((f) => f.startsWith('experimental/geometria/'))); for (const f of ['src/core/engine.js', 'src/core/legacy/panels.js', 'src/ui/fold-controls.js', 'src/ui/controller.js', 'src/ui/picking.js']) assert.ok(X.entradas.includes(f), 'el código real sigue dentro: ' + f);
  const fuentes = (r) => r.entradas.filter((f) => f.startsWith('src/')).sort(); assert.deepEqual(fuentes(X), fuentes(P), 'mismos módulos de src/ que el bundle sin sustituciones');
  const t = leer(X.out, 'main.js').toString(); for (const m of MARCAS) assert.ok(t.includes(m), m); assert.match(t.split('\n')[0], /Tesseract V3 EXPERIMENTAL .* modo SOMBRA por defecto/);
});
test('determinista y verificable: dos construcciones idénticas; SHA256SUMS coincide con los archivos; BUILD_INFO declara instalado=false e identidad propia', () => {
  assert.equal(X.sums, X2.sums); assert.deepEqual(verifyDir(X.out), []); const info = JSON.parse(leer(X.out, 'BUILD_INFO.json')); assert.equal(info.instalado, false); assert.deepEqual(info.identidad, EXP_IDS);
});
test('identidad CEP propia, distinta del plugin original y de V3 normal; menú «Tesseract V3 (experimental)»', () => {
  const m = leer(X.out, 'CSXS/manifest.xml').toString(); assert.match(m, /ExtensionBundleId="com\.tato\.tesseract\.v3\.experimental"/); assert.equal((m.match(/com\.tato\.tesseract\.v3\.experimental\.panel/g) || []).length, 2);
  assert.match(m, /<Menu>Tesseract V3 \(experimental\)<\/Menu>/); assert.doesNotMatch(m, /"com\.tato\.tesseract"|"com\.tato\.tesseract\.panel"|"com\.tato\.tesseract\.v3\.panel"/);
  for (const k of ['bundleId', 'extensionId', 'menu', 'name']) assert.notEqual(EXP_IDS[k], V3_IDS[k], k);
  const n = leer(N.out, 'CSXS/manifest.xml').toString(); assert.equal(m.replace(/com\.tato\.tesseract\.v3\.experimental/g, 'com.tato.tesseract.v3').replace(/Tesseract V3 \(experimental\)/g, 'Tesseract V3'), n, 'solo cambia la identidad respecto al manifiesto normal');
});
test('Chromium 99: sin avisos de esbuild (chrome99) y sin APIs posteriores a la 99 en el bundle experimental', () => { const t = leer(X.out, 'main.js').toString(); for (const [tok, desc] of JS_POST99) assert.ok(!t.includes(tok), desc); });
test('control de paridad: la misma configuración sin sustituir el motor = main.js del bundle normal byte a byte; estáticos idénticos salvo el manifiesto', () => {
  assert.ok(leer(P.out, 'main.js').equals(leer(N.out, 'main.js')), 'main.js idéntico'); assert.ok(leer(N.out, 'main.js').equals(leer(ROOT, 'dist/main.js')), 'y = dist/main.js (dist-a9)');
  const lista = (d) => fs.readFileSync(path.join(d, 'SHA256SUMS'), 'utf8').trim().split('\n').filter((l) => !/\.\/(main\.js|CSXS\/manifest\.xml)$/.test(l));
  assert.deepEqual(lista(X.out), lista(N.out)); assert.equal(N.sums, fs.readFileSync(DIST_PIN, 'utf8'), 'una construcción normal limpia sigue dando la huella dist-a9');
});
test('bundle normal intacto: dist/ = dist-a9 y sin ninguna marca experimental; src/ no menciona experimental/ ni el selector', () => {
  assert.equal(fs.readFileSync(path.join(ROOT, 'dist/SHA256SUMS'), 'utf8'), fs.readFileSync(DIST_PIN, 'utf8')); assert.deepEqual(verifyDir(path.join(ROOT, 'dist')), []);
  const t = leer(ROOT, 'dist/main.js').toString(); for (const m of MARCAS) assert.ok(!t.includes(m), m);
  const g = spawnSync('git', ['-C', ROOT, 'grep', '-l', '-E', 'experimental/|selector-f2a3|entrada-cep|__tessMotor|adaptarPanelModel', '--', 'src', 'panel', ':!panel/libs', 'tools/build/build.mjs', 'tools/install.sh'], { encoding: 'utf8' });
  assert.equal(g.stdout.trim(), '', 'archivos del producto que mencionan el experimental'); assert.equal(g.status, 1, 'git grep sin coincidencias');
});
test('salida protegida: nunca dist/, panel/, reference/, src/, la raíz ni ~/Library; sí dist-experimental* y temporales; dist-experimental* ignorado por git', () => {
  for (const r of [path.join(ROOT, 'dist'), path.join(ROOT, 'dist', 'x'), path.join(ROOT, 'panel'), path.join(ROOT, 'reference'), path.join(ROOT, 'src'), ROOT, path.join(ROOT, 'distx'), path.join(os.homedir(), 'Library/Application Support/Adobe/CEP/extensions/tesseract-v3-experimental'), '/Library/x'])
    assert.throws(() => safeOutExperimental(r), /rechazado/, r);
  assert.equal(safeOutExperimental(DEFAULT_OUT), DEFAULT_OUT); safeOutExperimental(path.join(os.tmpdir(), 'x'));
  assert.equal(execFileSync('git', ['-C', ROOT, 'check-ignore', 'dist-experimental/main.js'], { encoding: 'utf8' }).trim(), 'dist-experimental/main.js');
});
test('entrada-cep.js: devuelve el selector en SOMBRA y publica un punto de control no enumerable, de solo lectura y sin estado propio', async () => {
  const { createLegacyEngine, CONTROL_GLOBAL, AYUDA } = await import('../../experimental/integracion/entrada-cep.js');
  try {
    const logs = []; const M = createLegacyEngine({ log: (m) => logs.push(m) }); assert.equal(M.modo(), 'sombra'); assert.equal(M.id, 'selector-f2a3');
    const d = Object.getOwnPropertyDescriptor(globalThis, CONTROL_GLOBAL); assert.deepEqual([d.enumerable, d.writable], [false, false]); const C = globalThis[CONTROL_GLOBAL]; assert.ok(Object.isFrozen(C));
    assert.ok(!Object.keys(globalThis).includes(CONTROL_GLOBAL)); assert.match(AYUDA, /ACTIVAR-EXPERIMENTAL/); assert.equal(C.modo(), 'sombra');
    assert.equal(C.activar('si'), false); assert.equal(C.modo(), 'sombra'); assert.equal(C.activar(CONFIRMACION_ACTIVO), true); assert.equal(M.modo(), 'activo'); assert.equal(C.desactivar(), true); assert.equal(M.modo(), 'sombra');
    C.activar(CONFIRMACION_ACTIVO); const M2 = createLegacyEngine({ log: () => {} }); assert.equal(globalThis[CONTROL_GLOBAL].modo(), 'sombra', 'una carga nueva del panel vuelve a sombra (no persistente)'); assert.equal(M2.modo(), 'sombra');
    assert.ok(logs.some((l) => /modo ACTIVO/.test(l)) && logs.some((l) => /RECHAZADA/.test(l)), 'cambios visibles en el log del panel');
  } finally { delete globalThis[CONTROL_GLOBAL]; }
});
test('aislamiento estático de la interfaz experimental: imports permitidos y sin almacenamiento, consola, CEP ni globales nuevos', () => {
  const leerSin = (f) => fs.readFileSync(path.join(ROOT, 'experimental/integracion', f), 'utf8').replace(/\/\/.*$/gm, '');
  const imports = (t) => [...t.matchAll(/^(?:import|export)[^'"\n]*from '([^']+)'/gm)].map((m) => m[1]);
  assert.deepEqual(imports(leerSin('interfaz-cep.js')), ['./selector.js']); assert.deepEqual(imports(leerSin('fold-controls-cep.js')), ['../../src/ui/fold-controls.js', './interfaz-cep.js']); assert.deepEqual(imports(leerSin('controller-cep.js')), ['../../src/ui/controller.js', './interfaz-cep.js']);
  for (const f of ['interfaz-cep.js', 'fold-controls-cep.js', 'controller-cep.js']) { const t = leerSin(f); assert.doesNotMatch(t, /\b(THREE|window|console|localStorage|sessionStorage|indexedDB|require|process|globalThis|__adobe_cep__|csInterface)\b/, f); assert.equal([...t.matchAll(/^(?:export )?(?:let|var) /gm)].length, 0, f); }
  assert.match(leerSin('interfaz-cep.js'), /^const INTERFACES = new WeakMap\(\);/m, 'único estado de módulo: una interfaz por estado S (WeakMap)');
});
test('aislamiento estático de entrada-cep.js: solo importa ./selector.js; únicos globales: globalThis (punto de control) y setTimeout (sombra diferida)', () => {
  const t = fs.readFileSync(path.join(ROOT, 'experimental/integracion/entrada-cep.js'), 'utf8').replace(/\/\/.*$/gm, '');
  assert.deepEqual([...t.matchAll(/^(?:import|export)[^'"\n]*from '([^']+)'/gm)].map((m) => m[1]), ['./selector.js']);
  assert.doesNotMatch(t, /\b(THREE|window|document|console|localStorage|sessionStorage|indexedDB|require|process|__adobe_cep__|csInterface)\b/); assert.equal([...t.matchAll(/^(?:export )?(?:let|var) /gm)].length, 0);
  assert.equal(fs.readdirSync(path.join(ROOT, 'experimental/integracion')).sort().join(','), 'controller-cep.js,entrada-cep.js,fold-controls-cep.js,interfaz-cep.js,motor-v1.js,package.json,selector.js');
});
test('aislamiento de extensiones CEP: ningún manifiesto instalado declara la identidad experimental; no hay copias tesseract-v3* (nada instalado)', () => {
  const dirs = [path.join(os.homedir(), 'Library/Application Support/Adobe/CEP/extensions'), '/Library/Application Support/Adobe/CEP/extensions']; let vistos = 0;
  for (const d of dirs) { if (!fs.existsSync(d)) continue; for (const e of fs.readdirSync(d)) { assert.ok(!/^tesseract-v3/.test(e), 'copia instalada: ' + path.join(d, e)); const m = path.join(d, e, 'CSXS/manifest.xml'); if (!fs.existsSync(m)) continue; vistos++;
    const x = fs.readFileSync(m, 'utf8'); assert.ok(!x.includes(EXP_IDS.bundleId) && !x.includes(V3_IDS.extensionId), 'identidad V3 instalada en ' + m); } }
  assert.ok(vistos >= 1, 'se inspeccionó al menos una extensión instalada (el plugin original)');
});
