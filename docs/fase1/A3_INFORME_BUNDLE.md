# Fase 1 · Punto de control 3 — A3: build IIFE e instalación en dry-run

Fecha: 2026-10-23 · Estado: **entrega para revisión. A4 y la refactorización estructural NO iniciados. Nada instalado en CEP ni ejecutado en Illustrator.**
Detalle técnico (archivos, versiones, huellas, rollback): `docs/fase1/A3_BUILD_Y_ROLLBACK.md`. Etiquetas: **[MEDIDO]** · **[CONFIRMADO]** · **[INFERENCIA]** · **[NO VERIFICADO]**.

## 1. Cumplimiento de las condiciones

| # | Condición | Resultado |
|---|---|---|
| 1 | Baseline congelado y extensión instalada intactos | **Cumplido** [MEDIDO]: `verify-isolation.sh` verde tras todas las pruebas (baseline vs manifiesto; instalada idéntica al baseline); el build y el instalador no escriben fuera de `dist*`/temporales (probado) |
| 2 | No instalar en CEP ni cambiar nada en Illustrator | **Cumplido:** `~/Library/.../CEP/extensions/` solo contiene `TesserArt_Validator` (ajeno); `--install` y variantes se **rechazan con código 3**; el dry-run no escribe nada (listado de CEP idéntico antes/después) |
| 3 | No modificar motor, plegado, materiales ni exportadores | **Cumplido:** `panel/` sin cambios desde PC1 (`git diff 6b76385 -- panel` vacío; huellas fijadas); el bundle es `panel/main.js` re-impreso |
| 4 | Conservar las 155 pruebas Node, las de navegador y los controles negativos | **Cumplido y ampliado** (§2): las 155 originales siguen en verde; todas las pruebas de navegador se ejecutan ahora también sobre el bundle; se conservan los 21 controles y se añaden 5 |
| 5 | Equivalencia funcional código actual ↔ bundle | **Demostrada** (§3) |
| 6 | Compatibilidad con Chromium 99 y sin APIs modernas | **Respaldada con 3 evidencias independientes** (§4); **no es Chromium 99 real** |
| 7 | Documentar archivos, herramientas, versiones, huellas y rollback | **Hecho:** `A3_BUILD_Y_ROLLBACK.md`, `BUILD_INFO.json`, `SHA256SUMS`, `third_party/THIRD_PARTY_NOTICES.md` |
| 8 | Mantener abiertos KI-02, KI-04 y KI-17…20 | **Cumplido:** siguen abiertos y preservados (A3 no los toca); nota en `KNOWN_ISSUES.md` |
| 9 | Handoff autocontenido | **Entregado:** `HANDOFF.md` actualizado |

## 2. Resultados de las pruebas

| Batería | Resultado |
|---|---|
| Node (≈10 s) | **180/180** (155 de A2 + 25 nuevas: build 11, compatibilidad Chromium 99 7, instalador dry-run 7) |
| Navegador — baseline · panel · **bundle** (Chrome 155 headless con GPU Apple M1 Max) | **44/44** (48/48 con `--soak`) |
| Navegador — APIs posteriores a la 99 **eliminadas** (baseline, panel, bundle) | **4/4** |
| Build | Reproducible (dos builds = mismos bytes); `--verify` OK; huellas fijadas en `tests/golden/dist.SHA256SUMS` |
| Controles negativos (mutaciones sobre copias) | **26/26 detectadas**: 11 Node + 10 navegador (de A2) + **5 del bundle** (bundle sin el parche A1, offset del arte, Shift+clic, tolerancia del grafo, cambio mínimo de fuente ⇒ cambia la huella). Cada serie exige antes una ejecución limpia que pase |
| Aislamiento | Verde (`verify-isolation.sh`; un solo autor; sin remoto; sin trailers) |
`tests/run-all.sh --mutations --soak` ⇒ **"TODO EN VERDE"**.

## 3. Equivalencia funcional código actual ↔ bundle [MEDIDO]
Las 3 versiones (baseline congelado, `panel/` con el parche A1, **bundle generado**) corren la misma batería sobre 2 troqueles reales:

