// Batería de navegador (Chrome headless real con GPU, sin dependencias): corrección GPU, materiales, arte, exportación GLB,
// interacciones, regresión baseline↔panel y métricas base. Corre sobre COPIAS instrumentadas en un directorio temporal.
// LÍMITE: no es Illustrator/CEP (Chromium 99); el puente CEP está simulado (shim.js). Ver docs/fase1/PROCEDIMIENTO_VALIDACION_ILLUSTRATOR.md.
import test, { before, after } from 'node:test'; import assert from 'node:assert/strict'; import fs from 'node:fs'; import path from 'node:path';
import { prepare, textOf, PAGE_HELPERS } from './harness.mjs'; import { ROOT } from '../lib/fixtures.mjs'; import { summarize, parseGLB } from '../lib/glb.mjs';
import { TARGETS, loadGeometry } from '../lib/legacy.mjs';

const OUT = path.join(ROOT, 'tests/results/latest'); fs.mkdirSync(OUT, { recursive: true });
const save = (name, data) => fs.writeFileSync(path.join(OUT, name + '.json'), JSON.stringify(data, null, 1));
const consts = loadGeometry(TARGETS.baseline).consts; const PRESETS = consts.MATERIAL_PRESETS;
const GOLD = path.join(ROOT, 'tests/golden/glb.golden.json'); const UPDATE = !!process.env.UPDATE_GOLDEN;
const goldenGlb = fs.existsSync(GOLD) ? JSON.parse(fs.readFileSync(GOLD, 'utf8')) : {};
const SOAK = !!process.env.SOAK;
let H; const names = { base: 'baseline', fix: 'panel' };
before(async () => { H = await prepare(); });
after(async () => { await H?.close(); process.exit(process.exitCode ?? 0); });

const evalIn = (code, opts) => H.browser.eval(code, opts);
async function load(dir, { scripts = ['leak_cycles.js', 'harness_art.js', 'measure_ui.js'] } = {}) {
  await H.open(dir); await evalIn(PAGE_HELPERS); for (const s of scripts) await evalIn(textOf('tools/baseline/' + s));
  assert.deepEqual(H.browser.errors, [], 'errores JS al cargar ' + dir); }
const CAPTURE = `window.captureGLB = async () => { window.__glb = null; window.cep = { fs: { writeFile: (p, b) => { window.__glb = b; return { err: 0 }; } }, encoding: { Base64: 'Base64' } };
  const prev = window.__adobe_cep__.evalScript; window.__adobe_cep__.evalScript = (s, cb) => (s.indexOf('saveDialog') > -1 ? setTimeout(() => cb('/tmp/x.glb'), 0) : prev(s, cb));
  T.$('export-glb-btn').click(); for (let i = 0; i < 400 && !window.__glb; i++) await T.sleep(50); window.__adobe_cep__.evalScript = prev; return window.__glb; };`;

// ───────────────────────── GPU (condición 1 de la autorización de A1) ─────────────────────────
test('GPU · baseline (KI-01): los recursos de GPU CRECEN en cada ciclo de plegado', async () => {
  await load('base-caja'); const r = await evalIn(`tesseractLeakCycles({ cycles: 3 })`); save('gpu-baseline', r);
  assert.equal(r.veredicto, 'CRECE'); const w = r.peor_delta_ciclos_2_en_adelante; assert.ok(w.tex >= 90 && w.buf >= 1000 && w.vao >= 500, JSON.stringify(w));
});
for (const [label, withArt, cycles] of [['sin arte', false, 6], ['con arte y refresco', true, 5], ...(SOAK ? [['soak 25 ciclos', false, 25]] : [])]) {
  for (const fx of ['caja', 'ill']) test(`GPU · panel (${fx}, ${label}): SIN crecimiento acumulativo tras ${cycles} ciclos`, async () => {
    await load('fix-' + fx); if (withArt) { await evalIn(`T.build()`); await evalIn(`harnessLoadArt()`); }
    const r = await evalIn(`tesseractLeakCycles({ cycles: ${cycles}, withArt: ${withArt} })`); save(`gpu-panel-${fx}-${label.replace(/\W+/g, '_')}`, r);
    assert.equal(r.veredicto, 'SIN CRECIMIENTO ACUMULATIVO', JSON.stringify(r.peor_delta_ciclos_2_en_adelante));
    assert.deepEqual(H.browser.errors, [], 'errores JS durante los ciclos');
  });
}

