# F2.0 · 02 — Mapa del pipeline geométrico (estado en `1cc1065`)

Recorrido de los datos desde Illustrator hasta la escena 3D, etapa por etapa. Las etapas **E1–E10** son las que instrumenta `tools/f2/lib/etapas.mjs`; las demás se documentan por lectura del código [CONFIRMADO por lectura].
Unidades: **mm** desde la extracción. Coordenadas: las del documento de Illustrator (Y hacia arriba, origen del documento/regla; `caja-botanica-real` y la extracción reabierta difieren en traslación y signo de Y: −351…−148 frente a +148…+371), sin normalizar en todo el motor.

## Diagrama

```
Illustrator (pt, doc)                       host/extract.js (ExtendScript ES3, en Illustrator)
  └─ X0 extracción ──────────────────────── pt→mm ×0.352778 · capas por subcadena · cierre de abiertos ≤ 0.5 mm · creases cerradas < 10 mm fuera · contorno = mayor área
        │ Dieline {outerBoundary, holes[], cutLines[], creases[]} (anclas + manejadores Bézier)
        ▼
  ui/controller.js ──► geometryEngine (core/engine.js, GeometryEngine v1 «legacy»)
  ├─ V  validate ──────────────────────── core/legacy/validate.js · distancia lateral extremo-de-crease→segmento > 0.5 mm ⇒ aviso (nunca bloquea)
  └─ buildPanels ──────────────────────── core/legacy/panels.js
       E1 contornos cerrados → cáscaras/huecos (paridad de contención, pointInPolygonInclusive con 0.5 mm)
       E2 segmentos: contornos cerrados (boundary) + creases (abiertas); cutLines EXCLUIDOS; solo anclas (KI-07)
       E3 troceado iterativo (topology.js): segSegIntersect (λ∈(1e-6,1−1e-6), |det|<1e-9) y pointOnSeg (d1,d2>0.5 ∧ d1+d2−len<0.5)   ← 1.ª DIVERGENCIA KI-22
       E4 grafo: getVid (primer vértice a <0.5 mm, no transitiva), aristas únicas, orden angular atan2
       E5 caras: recorrido de caras planas (siguiente arista = anterior en orden angular), área con signo
       E6 filtros: |área|≤1 · centroide fuera de cáscara/dentro de hueco · área<4 · delgadez>30 con área<120 · duplicado (clave toFixed(2))
       E7 creaseEdges crudas + adyacencia ESTRICTA (edgeMatch: extremos de la crease cruda = extremos de una arista del panel, 0.5 mm)
       E8 filtro de conectividad: mayor componente por área (desempate nº paneles); el resto se descarta en silencio
  ├─ E9 buildAdjacency (robusta: estricta → solape crease/arista con eps=max(0.5,1.0) y fracción 0.20 → panel-panel) · defaultBaseIndex (mayor área)
  │     buildFoldTree (BFS desde la base; signo por producto vectorial con 0.001)
  └─ E10 validate (repetida para el informe)
        ▼
  scene/panel-meshes.js  X1 centrado: media de TODOS los vértices de los paneles (no bbox) · THREE.Shape sin huecos (KI-06) · ExtrudeGeometry(depth = espesor) con triangulación earcut · EdgesGeometry(1°)
  fold/folding.js        X2 jerarquía pivote→alinear→rotar→desalinear→trasladar por arista del árbol; pivote en crease.a − foldCenter; ángulo × signo
  scene/crease-visuals   X3 bisagras/puentes visuales (no topológicos): len<1e-4, inset 0.04–0.35, umbral 2°
  export/glb-*.js        X4 GLB en mm (KI-03): recorre S.scene3d; no toca la geometría
```

## Etapas en detalle

