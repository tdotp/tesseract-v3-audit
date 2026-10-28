# F2A-2 · Comparación con el legacy (generado por `tools/f2/comparar-legacy-plegado.mjs`)

| Caso | ¿Legacy acierta? | KI | Legacy | Adaptador | Oráculo | Topología | Geometría | Representación | Esperadas (corrigen) | Errores del adaptador |
|---|---|---|---|---|---|---|---|---|---|---|
| x-cruz | no | KI-09 | 5 p · 12 ady · 0 pl | 4 p · 4 ady | 4 | 4 | 0 | 1 | 4 | 0 |
| rejilla-4x4 | sí | — | 16 p · 24 ady · 15 pl | 16 p · 24 ady | 16 | 0 | 0 | 2 | 0 | 0 |
| t-exacta | no | KI-04 | 2 p · 1 ady · 1 pl | 3 p · 3 ady | 3 | 4 | 0 | 2 | 4 | 0 |
| t-ruido | no | KI-04 | 2 p · 1 ady · 1 pl | 3 p · 3 ady | 3 | 4 | 2 | 2 | 6 | 0 |
| t-ruido-sin-ajuste | no | A-7 | 2 p · 1 ady · 1 pl | 2 p · 1 ady | 2 | 6 | 0 | 0 | 6 | 0 |
| t-desalineada-0.375 | no | A-3 | 2 p · 1 ady · 1 pl | 2 p · 1 ady | 2 | 6 | 0 | 0 | 6 | 0 |
| crease-corta-ruido | no | KI-17 | 2 p · 1 ady · 1 pl | 2 p · 1 ady | 2 | 0 | 2 | 1 | 2 | 0 |
| crease-corta-banda | no | A-4 KI-17 | 2 p · 1 ady · 1 pl | 1 p · 0 ady | 1 | 3 | 0 | 1 | 3 | 0 |
| crease-corta-0.6 | no | A-5 KI-17 | 2 p · 1 ady · 1 pl | 1 p · 0 ady | 1 | 3 | 0 | 1 | 3 | 0 |
| crease-sobresale-0.3 | no | — | 2 p · 1 ady · 1 pl | 2 p · 1 ady | 2 | 0 | 0 | 1 | 0 | 0 |
| crease-sobre-corte | no | — | 2 p · 1 ady · 1 pl | 2 p · 1 ady | 2 | 0 | 0 | 1 | 0 | 0 |
| crease-paralela-ruido | no | A-6 | 1 p · 0 ady · 0 pl | 2 p · 1 ady | 2 | 5 | 0 | 0 | 5 | 0 |
| escalon-crease | no | A-1 | 2 p · 2 ady · 1 pl | 2 p · 0 ady | 2 | 1 | 3 | 1 | 4 | 0 |
| escalon-contorno | no | A-1 | 2 p · 1 ady · 1 pl | 2 p · 1 ady | 2 | 0 | 1 | 0 | 1 | 0 |
| contorno-longitud-cero | no | — | 2 p · 1 ady · 1 pl | 2 p · 1 ady | 2 | 0 | 0 | 1 | 0 | 0 |
| hueco-centrado | no | KI-05 | 2 p · 0 ady · 0 pl | 2 p · 1 ady | 2 | 4 | 0 | 0 | 4 | 0 |
| hueco-descentrado | no | KI-06 | 2 p · 1 ady · 1 pl | 2 p · 1 ady | 2 | 0 | 0 | 1 | 0 | 0 |
| corte-abierto-divide | no | A-9 | 1 p · 0 ady · 0 pl | 2 p · 0 ady | 2 | 4 | 0 | 0 | 4 | 0 |
| corte-abierto-parcial | no | A-9 | 1 p · 0 ady · 0 pl | 1 p · 0 ady | 1 | 0 | 0 | 0 | 0 | 0 |
| panel-pequeno-1.5mm2 | no | KI-19 | 2 p · 0 ady · 0 pl | 2 p · 1 ady | 2 | 4 | 0 | 0 | 4 | 0 |
| panel-delgado-40x1 | no | KI-19 | 2 p · 0 ady · 0 pl | 2 p · 1 ady | 2 | 4 | 0 | 0 | 4 | 0 |
| esquinas-redondeadas-anclas | no | A-10 KI-07 | 2 p · 1 ady · 1 pl | 2 p · 1 ady | 2 | 0 | 0 | 1 | 0 | 0 |
| caja-botanica-real | no | KI-22 KI-04 | 11 p · 10 ady · 10 pl | 13 p · 12 ady | 13 | 5 | 6 | 2 | 11 | 0 |
| ill-real-caja-botanica ε 0.05 | no | KI-22 KI-04 | 11 p · 10 ady · 10 pl | 13 p · 12 ady | 13 | 8 | 10 | 2 | 18 | 0 |
| histórico ×0.75 ε 0.05 | no | KI-22 | 13 p · 12 ady · 12 pl | 13 p · 12 ady | 13 | 0 | 11 | 2 | 11 | 0 |
| ill-real-caja-simple | sí | KI-06 | 2 p · 1 ady · 1 pl | 2 p · 1 ady | 2 | 0 | 0 | 0 | 0 | 0 |
| ill-real-compuesto | no | — | 2 p · 1 ady · 1 pl | 2 p · 1 ady | 2 | 0 | 0 | 0 | 0 | 0 |
| ill-real-curvas | no | A-10 KI-07 | 2 p · 1 ady · 1 pl | 2 p · 1 ady | 2 | 0 | 0 | 0 | 0 | 0 |
| panel no convexo envolvente | no | KI-36 (propuesto): signo por centroide | 2 p · 0 ady · 0 pl | 2 p · 1 ady | 2 | 3 | 0 | 1 | 3 | 0 |
| rejilla 2×2 | sí | — | 4 p · 4 ady · 3 pl | 4 p · 4 ady | 4 | 0 | 0 | 1 | 0 | 0 |
| rejilla 6×6 | sí | — | 36 p · 60 ady · 35 pl | 36 p · 60 ady | 36 | 0 | 0 | 2 | 0 | 0 |
| rejilla 8×8 | sí | — | 64 p · 112 ady · 63 pl | 64 p · 112 ady | 64 | 0 | 0 | 2 | 0 | 0 |
| rejilla 3×3 líneas completas | no | KI-09 | 10 p · 60 ady · 0 pl | 9 p · 12 ady | 9 | 24 | 0 | 1 | 24 | 0 |
| rejilla 4×4 densa | sí | — | 16 p · 24 ady · 15 pl | 16 p · 24 ady | 16 | 0 | 0 | 1 | 0 | 0 |

