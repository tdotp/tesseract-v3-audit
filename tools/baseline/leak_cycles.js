/*
 * Prueba de ciclos repetidos de plegado: demuestra si los recursos de GPU crecen de forma acumulativa.
 * Solo usa la interfaz pública del panel (sliders, botones, selects) y contadores sobre el contexto WebGL
 * (createTexture/deleteTexture, createBuffer/deleteBuffer, createVertexArray/deleteVertexArray, createProgram/deleteProgram).
 *
 * Uso (consola del panel o arnés): await tesseractLeakCycles({ cycles: 6 })
 * Cada ciclo ejecuta: slider de crease 0→90→0, slider ALL 0→90→0, Reset Flat, cambio de panel base (ida y vuelta),
 * espesor 0.25→0.5→0.25 (reconstrucción), preset de material white→kraft→white (reconstrucción),
 * Back + Continue to 3D (reconstrucción completa) y, si withArt, Refresh Artwork.
 * Veredicto: tras el ciclo de calentamiento (el 1.º), los contadores deben quedar planos (Δ = 0).
 */
window.tesseractLeakCycles = async function tesseractLeakCycles(opts) {
  const o = Object.assign({ cycles: 6, step: 3, withArt: false, tolerance: { tex: 0, buf: 0, vao: 0, prog: 0 } }, opts || {});
  const $ = (id) => document.getElementById(id);
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const raf = () => new Promise((r) => requestAnimationFrame(r));
  const heapMB = () => (performance.memory ? +(performance.memory.usedJSHeapSize / 1048576).toFixed(1) : null);
  const fire = (el, type) => el.dispatchEvent(new Event(type, { bubbles: true }));

  // Llegar a la vista 3D si hace falta (antes de pedir el contexto WebGL)
  if ($('import-view').style.display !== 'none') {
    $('extract-btn').click(); await sleep(250);
    $('continue-3d-btn').click(); await sleep(600);
  }
  const canvas = $('preview-3d');
  const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
  if (!gl.__tess) {
    const c = (gl.__tess = { tex: 0, buf: 0, vao: 0, prog: 0 });
    const wrap = (create, del, key) => {
      if (!gl[create] || !gl[del]) return;
      const oc = gl[create].bind(gl), od = gl[del].bind(gl);
      gl[create] = function () { c[key]++; return oc.apply(null, arguments); };
      gl[del] = function (x) { if (x) c[key]--; return od(x); };
    };
    wrap('createTexture', 'deleteTexture', 'tex'); wrap('createBuffer', 'deleteBuffer', 'buf');
    wrap('createVertexArray', 'deleteVertexArray', 'vao'); wrap('createProgram', 'deleteProgram', 'prog');
  }
  const snap = () => ({ tex: gl.__tess.tex, buf: gl.__tess.buf, vao: gl.__tess.vao, prog: gl.__tess.prog, heapMB: heapMB() });

  async function sweep(slider, max, step) { // 0 → max → 0
    for (let a = 0; a <= max; a += step) { slider.value = String(a); fire(slider, 'input'); await raf(); }
    for (let a = max; a >= 0; a -= step) { slider.value = String(a); fire(slider, 'input'); await raf(); }
  }
  async function oneCycle() {
    const fold = $('fold-panel');
    const sliders = fold.querySelectorAll('input[type=range]');
    const selected = sliders[0];            // "Selected crease"
    const all = fold.querySelector('details.all-creases input[type=range]'); // "ALL creases"
    let ticks = 0;
    await sweep(selected, 90, o.step); ticks += 2 * (90 / o.step + 1);
    if (all) { await sweep(all, 90, o.step * 2); ticks += 2 * (90 / (o.step * 2) + 1); }
    const reset = [...fold.querySelectorAll('button')].find((b) => /Reset Flat/.test(b.textContent)); if (reset) { reset.click(); await raf(); }
    const baseSel = fold.querySelector('select');
    if (baseSel && baseSel.options.length > 1) {
      const orig = baseSel.value, other = [...baseSel.options].find((x) => x.value !== orig).value;
      baseSel.value = other; fire(baseSel, 'change'); await sleep(60); await raf();
      const sel2 = $('fold-panel').querySelector('select'); sel2.value = orig; fire(sel2, 'change'); await sleep(60); await raf();
    }
    const th = $('thickness-input');
    th.value = '0.5'; $('apply-thickness-btn').click(); await sleep(60); await raf();
    th.value = '0.25'; $('apply-thickness-btn').click(); await sleep(60); await raf();
    const mp = $('material-preset');
    mp.value = 'kraft'; fire(mp, 'change'); await sleep(60); await raf();
    mp.value = 'white'; fire(mp, 'change'); await sleep(60); await raf();
    $('back-btn').click(); await sleep(30);
    $('continue-3d-btn').click(); await sleep(250); await raf();
    if (o.withArt && $('refresh-art-btn')) { $('refresh-art-btn').click(); await sleep(400); await raf(); }
    await sleep(100); await raf(); await raf();
    return ticks;
  }

  const rows = []; const t0 = performance.now();
  rows.push({ ciclo: 0, ...snap(), eventos_slider: 0 });
  for (let i = 1; i <= o.cycles; i++) { const ev = await oneCycle(); rows.push({ ciclo: i, ...snap(), eventos_slider: ev }); }
  const deltas = rows.slice(1).map((r, i) => ({ ciclo: r.ciclo, dTex: r.tex - rows[i].tex, dBuf: r.buf - rows[i].buf, dVao: r.vao - rows[i].vao, dProg: r.prog - rows[i].prog, dHeapMB: r.heapMB === null ? null : +(r.heapMB - rows[i].heapMB).toFixed(1) }));
  const steady = deltas.slice(1); // se descarta el ciclo 1 (calentamiento)
  const worst = { tex: Math.max(...steady.map((d) => d.dTex)), buf: Math.max(...steady.map((d) => d.dBuf)), vao: Math.max(...steady.map((d) => d.dVao)), prog: Math.max(...steady.map((d) => d.dProg)) };
  const pass = worst.tex <= o.tolerance.tex && worst.buf <= o.tolerance.buf && worst.vao <= o.tolerance.vao && worst.prog <= o.tolerance.prog;
  return { fecha: new Date().toISOString(), ciclos: o.cycles, conArte: o.withArt, duracion_s: +((performance.now() - t0) / 1000).toFixed(1), filas: rows, deltas_por_ciclo: deltas, peor_delta_ciclos_2_en_adelante: worst, tolerancia: o.tolerance, veredicto: pass ? 'SIN CRECIMIENTO ACUMULATIVO' : 'CRECE' };
};
