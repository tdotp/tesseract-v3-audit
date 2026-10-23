# 05 — Baseline de rendimiento

Fecha de medición: 2026-10-23. Datos en bruto y scripts: `tools/baseline/` (`results/*.json|txt`).

## 0. Cómo leer estos números (importante)

| Medido en | **No** es |
|---|---|
| Node 24 (V8 moderno) para geometría; navegador integrado de Claude Desktop (**Chromium 152**, Apple **M1 Max**, ANGLE/Metal, DPR 1, ventana 928×1272) para escena, FPS, plegado y exportación | El **Chromium 99** de CEP 12 ni Illustrator ni tu hardware de destino. |

- Los **tiempos y FPS absolutos** son una cota optimista (GPU y CPU muy potentes, pantalla de 75 Hz que limita el FPS). Úsalos como piso, no como promesa.
- Los **conteos de recursos** (texturas, buffers, geometrías), las **proporciones** (plugin vs core, con arte vs sin arte) y las **tendencias de escala** sí son representativos.
- El plugin se ejecutó **sin modificar su lógica**: una copia en el scratchpad con un puente CEP simulado (`shim.js`, devuelve el fixture como si lo extrajera Illustrator) y dos parches de instrumentación (`window.__dbg` y aceptar URL `blob:` para simular arte). `tools/baseline/setup_harness.py` reproduce esa copia. Las sondas de `measure_ui.js` **no** usan `__dbg`: solo interfaz pública del panel + contadores sobre el contexto WebGL.
- Fixture: `caja-botanica-real.json` (69 puntos de contorno, 12 creases). Arte simulado: dos PNG de 3280×4096 px (8.6 MB c/u), lo que exportaría `buildArtworkExportScript` (límite 4096 px).

## 1. Geometría: topología/paneles (Node; mediana de 3–9 ejecuciones)

`plugin` = funciones puras del `main.js` extraídas por rango de línea (`buildPanels` y dependientes). `core` = `buildFoldTopology` del repo web (copia construida). Para el plugin se alimentan solo las anclas (como hace hoy); `core` aplana curvas.

| Caso | Segmentos | Plugin (ms) | Paneles plugin | Área plugin − esperada (mm²) | Core (ms) | Paneles core | Δ área core (mm²) |
|---|---|---|---|---|---|---|---|
| **caja-botanica-real (fixture del plugin)** | 81 | 30.2 | **11** | **−1347.6** | 1.9 | **13** | 0 |
| hueco descentrado (200 mm²) | 5 | 0.25 | 2 | +200 (hueco no restado) | 0.03 | 2 | 0 |
| hueco centrado en el panel (800 mm²) | 5 | 0.23 | 2 (**un panel desaparece**, entra la cara exterior) | +4000 | 0.02 | 2 | 0 |
| esquinas redondeadas (Bézier) | 9 | 0.26 | 2 | 0 (ignora curvas) | 0.28 | 2 | 0 |
| rejilla 2×2 · 3×3 · 4×4 | 8 · 16 · 28 | 0.25 · 2.2 · 9.2 | 4 · 9 · 16 | 0 | 0.04 · 0.08 · 0.16 | igual | 0 |
| rejilla 6×6 | 64 | 73 | 36 | 0 | 0.5 | 36 | 0 |
| rejilla 8×8 | 116 | 319 | 64 | 0 | 0.9 | 64 | 0 |
| rejilla 10×10 | 184 | 987 | 100 | 0 | 1.5 | 100 | 0 |
| rejilla 4×4 + 10 / 25 / 50 pts por arista | 68 / 128 / 228 | 34 / 100 / 454 | 16 | 0 | 0.3 / 0.8 / 2.6 | 16 | 0 |
| rejilla 16×16 | 484 | **10 544** | 256 | 0 | 8.2 | 256 | 0 |
| rejilla 24×24 | 1 108 | no se ejecutó (extrapolado ≫ 1 min) | — | — | 35.7 | 576 | 0 |
| rejilla 32×32 | 1 988 | — | — | — | 98 | 1 024 | 0 |
| rejilla 48×48 | 4 516 | — | — | — | 462 | 2 304 | 0 |

