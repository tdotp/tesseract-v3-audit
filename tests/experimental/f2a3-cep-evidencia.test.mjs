// F2A-3 · I-7 — Fija la evidencia de la validación en Illustrator REAL (2026-10-28, docs/fase2/evidencia/f2a3-cep/): la ejecutó
// tools/a4/f2a3-cep.mjs por DevTools remoto sobre el panel «Tesseract V3 (experimental)» cargado por CEP 12.1.1 / Chromium 99 en
// Illustrator 30.8.2. Esta prueba NO vuelve a ejecutar Illustrator: comprueba que la evidencia guardada dice lo que el informe afirma y que
// corresponde al código actual (el main.js validado = una construcción limpia del bundle experimental desde este árbol).
import { test } from 'node:test'; import assert from 'node:assert/strict'; import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import crypto from 'node:crypto';
import { ROOT } from '../lib/fixtures.mjs'; import { REAL_SHA } from '../lib/a8.mjs'; import { summarize, parseGLB } from '../lib/glb.mjs';
import { construirExperimental } from '../../tools/build/build-experimental.mjs';

const E = path.join(ROOT, 'docs/fase2/evidencia/f2a3-cep'); const leer = (f) => JSON.parse(fs.readFileSync(path.join(E, f), 'utf8'));
const sha = (b) => crypto.createHash('sha256').update(b).digest('hex'); const exp = (f) => fs.readFileSync(path.join(E, 'exportaciones', f));
const ID = leer('identidad-2026-10-28T17-32-41-464Z.json'), CAJA = leer('caja-2026-10-28T17-32-41-613Z.json'), ARTE = leer('arte-2026-10-28T17-35-44-504Z.json'), REC = leer('recarga-2026-10-28T17-36-21-326Z.json');

