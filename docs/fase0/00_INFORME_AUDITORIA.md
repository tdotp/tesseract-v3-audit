# Tesseract V3 — Fase 0: Informe técnico de auditoría

Fecha: 2026-10-23 · Estado: **para revisión; no se inició ninguna refactorización.**

Etiquetas de evidencia usadas en todos los documentos de la Fase 0:
**[MEDIDO]** lo medí (script o navegador) y el resultado está en `tools/baseline/results/` ·
**[CONFIRMADO]** lo leí en código/archivos o lo comprobé en la máquina ·
**[INFERENCIA]** deducción mía, no probada ·
**[NO VERIFICADO]** requiere Illustrator/Dimension/otro equipo que no pude usar.

Documentos de la Fase 0: este informe · [01 Matriz de reutilización](01_MATRIZ_REUTILIZACION_WEB.md) ·
[02 Mapa de dependencias](02_MAPA_DEPENDENCIAS_PLUGIN.md) · [03 Arquitectura modular](03_ARQUITECTURA_MODULAR.md) ·
[04 Riesgos](04_RIESGOS_Y_MITIGACIONES.md) · [05 Baseline de rendimiento](05_BASELINE_RENDIMIENTO.md) ·
[06 Plan de Fase 1](06_PLAN_FASE_1.md) · [07 Dependencias y licencias](07_DEPENDENCIAS_Y_LICENCIAS.md).

---

## 1. Resumen ejecutivo

1. **El plugin funciona y su base es aprovechable**, pero está en un solo `main.js` de 2656 líneas con ~35 variables
   compartidas en una clausura: no se puede probar por partes ni evolucionar sin riesgo. La modularización es viable
   (las costuras existen, ver doc 02) y debe hacerse **sin cambiar comportamiento** y con pruebas de caracterización primero.
2. **Hallazgo más urgente (nuevo, medido): el plugin pierde recursos de GPU en cada movimiento de slider.**
   Cada tick de plegado crea ~11 texturas (las etiquetas P0, P1…) y ~50 buffers nuevos que nunca se liberan:
   tras 100 ticks pasamos de 11 a 1111 texturas vivas [MEDIDO, dos métodos independientes]. Arrastrar un slider de punta a punta
   son cientos de eventos. Es independiente de V3, pero V3 va a sumar texturas PBR de 2048 px: **hay que arreglarlo antes**
   de añadir materiales (Fase 1, tarea aislada).
3. **El motor geométrico del plugin tiene defectos reproducibles** [MEDIDO con sus propias funciones extraídas y también
   confirmado en el plugin real corriendo en un navegador]:
   - Con su propio fixture (`caja-botanica-real.json`) **descarta 2 de 13 paneles** (1 347 mm², 4.9 % del área). Causa: un
     "acantilado" de tolerancia — extremos de crease a exactamente 0.50 mm de un vértice del grafo no emparejan (`< 0.5`).
   - Ignora curvas Bézier (143 mm² de diferencia, 0.52 %, en ese troquel; esquinas redondeadas se pliegan como chaflán).
   - No resta huecos del panel; y **si el centroide del panel cae dentro del hueco (ventana centrada) descarta el panel entero**.
   - Su topología crece ~n^2.5: 30 ms con el troquel real (81 segmentos), 1 s con 184, **≈10.5 s con 484**. Aplanar curvas
     dentro de este motor lo volvería inusable.
4. **El motor de `tesseract-web` (`packages/core`) resuelve los tres primeros puntos** (13/13 paneles, curvas, huecos,
   conservación de área, de 15× más rápido con el troquel real a >1000× con 484 segmentos) pero **no es un reemplazo directo**:
   no procesa la exportación real de Illustrator (falla con "panel desconectado") y mi experimento de fusionar extremos
   a 0.5 mm **no lo arregla por sí solo**: la topología sí construye, pero falla la conservación de área por 0.024 mm². Causa
   encontrada [MEDIDO]: son 6 astillas **fuera del contorno** (creases que sobresalen <0.5 mm del corte) que el filtro "inclusivo a
   0.5 mm" de `topology.ts` cuenta como paneles; con prueba estricta la suma da exactamente el área esperada. Hace falta una
   política de tolerancia decidida por ti antes de integrarlo (fusionar + recortar creases al contorno + filtro estricto). Además le faltan cosas que el plugin sí tiene (signo de pliegue, slider global,
   puentes/bisagras, arte). Veredicto: **reutilizar la geometría (core), conservar el producto del plugin** (doc 01).
