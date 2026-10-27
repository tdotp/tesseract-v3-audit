# F2.0 · 03 — Inventario de tolerancias y unidades · política propuesta

## 1. Inventario (estado en `1cc1065`)

Columnas: **dominio** (qué se compara), **unidad**, **escala** (cómo cambia la decisión con una escala uniforme s: *invariante*, *lineal* = umbral fijo frente a longitud que crece con s, *cuadrática* = frente a área/producto que crece con s²), **tipo** de comparación, **impacto topológico** y si **descarta** geometría.

### 1.1 Motor (`src/core/legacy/`)

| # | Dónde | Valor | Dominio | Unidad | Escala | Tipo | Impacto topológico | Descarta |
|---|---|---|---|---|---|---|---|---|
| T1 | `constants.js` `GRAPH_EPS` → `ptEq` (`getVid`, `buildTopology`) | 0,5 | distancia punto-punto | mm | **lineal** | `<`, primer candidato, no transitiva | **Fusiona vértices** (mueve hasta 0,5 mm, también el contorno); colapsa aristas < 0,5 mm | Sí (aristas) |
| T2 | `pointOnSeg` (troceado E3) | 0,5 | suma de distancias `d1+d2−len` y `d1,d2 > ε` | mm | **lineal**, y el alcance lateral crece con `√len` | `<` / `>` | **Inserta vértices** (T) donde no hay contacto; alcance lateral `√(2t(1−t)·len·ε)` (5 mm para len = 100) | Indirecto |
| T3 | `segSegIntersect` `|det| < 1e-9` | 1e-9 | producto cruzado de dos vectores | mm² | **cuadrática** | `<` | Trata como paralelos segmentos con sen θ < 1e-9/(|a||b|); hoy solo nivel de redondeo | No |
| T4 | `segSegIntersect` `λ, γ ∈ (1e-6, 1−1e-6)` | 1e-6 | parámetro | — | invariante | intervalo abierto | Cruces a < 1e-6·len de un extremo no se cortan (los cubre T2) | No |
| T5 | `pointOnSegment2D` / `pointInPolygonInclusive` | 0,5 | distancia lateral punto-segmento | mm | lineal | `<=` | Clasificación cáscara/hueco (E1) y centroide en cáscara (E6) | Sí (E6) |
| T6 | `edgeMatch` (adyacencia estricta E7) | 0,5 | distancia entre extremos (ambos) | mm | lineal | `<` | Adyacencia: si la arista del panel está troceada, **no** casa (KI-04) | Sí (vía E8) |
| T7 | `buildAdjacency` `eps = max(GRAPH_EPS, 1.0)` | 1,0 | distancia lateral a la recta | mm | lineal | `>` | Adyacencia robusta por solape | No |
| T8 | `lineOverlapSegment` solape mínimo | `max(1.2·eps, 0.20·min(len))` | longitud de solape | mm / relativo | mixta | `<=` | Rechaza solapes cortos | No |
| T9 | `edgeKey` `toFixed(2)` | 0,01 | cuantización de coordenadas | mm | lineal | clave de texto | Deduplicación de adyacencias (dependiente de la rejilla) | Sí (duplicados) |
| T10 | `buildPanels` `|área| <= 1` | 1 | área de cara | mm² | **cuadrática** | `<=` | Descarta caras | **Sí, en silencio** |
| T11 | `absArea < 4` | 4 | área de panel | mm² | cuadrática | `<` | Descarta paneles (KI-19) | **Sí, en silencio** |
| T12 | `aspect > 30 && absArea < 120` | 30 / 120 | relación de bbox (invariante) y área (cuadrática) | — / mm² | mixta | `>` / `<` | Descarta solapas delgadas (KI-19) | **Sí, en silencio** |
| T13 | `minDim = max(0.0001, …)` | 1e-4 | dimensión de bbox | mm | lineal | protección de división | — | No |
| T14 | clave de duplicado `toFixed(2)` del centroide y área | 0,01 | cuantización | mm / mm² | lineal / cuadrática | igualdad de texto | Descarta la cara «duplicada» (en la práctica, la cara recorrida dos veces) | Sí |
| T15 | conectividad: desempate `> 0.001` | 0,001 | suma de áreas | mm² | cuadrática | `>` | Elige componente | **Sí, en silencio** (KI-04) |
| T16 | `polygonCentroid` `|a| < 1e-9` | 1e-9 | área | mm² | cuadrática | `<` | Centroide degenerado | No |
| T17 | `pointInPolygonInclusive` `(yk−yi)||1e-9` | 1e-9 | denominador | mm | lineal | protección | — | No |
| T18 | `computeFoldSign` `|cross| < 0.001` | 0,001 | producto cruzado | mm² | cuadrática | `<` | Signo del pliegue (respaldo con el padre) | No |
| T19 | `validate.js` `TOLERANCE_MM` | 0,5 | distancia lateral extremo-segmento | mm | lineal | `>` ⇒ aviso | Ninguno (solo aviso; nunca bloquea) | No |
| T20 | `maxIter = n² + 500`, `maxSafety = 4V + 100` | — | iteraciones | — | — | corte de bucle | Puede truncar el troceado o una cara en silencio | Sí (silencioso) |

