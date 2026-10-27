// A9-CEP (2026-10-27) · Diagnóstico del GLB con arte: fija la base con el select «Base» (value + change, el mismo mecanismo que P-3 de a4-paridad) para reproducir
// la precondición de A8 (base previa P0). Uso: node tools/a9-cep/fijar-base.mjs "$PWD" <índice>
const [ROOT, B] = process.argv.slice(2);
const { listTargets, pickTarget, connect } = await import(ROOT + '/tools/a4/cdp-run.mjs');
const c = await connect(pickTarget(await listTargets(8088), 'tesseract-v3'));
console.log(JSON.stringify(await c.eval(`(async () => { const s = document.querySelector('#fold-panel select'); const antes = s.value; s.value = ${JSON.stringify(B)}; s.dispatchEvent(new Event('change', { bubbles: true })); await new Promise(r => setTimeout(r, 500)); return { antes, despues: document.querySelector('#fold-panel select').value, estado: document.getElementById('status-area').textContent }; })()`)));
await c.close();
