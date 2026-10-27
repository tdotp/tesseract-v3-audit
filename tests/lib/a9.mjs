// A9 — Utilidades de la caracterización de interfaz y orquestación (docs/fase1/A9_PROPUESTA.md §8.1, docs/fase1/A9_HANDOFF.md §3).
//  · INIT: script que se inyecta ANTES de cualquier script de la página (Page.addScriptToEvaluateOnNewDocument). Envuelve EventTarget.prototype.addEventListener /
//    removeEventListener (inventario de escuchas H1), instala en DOMContentLoaded —antes que main.js, porque se registra primero— los ganchos del historial (H2) y
//    permite simular «CEP ausente» (?nocep) y un elemento requerido ausente (?mismatch=<id>, guarda «UI mismatch»). Solo observa: no cambia el comportamiento.
//  · PAGE: ayudantes dentro de la página (window.A9): flujos, serialización determinista del DOM dinámico (H4), hash de píxeles del lienzo 2D, selección por
//    Shift/Alt+clic con eventos sintéticos (como «Interacciones») y lectura del inventario de escuchas.
import { execFileSync } from 'node:child_process'; import { ROOT } from './fixtures.mjs';

export const A9_REF = '3ea0d8a'; // A8 validada en CEP real: referencia de texto, de bundle y de rendimiento de A9
export const refMain = () => execFileSync('git', ['-C', ROOT, 'show', `${A9_REF}:src/main.js`], { encoding: 'utf8' });
// Las 15 escuchas de primer nivel de main.js (D-A9-6), en el ORDEN de registro de hoy. Las de los botones de modo no se registran: #mode-fold-btn y #mode-base-btn no existen en index.html.
// Las pestañas son UNA escucha de código registrada en 4 botones.
export const UI_LISTENERS = ['#test-btn click -', '#extract-btn click -', '#preview-btn click -', '#continue-3d-btn click -', '#apply-thickness-btn click -', '#back-btn click -', '#export-3d-btn click -',
  '#export-glb-btn click -', '#material-preset change -', '#refresh-art-btn click -', '#tab-btn-material click -', '#tab-btn-artwork click -', '#tab-btn-creases click -', '#tab-btn-debug click -',
  'document keydown -', '#debug-toggle change -'];

