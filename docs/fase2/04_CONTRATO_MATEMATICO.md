# F2.0 · 04 — Contrato matemático propuesto para el motor geométrico

Propuesta para aprobación. **No cambia `GeometryEngine` v1** (contrato vigente, `src/core/engine.js`): describe lo que debería cumplir un motor correcto y cómo se mediría. La futura versión (v2) añadiría información (diagnósticos, identificadores) sin quitar nada a v1; ver `07_PLAN_F2A.md`.

## 1. Modelo

- **Entrada** `Dieline` (v1, mm): contorno `B` (polígono cerrado, opcionalmente con Bézier), huecos `H_k`, cortes abiertos `K_j`, creases `C_i` (polilíneas abiertas, opcionalmente con Bézier).
- **Región de material** `R = int(B) \ ∪ int(H_k)`.
- **Arreglo** `A`: subdivisión plana inducida por `∂B ∪ ∂H_k ∪ (C_i ajustadas)`; sus caras acotadas contenidas en `R` son los **paneles**.
- **Ajuste** `σ`: aplicación que solo mueve extremos/vértices de crease a distancia ≤ `ε_snap` (política `03` P-2/P-3). `σ` es parte del contrato: el resultado se define sobre `σ(C)`, no sobre `C`.
- **Grafo de plegado** `G`: nodos = paneles; arista por cada **arista del arreglo** de tipo crease con un panel distinto a cada lado.

## 2. Invariantes

### 2.1 Estrictos (deben cumplirse exactamente o con tolerancia numérica `δ_num`)

| Id | Invariante | Enunciado | Cómo se mide |
|---|---|---|---|
| **M1** | Partición | Los paneles son disjuntos dos a dos y su unión es `R` (salvo aristas) | Σ áreas = área(R) con `τ_A` (03 P-1); ningún par de paneles se solapa (`orient2d`) |
| **M2** | Contorno intacto | `σ` no altera `B` ni `H_k`: mismo número de vértices y mismas coordenadas (hash) | Hash antes/después del ajuste (puerta V1 del D4) |
| **M3** | Traslación | `E(T_v(d)) = T_v(E(d))` para todo v con \|coord\| ≤ 10⁵ mm | Firma normalizada idéntica tras restar v |
| **M4** | Rotación y reflexión | Igual para rotaciones arbitrarias y reflexiones (las decisiones dependen solo de distancias y orientación relativa) | Firma idéntica tras aplicar la inversa; signos de pliegue invertidos en reflexión |
| **M5** | Determinismo | Misma salida (incluido el orden) para la misma entrada; **misma salida salvo reetiquetado** para entradas equivalentes: orden de trazados, sentido de cada trazado, vértice inicial del contorno | Firma canónica (§4) idéntica |
| **M6** | Euler | Para el grafo plano del arreglo: `V − E + F = 1 + C` (F incluye la cara exterior; C = componentes conexas) | Contar sobre el arreglo |
| **M7** | Creases efectivas | Cada arista de crease del arreglo separa dos paneles distintos **o** queda registrada como diagnóstico (crease colgante, crease sobre el contorno, crease fuera de R) | Recorrido de aristas |
| **M8** | Conservación de lo válido | Ninguna cara de `R` desaparece en silencio: o es panel o figura en `descartes` con motivo | Σ(paneles) + Σ(descartes) = área(R) |
| **M9** | Trazabilidad | Todo ajuste, ambigüedad, descarte y componente desconectada tiene un registro `{tipo, ids de origen, magnitud, regla}` | Esquema del resultado |
| **M10** | Huecos | Un hueco pertenece a exactamente un panel (lo contiene sin tocar creases) o es diagnóstico; el área del panel es neta (resta el hueco; corrige KI-06 en el modelo, no necesariamente en la escena) | Asignación única (como `assignHolesToFaces` del web) |
| **M11** | Contornos exteriores | Caras con área con signo negativa = exteriores; nunca son paneles (corrige KI-09) | Signo del recorrido |

