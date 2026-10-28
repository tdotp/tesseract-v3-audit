// F2A-3 · I-6 — Interfaz del motor experimental en la interfaz REAL (Chrome headless, arnés de A1–A9 con el puente CEP simulado):
//   G1 barra permanente: modo, activación en el panel con confirmación en dos pasos, cancelación, desactivación; el bundle normal NO la tiene.
//   G2 motor de la construcción actual y diagnósticos legibles (experimental) o comparación en sombra (legacy); H-01/H-02 explicados.
//   G3 KI-30: documento o motor distinto ⇒ base por defecto del motor en uso; misma construcción repetida ⇒ se conserva la base elegida.
//   G4 cambio de base TRANSACCIONAL: con buildFoldTree fallando (fallo simulado) se conservan base, árbol, ángulos y crease seleccionada.
//   G5 primer árbol fallido ⇒ construcción DETENIDA sin restos de otro modelo; G6 fallback atómico visible en la barra.
// LÍMITE: Chrome headless, no CEP real (la validación en Illustrator real está en docs/fase2/F2A3_ENTREGA2_INFORME.md).
import test, { before, after } from 'node:test'; import assert from 'node:assert/strict'; import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { execFileSync } from 'node:child_process';
import { ROOT, gridDieline } from '../lib/fixtures.mjs'; import { serveDir, launchChrome } from '../browser/cdp.mjs'; import { PAGE_HELPERS, FIXTURE_FILES } from '../browser/harness.mjs';
import { build } from '../../tools/build/build.mjs'; import { construirExperimental } from '../../tools/build/build-experimental.mjs';
import { CASOS_F2A2R } from '../lib/f2/casos-plegado.mjs';

const BARRA = `(() => { const b = document.getElementById('tess-exp-motor'); if (!b) return null; const q = (c) => b.querySelector(c); const vis = (c) => q(c).style.display !== 'none';
  return { modo: q('.tess-exp-modo').textContent, dataModo: q('.tess-exp-modo').dataset.modo, construccion: q('.tess-exp-construccion').textContent, origen: q('.tess-exp-construccion').dataset.origen,
    activar: vis('.tess-exp-activar'), desactivar: vis('.tess-exp-desactivar'), confirmar: vis('.tess-exp-confirmar'), mensaje: vis('.tess-exp-mensaje') ? q('.tess-exp-mensaje').textContent : null, tipo: q('.tess-exp-mensaje').dataset.tipo,
    diag: q('.tess-exp-diag summary').textContent, items: [...q('.tess-exp-diag ul').children].map((li) => li.textContent), antesDeImport: b.nextElementSibling && b.nextElementSibling.id }; })()`;
const ESTADO = `(() => ({ base: __dbg.baseIndex, arbol: JSON.stringify(__dbg.tree), angulos: JSON.stringify(__dbg.angles), sel: __dbg.selectedEdge, nFold: __dbg.nFold, mallas: __dbg.scene ? T.panelMeshes().length : 0, foldPanel: !!document.getElementById('fold-panel'),
  selectBase: document.querySelector('#fold-panel select') ? document.querySelector('#fold-panel select').value : null, status: T.$('status-area').textContent, log: T.$('log-area').textContent, experimental: !!(__dbg.panelData && __dbg.panelData.f2a2) }))()`;
const BASE = (i) => `(async () => { const s = document.querySelector('#fold-panel select'); s.value = String(${i}); T.fire(s, 'change'); await T.sleep(120); await T.raf2(); })()`;
const CLIC = (c) => `(async () => { document.querySelector('#tess-exp-motor ${c}').click(); await T.sleep(60); })()`;
const CTRL = 'window.__tessMotorExperimental';
let dir, server, B; const espera = (ms) => B.eval(`new Promise((r) => setTimeout(r, ${ms}))`);
before(async () => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tess-f2a3-ui-')); await build({ out: path.join(dir, '_dist') }); await construirExperimental({ out: path.join(dir, '_exp') });
  for (const [t, src] of [['dist', '_dist'], ['exp', '_exp']]) execFileSync('python3', [ROOT + '/tools/baseline/setup_harness.py', path.join(dir, src), path.join(ROOT, FIXTURE_FILES.caja), path.join(dir, `${t}-caja`)], { stdio: 'pipe' });
  server = await serveDir(dir); B = await launchChrome();
});
after(async () => { await B?.close(); await server?.close(); if (dir) fs.rmSync(dir, { recursive: true, force: true }); process.exit(process.exitCode ?? 0); });
async function abrir(t) { await B.goto(`${server.url}/${t}-caja/index.html`); await espera(200); await B.eval(PAGE_HELPERS); }
const doc = (d) => B.eval(`window.__FIXTURE__ = ${JSON.stringify(d)}`);
const construir = async () => { await B.eval('T.build()'); await espera(80); };

