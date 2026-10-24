# Fase 1 · A4 — Primera carga del bundle V3 en Illustrator real: informe

Fecha: 2026-10-23 · Autorización expresa del usuario: 2026-10-23 · Entorno [MEDIDO]: **Illustrator 30.8.2 · CEP 12.1.1 · Chromium 99.0.4844.84 · macOS 26.6.2 · WebGL2 sobre Apple M1 Max**.
Estado: **A4 ejecutado completo y revertido. Rollback verificado. A5 y la refactorización estructural NO iniciados.** Evidencia: `docs/fase1/a4-real/` (fijada por `tests/node/a4-evidencia.test.mjs`). Etiquetas: **[MEDIDO]** en el CEP real · **[INFERENCIA]** · **[NO VERIFICADO]**.

## 1. Resumen
El bundle V3 (`com.tato.tesseract.v3`, `main.js` sha256 `bc260695…b5bd`) se instaló a nivel de usuario, **cargó a la primera** en el CEP real junto a la extensión original, pasó todas las pruebas funcionales conducidas por DevTools, exportó GLB **byte a byte idénticos** a los del baseline congelado, no mostró crecimiento de recursos GPU ni errores de consola, y se retiró con un rollback que dejó el sistema idéntico al estado previo. Se reprodujo en el CEP real el comportamiento conocido de **11 de 13 paneles** (KI-04/KI-22). No se modificó geometría, plegado, materiales, exportadores ni interfaz.

## 2. Cumplimiento de las condiciones
| # | Condición | Resultado |
|---|---|---|
| 1 | Verificar Git, huellas, preflight y aislamiento al inicio | **Cumplido:** Git limpio en `b5d7451`; `dist/` íntegro/reproducible e igual a la huella fijada; `verify-isolation.sh` verde; `a4.sh preflight` = CORRECTO |
| 2 | No modificar la extensión instalada ni el baseline | **Cumplido:** instalada = 15 archivos idénticos al baseline (SHA-256) antes y después; `git diff` de `panel/` y `reference/` vacío |
| 3 | Instalar solo a nivel de usuario, identidad V3, con el parámetro de autorización | **Cumplido:** `a4.sh install --autorizado-por-usuario=2026-10-23 --debug-port=8088` → `~/Library/Application Support/Adobe/CEP/extensions/tesseract-v3`; verificación posterior verde (13 archivos = `dist/`, otras extensiones estructuralmente idénticas al snapshot previo) |
| 4 | Coexistencia, carga, host, Chromium, consola, hash, controles | **Cumplido** (§3, §4) |
| 5 | P-0…P-11 y C1–C6 | §3 y §6 |
| 6 | Solo documentos desechables | **Cumplido:** únicamente N0-A y N0-B (copias en `/tmp`), cerrados sin guardar |
| 7 | Geometría y exportaciones = baseline; 11 paneles | **Cumplido** (§4) |
| 8 | Recursos GPU sin crecimiento acumulativo | **Cumplido** (§5) |
| 9 | No modificar geometría/plegado/materiales/exportadores/interfaz | **Cumplido:** el guion solo pulsa controles de la propia interfaz; lo único sustituido, en la memoria de la página y restaurado, fue el diálogo «Guardar GLB» (ruta temporal fija) |
| 10 | Rollback y verificación de CEP, baseline e instalada | **Cumplido** (§7) |
| 11 | Ante fallo inesperado, detener y revertir | No hubo fallos del producto; las incidencias (§8) fueron de la automatización y se resolvieron sin riesgo |

