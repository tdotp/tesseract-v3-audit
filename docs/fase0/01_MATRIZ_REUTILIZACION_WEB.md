# 01 — Matriz de reutilización del código de Tesseract Web

Fuente analizada: `tesseract-web` (HEAD `c0aeb34`, 2026-07-24, 58 commits, un solo autor). Solo lectura; las pruebas y mediciones se hicieron en una copia.
Estado de calidad verificado: **70/70 pruebas pasan** (64 core + 6 app), `tsc` y build OK [MEDIDO].
Restricción V3: **no se incorpora el editor 2D** (ADR-002/Paper.js) ni nada de la UI React.

Leyenda de decisión: **Directo** = copiar con cambios mínimos · **Adaptar** = copiar y modificar · **Referencia** = leer y reimplementar · **No** = fuera de V3.
Fase = fase V3 en la que se tocaría (propuesta, doc 03 §5).

## 1. Matriz por archivo

| Archivo (LOC) | Qué hace | Equivalente en el plugin | Decisión | Fase | Notas / riesgos |
|---|---|---|---|---|---|
| `core/src/types.ts` (152) | Contratos: `BezierPath`, `FoldInput`, `PanelNode`, `FoldTopology`, `PanelTransform`… | JSON v1.0 de `EXTRACT_SCRIPT` (L273) | **Adaptar** | 2 | El JSON del plugin encaja 1:1 con `FoldInput` (+`cutLines`, `thickness_mm` vs `thickness`). Hay tipos de documento (`PackageDocument`, `ArtworkLayer`…) pensados para el editor web: no traer. |
| `core/fold-engine/bezier.ts` (105) | `flattenPath`: aplana Béziers (16 muestras por tramo curvo) | Ninguno (el plugin usa solo anclas) | **Directo** | 2 | Resuelve H6. 16 muestras fijas: para curvas largas o radios pequeños conviene subdivisión adaptativa por tolerancia (mm). Sube de 69→219 puntos en el troquel real: aumenta carga de topología (ver doc 05). |
| `core/fold-engine/geometry.ts` (65) | `polyArea`, `pointInPoly`, `segSegIntersect` | `polygonSignedArea`, `pointInPolygonInclusive`, `segSegIntersect` (L651, L977–1021) | **Directo** | 2 | Triviales, con tests. |
| `core/fold-engine/planarGraph.ts` (343) | Grafo planar de segmentos finitos: división en intersecciones, caras por recorrido de aristas, snapping crease→contorno (0.500001 mm) | `buildTopology` (L667–776) | **Adaptar** | 2 | Reemplaza el motor con defectos H3/H4: 15× a >1000× más rápido, sin reinicios de barrido [MEDIDO]. Aún es O(n²) (pares de segmentos + búsqueda lineal de vértices): 4 516 segmentos = 500 ms; suficiente, pero dejar punto de extensión (rejilla espacial). **Falta** fusión crease↔crease (bug de 0.375 mm): ver doc 03 §6. |
| `core/fold-engine/topology.ts` (401) | `buildFoldTopology`: paneles, huecos por panel, conservación de área, adyacencia, árbol, `buildFoldTreeOnly` (cambiar base sin recalcular) | `buildPanels` + `buildAdjacency` + `buildFoldTree` (L1071–1486) | **Adaptar** | 2 | Mejoras reales: huecos con `Shape.holes`, errores explícitos, re-raíz sin recomputar. **Cuidado:** lanza excepciones (panel desconectado, hueco que toca una crease, huecos anidados). El plugin hoy "sigue adelante" (a veces perdiendo material). V3 necesita convertir esos errores en **diagnósticos estructurados** que la UI muestre (qué panel, dónde), no en `throw` crudo. Un hueco que cruza una crease es raro pero real (asas, ventanas sobre pliegue): decidir si V3 lo soporta. |
| `core/fold-engine/transforms.ts` (66) | `computePanelTransforms`: pivote/alineación/ángulo por panel | `applyFolding` (L1819–1913) | **Referencia** | 2 | **Le faltan** cosas del plugin: signo por crease (`computeFoldSign`, L1509), slider global "ALL", puentes/bisagras (`addFoldBridgeVisual`, L1632). Usar la matemática, no sustituir el plegado del plugin. Devuelve ángulos sin normalizar: con "todas a 90°" unos paneles se pliegan hacia arriba y otros hacia abajo según la orientación (arbitraria) de `start→end`. [CONFIRMADO por lectura] |
| `core/svg-import/parseDieline.ts` (245), `pathParser.ts` (418), `svgTransform.ts` (224) | Importar SVG: transforms anidados, unidades, comandos de ruta | Ninguno (el plugin lee Illustrator directo) | **No** (solo tooling de pruebas) | — | V3 mantiene Illustrator como único editor. Útil solo para convertir exportaciones SVG de Illustrator en fixtures de prueba. |
| `core/svg-import/classifyLines.ts` (85) | Clasifica corte/crease por nombre de capa o color | `findL`/`has` en ExtendScript (L208–212) | **Referencia** | 4 | Reglas de nombre más completas y con error ante colisión (el plugin toma la primera coincidencia por subcadena). Base para la convención de capas de acabados (`UVI`, `Emboss`…). |
| `core/svg-import/duplicateGeometry.ts` (107) | Detecta geometría duplicada/solapada (error/aviso) | `validateGeometry` (solo mide extremos) | **Adaptar** | 2 | Mejora la validación previa ("Check for import"). |
| `core/__tests__/*` (≈1 000 líneas, 9 archivos) | 64 pruebas de geometría | Ninguna | **Directo** (patrón) | 1–2 | Modelo para pruebas del `core` de V3. |
| `core/__tests__/fixtures/caja-botanica-real.json` / `.svg` | Troquel real en JSON del plugin y SVG derivado | — | **Directo** | 1 | **Golden fixtures** para caracterización. Con él el plugin da 11 paneles y el core 13. |
| `core/__tests__/fixtures/caja-botanica-illustrator-export.svg` | **Exportación real** de Illustrator (extremos a 0.375 mm) | — | **Directo** | 1–2 | Reproduce el bug bloqueante del core; el plugin lo procesa (13 paneles). Debe ser caso de aceptación de la Fase 2. |
| `apps/web/utils/panelGeometry.ts` (33) | `ExtrudeGeometry` con `Shape.holes` | `shapeFromVerts` sin huecos (L968) | **Directo** (idea de 20 líneas) | 2 | Resuelve la mitad de H5 (la otra es el filtro por centroide). |
| `apps/web/utils/pointerGestureGuard.ts` (68) | Evita seleccionar al soltar tras arrastrar | Umbral de 5 px propio (L884) | **Referencia** | 7 | El plugin ya resuelve lo básico. |
| `apps/web/components/Viewer3D.tsx` (259) | Escena R3F, GLB vía `GLTFExporter` de toda la escena | `init3D`, `applyFolding`, GLB propio | **Referencia** | 5 | No reutilizable (React/R3F). El GLB sale en mm y con líneas auxiliares en la escena [NO VERIFICADO el contenido exportado]. |
| `apps/web/store/foldStore.ts` (86), `FoldControls.tsx`, `App.tsx`, `hooks/useFold.ts` | Estado y UI React/Zustand | `buildFoldUI` (DOM manual) | **No** | — | La UI de V3 es DOM/vanilla dentro de CEP; React añadiría ~1 MB (el build web pesa 1.03 MB / 289 KB gzip) sin necesidad. |
| `packages/core/vite.config.ts`, `package.json` | Build de librería | — | **Adaptar** | 1 | Solo emite ES module; V3 necesita **IIFE**. `zod` declarado y sin uso → eliminar. |
| `docs/mvp2-spike/*`, ADR-002, spikes | Editor 2D con Paper.js | — | **No** | — | Fuera de alcance V3. |

