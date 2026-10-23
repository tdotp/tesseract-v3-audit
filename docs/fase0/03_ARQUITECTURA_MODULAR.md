# 03 — Propuesta de arquitectura modular y estrategia de migración

Estado: **propuesta para revisión** (nada implementado). Etiquetas como en el informe (doc 00).
Restricciones respetadas: Illustrator como único editor vectorial · CEP/Chromium + three.js · estabilidad, rendimiento y compatibilidad primero · sin editor 2D · sin render fotográfico/path tracing/IA.

## 1. Principios

1. **Comportamiento primero, estructura después.** La Fase 1 mueve código sin cambiar lo que el usuario ve. Cada cambio de comportamiento va en su propia tarea y commit, con prueba.
2. **Datos puros en el centro, three.js en la orilla.** Geometría y plegado se calculan sin DOM ni three (ya se comprobó que es posible: el plugin se ejecutó en Node sin tocar el archivo). La escena traduce; la UI solo escribe estado.
3. **Crear una vez, actualizar siempre.** El grafo de escena se construye al cargar el troquel o cambiar material/espesor; mover un slider solo cambia rotaciones (`setPose`). Todo recurso creado pasa por un registro que sabe liberarlo.
4. **Un bundle clásico (IIFE) y sin Node.** CEP carga por `file://`; los módulos ES por `file://` son un riesgo conocido. Nada de `--enable-nodejs`.
5. **Contratos con versión.** El JSON del extractor (`DielineV1`) es la frontera host↔panel y es el que ya usa el plugin y el web.
6. **Independiente de CEP donde importa** (core, materiales, acabados, export): migrar a UXP (beta pública de Illustrator esperada primavera 2027; CEP se retira a finales de 2029 — **[NO VERIFICADO por mí]**, tomado de `TESSERACT_MEJORA/00 §8`; conviene reconfirmarlo en la fuente de Adobe antes de decidir plazos) sería reescribir `host/` y `bridge/` y poco más.

## 2. Estructura propuesta

Repo único (sin monorepo) con límites de importación verificados por herramienta (D1):

```
Tesseract v3/
  src/
    host/        ExtendScript (.jsx reales): extract-dieline, export-art, finishes-layers, save-dialog, open-in-apps
    bridge/      Envoltorio CEP: evalScript→Promise, cep.fs, rutas; detección de entorno (CEP vs navegador de pruebas)
    core/        PURO (sin DOM, sin three): tipos, bézier, topología, plegado (pose), validación → diagnósticos
      legacy/    motor actual extraído tal cual (Fase 1) — se retira al demostrar paridad (Fase 2)
    scene/       three: renderer, cámara/órbita, paneles, bisagras, etiquetas, arte, picking, ResourceTracker, render bajo demanda
    materials/   Datos de sustrato (JSON) + cargador de texturas + fábrica de materiales PBR            (Fase 3)
    finishes/    Capas de acabado → máscaras → propiedades de material (UVI, emboss/deboss, foil, mate/brillo) (Fase 4)
    export/      glb, obj, png (sin dependencia de la UI)                                                  (Fases 1/5)
    integrations/ Photoshop (PNG) y Dimension (GLB)                                                         (Fase 6)
    ui/          Vistas DOM, tabs, paneles, tema; solo leen/escriben el store                              (Fases 1/7)
    state/       Store observable (acciones + selectores), sin DOM
    app/         Raíz de composición: conecta módulos; único lugar que conoce a todos
  panel/         manifest.xml, index.html, style.css, libs/ → copiado a dist/
  tests/         fixtures (JSON/SVG de Illustrator), golden masters, pruebas de core/export
  tools/         baseline/ (mediciones), install.sh, check-licenses, check-bundle-size
  third_party/   licencias; PROVENANCE.md (origen de cada archivo copiado)
  docs/          fase0/, ADRs
```

Reglas de dependencia (se hacen cumplir con `dependency-cruiser` u ESLint `no-restricted-imports`, ambos MIT):
`core` no importa nada; `scene` importa `core` + `three`; `export` importa `core` y tipos de `scene`; `ui` importa `state`; `app` importa todo; `host` es texto (no se importa, se carga como recurso).

## 3. Contratos entre módulos (borrador)

