# F2A-1 · HANDOFF — continuar en un chat nuevo (Claude Opus High) sin el historial

Fecha: 2026-10-27 · Último commit técnico: `3f75984d220efb237c28787f1691d01a08fe5621` (cierre de F2A-1, **aprobado por el usuario**) · Este documento llega en un commit documental posterior (ver `git log -1`).
Idioma con el usuario: **español**, explicaciones claras y breves, evidencia antes que afirmaciones, etiquetas [MEDIDO]/[CONFIRMADO]/[INFERENCIA]/[NO VERIFICADO]. Lee también `HANDOFF.md` (§2 límites no negociables, §18–§20) y `docs/fase2/F2A1_INFORME.md`.

## 1. Objetivo y estado actual

Tesseract V3 = plugin CEP de Illustrator (panel + three.js r132) que lee un troquel (capas de corte y pliegue), lo pliega en 3D y exporta GLB. **F1** (modularización sin cambios visibles) está **cerrada** en `1cc1065`. **F2** corrige el comportamiento geométrico, empezando por **KI-22** (el resultado del motor legacy depende de la escala absoluta: la Caja Botánica da 13 paneles a ×0,75 y 11 a ×1,0).

| Paso | Estado | Documento |
|---|---|---|
| F2.0 diagnóstico | Aprobado | `docs/fase2/00_INFORME_F2.0.md` … `08_…` |
| F2A-0 oráculo independiente, fixtures y pruebas | Aprobado (`dc1d917`) | `docs/fase2/F2A0_00_INFORME.md` … `F2A0_07_…` |
| **F2A-1 núcleo geométrico experimental** | **Aprobado (`3f75984`)**, NO integrado | `docs/fase2/F2A1_INFORME.md` |
| F2A-2 | **Pendiente de autorización (D-1)** | §14 y §17 |

Causa de KI-22 (F2.0, demostrada): la tolerancia fija de 0,5 mm del legacy coincide con detalles reales de 0,497–0,504 mm del troquel (D1), sumada a la adyacencia estricta y al filtro de conectividad (D2, KI-04). Ni el 13 de ×0,75 ni el 11 de ×1 son correctos; el oráculo exacto da **13 paneles candidatos** (DP-2: candidato, no criterio único) con área exacta y las 12 creases efectivas.

## 2. Arquitectura del núcleo experimental

```
Dieline v1 (doubles, mm)
  └─ nucleo.js ── polilineas (curvas: anclas | {muestras: N}) ── cortes: B (contorno), H<k> (huecos), K<j> (cortes abiertos) · creases C<i>
       ├─ ajuste.js (SOLO si opciones.eps) ── B agrupar → A proyectar al corte → C T sobre otra crease → banda (solo informa)
       │      produce puntos EXACTOS homogéneos {x, y, H:{X,Y,W}} (W > 0), nunca toca cortes
       ├─ arreglo.js ── todas las parejas (caja envolvente) → cruce / T / solape colineal con signos EXACTOS
       │      vértices simbólicos (punto de entrada | cruce(i,j)), orden exacto por parámetro, aristas atómicas con etiquetas y dirección de origen
       ├─ caras.js ── DCEL, orden angular exacto, ciclos, componentes, Euler, islas, paridad par-impar (BFS)
       └─ nucleo.js ── paneles (regiones acotadas de paridad impar), tramos de crease, adyacencias, componentes, conservación, diagnósticos
predicados.js ── base de todo: expansiones de punto flotante (sin BigInt), filtros con cota de error, predicados generales
```
Principios: decisiones topológicas **exactas**; ninguna tolerancia de fusión; el contorno es inmutable; ε solo en el ajuste y solo si se pasa; sin DOM/THREE/estado global; solo imports relativos propios.

## 3. Archivos y responsabilidades