## 2. Comparación funcional plugin ↔ web (geometría, plegado, materiales, exportadores)

| Área | Plugin instalado | Web `core` + `apps/web` | Ganador / acción |
|---|---|---|---|
| **Curvas Bézier** | Se ignoran (solo anclas) | Se aplanan (16 muestras) | Web. Traer `bezier.ts`. |
| **Huecos** | No se restan; centroide-en-hueco descarta panel | `Shape.holes`; un hueco ↔ un panel; error si cruza | Web. Convertir errores en diagnósticos. |
| **Conservación de área** | No existe; pierde 4.9 % en su fixture | Obligatoria (error si difiere 1e-8 relativo) | Web. Ojo: tolerancia muy estricta ante geometría imperfecta. |
| **Tolerancias** | 0.5 mm global con acantilado `<` | 0.500001 mm solo crease→contorno; vértices 1e-6 | Ninguno resuelve crease↔crease; D4. |
| **Panel desconectado** | Se filtra en silencio (conserva el mayor componente) | Error explícito | Web (regla "no ocultar"). |
| **Rendimiento topología** | ≈ n^2.5 (≈10.5 s a 484 seg.) | ≈ n^1.9 (7.6 ms a 484 seg.; 500 ms a 4 516) | Web. |
| **Entrada real de Illustrator** | Procesa el export real (13 paneles) | **Falla** (panel desconectado) | Plugin hasta resolver D4. |
| **Plegado: matemática** | Pivote/alineación/ángulo anidados | Igual cadena de transformaciones | Equivalentes. |
| **Plegado: signo por crease, "ALL", reset** | Sí | No (ángulo crudo; un solo slider) | Plugin. |
| **Bisagras/puentes visuales, etiquetas, resaltado** | Sí | No | Plugin. |
| **Cambiar base** | Reconstruye árbol (`setBasePanel`) | `buildFoldTreeOnly` sin recomputar topología | Web (idea). |
| **Materiales** | 3 presets de color, `MeshPhongMaterial`, espesor 0.1–20 mm, def. 0.25 | Un color fijo `0xeaeaea`, espesor 0.5 por defecto en `parseDieline` | Ninguno tiene PBR; V3 parte de cero. Unificar espesor por defecto (0.25). |
| **Arte** | Front/Back/Tiro/Retiro por artboard/capa, UV por artboard | No | Plugin. |
| **Exportar GLB** | Escritor propio; mm; PNG de arte embebido; un nodo por malla; sin extensiones; `roughness 1`; `BLEND` | `GLTFExporter` sobre toda la escena (incluye líneas auxiliares) | Ninguno es adecuado para Dimension: V3 define uno (Fase 5; unidades en metros). |
| **Exportar OBJ** | No | No | Nuevo en V3. |
| **Captura PNG** | Función existe, botón oculto, depende de `preserveDrawingBuffer` | No | Rehacer (Fase 5). |
| **Pruebas** | 0 | 70 | Web. |

