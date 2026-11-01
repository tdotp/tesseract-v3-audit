// Línea de producto 3.0.1-dev (D-0) — robustez de estado y exportación en Node: H-02 (mesa activa restaurada aunque exportFile falle),
// H-05 (identidad del documento en la misma llamada que la extracción/arte; sin documento; nombres repetidos), KI-24 (buildChildrenOfMap declarado
// y cableado) y H-07/KI-28 (≥ 125 000 índices sin RangeError). Las pruebas de H-03 y del flujo de interfaz están en producto-navegador.test.mjs.
// Las aserciones de F1 que fijaban estos defectos («se preserva») siguen vivas en la batería HISTÓRICA (tests/run-historico.sh, commit congelado).
import test from 'node:test'; import assert from 'node:assert/strict'; import fs from 'node:fs'; import path from 'node:path';
import { ROOT } from '../lib/fixtures.mjs'; import { makeIllustrator, runScript, layer } from '../lib/mock-illustrator.mjs';
import { loadExporter, setupEnv } from '../lib/a8.mjs'; import { parseGLB } from '../lib/glb.mjs';
import { buildArtworkExportScript } from '../../src/host/art.js'; import { EXTRACT_SCRIPT } from '../../src/host/extract.js';
import { withDocIdentity, DOC_IDENTITY_SCRIPT, unwrapDocIdentity, sameDocument } from '../../src/host/doc-identity.js';

const ab = (name, w = 600, h = 400, x = 0) => ({ name, rect: [x, h, x + w, 0] });
const run = (script, ill) => JSON.parse(runScript(script, ill));
const xmp = (id) => `<x:xmpmeta><rdf:Description xmpMM:DocumentID="${id}" xmpMM:InstanceID="xmp.iid:otra"/></x:xmpmeta>`;
const conDoc = (ill, { name, ruta = '', docId = '' }) => { ill.doc.name = name; ill.doc.path = ruta ? ruta.replace(/\/[^/]*$/, '') : ''; ill.doc.fullName = { fsName: ruta }; ill.doc.XMPString = docId ? xmp(docId) : ''; return ill; };

// ───────────── H-02 ─────────────
test('H-02 · si exportFile falla en la mesa Back, la mesa activa original vuelve a quedar activa y el error sale como JSON', () => {
  const ill = makeIllustrator({ artboards: [ab('Otra'), ab('Front', 600, 400, 700), ab('Back', 600, 400, 1400)] }); ill.doc._active = 0;
  const intentos = []; ill.escritura.bytes = (ruta, activa) => { intentos.push(activa); if (activa === 2) throw new Error('disco lleno'); return 1024; };
  const out = run(buildArtworkExportScript(), ill);
  assert.match(out.error, /disco lleno/); assert.equal(out.usuario, true); // KI-37: mensaje comprensible assert.deepEqual(intentos, [1, 2], 'exportó Front (1) y falló en Back (2)');
  assert.equal(ill.doc._active, 0, 'la mesa activa original (0) se restaura aunque la exportación lance');
});
test('H-02 · si falla la PRIMERA exportación (Front) también se restaura; sin fallo, el comportamiento no cambia', () => {
  const ill = makeIllustrator({ artboards: [ab('Front'), ab('Otra', 100, 100, 700), ab('Back', 600, 400, 1400)] }); ill.doc._active = 1;
  ill.doc.exportFile = () => { throw new Error('permiso denegado'); };
  assert.match(run(buildArtworkExportScript(), ill).error, /permiso denegado/); assert.equal(ill.doc._active, 1);
  const ok = makeIllustrator({ artboards: [ab('Otra'), ab('Front', 600, 400, 700), ab('Back', 600, 400, 1400)] }); ok.doc._active = 0;
  const r = run(buildArtworkExportScript(), ok); assert.equal(r.mode, 'artboards'); assert.deepEqual(ok.calls.exportFile.map((c) => c.activeArtboard), [1, 2]); assert.equal(ok.doc._active, 0);
});
test('H-02 · el modo capas no toca la mesa activa ni la visibilidad final (restaurada como antes)', () => {
  const ill = makeIllustrator({ artboards: [ab('Principal'), ab('Segunda', 100, 100, 700)], layers: [layer('Front'), layer('Back'), layer('Extra', [], { visible: false })] }); ill.doc._active = 1;
  ill.doc.exportFile = () => { throw new Error('fallo de capa'); };
  assert.match(run(buildArtworkExportScript(), ill).error, /fallo de capa/); assert.equal(ill.doc._active, 1); assert.deepEqual(ill.visibility(), { Front: true, Back: true, Extra: false });
});
test('H-02 · el texto del script usa try/finally SOLO en exportArtboardByIndex (cambio mínimo)', () => {
  const s = buildArtworkExportScript(); assert.equal((s.match(/finally/g) || []).length, 2, 'el finally de capas que ya existía + el nuevo');
  assert.match(s, /function exportArtboardByIndex\(idx,label,source\)\{ var prev=doc\.artboards\.getActiveArtboardIndex\(\); doc\.artboards\.setActiveArtboardIndex\(idx\); try\{ return exportActiveArtboardToPNG\(label,source\); \} finally \{ doc\.artboards\.setActiveArtboardIndex\(prev\); \} \}/);
});