export const INIT = `(() => {
  const Q = new URLSearchParams(location.search);
  if (Q.has('nocep')) Object.defineProperty(window, '__adobe_cep__', { configurable: true, get() { return undefined; }, set() {} }); // el shim no puede instalar el puente
  const ET = EventTarget.prototype, add = ET.addEventListener, rem = ET.removeEventListener; const capOf = (o) => (typeof o === 'boolean' ? o : !!(o && o.capture));
  const L = (window.__A9L = { seq: [], live: [] }); // seq: todos los registros y retiradas, en orden · live: escuchas activas (registradas y no retiradas), en orden de registro
  ET.addEventListener = function (type, fn, o) {
    const cap = capOf(o); const dup = !!fn && L.live.some((x) => x.t === this && x.type === type && x.fn === fn && x.cap === cap); // el DOM ignora un duplicado exacto; se anota igual
    const r = { t: this, type: String(type), fn, cap, opts: o === undefined ? '-' : JSON.stringify(o), dup }; L.seq.push(r); if (!dup && fn) L.live.push(r);
    return add.call(this, type, fn, o);
  };
  ET.removeEventListener = function (type, fn, o) {
    const cap = capOf(o); const i = L.live.findIndex((x) => x.t === this && x.type === type && x.fn === fn && x.cap === cap);
    L.seq.push({ t: this, type: String(type), removal: true, hit: i >= 0 }); if (i >= 0) L.live.splice(i, 1); return rem.call(this, type, fn, o);
  };
  const T = (window.__A9T = []); // historial (H2): una sola línea de tiempo con cada asignación observada, en orden
  const hook = (el, proto, prop, label) => { let p = proto, d; while (p && !(d = Object.getOwnPropertyDescriptor(p, prop))) p = Object.getPrototypeOf(p); if (!d || !d.set) throw new Error('A9: sin descriptor ' + prop);
    Object.defineProperty(el, prop, { configurable: true, get() { return d.get.call(this); }, set(v) { T.push(label + ' ' + String(v)); d.set.call(this, v); } }); };
  const install = () => {
    const miss = Q.get('mismatch'); if (miss) { const e = document.getElementById(miss); if (e) e.remove(); } // antes que main.js: la guarda «UI mismatch» lo verá ausente
    const $ = (id) => document.getElementById(id);
    for (const id of ['status-area', 'art-status', 'art-source-pill', 'validation-status', 'interaction-status', 'interaction-mode-pill', 'viewport-badge', 'material-pill']) { const e = $(id); if (e) hook(e, Node.prototype, 'textContent', '#' + id); }
    if ($('validation-status')) hook($('validation-status'), Element.prototype, 'className', '#validation-status.class');
    for (const id of ['error-msg', 'import-view', 'three-view', 'output-json', 'preview-canvas']) { const e = $(id); if (!e) continue; // en Chrome las propiedades CSS son datos propios de cada CSSStyleDeclaration: se sustituye la de esta instancia por un accesor equivalente
      Object.defineProperty(e.style, 'display', { configurable: true, get() { return this.getPropertyValue('display'); }, set(v) { T.push('#' + id + '.display ' + String(v)); this.setProperty('display', String(v)); } }); }
    for (const id of ['test-btn', 'extract-btn', 'preview-btn', 'continue-3d-btn', 'back-btn', 'export-3d-btn', 'export-glb-btn']) { const e = $(id); if (e) hook(e, HTMLButtonElement.prototype, 'disabled', '#' + id + '.disabled'); }
    T.push('— DOMContentLoaded');
  };
  add.call(document, 'DOMContentLoaded', install); // registrada antes que la de main.js: se ejecuta primero
})()`;