## Detalle de cada diferencia

### x-cruz

- **topología** · corrige (adaptador = oráculo): cara P1 del legacy (3200.000 mm²) cubre 4 paneles: fusión o cara exterior colada — y es la BASE por defecto del legacy
- **topología** · corrige (adaptador = oráculo): adyacencia C0 C1#0⟷C0 C1#3 del legacy no existe en el adaptador
- **topología** · corrige (adaptador = oráculo): adyacencia C0 C1#1⟷C0 C1#2 del legacy no existe en el adaptador
- **representación**: 12 AdjacencyEdge del legacy (una por segmento de crease) frente a 4 (una por pareja plegable)
- **topología** · corrige (adaptador = oráculo): el árbol del legacy parte de una cara que no es un panel (0 pliegues): no comparable
- legacy buildFoldTree sobre el modelo v1 del adaptador: {"aristas":3,"mismosNiveles":true,"mismasAristas":false} · computeFoldSign (centroide) frente al signo del adaptador: {"convexosIguales":3,"convexosDistintos":0,"noConvexosDistintos":0,"noConvexos":0} · buildAdjacency del legacy sobre el modelo: 12

### rejilla-4x4

- **representación**: base por defecto distinta: legacy C0 C3 C8#0 frente a C0 C1#0 (empate de área o panel perdido)
- **representación**: 3 aristas con otro padre en un empate BFS (mismos niveles)
- legacy buildFoldTree sobre el modelo v1 del adaptador: {"aristas":15,"mismosNiveles":true,"mismasAristas":false} · computeFoldSign (centroide) frente al signo del adaptador: {"convexosIguales":15,"convexosDistintos":0,"noConvexosDistintos":0,"noConvexos":0} · buildAdjacency del legacy sobre el modelo: 24

### t-exacta

- **topología** · corrige (adaptador = oráculo): panel C0#0 (1600.000 mm²) perdido en el legacy
- **topología** · corrige (adaptador = oráculo): adyacencia C0 C1#0⟷C0#0 ausente en el legacy
- **topología** · corrige (adaptador = oráculo): adyacencia C0 C1#1⟷C0#0 ausente en el legacy
- **representación**: 1 AdjacencyEdge del legacy (una por segmento de crease) frente a 3 (una por pareja plegable)
- **topología** · corrige (adaptador = oráculo): base por defecto distinta: legacy C0 C1#0 frente a C0#0 (empate de área o panel perdido)
- **representación**: 1 aristas con otro padre en un empate BFS (mismos niveles)
- legacy buildFoldTree sobre el modelo v1 del adaptador: {"aristas":2,"mismosNiveles":true,"mismasAristas":true} · computeFoldSign (centroide) frente al signo del adaptador: {"convexosIguales":2,"convexosDistintos":0,"noConvexosDistintos":0,"noConvexos":0} · buildAdjacency del legacy sobre el modelo: 1

### t-ruido

- **geometría** · corrige (adaptador = oráculo): panel C0 C1#0: ΔA bruta -3.91e-2 mm², Δcentroide 9.90e-4 mm
- **geometría** · corrige (adaptador = oráculo): panel C0 C1#1: ΔA bruta -3.91e-2 mm², Δcentroide 9.90e-4 mm
- **topología** · corrige (adaptador = oráculo): panel C0#0 (1600.000 mm²) perdido en el legacy
- **topología** · corrige (adaptador = oráculo): adyacencia C0 C1#0⟷C0#0 ausente en el legacy
- **topología** · corrige (adaptador = oráculo): adyacencia C0 C1#1⟷C0#0 ausente en el legacy
- **representación**: 1 AdjacencyEdge del legacy (una por segmento de crease) frente a 3 (una por pareja plegable)
- **topología** · corrige (adaptador = oráculo): base por defecto distinta: legacy C0 C1#0 frente a C0#0 (empate de área o panel perdido)
- **representación**: 1 aristas con otro padre en un empate BFS (mismos niveles)
- legacy buildFoldTree sobre el modelo v1 del adaptador: {"aristas":2,"mismosNiveles":true,"mismasAristas":true} · computeFoldSign (centroide) frente al signo del adaptador: {"convexosIguales":2,"convexosDistintos":0,"noConvexosDistintos":0,"noConvexos":0} · buildAdjacency del legacy sobre el modelo: 1

