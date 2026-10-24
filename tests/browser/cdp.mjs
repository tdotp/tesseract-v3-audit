// Cliente mínimo de Chrome DevTools Protocol sin dependencias (usa WebSocket global de Node ≥ 22) + servidor estático.
import { spawn } from 'node:child_process';
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export const CHROME = process.env.CHROME_BIN || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

export function serveDir(root) { // servidor estático efímero; devuelve { url, close }
  const types = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json' };
  const srv = http.createServer((req, res) => {
    const p = path.join(root, decodeURIComponent(req.url.split('?')[0]));
    if (!p.startsWith(root) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end('no'); }
    res.writeHead(200, { 'Content-Type': types[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(res);
  });
  return new Promise((resolve) => srv.listen(0, '127.0.0.1', () => resolve({ url: `http://127.0.0.1:${srv.address().port}`, close: () => new Promise((r) => { srv.closeAllConnections?.(); srv.close(r); }) })));
}

export async function launchChrome({ gpu = 'default', width = 1000, height = 1200 } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tess-chrome-'));
  const args = ['--headless=new', '--remote-debugging-port=0', `--user-data-dir=${dir}`, '--no-first-run', '--no-default-browser-check', '--disable-extensions',
    `--window-size=${width},${height}`, '--hide-scrollbars', '--mute-audio', '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows'];
  if (gpu === 'swiftshader') args.push('--use-angle=swiftshader', '--enable-unsafe-swiftshader');
  args.push('about:blank');
  const proc = spawn(CHROME, args, { stdio: ['ignore', 'ignore', 'pipe'], detached: true }); // grupo propio para poder matar también los procesos auxiliares
  const port = await new Promise((resolve, reject) => {
    let buf = ''; const to = setTimeout(() => reject(new Error('Chrome no arrancó:\n' + buf)), 20000);
    proc.stderr.on('data', (d) => { buf += d; const m = /DevTools listening on ws:\/\/127\.0\.0\.1:(\d+)\//.exec(buf); if (m) { clearTimeout(to); resolve(+m[1]); } });
    proc.on('exit', (c) => reject(new Error('Chrome salió con ' + c + '\n' + buf)));
  });
  const targets = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
  const page = targets.find((t) => t.type === 'page');
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
  let id = 0; const pending = new Map(); const consoleMsgs = []; const errors = [];
  ws.onmessage = (ev) => {
    const m = JSON.parse(ev.data);
    if (m.id && pending.has(m.id)) { const { resolve, reject } = pending.get(m.id); pending.delete(m.id); m.error ? reject(new Error(m.error.message)) : resolve(m.result); }
    else if (m.method === 'Runtime.consoleAPICalled') consoleMsgs.push({ type: m.params.type, text: m.params.args.map((a) => a.value ?? a.description).join(' ') });
    else if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text);
  };
  const send = (method, params = {}) => new Promise((resolve, reject) => { const i = ++id; pending.set(i, { resolve, reject }); ws.send(JSON.stringify({ id: i, method, params })); });
  await send('Runtime.enable'); await send('Page.enable');
  const api = {
    port, consoleMsgs, errors,
    async goto(url) { await send('Page.navigate', { url }); await new Promise((r) => setTimeout(r, 300)); for (let i = 0; i < 100; i++) { const s = await api.eval('document.readyState'); if (s === 'complete') return; await new Promise((r) => setTimeout(r, 100)); } },
    async eval(expression, { timeout = 300000 } = {}) {
      let to; const r = await Promise.race([send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }), new Promise((_, j) => { to = setTimeout(() => j(new Error('timeout evaluando en el navegador')), timeout); })]).finally(() => clearTimeout(to)); // el temporizador se cancela: si no, mantiene vivo el proceso hasta 5 min
      if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
      return r.result.value;
    },
    async addInitScript(source) { await send('Page.addScriptToEvaluateOnNewDocument', { source }); },
    async close() { try { ws.close(); } catch {} try { process.kill(-proc.pid, 'SIGKILL'); } catch {} await new Promise((r) => setTimeout(r, 300)); fs.rmSync(dir, { recursive: true, force: true }); },
  };
  return api;
}