5. **Compatibilidad CEP verificada en esta máquina:** Illustrator 2026 (30.8.2) usa CEP 12 con Chromium **99** (CEF rama 4844);
   three.js del plugin es r132 (2021). WebGL2 y Web Workers son estándar en Chromium 99, pero **no los probé dentro del panel real**; los módulos ES por
   `file://` son un riesgo conocido → bundle clásico (IIFE). [Versiones CONFIRMADAS; capacidades dentro del panel NO VERIFICADAS — prueba F1-14.]
6. **GLB actual en milímetros**, no en metros como exige glTF (Fantastic Fold exporta ±0.07 m; el nuestro ±~200 unidades).
   Es la sospecha principal si Adobe Dimension muestra el modelo 1000× grande [CONFIRMADO en los archivos; efecto en Dimension NO VERIFICADO — puedes probarlo ya, ver §6].
7. **Estimación Fase 1: 13–22 días de trabajo asistido (±40 %)** (doc 06), con tres puertas de control (G1–G3). Lo que más puede estirarla son
   tus validaciones dentro de Illustrator, no el código.

## 2. Alcance, método y límites

**Hecho:** lectura completa de `main.js` (2656 líneas), `index.html`, `style.css`, `manifest.xml`; lectura de `packages/core` y
`apps/web`; ejecución de las 70 pruebas del repo web en una **copia** (todas pasan); extracción de las funciones puras del plugin por
rango de líneas para medirlas en Node; **ejecución del plugin real en el navegador integrado** con un puente CEP simulado
(copia instrumentada en scratchpad) para medir FPS, plegado, fugas y exportación; inspección de los GLB de evidencia; revisión de licencias
con `pnpm licenses`; comprobación de versiones instaladas (Illustrator, CEF, Photoshop, Dimension).

**No hecho / límites:**
- **No ejecuté nada dentro de Illustrator** (ni ExtendScript). Las mediciones de navegador usan Chromium 152 en un M1 Max,
  **no** el Chromium 99 de CEP ni tu hardware de destino: los tiempos/FPS absolutos no son representativos; los conteos de recursos y las proporciones sí.
  El doc 05 incluye un script para repetir las medidas dentro del panel real.
- **No encontré un archivo llamado "plan maestro"** en `Documents`, `Desktop` ni `Downloads`. Tomé como plan maestro el alcance
  V3 que pegaste y los documentos `TESSERACT_MEJORA/00–03`. Si existe otro documento, dímelo y reconcilio.
- No probé GLB en Dimension ni la apertura en Photoshop (solo comprobé que ambos están instalados: Dimension 4.1.9, Photoshop 27.11.0).
- No hay clon de Windows ni medición allí.
- **Nada del plugin instalado ni de `tesseract-web` fue modificado** (la copia `tesseract-instalado-copia` es idéntica a la instalada
  salvo `.DS_Store`; verificado con `diff -rq`). Todos los experimentos viven en el scratchpad de la sesión; los scripts reproducibles
  están en `tools/baseline/`.
- **Incidencia de proceso (declarada):** sin leerlo antes, sobrescribí `tesseract/.claude/launch.json` (configuración del servidor
  estático `tesseract-static`, puerto 8754) al crear una configuración temporal. Recuperé el contenido exacto de la transcripción de una
  sesión anterior y lo restauré idéntico; no afectó a ningún archivo del plugin ni del repo web. Es el único archivo preexistente que toqué.

## 3. Inventario funcional del plugin (resumen; detalle en doc 02)

