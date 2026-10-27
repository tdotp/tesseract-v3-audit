# F2.0 · 01 — Diagnóstico de KI-22 (dependencia de la escala absoluta)

Base: `1cc1065` (cierre de F1). Motor analizado: `src/core/legacy/` **sin modificar** (importado tal cual por los scripts de `tools/f2/`).
Etiquetas: [MEDIDO] · [CONFIRMADO] · [INFERENCIA] · [NO VERIFICADO]. Evidencia cruda: `docs/fase2/evidencia/` (ver `README.md` de esa carpeta).

## 1. Resumen

1. **Primera divergencia observable: etapa E3, troceado de segmentos** (`buildTopology`, bucle de `pointOnSeg`), la primera etapa del pipeline que compara longitudes con `GRAPH_EPS = 0.5 mm`. E1 (contornos) y E2 (segmentos de entrada) son idénticas a todas las escalas tras normalizar [MEDIDO, 13 escalas, 3 fixtures].
2. **Causa:** el troquel real tiene **decenas de características geométricas de 0,497–0,504 mm** (escalones de 0,5 mm en el contorno y en las líneas de crease) y el motor decide con un umbral fijo de 0,5 mm. Entre ×0,75 y ×1,0 cambian **35 decisiones de predicados** (15 fusiones de vértices `ptEq` y 20 inclusiones `pointOnSeg`), todas sobre características de longitud 0,5005–0,5044 mm [MEDIDO]. A ×1,0 hay **66 predicados cuya escala crítica está a menos del 2 %** de la escala real: el resultado a tamaño real está **mal condicionado** (depende de micras).
3. **Cada una de las 10 transiciones** del resultado en un barrido fino de 601 escalas (×0,2–×5) cae exactamente en la escala crítica `s* = 0,5 / L` de algún predicado de la entrada [MEDIDO]. No queda ninguna transición sin explicar en la Caja Botánica.
4. **No hay 2 resultados (13 y 11), hay 9–10 distintos** según la escala, con conteos no monótonos (13 → 12 → 11 → 12 → 11) y áreas distintas con el mismo conteo (11 paneles a ×1,0 = 26 769 mm²; a ×2 = 26 120 mm²). Comparar solo el número de paneles ocultaba la mitad de la divergencia [MEDIDO].
5. **Ni el 13 de ×0,75 ni el 11 de ×1,0 son geométricamente correctos.** Frente a un oráculo independiente (arreglo plano exacto que conserva el área al 1e-8 y deja cada crease entre dos paneles distintos): a ×1,0 se **pierden** las dos solapas de 665,6 mm² (O4 y O9, creases 10 y 7); a ×0,75 aparecen los 13 paneles pero **con franjas de 0,5 × 40 mm asignadas al panel equivocado** (ΔA de −60,1 a +17,1 mm² por panel). El «13» histórico era el conteo correcto por una razón equivocada [MEDIDO].
6. **Son dos defectos apilados, no uno.** D1 = tolerancia en la misma escala que la geometría real; D2 = adyacencia estricta + filtro de conectividad (KI-04). Con la sombra del legacy a ε ≤ 0,02 mm (D1 neutralizado) el resultado es invariante pero sigue siendo **11 y sin conservar área** (D2 intacto) [MEDIDO]. Corregir solo la tolerancia **no** resuelve KI-22.
7. **Corrección de premisas anteriores:** los extremos de crease **sí tocan el corte** (distancia 0,0000 mm en la extracción original del plugin; ≤ 0,005 mm tras el viaje por SVG). Las «holguras de 0,375 mm» del D4 de la Fase 0 eran estas mismas características de 0,5 mm vistas a ×0,75 (KI-22 en el propio fixture). Ver §6 y `08_INCERTIDUMBRES…` C-1.

## 2. Reproducción

```bash
cd "Tesseract v3"
node tools/f2/ki22-diagnostico.mjs                       # etapas E1–E10 a 13 escalas, firma normalizada y primera divergencia (Caja Botánica ×1 real)
node tools/f2/ki22-predicados.mjs                        # escalas críticas de cada predicado + barrido de 601 escalas y explicación de cada transición
node tools/f2/metamorficas.mjs                           # traslación/rotación/reflexión/permutaciones + correspondencia de paneles con el oráculo
node tools/f2/experimento-tolerancias.mjs                # sombra del legacy y del web con ε variable (control: ε=0.5 ≡ motor real)
node tools/f2/motor-web.mjs                              # legacy vs motor candidato de tesseract-web (solo lectura) a 15 escalas
```
Fixtures: `tests/fixtures/illustrator-real/ill-real-caja-botanica.dieline.json` (extracción de Illustrator 30.8.2 real, ×1, SHA en `fixtures.pins.json`/golden) y `tests/fixtures/real/caja-botanica-real.dieline.json` (salida del extractor del plugin sobre el documento original). Duración total < 15 s. Las salidas guardadas en `evidencia/` son las de este informe.

