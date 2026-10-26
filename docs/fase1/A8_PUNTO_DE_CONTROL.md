# Fase 1 · A8 — Punto de control tras A8.3 (previo a A8.4)

Fecha: 2026-10-26 · Base: `a322d7a` (A7 validada en CEP real) · HEAD: `6e316d2` · Autorización: parcial (A8.0a–A8.3); **A8.4 y A8.5 NO autorizados: detenido antes de tocar el constructor GLB.**
Etiquetas: **[MEDIDO]** · **[CONFIRMADO]** · **[INFERENCIA]** · **[NO VERIFICADO]**. Nada instalado ni cargado en Illustrator. A9 y F2 no iniciadas. Sin push.

## 1. Commits y estado Git [MEDIDO]
| Commit | Paso | Contenido | `src/` |
|---|---|---|---|
| `92e2511` | — | Propuesta A8 + autorización parcial (§16) + batería previa sobre `a322d7a` | no |
| `c7dee4b` | **A8.0a** | Caracterización: N1–N4, E1–E6, golden de estructura, 27 controles negativos nuevos; **KI-28 registrado** | no |
| `5509e84` | **A8.0b** | Andamiaje: `a8-texto-identico`, `a8-limites`, `dist-a8` (= bundle de A7), `a8-perf`, `a8-equivalencia` | no |
| `bf5360f` | **A8.1** | `src/export/glb-bytes.js` (3 funciones puras) | sí |
| `6494f94` | **A8.2** | `src/export/glb-image.js` (2 funciones, único módulo con DOM) | sí |
| `6e316d2` | **A8.3** | `src/export/glb-scene.js` (`buildExportSceneMeshes`) + I-E3 en N4 | sí |
Árbol de trabajo **limpio**, un solo autor, sin trailers de IA, sin remoto ni push. `tools/verify-isolation.sh` verde (baseline 15/15, extensión instalada = baseline, `panel/` con las diferencias esperadas, V3 no instalada). `dist/` = `tests/golden/dist-a8.SHA256SUMS` (13/13); `dist-a7`, `dist-a6`, `dist-a5`, `dist`, `panel.pins.json`, goldens y fixtures históricos **sin cambios**. Cada etapa se cerró con `tests/run-all.sh --mutations --soak` en verde (salidas en `docs/fase1/a8/run-all-A8.*.txt`).

## 2. Mapa de módulos extraídos [MEDIDO]
```
src/export/
  glb-bytes.js   21 l.  padBytes · toUint8View · typedArrayFromList                          puro (sin THREE, DOM, window, S)         importa: —
  glb-image.js   44 l.  createGlbImage({ log }) → { bytesFromDataURL, textureToImageBytes }  DOM solo en textureToImageBytes          importa: —
  glb-scene.js   66 l.  createGlbScene(S) → { buildExportSceneMeshes }                       THREE; solo S.scene3d                    importa: glb-bytes (typedArrayFromList)
```
`src/main.js`: 1 078 → **973** líneas. Sigue en `main.js` (D-A8-2): `exportPNG`, `exportGLB`, el manejador de «Export GLB», `saveBlobWithDialog` (importado de `bridge/fs.js`) y, **hasta A8.4**, `materialKey` y `buildGLBBlobFromCurrentView`. Raíz de composición añadida (tras `createFolding`): `var { textureToImageBytes } = createGlbImage({ log });` y `var { buildExportSceneMeshes } = createGlbScene(S);` (y los tres imports).
**Texto:** las 5 funciones movidas son idénticas a `a322d7a` salvo sangría, `export` y (ya existente) `S.`; **toda** función de `a322d7a` existe en `src/` con el mismo texto y no se añadió ninguna salvo las dos fábricas (`a8-texto-identico`). Bundle `a322d7a` → HEAD: **141/141 funciones idénticas**, 0 distintas, 0 duplicadas, 0 perdidas; nuevas: `createGlbImage`, `createGlbScene` (`docs/fase1/a8/equivalencia-funciones-A8.*.txt`).

