# F2A-1 — Núcleo geométrico experimental · Informe

Fecha: 2026-10-27 · Base: `dc1d917` (F2A-0 aprobada) · Autorización: F2A-1 condicionada (puntos 1–5). **Sin cambios en `src/`, `panel/`, `reference/`, `GeometryEngine`, escena, plegado, materiales, exportaciones, pruebas de F1, goldens ni huellas.** El núcleo **no** está conectado al panel CEP ni al bundle; el legacy sigue siendo el motor del producto. F2A-2 y F2B no iniciadas.

## 1. Arquitectura implementada (`experimental/geometria/`, 434 líneas, sin dependencias)

| Módulo | Contenido |
|---|---|
| `predicados.js` | Aritmética de **expansiones** de punto flotante (TwoSum, TwoProduct de Dekker; suma, producto y escalado exactos, sin BigInt). `orient` y producto vectorial **adaptativos**: filtro estático en double → respaldo exacto. **Puntos homogéneos exactos** `{x, y, H: {X, Y, W}}` (W > 0) y predicados generales (`orientG`, `cruzDireccionesG`, `cmpCoord`, `sobreSegmentoG`) con filtro de cota de error rigurosa y respaldo exacto; parámetros exactos de cruce y de proyección como fracciones de expansiones; `proyectarExacto` y `mediaExacta` |
| `arreglo.js` | Todas las parejas de segmentos (con caja envolvente): cruce propio, T, solape colineal, contacto de extremos, por signos exactos. **Vértices simbólicos**: punto de entrada (igualdad exacta) o cruce de (i, j) con parámetros exactos en ambos segmentos; orden exacto a lo largo de cada segmento; dos puntos son el mismo vértice si y solo si su parámetro exacto coincide. **Sin tolerancia de fusión** |
| `caras.js` | DCEL; orden angular por semiplano y producto vectorial **exactos de las direcciones de origen** (sin `atan2`); ciclos; componentes; Euler; islas; **paridad par-impar** de contornos cerrados por BFS |
| `ajuste.js` | **Ajuste experimental** de extremos de crease (punto 3): solo con `eps` explícito, sin valor por defecto; B (agrupar a ≤ ε) → A (media exacta y proyección **exacta** sobre el corte) → C (T con ruido sobre otra crease), banda (ε, 3ε] solo informada. Nunca toca contornos, huecos, cortes ni predicados |
| `nucleo.js` | Entrada `Dieline` v1 → paneles, adyacencias, tramos de cada crease (`separa`, `colgante`, `sobre-corte`, `fuera`, `borde`), componentes, conservación de área, Euler, paridad, diagnósticos. Salida con la forma del resumen del oráculo para compararlos |

**Modelo de exactitud.** Decisiones topológicas (lado, colinealidad, orden, identidad de vértices, orden angular, paridad) **exactas** sobre los doubles de entrada y sobre los puntos exactos del ajuste. **Aproximado** (solo para informar): coordenadas de los cruces, áreas, longitudes, centroides y la pertenencia de islas (orientación exacta sobre coordenadas de vértices que pueden ser aproximadas). Las decisiones de **tolerancia** del ajuste (≤ ε, banda) usan distancias en double; las finas («ya está sobre el corte», desempate del segmento más cercano) son exactas. Supuestos: redondeo al par más cercano, sin desbordamiento ni subdesbordamiento en productos (coordenadas de mm).

**Hallazgos de diseño durante la implementación (resultados negativos conservados):**
1. Una primera versión declaraba el extremo ajustado como «incidente» con el corte aunque en double quedaba a ~1e-14: con la Caja Botánica rotada 37° el sistema de rotación dejó de ser plano (**Euler falso**, paridad incoherente: lo detectaron las comprobaciones internas). Se sustituyó por **puntos homogéneos exactos**: el punto ajustado está exactamente sobre el segmento y el arreglo vuelve a ser puramente geométrico.
2. La decisión «el punto ya está sobre el corte» con distancia aproximada (0 en double, 1e-17 exacta) dejaba creases colgantes con rotaciones de 1°: ahora es exacta.
3. Con 3 de 60 semejanzas aleatorias, el segmento más cercano se elegía por distancia aproximada en casi empates junto a esquinas (un tramo de 0,5 mm cambiaba de clase): el desempate es ahora exacto.