| Archivo | Líneas | Responsabilidad |
|---|---|---|
| `experimental/geometria/predicados.js` | 146 | `twoSum`, `twoProduct` (Dekker), `suma`, `resta`, `producto`, `escalar`, `signo`, `aprox`, `diferencia`; `orient`, `cruzDirecciones` (double + respaldo exacto); puntos homogéneos: `H`, `puntoExacto`, `orientG`, `cmpCoord`, `cruzDireccionesG`, `sobreSegmentoG`, `fraccionesCruce`, `fraccionProyeccion`, `compararFracciones`, `proyectarExacto`, `mediaExacta`, `compararDistancias2`; `contadores` (diagnóstico: `filtro`, `exacto`, `exactoCero`) |
| `experimental/geometria/arreglo.js` | 64 | `construirArreglo(segmentos)` → `{vertices, aristas, segmentos, cruces, puntosEntrada, puntosExactos}` |
| `experimental/geometria/caras.js` | 54 | `construirCaras(arr, esContornoCerrado)` → `{H, ciclos, reg, par, euler, coherente, islasDudosas, NO}`; `areaPoligono` (Neumaier), `dentroPoligono` |
| `experimental/geometria/ajuste.js` | 83 | `ajustarExtremos(cortes, creases, eps, rho = 3)` → `{diag}` (modifica `creases[i].pts`) |
| `experimental/geometria/nucleo.js` | 81 | `nucleo(dieline, opciones)` (contrato §4) |
| `experimental/geometria/index.js` | 6 | reexporta la API |
| `experimental/geometria/package.json` | — | `"type": "module"` (solo para Node) |

434 líneas en total (`wc -l experimental/geometria/*.js`).

## 4. Contratos de entrada y salida

**Entrada:** `Dieline` v1 (`src/core/engine.js`): `{outerBoundary: Path, holes: Path[], cutLines: {geom: Path}[], creases: Path[]}`, `Path = {closed, points: [{anchor, left, right}]}`, mm. Opciones: `eps` (número, **sin valor por defecto**: sin él no hay ajuste), `rho` (3), `curvas` (`'anclas'` por defecto, o `{muestras: N}`).

**Salida de `nucleo()`** (misma forma que `resumen()` del oráculo, para compararlos con `tests/lib/f2/comparar*.mjs`):
```
{ motor:'experimental-f2a1', opciones, contornoIntacto, segmentosLongitudCero, diagnosticos:[{tipo:'ajuste'|'ambiguo'|'banda-ambigua'|'astilla', …}],
  arreglo:{segmentos, cruces, vertices, aristas, ciclos, componentesGrafo, eulerOK, paridadCoherente, islasDudosas, puntosExactos},
  paneles:[{id:'F<k>', creases:['C<i>'…] (ordenadas), area (double, neta), vertices, bordesCorte, islas, poligono:[{x,y}] CCW}],
  adyacencias:[{a, b, creases, longitud}], tramos:[{crease, tipo:'separa'|'colgante'|'sobre-corte'|'fuera'|'borde', a, b, longitud}],
  componentesPaneles, creases:[{id, separa, colgante, sobreCorte, fuera, borde, pares:['a-b']}],
  conservacion:{esperadaMm2, generadaMm2, difRelativa}, ms }
```
Orden canónico de paneles: por conjunto de creases que lo separan y área (identificador estable = ese conjunto, `docs/fase2/04_CONTRATO_MATEMATICO.md` §4).

## 5. Predicados exactos y representación homogénea

- **Expansiones:** un número es un array de doubles no solapados en orden creciente de magnitud cuya suma exacta es el valor; `twoSum`/`twoProduct` dan resultado + error exactos (supuesto: redondeo al par más cercano, **sin desbordamiento ni subdesbordamiento** en productos). `signo` = signo del componente de mayor magnitud.
- **`orient`/`cruzDirecciones`** en double: filtro estático (`ccwerrboundA = (3 + 16u)·u`; 8u para direcciones); si no decide, determinante exacto con expansiones.
- **Puntos homogéneos** `{x, y, H:{X, Y, W}}`, W > 0: los crea el ajuste (`mediaExacta`: (Σx, Σy)/k; `proyectarExacto`: P = (XA·Wp·dRR + dUR·R)/(WA·Wp·dRR), exactamente sobre el segmento). `orientG` = signo del determinante 3×3 homogéneo, con filtro de cota de error (coordenadas aproximadas con error ≤ 16u·M) y dos atajos exactos: dos puntos idénticos ⇒ 0; punto proyectado sobre su segmento de origen (`p.sobre`) ⇒ 0 (los registros del arreglo heredan `sobre`).
- **Cruces:** parámetros exactos t, u como fracciones de expansiones (`fraccionesCruce`); coordenadas en double solo informativas (nunca extremo de segmento ni argumento de un predicado del arreglo).
- `compararFracciones` con filtro (diferencia relativa > 1e-12 ⇒ decide en double; si no, exacto).