export const PAGE = `(() => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms)); const raf2 = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  const $ = (id) => document.getElementById(id); const fire = (el, t) => el.dispatchEvent(new Event(t, { bubbles: true }));
  const waitFor = async (pred, what, ms = 20000) => { for (let i = 0; i < ms / 20; i++) { if (pred()) return; await sleep(20); }
    throw new Error('A9: condición no alcanzada: ' + what + ' · estado: ' + ($('status-area') || {}).textContent + ' · arte: ' + ($('art-status') || {}).textContent); };
  const settle = async () => { await raf2(); await sleep(30); };
  const ART_FINAL = /^(No Front|Artwork|Build 3D)/;
  const extract = async () => { $('extract-btn').click(); await waitFor(() => !/^Extracting/.test($('status-area').textContent), 'extracción'); await settle(); };
  const cont = async () => { $('continue-3d-btn').click(); await waitFor(() => ART_FINAL.test($('art-status').textContent), 'arte tras Continue'); await settle(); };
  const take = () => window.__A9T.splice(0);
  // ── inventario de escuchas (H1) ──
  const descOf = (t) => { if (t === window) return 'window'; if (t === document) return 'document'; if (!(t instanceof Node)) return '[' + ((t && t.constructor && t.constructor.name) || 'objeto') + ']';
    if (t.id && t.isConnected) return '#' + t.id; const parts = []; let e = t;
    while (e && e.nodeType === 1) { if (e.id) { parts.unshift('#' + e.id); break; } const p = e.parentElement; const tag = e.tagName.toLowerCase(); parts.unshift(p ? tag + ':' + (Array.prototype.indexOf.call(p.children, e) + 1) : tag); e = p; }
    return parts.join('>'); };
  const connected = (t) => t === window || t === document || (t instanceof Node && t.isConnected);
  const ON_PROPS = ['onclick', 'ondblclick', 'onchange', 'oninput', 'onkeydown', 'onkeyup', 'onmousedown', 'onmouseup', 'onmousemove', 'onwheel', 'oncontextmenu', 'onpointerdown', 'onpointerup', 'onpointermove', 'onload', 'onerror', 'onresize', 'onfocus', 'onblur', 'onsubmit'];
  const norm = (s) => String(s).split('\\n').map((l) => l.trim()).join('\\n');
  const fnv = (s) => { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return ('0000000' + h.toString(16)).slice(-8); };
  const onHandlers = () => { const out = []; for (const e of [window, document, ...document.querySelectorAll('*')]) for (const p of ON_PROPS) if (typeof e[p] === 'function') out.push({ d: descOf(e) + ' ' + p, fn: e[p] }); return out; };
  const listeners = () => { const L = window.__A9L; const live = L.live.filter((r) => connected(r.t));
    return { activos: live.map((r) => descOf(r.t) + ' ' + r.type + ' ' + r.opts), fueraDelDocumento: L.live.length - live.length,
      persistentes: live.filter((r) => !(r.t instanceof Node && r.t.closest && r.t.closest('#fold-panel'))).length, registros: L.seq.filter((r) => !r.removal).length,
      duplicados: L.seq.filter((r) => r.dup).length, retiradas: L.seq.filter((r) => r.removal).length, on: onHandlers().map((x) => x.d) }; };
  // texto de cada manejador activo (solo se compara bundle de referencia ↔ bundle actual: mismo impresor de esbuild). Se excluye la escucha de DOMContentLoaded: su texto es TODA la
  // clausura de main.js (la raíz de composición, que A9 cambia por diseño en cada paso); la equivalencia de main.js la fijan a9-texto-identico (funciones, manejadores y líneas sueltas) y H1–H6.
  const handlerTexts = () => [...window.__A9L.live.filter((r) => connected(r.t) && r.type !== 'DOMContentLoaded').map((r) => descOf(r.t) + ' ' + r.type + ' ' + fnv(norm(r.fn))), ...onHandlers().map((x) => x.d + ' ' + fnv(norm(x.fn)))];
  // ── serialización determinista de un subárbol (H4) ──
  const ser = (root) => { if (!root) return null; const out = [];
    const walk = (n, d) => { if (n.nodeType === 3) { if (n.data.trim()) out.push('  '.repeat(d) + '"' + n.data + '"'); return; } if (n.nodeType !== 1) return;
      const a = [...n.attributes].map((x) => x.name + '=' + JSON.stringify(x.value)).sort(); const p = [];
      if (/^(INPUT|SELECT|TEXTAREA|OPTION)$/.test(n.tagName)) p.push('value=' + JSON.stringify(n.value)); if (n.tagName === 'INPUT') p.push('checked=' + n.checked); if (n.tagName === 'OPTION') p.push('selected=' + n.selected);
      if ('disabled' in n && /^(INPUT|SELECT|BUTTON|TEXTAREA)$/.test(n.tagName)) p.push('disabled=' + n.disabled); if (n.tagName === 'DETAILS') p.push('open=' + n.open); if (typeof n.onclick === 'function') p.push('onclick');
      out.push('  '.repeat(d) + n.tagName.toLowerCase() + (a.length ? ' ' + a.join(' ') : '') + (p.length ? ' {' + p.join(' ') + '}' : '')); for (const c of n.childNodes) walk(c, d + 1); };
    walk(root, 0); return out; };
  // se lee una COPIA: leer el lienzo del producto con getImageData hace que Chrome deje de acelerarlo tras unas lecturas y cambia el rasterizado de las siguientes
  const canvasHash = async () => { const c = $('preview-canvas'); const k = document.createElement('canvas'); k.width = c.width; k.height = c.height; const x = k.getContext('2d', { willReadFrequently: true }); x.drawImage(c, 0, 0);
    const d = x.getImageData(0, 0, c.width, c.height).data;
    const h = await crypto.subtle.digest('SHA-256', d); return c.width + 'x' + c.height + ':' + Array.from(new Uint8Array(h)).slice(0, 8).map((b) => b.toString(16).padStart(2, '0')).join(''); };
  // ── selección por clic en el visor (eventos sintéticos sobre el overlay, como «Interacciones») ──
  const proj = (v) => { const p = v.clone().project(__dbg.camera); const r = $('preview-3d').getBoundingClientRect(); return { x: r.left + (p.x + 1) / 2 * r.width, y: r.top + (1 - p.y) / 2 * r.height }; };
  const mouse = (type, x, y, o) => $('three-overlay').dispatchEvent(new MouseEvent(type, Object.assign({ bubbles: true, cancelable: true, clientX: x, clientY: y, button: 0, buttons: 1 }, o || {})));
  const clickAt = async (p, o) => { mouse('mousedown', p.x, p.y, o); mouse('mouseup', p.x, p.y, o); await settle(); };
  const panelMeshes = () => { const a = []; __dbg.scene.traverse((o) => { if (o.isMesh && o.userData && o.userData.panelIndex !== undefined && o.geometry && o.geometry.type === 'ExtrudeGeometry') a.push(o); }); return a.sort((x, y) => x.userData.panelIndex - y.userData.panelIndex); };
  // panel destino: el de mayor área que no es la base (k = 0) o el siguiente (k = 1); el punto es el centro de su caja, en la cara superior
  const panelTarget = (k) => { const D = __dbg; const order = D.panelData.panels.map((p, i) => [Math.abs(p.area), i]).filter(([, i]) => i !== D.baseIndex).sort((a, b) => b[0] - a[0] || a[1] - b[1]); const idx = order[k % order.length][1];
    D.scene.updateMatrixWorld(true); const m = panelMeshes().find((x) => x.userData.panelIndex === idx); m.geometry.computeBoundingBox(); const c = m.geometry.boundingBox.getCenter(new THREE.Vector3()); c.z = m.geometry.boundingBox.max.z; m.localToWorld(c); return { idx, p: proj(c) }; };
  const creaseTarget = (k) => { const D = __dbg; D.scene.updateMatrixWorld(true); const cv = D.creaseVisuals[k % D.creaseVisuals.length]; const g = cv.visible.geometry.attributes.position;
    const a = new THREE.Vector3(g.getX(0), g.getY(0), g.getZ(0)), b = new THREE.Vector3(g.getX(1), g.getY(1), g.getZ(1)); cv.visible.localToWorld(a); cv.visible.localToWorld(b); return { edge: cv.edgeIdx, p: proj(a.add(b).multiplyScalar(0.5)) }; };
  const shiftPanel = async (k) => { const t = panelTarget(k); await clickAt(t.p, { shiftKey: true }); return t.idx; };
  const altCrease = async (k) => { const t = creaseTarget(k); await clickAt(t.p, { altKey: true }); return t.edge; };
  const crease = () => { const D = __dbg; return { seleccionada: D.selectedEdge, visuales: D.creaseVisuals.map((cv) => [cv.edgeIdx, cv.visible.material.color.getHexString(), cv.visible.material.opacity]),
    filas: [...document.querySelectorAll('#fold-panel details.all-creases > div:last-child > div')].map((r) => r.style.cssText) }; };
  const logText = () => ($('log-area') ? $('log-area').textContent : '');
  // ── estado del DOM tras el arranque (H3) ──
  const state = () => { const v = (id) => ($(id) ? $(id) : null); const txt = (id) => (v(id) ? v(id).textContent : null);
    return { vistas: [v('import-view') && v('import-view').style.display, v('three-view') && v('three-view').style.display], errorMsg: v('error-msg') && v('error-msg').style.display,
      deshabilitados: ['test-btn', 'extract-btn', 'preview-btn', 'continue-3d-btn', 'back-btn', 'export-3d-btn', 'export-glb-btn', 'apply-thickness-btn', 'refresh-art-btn'].map((id) => (v(id) ? v(id).disabled : null)),
      estado: txt('status-area'), arte: [txt('art-status'), txt('art-source-pill')], material: [v('material-preset') && v('material-preset').value, txt('material-pill')], espesor: v('thickness-input') && v('thickness-input').value,
      validacion: [txt('validation-status'), v('validation-status') && v('validation-status').className], problemas: v('problems-list') ? v('problems-list').children.length : null,
      pestanas: [...document.querySelectorAll('.tooltab')].map((b) => [b.id, b.classList.contains('active'), b.getAttribute('aria-selected')]), paneles: [...document.querySelectorAll('.tabpanel')].map((p) => [p.id, p.classList.contains('active')]),
      modo: [txt('interaction-mode-pill'), txt('interaction-status'), txt('viewport-badge'), v('three-viewport') && v('three-viewport').className], botonesModo: [!!v('mode-fold-btn'), !!v('mode-base-btn')],
      salida: v('output-json') && v('output-json').style.display, lienzo2d: v('preview-canvas') && v('preview-canvas').style.display, depuracion: [v('debug-toggle') && v('debug-toggle').checked, v('debug-details') && v('debug-details').open] }; };
  window.A9 = { sleep, raf2, $, fire, waitFor, settle, extract, cont, build: async () => { await extract(); await cont(); }, take, listeners, handlerTexts, ser, canvasHash, shiftPanel, altCrease, panelTarget, creaseTarget,
    clickAt, crease, logText, state, ART_FINAL };
})()`;