## 2. Resultados por fixture y caso límite [MEDIDO]

**22 sintéticos de F2A-0 + 9 configuraciones reales: núcleo = oráculo** en todos (`tests/experimental/f2a1-candidato.test.mjs`, 33 pruebas): misma topología (paneles por conjunto de creases, adyacencias, componentes), áreas por panel dentro de 1e-9 relativo (representación), mismos tramos de cada crease y mismas parejas, mismos diagnósticos (`ajuste`, `banda-ambigua`, `astilla`), conservación, Euler y paridad, contorno intacto; y los valores analíticos de F2A-0.

| Caso | Núcleo |
|---|---|
| Caja Botánica original, **sin ajuste** | 13 paneles, 12 adyacencias, 12/12 creases efectivas, conservación con error relativo 0 |
| Caja Botánica de Illustrator real, ε = 0,05 | 13, mismos 19 ajustes que el oráculo, error relativo ≤ 1,3e-16 |
| Histórico ×0,75, ε = 0,05 | 13 |
| Illustrator real **sin** ajuste (fuera de dominio) | 4 paneles = oráculo (se documenta, no se acepta) |
| T exacta / T con ruido / T a 0,375 | 3 / 3 (ajuste C) / 2 + colgante (indeterminado) |
| Crease corta 1/256, 0,1, 0,6 | 2 (ajuste A) / 1 + banda ambigua / 1 + colgante |
| Crease sobre el corte, paralela a 1/256 | `sobre-corte` 80 mm / astilla diagnosticada |
| Escalones de 0,498 mm (crease y contorno) | conservados (DP-1) |
| Huecos centrado/descentrado, anidados | 2400 + 3200 / 3000 + 3200 / 100 + 500 (paridad) |
| Cortes abiertos | 2 piezas sin unión / 1 pieza |
| Paneles 1,5 mm² y 40 × 1 | conservados |
| Curvas: anclas y 16 muestras | = oráculo con la misma representación |

**Operaciones (22 pruebas, `f2a1-arreglo`):** cruce propio; T exacta y a 1 ulp (no se cose); extremos compartidos; solape colineal parcial y contenido; colineales disjuntos; paralelos a 1e-300; **tres segmentos concurrentes** (un solo vértice); cruce que coincide con un punto de entrada; cruces no representables (1/3); orden exacto con mezcla de T y cruces; invariancia ante permutación y sentido de los segmentos; caras con colgantes y direcciones casi paralelas (1e-12); contornos anidados; punto exacto cuya aproximación double está fuera del corte; ajuste que usa el vértice de entrada al caer en un extremo; agrupación previa a la proyección (evita KI-34); banda ambigua.

**Predicados (7 pruebas, `f2a1-predicados`):** expansiones exactas frente a racionales BigInt (10 000 pares); `orient` = signo exacto en **100 000** triples (aleatorios, rejilla, casi colineales, perturbaciones de ulps, coordenadas 1e7, horizontales a 0–2 ulps), cuando el double ingenuo sí se equivoca en ese mismo conjunto; producto vectorial de direcciones (20 000); comparación de fracciones (5 000).

## 3. Comparación independiente contra el oráculo

- **Estrés diferencial** (`tools/f2/estres-candidato.mjs`, semilla 20261027; `evidencia/f2a1-estres.*`): **300 semejanzas aleatorias** (rotación cualquiera, escala ×0,5–×2, traslación hasta 1e5) de las 3 extracciones de la Caja Botánica con ε = 0,05 → **0 diferencias** y 13 paneles en todas; **2 000 troqueles sintéticos aleatorios degenerados** (596 con > 1 panel, 865 con cruces, 1 914 con creases colgantes, solapes colineales y T exactas) → **0 diferencias**. Versión reducida en la batería experimental (150 + 6).
- El núcleo **no** se aprobó comparándolo con el legacy (no es la verdad geométrica) ni por número de paneles.

## 4. Metamórficas (`f2a1-metamorficas`, 40 pruebas)