## 6. Política de ajuste experimental y tolerancias

- **ε (0,05 mm en las pruebas) es un PARÁMETRO EXPERIMENTAL** (DP-3 y autorización F2A-1 punto 3): prohibido como constante de producto, prohibido en contornos, huecos, cortes o predicados topológicos.
- Orden: **B** agrupar puntos de crease a ≤ ε (union-find; vértices interiores y extremos que ya tocan un corte EXACTAMENTE son anclas) → el grupo va a su ancla o a su media exacta; **A** si ese punto no está exactamente sobre un corte y está a distancia lateral ≤ ε, se proyecta exactamente sobre el segmento más cercano (si cae en un extremo, se usa el vértice de entrada); **C** extremos aún libres sobre el segmento de otra crease (T con ruido), iterado ≤ 20 pasadas; **banda** (ε, 3ε] ⇒ diagnóstico `banda-ambigua`, sin mover.
- Decisiones finas en **exacto**: «ya está sobre el corte» y el desempate del segmento más cercano (`compararDistancias2`); las comparaciones con ε se hacen en double (pueden diferir del oráculo solo a ~1e-16 del umbral).
- DP-1: los detalles de ≈ 0,5 mm (escalones de contorno y creases paralelas escalonadas) son provisionalmente **intencionales**: nunca se fusionan.
- Política completa propuesta (roles separados, δ_num, banda, dominio): `docs/fase2/03_TOLERANCIAS_Y_POLITICA.md` §3.

## 7. Oráculos y fixtures

- **Oráculo** `tests/lib/f2/oraculo.mjs` + `racional.mjs` (F2A-0): aritmética racional exacta (BigInt), mismo esquema de ajuste con ε como texto exacto (`'0.05'` = 1/20), paridad par-impar, conservación **exacta**; independiente del legacy y del motor web (prueba de independencia en `tests/node/f2-oraculo.test.mjs`). No apto como motor (~150 ms con ajuste).
- **Comparación:** `tests/lib/f2/comparar.mjs` (firma topológica, clases topología/geometría/representación/discretización, transformaciones, permutaciones, `mapaCreasesPorGeometria`), `tests/lib/f2/comparar-nucleo.mjs` (`compararConOraculo`: topología exacta; áreas/longitudes con tolerancia de representación que escala con la magnitud de coordenadas).
- **Fixtures reales** (sin cambios): `tests/fixtures/real/caja-botanica-real.dieline.json` (original del plugin; 13 sin ajuste), `tests/fixtures/illustrator-real/ill-real-caja-botanica.dieline.json` (Illustrator real; ruido ≤ 0,005 mm; 13 con ε 0,05), `tests/fixtures/real/caja-botanica-illustrator-export.dieline.json` (histórico ×0,75; creases en otro orden e Y invertida), `ill-real-caja-simple`, `ill-real-compuesto`, `ill-real-curvas`.
- **Sintéticos:** `tests/lib/f2/fixtures-f2.mjs` (22 con valor analítico; 18 «esperado-F2», 4 «indeterminado»); `tests/lib/f2/aleatorios.mjs` (generador degenerado con semilla).
- **Golden** del oráculo: `tests/golden/f2-caja-botanica.golden.json` (generado por `tests/tools/make-f2-golden.mjs`, nunca desde el legacy).

## 8. Pruebas y comandos reproducibles

