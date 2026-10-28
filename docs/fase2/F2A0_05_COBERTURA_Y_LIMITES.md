# F2A-0 · 05 — Cobertura y límites de los oráculos

## 1. Qué detecta cada oráculo (y qué no)

| Oráculo | Detecta | No detecta | Evidencia de sensibilidad |
|---|---|---|---|
| **Conservación exacta de área** (Σ paneles = área par-impar calculada sin el arreglo) | Material perdido, duplicado, cara exterior colada (KI-09), filtros silenciosos | Fusión de paneles, crease colgante: el oráculo con ε = 0,001 conserva el área con un resultado incorrecto | `f2-caja-botanica` «fuera de dominio», `f2-oraculo` control «un panel menos en la T» |
| **Creases efectivas** (cada crease separa una pareja de paneles; tramos colgantes = 0) | Fusiones de paneles, uniones abiertas, creases que no cortan | Una crease mal unida que separa los paneles equivocados (lo cubre la asignación esperada) | `f2-oraculo` «sin tolerancias ocultas» (perturbación de 1e-12 detectada) |
| **Asignación esperada** (tabla `ADY` de la Caja Botánica) | Paneles equivocados a ambos lados de una crease | Errores en troqueles sin tabla verificada | `f2-caja-botanica` |
| **Euler y paridad** | Grafo mal construido, clasificación incoherente | Errores coherentes (un grafo válido pero distinto) | Comprobación interna en cada ejecución |
| **Contorno intacto** (hash) | Cualquier movimiento del contorno/huecos/cortes | — | `f2-oraculo` control «a ε de un vértice del contorno» |
| **Metamórficas** | Dependencia de la representación (orden, sentido, origen, rotación, escala en dominio) | Errores invariantes (un resultado igualmente erróneo en todas las transformaciones) | 38 casos; el legacy falla 3 familias (KI-22, KI-31, KI-32) |
| **Valores analíticos** (sintéticos) | Cualquier desviación en geometrías simples | Problemas que solo aparecen en troqueles complejos | 22 casos con áreas exactas |
| **Golden del oráculo** | Cambios del propio oráculo | Errores ya presentes al generarlo | `f2-caja-botanica` (golden) |
| **Conteo verificado por una persona** | Intención de diseño | — | **Pendiente** (A-2) |

## 2. Cobertura de los requisitos de F2A-0

| Requisito | Estado |
|---|---|
| 1. Oráculo independiente y documentado | Hecho (`F2A0_01`); independencia comprobada por prueba |
| 2. 13 paneles candidatos con correspondencia individual | Hecho: firma por panel, tabla de adyacencias y matriz (`evidencia/f2a0-matriz-correspondencia.md`) |
| 3. Área, componentes, adyacencias, asignación de creases | Hecho (exacto) |
| 4. Metamórficas (escala, traslación, rotación, reflexión, inversión, permutación) | Hecho (38) |
| 5. Sintéticos: casi coincidentes, T, huecos, detalles de 0,5 mm | Hecho (22) |
| 6. Topología frente a representación/discretización | Hecho (`F2A0_03`, `comparar.mjs`) |
| 7. Casos indeterminados | Hecho (`F2A0_04`, A-1…A-12) |
| 8. Separación histórico/esperado | Hecho (archivo `f2-legacy-historico` aparte, con prefijo HISTÓRICO) |

## 3. Límites

1. **Un solo troquel real** (tres extracciones). ν = 0,005 y ℓ = 0,4974 mm siguen medidos solo aquí (U-1 de F2.0).
2. **El oráculo con ruido depende del ajuste declarado** (ε experimental). Sin ruido (extracción original) no necesita ninguno: es el caso más fuerte.
3. **Intención de diseño** no observable (A-1, A-3, A-6).
4. **Cortes abiertos y huecos cruzados** solo en sintéticos.
5. **Curvas:** la referencia es la representación elegida (anclas o muestras), no la curva continua; el área exacta de la Bézier por la fórmula de Green no está implementada (la integración fina se usa solo como cota en una prueba).
6. **Rendimiento:** el oráculo no es apto como motor (≈ 150 ms con ajuste frente a ≈ 3 ms del legacy).
7. **Plegado 3D, signos de pliegue y base**: fuera del alcance (DP-6); el oráculo termina en el grafo de paneles.
8. **Contornos que se cruzan entre sí:** la conservación los marca (`contornosCruzados`) pero no está probado con un caso.
