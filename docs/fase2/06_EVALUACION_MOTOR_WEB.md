# F2.0 · 06 — Evaluación preliminar del motor candidato (tesseract-web)

Objeto: `tesseract-web/packages/core/src/fold-engine/` en `c0aeb34` (repositorio propietario del usuario, **solo lectura**; se empaqueta con esbuild a `tests/results/f2/`, ignorado por git; `git status` del repositorio web limpio tras la evaluación). No se incorpora nada al producto.

## 1. Qué es y qué resuelve

| Aspecto | Motor web | Legacy |
|---|---|---|
| Tamaño | `fold-engine/` ≈ 990 líneas TS (planarGraph 343, topology 401, bezier 105, geometry 65, transforms 66); `svg-import/` (≈ 1 090) **no** hace falta: V3 recibe el `Dieline` de ExtendScript | ≈ 700 líneas JS |
| Interfaz | `buildFoldTopology(FoldInput) → FoldTopology` (paneles con id, `parentId`, `creaseId`, `depth`, huecos por panel, `creaseAdjacency`, `geometryArea {expected, generated, difference}`), `buildFoldTreeOnly(topology, baseId)`, `computePanelTransforms` | 5 operaciones de `GeometryEngine` v1 |
| Dependencias | Ninguna en tiempo de ejecución para `fold-engine/` (`zod` solo lo usa `svg-import`) | Ninguna |
| Chromium 99 | `esbuild --target=chrome99 --format=iife`: compila **sin avisos**, 26 KB [MEDIDO]. Ejecución en CEP real [NO VERIFICADO] | Validado en CEP real |
| Curvas | Aplana Bézier con 16 muestras fijas por tramo (`CURVE_EPS = 1e-4` para detectar curva) | Solo anclas (KI-07) |
| Intersecciones | Todas las parejas (O(n²)), parámetros de corte por segmento, colineales por solape; sin iteración ni `splice` | Iterativo con reinicios (≈ n^2.5, KI-08) |
| Ciclos/caras | Mismo recorrido de caras que el legacy («backIdx − 1») sobre aristas atómicas fusionadas | Igual |
| Huecos | Asigna cada hueco a una sola cara o **lanza**; rechaza huecos solapados/anidados | No resta huecos (KI-06); centroide en hueco ⇒ descarta (KI-05) |
| Contorno | **Nunca se mueve**: solo proyecta vértices de crease sobre el contorno a ≤ 0,500001 mm | Fusiona vértices del contorno (`getVid`) |
| Filtros | Ninguno de área/delgadez; caras con área ≤ 1e-7 o centroide fuera del contorno no son paneles | 5 filtros silenciosos (KI-19, KI-04) |
| Errores | Lanza si no conserva área (rel. 1e-8), si hay paneles desconectados o huecos ambiguos | Nunca lanza; descarta en silencio |
| Precisión | double; `NUMERIC_EPS = 1e-9` absoluto en productos cruzados (mm²: depende de s²), `PARAM_EPS = 1e-9`, fusión 1e-6 mm, sin origen local | double; tolerancias de 0,5 mm |
| Tiempo (Node 24, M1 Max) | 1,70 ms Caja Botánica · **0,65 ms** rejilla 8×8 | 2,92 ms · **26,1 ms** [MEDIDO, piso optimista] |

## 2. Resultados medidos (`tools/f2/motor-web.mjs`, `experimento-tolerancias.mjs`)

| Fixture | Motor web tal cual (×0,25–×4) | Lectura |
|---|---|---|
| `caja-botanica-real` (extracción original) | **13 paneles a las 15 escalas**, área generada = esperada (27 593,19 normalizada), 12 adyacencias | Correcto e invariante: con extremos exactos no necesita tolerancia |
| `ill-real-caja-botanica` (Illustrator real ×1) | **Lanza a todas las escalas** ≥ ×0,5: «geometry conservation failed» (pierde ≈ 1 600 mm², el panel O0 de 40 × 40 queda fuera del recorrido); a ×0,25 «1 panel disconnected» | Falla con ruido de 0,0025–0,005 mm: solo ajusta crease→contorno; las uniones crease–crease con ruido no se fusionan (fusión 1e-6) |
| `caja-botanica-illustrator-export` (histórico ×0,75) | Lanza a todas las escalas («1 panel disconnected») | Igual causa |
| `ill-real-caja-simple` / `compuesto` | 2 paneles, 5 900 mm² netos, invariante | Correcto (resta el hueco) |
| `ill-real-curvas` | 2 paneles, 7 101,77 mm² (aplanado), invariante | Correcto dentro del aplanado |

