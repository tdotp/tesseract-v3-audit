# F2A-2R — Correcciones derivadas de la auditoría independiente de F2A-2 · Informe

Fecha: 2026-10-27 · Base: `2a00433850be2ab252d92601fc41c00acc247f76` (F2A-2) · Autorización: F2A-2R (intervención correctiva limitada a los hallazgos H-01 y H-02). **Solo cambian código y pruebas experimentales:** `experimental/plegado/arbol.js` y `tests/`/`tools/f2/` experimentales. **Sin cambios** en `src/`, `panel/`, `reference/`, `GeometryEngine`, legacy, núcleo geométrico (`experimental/geometria/`), adaptador (`experimental/plegado/adaptador.js`), tolerancias, goldens, huellas, `tests/run-all.sh`, pruebas de F1 ni scripts de build o instalación. Motor experimental no integrado; V3 no instalada; sin push ni deploy. F2A-3 y F2B no iniciadas.

Etiquetas: [MEDIDO] · [CONFIRMADO] · [INFERENCIA] · [NO VERIFICADO].

## 0. Commits (locales)

| Commit | Contenido |
|---|---|
| `693eaf1` | Corrección de H-01 y H-02 en `arbol.js`; `tests/experimental/f2a2r-hallazgos.test.mjs` (13); sustitución documentada de las pruebas de F2A-2 que fijaban el comportamiento defectuoso (§4.2) |
| `5597a48` | `tools/f2/comparar-f2a2r.mjs` (antes/después), casos mínimos en `tests/lib/f2/casos-plegado.mjs`, evidencia de comparación y de rendimiento |
| commit de cierre | este informe, la evidencia de la batería y de la comparación con el legacy, y `HANDOFF.md` §22 (ver `git log -1`) |

## 1. Preflight [MEDIDO]

HEAD `2a00433`, árbol limpio, rama `main`; `tools/verify-isolation.sh` en verde (baseline, extensión instalada, V3 no instalada; CEP de usuario solo `TesserArt_Validator`); `node tools/build/build.mjs --verify` → `dist/` íntegro y reproducible (`dist-a9`); `git diff --stat c14da24 2a00433` sobre `src panel reference tests/node tests/browser tests/golden tests/run-all.sh tools/build tools/install.sh` vacío; `tests/run-experimental.sh` → **309/309** (`EXIT=0`); repositorio de auditoría `tdotp/tesseract-v3-audit` **privado** (API: `private: true`). Reproducción de los dos hallazgos con el código auditado (§5).

## 2. H-01 — Adyacencias no colineales (severidad alta)

**Defecto [CONFIRMADO]:** `construirAdyacencias` detectaba que dos paneles compartían aristas de crease sobre rectas distintas (diagnóstico `adyacencia-no-colineal`), pero publicaba igualmente una `AdjacencyEdge` con el **grupo colineal más largo** como eje, y el árbol la usaba como bisagra rígida válida. Con el escalón de crease (A-1) daba 1 `FoldEdge`; con una crease en L, también. Simulado con la convención de `src/fold/folding.js`, ese pliegue **despega** la otra recta de la unión (> 1 mm a 90°): geométricamente inválido.

**Corrección:**
1. Cada pareja de paneles que comparte aristas de crease es una **unión** (`A.uniones[u]`) que conserva **todas** sus aristas atómicas, con coordenadas y segmentos de origen (`C<i>:<k>`), agrupadas por recta exacta; además `creases`, `segmentos` y `longitudTotal`. No se descarta ninguna arista.
2. Clasificación exacta, **sin tolerancias nuevas** (orientación y producto vectorial exactos de las direcciones de origen):
   - `plegable`: todas las aristas sobre **una** recta ⇒ bisagra rígida (eje y signo como en F2A-2, sin cambios);
   - `ambigua`: varias rectas, **todas paralelas** (ejes desplazados): solo una **decisión geométrica explícita** (p. ej. unificar ejes, pendiente de A-1) podría convertirla en bisagra;
   - `no-plegable`: rectas **no paralelas**: ninguna bisagra rígida es compatible.