### t-ruido-sin-ajuste

- **topología** · corrige (adaptador = oráculo): panel C0#0 (1600.000 mm²) perdido en el legacy
- **topología** · corrige (adaptador = oráculo): panel C0#1 dividido en 2 por el legacy
- **topología** · corrige (adaptador = oráculo): adyacencia C0#0⟷C0#1 ausente en el legacy
- **topología** · corrige (adaptador = oráculo): adyacencia C0#1⟷C0#1 del legacy no existe en el adaptador
- **topología** · corrige (adaptador = oráculo): base por defecto distinta: legacy C0#1 frente a C0#0 (empate de área o panel perdido)
- **topología** · corrige (adaptador = oráculo): niveles del árbol distintos (paneles alcanzados o distancia a la base)
- legacy buildFoldTree sobre el modelo v1 del adaptador: {"aristas":1,"mismosNiveles":true,"mismasAristas":true} · computeFoldSign (centroide) frente al signo del adaptador: {"convexosIguales":1,"convexosDistintos":0,"noConvexosDistintos":0,"noConvexos":0} · buildAdjacency del legacy sobre el modelo: 1

### t-desalineada-0.375

- **topología** · corrige (adaptador = oráculo): panel C0#0 (1600.000 mm²) perdido en el legacy
- **topología** · corrige (adaptador = oráculo): panel C0#1 dividido en 2 por el legacy
- **topología** · corrige (adaptador = oráculo): adyacencia C0#0⟷C0#1 ausente en el legacy
- **topología** · corrige (adaptador = oráculo): adyacencia C0#1⟷C0#1 del legacy no existe en el adaptador
- **topología** · corrige (adaptador = oráculo): base por defecto distinta: legacy C0#1 frente a C0#0 (empate de área o panel perdido)
- **topología** · corrige (adaptador = oráculo): niveles del árbol distintos (paneles alcanzados o distancia a la base)
- legacy buildFoldTree sobre el modelo v1 del adaptador: {"aristas":1,"mismosNiveles":true,"mismasAristas":true} · computeFoldSign (centroide) frente al signo del adaptador: {"convexosIguales":1,"convexosDistintos":0,"noConvexosDistintos":0,"noConvexos":0} · buildAdjacency del legacy sobre el modelo: 1

### crease-corta-ruido

- **geometría** · corrige (adaptador = oráculo): panel C0#0: ΔA bruta -1.56e-1 mm², Δcentroide 6.51e-4 mm
- **geometría** · corrige (adaptador = oráculo): panel C0#1: ΔA bruta -1.56e-1 mm², Δcentroide 6.51e-4 mm
- **representación**: base por defecto distinta: legacy C0#1 frente a C0#0 (empate de área o panel perdido)
- legacy buildFoldTree sobre el modelo v1 del adaptador: {"aristas":1,"mismosNiveles":true,"mismasAristas":true} · computeFoldSign (centroide) frente al signo del adaptador: {"convexosIguales":1,"convexosDistintos":0,"noConvexosDistintos":0,"noConvexos":0} · buildAdjacency del legacy sobre el modelo: 1

### crease-corta-banda

- **topología** · corrige (adaptador = oráculo): panel #0 dividido en 2 por el legacy
- **topología** · corrige (adaptador = oráculo): adyacencia #0⟷#0 del legacy no existe en el adaptador
- **representación**: 1 AdjacencyEdge del legacy (una por segmento de crease) frente a 0 (una por pareja plegable)
- **topología** · corrige (adaptador = oráculo): niveles del árbol distintos (paneles alcanzados o distancia a la base)
- legacy buildFoldTree sobre el modelo v1 del adaptador: {"aristas":0,"mismosNiveles":true,"mismasAristas":true} · computeFoldSign (centroide) frente al signo del adaptador: {"convexosIguales":0,"convexosDistintos":0,"noConvexosDistintos":0,"noConvexos":0} · buildAdjacency del legacy sobre el modelo: 0

### crease-corta-0.6

- **topología** · corrige (adaptador = oráculo): panel #0 dividido en 2 por el legacy
- **topología** · corrige (adaptador = oráculo): adyacencia #0⟷#0 del legacy no existe en el adaptador
- **representación**: 1 AdjacencyEdge del legacy (una por segmento de crease) frente a 0 (una por pareja plegable)
- **topología** · corrige (adaptador = oráculo): niveles del árbol distintos (paneles alcanzados o distancia a la base)
- legacy buildFoldTree sobre el modelo v1 del adaptador: {"aristas":0,"mismosNiveles":true,"mismasAristas":true} · computeFoldSign (centroide) frente al signo del adaptador: {"convexosIguales":0,"convexosDistintos":0,"noConvexosDistintos":0,"noConvexos":0} · buildAdjacency del legacy sobre el modelo: 0

