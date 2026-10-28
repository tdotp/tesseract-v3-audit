# F2A-2 — Adaptador experimental a PanelModel v1 y árbol de plegado · Informe

Fecha: 2026-10-27 · Base: `c14da24` (F2A-1 cerrada y aprobada) · Autorización: F2A-2 (solo implementación experimental controlada). **Sin cambios en `src/`, `panel/`, `reference/`, `GeometryEngine`, módulos legacy, plegado o escena de producción, exportación GLB, pruebas de F1, `tests/run-all.sh`, goldens, huellas ni scripts de build o instalación** (`git diff --stat c14da24 HEAD -- src panel reference tests/node tests/browser tests/golden tests/run-all.sh tools/build tools/install.sh` vacío). El motor experimental **no** está en el bundle de V3, el motor por defecto sigue siendo el legacy y V3 no está instalada. F2A-3 y F2B no iniciadas.

Etiquetas: [MEDIDO] ejecutado y registrado · [CONFIRMADO] comprobado por prueba · [INFERENCIA] deducido, sin prueba directa · [NO VERIFICADO].

## 0. Commits (locales, sin push)

| Commit | Contenido |
|---|---|
| `0f271a3` | Bloque 1: adaptador `experimental/plegado/adaptador.js`; `nucleoDetallado()` en el núcleo (la salida de `nucleo()` es idéntica a `c14da24` en 27 casos [MEDIDO]); las aristas del arreglo guardan su segmento de origen; `f2a2-adaptador` (56 pruebas) |
| `95c9f33` | Bloque 2: `experimental/plegado/arbol.js` (adyacencias por pareja y árbol BFS), desempate geométrico del orden de paneles; `f2a2-arbol` (100) |
| `57a9c66` | Bloque 3: comparación con el legacy clasificada (`tests/lib/f2/plegado-legacy.mjs`, `tools/f2/comparar-legacy-plegado.mjs`, evidencia `f2a2-legacy.{json,md}`); `f2a2-legacy` (37) |
| `393e230` | Bloque 4: `tools/f2/rendimiento-plegado.mjs` y evidencia `f2a2-rendimiento.{json,txt}`; `f2a2-aislamiento` (6, con Chrome headless) |
| commit de cierre | este informe, la evidencia de la batería y `HANDOFF.md` (ver `git log -1`) |

## 1. Arquitectura entregada (`experimental/plegado/`, 247 líneas, sin dependencias)

```
Dieline v1 (mm) ─ validarEntrada ─ nucleoDetallado (F2A-1, sin cambios de resultado)
   └─ adaptarPanelModel ─► PanelModel v1 {panels, creaseEdges, creases} + f2a2 (extensión declarada; detalle del núcleo NO enumerable)
         └─ construirAdyacencias ─► {adyacencias: AdjacencyEdge v1[], detalle[], diagnosticos[]}
               └─ construirArbolPlegado(modelo, ady, base) ─► {aristas: FoldEdge v1[], niveles, componentes, ciclos, empates, diagnosticos}
               └─ baseDefecto(modelo, {area: 'bruta' | 'neta'})
```
| Archivo | Líneas | Responsabilidad |
|---|---|---|
| `adaptador.js` | 139 | `validarEntrada`, `adaptarPanelModel`, `ErrorPanelModel`, `CONTRATO_PANEL_MODEL = 1`, `MOTOR = 'experimental-f2a2'` |
| `arbol.js` | 105 | `construirAdyacencias`, `construirArbolPlegado`, `baseDefecto` |
| `index.js` | 3 | reexporta la API |
| `package.json` | — | `"type": "module"` (solo Node) |

Cambio mínimo en el núcleo (`experimental/geometria/`): `nucleo()` pasa a llamar a `calcular()` y devuelve exactamente lo de antes; `nucleoDetallado()` devuelve además el arreglo, las caras, la región de cada panel y las polilíneas tras el ajuste; cada arista atómica guarda `refs` (`'C<i>:<k>'`). Verificado: salida de `nucleo()` = `c14da24` (sin `ms`) en los 22 sintéticos, 4 reales y la rejilla 8×8 [MEDIDO]; las 110 pruebas de F2A-1 siguen en verde.