**Validez de la instrumentación.** `tools/f2/lib/etapas.mjs` llama a las funciones reales (`classifyClosedCutContours`, `buildTopology`, `buildAdjacencyStrict`, `buildAdjacency`, `buildFoldTree`, `validateDieline`) y solo replica el bucle de filtros de `buildPanels` para registrar el motivo de cada descarte. La réplica se compara en **cada** ejecución con `buildPanels` real (columna `replica`): **OK en todas** las ejecuciones de la evidencia.

## 3. Hechos observados [MEDIDO]

### 3.1 Etapas por escala — `ill-real-caja-botanica` (normalizado a ×1)

| escala | seg. tras troceado | iter. | vértices | aristas | caras | paneles tras filtros | creases compartidas por 2 | **paneles** | ady. | avisos | Σ área / s² | 1.ª divergencia vs ×1 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 0,5 | 74 | 7 | 45 | 57 | 14 | 14 | 12 | 13 | 12 | 0 | 27 780,18 | E3 |
| 0,75 | 72 | 3 | 45 | 57 | 14 | 14 | 12 | **13** | 12 | 0 | 27 423,93 | E3 |
| 0,99 | 72 | 3 | 45 | 57 | 14 | 14 | 12 | 13 | 12 | 0 | 27 423,93 | E3 |
| 0,995 | 74 | 5 | 46 | 58 | 14 | 14 | 11 | 12 | 11 | 0 | 26 758,35 | E3 |
| 0,998 | 75 | 6 | 48 | 59 | 13 | 13 | 10 | 11 | 10 | 0 | 26 758,35 | E3 |
| 0,999 | 81 | 11 | 51 | 63 | 14 | 14 | 11 | 12 | 11 | 0 | 26 756,31 | E3 |
| **1,0** | 78 | 9 | 52 | 63 | 13 | 13 | 10 | **11** | 10 | 0 | 26 769,12 | — |
| 1,01 – 2 | 82 | 13 | 57 | 69 | 14 | 14 | 10 | 11 | 10 | 0 | 26 119,62 | E3 |

Área del contorno (polígono de anclas) = **27 450,24 mm²**; con curvas aplanadas = 27 593,51 mm². Ningún resultado del legacy la conserva; a ×0,5 la **supera** (27 780 > 27 450: área contada dos veces). **0 avisos** del validador a todas las escalas: la pérdida es siempre silenciosa.

### 3.2 Correspondencia de paneles con el oráculo (extracción original, normalizado a ×1)

Oráculo provisional: 13 caras, Σ = 27 593,190 mm² = contorno aplanado (diferencia < 1e-8 relativa); cada una de las 12 creases separa dos caras distintas. Casado por centroide (< 2 mm).

| oráculo | área | creases | legacy ×1 | legacy ×0,75 |
|---|---|---|---|---|
| O0 | 1 599,96 | 3 11 | P0 ΔA −19,90 | P0 ΔA −0,11 |
| O1 (lengüeta curva) | 391,37 | 3 | P1 ΔA −75,18 (KI-07) | P1 ΔA −75,18 (KI-07) |
| O2 | 4 787,65 | 5 6 11 | P7 ΔA +7,11 | P2 ΔA +17,13 |
| O3 | 4 800,16 | 6 7 9 10 | P2 ΔA 0,00 | P3 ΔA **−60,11** |
| **O4** | 665,71 | 10 | **perdido** | P4 ΔA 0,00 |
| O5 | 4 819,64 | 4 8 9 | P3 ΔA −19,90 | P5 ΔA +10,16 |
| O6 | 1 760,32 | 4 | P4 0,00 | P6 0,00 |
| O7 | 1 579,92 | 0 8 | P5 ΔA +19,90 | P7 ΔA +9,88 |
| O8 (lengüeta curva) | 391,47 | 0 | P6 ΔA −72,34 (KI-07) | P8 ΔA −72,34 (KI-07) |
| **O9** | 665,57 | 7 | **perdido** | P9 0,00 |
| O10 | 4 800,16 | 1 2 5 | P8 0,00 | P10 0,00 |
| O11 | 665,57 | 1 | P9 0,00 | P11 +1,00 |
| O12 | 665,67 | 2 | P10 +0,75 | P12 +1,00 |