## 3. Resultados N1–N4 y E1–E6 [MEDIDO] (cierre de A8.3)
| Nivel | Qué | Resultado |
|---|---|---|
| **N1** | GLB sin arte de baseline, `panel/` y bundle = archivos de Illustrator REAL **byte a byte** (`Buffer.equals`, no solo hash) | ✅ 3/3 objetivos × 2 poses: `737bcd23…` (33 436 B) y `87aa2e4c…` (54 224 B) |
| **N2** | baseline = `panel/` = bundle (sha-256) en 6 estados con y sin arte × 2 fixtures; exportación repetida = mismos bytes | ✅ 6 estados × 2 fixtures × 3 objetivos idénticos entre sí, y cada exportación repetida da los mismos bytes |
| **N3** | GLB con arte real de N0-B (extracción real + 2 imágenes del GLB real servidas como las exportaría Illustrator + rectángulo medido en real) | ✅ estructural · binario: ver §4 |
| **N4** | 8 funciones evaluadas de baseline, `panel/` y `src/` (módulos reales cuando existen) sobre **44 escenas** de three r132 real: 28 con nombre (Uint16/Uint32, frontera 65 534/65 535, sin normales/UV/índice, opacidad 0.005/0.01, roles, nombres, deduplicación, texturas compartidas/sin tamaño/con fallo, jerarquías con TRS, orden de recorrido, **KI-28**) + 16 aleatorias con semilla | ✅ 50/50 (incluye alineación/relleno, I-E3 «no muta geometrías ni materiales», origen de cada función) |
| **E1/E2** | exportar 5 veces con arte no cambia la escena ni `renderer.info.memory` | ✅ ×3 objetivos |
| **E3** | determinismo | ✅ (en N2) |
| **E4/E5** | mensajes de estado (KI-25 intacto), cancelación, error de escritura, «Nothing exportable», «Build 3D first», fallo de textura con log, orden **Blob → diálogo → escritura** | ✅ ×3 objetivos, idénticos entre sí |
| **E6** | estructura del GLB (nodos, materiales, vistas, orden) en 4 fixtures × poses + arte; golden **solo del baseline** (`glb-structure.golden.json`, fijado por `a8.pins.json`) | ✅ |
Totales al cierre de A8.3: Node **519** (518 + 1 omitida a propósito) · navegador 56 + 13 (`a7`) + **31 (`a8`)** + 4 + 6 + 3 + 7, todo en verde; controles negativos Node 54 + navegador 43 + bundle 6 = **103/103 detectados** (antes de A8: 57).
*Hallazgo de la caracterización:* `material.version` crece sin exportar (2 374 → 9 934 en 1.5 s, bucle continuo KI-11), así que E1 lo excluye; no es un efecto de la exportación.

## 4. Equivalencia del GLB: sin arte y con arte, por separado
**Sin arte — BINARIA** (exigida y cumplida): N1 byte a byte contra los dos archivos reales, para baseline, `panel/` y bundle, en Chrome headless 155. Es la misma igualdad que cuatro bundles sucesivos (A4–A7) obtuvieron en el CEP real.
**Con arte — dos niveles distintos, informados aparte:**
| Nivel | Criterio | baseline | `panel/` | bundle |
|---|---|---|---|---|
| **Estructural** (exigido) | JSON idéntico salvo desplazamientos y longitud de imagen; mismo orden de claves (`…buffers,images,textures,samplers`); **todas** las vistas que no son imagen idénticas byte a byte (0 distintas); alineación y relleno correctos | ✅ | ✅ | ✅ |
| **Píxeles de las imágenes** (informativo) | 2 imágenes de 3176 × 2264: píxeles distintos tras decodificar ambas | **0** de 7 190 464 (máx. diferencia de canal 0) ×2 | igual | igual |
| **Binaria frente al archivo real** (NO exigible en headless) | archivo completo = `b4973a54…` (295 440 B) | ❌ 299 720 B (`b3f56d4c…`) | ❌ igual | ❌ igual |
| **Binaria entre los tres objetivos** (misma sesión de Chrome) | baseline = `panel/` = bundle | — | ✅ idéntico | ✅ idéntico |
La única diferencia binaria con el archivo real son los **bytes de los dos PNG** (145 407 y 145 400 B frente a 144 353 y 142 172 B): Chrome 155 headless codifica el mismo mapa de píxeles con otro compresor que el Chromium 99 de CEP; los píxeles son idénticos. La igualdad binaria completa del GLB con arte (`b4973a54…`) solo se puede comprobar en Illustrator real (**A8-CEP, no autorizada**; D-A8-4).