## 3. Qué se trae y cuándo

| Fase | Del web | Condición |
|---|---|---|
| 1 | **Nada** al producto. Solo fixtures y el patrón de pruebas. | Fase 1 conserva el motor del plugin (con pruebas de caracterización que documentan sus defectos). |
| 2 | `bezier`, `geometry`, `planarGraph`, `topology`, `duplicateGeometry`, tipos, tests | Con política de tolerancia aprobada (D4) y salida de diagnósticos estructurados; el motor viejo queda detrás de un interruptor hasta demostrar paridad. |
| 4 | Reglas de nombres de capa (`classifyLines`) | Para convención de capas de acabados. |
| 5 | Ideas (no código) de exportación | — |

## 4. Observaciones de gobernanza (aplican al copiar código)

- El repo web es **propietario** (© Gerardo Calambas / TesserArt): mover código entre los dos repos es del mismo titular, pero queda constancia en `PROVENANCE.md` (archivo, commit de origen).
- `HANDOFF.md` advierte de copias antiguas en `~/Downloads/tesseract-web*` con commits firmados por otra herramienta: **copiar solo desde `Documents/Antigravity/Tesseract/tesseract-web`** (verificado: 58 commits, un único autor).
- `CLAUDE.md` del repo web prohíbe atribución de IA en commits; para V3 lo mismo (regla que ya tienes guardada). Aplica desde el primer commit.
- Reglas de ese repo que V3 debe **heredar como pruebas**: el troquel no se altera, conservación de área, panel desconectado = error, creases = segmentos finitos, `core` no importa `three`/DOM.