test('G1 · barra permanente bajo la línea de estado; activación en el panel con confirmación en dos pasos; cancelar y desactivar; el bundle normal no la tiene', async () => {
  await abrir('dist'); assert.equal(await B.eval(BARRA), null, 'el bundle normal no tiene barra'); const e0 = B.errors.length;
  await abrir('exp'); let b = await B.eval(BARRA); assert.deepEqual([b.modo, b.dataModo, b.construccion, b.activar, b.desactivar, b.confirmar, b.mensaje, b.antesDeImport], ['SOMBRA (legacy)', 'sombra', 'Construcción actual: ninguna', true, false, false, null, 'import-view']);
  await B.eval(CLIC('.tess-exp-activar')); b = await B.eval(BARRA); assert.equal(b.confirmar, true); assert.equal(await B.eval(`${CTRL}.modo()`), 'sombra', 'el primer clic no activa nada');
  await B.eval(CLIC('.tess-exp-confirmar-no')); b = await B.eval(BARRA); assert.deepEqual([b.confirmar, b.dataModo], [false, 'sombra']);
  await B.eval(CLIC('.tess-exp-activar')); await B.eval(CLIC('.tess-exp-confirmar-si')); b = await B.eval(BARRA);
  assert.deepEqual([b.modo, b.dataModo, b.activar, b.desactivar, b.tipo], ['ACTIVO (experimental)', 'activo', false, true, 'info']); assert.match(b.mensaje, /Modo ACTIVO: pulse «Continue to 3D»/); assert.equal(await B.eval(`${CTRL}.modo()`), 'activo');
  assert.match((await B.eval(ESTADO)).log, /modo ACTIVO — los modelos NUEVOS/); await B.eval(`${CTRL}.desactivar()`); b = await B.eval(BARRA); assert.equal(b.dataModo, 'sombra', 'la barra sigue a la consola (suscripción)');
  await B.eval(CLIC('.tess-exp-activar')); await B.eval(CLIC('.tess-exp-confirmar-si')); await B.eval(CLIC('.tess-exp-desactivar')); b = await B.eval(BARRA); assert.equal(b.dataModo, 'sombra'); assert.match(b.mensaje, /Modo SOMBRA/);
  assert.deepEqual(B.errors.slice(e0), []);
});

test('G2 · motor de la construcción actual y diagnósticos: legacy con comparación en sombra; experimental con diagnósticos legibles (H-01/H-02)', async () => {
  const e0 = B.errors.length; await abrir('exp'); await construir(); await espera(150); let b = await B.eval(BARRA);
  assert.equal(b.origen, 'legacy'); assert.match(b.construccion, /^Construcción actual: LEGACY · 11 paneles · 10 pliegues · base P0$/); assert.equal(b.diag, 'Comparación en sombra: legacy 11 paneles · experimental 13 paneles');
  assert.ok(b.items.includes('Las áreas de los paneles difieren'));
  await B.eval(`${CTRL}.activar('ACTIVAR-EXPERIMENTAL')`); await construir(); b = await B.eval(BARRA);
  assert.equal(b.origen, 'experimental'); assert.match(b.construccion, /^Construcción actual: EXPERIMENTAL \(experimental-f2a2\) · 13 paneles · 12 pliegues · base P8$/, "cambio de motor: base por defecto del experimental (KI-30)"); assert.equal(b.diag, "Diagnósticos geométricos: ninguno");
  await doc(CASOS_F2A2R.ele()); await construir(); b = await B.eval(BARRA); assert.match(b.diag, /^Diagnósticos geométricos \(2\): 1 × unión no plegable, 1 × pieza desconectada de la base$/);
  assert.ok(b.items.some((t) => /^Unión no plegable: no se usa como bisagra · /.test(t)), JSON.stringify(b.items));
  await doc(CASOS_F2A2R.cicloFuera()); await construir(); b = await B.eval(BARRA); assert.match(b.diag, /ciclo de bisagras/); assert.match(b.diag, /pieza desconectada/);
  await doc(JSON.parse(fs.readFileSync(path.join(ROOT, 'tests/fixtures/illustrator-real/ill-real-caja-botanica.dieline.json'), 'utf8'))); await construir(); b = await B.eval(BARRA);
  assert.match(b.diag, /^Diagnósticos geométricos \(\d+\): \d+ × extremo de crease ajustado \(ε\)$/); assert.ok(b.items.length <= 3 && /^… y \d+ más: extremo de crease ajustado/.test(b.items.at(-1)), 'diagnósticos repetidos agrupados: ' + JSON.stringify(b.items));
  assert.deepEqual(B.errors.slice(e0), []);
});

