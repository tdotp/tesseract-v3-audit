# Fase 1 · A8 — Exportación GLB a `src/export/`: informe de cierre (punto de control PC9)

Fecha: 2026-10-26 · Autorización: A8.0a–A8.3 (autorización parcial del 2026-10-26, `A8_PROPUESTA.md` §16); A8.4–A8.5 aprobadas conceptualmente el 2026-10-26 y autorizadas en un chat nuevo de Opus High, **sin ampliar alcance** · Base: `a322d7a` (A7 validada en CEP real) · Cierre: commit de A8.5 (ver `git log`).
Estado: **A8 completada dentro del alcance aprobado. Nada instalado ni cargado en Illustrator. A8-CEP, A9 y F2 NO iniciadas.** Etiquetas: **[MEDIDO]** · **[CONFIRMADO]** · **[INFERENCIA]** · **[NO VERIFICADO]**.

## 1. Resumen
Las 8 funciones de la exportación GLB salen de la clausura de `src/main.js` a **4 módulos** de `src/export/` **con su texto idéntico** (solo cambian la sangría y `export`). `exportPNG`, `exportGLB` y el manejador del botón «Export GLB» siguen en `main.js` (D-A8-2). `main.js` pasa de 1 078 (A7) a **830 líneas**. Ningún algoritmo, condición, orden de claves, disposición de buffers, material, imagen, nodo, matriz, metadato, relleno, tratamiento de errores ni defecto conocido cambia. El GLB **sin arte** es idéntico **byte a byte** a los dos archivos exportados por Illustrator real; el GLB **con arte** es **estructuralmente idéntico y con 0 píxeles distintos**, y su igualdad **binaria** con el archivo real (`b4973a54…`) queda **pendiente de A8-CEP** (Chrome headless codifica los PNG con otro compresor).

## 2. Commits
| Commit | Paso | Contenido | `src/` |
|---|---|---|---|
| `92e2511` | — | Propuesta + autorización parcial + batería previa sobre `a322d7a` | no |
| `c7dee4b` | **A8.0a** | Caracterización: N1–N4, E1–E6, golden de estructura (solo desde el baseline), 27 controles; **KI-28 registrado** | no |
| `5509e84` | **A8.0b** | Andamiaje: `a8-texto-identico`, `a8-limites`, huella vigente `dist-a8`, `a8-perf`, `a8-equivalencia` | no |
| `bf5360f` | **A8.1** | `src/export/glb-bytes.js` | sí |
| `6494f94` | **A8.2** | `src/export/glb-image.js` | sí |
| `6e316d2` | **A8.3** | `src/export/glb-scene.js` + I-E3 en N4 | sí |
| `5d40093` · `b490c27` | — | Punto de control previo a A8.4 y handoff para el chat nuevo | no |
| `7c95b0b` | **A8.4** | `src/export/glb-builder.js`; orden de carga explícito en N4; 5 controles nuevos; `dist-a8` regenerada | sí |
| (A8.5) | **A8.5** | Este informe, procedimiento CEP preparado y su prueba, evidencia, `KNOWN_ISSUES`, `tests/README`, `HANDOFF`, estado de la propuesta | no |
Un solo autor, sin trailers de IA, sin remoto ni push. Cada paso con código se cerró con `tests/run-all.sh --mutations --soak` en verde y el rendimiento leído **antes** del commit (salidas en `docs/fase1/a8/run-all-A8.*.txt` y `rendimiento-A8.*.json`).