Lecturas:
- **Escala del plugin ≈ n^2.5** (28→64 segmentos: ×8; 64→484: ×144). **Escala del core ≈ n^1.9.**
- Con el troquel real el plugin tarda 30 ms: hoy no se nota. Lo que lo hace inviable es **aplanar curvas dentro de él** (69→219 puntos solo en el contorno ⇒ ~300 segmentos ⇒ ≈3 s [INFERENCIA por interpolación]).
- Las rejillas usan una crease por arista interior (como un troquel real). Con creases de largo completo el plugin además deja pasar la cara exterior como panel (probado, no tabulado).
- Mediciones de **extracción** (ExtendScript) no son posibles fuera de Illustrator: ver §6.

## 2. Pipeline del panel en el navegador (con el plugin real)

| Paso | Escenario A (sin arte) | Escenario B (con arte 2×PNG 3280×4096) |
|---|---|---|
| Extracción (simulada: puente + `JSON.parse` + validar + 2D) | 6 ms (no representa a Illustrator) | — |
| "Continue to 3D" (síncrono: topología + build + UI de pliegue + ajuste de cámara) | 45–95 ms (la primera vez incluye compilar shaders) | — |
| Carga de arte (2 PNG ≈ 8.6 MB c/u: decodificar + subir + overlays) | — | 198–298 ms |
| `applyFolding` por tick de slider (mediana / p95 / máx) | 1.0 / 1.4 / 3.4 ms (100 ticks) | 1.0 / 1.9 / 2.5 ms (60 ticks) |
| Exportar GLB (hasta el diálogo de guardado) | **9 ms** | **589 ms** (bloquea la UI; re-codifica los PNG de arte) |
| Heap JS tras construir / tras arte | 8.0 MB | 7.3 → 9.8 MB (los PNG viven en GPU; el heap sube a ~54 MB tras exportar GLB, sin GC) |
| Escena: llamadas de dibujo / triángulos / geometrías / texturas / programas | 55 / 350 / 45 / 11 / 5 | 99 / 514 / 67 / 13 / — |

## 3. FPS y costo de render

| Medida | Resultado | Lectura |
|---|---|---|
| FPS en reposo | **75.6** (peor frame 15.3 ms) | Limitado por la pantalla (75 Hz): el panel **renderiza siempre**, aunque nada cambie (H2). |
| FPS orbitando (eventos de ratón reales) | 75.4 (peor frame 15.3 ms) | Sin margen medible; ver costo por frame. |
| Costo de `renderer.render` por frame (CPU / CPU+GPU sincronizada, mediana de 120) | sin arte 0.1 / 0.1 ms; con arte 0.4 / 0.4 ms | La escena actual es trivial para esta GPU. **No sirve para predecir PBR + texturas** (spike F1-14). |

## 4. Fuga de recursos por plegado (hallazgo H1)

Medida de dos formas independientes: (a) con `renderer.info` dentro de la copia; (b) **desde afuera**, contando `createTexture/deleteTexture`, `createBuffer/deleteBuffer`, `createVertexArray/deleteVertexArray` del contexto WebGL (la misma técnica sirve dentro del panel real). 100 eventos `input` de un slider de crease:

| Recurso | Antes | Después de 100 ticks | Crecimiento |
|---|---|---|---|
| Texturas WebGL | 11 | **1 111** | +11 por tick (etiquetas P0…P10, `CanvasTexture` 256×96) |
| Geometrías (three) | 45 | **2 047** | +20 por tick |
| Buffers WebGL (sonda externa) | 0 | +5 008 | +50 por tick |
| VAOs (sonda externa) | 0 | +2 002 | +20 por tick |
| Heap JS | — | +0.8 a +2.8 MB | |
| Con arte (60 ticks) | | +660 texturas, +1 202 geometrías | (mismo ritmo por tick) |