### 1.2 Extracción (`src/host/extract.js`, ExtendScript)

| # | Valor | Dominio | Unidad | Escala | Efecto |
|---|---|---|---|---|---|
| X1 | `PT = 0.352778` | conversión pt→mm | mm/pt | — | Error relativo 6,3e-7 frente a 25,4/72 (0,3 µm en 500 mm): despreciable, pero no exacto |
| X2 | `EPS = 0.5` | hueco entre extremos de un corte abierto | mm | lineal | Si ≤ 0,5 mm el trazado abierto se trata como cerrado |
| X3 | `SMALL = 10` | longitud de crease cerrada | mm | lineal | Creases cerradas < 10 mm se ignoran (en silencio) |
| X4 | `mob > mca·2` | área de bbox de un abierto frente a mayor cerrado | mm² | cuadrática (ambos lados: invariante) | Elige contorno abierto como exterior |

### 1.3 Escena y plegado (no topológicas; fuera del alcance de KI-22)

`crease-visuals.js` `len < 1e-4` mm, `inset ∈ [0.04, 0.35]` mm, `CREASE_HINGE_SHOW_THRESHOLD_DEG = 2°`; `config/look.js` desplazamientos Z de 0,003–0,18 mm y radio de bisagra `max(0.45, 0.46·espesor)`; `EdgesGeometry` 1°; `earcut` interno de three r132 (sin tolerancia expuesta). Son de presentación: **no** cambian paneles ni adyacencias.

### 1.4 Motor candidato (`tesseract-web`, `c0aeb34`, solo referencia)

`GRAPH_SNAP_TOLERANCE_MM = 0.500001` (solo proyecta **vértices de crease** sobre el contorno; el contorno nunca se mueve), `vertexMergeTolerance = 1e-6` mm, `NUMERIC_EPS = PARAM_EPS = 1e-9`, `AREA_NUMERIC_EPS = 1e-7` mm², conservación de área relativa `1e-8`, aplanado de Bézier con 16 muestras fijas y `CURVE_EPS = 1e-4` mm. Detalle en `06_EVALUACION_MOTOR_WEB.md`.

## 2. Análisis

**Hallazgo central [MEDIDO].** En el troquel real coexisten dos escalas de longitud separadas por dos órdenes de magnitud:

| Magnitud | Valor medido | Origen |
|---|---|---|
| **ν** — ruido de coordenadas entre elementos que deben coincidir | 0 (extracción original) · **≤ 0,005 mm** (SVG reabierto en Illustrator) | redondeo de la exportación SVG |
| **ℓ** — geometría real más corta relevante para la topología | **0,4974 mm** (escalones del contorno y separación entre creases paralelas) | diseño del troquel |

El legacy pone su única tolerancia (0,5 mm) **encima de ℓ**. Cualquier ε fijo con `ν < ε < ℓ` separa ambas escalas; con ε = 0,5 no hay separación posible porque ε ≈ ℓ.

**Ninguna tolerancia escalar sobre distancias sirve para todo [MEDIDO].** En el mismo troquel hay aristas de **contorno** de 0,5009 mm y de 0,0035 mm (curva de trazado) y **holguras** crease-crease de 0,4974 mm: la longitud por sí sola no distingue «arista real que hay que conservar» de «hueco que hay que cerrar». La decisión tiene que depender del **tipo** de elemento (qué se puede mover: solo extremos de crease) y de la **relación** (extremo libre frente a segmento), no solo de la distancia.