// ───────────────────────── Regresión baseline ↔ panel ─────────────────────────
for (const fx of ['caja', 'ill']) test(`Regresión · baseline vs panel (${fx}): píxeles, escena y GLB idénticos`, async () => {
  await H.browser.goto(`${H.url}/compare-${fx}.html`); await evalIn(`new Promise(r => setTimeout(r, 1200))`);
  const r = await evalIn(`tesseractCompareFrames()`); save('regresion-' + fx, r);
  assert.deepEqual(r.resumen, { poses_identicas: true, escena_identica: true, glb_identico: true }, JSON.stringify(r.poses));
  assert.equal(r.paneles.A, r.paneles.B);
});

// ───────────────────────── Escena, materiales, espesor ─────────────────────────
const MAT = `(async () => { const { sleep, raf2, $, panelMeshes, fire, build, setAll } = T; await build(); const D = __dbg; const out = {};
  const gl = D.renderer.getContext(); const ca = gl.getContextAttributes(); const cc = new THREE.Color();
  out.render = { clear: D.renderer.getClearColor(cc).getHexString(), clearAlpha: D.renderer.getClearAlpha(), attrs: { antialias: ca.antialias, alpha: ca.alpha, preserveDrawingBuffer: ca.preserveDrawingBuffer }, camera: { type: D.camera.type, fov: D.camera.fov },
    lights: D.scene.children.filter((c) => c.isLight).map((l) => ({ type: l.type, color: l.color.getHexString(), intensity: l.intensity, pos: l.position.toArray().map((v) => +v.toFixed(3)), ground: l.groundColor ? l.groundColor.getHexString() : null })),
    others: D.scene.children.filter((c) => !c.isLight).map((c) => c.type).sort() };
  out.presets = {};
  for (const p of ['white', 'kraft', 'gray']) { const s = $('material-preset'); s.value = p; fire(s, 'change'); await sleep(150); await raf2(); const ms = panelMeshes();
    await setAll(30); const bridges = []; D.scene.traverse((o) => { if (o.userData && (o.userData.role === 'foldBridgeTop' || o.userData.role === 'foldBridgeBottom')) bridges.push({ role: o.userData.role, type: o.material.type, hex: o.material.color.getHexString(), hasMap: !!o.material.map }); }); await setAll(0);
    out.presets[p] = { pill: $('material-pill').textContent, baseIdx: D.baseIndex, panels: panelMeshes().map((m) => ({ idx: m.userData.panelIndex, type: m.material.type, hex: m.material.color.getHexString(), side: m.material.side, spec: m.material.specular.getHexString(), shin: m.material.shininess, edgeHex: m.userData.edgeLines.material.color.getHexString(), edgeOpacity: m.userData.edgeLines.material.opacity, edgeTransparent: m.userData.edgeLines.material.transparent })), bridges: [...new Set(bridges.map((b) => JSON.stringify(b)))].map((s) => JSON.parse(s)) }; }
  out.thickness = {}; const th = $('thickness-input');
  for (const [label, val] of [['0.25', '0.25'], ['2', '2'], ['50→tope', '50'], ['0.05→mín', '0.05']]) { th.value = val; $('apply-thickness-btn').click(); await sleep(150); await raf2(); const m = panelMeshes()[0]; m.geometry.computeBoundingBox(); const bb = m.geometry.boundingBox;
    out.thickness[label] = { applied: D.thickness, depth: +(bb.max.z - bb.min.z).toFixed(6), input: th.value, status: $('status-area').textContent }; }
  const before = D.thickness; out.invalid = {}; for (const v of ['0', '-1', 'abc']) { th.value = v; $('apply-thickness-btn').click(); await sleep(60); out.invalid[v] = { thickness: D.thickness, same: D.thickness === before, status: $('status-area').textContent }; }
  return out; })()`;
