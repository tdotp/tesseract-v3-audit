# A5-CEP — Validación corta del bundle A5 en Illustrator CEP real: informe

Fecha: 2026-10-24 · Autorización expresa del usuario: «Autorizo instalar temporalmente la extensión aislada `com.tato.tesseract.v3` a nivel de usuario, exclusivamente para esta validación, con rollback obligatorio. Fecha de autorización: 2026-10-24.»
Base: `46aedbd` (procedimiento `A5_VALIDACION_CEP_PROCEDIMIENTO.md`, commit `a776957`). Entorno [MEDIDO]: **Illustrator 30.8.2 · CEP 12.1.1 · Chromium 99.0.4844.84 · macOS 26.6.2**.
Estado: **VALIDACIÓN COMPLETADA: V-1…V-6 superados. V3 instalada temporalmente y RETIRADA (rollback verificado).** Evidencia: `docs/fase1/a5-real/`, fijada por `tests/node/a5-cep-evidencia.test.mjs` (6/6).
Etiquetas: **[MEDIDO]** · **[CONFIRMADO]** (por el usuario) · **[INFERENCIA]** · **[NO VERIFICADO]**.

## 1. Resumen
El bundle de A5 (fuente modular `src/`, `main.js` `70de82a8…`) cargó en el CEP real y se comportó **exactamente como el bundle de A4**. En extracción, arte y GLB coincidió con A4 **byte a byte**; también las imágenes del lienzo. El diálogo «Save GLB» real de Illustrator funcionó desde el panel al guardar y al cancelar. Los cuatro textos ExtendScript que A5 movió a `src/host/` llegaron a Illustrator idénticos al baseline. No hubo errores de consola, el documento de prueba quedó intacto y el rollback dejó el sistema como estaba. Hubo una incidencia de entorno al principio, ajena al bundle (§6).

## 2. Verificación previa [MEDIDO]
Git limpio en `46aedbd`; `dist/` reconstruido = `tests/golden/dist-a5.SHA256SUMS`; `verify-isolation.sh` estricto verde; baseline 15/15; referencia A1 14/14; goldens, fixtures, `reference/`, `panel/` y `src/` sin cambios; CEP de usuario solo con `TesserArt_Validator`; `a4.sh preflight` → **PREFLIGHT CORRECTO**. Los restos de la ejecución de A4 en `tests/results/a4/` (no versionados y ya archivados en `docs/fase1/a4-real/`, comprobado con `cmp`) se apartaron a `tests/results/a4-ejecucion-2026-10-23/`.

## 3. Resultados V-1…V-6
| ID | Resultado | Evidencia |
|---|---|---|
| **V-1** Carga, identidad y consola | ✅ `INSTALACIÓN CORRECTA` y `VERIFY CORRECTO`; las demás extensiones, incluida «Tesseract», estructuralmente idénticas al snapshot. **IDENTIDAD CORRECTA en el CEP real:** id `com.tato.tesseract.v3.panel`, host ILST 30.8.2, `Chrome/99.0.4844.84 AdobeCEP/12.1.1`, three r132, un solo `main.js`, **SHA-256 del `main.js` cargado = `70de82a8…` (A5)**. **0 errores** de consola desde la carga (panel recargado) | `install-record.json`, `cdp-identity-*.json`, `cdp-console-*.json` |
| **V-2** Conexión y extracción | ✅ Test Connection = `OK_FROM_ILLUSTRATOR`. Extracción de N0-A (Caja Botánica ×1,0): «✅ No problems found», 0 avisos, **JSON idéntico byte a byte al de A4**. 3D: **11 de 13 paneles** (KI-04/KI-22, preservado). Además, igual que A4: base (P-3), espesor (P-5), presets (P-6) y los **hashes del lienzo** plano / 60° / tras Reset (P-4) | `paridad-caja-*.json`, `extraccion-panel-caja.json` |
| **V-3** Diálogo «Save GLB» real | ✅ El diálogo **real** de Illustrator se abrió 5 veces desde el panel: **4 guardados** con `err 0` y archivo en disco, **1 cancelado** sin escritura. Historial del cancelado: `Exporting GLB…` → `GLB export cancelled` → `GLB exported from current 3D pose` (**KI-25, preservado**). Cada archivo guardado = la referencia de su pose (plano `737bcd23…` o 60° `87aa2e4c…`). **Textos ExtendScript recibidos por Illustrator = baseline:** test 48 B `444efa9b…`, extraer 5536 B `bd4c215d…`, arte 5677 B `ab1c20da…`, guardar 188 B `be6c47e1…` (20/20 comprobaciones) | `observacion-*.json`, `glb/dialogo-real-*.glb` |
| **V-4** Arte Front/Back y documento | ✅ Modo **Layers** («Artwork loaded from layers…»), igual que A4. **GLB con arte idéntico byte a byte a A4** (295 440 B, `b4973a54…`). Documento N0-B **idéntico antes y después** (capas, visibilidad, bloqueo, artboard activo, selección, elementos, guardado) e idéntico al estado de A4. **El usuario confirmó a simple vista que el arte se ve bien orientado y con sus colores** [CONFIRMADO]; esto cierra la reserva visual de A4 | `paridad-arte-*.json`, `n0b-estado-*.txt`, `glb/paridad-arte.glb` |
| **V-5** Equivalencia GLB | ✅ Caja plano `737bcd23…` (33 436 B) y todas a 60° `87aa2e4c…` (54 224 B): iguales a A4 en CEP real, a la referencia del baseline y a lo que había en disco. Los 6 GLB archivados coinciden con su referencia | `glb/`, `a5-cep-evidencia.test.mjs` |
| **V-6** Rollback y aislamiento | ✅ Usuario cerró Illustrator → `ROLLBACK CORRECTO` (solo se borró `tesseract-v3`); **snapshot tras el rollback = snapshot previo**; `verify-isolation.sh` estricto verde; puerto 8088 libre. Al reabrir Illustrator, «Tesseract V3» ya no aparece y el «Tesseract» original sigue [CONFIRMADO]. Ningún documento real se abrió, modificó ni cerró desde las herramientas; los desechables N0-A y N0-B se cerraron sin guardar | `snapshot-antes.txt`, `snapshot-tras-rollback.txt`, `diagnostico-*.txt` |