## 3. Resultados P-0…P-11 [MEDIDO en el CEP real]
| ID | Resultado |
|---|---|
| **P-0** Test Connection | `OK_FROM_ILLUSTRATOR` (puente `evalScript` real funciona) ✅ |
| **P-1** Extracción y validación (N0-A, Caja Botánica ×1,0) | `Extraction complete`, **«✅ No problems found», 0 avisos**; el JSON extraído por el panel es **idéntico** a la familia de fixtures de Illustrator ×1,0 ✅ |
| **P-2** Paso a 3D | `Faces traced: 13 · Panels after shell filter: 13 · Connectivity filter: keeping 11 of 13 panels` ⇒ **11 paneles** (el comportamiento conocido KI-04/KI-22), igual que el golden ✅. Tiempo 546 ms incluyendo 400 ms de espera del guion (construcción ≈ 150 ms). N0-B: «keeping 2 of 3» = golden ✅ |
| **P-3** Base | 11 opciones; base inicial P0; cambio a P1 y vuelta a P0 con el estado correcto ✅ (Shift+clic sobre el lienzo no se probó: se usó el selector; el clic se cubre en la batería de navegador) |
| **P-4** Plegado | 12 sliders; crease seleccionada a 60° y «ALL» a 60° **cambian** la imagen del lienzo y «Reset Flat» vuelve **exactamente** a la imagen inicial (hash del canvas) ✅ |
| **P-5** Espesor | 0.5 → 0.5; 0.25 → «0.3mm» (KI-14 cosmético); 25 → recorta a 20.0; 0.05 → recorta a 0.1; «abc» y vacío → «Thickness must be greater than 0» ✅ |
| **P-6** Presets | White / Kraft / Gray: etiquetas y estado correctos ✅ |
| **P-7** Arte Front/Back (N0-B) | Modo `Layers`; GLB con arte: **2 imágenes PNG**, 6 mallas, 100 × 0,41 × 60 mm; **el documento quedó idéntico antes y después** (capas, visibilidad, bloqueo, artboard activo, selección), en dos ejecuciones ✅. **No pude ver el arte en pantalla** (orientación visual: [NO VERIFICADO]) |
| **P-8** GLB | Dos poses (plano y «ALL» 60°) de la Caja Botánica: 33 436 B y 54 224 B, **SHA-256 idénticos a los exportados por el baseline congelado, `panel/` y el bundle en Chrome headless** (6/6 comparaciones). 0 normales de longitud cero en los 3 GLB (KI-02 no se reproduce). Unidades en mm (KI-03). No se abrió en un visor externo ni se pasó el validador Khronos |
| **P-9** Consola | **0 errores** en la carga (con recarga) y en las 3 sesiones de pruebas; un aviso del navegador provocado por mi propia prueba (valor «abc» en un `input[type=number]`) ✅ |
| **P-10** Fuga | **Sin crecimiento acumulativo**, §5 ✅. Memoria de `CEPHtmlEngine` en el Monitor de Actividad: **no observada** [NO VERIFICADO] |
| **P-11** Coexistencia / comparación con el original | El usuario abrió el plugin ORIGINAL a la vez, extrajo y pasó a 3D en el mismo documento: **«igual y coexisten»** ✅ (observación visual del usuario). V3 siguió con identidad correcta, 0 errores, fuga 0 y `verify` verde con ambos cargados. **No hay comparación numérica con el original**: medirlo exigiría un `.debug` en `/Library/...`, prohibido |

Identidad del panel cargado (DevTools, dos comprobaciones): id `com.tato.tesseract.v3.panel`; host `ILST 30.8.2`; `Chrome/99.0.4844.84 AdobeCEP/12.1.1`; three.js r132; un solo `main.js` (IIFE); **SHA-256 del `main.js` cargado = `dist/`**; URL `…/extensions/tesseract-v3/index.html`.

## 4. Geometría y exportaciones frente al baseline
- Extracción real de la Caja Botánica ×1,0 ⇒ 11 paneles / 10 adyacencias / 0 avisos: coincide con `tests/golden/illustrator-real.golden.json`.
- GLB (CEP real, Chromium 99) = GLB (baseline, Chrome 155 headless) = GLB (`panel/`) = GLB (bundle): **igualdad byte a byte** en 2 poses. Es la mejor evidencia disponible de que el bundle reproduce la referencia sin diferencias de plataforma. La referencia se regenera y se compara en `tests/browser/a4-cdp.test.mjs`.

