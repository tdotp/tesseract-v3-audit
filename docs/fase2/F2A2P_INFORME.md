# F2A-2P — Optimización experimental del coste de H-01/H-02 · Informe

Fecha: 2026-10-27 · Base obligatoria: `d8b4bef0b2b592fd3877882f3af379dc8eb318bb` (F2A-2R) · Autorización: cierre documental de F2A-2R + F2A-2P (decisión D-F2A2R-3). **Solo cambia `experimental/plegado/arbol.js`** (más una prueba experimental, herramientas y evidencia de F2). Sin cambios en `src/`, `panel/`, `reference/`, `GeometryEngine`, legacy, `experimental/geometria/`, `experimental/plegado/adaptador.js`, tolerancias, fixtures, goldens, huellas, umbrales ni `tests/run-all.sh`. Motor no integrado; V3 no instalada; sin push, release ni deploy. F2A-3 y F2B no iniciadas.

Etiquetas: [MEDIDO] · [CONFIRMADO] · [INFERENCIA] · [NO VERIFICADO].

## 0. Commits (locales, sin squash ni rebase)

| # | SHA completo | Mensaje | Diff |
|---|---|---|---|
| 1 | `13a2d99fe349f25deff6ea0b7c032084886438e0` | `docs(f2): cerrar F2A-2R y aprobar decisiones D-F2A2R-1..4` | `HANDOFF.md` +4 −1, `docs/fase2/F2A2R_INFORME.md` +15 −4 (decisiones en §13; solo documentación) |
| 2 | `57c8c2bd6eaf1beb8c64384f2e40ea9581f234fb` | `test(f2): instrumentar perfilado reproducible F2A-2P` | `tools/f2/perfil-plegado.mjs` (+58), evidencia `f2a2p-perfil-d8b4bef.json`, `f2a2p-perfil-2a00433.json` |
| 3 | `ff2642613e201354a28f4aca85adc6daff8e5f14` | `perf(f2): optimizar adyacencias y analisis de ciclos experimentales` | `experimental/plegado/arbol.js` (+29 −24), `tests/experimental/f2a2r-hallazgos.test.mjs` (+5 −3: ancla del control negativo de H-02), `tools/f2/comparar-f2a2p.mjs` (+63) |
| 4 | commit de cierre (ver `git log -1`) | `docs(f2): informe y evidencia de F2A-2P` | este informe, evidencia `f2a2p-*`, `run-all-F2A-2P.txt`, `HANDOFF.md` §23 |

Punto de recuperación: `ff26426` (código) · rollback de la optimización sin perder la instrumentación: `git revert ff26426`.

## 1. Preflight [MEDIDO]

HEAD = `d8b4bef…`, árbol limpio, rama `main`; `HANDOFF.md` §22 y `F2A2R_INFORME.md` leídos; `tests/run-experimental.sh` = **322/322**; aislamiento (`verify-isolation.sh`) y `build --verify` en verde; `src/`, `panel/`, `reference/`, legacy, goldens y huellas sin cambios desde `2a00433`; CEP de usuario solo con `TesserArt_Validator`. El repositorio `tdotp/tesseract-v3-audit` estaba **público** y se devolvió a **privado** antes de seguir (API: `private: true`, `disabled: false`; rama `audit/f2a2` = `d8b4bef`, sin cambios de commits ni ramas). Nota: tras el cambio, una consulta `git ls-remote` sin credenciales respondió «repository is disabled» (403), lo normal para un repositorio privado sin autenticar; con credenciales la rama se lee correctamente.

## 2. Metodología de medición

