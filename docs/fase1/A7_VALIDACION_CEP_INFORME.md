# A7-CEP — Validación corta del bundle A7 en Illustrator CEP real: informe

Fecha: 2026-10-26 · Autorización expresa del usuario: «Autorizo, con fecha 2026-10-26, instalar temporalmente la extensión aislada Tesseract V3 a nivel de usuario, exclusivamente para esta validación. La autorización incluye carga, pruebas funcionales y rollback obligatorio. No incluye instalación permanente ni reemplazo del plugin original.»
Base: `962b381` (procedimiento `A7_VALIDACION_CEP_PROCEDIMIENTO.md`). Entorno [MEDIDO]: **Illustrator 30.8.2 · CEP 12.1.1 · Chromium 99.0.4844.84 · macOS 26.6.2**.
Estado: **VALIDACIÓN COMPLETADA: V-1…V-6 superados, sin regresiones. V3 instalada temporalmente y RETIRADA (rollback verificado).** Evidencia: `docs/fase1/a7-real/`, fijada por `tests/node/a7-cep-evidencia.test.mjs` (5/5).
Etiquetas: **[MEDIDO]** · **[CONFIRMADO]** (por el usuario) · **[INFERENCIA]** · **[NO VERIFICADO]**.

## 1. Resumen
El bundle de A7 (estado en `src/app/state.js`; escena y plegado en `src/scene/` y `src/fold/`; `main.js` `9784ec70…`) cargó en el CEP real y se comportó **exactamente igual que el bundle de A6 validado en real**. `a6-comparar-paridad` dio **PARIDAD IDÉNTICA** con la evidencia real de A6 para la caja (N0-A) y para el arte (N0-B). Las extracciones y los tres GLB (caja plana, caja a 60° y caja con arte) son **idénticos byte a byte** a los de A6 (y por tanto A4/A5). La **GPU no crece** en el CEP real (Δ=0 desde el ciclo 2), con lo que se cierra por primera vez en real la reserva de A7 sobre las rutas de liberación movidas. La consola no registró errores. N0-B quedó intacto y el rollback dejó el sistema como estaba. El usuario vio que el **hueco de N0-B no se recorta**: es el defecto conocido **KI-06**, no una regresión (§4).

## 2. Verificación previa [MEDIDO]
Git limpio en `962b381`. `dist/` reconstruido = `tests/golden/dist-a7.SHA256SUMS` (`main.js` `9784ec70…`). `verify-isolation.sh` verde: baseline 15/15, extensión instalada = baseline, `panel/` con las diferencias esperadas, V3 no instalada. Node **441/442 (1 omitida a propósito)**. CEP de usuario: solo `TesserArt_Validator`. `a4.sh preflight` → **PREFLIGHT CORRECTO**. Illustrator estaba abierto sin documentos; el usuario lo cerró antes de instalar. Los registros de A6 que seguían en `tests/results/a4/` (ya archivados en `a6-real/`, comprobado con `cmp`) se apartaron a `tests/results/a4-ejecucion-2026-10-25/`.

## 3. Resultados
| ID | Resultado | Evidencia |
|---|---|---|
| **Instalación** | ✅ `INSTALACIÓN CORRECTA` (autorización `2026-10-26`) y `VERIFY CORRECTO`. Las demás extensiones, incluida «Tesseract», estructuralmente idénticas al snapshot previo. `verify-isolation.sh --a4-instalado` verde | `install-record.json`, `snapshot-antes.txt` |
| **V-1** Carga | ✅ **El panel cargó a la primera sesión** (puerto 8088 con el panel listado; sin reinicio, a diferencia de A5 y A6). **IDENTIDAD CORRECTA:** `com.tato.tesseract.v3.panel`, ILST 30.8.2, `Chrome/99.0.4844.84 AdobeCEP/12.1.1`, three r132, un solo `main.js`, **SHA-256 cargado = `9784ec70…` (A7)**. **0 errores** de consola desde la recarga (0 eventos) | `cdp-identity-*.json`, `cdp-console-2026-10-26T13-27-38-185Z.json` |
| **V-2** Caja: extracción, validación, 3D, plegado | ✅ `a4-paridad caja` sobre N0-A con P-0, P-1, P-2, P-3, P-4, P-5, P-6 y P-8 correctos → **PARIDAD IDÉNTICA** con `a6-real/paridad-caja-2026-10-26T03-15-02-116Z.json` (se ignoran solo fecha, tiempos y nº de eventos). Incluye Test Connection `OK_FROM_ILLUSTRATOR`, **11 de 13 paneles** con el mismo log del motor (KI-04/KI-22), base, hashes del lienzo, espesor y presets. JSON de extracción **= A6 byte a byte**. Consola: 59 eventos, 0 errores, 1 aviso | `paridad-caja-*.json`, `extraccion-panel-caja.json` |
| **V-3** GLB | ✅ Plano `737bcd23…` (33 436 B) y a 60° `87aa2e4c…` (54 224 B): **= A6 byte a byte** (`cmp`) | `glb/paridad-caja-plano.glb`, `glb/paridad-caja-todas60.glb` |
| **V-4** Arte (N0-B) | ✅ `a4-paridad arte` con P-1, P-2, P-7 (modo Layers) y P-7b → **PARIDAD IDÉNTICA** con `a6-real/paridad-arte-2026-10-26T03-15-33-260Z.json`. GLB con arte `b4973a54…` (295 440 B) **= A6 byte a byte**. Extracción del arte = A6. Estado de N0-B **idéntico antes y después** e igual al de A6. Consola: 205 eventos, 0 errores, 1 aviso. **Usuario** [CONFIRMADO]: forma, colores y plegado adecuados; el hueco no aparece (KI-06, §4) | `paridad-arte-*.json`, `n0b-estado-*.txt`, `glb/paridad-arte.glb` |
| **V-5** GPU en real | ✅ `cdp-run leak --cycles=3` (caja, sin arte) → **«SIN CRECIMIENTO ACUMULATIVO»**: Δ texturas/buffers/VAO/programas = 0 en los ciclos 2 y 3. El ciclo 1 **libera** (buffers −80, VAO −20), no acumula. Heap 12.1 MB constante | `cdp-leak-2026-10-26T13-28-12-377Z.json` |
| **V-6** Cierre y rollback | ✅ Lectura final de consola: 0 errores (los 205 eventos de la sesión se repiten por `Runtime.enable`). N0-A y N0-B cerrados sin guardar (`respuestaPerdida: false`); Illustrator en 0 documentos. `diagnose` y `verify` correctos. El usuario cerró Illustrator → `ROLLBACK CORRECTO` (solo se borró `tesseract-v3`); **snapshot tras el rollback = snapshot previo** (= previo de A6); `verify-isolation.sh` estricto verde; puerto 8088 libre; CEP de usuario: solo `TesserArt_Validator`. Reapertura de Illustrator por el usuario: ver §6 | `snapshot-tras-rollback.txt`, `diagnostico-20261026-083020.txt` |