```bash
cd "Tesseract v3"
tools/verify-isolation.sh                           # aislamiento (baseline, extensión instalada, V3 no instalado)
tests/run-all.sh                                    # batería F1 + F2A-0 (varios minutos sin flags; --mutations --soak ≈ 50 min)
tests/run-experimental.sh                           # 110 pruebas del núcleo — SIEMPRE DESPUÉS de run-all, nunca a la vez (§12)
node --test tests/node/f2-*.test.mjs                # 95 pruebas de F2A-0 (oráculo, Caja Botánica, metamórficas, histórico)
node tools/f2/estres-candidato.mjs --n 300 --m 2000 --semilla 20261027   # estrés diferencial (≈ 70 s)
node --expose-gc tools/f2/rendimiento-nucleo.mjs    # rendimiento y memoria frente al legacy
node tools/build/build.mjs --verify                 # dist/ = huella vigente dist-a9 (main.js e5902a3c…)
```
Archivos de `tests/experimental/`: `f2a1-predicados` (7), `f2a1-arreglo` (22), `f2a1-candidato` (33), `f2a1-metamorficas` (40), `f2a1-estres` (2), `f2a1-aislamiento` (5 + bundle Chromium 99).
**Última evidencia (sin cambios de código posteriores):** `docs/fase2/evidencia/run-all-F2A-1.txt` — TODO EN VERDE (Node 662 + 1 omitida; navegador 52 · 13 · 31 · 32 · 4 · 6 · 3 · 7) y EXPERIMENTAL EN VERDE (110).

## 9. Resultados metamórficos y de estrés [MEDIDO]

- Núcleo = oráculo en 22 sintéticos + 9 configuraciones reales; 13 paneles en las tres extracciones de la Caja Botánica.
- Metamórficas (40): exactas en double (×2^k, 90°, 180°, reflexión) idénticas; inexactas (×0,75, ×1,37, 37°, 1°, +1 000, +1e5, +1e7) = oráculo sobre los mismos doubles; permutaciones idénticas; repetición idéntica.
- Estrés (`evidencia/f2a1-estres.*`): 300 semejanzas aleatorias de las 3 extracciones con ε 0,05 y 2 000 sintéticos degenerados (596 con > 1 panel, 865 con cruces, 1 914 con colgantes): **0 diferencias**.
- Predicados: 0 discrepancias con el exacto en 100 000 triples, mientras el double ingenuo sí falla en ese conjunto.

## 10. Rendimiento, memoria y limitaciones (`evidencia/f2a1-rendimiento.*`, Node 24, M1 Max)

Más rápido que el legacy en 7/10 casos (Caja Botánica original 0,44 frente a 2,96 ms; rejilla 8×8 1,36 frente a 28,8 ms). **Más lento** en el histórico ×0,75 con ajuste (1,83 frente a 1,06 ms) y en dos casos diminutos (≈ 0,10 frente a 0,06 ms): **el criterio 5 del Plan §5 no se cumple**. Pico de RSS mayor con ajuste (104 frente a 66 MB en 50 ejecuciones); heap retenido igual o menor; sin fugas observadas. Coste dominante: expansiones de los puntos homogéneos (`escalar`, `grow`, `producto`).
Limitaciones: áreas, longitudes y coordenadas de cruces en double; islas con vértices aproximados; decisiones ≤ ε en double; supuesto de no desbordamiento; Chromium 99 solo verificado por empaquetado y ejecución en Node (no en CEP real).

## 11. Riesgos y casos ambiguos

Casos A-1…A-12 (`docs/fase2/F2A0_04_AMBIGUEDADES.md`): A-1 intención de los detalles de 0,5 mm · A-2 13 como candidato sin verificación humana · A-3 rama de T a 0,375 mm · A-4 crease corta en la banda · A-5 crease corta 0,6 (colgante sin aviso) · A-6 crease paralela al corte a 0,004 mm (astilla; el legacy probablemente acierta la intención) · A-7 ruido sin ajuste · A-8 fuera de dominio de escala · A-9 cortes abiertos y huecos cruzados sin casos reales · A-10 curvas (anclas frente a muestras) · A-11 cadenas de ajuste C · A-12 agrupación transitiva.
Riesgos: R-1 ε calibrado con un solo troquel (falta el corpus de ≥ 10 troqueles reales) · R-2 aceptar por número de paneles · rendimiento (§10) · Chromium 99 real sin probar · integración futura (`a6-limites` fija el inventario exacto de `src/core/`).