`19,90 mm² = 0,4974 mm × 40 mm`: una franja entre dos líneas de crease escalonadas que el legacy asigna al panel vecino. Los ±75 mm² de las lengüetas son KI-07 (curvas ignoradas), invariantes en escala.

### 3.3 Primera divergencia (×0,75 frente a ×1,0)

- E1 y E2 idénticas. **E3 difiere**: a ×1 hay 12 segmentos troceados que no existen a ×0,75 y 6 al revés (detalle en `evidencia/ki22-etapas-ill-real-caja-botanica.txt`).
- Predicados que deciden distinto: los de longitud `0,5 < L < 0,667` mm (a ×0,75 quedan bajo 0,5; a ×1 no): **35** en `ill-real-caja-botanica` (L = 0,5005–0,5044) y **28** en `caja-botanica-real` (L = 0,5009–0,5010). Ejemplos: `contorno(257,108; 308,857) ↔ crease 6/7 (257,613; 308,857)` a 0,5044 mm; `crease 10 (257,613; 188,856) ↔ crease 11 (257,609; 188,355)` a 0,501 mm; aristas del propio contorno de 0,5009 mm (`(337,609; 188,856)–(337,108; 188,856)`).
- La divergencia arrastra a E4 (vértices 45 → 52), E5 (caras 14 → 13), E7 (creases compartidas por 2 paneles 12 → 10) y E8 (13 → 11).

### 3.4 Transiciones del barrido fino (601 escalas, ×0,2–×5)

10 transiciones en `ill-real-caja-botanica`, **10/10 explicadas** por la escala crítica de un predicado de la entrada (p. ej. 0,9893–0,9946 ⇐ `ptEq` L = 0,5044, s* = 0,99122; 0,9946–1,0 ⇐ L = 0,5010, s* = 0,998; 1,0–1,0054 ⇐ L = 0,4975, s* = 1,00506). En `caja-botanica-real` el patrón es el mismo (9 resultados distintos). En `ill-real-caja-simple` hay 2 transiciones: la de 0,648–0,651 la explica `pointOnSeg` sobre un vértice del hueco a **5 mm laterales** del borde superior (ver §4, D3); la de ≈0,383 la produce un punto creado por el propio troceado (no está en la entrada).

### 3.5 Otras propiedades medidas

- **Traslación** hasta 1e5 mm, **rotación** 1°/37°/90°/180° y **reflexión**: invariante en los 3 fixtures. **Traslación 1e7 mm: falla** (7 y 10 paneles): pérdida de precisión de coma flotante en áreas y centroides absolutos.
- **Permutaciones de entrada equivalente:** orden de las creases y sentido de cada crease: invariante. **Sentido del contorno invertido: cambia el resultado** (Caja Botánica ×1: 12 paneles en vez de 11; extracción original: 11 con 12,8 mm² menos). El sentido de un trazado en Illustrator es arbitrario ⇒ **no determinismo práctico** ante entradas equivalentes.
- **Caja simple sintética** (`ill-real-caja-simple`, sin nada cerca de 0,5 mm): también depende de la escala — por debajo de ×0,65 aparecen 3 paneles con área 11 350 mm² (esperado 6 000; la cara exterior se cuela). KI-22 no es exclusivo de la Caja Botánica.

## 4. Mecanismo (conclusiones demostradas)