### crease-sobresale-0.3

- **representación**: base por defecto distinta: legacy C0#1 frente a C0#0 (empate de área o panel perdido)
- legacy buildFoldTree sobre el modelo v1 del adaptador: {"aristas":1,"mismosNiveles":true,"mismasAristas":true} · computeFoldSign (centroide) frente al signo del adaptador: {"convexosIguales":1,"convexosDistintos":0,"noConvexosDistintos":0,"noConvexos":0} · buildAdjacency del legacy sobre el modelo: 1

### crease-sobre-corte

- **representación**: base por defecto distinta: legacy C0#1 frente a C0#0 (empate de área o panel perdido)
- legacy buildFoldTree sobre el modelo v1 del adaptador: {"aristas":1,"mismosNiveles":true,"mismasAristas":true} · computeFoldSign (centroide) frente al signo del adaptador: {"convexosIguales":1,"convexosDistintos":0,"noConvexosDistintos":0,"noConvexos":0} · buildAdjacency del legacy sobre el modelo: 1

### crease-paralela-ruido

- **topología** · corrige (adaptador = oráculo): cara P0 del legacy (3200.000 mm²) cubre 2 paneles: fusión o cara exterior colada — y es la BASE por defecto del legacy
- **topología** · corrige (adaptador = oráculo): panel C0#0 (0.313 mm²) perdido en el legacy
- **topología** · corrige (adaptador = oráculo): panel C0#1 (3199.688 mm²) perdido en el legacy
- **topología** · corrige (adaptador = oráculo): adyacencia C0#0⟷C0#1 ausente en el legacy
- **topología** · corrige (adaptador = oráculo): el árbol del legacy parte de una cara que no es un panel (0 pliegues): no comparable
- legacy buildFoldTree sobre el modelo v1 del adaptador: {"aristas":1,"mismosNiveles":true,"mismasAristas":true} · computeFoldSign (centroide) frente al signo del adaptador: {"convexosIguales":1,"convexosDistintos":0,"noConvexosDistintos":0,"noConvexos":0} · buildAdjacency del legacy sobre el modelo: 1

### escalon-crease

- **geometría** · corrige (adaptador = oráculo): panel C0 C1 C2#0: ΔA bruta 9.96e+0 mm², Δcentroide 1.05e-1 mm
- **geometría** · corrige (adaptador = oráculo): panel C0 C1 C2#1: ΔA bruta -9.96e+0 mm², Δcentroide 1.03e-1 mm
- **representación**: 2 AdjacencyEdge del legacy (una por segmento de crease) frente a 0 (una por pareja plegable)
- **geometría** · corrige (adaptador = oráculo): unión C0 C1 C2#0⟷C0 C1 C2#1 no-plegable (3 rectas): el legacy la usa como bisagra, el adaptador no
- **topología** · corrige (adaptador = oráculo): niveles del árbol distintos (paneles alcanzados o distancia a la base)
- legacy buildFoldTree sobre el modelo v1 del adaptador: {"aristas":0,"mismosNiveles":true,"mismasAristas":true} · computeFoldSign (centroide) frente al signo del adaptador: {"convexosIguales":0,"convexosDistintos":0,"noConvexosDistintos":0,"noConvexos":0} · buildAdjacency del legacy sobre el modelo: 3

### escalon-contorno

- **geometría** · corrige (adaptador = oráculo): panel C0#1: ΔA bruta -9.96e+0 mm², Δcentroide 1.31e-1 mm
- legacy buildFoldTree sobre el modelo v1 del adaptador: {"aristas":1,"mismosNiveles":true,"mismasAristas":true} · computeFoldSign (centroide) frente al signo del adaptador: {"convexosIguales":1,"convexosDistintos":0,"noConvexosDistintos":0,"noConvexos":0} · buildAdjacency del legacy sobre el modelo: 1

### contorno-longitud-cero

- **representación**: base por defecto distinta: legacy C0#1 frente a C0#0 (empate de área o panel perdido)
- legacy buildFoldTree sobre el modelo v1 del adaptador: {"aristas":1,"mismosNiveles":true,"mismasAristas":true} · computeFoldSign (centroide) frente al signo del adaptador: {"convexosIguales":1,"convexosDistintos":0,"noConvexosDistintos":0,"noConvexos":0} · buildAdjacency del legacy sobre el modelo: 1

### hueco-centrado

- **topología** · corrige (adaptador = oráculo): cara P0 del legacy (6400.000 mm²) cubre 2 paneles: fusión o cara exterior colada — y es la BASE por defecto del legacy
- **topología** · corrige (adaptador = oráculo): panel C0#0 (3200.000 mm²) perdido en el legacy
- **topología** · corrige (adaptador = oráculo): adyacencia C0#0⟷C0#1 ausente en el legacy
- **topología** · corrige (adaptador = oráculo): el árbol del legacy parte de una cara que no es un panel (0 pliegues): no comparable
- legacy buildFoldTree sobre el modelo v1 del adaptador: {"aristas":1,"mismosNiveles":true,"mismasAristas":true} · computeFoldSign (centroide) frente al signo del adaptador: {"convexosIguales":1,"convexosDistintos":0,"noConvexosDistintos":0,"noConvexos":0} · buildAdjacency del legacy sobre el modelo: 1

