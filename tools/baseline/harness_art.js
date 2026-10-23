/*
 * SOLO PARA EL ARNÉS DE NAVEGADOR (ver setup_harness.py). No se usa en Illustrator.
 * Simula "Refresh Artwork": crea dos PNG de 4096 px de lado largo (como los que exporta
 * buildArtworkExportScript) y los entrega por el puente simulado, con la misma ruta de código
 * del plugin (evalScript -> loadTextureFromPath -> overlays).
 */
window.harnessLoadArt = async function () {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const F = window.__FIXTURE__;
  const pts = [F.outerBoundary, ...F.creases].flatMap((p) => p.points.map((q) => q.anchor));
  const minx = Math.min(...pts.map((p) => p.x)) - 10, maxx = Math.max(...pts.map((p) => p.x)) + 10;
  const miny = Math.min(...pts.map((p) => p.y)) - 10, maxy = Math.max(...pts.map((p) => p.y)) + 10;
  const W = maxx - minx, H = maxy - miny, scale = 4096 / Math.max(W, H);
  const pw = Math.round(W * scale), ph = Math.round(H * scale);
  async function makeArt(label, hue) {
    const c = document.createElement('canvas'); c.width = pw; c.height = ph;
    const x = c.getContext('2d'); const g = x.createLinearGradient(0, 0, pw, ph);
    g.addColorStop(0, `hsl(${hue},70%,60%)`); g.addColorStop(1, `hsl(${hue + 80},70%,40%)`);
    x.fillStyle = g; x.fillRect(0, 0, pw, ph); x.fillStyle = '#fff'; // solo formas geométricas (sin texto): el texto del canvas varía entre cargas por la caché de fuentes y hacía el PNG no determinista
    for (let i = 0; i < 8; i++) { x.fillRect(100 + i * 40, 300 + i * 400, 900 + (label === 'FRONT' ? 0 : 300), 160); x.beginPath(); x.arc(pw - 400, 300 + i * 400, 90, 0, Math.PI * 2); x.fill(); }
    const b = await new Promise((res) => c.toBlob(res, 'image/png'));
    return { url: URL.createObjectURL(b), bytes: b.size };
  }
  const front = await makeArt('FRONT', 20), back = await makeArt('BACK', 200);
  const rect = { left: minx, top: maxy, right: maxx, bottom: miny, width: W, height: H };
  const orig = window.__adobe_cep__.evalScript;
  window.__adobe_cep__.evalScript = (s, cb) => {
    if (s.indexOf('tesseract_art') > -1) {
      setTimeout(() => cb(JSON.stringify({ ok: true, mode: 'artboards', front: { path: front.url, rect, label: 'front' }, back: { path: back.url, rect, label: 'back' }, available: { artboards: [], layers: [] } })), 0);
    } else if (s.indexOf('saveDialog') > -1) { setTimeout(() => cb(''), 0); } // el diálogo "guardar GLB" responde "cancelado"
    else orig(s, cb);
  };
  const t0 = performance.now();
  document.getElementById('refresh-art-btn').click();
  for (let i = 0; i < 200; i++) { await sleep(50); if (/Artwork loaded|failed/.test(document.getElementById('art-status').textContent)) break; }
  return { px: pw + 'x' + ph, png_front_MB: +(front.bytes / 1048576).toFixed(2), png_back_MB: +(back.bytes / 1048576).toFixed(2), carga_ms: +(performance.now() - t0).toFixed(0), estado: document.getElementById('art-status').textContent };
};
