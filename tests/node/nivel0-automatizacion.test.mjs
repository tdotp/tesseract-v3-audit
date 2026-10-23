// Salvaguardas de la automatización del Nivel 0 (tesseract_prep_doc.jsx y run-nivel0.mjs), que escriben en Illustrator real: solo documentos N0-*, nunca guardan, nunca tocan CEP.
import test from 'node:test'; import assert from 'node:assert/strict'; import fs from 'node:fs'; import vm from 'node:vm';
import { ROOT } from '../lib/fixtures.mjs';
const prep = fs.readFileSync(`${ROOT}/tools/illustrator/tesseract_prep_doc.jsx`, 'utf8'); const orq = fs.readFileSync(`${ROOT}/tools/illustrator/run-nivel0.mjs`, 'utf8');
const strip = (c) => c.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '').replace(/"(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*'/g, '""');

test('prep_doc: ES3, sin guardar/cerrar/abrir/crear documentos; el único borrado es .remove() del grupo vaciado y de la capa original vacía', () => {
  const code = strip(prep); for (const [re, what] of [[/=>/, 'flecha'], [/\blet\b/, 'let'], [/\bconst\b/, 'const'], [/`/, 'plantilla'], [/\bJSON\./, 'JSON'], [/\.forEach\(/, 'forEach'], [/\.map\(/, 'map'], [/\.save(As)?\(/, 'save'], [/\.close\(/, 'close'], [/app\.open\(/, 'open'], [/documents\.add/, 'documents.add'], [/\bFile\b|\bFolder\b/, 'archivos']]) assert.doesNotMatch(code, re, what);
  assert.equal((code.match(/\.remove\(/g) || []).length, 2); assert.match(prep, /indexOf\("N0-"\) !== 0\) \{ throw/);
});
test('prep_doc: se niega a ejecutarse en un documento que no se llama N0-* (control negativo) y no toca nada', () => {
  let touched = 0; const doc = { name: 'trabajo-real.ai', layers: { length: 1, add() { touched++; } } }; const ctx = { app: { activeDocument: doc }, $: { global: { TESS_PREP_ORDER: ['Cuts'] } }, ElementPlacement: { PLACEATEND: 1 }, Error };
  assert.throws(() => vm.runInNewContext(prep.replace(/^#target.*$/m, ''), ctx), /NO es de prueba/); assert.equal(touched, 0);
});
test('prep_doc: reordena grupos en capas en el orden pedido (arriba→abajo) en un documento N0-* simulado', () => {
  const mkItem = (n) => { const it = { n, moved: null, move(l) { it.moved = l.name; l.pageItems.push(it); } }; return it; };
  const mkLayers = () => { const arr = []; arr.add = () => { const l = { name: '', pageItems: [], groupItems: [], remove() { arr.splice(arr.indexOf(l), 1); } }; arr.unshift(l); return l; }; return arr; };
  const layers = mkLayers(); const base = { name: 'Layer 1', pageItems: [], groupItems: [], remove() { layers.splice(layers.indexOf(base), 1); } }; layers.push(base);
  const grp = (name, kids) => { const g = { name, pageItems: kids, remove() { base.groupItems.splice(base.groupItems.indexOf(g), 1); kids.forEach((k) => { base.pageItems.splice(base.pageItems.indexOf(k), 1); }); } }; return g; };
  const a = [mkItem('c1'), mkItem('c2')], b = [mkItem('p1')]; const gC = grp('Cuts', a), gP = grp('Creases', b); base.groupItems.push(gC, gP); base.pageItems.push(...a, ...b);
  const doc = { name: 'N0-X.svg', layers: Object.assign(layers, {}) }; Object.defineProperty(doc, 'layers', { value: layers });
  const out = vm.runInNewContext(prep.replace(/^#target.*$/m, ''), { app: { activeDocument: doc }, $: { global: { TESS_PREP_ORDER: ['Cuts', 'Creases'] } }, ElementPlacement: { PLACEATEND: 1 }, Error });
  assert.match(out, /capas \(arriba→abajo\) = Cuts, Creases/); assert.deepEqual(layers.map((l) => l.name), ['Cuts', 'Creases']); assert.deepEqual(a.map((i) => i.moved), ['Cuts', 'Cuts']); assert.deepEqual(b.map((i) => i.moved), ['Creases']);
});
test('run-nivel0: solo actúa sobre N0-*, cierra siempre con DONOTSAVECHANGES, no instala ni toca CEP y solo borra su carpeta de staging', () => {
  assert.match(orq, /DONOTSAVECHANGES/); assert.doesNotMatch(orq, /SaveOptions\.SAVECHANGES|SaveOptions\.PROMPTTOSAVECHANGES|\.saveAs?\(|\.save\(/);
  assert.ok((orq.match(/startsWith\('N0-'\)/g) || []).length >= 4); assert.match(orq, /indexOf\("N0-"\)!==0\) throw/);
  assert.doesNotMatch(orq, /Adobe\/CEP|extensions\/|install\.sh|PlayerDebugMode|\/Library\/Application Support/); const rm = orq.match(/fs\.rmSync\([^)]*\)/g) || []; assert.deepEqual(rm.map((r) => r.replace(/\s+/g, ' ')), ["fs.rmSync(STAGE, { recursive: true, force: true })"]);
  assert.match(orq, /sameSnapshots\(start, end\)\) throw new Anomaly/); assert.match(orq, /run-log-\$\{process\.argv\[2\]/);
});