## 2. Adaptador a PanelModel v1

**Contrato leído de `src/core/engine.js` (no se modifica ni se duplica):** `Panel {vertices (CCW), edges: {u, v, type}[], area ≥ 0, centroid}`, `CreaseEdge {a, b, creaseIdx, segIdx}` con `a/b` = anchors de la entrada, `PanelModel {panels, creaseEdges, creases}`; invariantes I1–I10 (sin DOM/THREE/estado, determinista, no muta la entrada, puede compartir objetos, identidad de panel = índice, mm). Consumidores reales de producción revisados: `scene/panel-meshes.js` (vertices, creaseEdges), `fold/folding.js` y `scene/crease-visuals.js` (centroid, foldTree), `ui/fold-controls.js` (buildAdjacency/buildFoldTree/defaultBaseIndex).

| Campo v1 | Qué contiene en el adaptador | Decisión / pérdida |
|---|---|---|
| `panels[i].vertices` | anillo exterior del ciclo del panel, CCW, objetos `{x, y}` nuevos | se quitan las **antenas** (aristas con el mismo panel a ambos lados: creases colgantes y puentes a huecos); los anillos interiores van a `f2a2` |
| `panels[i].edges` | aristas atómicas del anillo exterior; `u`/`v` SON los objetos de `vertices` | `type: 'crease'` solo si la arista es únicamente de crease; una crease superpuesta a un corte es `'boundary'` |
| `panels[i].area` | área **bruta** del anillo exterior (como el legacy) | el área neta (resta huecos) va en `f2a2.paneles[i].areaNeta`; DP-6 sigue aplazada |
| `panels[i].centroid` | centroide ponderado del anillo exterior (con origen local) | solo para presentación (etiquetas, puentes); el signo NO lo usa |
| `creaseEdges` | **idénticos al legacy**: un elemento por segmento de la entrada, con alias de los anchors | el cierre de una crease cerrada no entra (como el legacy) y se declara en `f2a2.cierres` |
| `creases` | la lista de la entrada (alias) | — |
| `f2a2` | `motor`, `contrato`, `unidades: 'mm'`, `ejeY: 'arriba'`, `orientacion`, `opciones`, `paneles[i] = {id, creases, areaNeta, huecos: [{tipo: 'hueco'|'crease'|'mixto', area, vertices CW}], bordesCorte, islas}`, `cierres`, `conversiones`, `diagnosticos`, `componentes`, `conservacion`; `detalle` no enumerable | los objetos v1 no llevan campos extra (comprobado por prueba) |

**Identificadores [CONFIRMADO].** Índice v1 = orden canónico del núcleo (conjunto de creases que separan el panel + área) y, **a igualdad exacta de esa clave** (paneles simétricos), vértice mínimo (x, y). Primera versión sin ese desempate: el índice cambiaba al invertir el contorno en `x-cruz` y `t-exacta` (3 pruebas de permutación fallaron; resultado negativo conservado). `f2a2.paneles[i].id` = identificador `F<k>` del núcleo.

**Unidades, escala, orientación, coordenadas [CONFIRMADO]:** mm, sin conversión ni escala; eje Y arriba; vértices de entrada sin redondeo (en la Caja Botánica más del 90 % de los vértices son puntos de la entrada, y el resto son cruces declarados).

**Conversiones con pérdida, siempre declaradas con su cuenta** (`f2a2.conversiones`): `cruce-aproximado` (precisión: coordenadas de cruces en double, topología exacta) · `punto-ajustado-redondeado` (precisión: extremos ajustados exactos redondeados a double) · `antenas-fuera-del-contorno` (representación) · `huecos-solo-en-extension` (representación: v1 no representa huecos, KI-06) · `curvas-a-polilinea` (representación: anclas o N muestras) · `cierre-de-crease-fuera-de-creaseEdges` (representación).

**Rechazo de entradas [CONFIRMADO, 18 entradas u opciones inválidas]:** `ErrorPanelModel('entrada-invalida', diagnosticos)` con códigos `dieline`, `dieline-error`, `unidades`, `trazado`, `trazado-corto`, `ancla`, `manejador`, `lista`, `dominio` (|v| > 1e9 o subnormal en la práctica: fuera del supuesto de los predicados), `opcion-eps`, `opcion-rho`, `opcion-curvas`. `'nucleo-incoherente'` si Euler, la paridad o la intangibilidad del contorno fallan; `'adaptador-incoherente'` si bruta − huecos ≠ neta del núcleo o un panel no tiene anillo exterior. La entrada nunca se corrige ni se completa.