```ts
// host → panel  (ya existe, v1.0; el plugin y el web lo usan)
interface DielineV1 {
  version: '1.0'; units: 'mm'; thickness_mm: number;
  outerBoundary: BezierPath; holes: BezierPath[]; cutLines: { geom: BezierPath }[]; creases: BezierPath[];
  meta: { cutLayer: string; creaseLayer: string; /* contadores */ };
}

// core
analyzeDieline(d: DielineV1, opts: { engine: 'legacy' | 'core'; tolerance: TolerancePolicy }): Analysis
type Analysis = { ok: true; model: FoldModel; diagnostics: Diagnostic[] } | { ok: false; diagnostics: Diagnostic[] }
interface FoldModel { panels: Panel[]; hinges: Hinge[]; baseId: PanelId; centerOffset: Vec2; area: { expected: number; generated: number } }
interface Diagnostic { code: string; severity: 'error' | 'warning'; message: string; where?: { panelId?: PanelId; point?: Vec2 } } // la UI las muestra, nunca `throw` crudo
poseModel(model: FoldModel, angles: Record<HingeId, number>, base?: PanelId): Pose   // matrices 4×4 por panel (math pura)

// scene
buildScene(model: FoldModel, look: Look, art?: ArtTextures): SceneHandle
interface SceneHandle { setPose(p: Pose): void; setLook(l: Look): void; setArt(a?: ArtTextures): void; pick(x: number, y: number): Pick; snapshot(opts): Promise<Blob>; dispose(): void }

// export
exportGLB(model: FoldModel, pose: Pose, look: Look, art?: ArtTextures, opts: { unitScale: 0.001 }): Uint8Array   // metros (Fase 5)
```
`Pose` como datos (no un árbol three) permite que **exportar no recorra la escena** (hoy `buildExportSceneMeshes` recorre `scene3d` completa) y que las pruebas de plegado se hagan en Node.

## 4. Política de render y recursos (resuelve H1/H2)

- `ResourceTracker`: toda geometría, material y textura creada para la escena se registra; `dispose()` libera todo; las etiquetas de panel se crean **una vez** (atlas o sprites reutilizados).
- Render bajo demanda: `invalidate()` tras cambios de pose/cámara/material; sin bucle continuo en reposo.
- `pixelRatio = min(devicePixelRatio, 2)`; `preserveDrawingBuffer` solo durante la captura (renderizar y leer en el mismo tick).
- Presupuesto de memoria GPU por material (doc 05 §5) y carga del material activo únicamente.

## 5. Estrategia de migración incremental (patrón "estrangulador")

Principio: en cada paso el plugin sigue funcionando y se puede volver atrás. El plugin instalado **no se toca**: V3 se instala como otra extensión (`com.tato.tesseract.v3.panel`, carpeta distinta) y conviven.

| Paso | Qué | Cómo se sabe que está bien |
|---|---|---|
| 0 | Congelar el estado actual como referencia (fixtures + resultados del motor actual + GLB de referencia + sondas de rendimiento) | Pruebas de caracterización pasan contra el código **sin mover** |
| 1 | Pipeline (esbuild→IIFE, instalación paralela) y arnés de pruebas | El panel V3 vacío carga en CEP; medidas base tomadas dentro de Illustrator |
| 2 | Extraer `core/legacy` (geometría pura) | Mismos números que el golden (11 paneles en el fixture JSON: **se preserva el defecto**, anotado como "known issue") |
| 3 | `host` a archivos `.jsx`, `bridge` | JSON de extracción idéntico en un documento de prueba (validación manual en Illustrator) |
| 4 | `scene` con `ResourceTracker` y estado explícito | Imágenes de referencia equivalentes; sin cambios de apariencia |
| 5 | `export` y `ui` | GLB equivalente (mismos conteos/materiales); mismos IDs y atajos |
| 6 | Arreglo de fuga (aislado) | Δ texturas tras 100 ticks = 0 (sonda `measure_ui.js`) |
| **Fase 2** | **Interruptor de motor**: `legacy` ↔ `core` (web) con A/B sobre los mismos fixtures; se retira el legacy cuando `core` iguala o supera en todos | 13/13 paneles en ambos fixtures, huecos y curvas correctos, conservación de área, tiempos |
| Fases 3–7 | Materiales/PBR → acabados → exportadores → integraciones → UX | Ver §7 |