## 3. Arquitectura final de `src/export/` [MEDIDO]
```
src/export/
  glb-bytes.js    21 l.  padBytes · toUint8View · typedArrayFromList                            puro: sin THREE, DOM, window ni S        importa: —
  glb-image.js    44 l.  createGlbImage({ log }) → { bytesFromDataURL, textureToImageBytes }    DOM solo en textureToImageBytes          importa: —
  glb-scene.js    66 l.  createGlbScene(S) → { buildExportSceneMeshes }                         THREE; solo S.scene3d                    importa: glb-bytes (typedArrayFromList)
  glb-builder.js 154 l.  createGlbBuilder({ buildExportSceneMeshes, textureToImageBytes })
                           → { materialKey, buildGLBBlobFromCurrentView }                       THREE (Color, DoubleSide), TextEncoder,  importa: glb-bytes (padBytes, toUint8View)
                                                                                                Blob; sin S ni DOM
```
Dependencias: `glb-bytes` ← `glb-scene`, `glb-builder`; `glb-builder` recibe **inyectadas** las funciones de `glb-image` y `glb-scene`. Sin ciclos; ninguna fábrica importa otra fábrica; nada de `export/` importa `main.js`, `host/`, `bridge/`, `scene/`, `fold/`, `core/`, `app/` ni `config/` (`a8-limites`).
**Raíz de composición** (`main.js`, tras `createFolding`): `var { textureToImageBytes } = createGlbImage({ log });` → `var { buildExportSceneMeshes } = createGlbScene(S);` → `var { buildGLBBlobFromCurrentView } = createGlbBuilder({ buildExportSceneMeshes, textureToImageBytes });`. `exportGLB` y el manejador siguen llamando a `buildGLBBlobFromCurrentView` por su nombre.

## 4. Funciones extraídas y cambios en `main.js` [MEDIDO]
| Función | Paso | Destino | Cambio de texto |
|---|---|---|---|
| `padBytes`, `toUint8View`, `typedArrayFromList` | A8.1 | `glb-bytes.js` | sangría y `export` |
| `bytesFromDataURL`, `textureToImageBytes` | A8.2 | `glb-image.js` (fábrica) | sangría |
| `buildExportSceneMeshes` | A8.3 | `glb-scene.js` (fábrica) | sangría (ya tenía `S.` desde A7) |
| `materialKey` (8 l.), `buildGLBBlobFromCurrentView` (134 l., clausuras `appendBytes`, `addAccessorFromTyped`, `ensureSampler`, `ensureTexture`, `ensureMaterial`) | **A8.4** | `glb-builder.js` (fábrica) | **solo sangría (−2 espacios)**: el texto movido, con sus líneas en blanco, es idéntico al anterior quitada esa sangría (`diff` vacío, ensayado en una copia y aplicado igual) |
`main.js` en A8.4: 973 → **830** líneas (salen las dos funciones y una línea en blanco; el import de `glb-bytes` se **sustituye** por el de `glb-builder` porque solo el constructor usaba `padBytes`/`toUint8View`; entra 1 línea de composición). En todo A8: 1 078 → 830. Siguen en `main.js`: `exportPNG`, `exportGLB`, el manejador (KI-25) y el import de `saveBlobWithDialog`.

## 5. Pruebas [MEDIDO]
| Batería | Antes de A8 (`a322d7a`) | Cierre de A8.3 | **Cierre de A8.4** (`run-all-A8.4.txt`) |
|---|---|---|---|
| Node | 447 (446 + 1 omitida; `run-all-precheck-a322d7a.txt`) | 519 (518 + 1) | **520** (519 + 1): + orden de carga de N4 |
| Navegador `browser` (con `--soak`) · `a7` · **`a8`** | 56 (52 sin `--soak` en la batería previa) · 13 · — | 56 · 13 · 31 | **56 · 13 · 31** |
| Chromium-99 · puente CEP · `a5-observar` · A4-CDP | 4 · 6 · 3 · 7 | 4 · 6 · 3 · 7 | **4 · 6 · 3 · 7** |
| Controles negativos (Node · navegador · bundle) | 57 (24 · 27 · 6) | 103 (54 · 43 · 6) | **108 (57 · 45 · 6)**, ninguno «NO APLICÓ» ni «NO DETECTADA» |
| Aislamiento | verde | verde | verde |
La batería final de cierre (A8.5) se resume en §13. **Soak:** GPU Δ=0 tras 25 ciclos de plegado en `panel/` y bundle (caja e ill, con y sin arte) en cada batería; el baseline crece (control positivo de KI-01).