## 3. Adyacencias y árbol de plegado

- **Una `AdjacencyEdge` por pareja de paneles** (el legacy da una por segmento de crease). Eje `crease {a, b}` = envolvente, sobre la recta, de las aristas atómicas **colineales** (orientación exacta, `orientG`) que separan la pareja, orientada como el segmento de crease de la entrada; `creaseIdx` = menor crease del eje. Si la pareja comparte aristas **no colineales** ⇒ diagnóstico `adyacencia-no-colineal` (un pliegue rígido no puede plegar por dos rectas) y el eje es el grupo colineal más largo. También `adyacencia-varias-creases` y `adyacencia-discontinua`.
- **Lado del pliegue (signo) exacto por topología:** un panel está a la izquierda de cada semiarista de su ciclo CCW; `sign = +1` si el hijo está a la izquierda de a→b, la **misma convención** que `computeFoldSign` del legacy, pero sin centroide, así que también vale con paneles no convexos.
- **Árbol:** BFS por niveles desde una **base explícita** (base inválida ⇒ `ErrorPanelModel('base-invalida')`, nunca otra en silencio). Padre de cada panel = vecino del nivel anterior con la crease compartida más larga (tolerancia relativa 1e-9) y, a igualdad, el que entró antes en el árbol; los hijos se ordenan por padre y por vértice mínimo. Nada depende del orden de la entrada salvo empates exactos de orden, que se cuentan (`empates`).
- **Componentes y ciclos:** `componentes`, `noAlcanzados` y diagnóstico `componente-desconectado`; las adyacencias fuera del árbol se listan con el número ciclomático (diagnóstico `ciclo`: esos pliegues no quedan restringidos por el árbol).
- **Base por defecto:** mayor `area` v1 (bruta, la regla del legacy) con desempate geométrico; `baseDefecto(m, {area: 'neta'})` da la alternativa de DP-6 (pueden diferir: prueba con un panel de 4 000 mm² brutos y 3 000 netos).
- **Compatibilidad conceptual [CONFIRMADO en 34 casos]:** `buildFoldTree` del **legacy** aplicado al modelo v1 y a las adyacencias del adaptador da **los mismos niveles** que el árbol experimental; `computeFoldSign` (centroide) coincide con el signo del adaptador en **todos los hijos convexos**. La convención de plegado de `src/fold/folding.js` (pivote en a, ángulo interno = visible × sign, mano derecha sobre a→b) se reprodujo en un plegado rígido independiente: a 0° todo queda plano; las bisagras unen padre e hijo en cualquier ángulo; +90° visibles levantan siempre el hijo hacia +z.

## 4. Pruebas (`tests/experimental/`, 199 nuevas; 309 con las 110 de F2A-1)

| Archivo | N | Qué comprueba |
|---|---|---|
| `f2a2-adaptador` | 56 | contrato v1 exacto (claves, tipos, CCW, alias); 29 casos frente al oráculo (identidad por firma, área neta, bruta − huecos = neta, huecos, vértices sobre el borde del oráculo, conservación, parejas adyacentes y sus creases, eje en el borde de los dos paneles, componentes, tipo de arista sobre su línea); `creaseEdges` = legacy con alias (I4, `aliasPrint`); crease cerrada; 18 entradas u opciones inválidas y un modelo ajeno (el del legacy) rechazado; determinismo; unidades |
| `f2a2-arbol` | 100 | 30 casos desde la base por defecto y 42 bases explícitas: niveles = BFS independiente sobre el oráculo, cada arista es una adyacencia, **signo = lado por sondas geométricas sobre el polígono del oráculo** (no por semiaristas); plegado rígido (4 casos); 24 permutaciones con árbol canónico idéntico y en el mismo orden; 24 transformaciones (×2, ×½, 90°, 180°, reflexión, ×0,75, 37°, +1e5); A-1…A-12 |
| `f2a2-legacy` | 37 | 34 casos contra el legacy (§6) y tres hallazgos concretos |
| `f2a2-aislamiento` | 6 | §8 y §9 |

