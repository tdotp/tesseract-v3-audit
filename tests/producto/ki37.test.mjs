// KI-37 — En Illustrator real, doc.exportFile() puede terminar SIN excepción y SIN crear el PNG. El script de arte debe comprobar el archivo escrito (existe y
// no está vacío) y devolver un error comprensible con su contexto (lado y nombre Front/Back o Tiro/Retiro), sin rutas que el panel intente cargar, restaurando
// siempre la mesa activa y la visibilidad. Maqueta de Illustrator: no sustituye a Illustrator real (docs/release/TESSERACT_V3_MADURACION_ROBUSTEZ.md).
// Las pruebas del panel (arte vigente conservado, recursos parciales) están en producto-navegador.test.mjs.
import test from 'node:test'; import assert from 'node:assert/strict';
import { TARGETS, extractScripts } from '../lib/legacy.mjs'; import { makeIllustrator, runScript, layer } from '../lib/mock-illustrator.mjs';
import { buildArtworkExportScript } from '../../src/host/art.js'; import { withDocIdentity, unwrapDocIdentity } from '../../src/host/doc-identity.js';

const ab = (name, w = 600, h = 400, x = 0) => ({ name, rect: [x, h, x + w, 0] }); const run = (ill) => JSON.parse(runScript(buildArtworkExportScript(), ill));
const MESAS = () => makeIllustrator({ artboards: [ab('Otra'), ab('Front', 600, 400, 700), ab('Back', 600, 400, 1400)] });
const NO_CREADO = (lado) => `No se pudo exportar el artwork ${lado}. Illustrator no creó el archivo PNG. Verifique la carpeta temporal y vuelva a intentarlo.`;
const VACIO = (lado) => `No se pudo exportar el artwork ${lado}. Illustrator creó el archivo PNG vacío. Verifique la carpeta temporal y vuelva a intentarlo.`;
const sinResultado = (o) => { assert.equal(o.front, undefined, 'sin ruta frontal que cargar'); assert.equal(o.back, undefined, 'sin ruta trasera que cargar'); assert.equal(o.ok, undefined); assert.equal(o.usuario, true, 'mensaje para el usuario'); assert.doesNotMatch(o.error, /undefined|line:/); };

