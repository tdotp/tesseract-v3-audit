// Garantiza que ROOT/dist existe y es íntegro SIN carreras entre archivos de prueba que corren en paralelo: candado atómico (mkdir) y reconstrucción solo si dist/ no coincide con las huellas fijadas.
import fs from 'node:fs'; import crypto from 'node:crypto'; import path from 'node:path'; import { ROOT } from './fixtures.mjs'; import { build } from '../../tools/build/build.mjs';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms)); const sha = (f) => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
// Huella VIGENTE del bundle (desde A9.0b: dist-a9; en A9.0b = dist-a8). Históricas que NO se modifican: tests/golden/dist.SHA256SUMS (A3/A4), tests/golden/dist-a5.SHA256SUMS
// (A5, validada en el CEP real; build.test la reproduce desde el src/ de 31459fc), tests/golden/dist-a6.SHA256SUMS (A6, validada en el CEP real; la lee
// a6-cep-evidencia y build.test la reproduce desde el src/ de 2939dbc), tests/golden/dist-a7.SHA256SUMS (A7; src/ de a322d7a) y tests/golden/dist-a8.SHA256SUMS
// (A8, validada en el CEP real; la leen a8-cep-* y build.test la reproduce desde el src/ de 3ea0d8a).
export const DIST_PIN = path.join(ROOT, 'tests/golden/dist-a9.SHA256SUMS');
function distOk() { const d = path.join(ROOT, 'dist'), sums = path.join(d, 'SHA256SUMS'); try { if (fs.readFileSync(sums, 'utf8') !== fs.readFileSync(DIST_PIN, 'utf8')) return false;
  return fs.readFileSync(sums, 'utf8').split('\n').filter(Boolean).every((l) => { const [h, f] = l.split(/\s+/); return fs.existsSync(path.join(d, f)) && sha(path.join(d, f)) === h; }) && fs.existsSync(path.join(d, 'BUILD_INFO.json')); } catch { return false; } }
export async function ensureDist() { const lock = path.join(ROOT, '.dist.lock');
  for (let i = 0; ; i++) { try { fs.mkdirSync(lock); break; } catch (e) { if (e.code !== 'EEXIST') throw e; try { if (Date.now() - fs.statSync(lock).mtimeMs > 120000) fs.rmdirSync(lock); } catch {} if (i > 1200) throw new Error('candado de dist/ no disponible'); await sleep(100); } }
  try { if (!distOk()) await build({ out: path.join(ROOT, 'dist') }); } finally { try { fs.rmdirSync(lock); } catch {} } }