**Correspondencia con lo pedido (§5 de la autorización):** (1) identidad de paneles y creases → `f2a2-adaptador` (firmas, `creaseEdges`, ids) · (2) área y geometría → neta, bruta, huecos, vértices sobre el borde, conservación · (3) adyacencias → parejas y creases = oráculo; eje en el borde de ambos · (4) transformaciones → 24 casos · (5) permutaciones → 24 casos + repetición · (6) paneles pequeños → `panel-pequeno-1.5mm2` y `panel-delgado-40x1` con su pliegue · (7) huecos → `hueco-centrado/descentrado`, `ill-real-caja-simple`, `ill-real-compuesto`, disco de crease cerrada · (8) T y solapes → `t-exacta`, `t-ruido`, `crease-sobre-corte`, `crease-sobresale`, cadena A-11 · (9) desconectados → `corte-abierto-divide` · (10) A-1…A-12 → un caso cada uno.

## 5. Comparación con el oráculo [CONFIRMADO]

En los 29 casos del adaptador y en los 34 de la comparación: **0 diferencias con el oráculo** (mismas firmas de panel, áreas netas dentro de la tolerancia de representación 1e-9·A + 1e-12·M², mismas parejas adyacentes con las mismas creases, mismas componentes, misma conservación); en los 30 casos y 42 bases del árbol, niveles BFS idénticos a los del grafo de adyacencias del oráculo y signo igual al lado medido por sondas. Única discrepancia detectada durante el desarrollo, en la **prueba** y no en el código: una crease suelta dentro de un panel es una isla del oráculo sin área; el adaptador correctamente no la convierte en hueco (la aserción se ajustó para exigir el diagnóstico `crease-sin-efecto`).

## 6. Comparación con el legacy (`docs/fase2/evidencia/f2a2-legacy.md`) [MEDIDO]

Clasificación por separado de cada diferencia; el legacy no es la verdad geométrica y no se fuerza la equivalencia.

| Clase | Resultado en 34 casos |
|---|---|
| **Errores nuevos del adaptador** (frente al oráculo) | **0** |
| **Esperadas que corrigen errores históricos** (toda diferencia topológica o geométrica; adaptador = oráculo) | 125 en 20 casos, cada caso con su KI o ambigüedad: KI-04 (T), KI-05 (hueco centrado), KI-09 (cara exterior colada), KI-17 (creases cortas), KI-19 (paneles pequeños), KI-22 (Caja Botánica), A-1, A-3…A-7, A-9 |
| **Topológicas** | 91: paneles perdidos, divididos, fusionados o espurios; parejas de más o de menos (Caja Botánica ×1: el legacy pierde C7 y C10 en la original; en Illustrator real funde dos paneles y deja otros tres sin emparejar) |
| **Geométricas** | 34: misma correspondencia con borde desplazado (Caja Botánica: hasta 33,8 mm² por panel, también en el histórico ×0,75, que da 13 en los dos); **0** pliegues con el lado distinto |
| **De representación** | 30: una adyacencia por segmento frente a una por pareja, base por defecto distinta por empate de área, orden de las aristas del árbol, otro padre en un empate BFS (mismos niveles) |
| **Donde el legacy acierta** (rejillas 2×2…8×8, densa, caja simple) | 0 topológicas y 0 geométricas; mismos niveles; mismo lado en todos los pliegues |

Hallazgos nuevos (no corregidos; producción intacta):
1. **KI-09 llega al árbol:** en `x-cruz` y en la rejilla 3×3 de líneas completas, la cara exterior colada (3 200 mm²) es el panel mayor ⇒ es la **base por defecto** del legacy y su árbol tiene **0 pliegues** [CONFIRMADO].
2. **Propuesta KI-36:** `computeFoldSign` decide el lado por el **centroide** del hijo; con un panel no convexo que envuelve a su padre (fixture `envolvente` de `tests/lib/f2/casos-plegado.mjs`), el centroide cae al otro lado de la recta de la crease y el signo sale **invertido** (solo cambia el sentido de la etiqueta +/− y del deslizador; el plegado físico no se rompe [INFERENCIA]). El adaptador acierta (sondas). En los troqueles reales disponibles no ocurre: en la Caja Botánica, 5–7 hijos no convexos con el mismo signo [MEDIDO]. **No registrado en `docs/KNOWN_ISSUES.md`** (pendiente de decisión).