## 4. Diferencias funcionales y defectos observados
- **Diferencias funcionales A7 frente a A6: ninguna** [MEDIDO]. La comparación cubrió todos los campos de paridad de caja y arte, las extracciones y los tres GLB.
- **Hueco de N0-B no recortado (observación del usuario: «sigue sin aparecer la perforación, el hueco; del resto todo ok»).** Es **KI-06** (preexistente, `Shape` sin `holes`), ya confirmado a simple vista en A6-CEP. **No es regresión:** el GLB con arte es byte a byte igual al de A4/A5/A6.
- KI-04/KI-22 (11 de 13) y KI-03 (GLB en mm) se reproducen tal cual. KI-24/25/26/27 fuera de alcance de esta validación corta.
- **Diferencia con A4 en V-5 (declarada):** el ciclo 1 de `leak` baja −80 buffers / −20 VAO; A4 (3 ciclos) bajó −8 / −2. Es una liberación, no un crecimiento, y el criterio (Δ=0 tras el calentamiento) se cumple. La magnitud depende del estado del panel antes de `leak`; aquí se ejecutó después de `a4-paridad caja`, que deja el modelo en otro estado [INFERENCIA, no verificada con una réplica del orden de A4].

## 5. Incidencias
1. **Ninguna de carga:** a diferencia de A5 y A6, el panel cargó en la primera sesión de Illustrator, sin reiniciar. Causa de las incidencias anteriores sigue [NO VERIFICADO].
2. El único aviso de consola por documento («"abc" cannot be parsed») lo provoca la propia prueba de espesor, como en A4–A6.
3. Al cerrar, CEP registró `NSInvalidReceivePortException … mach port died` en el log del panel (también en A5 y A6; corresponde al cierre del proceso de Illustrator [INFERENCIA]). Las dos líneas `ERROR ClientInitialized begin/end` del mismo log aparecen igual en A6 y son del registro de CEP, no del bundle.
4. Preparación: los registros de A6 que quedaban en `tests/results/a4/` se archivaron aparte (§2); no afecta al producto.

## 6. Estado final del entorno [MEDIDO]
V3 **no instalada** (CEP de usuario: solo `TesserArt_Validator`). Plugin «Tesseract» instalado idéntico al baseline. Baseline 15/15. `dist/` = `dist-a7`. `src/`, `panel/`, goldens, fixtures, `reference/` y todas las huellas históricas sin cambios. Temporal `/private/tmp/tesseract_a4/` eliminado (archivado antes en `a7-real/glb/` y comprobado con `cmp`). **Residuos declarados:** entrada de caché de CEP `~/Library/Caches/CSXS/cep_cache/ILST_30.8.2_com.tato.tesseract.v3.panel` (viene de A4; no se borra por estar fuera de lo autorizado); staging del orquestador en `/tmp/Tesseract_Nivel0_run`; registros de A6 en `tests/results/a4-ejecucion-2026-10-25/` (no versionados).
**Reapertura de Illustrator por el usuario** [CONFIRMADO]: «Tesseract V3» ya no aparece y el «Tesseract» original funciona. Coincide con el snapshot y el aislamiento.

## 7. Qué no se verificó [NO VERIFICADO]
Fuga GPU **con arte** en real (la herramienta `leak` no expone esa opción sin modificarla; `conArte: false`, igual que A4) · rendimiento y FPS en CEP · diálogo «Save GLB» real y textos ExtendScript (validados en A5; A7 no los tocó) · Shift+clic · validador Khronos o visor externo · KI-24/KI-26/KI-27 en real · Windows · troqueles distintos de N0-A/N0-B · causa de las incidencias de carga de A5/A6.

## 8. Conclusión
**El bundle A7 es funcionalmente equivalente al bundle A6 dentro del CEP real**: carga, extracción, validación, 3D, base, plegado, espesor, presets, arte y exportación GLB, todo byte a byte o campo a campo; y la liberación de recursos GPU se mantiene (Δ=0) en real. Queda cerrada la reserva de PC8 sobre la validación en real. **Fin de la validación: no se inicia A8, A9 ni F2.** Siguiente paso: decisión del usuario sobre PC8.