| Función | Estado | Notas |
|---|---|---|
| Extracción por capas (Cuts/Creases y variantes por nombre) | Funciona | ExtendScript embebido como cadenas; ver fragilidad H8 |
| Validación previa (extremos de crease a >0.5 mm) + vista 2D | Funciona | solo advierte; nunca bloquea |
| Topología, paneles, adyacencia, árbol de plegado | Funciona con defectos H3–H6 | motor propio |
| Plegado: slider por crease, global, crease seleccionado (Alt+clic), reset, base por clic (Shift+clic) | Funciona | signo normalizado por crease |
| Espesor 0.1–20 mm (def. 0.25) y 3 presets de color | Funciona | sin PBR |
| Bisagras/puentes visuales entre paneles plegados | Funciona | exclusivo del plugin (no está en la web) |
| Arte Front/Back o Tiro/Retiro (artboards o capas), PNG hasta 4096 px, proyección por artboard | Funciona | `MeshBasicMaterial` (sin luz) |
| Exportar GLB (escritor propio) con diálogo de guardado de Illustrator | Funciona | unidades mm; 93 nodos en el GLB de prueba |
| Captura PNG de la vista 3D | **Existe en código pero el botón está oculto** (`ghost-hidden`) | el alcance V3 pide "captura PNG básica" |
| Abrir en Photoshop / Dimension | No existe | |

## 4. Hallazgos (ordenados por impacto)

| # | Hallazgo | Severidad | Evidencia |
|---|---|---|---|
| H1 | **Fuga de recursos GPU por tick de plegado**: +11 texturas, +~50 buffers, +~20 geometrías por tick (`applyFolding` recrea sprites de etiqueta y visuales de crease y quita `foldRoot` sin `dispose`). 100 ticks: 11→1111 texturas, 45→2047 geometrías. | **Alta** | [MEDIDO] `three.info` y contadores `createTexture/deleteTexture` desde afuera; mismo resultado con y sin arte. Código: `applyFolding` (L1819–1913), `makePanelLabelSprite` (L163), `rebuildCreaseVisuals` (L1677). |
| H2 | El bucle de render corre siempre (75 fps en reposo) aunque nada cambie; `preserveDrawingBuffer:true`; `pixelRatio` sin tope. | Media | [MEDIDO] fps; [CONFIRMADO] L822–931. El costo por frame es mínimo en M1 Max (0.1–0.4 ms) pero un panel abierto todo el día gasta CPU/GPU; en equipos modestos o DPR 2 pesa. |
| H3 | Topología ~n^2.5 y reinicia el barrido tras cada intersección. | Alta (para V3) | [MEDIDO] tabla en doc 05. Con curvas aplanadas el troquel real pasaría de 81 a ~300 segmentos → ~3 s [INFERENCIA]. |
| H4 | Descarta paneles reales por filtro de conectividad (acantilado de 0.5 mm). Además, sin adyacencia por crease, la cara exterior se cuela como panel. | **Alta** (pérdida de material silenciosa) | [MEDIDO] 11/13 paneles; `probe` muestra vértices fusionados a 0.50 mm del extremo de las creases 7 y 10. Con la exportación real de Illustrator sí da 13/13. |
| H5 | Huecos: no se restan; centroide-en-hueco descarta el panel entero. | Media–Alta | [MEDIDO] caso sintético (panel 40×80 con ventana centrada): el panel desaparece. |
| H6 | Curvas Bézier ignoradas en 3D. | Media | [MEDIDO] 0.52 % del área en el troquel real; 219 puntos aplanados vs 69 anclas. |
| H7 | GLB en mm, sin extensiones, `roughness 1`, arte con `alphaMode BLEND`, un nodo por malla (93). | Media | [CONFIRMADO] `Tesseract_Test_Claude_export_plugin.glb` vs `FF_Test_2_export_Fantastic_Fold.glb`. |
| H8 | Extracción ExtendScript frágil: `coll()` se llama recursivamente con un `GroupItem` y luego lee `layer.layers.length` → **probable error con grupos anidados** dentro de Cuts/Creases; coincidencia de capas por subcadena (`"die"` coincide con "Studies"); no considera capas ocultas/bloqueadas. | Media | [CONFIRMADO por lectura] L184–277; [NO VERIFICADO] ejecución en Illustrator. |
| H9 | `OrbitControls.js` se carga y no se usa (la órbita es propia); sin tests; `main.js.bak` dentro de la extensión instalada; botón PNG/preview/modo ocultos. | Baja | [CONFIRMADO] |
| H10 | Texto de estado muestra `thickness=0.3mm` para 0.25 (`toFixed(1)`). | Cosmética | [MEDIDO] en pantalla |
| H11 | Paneles negros con rayas (captura 3 de la sesión anterior): **no reproducido**. Hipótesis (z-fighting arte vs cara, offset 0.08 mm ≈ resolución de profundidad a 600 mm) no se confirmó en M1 Max. | — | [MEDIDO] no reproduce a distancia de ajuste; sigue abierto. |