3. Solo las uniones plegables se publican como `AdjacencyEdge` v1 (`A.adyacencias`, con `detalle[k].union`); `uniones[u].adyacencia` = índice o −1. **El árbol solo puede usar bisagras plegables**: ninguna unión ambigua o no plegable produce un `FoldEdge`.
4. Diagnósticos explícitos y trazables: `union-no-plegable` / `union-ambigua` con `union`, paneles, número de `rectas`, `creases`, `segmentos`, `longitudTotal` y `motivo`. Desaparece `adyacencia-no-colineal` (su información está en la unión).
5. Si excluir uniones desconecta el grafo de bisagras, `componente-desconectado` lo dice: `unionesNoPlegablesEntreComponentes: [{union, clase, componentes}]`.
6. Adyacencias válidas sin cambios: en las 33 entradas sin uniones no plegables las adyacencias v1 y el árbol son **byte a byte** los de `2a00433` (§5).

## 3. H-02 — Falsos ciclos (severidad media)

**Defecto [CONFIRMADO]:** `adyacenciasFueraDelArbol` mezclaba las adyacencias de componentes que no contienen la base con las que cierran ciclos, y bastaba con que no estuviera vacía para emitir `ciclo`. Con dos componentes 2 + 2 (un bosque) daba `ciclo` con ν = 0; con un ciclo real en la componente no alcanzada marcaba 4 adyacencias como ciclo con ν = 1.

**Corrección:** componentes y ciclos sobre el **grafo completo** de bisagras plegables: árbol BFS en la componente de la base (sin cambios) y **bosque generador** determinista en las demás (raíz = mayor área, desempate geométrico). Cada adyacencia es exactamente una de: arista del árbol, `adyacenciasNoAlcanzadas` (bosque de otras componentes; **no** son ciclos) o `adyacenciasCiclo` (cierran un ciclo en su componente). `numeroCiclomatico = m − n + c` y el código **comprueba** que coincide con el número de adyacencias de ciclo (si no, `ErrorPanelModel('adaptador-incoherente')`). `ciclo` solo se emite si ν > 0, con `porComponente`. `componente-desconectado` se conserva (con `adyacenciasNoAlcanzadas`). `adyacenciasFueraDelArbol` se mantiene con su significado literal (árbol de la base excluido), ya no se usa para diagnosticar ciclos.

## 4. Pruebas

### 4.1 Nuevas: `tests/experimental/f2a2r-hallazgos.test.mjs` (13)
- **H-01:** escalón (unión no plegable con sus 3 rectas, `C0:0 C1:0 C2:0`, longitud total = suma de todas las aristas, 0 adyacencias v1, 0 pliegues, desconexión explicada); rectas paralelas desplazadas unidas por un corte ⇒ `ambigua`; crease en L ⇒ `no-plegable` y, si otra ruta conecta los paneles, sin desconexión ni ciclo falso, y ningún `FoldEdge` sale de una unión no plegable; **demostración de la invalidez** (forzar el tramo más largo como bisagra despega la otra recta); Caja Botánica (3 extracciones): 12 uniones, todas plegables, mismas 12 bisagras.
- **H-02:** la prueba mínima exigida (dos componentes de dos paneles, una adyacencia interna cada una ⇒ 2 componentes, ν = 0, ningún `ciclo`, árbol solo en la componente de la base, los otros dos paneles no alcanzados, su adyacencia en `adyacenciasNoAlcanzadas`); ciclo real en una componente desconectada (ν = 1, una sola adyacencia de ciclo, en esa componente; las otras 3, bosque); ciclo en la componente de la base con bosque en otra; rejilla 4×4 de líneas completas.
- **Estrés aleatorio** (semilla 20261028, 600 troqueles sintéticos degenerados, la mitad partidos por cortes): clase de cada unión = **clasificación independiente exacta** sobre los polígonos racionales del oráculo (`clasificarUnionesOraculo`, sin núcleo); componentes, ν y partición árbol/ciclo/no alcanzadas = referencia propia por union-find; `ciclo` solo si ν > 0; ningún `FoldEdge` de una unión no plegable. Cobertura medida: 74 casos con varias componentes, 21 con ciclos, 16 con componentes sin ciclo, 99 uniones no plegables (las ambiguas se cubren con el caso sintético).
- **Controles negativos:** se copia `experimental/` a un temporal, se reintroduce cada defecto en `arbol.js` (H-01: toda unión plegable; H-02: ciclo = todo lo que queda fuera del árbol, con y sin la comprobación interna de ν) y las comprobaciones lo **detectan**; el módulo real no.

