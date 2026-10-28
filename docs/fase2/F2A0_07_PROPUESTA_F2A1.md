# F2A-0 · 07 — Propuesta técnica de F2A-1 (NO implementada; requiere autorización)

## 0. Cambios respecto del plan de F2.0 (`07_PLAN_F2A.md`)

- **DP-5** pospone el motor web ⇒ F2A-1 ya **no** es «portar el arreglo web» sino **un núcleo de arreglo plano propio**, validado contra el oráculo de F2A-0.
- **DP-3** ⇒ ninguna constante de ajuste en F2A-1 (el ajuste es F2A-3 y su ε sigue siendo un parámetro experimental).
- **R-3 medido:** `a6-limites` fija el inventario **exacto** de `src/core/`; un módulo nuevo ahí obliga a cambiar pruebas de F1. ⇒ se propone desarrollar el candidato **fuera de `src/`** hasta F2A-5.

## 1. Objetivo e hipótesis

**Hipótesis:** un arreglo plano en **double** con predicados de orientación **adaptativos exactos** e **identidad simbólica** de vértices reproduce el resultado del oráculo exacto en todas las entradas **sin ruido** (extracción original de la Caja Botánica y los 18 sintéticos «esperado-F2» sin ajuste) con un tiempo ≤ legacy (criterio 5 del Plan §5).

Fuera de F2A-1: ajuste de ruido (F2A-3: con la extracción de Illustrator real el candidato dará lo mismo que el oráculo con ε = 0, es decir uniones abiertas, y eso será lo esperado en esta unidad), huecos asignados a paneles y diagnósticos completos (F2A-4), adaptador y cableado (F2A-5).

## 2. Diseño

| Módulo (propuesto) | Contenido | Notas |
|---|---|---|
| `experimental/geometria/predicados.js` | `orient2d` adaptativo (etapas: filtro estático → expansiones con TwoSum/TwoProduct de Dekker/Knuth → resultado exacto), sin BigInt | Algoritmo publicado (Shewchuk 1997), implementado desde el artículo, sin copiar código ni añadir dependencias (DP-4). ≈ 150 líneas |
| `experimental/geometria/arreglo.js` | Todas las parejas de segmentos con caja envolvente; clasificación por signos de `orient2d`: cruce propio, T (extremo sobre segmento: `orient = 0` + intervalo), solape colineal, disjuntos | Las T y los solapes **no crean coordenadas nuevas** (son puntos de la entrada); solo los cruces propios calculan un punto en double |
| ídem | **Vértices simbólicos:** «punto de entrada k» o «cruce de (i, j)»; dos cruces se identifican si comparten segmentos y son el mismo punto según una prueba de concurrencia con `orient2d` | Evita las tolerancias de fusión (1e-6 del web, 0,5 del legacy) |
| `experimental/geometria/caras.js` | DCEL; orden angular por semiplano + `orient2d` (sin `atan2`); recorrido de caras | Mismo algoritmo de libro que el oráculo, implementación independiente |
| `experimental/geometria/regiones.js` | Paridad par-impar por adyacencia de regiones; islas por punto en polígono con `orient2d` | Sin clasificación por centroide |

Restricciones: módulos ES con sintaxis compatible con Chromium 99; sin THREE/DOM/estado; **ni `src/` ni el bundle los importan**; `dist/` sigue igual a la huella vigente `dist-a9`.

## 3. Evaluación previa de predicados (DP-4) [MEDIDO, `tools/f2/evaluar-predicados.mjs`]

| Entrada | Orientaciones necesarias | Exactamente 0 | Double ingenuo erróneo | Filtro estático sin decidir | ms double / filtro+exacto BigInt / exacto BigInt |
|---|---|---|---|---|---|
| Original ×1 | 730 | 530 | 0 | 530 | 0,21 / 5,19 / 7,83 |
| Original rotado 37° | 818 | 490 | 0 | 498 | 0,15 / 5,87 / 11,85 |
| Illustrator real ×1 | 472 | 311 | 0 | 311 | 0,02 / 2,58 / 4,72 |