### N1–N4 y E1–E6 al cierre de A8.4
| Nivel | Qué | Resultado |
|---|---|---|
| **N1** | GLB sin arte de baseline, `panel/` y bundle = archivos de Illustrator **real** (`Buffer.equals`) | ✅ 3 objetivos × 2 poses: plano `737bcd2312da1191…` (33 436 B) y todas a 60° `87aa2e4c5cc39092…` (54 224 B) |
| **N2** | baseline = `panel/` = bundle en 6 estados con y sin arte × 2 fixtures; exportación repetida = mismos bytes | ✅ |
| **N3** | GLB con arte real de N0-B | ✅ estructural y píxeles; binario: ver §6 |
| **N4** | 8 funciones de baseline, `panel/` y `src/` (**los 4 módulos reales**) sobre 44 escenas de three r132 real: Uint16/Uint32 y frontera 65 534/65 535, sin normales/UV/índice, opacidad 0.005/0.01, roles, nombres, deduplicación, texturas compartidas/sin tamaño/con fallo, jerarquías con TRS, orden de recorrido, alineación, I-E3 (no muta geometrías ni materiales), origen de cada función y **KI-28** (`RangeError` idéntico en los tres) | ✅ **51/51** (50 + orden de carga) |
| **E1/E2** | Exportar 5 veces con arte no cambia la escena ni `renderer.info.memory` | ✅ ×3 objetivos |
| **E3** | Determinismo | ✅ (en N2) |
| **E4/E5** | Mensajes de estado (KI-25 intacto), cancelación, error de escritura, «Nothing exportable», «Build 3D first», fallo de textura con log, orden **Blob → diálogo → escritura** | ✅ ×3, idénticos entre sí |
| **E6** | Estructura del GLB en 4 fixtures × poses + arte; golden **solo desde el baseline** (`glb-structure.golden.json`, fijado por `a8.pins.json`, **no regenerado**) | ✅ |

### Ajustes de pruebas en A8.4 (mecánicos; ninguno reduce la detección)
1. **Cargador de N4 (`tests/lib/a8.mjs`)**: `srcFiles()` devuelve orden alfabético y `glb-builder.js` se cargaba **antes** que `glb-image.js` y `glb-scene.js`. **Medido** al aplicar A8.4 con el cargador sin cambiar: todos los casos fallaban con `TypeError: buildExportSceneMeshes is not a function`. Ahora el orden es **explícito** (`MODULE_ORDER`, = orden de composición de `main.js`), el adaptador de `glb-builder.js` **lanza** si alguna dependencia no es una función, `orderExportFiles` rechaza cualquier módulo de `export/` sin lugar en el orden, y una prueba nueva fija que el orden es el de composición de `main.js` e independiente del alfabético.
2. `a8-limites`: inventario + `glb-builder.js` (sus reglas ya existían). `a8-texto-identico` y `a7-texto-identico`: fábrica nueva y residuales de `main.js` (el import de `glb-bytes` sustituido por el de `glb-builder` y la línea de composición), igualdad exacta. N4: origen de `materialKey` y `buildGLBBlobFromCurrentView` = `export/glb-builder.js`.
3. Control reubicado: «A8.1 · cableado: … no importa `toUint8View`» aplicaba a `main.js`, cuyo import desapareció; ahora aplica a `glb-builder.js` (mismo cambio, misma prueba N1).