## 5. Controles negativos [MEDIDO]
Nuevos en A8: **46** (Node 30 + navegador 16), todos detectados; ninguno «NO APLICÓ». Los de texto (N4) se ejecutan **solo contra N4** (con la batería completa los ve `a7-texto-identico` por cualquier cambio de texto y no probarían nada sobre N4). Cubren: orden de claves del JSON, imagen antes de accesores, relleno de alineación y del JSON, umbrales Uint16 y de opacidad, filtros `pickCrease`/`panelLabel`, normales sin `normalMatrix`, nombre `mesh_<i>`, deduplicación de texturas, `materialKey`, `alphaMode`, log de fallo de textura, posiciones sin `matrixWorld`, `magFilter`; por etapa: `padBytes`/`toUint8View`/`typedArrayFromList`, límites (`document` fuera de lugar, otro campo de `S`), log no inyectado, bytes de imagen truncados, `traverseVisible`, sin `updateMatrixWorld`, **geometría sin clonar (I-E3)**, copia obsoleta de `S`, cableado de imports, diálogo antes del Blob, textura marcada sucia (E1).

## 6. Desviaciones declaradas respecto de la propuesta
1. **`glb-scene.js` importa `glb-bytes.js`** (`typedArrayFromList`): la propuesta no lo listaba; la función ya lo usaba por nombre desde la clausura. Permitido por la regla 5 (las fábricas solo pueden importar el módulo puro). `a8-limites` lo refleja.
2. **`main.js` desestructura solo `textureToImageBytes`** de `createGlbImage` (`bytesFromDataURL` queda interna) y, tras A8.3, el import de `glb-bytes` pasó de 3 a 2 nombres (`typedArrayFromList` ya no se usa en `main.js`).
3. **N3 usa las imágenes del propio GLB real** (el PNG original de Illustrator no se conservó): el esqueleto es exacto, los píxeles coinciden, los bytes PNG no.
4. Se añadió la prueba **I-E3** (no mutación de geometrías/materiales) a N4 porque, sin ella, un `geometry.clone()` omitido era un mutante equivalente para el resto de pruebas.
5. El comparador de rendimiento A8 añade la exportación **con arte** (`glb_export_arte_ms`).

## 7. Riesgos pendientes
| Riesgo | Estado |
|---|---|
| **A8.4 (constructor)**: 134 líneas con 5 clausuras y todas las invariantes I-G; un identificador mal cableado fallaría solo al ejecutar esa ruta (precedente KI-24) | Mitigado de antemano: N1/N2/N3/N4, regla de identificadores libres, 8 controles ya existentes sobre su texto (orden de claves, imagen antes de accesores, alineación, relleno del JSON, deduplicación, `materialKey`, `alphaMode`, `magFilter`); **requiere su autorización** |
| Igualdad binaria con arte solo en CEP real | A8-CEP no autorizada; mientras tanto, estructural + píxeles + N2 |
| **KI-28** (≥ 125 000 índices ⇒ `RangeError`): límite en Chromium 99 [NO VERIFICADO]; no alcanzable hoy (máx. real 120 índices) | Registrado, no corregido; caracterizado en N4 |
| Rendimiento: una medición dio `construir_ms` +15.9 % (investigar) | **Investigado: ruido** (referencia bimodal); repetición de 20 corridas −0.9 %; resto de métricas OK en todas las etapas (`docs/fase1/a8/rendimiento-A8.*.json`, `…A8.3-INVESTIGACION.md`) |
| Fallo intermitente de precondición visto en A7.0a | No reapareció en 5 baterías completas de A8 |
| Chrome headless ≠ CEP (Chromium 99) | Declarado; las rutas de exportación no usan APIs posteriores a la 99 (`chromium99.test`) |