## 7. Rendimiento y memoria (`docs/fase2/evidencia/f2a2-rendimiento.{json,txt}`; Node 24.12, M1 Max; mediana de 20) [MEDIDO]

| Caso | Legacy total (ms) | Experimental total (ms) | N/L | Núcleo | Adyacencias | Árbol |
|---|---|---|---|---|---|---|
| Caja Botánica original | 2,75 | **0,49** | 0,18 | 0,40 | 0,05 | 0,02 |
| Illustrator real, ε 0,05 | 2,82–2,97 | **1,34–1,38** | 0,46 | 1,31–1,36 | 0,04 | 0,01 |
| Histórico ×0,75, ε 0,05 | 1,01–1,05 | 1,91–1,94 | **1,82–1,92** | 1,92–2,01 | 0,03 | 0,01 |
| Caja simple | 0,059 | 0,085–0,090 | **1,44–1,53** | 0,067 | 0,002 | 0,001 |
| Rejilla 2×2 | 0,057 | 0,115–0,136 | **2,0–2,3** | 0,08 | 0,013 | 0,005 |
| Rejilla 4×4 | 0,95 | 0,39 | 0,41 | 0,28 | 0,08 | 0,02 |
| Rejilla 6×6 | 7,05 | 0,95–1,00 | 0,14 | 0,71 | 0,18 | 0,03 |
| Rejilla 8×8 | 28,7 | **1,5–1,6** | 0,05 | 1,21–1,26 | 0,34 | 0,04 |
| Rejilla 3×3 líneas completas | 0,22 | 0,20 | 0,9 | 0,16 | 0,02 | 0,006 |
| Rejilla 4×4 densa | 9,0–9,5 | 0,80 | 0,09 | 0,76 | 0,05 | 0,01 |
(Rangos = dos ejecuciones completas de la herramienta. El coste del adaptador, medido como adaptar − `nucleoDetallado`, es ≤ 0,23 ms y en los casos pequeños cae dentro del ruido: puede salir negativo.)

- **Criterio 5 del Plan §5 (tiempo ≤ legacy en todos los casos): NO SE CUMPLE** — más lento en **3 de 10**, los mismos que en F2A-1: el histórico ×0,75 con ajuste (+0,9 ms) y dos casos diminutos (+0,03–0,08 ms, coste fijo). Adyacencias y árbol suman ≤ 0,4 ms (rejilla 8×8) y el adaptador ≤ 0,23 ms: **no son cuello de botella y no se optimizaron**.
- **Peor caso y efecto del ajuste:** perfil de CPU del histórico con ajuste: ≈ **52 %** en la aritmética de expansiones del núcleo (`grow` 17,4 %, `escalar` 15,1 %, `producto` 11,6 %, `suma` 6,0 %); el arreglo es el 51 % inclusivo y el ajuste el 23 %. Sin ε el núcleo tarda 0,38 ms frente a 1,9 ms con ε (pero la topología cambia: el ajuste es necesario para esa extracción). Contadores de predicados en una ejecución (filtro/exacto/exacto-cero): 471/63/50 en el histórico; 446/80/80 en la Caja Botánica original. Incluso si las expansiones no costaran nada, el histórico quedaría ≈ 0,93 ms frente a 1,01 ms [INFERENCIA]: el margen es pequeño. **No se debilitó ningún predicado.**
- **Memoria:** sin fugas (heap tras GC estable, ≈ 5,2–6,1 MB, en 2 400 ejecuciones por caso). **Heap retenido por resultado:** 157 kB frente a 36 kB del legacy (Caja Botánica) y 479 frente a 128 kB (rejilla 8×8). El **detalle no enumerable del núcleo** que conserva el modelo explica ≈ 80 % (cadena sin detalle: 30 kB en la Caja Botánica y 157 kB en la rejilla 8×8). **Pico de RSS** (50 ejecuciones por proceso): 71–113 MB frente a 53–101 MB; mayor con ajuste (100–113 frente a 66–77 MB) por la basura de las expansiones, como en F2A-1. La columna «tras soltar» de la herramienta tiene un ruido de ±150 kB (valores negativos en el legacy); la prueba de fugas es la referencia.