| Id | Defecto | Demostración |
|---|---|---|
| **D1** | La tolerancia geométrica (0,5 mm) coincide con la escala de la geometría real del troquel. Ruido de coordenadas medido ν ≤ 0,005 mm; característica real más corta relevante ℓ ≈ 0,497 mm; el umbral cae dentro del cúmulo de ℓ, no en el hueco entre ν y ℓ. Dominio en el que ε = 0,5 separa ruido de geometría para este troquel: `ν·s < ε < ℓ·s` ⇒ **1,005 < s < 100**; el tamaño real (×1) queda **fuera por un 0,5 %** (las características de 0,4974 mm se fusionan) y todo ×0,75 queda fuera (se fusionan además las de 0,5009–0,5044) | §3.3, §3.4: cada transición = un predicado que cruza 0,5 mm |
| **D2** | Adyacencia estricta (`buildAdjacencyStrict`: crease cruda completa contra arista completa del panel) + filtro de conectividad que descarta en silencio todo lo que no está en la mayor componente (KI-04 a) | Sombra con ε ≤ 0,02: invariante pero 11 paneles y sin conservar área (`experimento-tolerancias`) |
| **D3** | `pointOnSeg` no mide distancia lateral: usa `d1 + d2 − len < ε`. Para un punto a distancia lateral h en el parámetro t de un segmento de longitud len, `d1 + d2 − len ≈ h² / (2 t (1−t) len)`, así que el alcance lateral es `h_max ≈ √(2 t (1−t) · len · ε)`: crece con la longitud del segmento (5 mm para len = 100 mm, t = ½). Es KI-18 explicado | Caja simple: vértice del hueco a 5 mm del borde «sobre» el borde a s < 0,648 |
| **D4** | Fusión de vértices `getVid` por primer candidato a < ε (no transitiva, dependiente del orden) y troceado iterativo con `splice` dependiente del orden | Sentido del contorno invertido ⇒ otro resultado |
| **D5** | Filtros silenciosos: área ≤ 1, < 4 mm², delgadez > 30:1 con < 120 mm², duplicados por clave `toFixed(2)`, centroide fuera de cáscara/en hueco; 0 avisos | `porMotivo` en E6; ninguno se reporta a la UI |
| **D6** | Precisión absoluta: áreas y centroides con coordenadas absolutas (sin origen local) | Traslación 1e7 ⇒ resultados distintos |

D1 y D2 explican KI-22 en la Caja Botánica; D3–D6 son defectos del mismo motor que el contrato de F2 debe cubrir.

## 5. Hipótesis y lo que NO está demostrado

| Afirmación | Estado |
|---|---|
| Los escalones de ≈ 0,5 mm del contorno y de las creases son **intencionales** (compensación de espesor de cartón entre paneles) | [INFERENCIA] coherente con la geometría (aparecen en pares consistentes y en ambos lados de cada solapa). **Debe confirmarlo el usuario** (decisión DP-1) |
| El conteo correcto de la Caja Botánica es **13** | [CONFIRMADO por 3 fuentes independientes del legacy]: oráculo de arreglo plano exacto con conservación de área, prueba de `tesseract-web` (`topology.test.ts`: 13 paneles y 12 creases usadas sobre la misma extracción) y legacy a ×0,75 (conteo). **Falta la verificación humana** que exige el Plan maestro §5 (1) |
| El ruido de coordenadas está acotado por ≈ 0,005 mm | [MEDIDO] solo en 2 extracciones de un troquel (SVG reabierto: 0,0025–0,005 mm; extracción original: 0). Generalizarlo exige el corpus |
| La característica real más corta es ≈ 0,5 mm | [MEDIDO] solo en la Caja Botánica (sin contar aristas de longitud 0 y una arista curva de 0,0035 mm del contorno, que son artefactos de trazado). Otros troqueles pueden tener detalles más finos (perforaciones, muescas): pendiente del corpus |
| KI-02 (triángulos degenerados en el GLB) procede de vértices colineales/duplicados que el legacy deja en los paneles | [NO VERIFICADO]; hipótesis para F2A-6 |

## 6. Correcciones a documentos anteriores

- `docs/fase0/08_DECISIONES_D1_D8.md` (D4, contexto): «Illustrator produce creases con extremos a ~0.375 mm de donde deberían tocarse». **No se sostiene**: con la extracción a ×1 las creases tocan el corte (0,0000 mm) o quedan a ≤ 0,005 mm. Los «0,375 mm» eran los escalones de 0,5 mm del diseño vistos a ×0,75. El fixture sintético `t-desalineada-0.375` («caso Illustrator») hereda la misma lectura.
- `KNOWN_ISSUES.md` KI-04 (b): los «8 pares de extremos a 0,497–0,501 mm» no son extremos que «deberían unirse»: son creases paralelas escalonadas (C8 a y = 309,355 frente a C7/C4/C9 a 308,857; C11 a 188,355 frente a C2/C10 a 188,856). Fusionarlos desplaza franjas de 0,5 × 40 mm entre paneles.
- `NIVEL0_INFORME.md` §3.2: «×0,50…×0,99 ⇒ 13; ×1,00…×2,00 ⇒ 11». Con malla fina: 0,995 ⇒ 12, 0,999 ⇒ 12 y «11» abarca al menos 3 geometrías distintas.

Propuesta: anotar estas correcciones en los documentos afectados **cuando el usuario apruebe F2.0** (no se han editado; ver `08_INCERTIDUMBRES…` C-1…C-3).