## 5. Recursos GPU (Chromium 99 real, WebGL2, Apple M1 Max) [MEDIDO]
| Prueba | Resultado |
|---|---|
| `leak_cycles.js`, 6 ciclos (sliders, ALL, Reset, base, espesor, material, rebuild completo) | Δ texturas / buffers / VAOs / programas = **0 / 0 / 0 / 0** en cada ciclo; veredicto **«SIN CRECIMIENTO ACUMULATIVO»**; 25,8 s; 94 eventos de slider por ciclo |
| Repetición con **ambos paneles cargados** (3 ciclos) | 0 / 0 / 0 / 0 |
| `measure_ui.js`: crecimiento por 100 ticks de slider | texturas 0 · buffers 0 · VAOs 0 · heap 0 MB |
| **Control positivo del contador** | Creados 50 + 50 recursos a mano: el contador sube a 50/50 y vuelve a 0 al borrarlos ⇒ la instrumentación funciona en el CEP real (un 0 no es un contador roto) |
| Referencia del baseline (KI-01) | Crece +1111 / +5050 / +2020 por 100 ticks (Chrome headless, A3). **No se pudo medir el baseline dentro del CEP** (requeriría `.debug` en la extensión instalada) |
Otras medidas del CEP real: plegado por tick **mediana 0,7 ms, p95 1,3 ms, máx. 1,6 ms**; «Continue to 3D» síncrono 18,2 ms; **FPS 30,4 en reposo y orbitando** (peor cuadro 33,3 ms; en headless 60) [INFERENCIA: límite de refresco del compositor de CEF para paneles; no medido en el plugin original]; heap JS constante en 9,5 MB [NO VERIFICADO: `performance.memory` de CEF puede estar cuantizado]. `extraccion_ms` (5,5) y `continuar_a_3d_hasta_listo_ms` (0) de `measure_ui.js` **no son fiables** (la sonda leyó un estado previo); los tiempos de §3 sí.

## 6. Criterios de aceptación
| Criterio | Resultado |
|---|---|
| C1 Instalación/`verify` correctos; otras extensiones (incl. «Tesseract») idénticas al snapshot | ✅ |
| C2 Panel carga en Illustrator 30.8.2; identidad correcta (Chromium 99, SHA-256) | ✅ |
| C3 P-0…P-9 sin diferencias salvo las conocidas (KI-03, KI-04/22, KI-14) | ✅ con tres reservas no verificables: orientación visual del arte, GLB en un visor externo/validador Khronos, Shift+clic sobre el lienzo |
| C4 Fuga 0 en el Chromium real y consola sin errores | ✅ (memoria del proceso en el Monitor de Actividad: no observada) |
| C5 Cero modificaciones a documentos reales; desechables sin guardar; Illustrator sin documentos al terminar | ✅ (Illustrator relanzado con 0 documentos) |
| C6 Rollback probado y aislamiento estricto en 0 | ✅ |
**A4: ACEPTADO con las reservas anotadas.**

## 7. Rollback y estado final [MEDIDO]
`a4.sh rollback --autorizado-por-usuario=2026-10-23` (Illustrator cerrado por el usuario): borró solo `…/extensions/tesseract-v3`; **snapshot posterior = snapshot previo** (idéntico); `verify-isolation.sh` estricto verde (baseline íntegro, instalada idéntica al baseline, V3 no instalada). Comprobación independiente: `~/Library/Application Support/Adobe/CEP/extensions/` solo contiene `TesserArt_Validator`; plugin instalado: 15 archivos idénticos al baseline; puerto 8088 libre; Git: `panel/` y `reference/` sin cambios; Illustrator relanzado con 0 documentos.
**Residuo declarado:** Illustrator creó por sí mismo la entrada de caché `~/Library/Caches/CSXS/cep_cache/ILST_30.8.2_com.tato.tesseract.v3.panel` al cargar el panel. No es parte del directorio de extensiones ni afecta al aislamiento (hay entradas equivalentes de versiones antiguas del plugin original); no la he borrado por quedar fuera de lo autorizado. Temporales míos eliminados: PNG `N0-B_*` de `Folder.temp/tesseract_art` y `/private/tmp/tesseract_a4` (los GLB están copiados en la evidencia).