// ───────────── H-05 ─────────────
test('H-05 · la extracción envuelta devuelve la identidad Y el resultado original sin cambios (mismo JSON que EXTRACT_SCRIPT solo)', () => {
  const spec = { layers: [layer('Cuts'), layer('Creases')] };
  const solo = runScript(EXTRACT_SCRIPT, makeIllustrator(spec)); const ill = conDoc(makeIllustrator(spec), { name: 'caja.ai', ruta: '/Trabajo/caja.ai', docId: 'xmp.did:AAA' });
  const env = run(withDocIdentity(EXTRACT_SCRIPT), ill); assert.deepEqual(Object.keys(env), ['tessDoc', 'r']);
  assert.deepEqual(env.tessDoc, { name: 'caja.ai', path: '/Trabajo/caja.ai', documentID: 'xmp.did:AAA' }); assert.deepEqual(env.r, JSON.parse(solo));
  assert.deepEqual(unwrapDocIdentity(env), { identity: env.tessDoc, result: env.r });
});
test('H-05 · sin documento abierto: identidad null (nunca coincide) y el resultado interior conserva su error', () => {
  const env = run(withDocIdentity(EXTRACT_SCRIPT), makeIllustrator({ noDocument: true })); assert.equal(env.tessDoc, null); assert.equal(env.r.error, 'No document open');
  assert.equal(sameDocument(null, null), false); assert.equal(sameDocument({ name: 'a', path: '', documentID: '' }, null), false);
});
test('H-05 · dos documentos con el MISMO nombre se distinguen por la ruta o por el DocumentID; el mismo documento coincide', () => {
  const id = (o) => run(DOC_IDENTITY_SCRIPT, conDoc(makeIllustrator({}), o)).tessDoc;
  const a = id({ name: 'caja.ai', ruta: '/A/caja.ai', docId: 'xmp.did:1' }), b = id({ name: 'caja.ai', ruta: '/B/caja.ai', docId: 'xmp.did:1' });
  const c = id({ name: 'Sin título-1', docId: 'xmp.did:2' }), d = id({ name: 'Sin título-1', docId: 'xmp.did:3' });
  assert.equal(sameDocument(a, b), false, 'misma copia en otra carpeta'); assert.equal(sameDocument(c, d), false, 'sin guardar: mismo nombre, distinto DocumentID');
  assert.equal(sameDocument(a, id({ name: 'caja.ai', ruta: '/A/caja.ai', docId: 'xmp.did:1' })), true); assert.equal(c.path, '', 'documento sin guardar: ruta vacía');
});
test('H-05 · XMP ausente o ilegible y rutas con comillas o barras: la identidad sigue siendo JSON válido (solo lectura)', () => {
  const ill = conDoc(makeIllustrator({}), { name: 'raro "1"\\x.ai', ruta: '/A/raro "1"\\x.ai' }); Object.defineProperty(ill.doc, 'XMPString', { get() { throw new Error('XMP no disponible'); } });
  assert.deepEqual(run(DOC_IDENTITY_SCRIPT, ill).tessDoc, { name: 'raro "1"\\x.ai', path: '/A/raro "1"\\x.ai', documentID: '' });
  assert.deepEqual(ill.calls.exportFile, []); assert.equal(ill.saved.text, null);
});
test('H-05 · el arte también viaja con la identidad y su contenido no cambia; respuesta sin envoltorio = identidad desconocida (no bloquea)', () => {
  const spec = { artboards: [ab('Front')] }; const solo = run(buildArtworkExportScript(), makeIllustrator(spec)); const env = run(withDocIdentity(buildArtworkExportScript()), conDoc(makeIllustrator(spec), { name: 'prueba.ai', docId: 'x' }));
  for (const o of [solo, env.r]) o.front.path = o.front.path.replace(/_\d+\.png$/, '.png'); assert.deepEqual(env.r, solo);
  assert.deepEqual(unwrapDocIdentity({ mode: 'none' }), { identity: undefined, result: { mode: 'none' } }); assert.equal(sameDocument(undefined, { name: 'x' }), true);
});
test('H-05 · el controlador usa la identidad: extracción envuelta y comprobación puntual antes de construir (sin vigilancia continua)', () => {
  const c = fs.readFileSync(path.join(ROOT, 'src/ui/controller.js'), 'utf8');
  assert.match(c, /evalScript\(withDocIdentity\(EXTRACT_SCRIPT\),/); assert.match(c, /evalScript\(DOC_IDENTITY_SCRIPT, function\(result\)\{/);
  assert.doesNotMatch(c, /setInterval|addEventListener\('documentAfterActivate'|documentAfterActivate/);
  const a = fs.readFileSync(path.join(ROOT, 'src/app/actions.js'), 'utf8'); assert.match(a, /evalScriptJSON\(withDocIdentity\(buildArtworkExportScript\(\)\)\)/);
});

// ───────────── KI-24 ─────────────
test('KI-24 · buildChildrenOfMap existe (fold/folding.js), applyFolding la usa y llega al controlador y a las acciones por deps', async () => {
  const f = fs.readFileSync(path.join(ROOT, 'src/fold/folding.js'), 'utf8'); assert.match(f, /function buildChildrenOfMap\(\)\{/); assert.match(f, /var childrenOf=buildChildrenOfMap\(\);/);
  const m = fs.readFileSync(path.join(ROOT, 'src/main.js'), 'utf8'); assert.match(m, /var \{ applyFolding, buildChildrenOfMap \} = createFolding/);
  assert.equal((m.match(/buildChildrenOfMap/g) || []).length, 3, 'declarada por desestructuración y pasada a createActions y createController');
  const { createFolding } = await import('../../src/fold/folding.js');
  const S = { foldTree: [{ parent: 0, child: 1, crease: 'c1' }, { parent: 0, child: 2, crease: 'c2' }, { parent: 2, child: 3, crease: 'c3' }] };
  assert.deepEqual(createFolding(S, {}).buildChildrenOfMap(), { 0: [{ child: 1, crease: 'c1', edgeIdx: 0 }, { child: 2, crease: 'c2', edgeIdx: 1 }], 2: [{ child: 3, crease: 'c3', edgeIdx: 2 }] });
});
test('KI-24 · applyMaterialPreset sin modelo 3D no lanza y sin escena no rehace pliegues', async () => {
  const { createController } = await import('../../src/ui/controller.js'); const llamadas = [];
  const S = { currentMaterialPreset: 'white', currentPanelData: null, scene3d: null, foldTree: [] };
  const deps = { syncMaterialPresetUI: () => llamadas.push('sync'), refreshPanelMaterials: () => llamadas.push('refresh'), rebuildCreaseVisuals: () => llamadas.push('rebuild'), buildChildrenOfMap: () => ({}) };
  const ctl = createController(S, deps); assert.doesNotThrow(() => ctl.applyMaterialPreset('kraft', true)); assert.equal(S.currentMaterialPreset, 'kraft'); assert.deepEqual(llamadas, ['sync', 'refresh']);
  const S2 = { ...S, scene3d: {}, foldTree: [{ parent: 0, child: 1 }] }; llamadas.length = 0; createController(S2, deps).applyMaterialPreset('gray', false); assert.deepEqual(llamadas, ['sync', 'refresh', 'rebuild']);
});

// ───────────── H-07 / KI-28 ─────────────
test('H-07 · ≥ 125 000 índices: src exporta (el baseline sigue lanzando RangeError: KI-28 histórico) y el tipo de índice es el correcto', async () => {
  setupEnv(); const T = globalThis.THREE;
  const escena = (n, nVerts) => { const s = new T.Scene(); const g = new T.BufferGeometry(); const pos = []; for (let i = 0; i < nVerts; i++) pos.push(i % 300, Math.floor(i / 300), (i * 7) % 5);
    g.setAttribute('position', new T.BufferAttribute(new Float32Array(pos), 3)); const idx = []; for (let i = 0; idx.length < n; i++) { const a = (i * 2) % (nVerts - 301); idx.push(a, a + 1, a + 300); } g.setIndex(idx); s.add(new T.Mesh(g, new T.MeshPhongMaterial({ color: 0x777777 }))); return s; };
  for (const [n, nVerts, tipo] of [[130002, 3000, 5123], [150000, 70000, 5125]]) {
    await assert.rejects(async () => (await loadExporter('baseline', escena(n, nVerts), () => {})).buildGLBBlobFromCurrentView(), /RangeError|Maximum call stack/);
    const ex = await loadExporter('src', escena(n, nVerts), () => {}); const g = parseGLB(Buffer.from(await ex.buildGLBBlobFromCurrentView().arrayBuffer()));
    const iAcc = g.json.accessors[g.json.meshes[0].primitives[0].indices]; assert.equal(iAcc.componentType, tipo, `n=${n}`); assert.equal(iAcc.count % 3, 0); assert.ok(iAcc.count >= 125000);
  }
  assert.doesNotMatch(fs.readFileSync(path.join(ROOT, 'src/export/glb-scene.js'), 'utf8'), /Math\.max\.apply\(/);
});
