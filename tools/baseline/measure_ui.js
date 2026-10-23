/*
 * Sondas de rendimiento "desde afuera" para el panel Tesseract (plugin actual, sin modificarlo).
 *
 * Uso en el panel CEP real: abrir DevTools del panel (ver docs/fase0/05_BASELINE_RENDIMIENTO.md, §6),
 * pegar este archivo en la consola y ejecutar:
 *     await tesseractBaseline({ skipGlb: true })
 *
 * Solo usa la interfaz pública del panel (clics en botones, eventos de ratón sobre #three-overlay,
 * eventos 'input' de los sliders) y contadores de recursos WebGL sobre el contexto del canvas.
 * No necesita ningún gancho dentro de main.js.
 */
window.tesseractBaseline = async function tesseractBaseline(opts) {
  const o = Object.assign({ orbitMs: 3000, idleMs: 3000, sliderTicks: 100, skipGlb: true, glbTimeoutMs: 60000 }, opts || {});
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const raf = () => new Promise((r) => requestAnimationFrame(r));
  const heapMB = () => (performance.memory ? +(performance.memory.usedJSHeapSize / 1048576).toFixed(1) : null);
  const $ = (id) => document.getElementById(id);
  const status = () => ($('status-area') || {}).textContent || '';
  const out = { fecha: new Date().toISOString(), ua: navigator.userAgent, dpr: devicePixelRatio, viewport: innerWidth + 'x' + innerHeight };

  // --- Extracción y paso a 3D (si todavía estamos en la vista de importación) -------------------
  // Ojo: no pedir el contexto WebGL antes de que el panel cree su renderer; un getContext previo
  // fijaría atributos distintos a los del plugin.
  async function untilStatus(re, ms) {
    const t0 = performance.now();
    while (!re.test(status())) { if (performance.now() - t0 > ms) return null; await sleep(5); }
    return +(performance.now() - t0).toFixed(1);
  }
  const importVisible = $('import-view') && $('import-view').style.display !== 'none';
  if (importVisible) {
    $('extract-btn').click();
    out.extraccion_ms = await untilStatus(/Extraction complete|Error|error/, 120000);
    const t0 = performance.now();
    $('continue-3d-btn').click();
    out.continuar_a_3d_sincrono_ms = +(performance.now() - t0).toFixed(1);
    out.continuar_a_3d_hasta_listo_ms = await untilStatus(/3D ready|3D error/, 120000);
    await sleep(500);
  }
  out.estado = status();

  // --- Contadores de recursos WebGL (vivos = creados - borrados desde este punto) ----------------
  const canvas = $('preview-3d');
  const gl = canvas.getContext('webgl2') || canvas.getContext('webgl'); // devuelve el contexto que ya creó el panel
  if (!gl) throw new Error('No hay contexto WebGL en #preview-3d (¿ya se entró a la vista 3D?)');
  if (!gl.__tess) {
    const c = (gl.__tess = { tex: 0, buf: 0, vao: 0, prog: 0 });
    const wrap = (create, del, key) => {
      if (!gl[create] || !gl[del]) return;
      const oc = gl[create].bind(gl), od = gl[del].bind(gl);
      gl[create] = function () { c[key]++; return oc.apply(null, arguments); };
      gl[del] = function (x) { if (x) c[key]--; return od(x); };
    };
    wrap('createTexture', 'deleteTexture', 'tex');
    wrap('createBuffer', 'deleteBuffer', 'buf');
    wrap('createVertexArray', 'deleteVertexArray', 'vao');
    wrap('createProgram', 'deleteProgram', 'prog');
  }
  const live = () => ({ texturas: gl.__tess.tex, buffers: gl.__tess.buf, vaos: gl.__tess.vao, programas: gl.__tess.prog });
  const ext = gl.getExtension('WEBGL_debug_renderer_info');
  out.gpu = ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : 'n/a';
  out.recursos_inicio = live();
  out.heap_inicio_MB = heapMB();

  // --- FPS en reposo y orbitando (eventos de ratón reales sobre la capa de interacción) ----------
  async function fps(ms, perFrame) {
    let n = 0, worst = 0, last = performance.now(); const t0 = last;
    await new Promise((res) => { (function f(t) { n++; const dt = t - last; if (dt > worst) worst = dt; last = t; if (perFrame) perFrame(n); (t - t0 < ms) ? requestAnimationFrame(f) : res(); })(last); });
    return { fps: +(n / ((last - t0) / 1000)).toFixed(1), peor_frame_ms: +worst.toFixed(1) };
  }
  out.fps_reposo = await fps(o.idleMs);
  const ov = $('three-overlay');
  const ev = (type, x, y) => ov.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, clientX: x, clientY: y, button: 0, buttons: 1 }));
  const r = ov.getBoundingClientRect(); let x = r.left + r.width / 2, y = r.top + r.height / 2;
  ev('mousedown', x, y);
  out.fps_orbita = await fps(o.orbitMs, (i) => { x += 3 * Math.cos(i / 20); y += 1.5 * Math.sin(i / 20); ev('mousemove', x, y); });
  ev('mouseup', x, y);

  // --- Plegado: sliders reales, costo por tick y crecimiento de recursos --------------------------
  const slider = document.querySelector('#fold-panel input[type=range]');
  if (slider) {
    const before = live(), heap0 = heapMB(), times = [];
    for (let i = 0; i < o.sliderTicks; i++) {
      slider.value = String(i % 91);
      const t0 = performance.now();
      slider.dispatchEvent(new Event('input', { bubbles: true }));
      times.push(performance.now() - t0);
      await raf();
    }
    times.sort((a, b) => a - b);
    const q = (p) => +times[Math.min(times.length - 1, Math.floor(p * times.length))].toFixed(2);
    out.plegado = { ticks: o.sliderTicks, mediana_ms: q(0.5), p95_ms: q(0.95), max_ms: q(1) };
    const after = live();
    out.crecimiento_por_100_ticks = {
      texturas: Math.round(((after.texturas - before.texturas) / o.sliderTicks) * 100),
      buffers: Math.round(((after.buffers - before.buffers) / o.sliderTicks) * 100),
      vaos: Math.round(((after.vaos - before.vaos) / o.sliderTicks) * 100),
      heap_MB: +(heapMB() - heap0).toFixed(1),
    };
    out.recursos_fin = after;
  } else out.plegado = 'sin slider (¿vista 3D sin paneles plegables?)';

  // --- Exportación GLB (en CEP real abre un diálogo de guardado: omitir con skipGlb) ----------------
  if (!o.skipGlb && $('export-glb-btn')) {
    const t0 = performance.now();
    $('export-glb-btn').click();
    const done = await untilStatus(/GLB exported|GLB export failed|cancelled/, o.glbTimeoutMs);
    out.glb_export_ms = done === null ? 'timeout' : +(performance.now() - t0).toFixed(0);
    out.glb_estado = status();
  }
  out.heap_fin_MB = heapMB();
  return out;
};