## 4. Defectos conocidos observados en real
KI-04/KI-22 (11 de 13), KI-25 (mensaje final sobrescrito, también al cancelar) y KI-03 (GLB en mm) se reproducen **tal cual**, como se esperaba; ninguno se corrigió. KI-24 y KI-26 no estaban en el alcance de esta validación (cubiertos en navegador). No aparecen defectos nuevos.

## 5. Herramientas nuevas, ahora verificadas en real
`tools/a4/a5-observar.mjs` funcionó en el CEP real (envolvió `evalScript` y `cep.fs.writeFile` de forma pasiva y los restauró). `tools/a4/a5-estado-doc.sh`, antes [NO VERIFICADO], funcionó contra Illustrator real y produjo exactamente el formato de la evidencia de A4.

## 6. Incidencias
1. **Extensiones deshabilitadas en la primera sesión de Illustrator.** Tras instalar, el usuario abrió Illustrator y **todas** las entradas de Ventana ▸ Extensiones aparecían en gris: Libraries de Adobe, el «Tesseract» original, «Tesseract V3» y «Validador editorial». Ocurría también con el documento desechable N0-A abierto y el lienzo libre. El registro de CEP de esa sesión solo muestra la extensión `com.adobe.illustrator.OnBoarding`, sin intento de cargar V3 (`csxs-*-intento1.txt`). **Se resolvió reiniciando Illustrator**; después el menú quedó habilitado y el panel cargó. Como afectaba también a extensiones de Adobe, **no es atribuible al bundle** [INFERENCIA]. Causa exacta: [NO VERIFICADO].
2. **Documento real abierto al empezar.** Illustrator tenía abierto «Prueba Tesseract.ai» con cambios sin guardar; no es un documento N0-*. Las herramientas no lo tocaron; el usuario lo guardó o cerró antes de continuar.
3. **Un reinicio adicional de Illustrator** antes de que el panel cargara: el proceso tenía ~40 s cuando el panel aún no estaba cargado. No hay informe de fallo de Illustrator ese día.
4. **Un guardado del usuario en `~/Downloads/Prueva exportacion.glb`** (54 224 B, igual a la pose a 60°), elegido por el usuario en el diálogo real. Se deja donde está. El archivo `a5-plano.glb` salió en la pose de 60° porque no se pulsó «Reset Flat»; el usuario repitió con un 3D nuevo (`a5-plano2.glb` = plano). Ambos coinciden con la referencia de su pose.
5. `a4-close`: la respuesta de AppleScript se pierde (−1712, conocido desde el Nivel 0); la herramienta lo confirmó por inventario (0 documentos).
6. El único aviso de consola, «"abc" cannot be parsed», lo provoca la propia prueba de espesor (igual que en A4); `Runtime.enable` lo repite en las lecturas posteriores.

## 7. Estado final del entorno [MEDIDO]
V3 **no instalada** (CEP de usuario: solo `TesserArt_Validator`); plugin «Tesseract» instalado idéntico al baseline; baseline 15/15; `panel/` 14/14; `dist/` = `dist-a5`; Git con los cambios de este informe (ver commit). Temporales eliminados: `/private/tmp/tesseract_a5/` y `/private/tmp/tesseract_a4/` (archivados antes en `docs/fase1/a5-real/glb/`). **Residuos declarados:** la entrada de caché de CEP `~/Library/Caches/CSXS/cep_cache/ILST_30.8.2_com.tato.tesseract.v3.panel` (viene de A4 y no se borra, fuera de lo autorizado); el staging del orquestador en `/tmp/Tesseract_Nivel0_run`; el GLB del usuario en Descargas (incidencia 4); y los restos apartados de A4 en `tests/results/a4-ejecucion-2026-10-23/` (no versionados).

## 8. Qué no se verificó [NO VERIFICADO]
Rendimiento, FPS y fuga en el CEP real (A5 no tocó la escena; cubiertos en A4 y en la batería de navegador) · Shift+clic en el lienzo · validador Khronos o visor externo del GLB · KI-24/KI-26 en real · Windows · troqueles de trabajo distintos de N0-A/N0-B · causa de la incidencia 1.

## 9. Conclusión y siguiente paso
**El bundle A5 es funcionalmente equivalente al bundle validado en A4 dentro del CEP real**, también en el diálogo de guardado y el arte, que A4 no había ejercido con el diálogo real ni revisado a simple vista. Queda cerrada la reserva principal de PC6 (`A5_INFORME.md` §8).
**Siguiente paso (requiere aprobación del usuario):** iniciar A6 con **Opus en un chat nuevo**: primero la propuesta detallada (contratos de `GeometryEngine`, límites de módulos, estrategia para preservar el comportamiento legacy), **sin implementarla** hasta su aprobación. KI-22 y los demás defectos geométricos siguen reservados para F2.