### 4.2 Pruebas de F2A-2 sustituidas porque exigían el comportamiento defectuoso (evidencia: fallaron 6 de 199 con la corrección antes de sustituirlas)
| Prueba (archivo) | Antes exigía | Ahora exige |
|---|---|---|
| «contrato y oráculo», aserción «parejas adyacentes» (`f2a2-adaptador`, 29 casos; falló `escalon-crease`) | `adyacencias` = todas las parejas del oráculo | `uniones` = todas las parejas del oráculo; clase y número de rectas = clasificación independiente exacta; `adyacencias` = uniones plegables; el resto de aserciones (creases, eje en el borde de ambos paneles) igual |
| «crease cerrada» (`f2a2-adaptador`) | 1 adyacencia v1 y `adyacencia-no-colineal` con 4 grupos | 0 adyacencias v1; 1 unión `no-plegable` con sus 4 rectas; `union-no-plegable` |
| `validarArbol` (`f2a2-arbol`; usado por 30 casos, 42 bases, 24 transformaciones y A-*; fallaron `escalon-crease` y A-7) | niveles BFS sobre todas las parejas del oráculo; componentes = componentes topológicas del oráculo; `ciclo` ante cualquier adyacencia fuera del árbol, con ν = m − n + c | niveles BFS sobre las parejas que la clasificación independiente da como plegables; componentes y ν de ese grafo (referencia propia); `ciclo` solo si ν > 0; partición exacta árbol/ciclo/no alcanzadas; quitar una adyacencia de ciclo no desconecta nada |
| A-1 (`f2a2-arbol`) | 1 `FoldEdge` y `adyacencia-no-colineal` | 0 `FoldEdge`, `union-no-plegable` con 3 rectas, 2 componentes con la unión como causa |
| plegado rígido, caso «escalón (eje del grupo colineal)» (`f2a2-arbol`) | bisagras correctas con el tramo más largo como eje | sustituido por «T exacta (tres bisagras sobre dos rectas)»; la invalidez del tramo más largo se demuestra en `f2a2r-hallazgos` |
| comparación con el legacy (`tests/lib/f2/plegado-legacy.mjs`; falló `escalon-crease`) | parejas del adaptador = `adyacencias`; niveles frente a todas las parejas del oráculo | parejas = `uniones`; niveles frente al grafo de bisagras independiente; cada unión no plegable que el legacy usa como bisagra se registra como diferencia **geométrica** |
Ninguna aserción general se relajó: las comprobaciones de oráculo (paneles, áreas, creases, componentes topológicas en `f2a2.componentes`), contrato v1, determinismo (24 permutaciones), signos por sondas, plegado rígido, transformaciones y Caja Botánica siguen iguales.

## 5. Comparación antes/después (`docs/fase2/evidencia/f2a2r-antes-despues.{md,json}`) [MEDIDO]