### Controles negativos nuevos de A8.4 (5), todos con un fallo real que ve al menos una prueba
| # | Mutación | La detecta |
|---|---|---|
| 1 | `createGlbBuilder` ignora `textureToImageBytes` inyectada (queda `undefined`: fallaría solo con textura, como KI-24) | N4 |
| 2 | `createGlbBuilder` ignora `buildExportSceneMeshes` inyectada (devuelve `[]`) | N4 |
| 3 | `glb-builder.js` usa `document` | **solo** `a8-limites` (comprobado: el texto de la fábrica no lo vigila ninguna otra prueba) |
| 4 | `glb-builder.js` pierde el import de `padBytes` (el bundle se construye; `ReferenceError` al exportar) | N1 (bundle) |
| 5 | `main.js` inyecta otra `textureToImageBytes` (devuelve `null`: GLB sin imágenes) | N3 (bundle) |
Además, los **16 patrones de A8.0a** sobre el texto del constructor siguen detectándose sobre el archivo nuevo (los patrones no dependen de la ruta), y los 33 controles Node de A8 se probaron antes de la batería con un script temporal: 33/33.

## 6. Equivalencia del GLB: binaria, estructural y visual, por separado [MEDIDO tras el commit de A8.4, `docs/fase1/a8/glb-n1-n3-A8.4.json`]
**Sin arte — BINARIA (exigida y cumplida):** N1, `Buffer.equals` contra los dos archivos reales, para baseline, `panel/` y bundle A8 (`main.js` `4addceb7…`). Es la igualdad que A4–A7 obtuvieron en el CEP real.
**Con arte — tres niveles que no se mezclan:**
| Nivel | Criterio | baseline | `panel/` | bundle A8 |
|---|---|---|---|---|
| **Estructural** (exigido) | JSON idéntico salvo desplazamientos y longitud de imagen; mismo orden de claves; 26 vistas; **0 vistas no-imagen distintas**; alineación y relleno correctos | ✅ | ✅ | ✅ |
| **Visual** (exigido como «0 píxeles») | 2 imágenes 3176 × 2264 decodificadas: píxeles distintos / máx. diferencia de canal | 0 / 0 (×2) | igual | igual |
| **Binaria frente al archivo real** (NO comparable en headless) | archivo = `b4973a54840cd0c1…` (295 440 B) | ❌ 299 720 B (`b3f56d4c…`) | ❌ igual | ❌ igual |
| **Binaria entre los tres objetivos** (misma sesión de Chrome) | baseline = `panel/` = bundle | — | ✅ | ✅ |
La única diferencia binaria con el archivo real son los **bytes de los dos PNG** (145 407 y 145 400 B frente a 144 353 y 142 172 B en el real): mismo mapa de píxeles, otro compresor. **No es un éxito binario ni un fallo**: «binario no comparable en headless; estructural y píxeles idénticos; pendiente en CEP real» (V-4 de A8-CEP).

## 7. Equivalencia de texto y de bundle [MEDIDO]
**Texto:** `a8-texto-identico`: toda función (a cualquier sangría) del `src/` de `a322d7a` existe en el `src/` actual con el mismo texto salvo sangría, `export` y `S.`; las 8 funciones de exportación existen **exactamente una vez**; solo se añaden `createGlbImage`, `createGlbScene` y `createGlbBuilder`; las líneas sueltas de `main.js` cambian exactamente como se previó. `a7-texto-identico` sigue en verde con la fábrica nueva.
**Bundle función a función** (`tests/tools/a8-equivalencia.sh` y `a7-bundle-eq.mjs`):
| Comparación | Idénticas | Distintas · duplicadas · perdidas | Nuevas |
|---|---|---|---|
| `a322d7a` (A7 validada en real) → A8.4 | **141/141** | 0 · 0 · 0 | `createGlbBuilder`, `createGlbImage`, `createGlbScene` |
| A8.3 → A8.4 | **143/143** | 0 · 0 · 0 | `createGlbBuilder` |
**Diferencias del bundle A8.3 → A8.4 explicadas:** `main.js` 2 930 → 2 937 líneas, 128 114 → 128 140 B. El módulo `glb-builder.js` entra en el bundle tras `glb-bytes.js` (orden de los imports de `main.js`), lo que desplaza `glb-image.js` y `glb-scene.js`; las líneas nuevas son el envoltorio de la fábrica y la línea de composición; ninguna función cambia. Frente al bundle de `a322d7a` (2 915 líneas, 130 364 B) el de A8 es más corto en bytes [INFERENCIA: menos sangría al salir las funciones de la clausura]. Ninguno de los módulos de `export/` tiene efectos al cargarse, así que el orden de los módulos en el bundle no cambia el comportamiento [INFERENCIA respaldada por N1–N4 y E1–E6].