| Transformación (en double) | Resultado |
|---|---|
| Exactas: ×2, ×½, ×¼, ×4, rotación 90° y 180°, reflexión | = oráculo; topología idéntica; A' = s²·A a 1e-12 relativo (el área se calcula en double desde otro vértice inicial) |
| Inexactas: ×0,75, ×1,37, rotación 37° y 1°, traslación +1 000, +1e5, **+1e7** | = oráculo sobre los mismos doubles; con ajuste, 13 paneles en las 7 (el legacy falla a +1e7: KI-32) |
| Permutaciones: orden inverso de creases, cada crease invertida, contorno invertido (KI-31 en el legacy), inicio desplazado | idéntico salvo reetiquetado |
| Original **sin** ajuste rotada 37° | la topología cambia (incidencias exactas rotas a 1e-14: representación), igual que en el oráculo; con ε = 1e-6 se recupera |
| Repetición | salida idéntica |

## 5. Rendimiento y memoria (Node 24, M1 Max; piso optimista frente a Chromium 99/CEP; `evidencia/f2a1-rendimiento.*`)

| Caso | Legacy (ms) | Núcleo (ms) | Núcleo/legacy | Oráculo (ms) | Heap retenido por resultado L / N (kB) | Pico RSS L / N (MB, 50 ejecuciones) |
|---|---|---|---|---|---|---|
| Caja Botánica original | 2,96 | **0,44** | 0,15 | 8,8 | 28,9 / 22,7 | 77,8 / 67,0 |
| Illustrator real, ε 0,05 | 3,33 | **1,50** | 0,45 | 147,9 | 30,8 / 6,7 | 76,9 / 83,4 |
| Histórico ×0,75, ε 0,05 | 1,06 | 1,83 | **1,72** | 139,2 | 31,1 / ≈ 0 | 65,6 / **104,2** |
| Caja simple | 0,065 | 0,099 | **1,52** | 1,0 | — | 52,9 / 56,0 |
| Rejilla 2×2 | 0,061 | 0,103 | **1,69** | 0,14 | — | 52,7 / 54,8 |
| Rejilla 4×4 | 0,92 | 0,42 | 0,45 | 0,71 | 29,0 / 20,5 | 61,3 / 66,1 |
| Rejilla 6×6 | 7,02 | 0,81 | 0,12 | 1,8 | 67,9 / 33,1 | 75,1 / 68,5 |
| Rejilla 8×8 | 28,80 | **1,36** | 0,05 | 4,1 | 123,9 / 87,9 | 98,1 / 78,8 |
| Rejilla 3×3 líneas completas | 0,25 | 0,22 | 0,87 | 0,25 | 24,6 / 9,5 | 58,1 / 64,1 |
| Rejilla 4×4 densa (25 puntos/arista) | 9,19 | 0,84 | 0,09 | 5,5 | 29,0 / 26,6 | 100,6 / 78,7 |

Lectura: el núcleo es más rápido en **7 de 10** casos y escala mucho mejor (sin reinicios: O(n²) parejas frente a ≈ n^2.5 del legacy, KI-08). Es más lento en **3**: dos casos diminutos (+0,04 ms) y el histórico ×0,75 con ajuste (+0,77 ms), donde dominan las expansiones de los puntos homogéneos del ajuste. Con ajuste el **pico de RSS** es mayor (basura de expansiones; 104 frente a 66 MB en 50 ejecuciones); el heap retenido por resultado es igual o menor y no se observan fugas (el heap tras GC vuelve al nivel inicial dentro del ruido de ±100 kB). **El criterio 5 del Plan §5 (tiempo ≤ legacy en todos los casos) no se cumple todavía.**

## 6. Casos ambiguos o no resueltos