const mats = {};
for (const t of ['base', 'fix']) test(`Escena/materiales · ${names[t]}: luces, renderer, presets, bisagras y espesor`, async () => {
  await load(t + '-caja'); const r = mats[t] = await evalIn(MAT); save('materiales-' + names[t], r);
  assert.deepEqual(r.render.attrs, { antialias: true, alpha: false, preserveDrawingBuffer: true }); assert.equal(r.render.clear, 'ffffff'); assert.equal(r.render.camera.fov, 45);
  assert.deepEqual(r.render.lights.map((l) => [l.type, l.intensity]), [['AmbientLight', 0.6], ['DirectionalLight', 0.8], ['HemisphereLight', 0.65]]);
  assert.deepEqual(r.render.lights[1].pos, [400, 300, 700]); assert.deepEqual(r.render.others, ['AxesHelper', 'GridHelper', 'Group']);
  for (const [p, def] of Object.entries(PRESETS)) { const x = r.presets[p]; assert.equal(x.pill, def.label); assert.equal(x.panels.length, 11);
    for (const pn of x.panels) { assert.equal(pn.type, 'MeshPhongMaterial'); assert.equal(pn.side, 2); assert.equal(pn.spec, '1b1b1b'); assert.equal(pn.shin, 10); assert.equal(pn.hex, (pn.idx === x.baseIdx ? def.shellBase : def.shell).slice(1), `${p} P${pn.idx}`);
      assert.equal(pn.edgeHex, def.line.slice(1)); assert.equal(pn.edgeOpacity, 0.72); assert.equal(pn.edgeTransparent, true); }
    assert.ok(x.bridges.length > 0 && x.bridges.every((b) => b.type === 'MeshPhongMaterial' && b.hex === def.hinge.slice(1) && !b.hasMap), `bisagras ${p}: ${JSON.stringify(x.bridges)}`); }
  assert.deepEqual(Object.fromEntries(Object.entries(r.thickness).map(([k, v]) => [k, [v.applied, v.depth]])), { '0.25': [0.25, 0.25], '2': [2, 2], '50→tope': [20, 20], '0.05→mín': [0.1, 0.1] });
  for (const v of ['0', '-1', 'abc']) { assert.equal(r.invalid[v].same, true); assert.equal(r.invalid[v].status, 'Thickness must be greater than 0'); }
  assert.deepEqual(H.browser.errors, []);
});
test('Escena/materiales · baseline y panel son idénticos', () => { assert.deepEqual(mats.fix, mats.base); });

// ───────────────────────── Arte ─────────────────────────
const ART = `(async () => { const { sleep, raf2, panelMeshes, build, setAll } = T; await build(); const D = __dbg; const out = {}; out.sinArte = panelMeshes().map((m) => (m.userData.artOverlays || []).length);
  out.carga = await harnessLoadArt(); await sleep(300); await raf2(); const art = D.art; const c = D.foldData.center; out.mode = art.mode; out.rect = art.front.rect;
  const th = D.thickness; out.overlays = []; let maxUvErr = 0;
  for (const m of panelMeshes()) { for (const ov of m.userData.artOverlays) { const pos = ov.geometry.attributes.position, uv = ov.geometry.attributes.uv, r = ov.material.map === art.front.texture ? art.front.rect : art.back.rect;
      for (let i = 0; i < pos.count; i++) { const u = (pos.getX(i) + c.x - r.left) / r.width, v = (r.top - (pos.getY(i) + c.y)) / r.height; maxUvErr = Math.max(maxUvErr, Math.abs(u - uv.getX(i)), Math.abs(v - uv.getY(i))); }
      out.overlays.push({ panel: m.userData.panelIndex, side: ov.material.map === art.front.texture ? 'front' : 'back', z: +ov.position.z.toFixed(6), renderOrder: ov.renderOrder, type: ov.material.type, transparent: ov.material.transparent, depthWrite: ov.material.depthWrite, depthTest: ov.material.depthTest, matSide: ov.material.side, geom: ov.geometry.type }); } }
  out.maxUvErr = maxUvErr; out.thickness = th;
  const tx = art.front.texture; out.texture = { flipY: tx.flipY, minFilter: tx.minFilter, magFilter: tx.magFilter, mipmaps: tx.generateMipmaps, anisotropy: tx.anisotropy >= 1, w: tx.image.width, h: tx.image.height, encoding: tx.encoding };
  await setAll(30); const br = []; D.scene.traverse((o) => { if (o.userData && (o.userData.role === 'foldBridgeTop' || o.userData.role === 'foldBridgeBottom')) br.push({ role: o.userData.role, type: o.material.type, withMap: !!o.material.map, renderOrder: o.renderOrder }); });
  out.bridges = [...new Set(br.map((b) => JSON.stringify(b)))].map((s) => JSON.parse(s)); out.stats = { gl: D.renderer.info.memory };
  return out; })()`;