Con **snap y fusión ε ∈ [0,02, 0,1] mm** (sombra parametrizada, no el motor tal cual) los tres fixtures de la Caja Botánica dan 13 paneles a ×0,25–×4 y |ΔA| ≤ 0,072 mm²; la conservación estricta 1e-8 del motor se incumple por la propia fusión (mueve vértices del contorno) ⇒ habría que cambiar el criterio a τ_A (03 P-1).

## 3. Diferencias de concepto frente al legacy

1. **Arreglo exacto + errores explícitos** frente a **tolerancia amplia + descarte silencioso**. Es la dirección correcta para M1, M7, M8 y M9 del contrato.
2. **Su tolerancia de snap también es absoluta y vale 0,5 mm** (`0.500001`, «mirrors the plugin’s endpoint tolerance»): hereda D1 en potencia. Hoy no se manifiesta porque solo proyecta extremos de crease sobre el contorno y el troquel no tiene extremos a 0,5 mm del corte; un extremo libre a 0,4 mm de un corte **ajeno** se proyectaría igual.
3. **Clasificación de caras por centroide** (`pointInPolygonInclusive(centroid, outer)`, con la tolerancia lateral de 0,5 mm): una cara no convexa con el centroide fuera del contorno se perdería (mismo patrón que E6 del legacy).
4. `NUMERIC_EPS = 1e-9` absoluto en productos cruzados: depende de s² (inocuo en el rango medido).
5. Aplanado con número fijo de muestras: una arista curva de 0,0035 mm genera 16 puntos a escala de ruido.
6. Adyacencia sobre **aristas del grafo** (no creases crudas): corrige KI-04 por construcción.

## 4. Coste de integración y mantenimiento [INFERENCIA]

- **Mecánico:** bajo. Adaptador `FoldTopology → PanelModel v1` (vértices, `edges` tipadas, área, centroide; `creaseEdges` con `creaseIdx`/`segIdx`; `AdjacencyEdge` con `creaseIdx`; `FoldEdge` con `sign`) y `defaultBaseIndex` (el web elige la mayor área **neta**; el legacy la mayor área bruta). Coordenadas: el web devuelve polígonos **centrados** (`centerOffset`); el adaptador debe deshacerlo para no cambiar X1.
- **Funcional:** medio. Las excepciones del web deben convertirse en diagnósticos (M9) en lugar de romper la UI; hay que añadir el ajuste crease–crease y la banda ambigua (P-3, P-6), y decidir el criterio de conservación (τ_A).
- **Mantenimiento:** dos motores durante 2B (Plan §5); duplicar en V3 el código fuente (copia versionada con procedencia) en vez de depender del repositorio web, que es de referencia (decisión DP-5).
- **Riesgo:** el web nunca se ha ejecutado en CEP; su comportamiento con troqueles reales distintos de la Caja Botánica es desconocido (sin corpus).

## 5. Alternativas comparadas

| Opción | Resuelve KI-22 | Riesgo | Coste | Recomendación |
|---|---|---|---|---|
| A. Parchear tolerancias del legacy | **No** (D2 persiste: 11 paneles con ε ≤ 0,1) | Alto (cambia todos los hashes sin arreglar) | Bajo | **Descartar** |
| B. Normalizador previo (D4) + legacy | Parcial: no arregla D2 (el prototipo de la Fase 0 ya falló) | Medio | Medio | Solo como etapa común |
| C. Motor web tal cual detrás de `GeometryEngine` | Sí para `caja-botanica-real`; **no** para la extracción real de Illustrator (lanza) | Medio | Bajo–medio | No suficiente |
| **D. Motor «arreglo exacto» (base web) + ajuste tipado P-3 + diagnósticos M9, detrás de `GeometryEngine`, legacy por defecto** | Sí en las 3 variantes medidas (con ε ∈ [0,02, 0,1]) | Medio, acotado por el interruptor | Medio | **Recomendada** para F2A/2B |
| E. Biblioteca externa (p. ej. Clipper2, JSTS/GEOS, CGAL vía WASM) | Posible (operaciones booleanas/arreglos robustos) | Licencias, tamaño, WASM en Chromium 99 [NO VERIFICADO] | Alto | Reserva si D falla en el corpus |

Arquitectura: el candidato vive en `src/core/candidate/` como un segundo objeto `GeometryEngine` congelado; `main.js` sigue creando **solo** `legacy` por defecto; el candidato se selecciona únicamente por un interruptor de desarrollo explícito (no persistente, no visible al usuario final) hasta cumplir los 7 criterios de promoción del Plan §5.