Lectura: (1) en troqueles reales **la mayoría de las orientaciones son exactamente 0** (aristas alineadas con los ejes que comparten coordenadas): son justo los casos que un filtro estático no decide, así que un recurso exacto **en BigInt** costaría casi como el exacto puro; (2) el double ingenuo no erró en estos fixtures, pero sí en el contraejemplo fijado en `f2-oraculo` (0,5 / 0,5000000000000001 / 12 / 24): la exactitud no es teórica; (3) ⇒ recomendación: **predicado adaptativo con expansiones de punto flotante** (las etapas intermedias deciden los ceros exactos sin BigInt). Objetivo de coste: ≤ 1 ms por troquel en predicados.

## 4. Pruebas que deben pasar

1. **Diferencial frente al oráculo** (nuevo `tests/node/f2a1-candidato.test.mjs`): mismas firmas, adyacencias, asignación de creases y conservación (relativa ≤ 1e-12) en la extracción original y en los 18 sintéticos «esperado-F2» sin ajuste; en la extracción de Illustrator real, el mismo resultado que el oráculo con ε = 0.
2. **Predicados:** 10⁵ triples aleatorios y degenerados (colineales en rejilla, perturbaciones de 1 ulp) con signo idéntico al de `racional.mjs`.
3. **Metamórficas** de F2A-0 aplicadas al candidato (exactas donde la entrada lo permite; en double, misma topología).
4. **Rendimiento:** mediana de 20 corridas ≤ legacy en la Caja Botánica (≈ 3 ms) y en rejillas 2×2…8×8 (legacy 26 ms en 8×8).
5. **Integridad de F1:** `run-all.sh --mutations` en verde; `dist/` = `dist-a9`; ninguna prueba, golden ni huella de F1 cambia.

## 5. Riesgos, rollback y estimación

- Riesgos: error sutil en las expansiones (mitigación: diferencial con BigInt); identidad de cruces múltiples (tres segmentos concurrentes) — caso raro en troqueles, cubierto con sintéticos; rendimiento de O(n²) parejas (n ≈ 70–500).
- **Rollback:** borrar `experimental/geometria/` y su prueba (un commit); el producto no lo usa.
- Huellas: **ninguna** se rompe en F2A-1.
- Complejidad relativa: **M** (predicados S–M, arreglo M, caras/regiones S).

## 6. Diseño del mecanismo experimental (DP-7; para F2A-5, NO implementar ahora)

| Opción | Cómo | Modo por defecto | Riesgo | Valoración |
|---|---|---|---|---|
| **A. Bundle experimental aparte** | `build.mjs --experimental` con `define: { __TESS_MOTOR__: 'candidato' }`; el bundle normal se construye con `'legacy'` y esbuild elimina el código muerto | Bundle normal **byte a byte** = `dist-a9` (comprobable con la huella) | Bajo: el usuario solo recibe el normal; el experimental requiere instalación aparte autorizada | **Recomendada** |
| **B. Modo sombra** (sobre A) | En el bundle experimental, el legacy alimenta la escena y el candidato se ejecuta en paralelo; solo se registran las diferencias (clase de `F2A0_03`) en el log de depuración | Legacy | Bajo; útil para validar en CEP real sin cambiar salidas | Recomendada como primera validación en CEP |
| C. Interruptor en tiempo de ejecución (consola de depuración, no persistente) | `__tessDebugView`/consola cambia el motor para la sesión | Legacy | Medio: código del candidato dentro del bundle de producción | No recomendada |
| D. `localStorage` | Persistente | — | Viola «no persistente» | Descartada |

## 7. Decisiones para autorizar F2A-1

| Id | Decisión | Recomendación |
|---|---|---|
| D-F2A1-1 | Ubicación del candidato durante F2A-1…F2A-4 | `experimental/geometria/` fuera de `src/` (cero impacto en F1); paso a `src/core/` en F2A-5 con su ajuste de `a6-limites` aprobado |
| D-F2A1-2 | Predicados | Adaptativos con expansiones de punto flotante, implementación propia desde el artículo, sin dependencias |
| D-F2A1-3 | Identidad de vértices | Simbólica (punto de entrada / cruce de pareja), sin tolerancia de fusión |
| D-F2A1-4 | Objetivo de rendimiento | ≤ legacy (mediana de 20) en la Caja Botánica y rejillas |
| D-F2A1-5 | Mecanismo experimental (para F2A-5) | Opción A + B (bundle experimental aparte con modo sombra) |
