// A9-CEP (2026-10-27) · Escape con entrada CDP de confianza en el panel CEP REAL: tras «Apply» del espesor, Escape con el foco en el campo no cambia el estado;
// sin foco activa «Crease selection mode enabled». Uso: node tools/a9-cep/v6-escape-cdp.mjs "$PWD" <salida.json>
import fs from 'node:fs';
const [ROOT, OUT] = process.argv.slice(2);
const { listTargets, pickTarget, connect } = await import(ROOT + '/tools/a4/cdp-run.mjs');
const c = await connect(pickTarget(await listTargets(8088), 'tesseract-v3'));
const SC = await c.eval('devicePixelRatio'); const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const rect = (s) => c.eval(`(() => { const r = document.querySelector(${JSON.stringify(s)}).getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; })()`);
const click = async (p) => { for (const type of ['mouseMoved', 'mousePressed', 'mouseReleased']) await c.send('Input.dispatchMouseEvent', { type, x: p.x * SC, y: p.y * SC, button: type === 'mouseMoved' ? 'none' : 'left', clickCount: type === 'mouseMoved' ? 0 : 1 }); await wait(400); };
const esc = async () => { for (const type of ['rawKeyDown', 'keyUp']) await c.send('Input.dispatchKeyEvent', { type, key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 }); await wait(300); };
const st = () => c.eval(`({ estado: document.getElementById('status-area').textContent, foco: document.activeElement && document.activeElement.id, modo: document.getElementById('interaction-mode-pill') && document.getElementById('interaction-mode-pill').textContent })`);
const modeBtn = 'apply-thickness-btn';
const R = { entrada: 'CDP Input en CEP real', modeBtn };
await click(await rect('#tab-btn-material')); await click(await rect('#' + modeBtn)); await wait(2500); R.trasApplyEspesor = await st();
await click(await rect('#thickness-input')); await esc(); R.escapeConFocoEnEspesor = await st();
await c.eval('document.activeElement.blur()'); await esc(); R.escapeSinFoco = await st();
fs.writeFileSync(OUT, JSON.stringify(R, null, 1)); console.log(JSON.stringify(R)); await c.close();