## 12. Carrera de pruebas en F1 y cómo evitarla (D-2)

**Incidencia de infraestructura de pruebas, separada de los defectos del producto** (registro provisional; NO corregida). `tests/node/install-dry-run.test.mjs` («el instalador no deja residuos…») exige que no exista ningún `/tmp/tess-iso.*`; `tools/install.sh --dry-run` crea `/tmp/tess-iso.$$` mientras corre, y `tests/node/a4-herramienta.test.mjs` lo lanza en paralelo vía `tools/a4/a4.sh`. Con carga de CPU extra (las pruebas del núcleo dentro de `tests/node/`) falló de forma intermitente (también `extraction.test.mjs` una vez). Medido: `dc1d917` 8/8 en verde; con las pruebas en `tests/node/`, fallos intermitentes; tras moverlas a `tests/experimental/`, 6/6 en verde. Evidencia: `docs/fase2/evidencia/f2a1-carrera-pruebas-paralelas.md`.
**Procedimiento:** no añadir pruebas intensivas a `tests/node/`; ejecutar `tests/run-experimental.sh` después de `tests/run-all.sh`; si `install-dry-run` falla de forma aislada, repetir la batería sola antes de sospechar del producto y conservar la salida.

## 13. Estado del contrato `PanelModel` v1

**No hay adaptador todavía.** Contrato vigente (`src/core/engine.js`, GeometryEngine v1, solo `legacy`): `validate(d) → {problems}`; `buildPanels(d) → {panels:[{vertices CCW, edges:[{u, v, type:'boundary'|'crease'}], area ≥ 0, centroid ponderado}], creaseEdges:[{a, b, creaseIdx, segIdx}], creases}`; `buildAdjacency(panels, creaseEdges) → [{panelA, panelB, crease:{a, b}, creaseIdx}]`; `buildFoldTree(panels, adjacency, baseIndex) → [{parent, child, crease, sign}]`; `defaultBaseIndex(model) → índice del mayor área`. Invariantes I1–I10 en el comentario de `engine.js` (sin DOM/THREE/estado, determinista, mm, identidad de panel = índice…). Diferencias por resolver: el núcleo identifica paneles por conjunto de creases (no por índice), sus `adyacencias` no llevan `creaseIdx` único (pueden llevar varias creases), no produce `creaseEdges` ni centroides, y su área es **neta** (resta huecos) mientras el legacy usa la bruta (DP-6 aplazada: base por defecto).

## 14. Dependencias técnicas de F2A-2 (propuesta, D-1)

Alcance propuesto: adaptar la salida del núcleo a `PanelModel` v1 y construir el árbol de plegado **fuera de producción** (`experimental/` y `tests/experimental/`), sin tocar `src/`. Necesita: (1) mapear paneles → `vertices` CCW + `edges` tipadas por arista atómica + `area` + `centroid`; (2) `creaseEdges` con `creaseIdx/segIdx` coherentes con la entrada; (3) adyacencias con un `creaseIdx` (regla si una adyacencia comparte varias creases); (4) árbol: reutilizar `buildFoldTree`/`computeFoldSign` de `src/core/legacy/fold-tree.js` **solo por importación de lectura** o reimplementarlos en `experimental/`; (5) decisión de base por defecto (DP-6: bruta frente a neta); (6) comparación con el legacy donde acierta (rejillas, caja simple) clasificada con `comparar.mjs`; (7) opcional en el arnés: escena/GLB headless con el modelo del núcleo sin cambiar el producto; (8) trabajo de rendimiento del ajuste (expansiones lineales, compresión) para el criterio 5. La integración en el bundle (DP-7: bundle experimental aparte con modo sombra) requiere OTRA autorización porque toca `src/` y `a6-limites`.