### hueco-descentrado

- **representación**: base por defecto distinta: legacy C0#0 frente a C0#1 (empate de área o panel perdido)
- legacy buildFoldTree sobre el modelo v1 del adaptador: {"aristas":1,"mismosNiveles":true,"mismasAristas":true} · computeFoldSign (centroide) frente al signo del adaptador: {"convexosIguales":1,"convexosDistintos":0,"noConvexosDistintos":0,"noConvexos":0} · buildAdjacency del legacy sobre el modelo: 1

### corte-abierto-divide

- **topología** · corrige (adaptador = oráculo): cara P0 del legacy (3200.000 mm²) cubre 2 paneles: fusión o cara exterior colada — y es la BASE por defecto del legacy
- **topología** · corrige (adaptador = oráculo): panel #0 (1600.000 mm²) perdido en el legacy
- **topología** · corrige (adaptador = oráculo): panel #1 (1600.000 mm²) perdido en el legacy
- **topología** · corrige (adaptador = oráculo): el árbol del legacy parte de una cara que no es un panel (0 pliegues): no comparable
- legacy buildFoldTree sobre el modelo v1 del adaptador: {"aristas":0,"mismosNiveles":true,"mismasAristas":true} · computeFoldSign (centroide) frente al signo del adaptador: {"convexosIguales":0,"convexosDistintos":0,"noConvexosDistintos":0,"noConvexos":0} · buildAdjacency del legacy sobre el modelo: 0

### corte-abierto-parcial

- sin diferencias
- legacy buildFoldTree sobre el modelo v1 del adaptador: {"aristas":0,"mismosNiveles":true,"mismasAristas":true} · computeFoldSign (centroide) frente al signo del adaptador: {"convexosIguales":0,"convexosDistintos":0,"noConvexosDistintos":0,"noConvexos":0} · buildAdjacency del legacy sobre el modelo: 0

### panel-pequeno-1.5mm2

- **topología** · corrige (adaptador = oráculo): cara P0 del legacy (46.500 mm²) cubre 2 paneles: fusión o cara exterior colada — y es la BASE por defecto del legacy
- **topología** · corrige (adaptador = oráculo): panel C0#0 (1.500 mm²) perdido en el legacy
- **topología** · corrige (adaptador = oráculo): adyacencia C0#0⟷C0#1 ausente en el legacy
- **topología** · corrige (adaptador = oráculo): el árbol del legacy parte de una cara que no es un panel (0 pliegues): no comparable
- legacy buildFoldTree sobre el modelo v1 del adaptador: {"aristas":1,"mismosNiveles":true,"mismasAristas":true} · computeFoldSign (centroide) frente al signo del adaptador: {"convexosIguales":1,"convexosDistintos":0,"noConvexosDistintos":0,"noConvexos":0} · buildAdjacency del legacy sobre el modelo: 1

### panel-delgado-40x1

- **topología** · corrige (adaptador = oráculo): cara P0 del legacy (440.000 mm²) cubre 2 paneles: fusión o cara exterior colada — y es la BASE por defecto del legacy
- **topología** · corrige (adaptador = oráculo): panel C0#0 (40.000 mm²) perdido en el legacy
- **topología** · corrige (adaptador = oráculo): adyacencia C0#0⟷C0#1 ausente en el legacy
- **topología** · corrige (adaptador = oráculo): el árbol del legacy parte de una cara que no es un panel (0 pliegues): no comparable
- legacy buildFoldTree sobre el modelo v1 del adaptador: {"aristas":1,"mismosNiveles":true,"mismasAristas":true} · computeFoldSign (centroide) frente al signo del adaptador: {"convexosIguales":1,"convexosDistintos":0,"noConvexosDistintos":0,"noConvexos":0} · buildAdjacency del legacy sobre el modelo: 1

### esquinas-redondeadas-anclas

- **representación**: base por defecto distinta: legacy C0#1 frente a C0#0 (empate de área o panel perdido)
- legacy buildFoldTree sobre el modelo v1 del adaptador: {"aristas":1,"mismosNiveles":true,"mismasAristas":true} · computeFoldSign (centroide) frente al signo del adaptador: {"convexosIguales":1,"convexosDistintos":0,"noConvexosDistintos":0,"noConvexos":0} · buildAdjacency del legacy sobre el modelo: 1

### caja-botanica-real