- Heredados de F2A-0 (A-1…A-12): intención de los escalones de 0,5 mm, 13 como candidato, T a 0,375, crease corta en la banda, crease paralela al corte (el núcleo, como el oráculo, la marca como astilla), ruido sin ajuste, fuera de dominio, cortes abiertos reales, curvas, cadenas de ajuste C, agrupación transitiva.
- Propios del núcleo: (1) áreas, longitudes y coordenadas de cruces en double (diferencias de representación ≤ 1e-12·M² frente al oráculo); (2) decisiones de tolerancia del ajuste en double: pueden diferir del oráculo solo si una distancia está a ~1e-16 del umbral ε; (3) islas con vértices de cruce aproximados; (4) supuesto de no desbordamiento ni subdesbordamiento en los productos (probado con coordenadas de hasta 1e7 mm; un caso con valores de 1e-300 cuyos productos se subdesbordaban se descartó de las pruebas por salir de ese supuesto); (5) rendimiento y RSS con ajuste (§5).
- **Incidente de la batería (conservado en `evidencia/f2a1-carrera-pruebas-paralelas.md`):** ejecutadas dentro de `tests/node/`, las pruebas del núcleo (intensivas en CPU) hacían aflorar una **carrera latente de F1**: `install-dry-run` exige que no exista ningún `/tmp/tess-iso.*` mientras `a4-herramienta` lanza `install.sh --dry-run` en paralelo. Medido: `dc1d917` 8/8 en verde; con las pruebas en `tests/node/`, fallos intermitentes; tras moverlas a `tests/experimental/` (con su ejecutor `tests/run-experimental.sh`, que se lanza después de la batería) `tests/node/` 6/6 en verde. **No se ha modificado ninguna prueba de F1**; la carrera queda registrada como propuesta de defecto de la infraestructura de pruebas (KI-35, pendiente de decisión).

## 7. Pruebas ejecutadas

| Prueba | Resultado |
|---|---|
| `tests/run-experimental.sh` (6 archivos) | **110/110** |
| `tools/f2/estres-candidato.mjs --n 300 --m 2000` | 0 diferencias |
| `node --test 'tests/node/*.test.mjs'` × 6 | 662 + 1 omitida, 6/6 |
| `tests/run-all.sh` y después `tests/run-experimental.sh` | **TODO EN VERDE** (`EXIT=0`) y **EXPERIMENTAL EN VERDE**: aislamiento OK, build verificado (`dist-a9`), Node 662 + 1 omitida, navegador 52 · a7 13 · a8 31 · a9 32 · Chromium-99 4 · puente 6 · a5-observar 3 · A4-CDP 7; experimental 110 (`evidencia/run-all-F2A-1.txt`) |

## 8. Aislamiento

`experimental/` fuera de `src/` (ninguna mención en `src/`, comprobado por prueba); el bundle de producción no contiene el núcleo (marcas buscadas en `dist/main.js`; la huella vigente `dist-a9` se verifica en la batería); el núcleo solo importa sus módulos relativos y no usa THREE, `window`, `document`, `console`, `localStorage`, `require`, `process` ni BigInt; estado de módulo: solo los contadores de diagnóstico. Empaquetado con `esbuild --target=chrome99` sin avisos y ejecutado en un contexto aislado: 13 paneles. CEP de usuario: solo `TesserArt_Validator`; nada instalado; sin push. El worktree temporal usado para medir `dc1d917` se creó en el scratchpad y se eliminó.

## 9. Propuesta de la siguiente intervención (requiere autorización; no iniciada)

**F2A-2 — Adaptador a `PanelModel` v1 y plegado, validado sin integrar.** En `experimental/` y `tests/experimental/`, sin tocar `src/`: (1) convertir la salida del núcleo al contrato `PanelModel` v1 (`vertices` CCW, `edges` tipadas, área, centroide, `creaseEdges`, adyacencias con `creaseIdx`) y construir el árbol de plegado reutilizando `buildFoldTree`/`computeFoldSign` del legacy por importación de solo lectura; (2) comparar con el legacy **donde el legacy acierta** (criterio 3 del Plan §5: rejillas, caja simple, T exacta tras corregir KI-04) y explicar cada diferencia con la clasificación de F2A-0; (3) ejecutar escena y GLB en Chrome headless con el panel modelo del núcleo **solo en el arnés de pruebas** para medir que el contrato basta (sin cambiar el producto); (4) rendimiento del ajuste: versiones lineales de las sumas y productos de expansiones y compresión, objetivo ≤ legacy en los 10 casos. **Después, con autorización aparte:** el mecanismo experimental de DP-7 (bundle experimental con modo sombra), que sí toca `src/` y su ajuste de `a6-limites`.

**Decisiones que necesito:** (D-1) autorizar F2A-2 con ese alcance; (D-2) registrar o no la carrera de pruebas como KI-35 y si se corrige en F1 o se deja documentada; (D-3) mantener las pruebas del núcleo en `tests/experimental/` con su ejecutor propio (recomendado) o integrarlas en `run-all.sh` como paso secuencial (cambio de la infraestructura de F1).