- **Equipo y entorno:** M1 Max, macOS 25.6, Node 24.12.0 (arm64), mismos fixtures y opciones en todas las mediciones.
- **Juez de equivalencia y A/B** (`tools/f2/comparar-f2a2p.mjs`): extrae `d8b4bef` con `git archive` a un temporal; para cada caso construye **un** modelo con el adaptador vigente y ejecuta sobre él `construirAdyacencias` + `construirArbolPlegado` de las dos versiones; compara el **JSON completo** (adyacencias, detalle, uniones, diagnósticos, aristas, niveles, componentes, ciclos, base, errores). Tiempo: 30 rondas de calentamiento y **60 rondas intercaladas** (orden alterno) × 20 ejecuciones, **mediana**. Memoria: heap retenido por resultado (20 vivos tras GC). Control: con el mismo código en ambos lados, la relación de tiempos sale 0,97–1,03 (ruido).
- **Perfil por etapas** (`tools/f2/perfil-plegado.mjs`): perfil de CPU muestreado cada 25 µs (`node:inspector`) durante 400 ms por función y caso, con conteo por **línea**; las líneas se reparten en etapas por marcas de texto de `arbol.js` (no por números fijos). Limitación: las funciones auxiliares (`segs`, `creasesDe`, `largo`) cuentan en la etapa 2 aunque también las llame la 3; en los 10 casos de rendimiento hay una sola componente, así que el BFS del bosque (etapa 5) solo aparece en los dos casos multicomponente.
- **Cadena completa frente al legacy** (`tools/f2/rendimiento-plegado.mjs`, sin cambios): mediana de 20 tras 3 de calentamiento por etapa, heap retenido y pico de RSS por proceso; **dos corridas** completas.

## 3. Cuellos de botella identificados (P1, sobre `d8b4bef`) [MEDIDO]

Reparto de las muestras propias de `arbol.js` (12 casos):
| Etapa | `construirAdyacencias` | `construirArbolPlegado` |
|---|---|---|
| 1 agrupación de aristas por pareja | 19,6 % | — |
| 2 clasificación de rectas y conservación de referencias (uniones) | **63,0 %** | — |
| 3 adyacencias plegables (eje, lado, detalle) | 9,1 % | — |
| 4 BFS y elección de padres | — | 38,0 % |
| 4b preparación (vecinos, claves) | — | 13,1 % |
| 5 componentes, bosque y partición | — | **37,3 %** |
| 6 diagnósticos y salida | — | 5,1 % |
| otras líneas (`ref`, utilidades) | 8,3 % | 6,6 % |

Causas concretas (lectura del código guiada por el perfil): (a) las cadenas `'C<i>:<k>'` y `'C<i>'` de cada arista se reconstruían en **cada** agregado (segmentos y creases de la unión, de cada recta, de cada arista y otra vez del detalle); (b) en una unión plegable (una sola recta) los mismos agregados se calculaban **tres veces** (unión, recta y detalle: `creasesDe`, `segs` y `largo` dos veces); (c) copias temporales en la agrupación (`[...e.tags]`, `map().filter()`, un objeto `hDe` por arista, clave de texto por pareja) y en los extremos del eje; (d) en el árbol, tres recorridos `filter` sobre todas las adyacencias, ordenación de componentes con `includes` y un `Map` de componente por panel. Memoria retenida por resultado: `uniones` 4–90 kB, el doble que `detalle`.

## 4. Cambios implementados (P2) y justificación

Todos en `experimental/plegado/arbol.js` (`ff26426`); ninguno toca un predicado ni una decisión:
1. **Agrupación sin copias:** recorrido directo de `e.tags` y `e.refs`; clave numérica de pareja (`min·n + max`; las parejas se ordenan después por `(a, b)`, como antes); `hA` = semiarista del panel menor (antes `hDe[p.a]`, el mismo objeto).
2. **Cadenas por arista una sola vez** (`seg`, `cr`), reutilizadas por la unión, sus rectas, sus aristas (`segmentos` de cada arista es ese mismo arreglo) y el detalle; `segs`/`creasesDe` hacen la misma unión y la misma ordenación que antes.
3. **Agregados compartidos en uniones plegables:** con una sola recta, la recta y la unión tienen las mismas aristas en el mismo orden ⇒ mismos `creases`, `segmentos` y `longitud` (misma suma en el mismo orden); la unión, su recta y el detalle **comparten** esos arreglos y valores. El resultado serializado es idéntico; los objetos de salida son de solo lectura (invariante I4 del contrato: la salida puede compartir objetos).
4. **Extremos del eje** sin objetos ni arreglos temporales (mismo criterio: primer mínimo y primer máximo estrictos).
5. **Componentes y partición:** la componente de la base primero y las demás en orden de inserción ascendente (igual que la ordenación anterior por primer panel); índice de componente en un arreglo; una sola pasada clasifica cada adyacencia como árbol, `adyacenciasNoAlcanzadas` o `adyacenciasCiclo`, en orden ascendente como antes; la comprobación interna `ν = m − n + c` se conserva.
Se mantienen: tres clases de unión, predicados exactos (`orientG`, `cruzDireccionesG`), segmentos y coordenadas originales, orden determinista, ejes, signos, padres, niveles, diagnósticos completos, separación componentes/ciclos, contrato v1, tolerancias. Sin cachés globales; sin eliminar información. La prueba `f2a2r-hallazgos` cambia **solo el ancla** del control negativo de H-02 (la partición es ahora una pasada): el defecto que se reintroduce es el mismo (toda adyacencia fuera del árbol cuenta como ciclo) y se sigue detectando, con y sin la comprobación de ν.