## 5. Corrección de afirmaciones de documentos anteriores

| Documento previo (`TESSERACT_MEJORA/02`) | Ahora |
|---|---|
| "Topología O(n²) … [INFERENCIA] no medido" | Medido: ≈ n^2.5; ≈10.5 s con 484 segmentos. |
| "Agujeros: solo se descartan paneles cuyo centroide cae dentro" | Confirmado, y es peor: un panel con ventana centrada **desaparece completo**. |
| (no mencionado) | El filtro de conectividad ya pierde 2 paneles con el fixture del plugin. |
| "Motor web compila a 1 archivo (60 KB)… un panel CEP puede cargarlo como `<script>`" | 60.6 KB sin minificar pero **solo formato ES module** (`formats: ['es']`); hay que producir IIFE. `zod` está declarado y **no se usa**. |
| "Fusionar extremos de crease a 0.5 mm arregla el bug de 0.375 mm" (propuesta) | **No basta**: la topología construye pero falla la conservación de área (Δ 0.024 mm² = 6 astillas fuera del contorno por creases que sobresalen; el filtro inclusivo de 0.5 mm las cuenta). Necesita también recorte de creases y filtro estricto (doc 03 §6). |

## 6. Decisiones que necesito de ti antes de la Fase 1

| # | Decisión | Mi recomendación |
|---|---|---|
| D1 | Estructura del repo V3 y ID de bundle (para convivir con el plugin instalado sin tocarlo). | Repo único (no monorepo) en `Tesseract v3/`, `src/` con límites por módulo; bundle `com.tato.tesseract.v3.panel`. |
| D2 | ¿Arreglar la fuga H1 dentro de la Fase 1 (commit aislado, único cambio de comportamiento permitido)? | **Sí**, tarea F1-10. |
| D3 | ¿El motor `core` se copia al repo V3 con procedencia documentada (base: `tesseract-web` HEAD `c0aeb34`)? | Sí, copia con `PROVENANCE.md`; no depender del repo web. Integrarlo en **Fase 2**, no en la 1. |
| D4 | Política de tolerancia para extremos de crease (regla "el troquel jamás se altera" vs 0.375 mm de Illustrator). | Decidir en Fase 2 con casos reales; ver doc 03 §6 (opciones A/B/C). |
| D5 | ¿Windows entra en V3? ¿Versión mínima de Illustrator y GPU mínima? | Si sí: probar en Windows desde Fase 1. Fijar mínimo por escrito antes de la Fase 3 (texturas). |
| D6 | GLB en metros (spec) → rompe compatibilidad con GLB antiguos del plugin. | Sí, en Fase 5; mientras tanto **prueba rápida tuya**: abre `TESSERACT_MEJORA/evidencia/glb/Tesseract_Test_Claude_export_plugin.glb` en Dimension y dime el tamaño que ves. |
| D7 | three.js: ¿mantener r132 en Fase 1 y subir de versión en Fase 3? | Sí; subir con imágenes de referencia, nunca junto con la modularización. |
| D8 | Confirmar que "plan maestro" = alcance pegado + `TESSERACT_MEJORA/00–03`. | — |

## 7. Qué sigue

Detengo aquí. Cuando apruebes o corrijas este diagnóstico (y D1–D8), empiezo por F1-01 (esqueleto del repo) según el doc 06.