test('identidad en Illustrator real: extensión experimental, ILST 30.8.2, Chromium 99 de CEP 12.1.1, three r132, SOMBRA y barra; main.js = construcción limpia del árbol actual', async () => {
  assert.deepEqual(ID.veredicto, { extension: true, host: true, mainJs: true, three: true, sombra: true, barra: true, chromium: true });
  assert.equal(ID.identidad.host.appVersion, '30.8.2'); assert.match(ID.identidad.ua, /Chrome\/99\.0\.4844\.84 AdobeCEP\/12\.1\.1/); assert.match(ID.identidad.href, /\/CEP\/extensions\/tesseract-v3-experimental\/index\.html$/);
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'tess-f2a3-ev-')); try { await construirExperimental({ out: tmp }); assert.equal(sha(fs.readFileSync(path.join(tmp, 'main.js'))), ID.identidad.mainJs.sha256, 'el main.js validado en real es el que construye este árbol'); } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
});
test('Caja Botánica (N0-A) en real: extracción y 2D, sombra = legacy (11 de 13), activación en la barra, experimental 13/12, bases, plegado, materiales, recuperación y vuelta a sombra; consola sin errores', () => {
  const p = CAJA.pasos; assert.deepEqual(Object.entries(p).filter(([, v]) => v && v.error), []); assert.deepEqual(CAJA.consola, []);
  assert.equal(p.V1.status, 'Extraction complete'); assert.equal(p.V1.validacion, '✅ No problems found'); assert.ok(p.V1.lienzo2d.pixelesConTrazo > 100, 'vista 2D dibujada');
  assert.match(p.V2.barra.construccion, /^Construcción actual: LEGACY · 11 paneles · 10 pliegues/); assert.equal(p.V2.barra.diag, 'Comparación en sombra: legacy 11 paneles · experimental 13 paneles');
  assert.deepEqual([p.V3.confirmacionVisible, p.V3.modoTrasPrimerClic, p.V3.modo], [true, 'sombra', 'activo']);
  assert.match(p.V4.barra.construccion, /^Construcción actual: EXPERIMENTAL \(experimental-f2a2\) · 13 paneles · 12 pliegues · base P8$/); assert.deepEqual([p.V4.plegado.opcionesBase, p.V4.plegado.deslizadores], [13, 14]);
  assert.deepEqual(Object.values(p.V5.bases).map((b) => b.status), ['3D ready · base=P0 · thickness=0.3mm', '3D ready · base=P5 · thickness=0.3mm', '3D ready · base=P12 · thickness=0.3mm']); assert.equal(p.V5.plegadoCambiaLaImagen, true); assert.equal(p.V5.resetVuelveAlPlano, true);
  assert.equal(p.V6['espesor 0.8'], 'Thickness applied: 0.8mm'); assert.equal(p.V6['espesor 0'], 'Thickness must be greater than 0'); assert.equal(p.V6.kraft.pill, 'Kraft board');
  assert.equal(p.V8.conservaBase, true); assert.equal(p.V8.conservaAngulos, true); assert.equal(p.V8.durante.status, 'Base change failed · base=P0 kept'); assert.equal(p.V8.trasQuitarElFallo.base, '3');
  assert.match(p.V9.detencion.status, /^3D error: construccion-detenida/); assert.equal(p.V9.detencion.plegado.foldPanel, false); assert.match(p.V9.fallback.barra.construccion, /LEGACY \(fallback\) · 11 paneles/); assert.match(p.V9.recuperacion.barra.construccion, /EXPERIMENTAL .* 13 paneles · 12 pliegues/);
  assert.equal(p.V10.modo, 'sombra'); assert.match(p.V10.barra.construccion, /^Construcción actual: LEGACY · 11 paneles/); assert.match(p.V10.log[0], /Base reiniciada \(KI-30\)/);
});
test('exportaciones reales: GLB en sombra = GLB legacy real de A4–A9 byte a byte; GLB y PNG del experimental válidos y deterministas', () => {
  assert.equal(sha(exp('f2a3-sombra.glb')), REAL_SHA.plano, 'GLB plano en sombra = 737bcd23… (A4–A9 real)'); assert.equal(CAJA.archivos['f2a3-sombra.glb'].sha256, REAL_SHA.plano);
  const g = summarize(parseGLB(exp('f2a3-activo.glb'))); assert.equal(g.generator, 'Tesseract Phase 7B'); assert.ok(g.nodes > 13 && g.meshes >= 13, JSON.stringify(g)); assert.equal(sha(exp('f2a3-activo.glb')), CAJA.archivos['f2a3-activo.glb'].sha256);
  for (const f of ['f2a3-sombra.png', 'f2a3-activo.png', 'f2a3-arte-sombra.png', 'f2a3-arte-activo.png']) assert.equal(exp(f).readUInt32BE(0), 0x89504e47, f + ' es PNG');
  assert.equal(CAJA.pasos['V7-activo'].glb.escrituras[0].err, 0); assert.equal(CAJA.pasos['V7-activo'].png.err, 0); assert.equal(CAJA.pasos['V7-activo'].png.botonVisible, false, 'KI-12: el botón PNG sigue oculto');
});
test('arte (N0-B) en real: GLB con arte en sombra = legacy real de A8 byte a byte (b4973a54…); experimental con 2 imágenes; documento intacto', () => {
  assert.deepEqual(Object.entries(ARTE.pasos).filter(([, v]) => v && v.error), []); assert.deepEqual(ARTE.consola, []);
  assert.ok(exp('f2a3-arte-sombra.glb').equals(fs.readFileSync(path.join(ROOT, 'docs/fase1/a8-real/glb/paridad-arte.glb')))); assert.equal(sha(exp('f2a3-arte-sombra.glb')), REAL_SHA.arte);
  const g = summarize(parseGLB(exp('f2a3-arte-activo.glb'))); assert.equal(g.images, 2); assert.match(ARTE.pasos.ARTE.arte, /Artwork loaded from layers/);
  assert.match(ARTE.pasos.V2.barra.diag, /legacy 2 paneles · experimental 2 paneles \(coinciden\)/); assert.match(ARTE.pasos.V4.barra.construccion, /EXPERIMENTAL .* 2 paneles · 1 pliegues/);
  assert.equal(fs.readFileSync(path.join(E, 'n0b-estado-antes.txt'), 'utf8'), fs.readFileSync(path.join(E, 'n0b-estado-despues-2.txt'), 'utf8'), 'capas, visibilidad, bloqueo y selección iguales antes y después');
});
test('reinicio del panel en modo ACTIVO ⇒ SOMBRA; desinstalación real: menú sin el experimental tras reiniciar Illustrator y demás extensiones intactas', () => {
  assert.deepEqual(REC.tras, { modo: 'sombra', barra: 'SOMBRA (legacy)', status: 'Ready' }); assert.deepEqual(REC.consola, []);
  const d = fs.readFileSync(path.join(E, 'desinstalacion-real.txt'), 'utf8'); assert.match(d, /DESINSTALACIÓN CORRECTA/); assert.match(d, /menú tras desinstalar y reiniciar: Libraries, Tesseract, Validador editorial\n/); assert.doesNotMatch(d, /menú tras desinstalar[^\n]*experimental/);
  assert.equal(fs.readFileSync(path.join(E, 'snapshot-tras-desinstalar.txt'), 'utf8'), fs.readFileSync(path.join(E, 'snapshot-antes.txt'), 'utf8'), 'CEP de sistema y usuario = estado previo a la instalación');
  assert.match(fs.readFileSync(path.join(E, 'snapshot-antes.txt'), 'utf8'), /TesserArt_Validator/);
  for (const f of fs.readdirSync(path.join(E, 'capturas'))) assert.equal(fs.readFileSync(path.join(E, 'capturas', f)).readUInt32BE(0), 0x89504e47, f);
});