## 8. Compatibilidad con Chromium 99 [MEDIDO]

- Node 24.12: todas las pruebas.
- `esbuild --target=chrome99` (IIFE) del adaptador, el árbol y el núcleo: **0 errores y 0 avisos**; el bundle y el código fuente no contienen ninguna API de la lista posterior a la 99 (`tests/lib/chromium99.mjs`).
- Contexto `vm` aislado (solo `Math`, `JSON`, `Object`, `Array`, `Number`, `String`, `Map`, `Set`, `WeakMap`, `Error`, `TypeError`, `Symbol`): salida **idéntica byte a byte** a Node en 5 casos.
- **Chrome headless 156.0.8078.73** con las APIs posteriores a la 99 eliminadas antes de cargar (`toSorted`, `Set.union`, `Iterator`…): salida **idéntica byte a byte** a Node en los mismos 5 casos, error explícito `ErrorPanelModel:entrada-invalida` y 0 excepciones de página.
- **Límite:** no es Chromium 99 auténtico (CEF 4844) ni CEP; no se instaló el plugin ni se probó en CEP real (no autorizado).

## 9. Aislamiento [CONFIRMADO]

`src/`, `tools/build/build.mjs` y `tools/install.sh` no mencionan `experimental/`, `adaptarPanelModel` ni `construirArbolPlegado`; `dist/main.js` no contiene ninguna marca del adaptador ni del árbol (huella vigente `dist-a9` verificada por la batería); `experimental/plegado/` solo importa `./x.js` y `../geometria/x.js`; sin `THREE`, `window`, `document`, `console`, `localStorage`, `require`, `process`, `globalThis`, `BigInt`, CEP ni Illustrator; sin `let`/`var` de módulo. `tools/verify-isolation.sh` en verde; CEP de usuario sin V3 (solo `TesserArt_Validator`); sin push.

## 10. Registro de incompatibilidades y decisiones pendientes

| Id | Asunto | Situación / recomendación |
|---|---|---|
| **D-F2A2-1** | `buildAdjacency(panels, creaseEdges)` de v1 **no se puede implementar** con el motor experimental solo a partir de esos dos argumentos: las adyacencias exactas necesitan el arreglo (semiaristas), que v1 no transporta. Hoy: `construirAdyacencias(modelo)` lee `f2a2.detalle` | Para F2A-5: (a) que `buildAdjacency` del motor experimental reciba el modelo (cambio del contrato a v2), o (b) que `buildPanels` precalcule las adyacencias y `buildAdjacency` las devuelva. Recomendada (b): no cambia la firma |
| **D-F2A2-2** | Una adyacencia por **pareja** frente a una por **segmento** (legacy) | Compatible con `buildFoldTree` y la interfaz (mismos niveles); la interfaz muestra el número de adyacencias («N fold edges»), que cambiaría. Decidir el texto visible |
| **D-F2A2-3** | **Área v1 bruta** frente a neta; **base por defecto** (DP-6) | Bruta en v1 (compatibilidad); neta en `f2a2`. DP-6 sigue aplazada |
| **D-F2A2-4** | **Huecos (KI-06):** v1 no los representa; la escena extruye solo `vertices` | En `f2a2.paneles[i].huecos` (CW). Recortarlos en la escena es un cambio de producción (otra autorización) |
| **D-F2A2-5** | **Adyacencia no colineal** (escalón de crease, A-1; crease cerrada) | Hoy: eje = grupo colineal más largo + diagnóstico de bloqueo. Alternativa: no plegar esa pareja. Pendiente de A-1 |
| **D-F2A2-6** | **Memoria retenida** por el detalle del núcleo (≈ 80 %) | Opción medida: compactar el detalle tras calcular las adyacencias (o precalcularlas, D-F2A2-1 b). No aplicada: no es cuello de botella |
| **D-F2A2-7** | **Criterio 5** sin cumplir (3/10) | Optimizar las expansiones del núcleo (suma lineal con eliminación de ceros, compresión) es trabajo del núcleo; el margen en el histórico es pequeño (§7). Decidir si se aborda o si se revisa el criterio en los casos diminutos |
| **D-F2A2-8** | **Propuesta KI-36** (signo por centroide del legacy) y **KI-35** (carrera de pruebas) | Registrar o no en `KNOWN_ISSUES.md`; no se corrigen |
| **D-F2A2-9** | Desempates geométricos (vértice mínimo) **no invariantes ante rotación**: en rejillas con empates exactos, una copia rotada da otro árbol igual de válido (mismos niveles) | Aceptable para la interfaz [INFERENCIA]; documentado |
| **D-F2A2-10** | Antenas (creases colgantes) fuera de `vertices`; siguen en diagnósticos | La escena no las dibuja hoy; decidir si `crease-visuals` debe mostrarlas |