## 5. Verificación (P3) [MEDIDO]

**Equivalencia byte a byte frente a `d8b4bef`: 788 de 788** (`f2a2p-equivalencia-d8b4bef.{md,json}`):
| Conjunto | Casos |
|---|---|
| 42 casos antes/después de F2A-2R (34 de F2A-2, 7 mínimos, A-7) | 42 |
| estrés de F2A-2R (semilla 20261028, la mitad con cortes) | 600 |
| Caja Botánica (3 extracciones + A-7 sin ajuste), **todas las bases**, y bases inválidas (−1, 13, 1,5) | 46 |
| creases cerradas y huecos (crease cerrada interior, hueco centrado y descentrado, compuesto, caja simple), todas las bases | 10 |
| permutaciones (4) de 9 casos, incluidos dos componentes, ciclo fuera y escalón | 36 |
| transformaciones (×2, 90°, reflexión, ×0,75, 37°, +1e5) de 9 casos | 54 |
Uniones ambiguas y no plegables, componentes desconectadas y ciclos reales están en esos conjuntos (casos mínimos de F2A-2R, A-7 y estrés). Ninguna diferencia ⇒ no hubo que detener ni revertir nada.

## 6. Comparación antes/después por caso [MEDIDO]

**`construirAdyacencias` + `construirArbolPlegado` sobre el mismo modelo, A/B intercalado** (mediana; `f2a2p-equivalencia-d8b4bef.md` y `f2a2p-ab-2a00433.md`):
| Caso | F2A-2 `2a00433` (ms) | F2A-2R `d8b4bef` (ms) | F2A-2P (ms) | P / R | P / F2A-2 |
|---|---|---|---|---|---|
| caja-botanica-real | 0.0277 | 0.0375 | 0.0208 | 0.56 | 0.75 |
| ill-real ε 0.05 | 0.028 | 0.0366 | 0.0213 | 0.58 | 0.76 |
| histórico ×0.75 ε 0.05 | 0.0242 | 0.0377 | 0.0228 | 0.61 | 0.94 |
| ill-real-caja-simple | 0.0023 | 0.0033 | 0.0017 | 0.52 | 0.74 |
| rejilla 2×2 | 0.007 | 0.0117 | 0.0057 | 0.49 | 0.81 |
| rejilla 4×4 | 0.0476 | 0.0633 | 0.0314 | 0.5 | 0.66 |
| rejilla 6×6 | 0.0968 | 0.1331 | 0.0607 | 0.46 | 0.63 |
| rejilla 8×8 | 0.1709 | 0.2481 | 0.1106 | 0.45 | 0.65 |
| rejilla 3×3 líneas completas | 0.0192 | 0.0285 | 0.0134 | 0.47 | 0.70 |
| rejilla 4×4 densa | 0.0411 | 0.0598 | 0.0273 | 0.46 | 0.66 |
| F2A-2R ciclo fuera | 0.0061 | 0.0111 | 0.0065 | 0.59 | 1.07 |
| A-7 sin ajuste | 0.0108 | 0.019 | 0.0106 | 0.56 | 0.98 |
(F2A-2 no tiene `uniones`: su salida no es comparable byte a byte con la actual; solo se comparan tiempos.)

**Heap retenido por resultado de adyacencias + árbol** (kB; ruido de ±5 kB en los casos pequeños): F2A-2R → F2A-2P: rejilla 8×8 159 → 115, 6×6 86 → 62, 4×4 35 → 26, Caja Botánica 19 → 15; frente a F2A-2 sigue siendo mayor (8×8: 69 → 115) porque `uniones` conserva todas las aristas y referencias, que no se pueden eliminar (D-F2A2R-1/2). Por partes (`f2a2p-perfil-*.json`, 8×8): `uniones` 90 → 67 kB, `detalle` 41 → 33 kB, adyacencias y árbol sin cambio.