const arts = {};
for (const t of ['base', 'fix']) test(`Arte · ${names[t]}: overlays, UV por artboard, desplazamientos, materiales y textura`, async () => {
  await load(t + '-caja'); const r = arts[t] = await evalIn(ART); save('arte-' + names[t], r);
  assert.deepEqual(r.sinArte, new Array(11).fill(0)); assert.equal(r.mode, 'artboards'); assert.equal(r.overlays.length, 22);
  assert.ok(r.maxUvErr < 1e-5, 'UV vs proyección de artboard completo: error ' + r.maxUvErr);
  for (const o of r.overlays) { assert.equal(o.z, o.side === 'front' ? +(r.thickness + consts.ART_TOP_OFFSET).toFixed(6) : -consts.ART_BOTTOM_OFFSET); assert.equal(o.renderOrder, 60);
    assert.deepEqual([o.type, o.transparent, o.depthWrite, o.depthTest, o.matSide, o.geom], ['MeshBasicMaterial', true, false, true, 2, 'ShapeGeometry']); }
  assert.deepEqual([r.texture.flipY, r.texture.minFilter, r.texture.magFilter, r.texture.mipmaps, r.texture.anisotropy, r.texture.w, r.texture.h], [false, 1008, 1006, true, true, 3280, 4096]);
  assert.ok(r.bridges.length > 0 && r.bridges.every((b) => b.type === 'MeshBasicMaterial' && b.withMap), JSON.stringify(r.bridges)); assert.deepEqual(r.bridges.map((b) => [b.role, b.renderOrder]).sort(), [['foldBridgeBottom', 32], ['foldBridgeTop', 33]]);
  assert.deepEqual(H.browser.errors, []);
});
test('Arte · baseline y panel son idénticos', () => { const strip = (o) => ({ ...o, carga: undefined, stats: undefined }); assert.deepEqual(strip(arts.fix), strip(arts.base)); });

// ───────────────────────── Exportación GLB ─────────────────────────
const poseCases = [['plano_sin_arte', 0, false], ['plegado60_sin_arte', 60, false], ['plano_con_arte', 0, true], ['plegado60_con_arte', 60, true]];
const glbResults = {};
for (const t of ['base', 'fix']) for (const fx of ['caja', 'ill']) test(`GLB · ${names[t]} (${fx}): estructura, materiales, unidades (mm) y normales (KI-02/KI-03)`, async () => {
  await load(`${t}-${fx}`); await evalIn(CAPTURE); await evalIn(`T.build()`); const res = glbResults[`${t}-${fx}`] = {};
  let artLoaded = false;
  for (const [name, deg, withArt] of poseCases) {
    if (withArt && !artLoaded) { await evalIn(`harnessLoadArt()`); artLoaded = true; } await evalIn(`T.setAll(${deg})`);
    const b64 = await evalIn(`captureGLB()`); assert.ok(b64 && b64.length > 100, 'sin GLB: ' + name); const buf = Buffer.from(b64, 'base64'); const s = summarize(parseGLB(buf));
    res[name] = { bytes: buf.length, sha: (await import('node:crypto')).createHash('sha256').update(buf).digest('hex').slice(0, 16), ...s };
  }
  save(`glb-${names[t]}-${fx}`, res);
  for (const [name, , withArt] of poseCases) { const s = res[name];
    assert.equal(s.generator, 'Tesseract Phase 7B'); assert.deepEqual(s.extensionsUsed, []); assert.equal(s.nodes, s.meshes); assert.equal(s.images, withArt ? 2 : 0); assert.equal(s.textures, withArt ? 2 : 0);
    assert.ok(Math.max(...s.bbox.size) > 100, 'unidades: debería estar en mm (≥100 unidades) — KI-03'); assert.ok(s.materialSummary.every((m) => m.metallic === 0 && m.roughness === 1 && m.doubleSided), 'KI-03: metallic 0, roughness 1, doubleSided');
    assert.ok(s.materialSummary.filter((m) => m.texture).every((m) => m.alphaMode === 'BLEND'), 'arte con alphaMode BLEND'); }
  assert.deepEqual(H.browser.errors, []);
});
test('GLB · baseline y panel producen GLB idénticos byte a byte (caja e ill)', () => { for (const fx of ['caja', 'ill']) for (const [name] of poseCases) assert.equal(glbResults[`fix-${fx}`][name].sha, glbResults[`base-${fx}`][name].sha, `${fx}/${name}`); });
test('GLB · estructura coincide con el golden del baseline (o se regenera con UPDATE_GOLDEN=1)', () => {
  const pick = (s) => { const { bytes, sha, ...rest } = s; return rest; };
  const cur = JSON.parse(JSON.stringify(Object.fromEntries(['caja', 'ill'].map((fx) => [fx, Object.fromEntries(poseCases.map(([n]) => [n, pick(glbResults[`base-${fx}`][n])]))])))); // JSON: normaliza -0
  if (UPDATE) { fs.writeFileSync(GOLD, JSON.stringify({ _fuente: 'reference/legacy-baseline vía Chrome headless (estructura; los hashes dependen de la versión de Chrome)', ...cur }, null, 1)); return; }
  const { _fuente, ...g } = goldenGlb; assert.deepEqual(cur, g);
});
test('GLB · KI-02: registrar normales de longitud 0 en los GLB generados por el arnés (informativo; el defecto real está en el GLB de evidencia)', () => {
  const z = Object.fromEntries(Object.entries(glbResults).map(([k, v]) => [k, Object.fromEntries(Object.entries(v).map(([n, s]) => [n, s.normals.zeroLength]))])); save('glb-ki02-normales', z); assert.ok(z); });

