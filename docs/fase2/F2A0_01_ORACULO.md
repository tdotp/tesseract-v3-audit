# F2A-0 · 01 — Oráculo geométrico independiente

Código: `tests/lib/f2/racional.mjs` (aritmética exacta) y `tests/lib/f2/oraculo.mjs` (oráculo). Solo pruebas: ni `src/` ni el bundle lo importan.

## 1. Qué calcula

Dado un `Dieline` (DielineV1, mm), devuelve los paneles del troquel **tal como está dibujado**: cada región de material delimitada por cortes y creases, con su polígono, su área exacta, las creases que la separan de sus vecinas, las adyacencias (pareja de paneles + creases + longitud compartida), la asignación de cada tramo de cada crease (`separa`, `colgante`, `sobre-corte`, `fuera`, `borde`), las componentes conexas, la conservación de área y una lista de diagnósticos.

## 2. Etapas

| Etapa | Qué hace | Decisiones con tolerancia |
|---|---|---|
| 0 · Entrada exacta | Cada double se convierte a su valor binario exacto (m·2^e, BigInt). Curvas: como cuerdas entre anclas (igual que el legacy) o muestreadas en t = k/N con puntos **exactos** | Ninguna |
| 1 · Ajuste tipado (opcional) | Solo con `eps` explícito (DP-3: **experimental**, 0,05 en las pruebas). B) agrupa puntos de crease a ≤ ε (vértices interiores y extremos que ya tocan un corte son anclas); A) el grupo sin ancla va a su media exacta y, si está a distancia **lateral** ≤ ε de un corte, se proyecta sobre él; C) extremos aún libres se proyectan sobre otra crease (T con ruido), iterando hasta el punto fijo. Banda (ε, ρ·ε] ⇒ diagnóstico `banda-ambigua` sin mover; otro candidato a > ε del elegido ⇒ `ambiguo` | La única etapa con tolerancia; nunca mueve contorno, huecos ni cortes (hash comprobado: `contornoIntacto`) |
| 2 · Arreglo plano | Todas las parejas de segmentos: cruces, T y solapes colineales con parámetros racionales; aristas atómicas con etiquetas de origen (`B`, `H<k>`, `K<j>`, `C<i>`) | Ninguna: identidad de vértices por igualdad exacta |
| 3 · Ciclos | Semiaristas ordenadas por ángulo con comparación exacta (semiplano + producto vectorial, sin `atan2`); recorrido estándar de caras | Ninguna |
| 4 · Regiones | El ciclo exterior de cada componente se une a la cara que la contiene (punto en polígono exacto) o a la región no acotada; **paridad par-impar** por BFS: cruzar una arista con k etiquetas de contorno cerrado cambia la paridad k veces | Ninguna |
| 5 · Paneles | Regiones acotadas de paridad impar; área neta (menos islas); tramos de crease; adyacencias; componentes; diagnóstico `astilla` si 2A/P < ε (sin descartar) | Solo el diagnóstico de astilla usa ε |

Comprobaciones internas: Euler por componente (`V − E + ciclos = 2·C`), coherencia de la paridad, conservación **exacta** frente al área par-impar calculada **sin** el arreglo (contornos anidados).

## 3. Independencia (respecto del legacy y del motor web)

| Aspecto | Legacy | Motor web | Oráculo |
|---|---|---|---|
| Código compartido | — | — | Ninguno: no importa `src/` ni `tesseract-web` (lo comprueba `f2-oraculo` «independencia»; sus únicos imports son `./racional.mjs`) |
| Aritmética | double | double | racional exacta (BigInt) |
| Intersecciones | iterativo, `pointOnSeg` por suma de distancias, 0,5 mm | todas las parejas, ε 1e-9 | todas las parejas, exacto |
| Identidad de vértices | primer vértice a < 0,5 mm | 1e-6 mm | igualdad exacta |
| Orden angular | `atan2` | `atan2` | comparación exacta |
| Clasificación de caras | centroide en cáscara/hueco | centroide en el contorno | paridad par-impar por adyacencia de regiones |
| Adyacencia | creases crudas contra aristas completas | aristas del grafo | aristas del arreglo |
| Filtros | área, delgadez, duplicados, conectividad (silenciosos) | ninguno; lanza | ninguno; diagnósticos |
| Tolerancias | 0,5 mm en todo | 0,500001 (snap) | solo el ajuste opcional declarado |

**Lo que sí comparte con los motores:** el recorrido de caras «siguiente = anterior en orden angular» es el algoritmo de libro (de Berg et al., DCEL), no código heredado; y la representación de curvas como anclas (opción por defecto) coincide con la del legacy para que la comparación sea a igual representación (las muestras exactas son otra opción).

## 4. Garantías y lo que no garantiza

- **Garantiza (por construcción):** con la misma entrada exacta, el arreglo es el arreglo plano matemático de los segmentos dados; las áreas y la conservación son exactas; el resultado no depende del orden de entrada, del sentido de los trazados, del vértice inicial ni de transformaciones exactas (lo verifican `f2-metamorficas` y `f2-oraculo`).
- **No garantiza:** la **intención** del diseñador (¿una crease a 0,375 mm de una T debe unirse?, ¿una crease paralela a un corte a 0,004 mm «es» el corte?): el oráculo informa la geometría dibujada y lo marca (ver `F2A0_04_AMBIGUEDADES.md`). Con ruido de coordenadas, el resultado depende del ajuste declarado (ε experimental); sin él, el arreglo exacto deja colgantes las uniones con ruido (lo que muestra la prueba «fuera de dominio»).
- **Rendimiento:** ≈ 20 ms sin ajuste y ≈ 150 ms con ajuste para la Caja Botánica (BigInt); válido como oráculo de pruebas, **no** como motor de producto (criterio 5 del Plan §5).