**Perfil después** (`f2a2p-perfil-despues.json`): `construirAdyacencias` 8×8 0,234 → 0,089 ms; la etapa 2 baja de 63 % a 34 % de las muestras; `construirArbolPlegado` cambia poco (BFS 43 %, componentes y partición 33 %): el árbol ya costaba ≤ 0,025 ms.

## 7. Cadena completa frente al legacy y criterio 5 [MEDIDO]

`tools/f2/rendimiento-plegado.mjs`, dos corridas (`f2a2p-rendimiento.{json,txt}`, `f2a2p-rendimiento-corrida2.json`), frente a las dos de F2A-2R:
(cada celda: corrida 1 / corrida 2; adyacencias, árbol y heap: corrida 1)

| Caso | Legacy (ms) | F2A-2R total (ms) | F2A-2P total (ms) | N/L F2A-2R | N/L F2A-2P | adyacencias R → P (ms) | árbol R → P (ms) | heap retenido cadena R → P (kB) |
|---|---|---|---|---|---|---|---|---|
| caja-botanica-real | 2.728 / 2.71 | 0.445 / 0.491 | 0.459 / 0.421 | 0.16 / 0.18 | 0.17 / 0.16 | 0.063 → 0.042 | 0.02 → 0.016 | 166.7 → 162.6 |
| ill-real-caja-botanica (ε 0.05) | 2.748 / 2.777 | 1.447 / 1.293 | 1.258 / 1.328 | 0.5 / 0.47 | 0.46 / 0.48 | 0.058 → 0.039 | 0.014 → 0.013 | 207 → 203 |
| histórico ×0.75 (ε 0.05) | 1.007 / 1.014 | 1.97 / 1.931 | 1.903 / 1.876 | 1.89 / 1.79 | 1.89 / 1.85 | 0.042 → 0.024 | 0.014 → 0.013 | 216.9 → 214.4 |
| ill-real-caja-simple | 0.059 / 0.059 | 0.086 / 0.092 | 0.085 / 0.081 | 1.43 / 1.56 | 1.44 / 1.37 | 0.004 → 0.003 | 0.002 → 0.002 | 31 → 30.7 |
| rejilla 2×2 | 0.058 / 0.058 | 0.122 / 0.129 | 0.119 / 0.116 | 2.1 / 2.22 | 2.05 / 2 | 0.017 → 0.012 | 0.006 → 0.006 | 41.8 → 40.2 |
| rejilla 4×4 | 0.944 / 0.948 | 0.449 / 0.438 | 0.392 / 0.411 | 0.47 / 0.46 | 0.42 / 0.43 | 0.113 → 0.066 | 0.027 → 0.025 | 148.5 → 132.3 |
| rejilla 6×6 | 6.885 / 7.018 | 1.14 / 1.029 | 0.895 / 0.901 | 0.16 / 0.14 | 0.13 / 0.13 | 0.248 → 0.158 | 0.043 → 0.039 | 326.5 → 306.4 |
| rejilla 8×8 | 28.531 / 28.611 | 1.639 / 1.669 | 1.54 / 1.565 | 0.06 / 0.06 | 0.05 / 0.05 | 0.454 → 0.295 | 0.075 → 0.07 | 569.2 → 531.3 |
| rejilla 3×3 líneas completas | 0.218 / 0.22 | 0.296 / 0.265 | 0.192 / 0.195 | 1.35 / 1.22 | 0.88 / 0.89 | 0.051 → 0.02 | 0.011 → 0.007 | 78.3 → 74.3 |
| rejilla 4×4 densa (25 puntos por arista) | 9.281 / 8.93 | 0.911 / 0.877 | 0.837 / 0.825 | 0.1 / 0.1 | 0.09 / 0.09 | 0.074 → 0.043 | 0.018 → 0.012 | 316 → 308 |

**Casos más lentos que el legacy: 4/10 en F2A-2R (las dos corridas) → 3/10 en F2A-2P (las dos corridas)**: histórico ×0,75 con ajuste, caja simple y rejilla 2×2 — los mismos tres de F2A-1 y F2A-2, dominados por el **núcleo** (expansiones del ajuste y coste fijo en casos diminutos), fuera del alcance de F2A-2P. La rejilla 3×3 de líneas completas vuelve a 0,88–0,89×. **El criterio 5 original (tiempo ≤ legacy en todos los casos) NO se cumple.**