42 casos (34 de F2A-2, 7 mínimos de F2A-2R, A-7): **33 idénticos** (adyacencias v1, árbol, componentes y ciclos byte a byte). Cambian solo:
| Caso | Antes (`2a00433`) | Después | Hallazgo |
|---|---|---|---|
| escalón de crease (A-1) | 1 adyacencia, 1 pliegue, 1 componente | 1 unión no plegable, 0 pliegues, 2 componentes (causa: la unión) | H-01 |
| rectas paralelas desplazadas | 1 pliegue | unión ambigua, 0 pliegues | H-01 |
| crease en L | 1 pliegue | unión no plegable, 0 pliegues | H-01 |
| L con otra ruta | 3 adyacencias, `ciclo` (ν 1) creado por la bisagra inválida | 2 adyacencias, 2 pliegues, sin ciclo | H-01 |
| A-7 Illustrator real sin ajuste (fuera de dominio) | 3 adyacencias, 3 pliegues | 1 plegable + 2 no plegables (tramos de ruido de 0,000 y 0,003 mm), 0 pliegues desde la base, 3 componentes | H-01 |
| dos componentes 2 + 2 | `ciclo` con 1 adyacencia, ν 0 | sin ciclo | H-02 |
| ciclo en componente no alcanzada | `ciclo` con 4, ν 1 | `ciclo` con 1, ν 1 | H-02 |
| ciclo en la base + bosque | `ciclo` con 2, ν 1 | `ciclo` con 1, ν 1 | H-02 |
La Caja Botánica (tres extracciones), las rejillas, la caja simple, el panel no convexo envolvente y los 22 sintéticos salvo `escalon-crease` no cambian.

## 6. Comparación con el legacy tras la corrección (`docs/fase2/evidencia/f2a2r-legacy.{md,json}`) [MEDIDO]

Misma herramienta que en F2A-2 (`tools/f2/comparar-legacy-plegado.mjs`) sobre el código corregido; la evidencia de F2A-2 (`f2a2-legacy.*`) se conserva sin cambios.

| | F2A-2 (`2a00433`) | F2A-2R |
|---|---|---|
| Errores del adaptador frente al oráculo | 0 | **0** |
| Diferencias topológicas / geométricas / de representación | 91 / 34 / 30 | 92 / 35 / 30 |
| Esperadas (corrigen un error histórico; adaptador = oráculo) | 125 | 127 |
| `buildFoldTree` del legacy sobre el modelo v1: mismos niveles | 34/34 | 34/34 |
| `computeFoldSign` distinto en hijos convexos | 0 | 0 |

Único cambio de fondo: `escalon-crease` añade dos diferencias esperadas — **geométrica** (el legacy usa como bisagra una unión no plegable de 3 rectas) y **topológica** (niveles del árbol distintos: el adaptador ya no pliega esa unión). En los demás casos solo cambia el texto de la diferencia de representación («una por pareja plegable»). Donde el legacy acierta, siguen 0 diferencias topológicas y geométricas.

## 7. Rendimiento y memoria (sin cambios deliberados; `docs/fase2/evidencia/f2a2r-rendimiento*.{json,txt}`, dos corridas) [MEDIDO]

No se optimizó nada (prohibido en esta intervención) y el núcleo no cambió. La corrección **añade coste** al conservar todas las aristas de cada unión y analizar las componentes no alcanzadas: adyacencias +30–50 % (rejilla 8×8: 0,34 → 0,45 ms), árbol +20–80 % (0,04 → 0,08 ms), en absoluto ≤ 0,12 ms; heap retenido por resultado +6–19 % (8×8: 479 → 569 kB). **Criterio 5 del Plan §5:** pasa de 3/10 a **4/10** casos más lentos que el legacy en las dos corridas — histórico ×0,75 con ajuste (1,93–1,97 frente a 1,04–1,08 ms), caja simple, rejilla 2×2 y, **nuevo**, rejilla 3×3 de líneas completas (0,27–0,30 frente a 0,22 ms; antes 0,91×). Cadena experimental total frente a legacy en los demás casos sin cambio de clase (Caja Botánica 0,45 frente a 2,79 ms; rejilla 8×8 1,64 frente a 28,4 ms).