| Comprobación | Baseline | Panel | **Bundle** |
|---|---|---|---|
| Geometría en página vs golden de Node (paneles, áreas, centroides, adyacencias, árbol de plegado desde P0) | = golden | = golden | **= golden** (caja y export de Illustrator) |
| Píxeles del canvas 3D en 4 poses (plano, ALL=90°, otra base, con arte) | ref. | 0 distintos | **0 distintos** (ambos troqueles) |
| Estructura de la escena (mallas, líneas, sprites, grupos, triángulos, llamadas de dibujo) | ref. | idéntica | **idéntica** |
| Materiales, luces, espesor, renderer | = | = | **idéntico** |
| Arte: overlays, UV, desplazamientos, textura, bisagras | = | = | **idéntico** |
| Interacciones (Shift+clic, Alt+clic, órbita, pan, zoom, Esc) | = | = | **idénticas** |
| GLB (4 poses × 2 troqueles) | `892fa955…` (caja, plegado 60° con arte, 16 525 992 B) | `892fa955…` | **`892fa955…`** — idéntico byte a byte (ill: `8c3e76f0…`; sin arte: `38dcf87e…` y `d197ef84…`) |
| Crecimiento de GPU en ciclos repetidos (texturas / buffers / VAOs) | **crece** (+1111 / +5050 / +2020 por 100 ticks) | 0 / 0 / 0 | **0 / 0 / 0** (6 ciclos sin arte, 5 con arte, 25 en soak) |

**Diferencias deliberadas e inocuas** (no de comportamiento): el bundle está reformateado por esbuild; su identidad de manifiesto es V3; no incluye `main.js.bak` ni `*.md`.

## 4. Compatibilidad con Chromium 99 (CEF rama 4844 / V8 9.9) [MEDIDO, estático y en navegador moderno]
1. **Sintaxis:** transformar el bundle con `target: chrome99` produce **exactamente** el mismo código que con `esnext` ⇒ ninguna construcción requiere conversión ⇒ todo es ≤ V8 9.9. Control del chequeo: una sintaxis posterior (`using`) sí se convierte con `chrome99`.
2. **APIs y CSS:** ninguna coincidencia con una lista de APIs JS posteriores a la 99 (`toSorted`, `Object.groupBy`, `Promise.withResolvers`, `Set.union`, `URL.canParse`, `AbortSignal.timeout`…) en el bundle, la fuente, los scripts de `index.html` ni three.js r132; ninguna función CSS posterior (`:has()`, `@container`, `color-mix()`, `dvh`, nesting, `oklch()`…) en `style.css` ni `index.html`. El bundle es script clásico: sin `import`/`export`/`require`/`process`/`import()` ni `type="module"`.
3. **Ejecución con APIs reducidas:** en Chrome se eliminan antes de cargar la página ~40 APIs posteriores a la 99 y se repite el flujo completo (3D, plegado, arte de 4096 px, GLB, ciclos de GPU) en las 3 versiones: **sin errores de JS** y GLB **idéntico** al obtenido con las APIs completas.
**No es Chromium 99 real** y la lista de versiones de introducción de APIs es conocimiento general, no verificada en esta sesión. La confirmación definitiva es cargar el bundle en el CEP de Illustrator (Nivel 1/A4, requiere autorización).

## 5. Métricas comparativas (informativas; navegador, no CEP)
| Métrica | Baseline | Panel | Bundle |
|---|---|---|---|
| Tamaño de `main.js` | 117 221 B | 118 817 B | **126 415 B** (+6.4 % por el reformateo; sin minificar) |
| "Continue to 3D" síncrono | 25 ms | 25.5 ms | 34 ms |
| FPS en reposo / orbitando | 60.6 / 60.6 | 60.8 / 60.5 | 60.8 / 60.5 (limitado a 60 Hz) |
| Plegado por tick (mediana / p95) | 1.0 / 1.2 ms | 0.6 / 0.7 ms | 0.5 / 0.8 ms |
| Crecimiento por 100 ticks (texturas / buffers / VAOs) | +1111 / +5050 / +2020 | 0 / 0 / 0 | 0 / 0 / 0 |
| Exportar GLB sin arte | 8 ms | 8 ms | 7 ms |
Nota: "Continue to 3D" del bundle (34 ms) frente a 25 ms es una medición de una sola ejecución [INFERENCIA: ruido de la primera compilación de shaders; no se repitió]. Tamaño de `dist/`: 794 527 B.