## 8. Diff previsto del constructor GLB (A8.4) — NO aplicado
Generado en una copia fuera del repositorio con el mismo procedimiento de A8.1–A8.3 (`src/` no se ha tocado).
- **Qué se mueve:** `materialKey` (8 líneas, 723–730 de `a322d7a`) y `buildGLBBlobFromCurrentView` (**134 líneas**, con `appendBytes`, `addAccessorFromTyped`, `ensureSampler`, `ensureTexture`, `ensureMaterial`) → `src/export/glb-builder.js` (≈ 152 líneas), dentro de `export function createGlbBuilder(deps){ var { buildExportSceneMeshes, textureToImageBytes } = deps; … return { materialKey, buildGLBBlobFromCurrentView }; }`, con `import { padBytes, toUint8View } from './glb-bytes.js';`.
- **Texto:** el cuerpo movido, comparado con el actual **sin sangría ni líneas en blanco, es idéntico** (diff vacío en la copia de prueba); solo cambia la sangría (−2 espacios, de 4 a 2).
- **`main.js`:** −143 líneas (las dos funciones y una en blanco) **−1** (el import de `glb-bytes` deja de usarse: solo el constructor usa `padBytes`/`toUint8View`) **+2**: `import { createGlbBuilder } from './export/glb-builder.js';` y, tras `createGlbScene`, `var { buildGLBBlobFromCurrentView } = createGlbBuilder({ buildExportSceneMeshes, textureToImageBytes });` ⇒ ≈ **831 líneas**. `exportGLB` y el manejador no cambian (siguen llamando a `buildGLBBlobFromCurrentView` por nombre).
- **Orden de composición:** `createGlbImage` → `createGlbScene` → `createGlbBuilder` (las dos dependencias existen antes de crear el constructor).
- **Ajustes de prueba (mecánicos):** `a8-limites` (+`glb-builder.js`; `S` ninguno, THREE en `materialKey` y `buildGLBBlobFromCurrentView`), `a8-texto-identico` y `a7-texto-identico` (fábrica nueva, residuales de `main.js`), origen N4, `dist-a8` regenerada, patrón del control A8.1 de cableado de `toUint8View` (el import desaparece de `main.js`).
- **Controles nuevos previstos:** copia obsoleta de dependencias (`createGlbBuilder` recibe copias), `buildExportSceneMeshes` no inyectada, `textureToImageBytes` no inyectada, import de `padBytes` perdido, y re-aplicación de los 16 de A8.0a sobre el nuevo archivo (los patrones son independientes del archivo).
- **Parada y consulta** si cambia un solo byte de N1, falla N3 estructural o algún control no se detecta.

## 9. Estrategia de reversión
- Cada etapa es **un commit autosuficiente** (código + pruebas + huella `dist-a8`, batería completa en verde): se revierte con `git revert` en orden inverso, p. ej. `git revert 6e316d2` (A8.3), luego `6494f94` (A8.2) y `bf5360f` (A8.1). Los commits de pruebas (`c7dee4b`, `5509e84`) no alteran el producto y pueden quedarse.
- El estado validado en real sigue reproducible: `build.test` («HISTÓRICO A7») reconstruye el bundle de `a322d7a` y exige `dist-a7.SHA256SUMS` (`main.js` `9784ec70…`); basta `git checkout a322d7a -- src tests/golden/dist-a8.SHA256SUMS` para volver al código de A7 sin tocar el resto.
- Nada se instaló: no hay nada que revertir en Illustrator ni en `~/Library/.../CEP/extensions`.

## 10. Decisión que se solicita
**Autorizar (o no) A8.4**: mover `materialKey` y `buildGLBBlobFromCurrentView` según el §8, con la batería completa tras el paso y parada si algo falla. **A8.5** (cierre PC9 y procedimiento CEP preparado) y **A8-CEP** (ejecución en Illustrator real) quedan fuera hasta nueva autorización.