// ───────────────────────── A9.0b: referencia de texto y bloques de manejadores ─────────────────────────
// Árbol src/ (sin core/) del commit de referencia de A9: [{file, text}]
export function refTree() {
  const names = execFileSync('git', ['-C', ROOT, 'ls-tree', '-r', '--name-only', A9_REF, 'src'], { encoding: 'utf8' }).split('\n').filter((f) => f.endsWith('.js') && !f.startsWith('src/core/'));
  return names.map((n) => ({ file: n.slice(4), text: execFileSync('git', ['-C', ROOT, 'show', `${A9_REF}:${n}`], { encoding: 'utf8' }) }));
}
// Las 29 funciones de primer nivel de la clausura de src/main.js en 3ea0d8a (mapa de A9_PROPUESTA §3.1), en orden de aparición.
export const CLOSURE_3EA0D8A = ['setStatus', 'log', 'clearLog', '__tessDebugView', 'syncMaterialPresetUI', 'setInteractionMode', 'ensureCep', 'showImport', 'show3D', 'setDebugVisible', 'setActiveTab',
  'syncMaterialInputs', 'applyMaterialPreset', 'setArtStatus', 'resetValidationUI', 'refreshArtwork', 'validateGeometry', 'render2D', 'pickPanelFromEvent', 'updatePerCreaseRow', 'updateSelectedCreaseVisuals',
  'syncSelectedCreaseUI', 'selectFoldEdge', 'applySelectedCreaseAngle', 'pickCreaseFromEvent', 'setBasePanel', 'buildFoldUI', 'exportPNG', 'exportGLB'];
