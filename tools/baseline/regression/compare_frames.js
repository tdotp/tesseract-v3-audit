/*
 * Regresión visual y de exportación entre dos copias del panel servidas por el mismo origen (arnés de navegador):
 *   A = reference/legacy-baseline (intacto)  ·  B = panel/ (copia de trabajo con el cambio a validar)
 * Maneja ambos paneles con la misma secuencia de acciones y compara:
 *   - píxeles del canvas 3D en 4 poses (plano; plegado ALL=90°; otra base; con arte)
 *   - estructura de escena (mallas, líneas, sprites, grupos, triángulos, llamadas de dibujo)
 *   - bytes del GLB exportado (sin y con arte) vía un cep.fs.writeFile simulado
 * Uso (en compare.html):  await tesseractCompareFrames()
 */
window.tesseractCompareFrames = async function () {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const frames = { A: document.getElementById('A').contentWindow, B: document.getElementById('B').contentWindow };
  const raf2 = (w) => new Promise((r) => w.requestAnimationFrame(() => w.requestAnimationFrame(r)));
  const $ = (w, id) => w.document.getElementById(id);
  const out = { poses: {}, escena: {}, glb: {} };
  async function load(w, src) { (0, w.eval)(await fetch(src).then((r) => r.text())); }
  for (const w of Object.values(frames)) { await load(w, 'harness_art.js'); }

  function pixels(w) {
    const c = $(w, 'preview-3d'); const t = document.createElement('canvas'); t.width = c.width; t.height = c.height;
    const x = t.getContext('2d'); x.drawImage(c, 0, 0); return { d: x.getImageData(0, 0, t.width, t.height).data, w: t.width, h: t.height };
  }
  function diffPixels(a, b) {
    if (a.w !== b.w || a.h !== b.h) return { error: `tamaños distintos ${a.w}x${a.h} vs ${b.w}x${b.h}` };
    let n = 0, max = 0; for (let i = 0; i < a.d.length; i += 4) { const m = Math.max(Math.abs(a.d[i] - b.d[i]), Math.abs(a.d[i + 1] - b.d[i + 1]), Math.abs(a.d[i + 2] - b.d[i + 2])); if (m) { n++; if (m > max) max = m; } }
    return { px: a.w * a.h, distintos: n, maxCanal: max, tam: a.w + 'x' + a.h };
  }
  function stats(w) {
    const s = w.__dbg.scene, r = w.__dbg.renderer; const c = { Mesh: 0, Line: 0, LineSegments: 0, Sprite: 0, Group: 0, otros: 0 };
    s.traverse((o) => { if (o.isSprite) c.Sprite++; else if (o.isLineSegments) c.LineSegments++; else if (o.isLine) c.Line++; else if (o.isMesh) c.Mesh++; else if (o.isGroup || o.type === 'Group') c.Group++; else c.otros++; });
    return { ...c, drawCalls: r.info.render.calls, triangulos: r.info.render.triangles, paneles: w.__dbg.panels, aristasPliegue: w.__dbg.nFold };
  }
  async function pose(name) {
    await sleep(120); for (const w of Object.values(frames)) await raf2(w);
    out.poses[name] = diffPixels(pixels(frames.A), pixels(frames.B)); out.escena[name] = { A: stats(frames.A), B: stats(frames.B) };
    out.escena[name].iguales = JSON.stringify(out.escena[name].A) === JSON.stringify(out.escena[name].B);
  }
  const each = async (fn) => { for (const w of Object.values(frames)) await fn(w); };
  async function exportGlb(label) {
    const res = {};
    for (const [k, w] of Object.entries(frames)) {
      w.__glb = null; w.cep = { fs: { writeFile: (p, b64) => { w.__glb = b64; return { err: 0 }; } }, encoding: { Base64: 'Base64' } };
      const prev = w.__adobe_cep__.evalScript; w.__adobe_cep__.evalScript = (s, cb) => (s.indexOf('saveDialog') > -1 ? w.setTimeout(() => cb('/tmp/test.glb'), 0) : prev(s, cb));
      const t0 = performance.now(); $(w, 'export-glb-btn').click();
      for (let i = 0; i < 100 && !w.__glb; i++) await sleep(50);
      const b64 = w.__glb || ''; const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
      const h = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))).map((x) => x.toString(16).padStart(2, '0')).join('');
      res[k] = { bytes: bytes.length, sha256: h.slice(0, 16), ms: +(performance.now() - t0).toFixed(0) };
      w.__adobe_cep__.evalScript = prev;
    }
    res.identicos = res.A.sha256 === res.B.sha256 && res.A.bytes === res.B.bytes; out.glb[label] = res;
  }

  await each(async (w) => { $(w, 'extract-btn').click(); await sleep(250); $(w, 'continue-3d-btn').click(); });
  await sleep(700);
  out.paneles = { A: frames.A.__dbg.panels, B: frames.B.__dbg.panels };
  await pose('1_plano');
  await each(async (w) => { const d = w.document.querySelector('#fold-panel details.all-creases input[type=range]'); d.value = '90'; d.dispatchEvent(new Event('input', { bubbles: true })); });
  await pose('2_plegado_ALL_90');
  await each(async (w) => { const s = w.document.querySelector('#fold-panel select'); const other = [...s.options].find((o) => o.value !== s.value).value; s.value = other; s.dispatchEvent(new Event('change', { bubbles: true })); });
  await pose('3_otra_base');
  await exportGlb('sin_arte_pose3');
  for (const w of Object.values(frames)) { await w.harnessLoadArt(); }
  await sleep(400);
  await pose('4_con_arte');
  await exportGlb('con_arte_pose3');
  out.resumen = {
    poses_identicas: Object.values(out.poses).every((p) => p.distintos === 0),
    escena_identica: Object.values(out.escena).every((e) => e.iguales),
    glb_identico: Object.values(out.glb).every((g) => g.identicos),
  };
  return out;
};