- **geometría** · corrige (adaptador = oráculo): panel C0 C8#0: ΔA bruta 1.99e+1 mm², Δcentroide 2.49e-1 mm
- **geometría** · corrige (adaptador = oráculo): panel C0#0: ΔA bruta 2.86e+0 mm², Δcentroide 1.42e-1 mm
- **topología** · corrige (adaptador = oráculo): panel C10#0 (665.709 mm²) perdido en el legacy
- **geometría** · corrige (adaptador = oráculo): panel C2#0: ΔA bruta 7.52e-1 mm², Δcentroide 2.35e-2 mm
- **geometría** · corrige (adaptador = oráculo): panel C3 C11#0: ΔA bruta -1.99e+1 mm², Δcentroide 8.40e-2 mm
- **geometría** · corrige (adaptador = oráculo): panel C4 C8 C9#0: ΔA bruta -1.99e+1 mm², Δcentroide 2.49e-1 mm
- **geometría** · corrige (adaptador = oráculo): panel C5 C6 C11#0: ΔA bruta -4.40e-3 mm², Δcentroide 5.49e-5 mm
- **topología** · corrige (adaptador = oráculo): panel C7#0 (665.574 mm²) perdido en el legacy
- **topología** · corrige (adaptador = oráculo): adyacencia C10#0⟷C6 C7 C9 C10#0 ausente en el legacy
- **topología** · corrige (adaptador = oráculo): adyacencia C6 C7 C9 C10#0⟷C7#0 ausente en el legacy
- **representación**: 10 AdjacencyEdge del legacy (una por segmento de crease) frente a 12 (una por pareja plegable)
- **topología** · corrige (adaptador = oráculo): base por defecto distinta: legacy C6 C7 C9 C10#0 frente a C4 C8 C9#0 (empate de área o panel perdido)
- **representación**: 2 aristas con otro padre en un empate BFS (mismos niveles)
- legacy buildFoldTree sobre el modelo v1 del adaptador: {"aristas":12,"mismosNiveles":true,"mismasAristas":true} · computeFoldSign (centroide) frente al signo del adaptador: {"convexosIguales":7,"convexosDistintos":0,"noConvexosDistintos":0,"noConvexos":5} · buildAdjacency del legacy sobre el modelo: 10

### ill-real-caja-botanica ε 0.05

- **topología** · corrige (adaptador = oráculo): cara P6 del legacy (1918.973 mm²) cubre 2 paneles: fusión o cara exterior colada
- **topología** · corrige (adaptador = oráculo): panel C0 C8#0 (1579.942 mm²) perdido en el legacy
- **topología** · corrige (adaptador = oráculo): panel C0#0 (316.275 mm²) perdido en el legacy
- **geometría** · corrige (adaptador = oráculo): panel C1 C2 C5#0: ΔA bruta 3.01e-3 mm², Δcentroide 1.15e-5 mm
- **geometría** · corrige (adaptador = oráculo): panel C10#0: ΔA bruta 7.52e-1 mm², Δcentroide 2.35e-2 mm
- **geometría** · corrige (adaptador = oráculo): panel C1#0: ΔA bruta -4.25e-4 mm², Δcentroide 7.53e-6 mm
- **geometría** · corrige (adaptador = oráculo): panel C2#0: ΔA bruta 7.52e-1 mm², Δcentroide 2.35e-2 mm
- **geometría** · corrige (adaptador = oráculo): panel C3 C11#0: ΔA bruta -1.99e+1 mm², Δcentroide 8.44e-2 mm
- **geometría** · corrige (adaptador = oráculo): panel C3#0: ΔA bruta 3.42e-2 mm², Δcentroide 8.84e-4 mm
- **geometría** · corrige (adaptador = oráculo): panel C4 C8 C9#0: ΔA bruta 1.01e+1 mm², Δcentroide 3.93e-1 mm
- **geometría** · corrige (adaptador = oráculo): panel C4#0: ΔA bruta -2.09e-1 mm², Δcentroide 2.53e-3 mm
- **geometría** · corrige (adaptador = oráculo): panel C5 C6 C11#0: ΔA bruta -2.13e-1 mm², Δcentroide 1.23e-3 mm
- **geometría** · corrige (adaptador = oráculo): panel C6 C7 C9 C10#0: ΔA bruta -2.96e+1 mm², Δcentroide 1.76e-1 mm
- **topología** · corrige (adaptador = oráculo): panel C7#0 (665.548 mm²) perdido en el legacy
- **topología** · corrige (adaptador = oráculo): adyacencia C0 C8#0⟷C0#0 ausente en el legacy
- **topología** · corrige (adaptador = oráculo): adyacencia C0 C8#0⟷C4 C8 C9#0 ausente en el legacy
- **topología** · corrige (adaptador = oráculo): adyacencia C6 C7 C9 C10#0⟷C7#0 ausente en el legacy
- **topología** · corrige (adaptador = oráculo): adyacencia P4⟷P6 (con una cara del legacy sin panel) del legacy no existe en el adaptador
- **representación**: 10 AdjacencyEdge del legacy (una por segmento de crease) frente a 12 (una por pareja plegable)
- **representación**: 3 aristas con otro padre en un empate BFS (mismos niveles)
- legacy buildFoldTree sobre el modelo v1 del adaptador: {"aristas":12,"mismosNiveles":true,"mismasAristas":true} · computeFoldSign (centroide) frente al signo del adaptador: {"convexosIguales":5,"convexosDistintos":0,"noConvexosDistintos":0,"noConvexos":7} · buildAdjacency del legacy sobre el modelo: 11

### histórico ×0.75 ε 0.05