### 2.2 Sujetos a tolerancia o discretización (se cumplen dentro de un dominio declarado)

| Id | Propiedad | Dominio | Nota |
|---|---|---|---|
| **S1** | Invariancia ante escala uniforme s | `ρ·ε_snap/ℓ_min ≤ s ≤ ε_snap/(ρ·ν_max)` medidos sobre la entrada | Fuera del dominio el motor **marca ambigüedad** (P-6), no cambia en silencio |
| **S2** | Estabilidad frente a ε | Resultado idéntico para ε ∈ [ε_snap/2, 2·ε_snap] | Si falla, la entrada tiene geometría en la banda ambigua |
| **S3** | Curvas | Área de cada panel con error ≤ δ_c·(longitud de arcos) frente al área exacta de Bézier (Green) | El 3D usa el aplanado; el oráculo, la curva exacta |
| **S4** | Proximidad al legacy | Donde el legacy es correcto (oráculo de `05`), mismos paneles, adyacencias y árbol (criterio 3 del Plan §5) | Correspondencia por centroide y área |

## 3. Contrato de entrada/salida propuesto (v2, aditivo)

```
GeometryResult v2 = PanelModel v1 + {
  ids:        { panel: string[] (estable, ver §4), crease: string[] (= índice de entrada 'C<i>') },
  diagnostics: Diagnostic[]     // M9: {type:'snap'|'ambiguous'|'dangling-crease'|'discarded-face'|'disconnected'|'hole-unassigned'|'out-of-domain', sources:[ids], magnitude_mm, rule}
  conservation: { expected_mm2, generated_mm2, discarded_mm2, tolerance_mm2 }   // M1/M8
  domain: { nu_max_mm, l_min_mm, eps_snap_mm, rho, inDomain: boolean }            // S1/P-6
  provenance: { segmentSource: Map<arista del arreglo, {path:'B'|'H<k>'|'C<i>', seg, t0, t1}> } // permite casar etapas y escalas
}
```
Reglas: (1) las operaciones de v1 siguen existiendo con la misma firma; (2) un motor v2 **nunca** descarta en silencio; (3) `diagnostics` vacío ⇔ resultado sin ajustes ni ambigüedades.

## 4. Identificadores estables y comparables

- **Crease:** `C<i>` = índice en la entrada (estable mientras el documento no cambie).
- **Panel:** firma canónica = conjunto ordenado de los ids de creases y de los tramos de contorno (`B:<seg>`) que forman su frontera, más el área redondeada a `τ_A`. Es independiente de la escala (tras normalizar), del orden de entrada y del sentido de los trazados; dos paneles con la misma firma en dos ejecuciones son «el mismo panel». Ejemplo (oráculo, Caja Botánica): O3 = `{C6, C7, C9, C10, B:…}`.
- **Uso en diagnóstico:** `metamorficas.mjs` ya casa por centroide; F2A-0 debe pasar a la firma canónica (más robusta que el centroide cuando dos paneles cambian de forma).

## 5. Errores numéricos frente a errores topológicos

| Clase | Definición operativa | Ejemplo medido |
|---|---|---|
| **Numérico** | La decisión cambia al perturbar la entrada en `δ_num` (redondeo) o al cambiar la representación (traslación, orden) sin cambiar la geometría | Traslación +1e7 mm ⇒ 7 paneles; sentido del contorno ⇒ 12 paneles |
| **Topológico por tolerancia** | La decisión cambia al cruzar una característica real de la entrada el umbral geométrico (`s·L = ε`) | Todas las transiciones de KI-22 (35 predicados entre ×0,75 y ×1) |
| **Topológico estructural** | El algoritmo pierde información con independencia de tolerancias y de la representación | Adyacencia estricta + conectividad (D2): 11 paneles con cualquier ε ≤ 0,1 |

Prueba de clasificación: un fallo es **numérico** si desaparece con predicados exactos y origen local; **por tolerancia** si su escala crítica coincide con una característica de la entrada (`ki22-predicados`); **estructural** si persiste en la sombra con ε → 0 y predicados exactos.