## 6. Hallazgos y cambios de herramientas de prueba en A3 (declarados)
1. **La base inicial en la interfaz es P0**, no el panel más grande: `currentBasePanelIndex` arranca en 0 y `getDefaultBaseIndex` solo se usa si está fuera de rango. Comportamiento actual, preservado y ahora fijado por prueba.
2. **Se detectó y corrigió una no-determinación en las pruebas, no en el producto:** el arte simulado dibujaba texto en un canvas y el PNG variaba ~76 bytes entre cargas de página (caché de fuentes). `tools/baseline/harness_art.js` ahora dibuja solo formas. **Consecuencia:** el GLB con arte de las pruebas pasa de ≈18.2 MB a ≈16.5 MB; las cifras de A2 (18 187 072 B) corresponden al arte antiguo y no son comparables con las de A3.
3. `tools/baseline/setup_harness.py` ahora tolera el código re-impreso por esbuild (los parches de instrumentación del arnés usan expresiones regulares). Los instrumentos son solo del arnés; ni `panel/` ni `dist/` los incluyen.
4. Se añadieron `tests/lib/chromium99.mjs` y la prueba de APIs reducidas; `tests/run-all.sh` ejecuta ahora build, verificación e instalador dry-run.

## 7. Estado de aislamiento (al cerrar A3)
Baseline: intacto (huellas). Extensión instalada: idéntica al baseline. `panel/`: sin cambios desde PC1 (`6b76385`). Carpeta CEP del usuario: sin `tesseract-v3*`. `dist/`: generado, **no instalado**, no versionado. Git local: 1 solo autor, sin remoto, sin trailers. `tools/install.sh`: solo dry-run.

## 8. Límites y riesgos (declarados)
1. **Ninguna prueba se ejecutó en Illustrator ni en CEP reales.** El bundle no se ha cargado en Chromium 99 auténtico.
2. El bundle **no corrige ni cambia nada** de KI-02/04/17–20; sigue siendo el código de `panel/` (una sola clausura de ~2 700 líneas): A3 no es modularización.
3. `OrbitControls.js` sigue cargándose (KI-16).
4. El build depende de esbuild (MIT) fijado y de `pnpm install` con red la primera vez; sin red se puede usar `node_modules` ya instalado.
5. La verificación de `CSXS/manifest.xml` es estructural (XML + identidad + colisiones); no sustituye la carga real por CEP (p. ej. reglas de `RequiredRuntime`/versiones: [NO VERIFICADO]).
6. Windows: `tools/install.sh` es bash/macOS (`stat -f`, rutas `~/Library`); no tiene versión Windows (D5-A).

## 9. Recomendación para el siguiente punto de control
Propongo **PC4 = aprobación de A4 (primera carga real del bundle en Illustrator)**, que **requiere tu autorización explícita de instalación** (`tools/install.sh` pasaría de dry-run a instalación real, con snapshot antes/después, rollback probado y `verify-isolation.sh`). Alternativa sin instalar: ejecutar antes el **Nivel 0** (`tools/illustrator/*.jsx`) para confirmar en Illustrator real las suposiciones de la maqueta (KI-10, extracción, arte). Mi orden recomendado: (1) Nivel 0 → (2) autorizar A4 con alcance acotado (instalar `tesseract-v3`, medir con `measure_ui.js`/`leak_cycles.js`, lista de paridad P-1…P-10) → (3) solo después, A5/A6 (refactorización) con Opus en chat nuevo.