- **geometría** · corrige (adaptador = oráculo): panel C0 C5 C6#0: ΔA bruta 2.27e+1 mm², Δcentroide 3.78e-1 mm
- **geometría** · corrige (adaptador = oráculo): panel C0 C8#0: ΔA bruta -8.11e-2 mm², Δcentroide 2.52e-1 mm
- **geometría** · corrige (adaptador = oráculo): panel C1 C2 C4 C5#0: ΔA bruta -3.38e+1 mm², Δcentroide 2.09e-3 mm
- **geometría** · corrige (adaptador = oráculo): panel C11#0: ΔA bruta 1.61e+0 mm², Δcentroide 1.07e-1 mm
- **geometría** · corrige (adaptador = oráculo): panel C2 C3 C7#0: ΔA bruta 5.66e+0 mm², Δcentroide 2.95e-1 mm
- **geometría** · corrige (adaptador = oráculo): panel C3 C11#0: ΔA bruta 5.56e+0 mm², Δcentroide 2.37e-1 mm
- **geometría** · corrige (adaptador = oráculo): panel C4#0: ΔA bruta 1.98e-2 mm², Δcentroide 4.64e-4 mm
- **geometría** · corrige (adaptador = oráculo): panel C6 C9 C10#0: ΔA bruta -1.69e+1 mm², Δcentroide 1.33e-1 mm
- **geometría** · corrige (adaptador = oráculo): panel C7#0: ΔA bruta -1.19e-1 mm², Δcentroide 1.92e-3 mm
- **geometría** · corrige (adaptador = oráculo): panel C8#0: ΔA bruta 1.94e-2 mm², Δcentroide 6.67e-4 mm
- **geometría** · corrige (adaptador = oráculo): panel C9#0: ΔA bruta 5.64e-1 mm², Δcentroide 2.39e-2 mm
- **representación**: base por defecto distinta: legacy C0 C5 C6#0 frente a C2 C3 C7#0 (empate de área o panel perdido)
- **representación**: mismas aristas en otro orden (índice de FoldEdge = identidad en la interfaz)
- legacy buildFoldTree sobre el modelo v1 del adaptador: {"aristas":12,"mismosNiveles":true,"mismasAristas":true} · computeFoldSign (centroide) frente al signo del adaptador: {"convexosIguales":5,"convexosDistintos":0,"noConvexosDistintos":0,"noConvexos":7} · buildAdjacency del legacy sobre el modelo: 12

### ill-real-caja-simple

- sin diferencias
- legacy buildFoldTree sobre el modelo v1 del adaptador: {"aristas":1,"mismosNiveles":true,"mismasAristas":true} · computeFoldSign (centroide) frente al signo del adaptador: {"convexosIguales":1,"convexosDistintos":0,"noConvexosDistintos":0,"noConvexos":0} · buildAdjacency del legacy sobre el modelo: 1

### ill-real-compuesto

- sin diferencias
- legacy buildFoldTree sobre el modelo v1 del adaptador: {"aristas":1,"mismosNiveles":true,"mismasAristas":true} · computeFoldSign (centroide) frente al signo del adaptador: {"convexosIguales":1,"convexosDistintos":0,"noConvexosDistintos":0,"noConvexos":0} · buildAdjacency del legacy sobre el modelo: 1

### ill-real-curvas

- sin diferencias
- legacy buildFoldTree sobre el modelo v1 del adaptador: {"aristas":1,"mismosNiveles":true,"mismasAristas":true} · computeFoldSign (centroide) frente al signo del adaptador: {"convexosIguales":1,"convexosDistintos":0,"noConvexosDistintos":0,"noConvexos":0} · buildAdjacency del legacy sobre el modelo: 1

### panel no convexo envolvente

- **topología** · corrige (adaptador = oráculo): panel C0#0 (2900.000 mm²) perdido en el legacy
- **topología** · corrige (adaptador = oráculo): panel C0#1 dividido en 2 por el legacy
- **topología** · corrige (adaptador = oráculo): adyacencia C0#0⟷C0#1 ausente en el legacy
- **representación**: 1 aristas con otro padre en un empate BFS (mismos niveles)
- legacy buildFoldTree sobre el modelo v1 del adaptador: {"aristas":1,"mismosNiveles":true,"mismasAristas":true} · computeFoldSign (centroide) frente al signo del adaptador: {"convexosIguales":0,"convexosDistintos":0,"noConvexosDistintos":1,"noConvexos":1} · buildAdjacency del legacy sobre el modelo: 1

### rejilla 2×2

- **representación**: base por defecto distinta: legacy C0 C3#0 frente a C0 C1#0 (empate de área o panel perdido)
- legacy buildFoldTree sobre el modelo v1 del adaptador: {"aristas":3,"mismosNiveles":true,"mismasAristas":true} · computeFoldSign (centroide) frente al signo del adaptador: {"convexosIguales":3,"convexosDistintos":0,"noConvexosDistintos":0,"noConvexos":0} · buildAdjacency del legacy sobre el modelo: 4

### rejilla 6×6

- **representación**: base por defecto distinta: legacy C0 C3 C12#0 frente a C0 C1#0 (empate de área o panel perdido)
- **representación**: 10 aristas con otro padre en un empate BFS (mismos niveles)
- legacy buildFoldTree sobre el modelo v1 del adaptador: {"aristas":35,"mismosNiveles":true,"mismasAristas":false} · computeFoldSign (centroide) frente al signo del adaptador: {"convexosIguales":35,"convexosDistintos":0,"noConvexosDistintos":0,"noConvexos":0} · buildAdjacency del legacy sobre el modelo: 60

### rejilla 8×8