## 8. Rendimiento [MEDIDO en Chrome headless 155 / M1 Max; piso optimista, no CEP]
`tests/tools/a8-perf.mjs`: bundle de `a322d7a` (A7) frente al actual, corridas **intercaladas** en la misma sesión, Caja Botánica real. Mediana; entre paréntesis la degradación (positivo = peor; en FPS, menos es peor). Umbral D-A8-7: > +10 % investigar, > +25 % detener.
| Medición | construir ms | reconstruir ms | tick ms | GLB ms | GLB con arte ms | FPS reposo | FPS órbita |
|---|---|---|---|---|---|---|---|
| A8.0b ruido (A7↔A7, 10) | 38.65 → 38.8 (+0.4 %) | 1.578 → 1.62 (+2.7 %) | 0.348 → 0.351 (+0.7 %) | 5.9 → 5.8 (−1.7 %) | 393.2 → 393.35 (0 %) | 61.25 → 60.95 (+0.5 %) | 60.8 → 60.8 (0 %) |
| A8.1 (10) | 39.2 → 39.75 (+1.4 %) | 1.59 → 1.593 (+0.2 %) | 0.348 → 0.35 (+0.9 %) | 5.8 → 5.8 (0 %) | 392.65 → 391.2 (−0.4 %) | 61.15 → 61.3 (−0.2 %) | 60.8 → 60.8 (0 %) |
| A8.2 (10) | 36.05 → 37.6 (+4.3 %) | 1.605 → 1.638 (+2 %) | 0.355 → 0.356 (+0.1 %) | 5.7 → 5.8 (+1.8 %) | 395.4 → 396.3 (+0.2 %) | 61.05 → 61.2 (−0.2 %) | 60.8 → 60.8 (0 %) |
| A8.3 (10) | 34.5 → 40 (**+15.9 %**) | 1.553 → 1.567 (+1 %) | 0.352 → 0.35 (−0.6 %) | 5.8 → 5.8 (0 %) | 395.8 → 393.9 (−0.5 %) | 61 → 61 (0 %) | 60.8 → 60.8 (0 %) |
| A8.3 repetición (20) | 38.8 → 38.45 (−0.9 %) | 1.533 → 1.558 (+1.6 %) | 0.354 → 0.355 (+0.3 %) | 5.9 → 5.9 (0 %) | 391.75 → 392.4 (+0.2 %) | 61.1 → 61 (+0.2 %) | 60.8 → 60.8 (0 %) |
| **A8.4 (10)** | 37.6 → 38.4 (+2.1 %) | 1.54 → 1.543 (+0.2 %) | 0.342 → 0.346 (+1.1 %) | 5.3 → 5.3 (0 %) | 389.2 → 387.65 (−0.4 %) | 61.25 → 61 (+0.4 %) | 60.7 → 60.7 (0 %) |
**Metodología:** misma sesión de Chrome, bundles alternados, mediana de N corridas, ruido medido con dos bundles idénticos (±5 %). La lectura «investigar» de A8.3 vino de una **referencia bimodal** (34.5 ms frente a ≈ 38–39 en el resto de lecturas); con 20 corridas, −0.9 % (`rendimiento-A8.3-INVESTIGACION.md`). En A8.4 ninguna métrica supera el ruido, así que no hizo falta repetir con 20. La resolución de `glb_export_ms` es de 0.1 ms sobre ≈ 5 ms (2 %), por debajo del umbral. El resultado de A8.4 se leyó **antes** del commit.
**GPU:** E2 (exportar 5 veces no cambia `renderer.info.memory`) y el soak (Δ=0 en 25 ciclos) en cada batería. En real, A7-CEP dio Δ=0 sin arte; la GPU **con arte** en real sigue sin medir.