Estimación de GPU **[INFERENCIA numérica; no medida]**: 11 texturas de 256×96×4 B ≈ 1.08 MB por tick ⇒ ~215 MB tras 200 ticks (un arrastre completo de slider). `dispose()` de esas texturas/geometrías nunca se llama al quitar `foldRoot`.
Criterio de aceptación permanente: `measure_ui.js` debe dar **Δ ≈ 0** en los cuatro contadores tras 100 ticks.

## 5. Presupuesto de memoria GPU (estimaciones para planificar; no medidas)

| Recurso | Cálculo | Orden de magnitud |
|---|---|---|
| Arte Front + Back, PNG 3280×4096 RGBA con mipmaps | 3280×4096×4 B × 1.33 × 2 | ≈ 143 MB |
| Mapa PBR 2048² RGBA con mipmaps | 2048²×4 B × 1.33 | ≈ 22 MB por mapa (color + normal + rugosidad ≈ 66 MB por material) |
| Máscaras de acabado (≈2048 px, 1 canal si se empaquetan) | | 4–22 MB c/u |
| HDRI/PMREM | depende de resolución | decidir en Fase 3 |

Conclusión: **cargar solo el material activo** y fijar un mínimo de GPU (D5) antes de la Fase 3.

## 6. Protocolo para repetir las medidas dentro de Illustrator (por hacer: F1-04)

No modifiqué el plugin instalado y no hay forma de abrir sus DevTools sin añadirle un archivo `.debug`. **Propuesta sin tocar la instalación:**

1. Copia la carpeta del plugin a `~/Library/Application Support/Adobe/CEP/extensions/tesseract-baseline/` (nivel usuario).
2. En esa **copia**: cambia en `CSXS/manifest.xml` `ExtensionBundleId`, `ExtensionBundleVersion` y el `Id` de la extensión (p. ej. `com.tato.tesseract.baseline.panel`) y añade el archivo `.debug` en su raíz:
   ```xml
   <?xml version="1.0" encoding="UTF-8"?>
   <ExtensionList><Extension Id="com.tato.tesseract.baseline.panel"><HostList><Host Name="ILST" Port="8088"/></HostList></Extension></ExtensionList>
   ```
3. Reinicia Illustrator → Ventana ▸ Extensiones ▸ Tesseract (copia) → abre `http://localhost:8088` en Chrome → DevTools del panel.
4. Con un documento de prueba abierto: en la consola pega `tools/baseline/measure_ui.js` y ejecuta `await tesseractBaseline({ skipGlb: true })` (con `skipGlb:false` aparece el diálogo de guardado de Illustrator).
5. Guarda el resultado como `tools/baseline/results/cep_<máquina>_<fecha>.json`. Mide también memoria del proceso `CEPHtmlEngine` en el Monitor de Actividad (antes/después) y, si procede, **Ventana ▸ Historial de GPU**.
6. Repite con 1–2 troqueles complejos de producción (cuantos más segmentos mejor) y con arte real.

Qué medirá en CEP: tiempo real de extracción (ExtendScript), "Continue to 3D", FPS reposo/órbita, costo por tick, crecimiento de recursos, tiempo de GLB; datos de entorno (versión de Chromium vía `navigator.userAgent`, GPU vía `WEBGL_debug_renderer_info`).

## 7. Qué falta medir (y por qué no se pudo)

| Medida | Bloqueo | Cuándo |
|---|---|---|
| Extracción por ExtendScript (documentos grandes) | Requiere Illustrator | F1-04 |
| FPS/memoria en el Chromium 99 de CEP y en tu GPU de destino | Requiere el panel real | F1-04 |
| GPU real de las texturas | `renderer.info` no la reporta; usar Monitor de Actividad | F1-04 / F1-14 |
| PBR + entorno + texturas 2048 en CEP | Aún no existe en el plugin | F1-14 (spike) |
| Windows | Sin equipo | D5 |
| Tiempo de `buildPanels` con troqueles de producción reales | Solo tengo 2 troqueles reales (misma caja) | Pedir 2–3 troqueles complejos a Tato |