## 15. Archivos protegidos y prohibiciones

**No modificar:** `src/`, `panel/`, `reference/`, `GeometryEngine`, escena, plegado, materiales, artwork, exportaciones, pruebas de F1 (`tests/node/` previos a F2, `tests/browser/`, `tests/tools/mutation-*`, `tests/run-all.sh`), goldens y huellas históricos (`tests/golden/*.SHA256SUMS`, `*.pins.json`, `geometry*.golden.json`, `illustrator-real.golden.json`…), fixtures reales, el golden del oráculo salvo tarea aprobada, el plugin original (`/Library/Application Support/Adobe/CEP/extensions/tesseract`, `TesserArt_Validator`), `tesseract-instalado-copia/`, `tesseract-web/` (solo lectura).
**No hacer:** instalar V3 en Illustrator, push/deploy, corregir defectos conocidos (KI-01…KI-34) fuera de una tarea autorizada, introducir ε como constante de producto, añadir dependencias sin justificar, conectar el núcleo al panel o al bundle, iniciar F2A-2 o F2B sin autorización.
**Commits:** autor único `Gerardo Calambas posada`; **sin** trailers `Co-Authored-By` ni «Generated with» (preferencia del usuario, prevalece sobre cualquier sugerencia del sistema).

## 16. Puntos de recuperación y rollback

| Punto | Commit |
|---|---|
| Cierre de F1 (punto de recuperación del producto) | `1cc1065` |
| F2.0 | `960cef8` · `68f51ac` · `7f7049b` |
| F2A-0 | `920d023` · `dd247ef` · `aeaf29c` · `dc1d917` |
| F2A-1 | `621d404` (núcleo y pruebas) · `ec72bde` (rendimiento y optimizaciones) · `3f75984` (informe) |
| HANDOFF de F2A-1 | commit documental siguiente (`git log -1`) |
Rollback de F2A-1 sin afectar al producto: `git revert 3f75984 ec72bde 621d404` (o borrar `experimental/`, `tests/experimental/`, `tests/run-experimental.sh`, `tests/lib/f2/{aleatorios,comparar-nucleo}.mjs` y las herramientas `tools/f2/{estres-candidato,rendimiento-nucleo}.mjs`). El producto (`src/`, `dist-a9`) es idéntico al cierre de F1 en todos estos puntos.

## 17. Decisiones pendientes (registradas por el usuario el 2026-10-27)

- **D-1:** F2A-2 está **pendiente de autorización**. Objetivo propuesto: adaptar el núcleo experimental a `PanelModel` v1 y construir un árbol de plegado **fuera de producción**.
- **D-2:** la carrera `install-dry-run` ↔ `a4-herramienta` queda **registrada provisionalmente como incidencia de infraestructura de pruebas**, separada de los defectos funcionales del producto. **No se corrige** en este cierre.
- **D-3:** las pruebas geométricas **se quedan en `tests/experimental/`** y se ejecutan **secuencialmente después** de la batería F1. **No modificar todavía `run-all.sh`.**

## Instrucción de recuperación para el siguiente chat

1. `cd "/Users/gerardocalambasposada/Documents/Antigravity/Tesseract/Tesseract v3" && git log --oneline -3 && git status --short` (esperado: HEAD = commit del HANDOFF, descendiente de `3f75984`; árbol limpio).
2. `tools/verify-isolation.sh` y `node tools/build/build.mjs --verify` (aislamiento y `dist-a9`).
3. Leer este documento, `HANDOFF.md` §2 y §18–§20, `docs/fase2/F2A1_INFORME.md`.
4. **No iniciar F2A-2** hasta que el usuario lo autorice (D-1). Con autorización: trabajar solo en `experimental/` y `tests/experimental/`; ejecutar `tests/run-all.sh` y después `tests/run-experimental.sh` tras cada bloque.