// Los 15 manejadores de primer nivel (D-A9-6): sentencias a la sangría `indent` que registran escuchas y no son declaraciones de función. Devuelve [{start, text}] en orden.
// Una sentencia empieza en una línea con exactamente esa sangría que no cierra un bloque, y sigue mientras las líneas estén más sangradas o cierren a esa sangría.
export function handlerBlocks(src, indent = 4) {
  const L = src.split('\n'), pad = ' '.repeat(indent), out = []; let cur = null;
  const isStart = (l) => l.startsWith(pad) && l.length > indent && l[indent] !== ' ' && !/^[})\]]/.test(l.slice(indent));
  for (let i = 0; i < L.length; i++) { const l = L[i];
    if (isStart(l)) { if (cur) out.push(cur); cur = { start: i, lines: [l] }; continue; }
    if (cur && (l.trim() === '' || l.startsWith(pad + ' ') || (l.startsWith(pad) && /^[})\]]/.test(l.slice(indent))))) { cur.lines.push(l); continue; }
    if (cur) { out.push(cur); cur = null; } }
  if (cur) out.push(cur);
  return out.map((b) => ({ start: b.start, text: b.lines.join('\n').replace(/\s+$/, '') })).filter((b) => /\.addEventListener\(/.test(b.text) && !/^\s*(async )?function /.test(b.text));
}