## 8. Incidencias
1. **Illustrator rechazó mi orden de cierre** (`-128`) y **no hay permiso de accesibilidad** (`-1719`) para pulsar menús ni capturar la pantalla: el cierre/reinicio de Illustrator y la apertura del panel y del plugin original los hizo el usuario (previsto en el procedimiento; las preguntas se hicieron con Illustrator en 0 documentos).
2. **Al relanzar, apareció abierto un documento desechable `N0-B…svg`** sin que yo lo abriera (sin cambios; [INFERENCIA] restauración de sesión de Illustrator). La guarda de `a4-open` (exige 0 documentos) abortó correctamente y su limpieza lo cerró sin guardar; el resto de pasos se hizo después con 0 documentos. Solo ocurrió en el primer relanzamiento; en el relanzamiento final no reapareció.
3. `Runtime.enable` reproduce mensajes antiguos de consola: los conteos de eventos (59 → 401) incluyen repeticiones; los errores se cuentan aparte (0).
4. Fallos de mis herramientas/pruebas, ya corregidos y probados: guarda `process.argv[1]` indefinido en `node -e`; el cliente CDP de pruebas dejaba un temporizador de 5 min; **carrera real entre archivos de prueba que reconstruían `dist/` a la vez** (`ENOENT` intermitente; ahora `tests/lib/dist.mjs` con candado y reconstrucción solo si `dist/` no coincide con las huellas). No hay efectos en el producto.
5. El `extraccion_ms` de `measure_ui.js` no es fiable (ver §5).

## 8b. Pruebas tras A4 [MEDIDO]
`tests/run-all.sh --mutations` ⇒ **TODO EN VERDE**: Node **233/233**, navegador **44/44**, Chromium-99 con APIs reducidas **4/4**, herramienta CDP de A4 **7/7**, controles negativos **26/26** (11 + 10 + 5). La evidencia de A4 tiene además 3 controles negativos manuales (hash de referencia, resto en el rollback, veredicto de fuga), todos detectados.

## 9. Qué no se verificó [NO VERIFICADO]
Orientación/colores del arte a simple vista; apertura del GLB en un visor externo y validador Khronos; Shift+clic sobre el lienzo en el CEP real; memoria del proceso `CEPHtmlEngine`; comparación numérica de rendimiento con el plugin original dentro del CEP; comportamiento tras la caché residual al reinstalar; Windows; troqueles reales de trabajo distintos de la Caja Botánica y arte complejo.

## 10. Hallazgos para los KI
KI-01: la corrección se **confirma en el CEP real** (Δ=0, con control positivo). KI-04/KI-22: reproducidos en el CEP real (11 de 13, sin avisos). KI-03: GLB en mm, confirmado. KI-02: **no** se reproduce (0 normales nulas en 3 GLB). KI-11: el CEP real limita a ≈ 30 FPS. KI-14: `0.25 → 0.3mm` visible en el panel real. KI-10/21/23: sin cambios (no ejercitados).

## 11. Recomendación para el siguiente punto de control (PC5)
1. **Aprobar A4** y mantener las reservas de §9 como tareas explícitas (la más barata: que el usuario mire el arte y abra un GLB en Blender/Dimension).
2. **No avanzar a A5 todavía** sin decidir el orden de trabajo: lo que más valor aporta ahora es **KI-22 (crítico, F2/2A)** porque cambia resultados reales; A5 (`bridge`) y A6 (`core/legacy` + `GeometryEngine`) son refactorización estructural con riesgo de regresión que ahora tiene una red de seguridad fuerte (225+ pruebas, GLB idéntico en CEP real).
3. Ambas líneas de trabajo (2A de geometría y A5–A7) deben ir a **Opus en un chat nuevo** con `HANDOFF.md` y los commits; propongo empezar por 2A con la familia de fixtures ×1,0 como criterio de aceptación (13/11 paneles dependiente de la escala, sin parches ad hoc) y los GLB idénticos como guarda de no regresión.
4. Decisión pendiente del usuario: si la herramienta A4 debe quedar disponible para futuras cargas (sigue exigiendo `--autorizado-por-usuario`).