## 8. Baterías (secuenciales) [MEDIDO]

Batería secuencial sobre `5597a48` (código final de F2A-2R; el commit de cierre solo añade documentación y evidencia), evidencia `docs/fase2/evidencia/run-all-F2A-2R.txt`:

| Paso | Resultado |
|---|---|
| `tests/run-all.sh` | **TODO EN VERDE** (`EXIT_RUN_ALL=0`): aislamiento OK, build verificado (`dist-a9`, `main.js` 131 546 B), Node 662 + 1 omitida, navegador 52 · a7 13 · a8 31 · a9 32 · Chromium-99 4 · puente 6 · a5-observar 3 · A4-CDP 7 |
| después, `tests/run-experimental.sh` | **EXPERIMENTAL EN VERDE** (`EXIT_EXPERIMENTAL=0`): **322** = 309 anteriores (6 sustituidas, §4.2) + 13 de F2A-2R |
| antes de la corrección | `tests/run-experimental.sh` 309/309 sobre `2a00433` |

Sin fallos intermitentes: la carrera `install-dry-run` ↔ `a4-herramienta` (incidencia de infraestructura registrada en F2A-1, sin corregir) no apareció; no se repitió ninguna batería.

## 9. Compatibilidad y aislamiento [CONFIRMADO]

`f2a2-aislamiento` (6) sigue en verde con el código corregido: producción no importa nada experimental, `dist/main.js` sin marcas, solo imports propios o del núcleo, sin DOM/CEP/Illustrator/THREE/estado de módulo, `esbuild --target=chrome99` sin avisos, vm aislado = Node y **Chrome headless con las APIs posteriores a la 99 eliminadas = Node byte a byte** (5 casos). `cruzDireccionesG` (nuevo import) es del núcleo. Los controles negativos usan temporales `tess-f2a2r-*` (no `tess-iso.*`).

## 10. Decisiones pendientes

| Id | Asunto | Situación |
|---|---|---|
| D-F2A2R-1 | Regla explícita para uniones **ambiguas** (ejes paralelos desplazados, A-1): ¿unificarlas en un eje o bloquearlas siempre? | Hoy se bloquean con diagnóstico; ninguna aparece en los troqueles reales disponibles |
| D-F2A2R-2 | **Uniones no plegables en datos reales fuera de dominio** (A-7: tramos de ruido de 0,003 mm sin ajuste) fragmentan el modelo en componentes | Correcto geométricamente sin ajuste; con ε 0,05 la Caja Botánica vuelve a 12 bisagras plegables. La interfaz futura debe mostrarlas |
| D-F2A2R-3 | Coste añadido de la corrección (criterio 5: 4/10) | No optimizado por instrucción; revisable en una intervención de rendimiento autorizada |
| D-F2A2R-4 | Las uniones a través de islas (crease cerrada interior) no tienen aristas en los polígonos del oráculo: la clasificación independiente no las cubre | Cubiertas por la prueba específica de la crease cerrada |
| (heredadas) | D-F2A2-1…10 de `F2A2_INFORME.md` §10 | Sin cambios; D-F2A2-5 queda resuelta por H-01 (bloqueo en lugar de eje más largo) |

## 11. Riesgos

Sin tolerancias nuevas, la clasificación depende del ajuste (ε experimental): sin él, el ruido de 0,003 mm basta para que una unión real sea no plegable (comportamiento correcto y diagnosticado, pero visible). Rendimiento (§7). Chromium 99 real y CEP siguen sin probar. Integración (F2A-5) pendiente de D-F2A2-1.

## 12. Punto de parada

F2A-2R completada. **No** se inicia F2A-3 ni F2B ni la integración. Se presenta este informe para una **segunda revisión independiente**. Rollback sin afectar al producto: `git revert` de los tres commits de F2A-2R.