// ───────────────────────── Interacciones ─────────────────────────
const INTERACT = `(async () => { const { sleep, raf2, $, panelMeshes, build } = T; await build(); const D = __dbg; const out = {}; const ov = $('three-overlay');
  const proj = (v) => { const p = v.clone().project(D.camera); const r = $('preview-3d').getBoundingClientRect(); return { x: r.left + (p.x + 1) / 2 * r.width, y: r.top + (1 - p.y) / 2 * r.height }; };
  const mouse = (type, x, y, o) => ov.dispatchEvent(new MouseEvent(type, Object.assign({ bubbles: true, cancelable: true, clientX: x, clientY: y, button: 0, buttons: 1 }, o || {})));
  const click = async (x, y, o) => { mouse('mousedown', x, y, o); mouse('mouseup', x, y, o); await sleep(120); await raf2(); };
  D.scene.updateMatrixWorld(true);
  const target = panelMeshes().filter((m) => m.userData.panelIndex !== D.baseIndex).sort((a, b) => b.geometry.boundingBox?.getSize?.(new THREE.Vector3()).x - a.geometry.boundingBox?.getSize?.(new THREE.Vector3()).x)[0];
  target.geometry.computeBoundingBox(); const c = target.geometry.boundingBox.getCenter(new THREE.Vector3()); c.z = target.geometry.boundingBox.max.z; target.localToWorld(c); const p = proj(c);
  out.baseAntes = D.baseIndex; await click(p.x, p.y, { shiftKey: true }); out.shiftClick = { esperado: target.userData.panelIndex, base: D.baseIndex, select: document.querySelector('#fold-panel select').value, status: $('status-area').textContent };
  out.clickSinModificador = await (async () => { const b = D.baseIndex; const q = proj((() => { const m = panelMeshes()[0]; m.geometry.computeBoundingBox(); const v = m.geometry.boundingBox.getCenter(new THREE.Vector3()); return m.localToWorld(v); })()); await click(q.x, q.y); return { baseIgual: D.baseIndex === b }; })();
  const cv = D.creaseVisuals[0]; const g = cv.visible.geometry.attributes.position; const a = new THREE.Vector3(g.getX(0), g.getY(0), g.getZ(0)), b = new THREE.Vector3(g.getX(1), g.getY(1), g.getZ(1)); cv.visible.localToWorld(a); cv.visible.localToWorld(b);
  const mid = proj(a.add(b).multiplyScalar(0.5)); await click(mid.x, mid.y, { altKey: true });
  out.altClick = { esperado: cv.edgeIdx, seleccionada: D.selectedEdge, status: $('status-area').textContent, tabCreases: $('tab-creases').classList.contains('active') };
  const o0 = { theta: D.orbit.spherical.theta, phi: D.orbit.spherical.phi, r: D.orbit.spherical.radius, t: D.orbit.target.toArray() }; const cx = 400, cy = 300;
  mouse('mousedown', cx, cy); mouse('mousemove', cx + 40, cy + 20); mouse('mouseup', cx + 40, cy + 20); out.orbita = { dTheta: +(D.orbit.spherical.theta - o0.theta).toFixed(4), dPhi: +(D.orbit.spherical.phi - o0.phi).toFixed(4) };
  mouse('mousedown', cx, cy, { button: 2, buttons: 2 }); mouse('mousemove', cx + 30, cy + 10, { button: 2, buttons: 2 }); mouse('mouseup', cx + 30, cy + 10, { button: 2, buttons: 2 }); out.pan = { moved: D.orbit.target.toArray().some((v, i) => Math.abs(v - o0.t[i]) > 1e-6) };
  const r1 = D.orbit.spherical.radius; ov.dispatchEvent(new WheelEvent('wheel', { bubbles: true, cancelable: true, deltaY: 100 })); const r2 = D.orbit.spherical.radius; ov.dispatchEvent(new WheelEvent('wheel', { bubbles: true, cancelable: true, deltaY: -100 })); out.zoom = { alejar: +(r2 / r1).toFixed(4), acercar: +(D.orbit.spherical.radius / r2).toFixed(4) };
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); out.escape = $('status-area').textContent;
  return out; })()`;
