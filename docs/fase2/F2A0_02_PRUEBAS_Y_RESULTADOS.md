# F2A-0 · 02 — Fixtures, pruebas y resultados

## 1. Separación de pruebas

| Archivo | Qué establece | Casos |
|---|---|---|
| `tests/node/f2-oraculo.test.mjs` | **Esperado de F2** — independencia, aritmética exacta, 22 sintéticos analíticos (18 «esperado-F2» + 4 «indeterminado»), discretización, controles negativos | 31 |
| `tests/node/f2-caja-botanica.test.mjs` | **Esperado de F2** — 13 paneles candidatos (DP-2) en 3 extracciones, golden del oráculo, meseta de ε, límites de dominio, correspondencia | 10 |
| `tests/node/f2-metamorficas.test.mjs` | **Esperado de F2** — escala, traslación, rotación, reflexión (exactas y en double), permutaciones, repetición | 38 |
| `tests/node/f2-legacy-historico.test.mjs` | **HISTÓRICO** — describe defectos del legacy frente al oráculo (KI-04/05/06/18/19/22/31/32/33); no define lo esperado | 16 |

Las pruebas de F1 no se han tocado (568 → 663 pruebas Node; ninguna previa cambia). Golden nuevo: `tests/golden/f2-caja-botanica.golden.json` (generado **desde el oráculo** por `tests/tools/make-f2-golden.mjs`, con el SHA-256 de cada fixture fuente). Ningún golden ni huella histórica cambia.

## 2. Fixtures (reproducibles)

- **Reales** (sin cambios, congelados por `fixtures.pins.json` o por el golden de Nivel 0): `caja-botanica-real`, `ill-real-caja-botanica`, `caja-botanica-illustrator-export` (×0,75), `ill-real-caja-simple`.
- **Sintéticos F2** (`tests/lib/f2/fixtures-f2.mjs`, deterministas, coordenadas exactas en binario; ruido = 1/256 mm, detalle = 510/1024 mm): `x-cruz`, `rejilla-4x4`, `t-exacta`, `t-ruido`, `t-ruido-sin-ajuste`, `t-desalineada-0.375`*, `crease-corta-ruido`, `crease-corta-banda`*, `crease-corta-0.6`*, `crease-sobresale-0.3`, `crease-sobre-corte`, `crease-paralela-ruido`*, `escalon-crease`, `escalon-contorno`, `contorno-longitud-cero`, `hueco-centrado`, `hueco-descentrado`, `corte-abierto-divide`, `corte-abierto-parcial`, `panel-pequeno-1.5mm2`, `panel-delgado-40x1`, `esquinas-redondeadas-anclas` (* = indeterminado). Cubren las familias pedidas: casi coincidentes, T, huecos, detalles de 0,5 mm, conectividad, conservación y discretización.

## 3. Resultados del oráculo sobre la Caja Botánica [MEDIDO]

| Extracción | ε | Paneles | Área | Adyacencias | Creases que separan una pareja | Ajustes | Ambigüedades |
|---|---|---|---|---|---|---|---|
| `caja-botanica-real` (original del plugin) | **ninguno** | **13** | exacta (27 449,924319 mm², anclas) | 12 | 12/12 | 0 | 0 |
| `ill-real-caja-botanica` (Illustrator real) | 0,05 | 13 | exacta | 12 | 12/12 | 19 (≤ 0,005 mm) | 0 |
| `caja-botanica-illustrator-export` (×0,75) | 0,05 | 13 | exacta | 12 | 12/12 | 18 | 0 |

- Los 13 paneles se identifican por el conjunto de creases que los separan: `C0`, `C0 C8`, `C1`, `C1 C2 C5`, `C10`, `C2`, `C3`, `C3 C11`, `C4`, `C4 C8 C9`, `C5 C6 C11`, `C6 C7 C9 C10`, `C7`. Cada crease une exactamente la pareja esperada (tabla `ADY` de la prueba y matriz `evidencia/f2a0-matriz-correspondencia.md`).
- **Meseta de ε:** original idéntico para ε ∈ {0, 1e-6, 0,001, 0,01, 0,05, 0,1}; Illustrator real idéntico para ε ∈ {0,01, 0,05, 0,1}; con ε = 0,3 aparecen avisos de ambigüedad (ρ·ε = 0,9 alcanza los detalles de 0,5 mm); con ε = 0,001 < ruido no se cierran las uniones (resultado distinto, **con el área conservada**: el área sola no basta).
- **Original frente a Illustrator real:** misma topología; diferencias de área por panel de −0,158 a +0,229 mm², todas dentro de la cota ν·perímetro (ν = 0,005) ⇒ **representación**.
- **Histórico ×0,75:** misma topología tras reetiquetar sus creases por geometría (otro orden de lectura del SVG y Y invertida).
- **Detalles de 0,5 mm (DP-1):** se conservan; en la extracción original C7 y C10 recorren 0,501 mm sobre el corte; ningún vértice del contorno se mueve.

## 4. Metamórficas [MEDIDO, `f2-metamorficas`]

| Transformación | Exacta (racional) | En double |
|---|---|---|
| Escala ×1/2, ×3/4, ×2, ×3 (Illustrator real) y ×1/2…×10 (original) | topología idéntica, A' = s²·A **exacta** | ×0,75 y ×1,37: topología idéntica, \|ΔA/s² − A\| ≤ 1e-6 mm² |
| Escala fuera de dominio (Illustrator real ×1/4) | el oráculo **avisa** (banda ambigua), no cambia en silencio | — |
| Traslación (1000, −5000) y (1e7, 1e7) | idéntica (también 1e7: el legacy falla, KI-32) | +1e5: idéntica |
| Rotación 90°, 180°, pitagórica 53,13° | idéntica | 37° y 1°: idéntica con ajuste; **sin ajuste**, 37° separa incidencias exactas (≈ 1e-14 mm) y la topología cambia — con ε ≥ 1e-6 se recupera (redondeo = representación) |
| Reflexión en X | idéntica | — |
| Creases en orden inverso, cada crease invertida, contorno invertido, inicio desplazado | **idéntico** (el legacy cambia con el contorno invertido, KI-31) | — |
| Caja simple ×1/4…×4 | siempre 2 paneles y 5 900·s² netos (el legacy cambia por debajo de ×0,65, KI-33) | — |

## 5. Comparación con el legacy (HISTÓRICO, matriz completa en `evidencia/f2a0-matriz-correspondencia.md`)

| | Original ×1 | Illustrator real ×1 | Original ×0,75 |
|---|---|---|---|
| Paneles del legacy | 11 | 11 | 13 |
| Perdidos/fusionados frente al oráculo | `C10`, `C7` | `C0` fusionado con `C0 C8`, `C7` | ninguno |
| Bordes desplazados (geometría) | 3 de ±19,90 mm² (franja 0,4974 × 40) y menores | varios, hasta −29,57 mm² | varios, hasta −60,11 mm² normalizado |
| Adyacencias que faltan | 2 | 2 | 0 |

El legacy a ×1 pierde **paneles distintos** según la extracción, y a ×0,75 acierta el conteo con bordes equivocados.