## 9. Huellas y referencias
| Huella / referencia | Estado |
|---|---|
| `tests/golden/dist-a8.SHA256SUMS` (**vigente**) | `main.js` = `4addceb7fb8c6dd662a460fb4c8e9c25ad9d715ad1e883e10a66acc858a552bd`; se regeneró **después** de comparar el bundle, verificar funciones, N1–N3 y E1–E6 en navegador; los otros 12 archivos, idénticos a A7 |
| `dist-a7` (A7 validada en real, `9784ec70…`), `dist-a6`, `dist-a5`, `dist` (A3/A4) | **Intactas**; `build.test` reproduce A5, A6 y A7 desde sus commits |
| `panel.pins.json`, `fixtures.pins.json`, goldens `geometry`, `geometry-logs`, `constants`, `glb`, `illustrator-real`, `scene-inventory`, `a6.pins`, `a7.pins`, `reference/`, fixtures | **Sin cambios desde `a322d7a`** (`git diff` vacío) |
| `glb-structure.golden.json` + `a8.pins.json` (A8.0a) | **Sin cambios desde A8.0a** (no se regeneró) |

## 10. Incidencias
1. **Orden de carga del cargador de N4** (riesgo anticipado en el handoff): medido y corregido como se describe en §5; no afecta al producto.
2. **Fallo transitorio de `a4-herramienta` con la huella aún sin regenerar** (A8.4, primera corrida de Node tras construir): «FALLA las huellas de dist no coinciden / falta BUILD_INFO.json». Causa medida en el código: mientras `dist/SHA256SUMS` ≠ `dist-a8`, **cada** `ensureDist()` de cada archivo de prueba reconstruye `dist/`, y como `node --test` ejecuta archivos en paralelo, uno borraba `dist/` mientras otro lo leía. Aislado, el test pasó 7/7; con la huella regenerada (que es el orden aprobado: comparar → verificar → regenerar), la suite completa pasó 520/520 y la batería entera también. Es un efecto del estado intermedio del procedimiento, no del producto ni de A8.4. Se conserva para el registro; no se cambió el arnés.
3. Ninguna mutación «NO APLICÓ» ni «NO DETECTADA»; el fallo intermitente de precondición de A7.0a no reapareció en ninguna de las baterías completas de A8 (`docs/fase1/a8/run-all-*.txt`).

## 11. Defectos conocidos y riesgos
- **Ningún defecto cambia.** KI-01 (Δ=0), KI-02 (no reproducido en la batería), KI-03 (mm, `roughness 1`, generador `Tesseract Phase 7B`), KI-04/KI-22 (11 de 13), KI-06, KI-11, KI-13, KI-14, KI-24, KI-25 (mensaje final del GLB, también al cancelar), KI-26, KI-27 y **KI-28** (`RangeError` con ≥ 125 000 índices, caracterizado en N4, **no corregido**), preservados.
- **Riesgos abiertos:** (a) igualdad **binaria** del GLB con arte solo comprobable en CEP real; (b) el límite de KI-28 en Chromium 99 [NO VERIFICADO] (inalcanzable hoy: máximo real 120 índices); (c) Chrome headless 155 ≠ Chromium 99 de CEP (las rutas de exportación no usan APIs posteriores a la 99: `chromium99.test`); (d) KI-13: la exportación con arte tarda ≈ 390 ms en headless (≈ 1.4 s medidos antes con arte de 4096 px); (e) el diálogo «Save GLB» real no se ha vuelto a ejercitar desde A5 (A8 no lo tocó, pero `exportGLB` llama ahora al constructor inyectado): lo cubre V-5 de A8-CEP.
- **Lagunas de cobertura** (`KNOWN_ISSUES.md` § A8): `material.version` excluida de E1; codificador PNG simulado en N4; cableado del constructor (**cubierto** desde A8.4).