- **representación**: base por defecto distinta: legacy C0 C3 C16#0 frente a C0 C1#0 (empate de área o panel perdido)
- **representación**: 21 aristas con otro padre en un empate BFS (mismos niveles)
- legacy buildFoldTree sobre el modelo v1 del adaptador: {"aristas":63,"mismosNiveles":true,"mismasAristas":false} · computeFoldSign (centroide) frente al signo del adaptador: {"convexosIguales":63,"convexosDistintos":0,"noConvexosDistintos":0,"noConvexos":0} · buildAdjacency del legacy sobre el modelo: 112

### rejilla 3×3 líneas completas

- **topología** · corrige (adaptador = oráculo): cara P1 del legacy (14400.000 mm²) cubre 9 paneles: fusión o cara exterior colada — y es la BASE por defecto del legacy
- **topología** · corrige (adaptador = oráculo): adyacencia C0 C1#0⟷C0 C2 C3#0 del legacy no existe en el adaptador
- **topología** · corrige (adaptador = oráculo): adyacencia C0 C1#0⟷C0 C3#0 del legacy no existe en el adaptador
- **topología** · corrige (adaptador = oráculo): adyacencia C0 C1 C2 C3#0⟷C0 C1#0 del legacy no existe en el adaptador
- **topología** · corrige (adaptador = oráculo): adyacencia C0 C1 C2#0⟷C0 C2 C3#0 del legacy no existe en el adaptador
- **topología** · corrige (adaptador = oráculo): adyacencia C0 C1 C2#0⟷C0 C3#0 del legacy no existe en el adaptador
- **topología** · corrige (adaptador = oráculo): adyacencia C0 C1 C2#0⟷C0 C1 C3#0 del legacy no existe en el adaptador
- **topología** · corrige (adaptador = oráculo): adyacencia C0 C1 C3#0⟷C0 C2 C3#0 del legacy no existe en el adaptador
- **topología** · corrige (adaptador = oráculo): adyacencia C0 C1 C2 C3#0⟷C0 C3#0 del legacy no existe en el adaptador
- **topología** · corrige (adaptador = oráculo): adyacencia C0 C1#0⟷C1 C2#0 del legacy no existe en el adaptador
- **topología** · corrige (adaptador = oráculo): adyacencia C0 C1#0⟷C1 C2 C3#0 del legacy no existe en el adaptador
- **topología** · corrige (adaptador = oráculo): adyacencia C0 C1 C2#0⟷C1 C2 C3#0 del legacy no existe en el adaptador
- **topología** · corrige (adaptador = oráculo): adyacencia C0 C1 C3#0⟷C1 C2#0 del legacy no existe en el adaptador
- **topología** · corrige (adaptador = oráculo): adyacencia C0 C1 C2 C3#0⟷C1 C2#0 del legacy no existe en el adaptador
- **topología** · corrige (adaptador = oráculo): adyacencia C0 C1 C3#0⟷C1 C2 C3#0 del legacy no existe en el adaptador
- **topología** · corrige (adaptador = oráculo): adyacencia C0 C1 C2#0⟷C2 C3#0 del legacy no existe en el adaptador
- **topología** · corrige (adaptador = oráculo): adyacencia C0 C2 C3#0⟷C1 C2#0 del legacy no existe en el adaptador
- **topología** · corrige (adaptador = oráculo): adyacencia C1 C2#0⟷C2 C3#0 del legacy no existe en el adaptador
- **topología** · corrige (adaptador = oráculo): adyacencia C0 C2 C3#0⟷C1 C2 C3#0 del legacy no existe en el adaptador
- **topología** · corrige (adaptador = oráculo): adyacencia C0 C1 C2 C3#0⟷C2 C3#0 del legacy no existe en el adaptador
- **topología** · corrige (adaptador = oráculo): adyacencia C0 C3#0⟷C1 C2 C3#0 del legacy no existe en el adaptador
- **topología** · corrige (adaptador = oráculo): adyacencia C0 C3#0⟷C2 C3#0 del legacy no existe en el adaptador
- **topología** · corrige (adaptador = oráculo): adyacencia C0 C1 C3#0⟷C2 C3#0 del legacy no existe en el adaptador
- **representación**: 60 AdjacencyEdge del legacy (una por segmento de crease) frente a 12 (una por pareja plegable)
- **topología** · corrige (adaptador = oráculo): el árbol del legacy parte de una cara que no es un panel (0 pliegues): no comparable
- legacy buildFoldTree sobre el modelo v1 del adaptador: {"aristas":8,"mismosNiveles":true,"mismasAristas":false} · computeFoldSign (centroide) frente al signo del adaptador: {"convexosIguales":8,"convexosDistintos":0,"noConvexosDistintos":0,"noConvexos":0} · buildAdjacency del legacy sobre el modelo: 60

### rejilla 4×4 densa

- **representación**: 6 aristas con otro padre en un empate BFS (mismos niveles)
- legacy buildFoldTree sobre el modelo v1 del adaptador: {"aristas":15,"mismosNiveles":true,"mismasAristas":false} · computeFoldSign (centroide) frente al signo del adaptador: {"convexosIguales":15,"convexosDistintos":0,"noConvexosDistintos":0,"noConvexos":0} · buildAdjacency del legacy sobre el modelo: 24