**¿Tolerancia absoluta o relativa al tamaño de la pieza?** Las dos escalas relevantes son **físicas y no crecen con el tamaño de la caja**: ν depende de la precisión de exportación; ℓ del espesor del cartón y del oficio del troquelista (una caja el doble de grande no tiene escalones de 1 mm). Una tolerancia relativa `ε = k·D` (D = diagonal) acopla ε al tamaño, y para k fijo falla en piezas grandes (D = 2 000 mm, k = 1e-3 ⇒ ε = 2 mm > ℓ). En cambio el **error de coma flotante** sí es relativo a la **magnitud de las coordenadas** (no al tamaño de la pieza): u·M con u = 2⁻⁵³ y M = máx |coordenada|. Conclusión: **tolerancia geométrica absoluta en mm físicos + tolerancia numérica relativa a la magnitud de las coordenadas (tras llevarlas a un origen local)**. La invariancia ante escala es una **propiedad a verificar dentro de un dominio**, no el principio de diseño.

**Normalización a coordenadas canónicas.** Traslación a un origen local (mín. de la bbox): **sí** — elimina la pérdida de precisión medida a +1e7 mm y no cambia ninguna distancia. Escalar a una caja unidad: **no** — convertiría la tolerancia física en relativa al tamaño (el error descrito arriba).

**Predicados robustos.** `orient2d`/`incircle` adaptativos (Shewchuk) hacen exactas las decisiones de lado/colinealidad a partir de coordenadas double; eliminan T3, T4, T16 y T17 y las sustituyen por respuestas exactas. No resuelven por sí solos el ruido ν (la entrada ruidosa sigue siendo ruidosa): hacen falta **junto** a un ajuste (snap) explícito y tipado.

**Cuantización controlada.** Redondear coordenadas a una rejilla g produce el mismo problema de frontera (dos puntos a 0,1·g pueden caer en celdas distintas). Solo es aceptable como canonicalización **numérica** de puntos de intersección calculados (g ≪ ν, p. ej. 1e-6 mm) o en un esquema de *snap rounding* formal. No se propone para F2A.

**Casos particulares exigidos**

| Caso | Comportamiento actual | Requisito propuesto |
|---|---|---|
| Troqueles pequeños y grandes | ε fijo 0,5: troqueles pequeños pierden detalle; grandes no cierran holguras > 0,5 | ε físico pequeño (≈ 0,05) + aviso si hay geometría en la banda ambigua |
| Segmentos muy cortos | `getVid` colapsa aristas < 0,5 mm, también del contorno | El contorno nunca se fusiona ni se mueve; aristas de longitud 0 se eliminan (mismo punto); el resto se conserva |
| Líneas casi coincidentes (crease sobre corte con 0,0035 mm) | `pointOnSeg` las cose con alcance lateral variable | Proyectar el **extremo de crease** sobre el corte si `h ≤ ε_snap` y registrar la incidencia simbólica (segmento, parámetro) |
| Ángulos casi paralelos | `|det| < 1e-9` mm² | `orient2d` exacto; colinealidad exacta o por incidencia registrada |
| Intersecciones cerca de extremos | λ ∈ (1e-6, 1−1e-6) + T2 | Parámetro exacto; extremo dentro de ε_snap ⇒ incidencia en el vértice existente |
| Intersecciones T | T2 (suma de distancias) + E7 estricta (pierde paneles) | Snap lateral tipado + adyacencia sobre **aristas del grafo** (no creases crudas) |
| Curvas aplanadas | Anclas (KI-07); web: 16 muestras fijas | Aplanado por **error de cuerda** δ_c (p. ej. δ_c = ε_snap / 4) con el área exacta de Bézier como oráculo |
| Ruido y coma flotante | Coordenadas absolutas, áreas por suma de productos absolutos | Origen local; tolerancia numérica `δ = c·u·M` |

## 3. Política de tolerancias propuesta (para aprobación)

**P-1 · Separación de roles.** Cada tolerancia tiene un único rol y un nombre; ninguna se reutiliza para otro:

| Rol | Símbolo | Unidad | Fórmula / valor | Estado del valor |
|---|---|---|---|---|
| Ajuste de extremos de crease (a corte o a otra crease) | `ε_snap` | mm físicos | constante; **propuesta inicial 0,05 mm** = media geométrica de ν = 0,005 y ℓ = 0,497 (margen ×10 a cada lado) | **Pendiente de calibración** con el corpus (≥ 10 troqueles) |
| Banda ambigua (aviso, nunca decisión silenciosa) | `[ε_snap/ρ, ε_snap·ρ]` | mm | `ρ = 3` ⇒ [0,017, 0,15] mm | ρ pendiente de calibración |
| Identidad numérica de puntos calculados | `δ_num` | mm | `δ_num = 64·u·M`, u = 2⁻⁵³, M = máx \|coord\| en origen local (M = 400 mm ⇒ 2,8e-12 mm) | Derivada; no se calibra |
| Decisiones de lado/colinealidad | — | — | `orient2d` exacto (sin tolerancia) | Requiere elegir implementación (DP-4) |
| Aplanado de curvas | `δ_c` | mm | error de cuerda `≤ ε_snap/4` | Pendiente de calibración |
| Conservación de área (oráculo) | `τ_A` | mm² | `|ΔA| ≤ ε_snap · Σ (longitudes de las aristas incidentes en extremos ajustados) + δ_num·P` | Derivada (cota de primer orden) |
| Filtros de área/delgadez | — | — | **Eliminados como descarte**; se convierten en diagnóstico | Decisión DP-3 |

**P-2 · Qué puede moverse.** Solo los **extremos libres de crease** (y vértices interiores de crease cuando caen sobre otra geometría). El contorno de corte y los huecos **no se mueven ni se fusionan nunca** (hash idéntico tras el ajuste: puerta V1 del D4).

**P-3 · Cómo se ajusta.** Para cada extremo libre de crease: candidato = segmento más cercano (corte o crease ajena) por **distancia lateral** con parámetro acotado a [0, 1]; si `h ≤ ε_snap` se proyecta y se registra la incidencia (id de segmento, parámetro). Si hay dos candidatos a menos de `ε_snap·ρ` ⇒ **ambigüedad** reportada, sin decidir en silencio.

**P-4 · Topología exacta.** Tras el ajuste, el arreglo plano se construye con predicados exactos y con las incidencias registradas; la identidad de vértices usa `δ_num`, no `ε_snap`.

**P-5 · Trazabilidad.** Cada ajuste, ambigüedad, cara descartada o componente desconectada produce un registro `{tipo, elementos, distancia, regla}` visible en el resultado del motor.

**P-6 · Dominio declarado.** El motor declara su dominio: `ν_max < ε_snap/ρ` y `ℓ_min > ε_snap·ρ`, medidos sobre la entrada. Si la entrada lo incumple (hay geometría en la banda ambigua) el resultado se marca **ambiguo** en vez de elegir.

### Criterios de validación de la política

1. **Separación medida:** sobre todo el corpus, `max ν < ε_snap/ρ` y `min ℓ > ε_snap·ρ`; si un troquel lo incumple, el motor lo marca ambiguo (no es un fallo de la política sino del dominio).
2. **Metamórficas:** resultado normalizado idéntico para s ∈ [ρ·ε_snap/ℓ_min, ε_snap/(ρ·ν_max)] (para la Caja Botánica con ε = 0,05, ρ = 3: s ∈ [0,30, 3,33]), traslaciones hasta ±10⁵ mm, rotaciones, reflexión, sentido de trazados y orden de entrada.
3. **Oráculos (ver `05`):** conservación de área con `τ_A`, cada crease entre dos caras distintas o reportada, Euler coherente, árbol que alcanza todas las caras o diagnóstico.
4. **Sensibilidad:** al variar ε_snap en [ε/2, 2ε] el resultado no cambia en el corpus (si cambia, ε está en la banda de algún troquel).

**Evidencia experimental de la política [MEDIDO, `experimento-tolerancias`, sombra del motor web con snap + fusión]:** con ε entre 0,02 y 0,1 mm, los dos fixtures de la Caja Botánica dan **13 paneles a todas las escalas ×0,25–×4**, con |ΔA| ≤ 0,072 mm² (≤ 1e-3 · ε·P·s). Con ε = 0,5 el área se desvía 18,8 mm² (se colapsan escalones reales) y con ε ≤ 0,01 el fixture con ruido falla a ×4 (el ruido escalado supera ε). Es decir: la ventana medida es `0,02 ≲ ε ≲ 0,1 mm`, coherente con la propuesta de 0,05 mm. **No** valida todavía la política completa (P-3/P-5 no existen en ningún motor).