## 12. Qué NO se verificó [NO VERIFICADO]
El bundle de A8 **no se cargó en Illustrator/CEP real** (no autorizado): ni la igualdad binaria con arte, ni el diálogo real, ni la GPU con arte, ni rendimiento/FPS en real. Tampoco: validador Khronos (KI-02), Windows, troqueles de trabajo distintos de los fixtures, el límite de `Math.max.apply` en Chromium 99.

## 13. Batería final de cierre (A8.5)
`tests/run-all.sh --mutations --soak` sobre el árbol de A8.5 (código = `7c95b0b`; A8.5 solo añade documentos y `a8-cep-preparacion`), salida `docs/fase1/a8/run-all-cierre-A8.txt`, **`EXIT=0`, TODO EN VERDE** [MEDIDO]:
| Batería | Resultado |
|---|---|
| Aislamiento | verde (baseline = manifiesto, extensión instalada = baseline, `panel/` con las diferencias esperadas, V3 no instalada) |
| Node | **526** (525 + 1 omitida a propósito): + 6 de `a8-cep-preparacion` |
| Navegador | `browser` 56 (con `--soak`) · `a7` 13 · **`a8` 31** · Chromium-99 4 · puente CEP 6 · `a5-observar` 3 · A4-CDP 7 |
| Controles negativos | Node **57** · navegador **45** · bundle **6** = **108/108**, ninguno «NO APLICÓ» ni «NO DETECTADA» |
Después de la batería: `tools/verify-isolation.sh` verde; `dist/` = `dist-a8` (13/13); `dist-a7`, `dist-a6`, `dist-a5`, `dist`, `panel.pins.json`, goldens, fixtures y `reference/` sin diferencias con `a322d7a`; `glb-structure.golden.json` y `a8.pins.json` sin cambios desde A8.0a; `src/`, `tools/` y las huellas sin cambios desde `7c95b0b`; CEP del usuario: solo `TesserArt_Validator`.

## 14. Validación corta en Illustrator real (preparada, NO ejecutada)
`docs/fase1/A8_VALIDACION_CEP_PROCEDIMIENTO.md`: V-1 identidad (`main.js` = `4addceb7…`), carga y consola en Chromium 99 · V-2 paridad de la caja N0-A (extracción, 11 de 13, plegado) contra la evidencia **real de A7** · V-3 GLB `737bcd23…`/`87aa2e4c…` · V-4 arte en N0-B y **GLB con arte = `b4973a54…` byte a byte** · V-5 diálogo «Save GLB» real (guardar y cancelar, KI-25) · V-6 integridad de N0-B, cierre, aislamiento y rollback · V-7 (complementario) GPU Δ=0. `tests/node/a8-cep-preparacion.test.mjs` comprueba las referencias reales de A7, el comparador (A6 real = A7 real), los hashes completos de los tres GLB reales y que el procedimiento cita `dist-a8` y su `main.js`. **Requiere autorización expresa y fechada.**

## 15. Punto de control PC9 — decisiones del usuario
1. Aceptar A8 (A8.0a–A8.5) con N1–N4 y E1–E6 cumplidos, la igualdad binaria con arte declarada como pendiente y las incidencias de §10.
2. Autorizar (con fecha), o no, la validación corta en CEP real del §14 (A8-CEP).
3. Siguiente paso: A9 (UI) o F2/2A (KI-22). **Ninguno se inicia sin nueva autorización.**
