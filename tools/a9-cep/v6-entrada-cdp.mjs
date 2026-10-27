// A9-CEP (2026-10-27) · V-6 complementario con entrada CDP de confianza (Input.dispatchMouseEvent/dispatchKeyEvent) en el panel CEP REAL, con las coordenadas
// escaladas por devicePixelRatio (1,25 en CEP; sin escalar los clics caen fuera). Back → Continue to 3D → primer clic = Shift+clic en el centro del lienzo, Escape, 4 pestañas y Debug.
// No inyecta código en el bundle: solo pulsa y lee el DOM. Uso (con el panel V3 abierto y un modelo 3D): node tools/a9-cep/v6-entrada-cdp.mjs "$PWD" <salida.json>
import fs from 'node:fs';
const ROOT = process.argv[2]; const OUT = process.argv[3];
const { listTargets, pickTarget, connect } = await import(ROOT + '/tools/a4/cdp-run.mjs');
const c = await connect(pickTarget(await listTargets(8088), 'tesseract-v3'));
const SC = await c.eval("devicePixelRatio"); const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const ev = (js) => c.eval(js);
const rect = (sel) => ev(`(() => { const e = document.querySelector(${JSON.stringify(sel)}); if (!e) return null; const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, h: r.height, vis: e.offsetParent !== null }; })()`);
const click = async (p, modifiers = 0) => { for (const type of ['mouseMoved', 'mousePressed', 'mouseReleased']) await c.send('Input.dispatchMouseEvent', { type, x: p.x * SC, y: p.y * SC, button: type === 'mouseMoved' ? 'none' : 'left', clickCount: type === 'mouseMoved' ? 0 : 1, modifiers }); await wait(400); };
const key = async (k, code, vk) => { await c.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: k, code, windowsVirtualKeyCode: vk }); await c.send('Input.dispatchKeyEvent', { type: 'keyUp', key: k, code, windowsVirtualKeyCode: vk }); await wait(300); };
const status = () => ev(`document.getElementById('status-area').textContent`);
const R = { fecha: new Date().toISOString(), entrada: 'CDP Input.dispatchMouseEvent/dispatchKeyEvent en el CEP real (no es entrada manual)', pasos: [] };
const step = (nombre, datos) => { R.pasos.push({ nombre, ...datos }); console.log(nombre, JSON.stringify(datos)); };

await click(await rect('#continue-3d-btn')); await wait(2500); step('reconstruir 3D (escala dpr)', { escala: SC, estado: await status() });
// 1) Back → Continue to 3D → PRIMER clic en el lienzo = Shift+clic en el centro
const ids = await ev(`[...document.querySelectorAll('button')].map(b => b.id + '|' + b.textContent.trim()).join('\\n')`);
const back = ids.split('\n').find((l) => /^[^|]*\|Back/.test(l)); const cont = ids.split('\n').find((l) => /Continue to 3D/.test(l));
step('botones', { back, cont });
await click(await rect('#' + back.split('|')[0])); await wait(800);
await click(await rect('#' + cont.split('|')[0])); await wait(2500);
const sel0 = await ev(`document.querySelector('#fold-panel select') && document.querySelector('#fold-panel select').value`);
step('tras Continue to 3D', { estado: await status(), selectBase: sel0 });
const cv = await rect('#preview-3d');
await click({ x: cv.x, y: cv.y }, 8 /* Shift */); await wait(1500);
step('primer clic: Shift+clic centro del lienzo', { estado: await status(), selectBase: await ev(`document.querySelector('#fold-panel select').value`), pestanaMaterial: await ev(`document.getElementById('tab-btn-material').classList.contains('active')`) });

// 2) Escape con la vista 3D (foco en el documento) y con foco en el campo de espesor
await ev(`document.activeElement && document.activeElement.blur && document.activeElement.blur()`);
await key('Escape', 'Escape', 27);
step('Escape en vista 3D', { estado: await status() });
const antes = await status();
const th = await ev(`(() => { const i = [...document.querySelectorAll('input')].find(e => /thick/i.test(e.id)); return i ? i.id : null; })()`);
await click(await rect('#' + th)); await key('Escape', 'Escape', 27);
step('Escape con foco en espesor', { campo: th, estado: await status(), sinCambio: (await status()) === antes });
await ev(`document.activeElement.blur()`);

// 3) Pestañas
const tabs = await ev(`[...document.querySelectorAll('[id^=tab-btn-]')].map(b => b.id)`);
for (const t of tabs) { await click(await rect('#' + t)); step('pestaña ' + t, await ev(`(() => { const b = document.getElementById(${JSON.stringify(t)}); const activos = [...document.querySelectorAll('[id^=tab-btn-]')].filter(x => x.classList.contains('active')).map(x => x.id); const panes = [...document.querySelectorAll('[id^=tab-]')].filter(x => !/^tab-btn-/.test(x.id) && x.offsetParent !== null).map(x => x.id); return { activos, panelesVisibles: panes }; })()`)); }

// 4) Debug en la vista de importación
await click(await rect('#' + back.split('|')[0])); await wait(800);
const dbg = await ev(`(() => { const i = document.getElementById('debug-toggle'); return i ? 'debug-toggle' : [...document.querySelectorAll('input[type=checkbox]')].map(x=>x.id).join(','); })()`);
const vis = () => ev(`(() => { const o = document.getElementById('output-json'); return o ? { id: o.id, visible: o.offsetParent !== null && getComputedStyle(o).display !== 'none' } : null; })()`);
const v0 = await vis(); await click(await rect('#' + dbg)); const v1 = await vis(); await click(await rect('#' + dbg)); const v2 = await vis();
step('Debug', { casilla: dbg, inicial: v0, trasMarcar: v1, trasDesmarcar: v2 });
await click(await rect('#' + cont.split('|')[0])); await wait(2500);
step('vuelta a 3D', { estado: await status() });
fs.writeFileSync(OUT, JSON.stringify(R, null, 1)); await c.close(); console.log('→', OUT);