## 11. Riesgos

R-1 ε calibrado con un solo troquel (sin corpus) · R-2 la aceptación no depende del número de paneles (cubierto por las pruebas, pero falta verificación humana de los 13) · rendimiento (§7) · Chromium 99 real y CEP sin probar · la integración (F2A-5) toca `src/`, `a6-limites` y la huella `dist-a9` · D-F2A2-1 obliga a decidir el contrato antes de integrar · el orden de las aristas del árbol (identidad en la interfaz) cambia respecto del legacy (representación).

## 12. Incidencia de infraestructura de pruebas (D-2 de F2A-1)

Se conserva **sin corregir** como incidencia de infraestructura, separada de los defectos del producto: `tests/node/install-dry-run.test.mjs` exige que no exista ningún `/tmp/tess-iso.*` mientras `tests/node/a4-herramienta.test.mjs` lanza `install.sh --dry-run` en paralelo (evidencia: `docs/fase2/evidencia/f2a1-carrera-pruebas-paralelas.md`). En F2A-2 las suites se ejecutaron **secuencialmente** (`tests/run-all.sh` y después `tests/run-experimental.sh`); las pruebas nuevas usan temporales `tess-f2a2-*` y no `tess-iso.*`. Resultado de esta batería: §13.

## 13. Pruebas ejecutadas al cierre

Batería secuencial sobre `393e230` (código final de F2A-2; el commit de cierre solo añade documentación), evidencia `docs/fase2/evidencia/run-all-F2A-2.txt` [MEDIDO]:

| Paso | Resultado |
|---|---|
| `tests/run-all.sh` (sin `--mutations`/`--soak`: F2A-2 no cambia código de producción) | **TODO EN VERDE** (`EXIT_RUN_ALL=0`): aislamiento OK, build verificado (`dist-a9`), Node 662 + 1 omitida, navegador 52 · a7 13 · a8 31 · a9 32 · Chromium-99 4 · puente 6 · a5-observar 3 · A4-CDP 7 |
| después, `tests/run-experimental.sh` | **EXPERIMENTAL EN VERDE** (`EXIT_EXPERIMENTAL=0`): 309 = 110 de F2A-1 + 199 de F2A-2 |
| `tools/verify-isolation.sh`, `node tools/build/build.mjs --verify` | verdes al inicio y al cierre |
| herramientas | `comparar-legacy-plegado.mjs` y `rendimiento-plegado.mjs` (dos ejecuciones) con la evidencia de §6 y §7 |

La carrera `install-dry-run` ↔ `a4-herramienta` **no** apareció en esta ejecución secuencial (sigue siendo una incidencia latente, no corregida).

## 14. Punto de parada

F2A-2 completada. **No** se inicia F2A-3, F2B ni la integración del motor experimental en producción sin autorización nueva. Rollback de F2A-2 sin afectar al producto: `git revert` de los cinco commits de F2A-2 (o borrar `experimental/plegado/`, `tests/experimental/f2a2-*`, `tests/lib/f2/{plegado,plegado-legacy,casos-plegado}.mjs`, `tools/f2/{comparar-legacy,rendimiento}-plegado.mjs` y revertir el cambio de `nucleoDetallado`/`refs` en `experimental/geometria/`).