Salvaguardas: pruebas de caracterización **antes** de mover código; imágenes de referencia por fixture; cada fase cierra con una validación tuya en Illustrator (lista de comprobación en el cierre).

## 6. Motor geométrico: política de tolerancia que hay que decidir (D4)

Hechos medidos con la **exportación real de Illustrator** (`caja-botanica-illustrator-export.svg`):
- 8 pares de extremos de crease separados ≈0.375 mm que deberían ser el mismo punto → el core falla ("panel desconectado").
- Fusionar esos extremos (clusters a ≤0.5 mm; 17 puntos movidos, máx 0.25 mm) hace que la topología construya, **pero** la conservación de área falla por 0.024 mm².
- Causa (no es la fusión): 6 astillas (≤0.008 mm²) **fuera del contorno de corte**, creadas por creases que sobresalen <0.5 mm; `topology.ts` clasifica "interior" con una prueba **inclusiva a 0.5 mm** (`pointInPolygonInclusive`) y las cuenta como paneles. Con prueba estricta de centroide, la suma interior es **exactamente** el área esperada (15521.328267 mm²) [MEDIDO, `tools/baseline/tolerance_experiment.mjs`].

Opciones (para decidir en Fase 2 con más troqueles reales):
| | Qué hace | Pros | Contras |
|---|---|---|---|
| **A (recomendada)** | Preprocesado explícito y registrado: (1) fusionar extremos de crease entre sí (≤0.5 mm), (2) recortar/extender creases al contorno, (3) clasificar caras con prueba estricta; cada ajuste se reporta como diagnóstico `warning` con distancia | Respeta "el contorno de corte jamás se mueve"; conserva el rigor de área (sin relajar 1e-8) | Hay que definir "recortar" para creases que cruzan el borde; necesita corpus de troqueles reales |
| B | Sin ajuste automático: la UI lista los casi-aciertos y el usuario los aprueba uno a uno | Máxima fidelidad | Fricción: Illustrator los produce de forma rutinaria |
| C | Modo "tolerante" activable con informe de cada ajuste | Flexible | Riesgo de volver a normalizar el borrado silencioso (lección de MVP1 del repo web) |

Hasta aprobar la política, V3 **no** cambia la tolerancia del motor del plugin ni del core.

## 7. Orden de fases V3 que propongo (sujeto a tu aprobación)

| Fase | Contenido | Depende de | Observación |
|---|---|---|---|
| 1 | Base técnica: repo, build IIFE, pruebas de caracterización, modularización sin cambios, fix de fugas | — | Doc 06 |
| 2 | Motor geométrico `core` (curvas, huecos, diagnósticos, tolerancia) detrás de interruptor | 1, D4 | Reutilización del web (doc 01) |
| 3 | Visor 3D fluido + materiales y cantos PBR (render bajo demanda, entorno, three actualizado) | 1; prueba de viabilidad en CEP (F1-14) | Subir three con imágenes de referencia |
| 4 | Acabados: UVI, emboss/deboss, foil, mate/brillo (capas con sufijos → máscaras) | 3; `host` extraído | Extracción de capas de acabado en ExtendScript; máscaras en canvas 2D |
| 5 | Exportadores GLB (metros, PBR, extensiones solo si Dimension las lee), OBJ, PNG | 3–4 | |
| 6 | Integraciones: PNG→Photoshop, GLB→Dimension | 5 | Probar apertura de apps; ver riesgos |
| 7 | Rediseño UX/UI del panel (layout ancho, visor grande) | 1 (capa `ui`) | Cambios de layout puntuales pueden adelantarse a la 3 |

## 8. Decisiones técnicas ya razonadas

- **TypeScript** en `core`, `scene`, `export`, `state` (comparte tipos con el web; `tsc` solo para verificación). El resto puede ser TS también; objetivo de salida **ES2020** (Chromium 99 soporta ES2021).
- **esbuild** (MIT) para el bundle IIFE; **Vitest** (MIT) para pruebas; `three` r132 al inicio (sin cambio), actualización en Fase 3.
- **Un solo repo** hasta que el web necesite consumir `core`; mientras tanto la copia lleva procedencia (`PROVENANCE.md`: archivo, commit `c0aeb34`). Duplicar es aceptable; divergir sin registro no.
- **Sin React/Zustand/R3F/Paper.js** en el panel (doc 01).