## 8. Comparación con el legacy

`node tools/f2/comparar-legacy-plegado.mjs` con el código optimizado produce un JSON **byte a byte idéntico** a `docs/fase2/evidencia/f2a2r-legacy.json` (`cmp` sin diferencias; no se duplica el archivo): 0 errores del adaptador frente al oráculo; 92 diferencias topológicas, 35 geométricas y 30 de representación, 127 esperadas; `buildFoldTree` del legacy sobre el modelo v1 con los mismos niveles en 34/34; `computeFoldSign` igual en todos los hijos convexos.

## 9. Resultados de regresión

Batería secuencial sobre `ff26426` (código final de F2A-2P), evidencia `docs/fase2/evidencia/run-all-F2A-2P.txt`:

| Paso | Resultado |
|---|---|
| `tests/run-all.sh` | **TODO EN VERDE** (`EXIT_RUN_ALL=0`): aislamiento OK, build verificado (`dist-a9`, `main.js` 131 546 B), Node 662 + 1 omitida, navegador 52 · a7 13 · a8 31 · a9 32 · Chromium-99 4 · puente 6 · a5-observar 3 · A4-CDP 7 |
| después, `tests/run-experimental.sh` | **EXPERIMENTAL EN VERDE** (`EXIT_EXPERIMENTAL=0`): **322/322** (las mismas que en F2A-2R; ninguna añadida ni eliminada, una con el ancla del control negativo actualizada) |
| antes de optimizar (`d8b4bef`) | `tests/run-experimental.sh` 322/322 |
| juez de equivalencia | 788/788 byte a byte frente a `d8b4bef` |

Sin fallos intermitentes (la carrera `install-dry-run` ↔ `a4-herramienta` no apareció; no se repitió ninguna batería). Goldens, huellas y umbrales sin tocar.

## 10. Diferencias observadas

Ninguna en los resultados (788/788 iguales). Diferencias de **representación interna** declaradas: en una unión plegable, `uniones[u].creases`, `uniones[u].grupos[0].creases`, `detalle[k].creases` y `detalle[k].creasesEje` son el **mismo** arreglo (lo mismo con `segmentos`), y `grupos[g].aristas[i].segmentos` comparte el arreglo de la arista; antes eran copias iguales. Quien **mute** uno de esos arreglos vería el cambio en los demás: los resultados del motor son de solo lectura (I4) y ningún consumidor experimental los muta [CONFIRMADO por las 322 pruebas y el juez]; si una fase futura necesitara mutarlos, debería copiarlos.

## 11. Riesgos residuales

- El criterio 5 sigue sin cumplirse (3/10, núcleo).
- La memoria retenida sigue por encima de F2A-2 por la información de `uniones` exigida por H-01 (no reducible sin perder información).
- La compartición de arreglos (§10) es una nueva dependencia del invariante de solo lectura.
- Mediciones en Node/M1 Max: piso optimista frente a Chromium 99/CEP (sin probar en real).
- El perfil por líneas atribuye las funciones auxiliares a la etapa 2.

## 12. Decisiones pendientes para F2A-3

| Id | Asunto |
|---|---|
| D-F2A2P-1 | Criterio 5: abordar el coste del **núcleo** (expansiones del ajuste; coste fijo en casos diminutos) en una intervención autorizada, o revisar el criterio para casos < 0,1 ms |
| D-F2A2P-2 | ¿Se acepta la compartición de arreglos de solo lectura en la salida (§10) como parte del contrato del motor experimental, o se exige copia defensiva al integrar? |
| D-F2A2P-3 | Memoria: ¿conservar siempre `uniones` completas en el modelo de producción o generarlas bajo demanda (con las mismas garantías)? |
| (heredadas) | D-F2A2-1 (contrato de `buildAdjacency` frente al arreglo), D-F2A2-2…4, 6, 8…10; interfaz de los diagnósticos de uniones no plegables (D-F2A2R-2) |

## 13. Punto de parada

F2A-2P completada. **No** se inicia F2A-3 ni F2B ni la integración. Se presentan informe, commits locales y resultados para revisión.