test('KI-37 · el comportamiento anterior (baseline): exportFile sin archivo se daba por bueno y devolvía una ruta inexistente', () => {
  const ill = MESAS(); ill.escritura.bytes = () => null; const o = JSON.parse(runScript(extractScripts(TARGETS.baseline).art, ill)); assert.equal(o.ok, true); assert.match(o.front.path, /prueba_front_\d+\.png$/); assert.deepEqual(ill.archivos, {});
});
test('KI-37 · exportación correcta: los dos PNG existen y tienen datos; rutas devueltas; mesa activa restaurada', () => {
  const ill = MESAS(); const o = run(ill); assert.equal(o.ok, true); assert.equal(o.mode, 'artboards'); assert.equal(o.error, undefined); assert.equal(ill.archivos[o.front.path], 1024); assert.equal(ill.archivos[o.back.path], 1024); assert.equal(ill.doc._active, 0);
});
test('KI-37 · exportFile termina sin excepción pero NO crea el archivo: error comprensible, sin rutas, mesa activa restaurada', () => {
  const ill = MESAS(); ill.doc._active = 0; ill.escritura.bytes = () => null; const o = run(ill); assert.equal(o.error, NO_CREADO('frontal (Front)')); sinResultado(o); assert.equal(ill.calls.exportFile.length, 1, 'no sigue con Back'); assert.equal(ill.doc._active, 0);
});
test('KI-37 · el archivo se crea VACÍO: error comprensible, sin rutas, mesa activa restaurada', () => {
  const ill = MESAS(); ill.escritura.bytes = () => 0; const o = run(ill); assert.equal(o.error, VACIO('frontal (Front)')); sinResultado(o); assert.equal(ill.doc._active, 0);
});
test('KI-37 · Front correcto y Back falla en silencio: error del lado trasero, ninguna ruta parcial, mesa activa restaurada', () => {
  const ill = MESAS(); ill.doc._active = 0; ill.escritura.bytes = (ruta) => (/_back_/.test(ruta) ? null : 1024); const o = run(ill); assert.equal(o.error, NO_CREADO('trasero (Back)')); sinResultado(o); assert.equal(ill.calls.exportFile.length, 2); assert.equal(ill.doc._active, 0);
});
test('KI-37 · el fallo que SÍ lanza excepción: mismo formato, con el detalle de Illustrator; mesa activa restaurada', () => {
  const ill = MESAS(); ill.doc._active = 0; ill.escritura.bytes = (ruta) => { if (/_back_/.test(ruta)) throw new Error('disco lleno'); return 1024; }; const o = run(ill);
  assert.equal(o.error, 'No se pudo exportar el artwork trasero (Back). Illustrator informó: disco lleno. Verifique la carpeta temporal y vuelva a intentarlo.'); sinResultado(o); assert.equal(ill.doc._active, 0);
  const sin = MESAS(); sin.escritura.bytes = () => { throw {}; }; const s = run(sin); assert.equal(s.error, 'No se pudo exportar el artwork frontal (Front). Illustrator informó: error desconocido. Verifique la carpeta temporal y vuelva a intentarlo.'); sinResultado(s);
});
test('KI-37 · contexto Tiro/Retiro: el mensaje nombra la mesa o la capa tal como está en el documento', () => {
  const m = makeIllustrator({ artboards: [ab('Otra'), ab('Tiro', 600, 400, 700), ab('Retiro', 600, 400, 1400)] }); m.escritura.bytes = (r) => (/_back_/.test(r) ? null : 1024); assert.equal(run(m).error, NO_CREADO('trasero (Retiro)')); assert.equal(m.doc._active, 0);
  const c = makeIllustrator({ artboards: [ab('Principal')], layers: [layer('Tiro'), layer('Retiro')] }); c.escritura.bytes = () => null; assert.equal(run(c).error, NO_CREADO('frontal (Tiro)'));
});
test('KI-37 · modo capas: fallo silencioso de Front y de Back; visibilidad original y mesa activa intactas', () => {
  for (const [patron, lado, n] of [[/_front_/, 'frontal (Front)', 1], [/_back_/, 'trasero (Back)', 2]]) { const ill = makeIllustrator({ artboards: [ab('Principal'), ab('Segunda', 100, 100, 700)], layers: [layer('Cuts'), layer('Front'), layer('Back'), layer('Extra', [], { visible: false })] }); ill.doc._active = 1;
    ill.escritura.bytes = (r) => (patron.test(r) ? null : 1024); const o = run(ill); assert.equal(o.error, NO_CREADO(lado)); sinResultado(o); assert.equal(ill.calls.exportFile.length, n); assert.equal(ill.doc._active, 1); assert.deepEqual(ill.visibility(), { Cuts: true, Front: true, Back: true, Extra: false }); }
});
test('KI-37 · a través del envoltorio de identidad el error llega al panel como resultado (r.error, r.usuario), con la identidad del documento', () => {
  const ill = MESAS(); ill.escritura.bytes = () => null; const u = unwrapDocIdentity(JSON.parse(runScript(withDocIdentity(buildArtworkExportScript()), ill))); assert.equal(u.result.error, NO_CREADO('frontal (Front)')); assert.equal(u.result.usuario, true); assert.equal(u.identity.name, 'prueba.ai');
});
test('KI-37 · un error ajeno a la exportación conserva su formato técnico y no se presenta como mensaje de usuario', () => {
  const ill = makeIllustrator({ artboards: [ab('Front')] }); Object.defineProperty(ill.doc, 'name', { get() { throw new Error('documento no disponible'); } }); const o = run(ill); assert.match(o.error, /^Artwork export failed: documento no disponible/); assert.equal(o.usuario, undefined);
});