| Etapa | Módulo · función | Entrada → salida | Unidades / coords | Transformaciones | Tolerancias | Puede descartar geometría | Instrumentación disponible |
|---|---|---|---|---|---|---|---|
| X0 | `host/extract.js` `EXTRACT_SCRIPT` | Documento → `Dieline` JSON | pt → mm (`PT = 0.352778`; exacto: 25,4/72 = 0,3527777…, error relativo 6,3e-7 ⇒ 0,3 µm en 500 mm); Y arriba | ninguna (copia de `pathPoints`) | `EPS = 0.5` mm (cerrar abiertos), `SMALL = 10` mm (creases cerradas), `mob > mca·2` (contorno abierto) | **Sí**: creases cerradas cortas, trazados guía/recorte; capas por subcadena (KI-10) | `meta` (conteos) |
| V | `validate.js` `validateDieline` | Dieline → `{problems}` | mm | — | `TOLERANCE_MM = 0.5` sobre **distancia lateral** (`distPtSeg`) | No (solo avisa; KI-20) | log del motor |
| E1 | `panels.js` `classifyClosedCutContours` | contorno + huecos → cáscaras/huecos | mm | — | `pointInPolygonInclusive` (0,5 mm, lateral) | Indirecto (clasificación) | `e1_contornos` |
| E2 | `panels.js` `buildPanels` (addPath) | trazados → segmentos tipados | mm | Bézier → cuerda entre anclas (KI-07) | — | **Sí**: `cutLines` (cortes abiertos) no entran; curvas | `e2_segmentos` |
| **E3** | `topology.js` `buildTopology` (bucle) | segmentos → segmentos troceados | mm | inserción de puntos de corte | `segSegIntersect` 1e-6 (paramétrica, invariante) y `|det| < 1e-9` (mm², **depende de s²**); `pointOnSeg` 0,5 mm (**suma de distancias**, alcance lateral √(2t(1−t)·len·ε)) | Sí: puede soldar geometría ajena (caja simple, hueco a 5 mm) | `e3_troceado` (lista y nº de iteraciones) |
| E4 | `buildTopology` (`getVid`) | segmentos → grafo | mm | **fusión** de puntos a < 0,5 mm con el primero encontrado (mueve geometría hasta 0,5 mm, también del contorno) | `ptEq` 0,5 mm | Sí: segmentos de longitud < 0,5 mm desaparecen | `e4_grafo` (vértices, grados) |
| E5 | `buildTopology` (recorrido) | grafo → caras | mm² | — | ninguna; área con signo | No (pero sin `maxSafety` sobre ciclos raros) | `e5_caras` (+ Euler) |
| E6 | `buildPanels` (bucle) | caras → paneles | mm, mm² | reorientación CCW | 1 mm², 4 mm², 30:1 + 120 mm², `toFixed(2)` (0,01 mm / 0,01 mm²) | **Sí, en silencio** (KI-05, KI-09, KI-19) | `e6_filtros` con **motivo** por cara |
| E7 | `adjacency.js` `buildAdjacencyStrict` | paneles + creases crudas → aristas | mm | — | `edgeMatch` 0,5 mm en ambos extremos | Indirecto | `e7_estricta.porCrease` |
| E8 | `buildPanels` (conectividad) | paneles → paneles | mm² | — | desempate de áreas 0,001 mm² | **Sí, en silencio** (KI-04) | `e8_conectividad` (componentes, descartados) |
| E9 | `buildAdjacency`, `getDefaultBaseIndex`, `buildFoldTree`, `computeFoldSign` | paneles → adyacencias, base, árbol | mm | — | `eps = max(0.5, 1.0) = 1.0` mm, solape mínimo `max(1.2·eps, 20 %)`, `toFixed(2)` en claves, `|cross| < 0.001` (mm²) en el signo | Paneles no alcanzados quedan sueltos en la escena | `e9_plegado` |
| X1 | `scene/panel-meshes.js` `build3DFromPanels` | paneles → mallas | mm | traslación al centro (media de vértices) | earcut (interno de three r132) | Sí: `shapeFromVerts` < 3 vértices ⇒ sin malla | inventario de escena (A7) |
| X2 | `fold/folding.js` `applyFolding` | árbol + ángulos → jerarquía | mm, grados | rotaciones por pliegue | — | Paneles no alcanzados: planos en la raíz | `__tessDebugView` |
| X4 | `export/glb-*.js` | escena → GLB | **mm** (KI-03) | matrices de la escena | — | No | N1–N4 (A8) |

## Dependencias entre etapas que importan para F2

1. **E3 y E4 deciden la topología** y todas las etapas siguientes heredan sus decisiones; no hay retroalimentación (ninguna etapa posterior puede recuperar una arista fusionada).
2. **E7/E8 usan las creases crudas** (`creaseEdges` de la entrada), no las aristas del grafo: si E3 trocea una crease en una T, la arista del panel ya no coincide con la crease cruda ⇒ adyacencia perdida ⇒ E8 descarta el panel (KI-04 a, D2).
3. **V y E3 usan criterios distintos** para «el extremo toca»: V mide distancia lateral, E3 suma de distancias. Un extremo puede pasar uno y fallar el otro (KI-18, KI-20).
4. **E6 filtra por centroide** de la cara: una cara no convexa con centroide fuera de la cáscara se descarta (también en el motor web: su filtro de caras interiores usa el centroide).
5. **X1 recentra** con la media de vértices: el centro depende del número de vértices de cada panel (no es invariante ante subdivisión de aristas); no afecta a la topología, sí a coordenadas absolutas del GLB.

## Punto de divergencia localizable

`tools/f2/ki22-diagnostico.mjs` compara, para dos escalas, la **firma normalizada** de cada etapa (coordenadas / s redondeadas a 1e-6 mm; áreas / s²; conteos) y devuelve la primera etapa distinta junto con los elementos que sobran o faltan. `tools/f2/ki22-predicados.mjs` baja al nivel de **predicado** (qué par de puntos o punto-segmento decide distinto). Juntos permiten localizar la primera divergencia para cualquier par de escalas o de fixtures equivalentes.

**Instrumentación que falta** (para F2A, no imprescindible para F2.0): (a) traza de cada decisión de E3/E4 *en el orden en que ocurre* (el troceado iterativo crea puntos nuevos cuyas escalas críticas no están en la entrada: 1 transición de la caja simple a ≈ ×0,383); (b) identificadores estables de segmento de origen a través del troceado (hoy `buildTopology` pierde la procedencia); (c) traza de descartes en producción visible para la UI (hoy solo en la réplica de diagnóstico).