const inter = {};
for (const t of ['base', 'fix']) test(`Interacciones · ${names[t]}: Shift+clic (base), Alt+clic (crease), órbita, pan, zoom y Esc`, async () => {
  await load(t + '-caja'); const r = inter[t] = await evalIn(INTERACT); save('interacciones-' + names[t], r);
  assert.equal(r.shiftClick.base, r.shiftClick.esperado); assert.equal(r.shiftClick.select, String(r.shiftClick.esperado)); assert.match(r.shiftClick.status, new RegExp(`^Base set to P${r.shiftClick.esperado}\\b`));
  assert.equal(r.clickSinModificador.baseIgual, true, 'un clic sin Shift no debe cambiar la base');
  assert.equal(r.altClick.seleccionada, r.altClick.esperado); assert.match(r.altClick.status, new RegExp(`^Crease C${r.altClick.esperado} selected`)); assert.equal(r.altClick.tabCreases, true);
  assert.ok(Math.abs(r.orbita.dTheta + 0.24) < 1e-3 && Math.abs(r.orbita.dPhi + 0.12) < 1e-3, JSON.stringify(r.orbita)); assert.equal(r.pan.moved, true);
  assert.deepEqual(r.zoom, { alejar: 1.08, acercar: 0.92 }); assert.equal(r.escape, 'Crease selection mode enabled'); assert.deepEqual(H.browser.errors, []);
});
test('Interacciones · baseline y panel son idénticos', () => { assert.deepEqual(inter.fix, inter.base); });

// ───────────────────────── Métricas base ─────────────────────────
const metrics = {};
for (const t of ['base', 'fix']) test(`Métricas · ${names[t]}: construcción, FPS, plegado, recursos y exportación (informativo)`, async () => {
  await load(t + '-caja'); const info = await evalIn(`(() => { const c = document.createElement('canvas'); const gl = c.getContext('webgl2'); const e = gl.getExtension('WEBGL_debug_renderer_info'); return { ua: navigator.userAgent, gpu: gl.getParameter(e.UNMASKED_RENDERER_WEBGL), dpr: devicePixelRatio, w: innerWidth, h: innerHeight }; })()`);
  await evalIn(`(() => { const o = window.__adobe_cep__.evalScript; window.__adobe_cep__.evalScript = (s, cb) => (s.indexOf('saveDialog') > -1 ? setTimeout(() => cb(''), 0) : o(s, cb)); })()`);
  const m = await evalIn(`tesseractBaseline({ skipGlb: false, sliderTicks: 100, orbitMs: 2000, idleMs: 2000 })`); metrics[t] = { entorno: info, ...m }; save('metricas-' + names[t], metrics[t]);
  assert.ok(m.fps_reposo.fps > 5 && m.plegado.mediana_ms < 100, JSON.stringify([m.fps_reposo, m.plegado]));
});
test('Métricas · el crecimiento por 100 ticks: baseline > 1000 texturas+buffers, panel = 0', () => {
  const g = (t) => metrics[t].crecimiento_por_100_ticks; assert.ok(g('base').buffers > 1000 && g('base').texturas > 500, JSON.stringify(g('base'))); assert.deepEqual([g('fix').texturas, g('fix').buffers, g('fix').vaos], [0, 0, 0], JSON.stringify(g('fix')));
});