test('G3 · KI-30: documento distinto o motor distinto ⇒ base por defecto del motor en uso; la misma construcción repetida conserva la base elegida', async () => {
  const e0 = B.errors.length; await abrir('exp'); await B.eval(`${CTRL}.activar('ACTIVAR-EXPERIMENTAL')`); await construir(); await B.eval(BASE(5)); assert.equal((await B.eval(ESTADO)).base, 5);
  await B.eval(`(async () => { T.$('back-btn').click(); await T.sleep(150); T.$('continue-3d-btn').click(); await T.sleep(700); })()`); let s = await B.eval(ESTADO); assert.equal(s.base, 5, 'misma construcción (Back → Continue): base conservada');
  assert.doesNotMatch(s.log, /Base reiniciada/);
  await doc(gridDieline(3)); await construir(); s = await B.eval(ESTADO); assert.equal(s.base, 0, 'documento nuevo: base por defecto del experimental (antes se heredaba P5: KI-30)'); assert.match(s.log, /Base reiniciada \(KI-30\): documento o motor distinto .* motor experimental/);
  await B.eval(BASE(4)); await B.eval(`${CTRL}.desactivar()`); await construir(); s = await B.eval(ESTADO); assert.equal(s.experimental, false); assert.equal(s.base, 0, 'motor distinto (legacy) con el mismo documento: base por defecto del legacy'); assert.match(s.log, /Base reiniciada \(KI-30\).* motor legacy/);
  assert.deepEqual(B.errors.slice(e0), []);
  await abrir('dist'); await construir(); await B.eval(BASE(5)); await B.eval(`window.__FIXTURE__ = ${JSON.stringify(gridDieline(3))}`); await construir(); assert.equal((await B.eval(ESTADO)).base, 5, 'control: el bundle normal conserva KI-30 (sin cambios de comportamiento)');
});

test('G4 · cambio de base TRANSACCIONAL: si buildFoldTree falla se conservan base, árbol, ángulos y crease seleccionada; sin errores de página; después funciona', async () => {
  const e0 = B.errors.length; await abrir('exp'); await B.eval(`${CTRL}.activar('ACTIVAR-EXPERIMENTAL')`); await construir(); await B.eval(BASE(3));
  await B.eval(`(async () => { await T.setAll(45); const r = document.querySelectorAll('#fold-panel .crease-row, #fold-panel [data-edge]'); })()`); await B.eval(`(async () => { const s = document.querySelectorAll('#fold-panel input[type=range]'); s[2].value = '-30'; T.fire(s[2], 'input'); await T.sleep(60); })()`);
  const antes = await B.eval(ESTADO); assert.equal(antes.base, 3);
  await B.eval(`${CTRL}.simularFallo('buildFoldTree')`); await B.eval(BASE(7)); await espera(60); const s = await B.eval(ESTADO); const b = await B.eval(BARRA);
  assert.equal(await B.eval(`document.querySelector('#fold-panel details.all-creases input[type=range]').value`), '45', 'el deslizador ALL conserva su valor'); assert.equal(s.base, 3, 'base anterior restaurada'); assert.equal(s.selectBase, '3', 'el selector de base vuelve a P3'); assert.equal(s.arbol, antes.arbol, 'mismo árbol'); assert.equal(s.angulos, antes.angulos, 'mismos ángulos (no se aplanó)'); assert.equal(s.sel, antes.sel, 'misma crease seleccionada');
  assert.equal(b.tipo, 'error'); assert.match(b.mensaje, /No se pudo cambiar la base a P7 \(construccion-detenida: .*fallo SIMULADO.*\)\. Se conserva la base P3 con su plegado\./); assert.match(s.status, /Base change failed · base=P3 kept/);
  assert.deepEqual(B.errors.slice(e0), [], 'sin excepciones no capturadas');
  await B.eval(`${CTRL}.simularFallo(null)`); await B.eval(BASE(7)); assert.equal((await B.eval(ESTADO)).base, 7, 'sin el fallo, el cambio de base funciona'); assert.equal((await B.eval(BARRA)).mensaje, null, 'el aviso de fallo desaparece tras un cambio de base correcto');
});

test('G5–G6 · primer árbol fallido ⇒ construcción DETENIDA sin restos del modelo anterior; fallo en buildPanels ⇒ fallback atómico visible', async () => {
  const e0 = B.errors.length; await abrir('exp'); await B.eval(`${CTRL}.activar('ACTIVAR-EXPERIMENTAL')`); await construir(); assert.equal((await B.eval(ESTADO)).nFold, 12);
  await doc(gridDieline(3)); await B.eval(`${CTRL}.simularFallo('buildFoldTree')`); await construir(); let s = await B.eval(ESTADO); let b = await B.eval(BARRA);
  assert.match(s.status, /^3D error: construccion-detenida/); assert.deepEqual([s.nFold, s.foldPanel, s.mallas], [0, false, 9], 'paneles del modelo nuevo, planos; ningún árbol ni control de plegado del modelo anterior');
  assert.match(b.mensaje, /Construcción DETENIDA por el motor experimental/); assert.equal(b.origen, 'experimental');
  await B.eval(`${CTRL}.simularFallo('buildPanels')`); await construir(); s = await B.eval(ESTADO); b = await B.eval(BARRA);
  assert.equal(s.experimental, false); assert.equal(s.nFold, 8, 'modelo, adyacencias y árbol del legacy'); assert.match(b.construccion, /LEGACY \(fallback\)/); assert.equal(b.tipo, 'aviso'); assert.match(b.mensaje, /no pudo construir este troquel \(fallo-simulado\)/);
  await B.eval(`${CTRL}.simularFallo(null)`); await construir(); s = await B.eval(ESTADO); assert.deepEqual([s.experimental, s.nFold], [true, 8]);
  assert.deepEqual(B.errors.slice(e0), []);
});
