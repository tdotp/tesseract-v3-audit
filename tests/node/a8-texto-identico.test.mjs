// A8 (T2 de A8) — Equivalencia de texto respecto del src/ del commit a322d7a (A7 validada en el CEP real; docs/fase1/A8_PROPUESTA.md §7).
//  · Toda función (a cualquier sangría) de los módulos y de main.js de a322d7a existe en el src/ actual con el MISMO texto salvo la sangría, «export» y el prefijo «S.»;
//    las únicas funciones añadidas son las previstas en este paso (fábricas de src/export/).
//  · Las 8 funciones de exportación existen EXACTAMENTE una vez fuera de core/. exportPNG, exportGLB y el manejador del botón siguen en main.js (D-A8-2).
//  · Las líneas sueltas de main.js cambian solo como se prevé en este paso (imports, cableado, declaraciones que salen).
import test from 'node:test'; import assert from 'node:assert/strict'; import fs from 'node:fs'; import path from 'node:path';
import { SRC, srcFiles, functionsAnyIndent, norm, residual, multisetDiff } from '../lib/a7.mjs'; import { EXPORT_FUNCTIONS, refTree, refMain } from '../lib/a8.mjs';

// Estado esperado en ESTE paso (se actualiza en cada paso aprobado; igualdad exacta).
const NEW_FUNCTIONS = ['createGlbImage', 'createGlbScene']; // A8.3: fábricas nuevas; las 5 funciones movidas cambian de archivo, no son nuevas
const EXPECTED_RESIDUAL = { quitadas: [], anadidas: ["import { padBytes, toUint8View } from './export/glb-bytes.js';", "import { createGlbImage } from './export/glb-image.js';", "import { createGlbScene } from './export/glb-scene.js';",
  "var { textureToImageBytes } = createGlbImage({ log }); /* A8.2: codificación de texturas para el GLB (bytesFromDataURL queda interna) */", "var { buildExportSceneMeshes } = createGlbScene(S); /* A8.3: recorrido de la escena para el GLB */"] };

const ref = refTree(); const refMainText = refMain();
const key = (f) => f.name + '\n' + norm(f.text);
const refFns = ref.flatMap((t) => functionsAnyIndent(t.text)); const files = srcFiles().filter((f) => !f.startsWith('core/'));
const srcFns = files.flatMap((f) => functionsAnyIndent(fs.readFileSync(path.join(SRC, f), 'utf8')).map((x) => ({ ...x, file: f })));
const mainText = fs.readFileSync(path.join(SRC, 'main.js'), 'utf8');

test('la referencia a322d7a tiene main.js y los módulos de A5–A7 (sin core/) y las 8 funciones de exportación en la clausura', () => {
  assert.equal(ref.length, 18, 'árbol de referencia: main.js + 17 módulos fuera de core/');
  const closure = functionsAnyIndent(refMainText).filter((f) => f.indent === 4).map((f) => f.name); for (const n of EXPORT_FUNCTIONS) assert.ok(closure.includes(n), n);
});
test('cada función de la referencia existe en src/ con el mismo texto (salvo sangría, export y S.); no se pierde ni se altera ninguna', () => {
  const d = multisetDiff(refFns.map(key), srcFns.map(key)); assert.deepEqual(d.quitadas.map((k) => k.split('\n')[0]), [], 'funciones quitadas o alteradas');
});
test('funciones añadidas: solo las previstas en este paso', () => {
  const d = multisetDiff(refFns.map(key), srcFns.map(key)); assert.deepEqual(d.anadidas.map((k) => k.split('\n')[0]).sort(), [...NEW_FUNCTIONS].sort());
});
test('las 8 funciones de exportación están definidas EXACTAMENTE una vez fuera de core/', () => {
  for (const n of EXPORT_FUNCTIONS) { const k = srcFns.filter((x) => x.name === n).length; assert.equal(k, 1, `${n}: ${k} definiciones`); }
});
test('exportPNG, exportGLB y el manejador de «Export GLB» siguen en main.js (D-A8-2)', () => {
  const mainFns = functionsAnyIndent(mainText).filter((f) => f.indent === 4).map((f) => f.name); assert.ok(mainFns.includes('exportPNG') && mainFns.includes('exportGLB'));
  assert.match(mainText, /exportGlbBtn\.addEventListener\('click', async function\(\)\{\n\s+try\{\n\s+setStatus\('Exporting GLB…'\);\n\s+await exportGLB\(\);\n\s+setStatus\('GLB exported from current 3D pose'\);/);
  assert.match(mainText, /import \{ saveBlobWithDialog \} from '\.\/bridge\/fs\.js';/);
});
test('líneas sueltas de main.js frente a a322d7a: solo los cambios previstos en este paso', () => {
  const d = multisetDiff(residual(refMainText), residual(mainText)); assert.deepEqual(d, EXPECTED_RESIDUAL);
});
