# F2A-3 — Propuesta de integración controlada del motor experimental (NO implementada; requiere autorización)

Fecha: 2026-10-28 · Base: `63db9fabb4942c06223d4cadba2948fe41051717` (F2A-2P cerrada) + `1ed4d60` (cierre documental) + `9954414` (pruebas de contrato) · Alcance autorizado: **solo diseño técnico y pruebas de contrato aisladas**. No se ha conectado el núcleo a la aplicación, no se ha cambiado la firma pública ni el motor activo, y `src/`, `panel/`, `reference/`, goldens y huellas siguen intactos.

Etiquetas: [MEDIDO] · [CONFIRMADO] · [INFERENCIA] · [NO VERIFICADO].

## 0. Resumen

- **Recomendación central:** integrar el motor experimental **sin tocar `src/`** en los primeros bloques: un **bundle experimental separado** (otro ID de extensión) que sustituye, solo en ese build, el módulo `./core/engine.js` importado por `src/main.js` por un **selector** con modo **sombra** por defecto (legacy alimenta la interfaz, el experimental se ejecuta en paralelo y solo registra diferencias) y modo **activo** únicamente por acción explícita, visible y no persistente. El bundle normal sigue byte a byte en `dist-a9`.
- **Incompatibilidad de `buildAdjacency(panels, creaseEdges)`:** resuelta sin cambiar la firma con la **alternativa B**: `buildPanels` calcula una vez las adyacencias exactas y las adjunta al arreglo `panels` con una clave `Symbol` no enumerable; `buildAdjacency`/`buildFoldTree` comprueban la identidad de sus argumentos y fallan explícitamente si no son los del modelo. Prototipo probado en el arnés [CONFIRMADO, `tests/experimental/f2a3-contratos.test.mjs`].
- **Inmutabilidad:** los consumidores reales de producción (escena, plegado, puentes de pliegue, GLB) se ejecutaron sobre modelos **congelados en profundidad** de los dos motores: **ninguna escritura** [CONFIRMADO, 12 ejecuciones + control negativo].

## 1. Arquitectura propuesta

```
                      ┌──────────── bundle NORMAL (dist/, ID com.tato.tesseract.v3.panel) ── byte a byte dist-a9 ─────────────┐
 src/main.js ── import { createLegacyEngine } from './core/engine.js' ──► src/core/engine.js (legacy, sin cambios)
                      └────────────────────────────────────────────────────────────────────────────────────────────────────┘
                      ┌──────────── bundle EXPERIMENTAL (dist-experimental/, ID com.tato.tesseract.v3.experimental.panel) ───┐
 src/main.js (MISMO texto) ── './core/engine.js' ──(esbuild onResolve, solo en este build)──► experimental/integracion/selector.js
                                                                                               ├─ src/core/engine.js (legacy, ruta real)
                                                                                               └─ experimental/integracion/motor-v1.js
                                                                                                    └─ experimental/plegado/ + geometria/
                      └────────────────────────────────────────────────────────────────────────────────────────────────────┘
```
- `experimental/integracion/motor-v1.js`: `createExperimentalEngine({ log, eps })` → objeto congelado `{id: 'experimental-f2a2', contract: 1, validate, buildPanels, buildAdjacency, buildFoldTree, defaultBaseIndex}` + métodos fuera de v1 (`diagnosticos`). Es el prototipo de `tests/lib/f2/motor-v1-prototipo.mjs` llevado a módulo con sus propias pruebas.
- `experimental/integracion/selector.js`: exporta **el mismo nombre** que importa `src/main.js` (`createLegacyEngine(options)`), y devuelve un motor v1 que delega según el modo (§7). Así `src/main.js` no cambia y el selector solo existe en el bundle experimental.
- Nada del motor experimental entra en el bundle normal ni en `src/` (las pruebas `a6-limites`, `a9-limites`, `*-texto-identico` y las huellas siguen igual).

## 2. Flujo legacy / experimental

```
extraer (ExtendScript, solo lectura) ─► Dieline ─► engine.validate ─► problemas (interfaz)
                                                │
                                   «Continue to 3D» ─► engine.buildPanels(d) ─► PanelModel ─► build3DFromPanels (escena)
                                                                                      │
                                         buildFoldUI ─► engine.buildAdjacency(panels, creaseEdges) ─► AdjacencyEdge[]
                                                     └► engine.buildFoldTree(panels, adj, base) ─► FoldEdge[] ─► applyFolding ─► GLB
Modo SOMBRA (selector):  legacy produce todo lo anterior; el experimental se ejecuta con la MISMA entrada después de cada llamada,
                         se compara (clases de F2A0_03 + uniones no plegables) y solo se REGISTRA en el log de depuración.
Modo ACTIVO (selector):  el experimental produce todo; si lanza o su modelo es incoherente ⇒ mensaje visible + vuelta a legacy para
                         ESA construcción (nunca en silencio).
```

## 3. Contratos existentes y posibles modificaciones

| Contrato | Estado | Cambio propuesto |
|---|---|---|
| `GeometryEngine` v1 (`src/core/engine.js`): `validate`, `buildPanels`, `buildAdjacency(panels, creaseEdges)`, `buildFoldTree(panels, adjacency, baseIndex)`, `defaultBaseIndex`; I1–I10 | Solo `legacy` | **Ninguno en la firma.** El motor experimental cumple v1 con la alternativa B; métodos extra fuera de v1 (`diagnosticos`) que la interfaz actual ignora |
| `PanelModel` v1 | El adaptador lo cumple (F2A-2) con un campo extra declarado `f2a2` | Ninguno; `area` bruta (DP-6 aplazada) |
| I1 «sin estado» | — | Alternativa B: los datos viajan con el objeto (`panels[Symbol]`), sin estado del motor ni global |
| Excepciones «sin envolver» | Legacy: `TypeError` crudos; experimental: `ErrorPanelModel` con código | Ambos se capturan en el mismo `try/catch` de `controller.js` (`'3D error: ' + message`) [CONFIRMADO por lectura]; diferencias tabuladas en §6 |
| Inmutabilidad de la salida | Implícita (I4: «puede compartir objetos… (solo lectura)») | **Explícita** (D-F2A2P-2) con los controles de §5 |

## 4. Alternativas evaluadas para `buildAdjacency(panels, creaseEdges)`

Problema: las adyacencias exactas (uniones plegables, ejes, lados, H-01/H-02) se calculan sobre el **arreglo** del núcleo, que v1 no transporta; con solo `panels` y `creaseEdges` no se pueden reconstruir con las mismas garantías.

| Alt. | Descripción | Contrato | Consumidores | Riesgos | Valoración |
|---|---|---|---|---|---|
| **A** | El motor guarda un `WeakMap` (modelo → adyacencias) en su clausura | Firma v1 intacta; estado por instancia de motor (roza I1) | Sin cambios | Dos instancias de motor no se entienden; depuración menos transparente | Viable |
| **B** | `buildPanels` adjunta `{modelo, ady, creaseEdges}` congelado a `panels[Symbol('tesseract.f2a3.modelo')]` (no enumerable); `buildAdjacency`/`buildFoldTree` comprueban identidad | Firma v1 intacta; sin estado del motor; invisible a JSON y al legacy | Sin cambios: la interfaz ya pasa `panelData.panels`/`panelData.creaseEdges` del mismo objeto [CONFIRMADO: `fold-controls.js:99`, `:103`, `:86`] | Una copia de `panels` pierde los datos ⇒ **error explícito** `modelo-ajeno` (probado), nunca un recálculo distinto | **Recomendada** |
| C | Contrato v2: `buildAdjacency(model)` | Cambia la firma | Cambia `fold-controls.js` (y sus pruebas de texto idéntico) | Ruptura de F1 | No ahora (prohibido cambiar la firma) |
| D | Recalcular desde los polígonos v1 + `creaseEdges` | Firma intacta | Sin cambios | Pierde exactitud (cruces y puntos ajustados redondeados) y las uniones no plegables | **Rechazada** |
| E | Meter las adyacencias en campos extra de `creaseEdges` | Contamina objetos v1 | Sin cambios | Rompe la forma exacta de v1 (pruebas de contrato) | Rechazada |
El prototipo B pasa: misma salida byte a byte que la API experimental directa; error con copias del arreglo; flujo real de la interfaz con el modelo congelado; alias del contrato (`aliasPrint`) iguales al legacy en `creases`, `creaseEdges` y `FoldEdge.crease = AdjacencyEdge.crease` [CONFIRMADO].

## 5. Propiedad de datos e inmutabilidad (D-F2A2P-2)

| Clase de datos | Dónde | Quién lo lee | Regla |
|---|---|---|---|
| **Internos del núcleo** (arreglo, DCEL, caras, polilíneas ajustadas) | `f2a2.detalle` (no enumerable) y `panels[Symbol]` | Solo `arbol.js` / el motor | Privados; nunca expuestos a la interfaz; nunca mutados |
| **`PanelModel` v1** (`panels`, `vertices`, `edges`, `centroid`, `area`, `creaseEdges` con anchors de la entrada, `creases` = entrada) | Salida de `buildPanels` | `panel-meshes` (copia `vertices` antes de usarlos), `folding`/`crease-visuals` (leen `centroid`), `S.foldData` (guarda referencias) | Solo lectura |
| **Metadatos experimentales `f2a2`** (`paneles`, `conversiones`, `diagnosticos`) y `uniones`/`detalle` de las adyacencias | Modelo y salida de `construirAdyacencias` | Hoy nadie en producción; mañana la interfaz de diagnósticos | Solo lectura; arreglos **compartidos** en uniones plegables (F2A-2P) |
| **Datos derivados de los consumidores** (`S.foldSigns`, `S.foldAngles`, geometrías THREE, GLB) | `S` y escena | La interfaz | Propiedad del consumidor (arreglos nuevos) |

**Evidencia [CONFIRMADO, `f2a3-contratos`]:** 6 casos (Caja Botánica, Illustrator real ε 0,05, hueco, líneas completas, A-7 con uniones no plegables, dos componentes) × 2 motores: modelo, adyacencias, árbol (y uniones/detalle en el experimental) **congelados en profundidad**; `build3DFromPanels` → plegado a 60° → puentes de pliegue → `buildGLBBlobFromCurrentView`: ninguna escritura y la instantánea JSON idéntica. Control negativo: invertir `vertices`, mover `crease.a` u ordenar un `creases` compartido ⇒ `TypeError` detectado. Mapa de alias: los únicos arreglos compartidos de F2A-2P viven dentro de `uniones`/`detalle` (12 `creases` y 12 `segmentos` en la Caja Botánica); dentro de v1 solo los alias de siempre (`edges.u/v` = `vertices`; `FoldEdge.crease` = `AdjacencyEdge.crease`), idénticos al legacy. Análisis estático: la única operación en sitio de los consumidores es `picking.js:36` (`sort` de los impactos del raycaster, arreglo nuevo).

**Controles automatizados propuestos** (sin copias defensivas indiscriminadas):
1. **Prueba de Node** (ya existe): consumidores reales sobre modelos congelados en los fixtures reales y sintéticos; se amplía con cambio de base y de grosor.
2. **Modo congelado de depuración** en el bundle experimental (no en el normal): `Object.freeze` profundo de cada salida del motor cuando la depuración está activa; en módulos estrictos cualquier mutación lanza y se registra. Coste a medir [NO VERIFICADO].
3. **Alarma estática** (ya existe): lista fijada de operaciones en sitio en `src/ui|fold|scene|app|export`; cualquier nueva exige revisión.
4. **Arnés de navegador** del bundle experimental con el modo congelado activo y los flujos completos de la interfaz (construir, Shift+clic de base, grosor, arte, GLB, documento nuevo), y huella JSON del modelo antes/después de cada acción.

## 6. Errores y diagnósticos

| Situación | Legacy hoy | Experimental (propuesta) |
|---|---|---|
| Entrada inválida (`null`, anclas ausentes, no finitas, unidades ≠ mm, dominio) | `TypeError` crudo (`Cannot read properties…`) | `ErrorPanelModel('entrada-invalida', diagnosticos)` con ruta y código; mensaje visible; en modo activo, vuelta a legacy **solo si** el legacy sí construye |
| Núcleo incoherente (Euler, paridad, contorno) | — | `ErrorPanelModel('nucleo-incoherente')` ⇒ mensaje visible + legacy |
| `buildAdjacency`/`buildFoldTree` con objetos ajenos | Recalcula lo que le pasen | `ErrorPanelModel('modelo-ajeno')`: nunca un resultado distinto en silencio |
| Uniones no plegables o ambiguas (H-01, A-1, A-7) | Las usa como bisagras | Sin bisagra; diagnóstico `union-no-plegable`/`union-ambigua`; las componentes que quedan separadas se muestran planas (la escena ya añade a la raíz los paneles no alcanzados, `folding.js`) |
| Componentes desconectadas / ciclos | Silencio | `componente-desconectado` / `ciclo` (solo reales) |
| `validate()` | Avisos del validador legacy (extremos de crease cerca del corte) | **Decisión pendiente** (D-F2A3-4): recomendado = mismo `validateDieline` del legacy (paridad de interfaz) + diagnósticos f2a2 aparte |
Tabla medida con el prototipo (`MALOS` de A6): `buildPanels(null)`, `buildPanels(contorno sin anclas)`, `buildAdjacency(null, …)`, `buildFoldTree(null, …)` → legacy `TypeError`, prototipo `ErrorPanelModel` con código; `getDefaultBaseIndex(null)` → `TypeError` en ambos; `buildFoldTree([], [], 0)` → legacy sin excepción, prototipo `modelo-ajeno` (no ocurre en la interfaz: solo se llama con el modelo construido); `validate` del prototipo es un marcador (D-F2A3-4).
**Visibilidad mínima sin tocar `src/`:** en el bundle experimental los diagnósticos se escriben con el `log` del motor (sink de `createLegacyEngine({log})`, que ya llega al registro de depuración de la interfaz). Una presentación propia (contador en la línea de información del plegado, lista de uniones no plegables) **sí** toca `src/ui/` y queda para un bloque con autorización aparte (I-6).

## 7. Activación y rollback

- **Legacy por defecto siempre:** el bundle normal no contiene el experimental (huella `dist-a9`). El bundle experimental arranca en **modo sombra** (la interfaz sigue usando legacy).
- **Activación explícita:** el bundle experimental solo se instala con autorización fechada (`tools/a4/a4.sh` ya exige `--autorizado-por-usuario=AAAA-MM-DD`) y con **otro ID** (`com.tato.tesseract.v3.experimental.panel`, menú «Tesseract V3 (experimental)»), así que nunca sustituye a la instalación normal ni al plugin original. Pasar a **modo activo** requiere una acción explícita en la sesión (propuesta: la consola de depuración ya existente), con aviso visible permanente («Motor experimental activo») y **sin persistencia** (sin `localStorage`; DP-7 opción D descartada).
- **Sin cambios silenciosos:** el modo se registra en el log al arrancar y en cada construcción; un fallo del experimental en modo activo vuelve a legacy **con mensaje**, nunca en silencio.
- **Rollback:** desinstalar la extensión experimental (procedimiento de A4–A9, snapshot previo); los documentos de Illustrator no se modifican (la extracción es de solo lectura y el arte usa temporales) [CONFIRMADO por las validaciones A4–A9-CEP]; ningún dato del usuario depende del motor (no hay persistencia).
- **CEP y Chromium 99:** el experimental ya empaqueta con `esbuild --target=chrome99` sin avisos y da lo mismo que Node en Chrome headless con las APIs posteriores a la 99 eliminadas [CONFIRMADO, F2A-2]; `Symbol`, `WeakMap`, `Object.freeze` son ES2015.
- **Cambio de documento (KI-30):** el índice de base persiste entre documentos y su significado depende del motor (el orden de paneles difiere); propuesta: al cambiar de motor o de documento, **reiniciar la base** a `defaultBaseIndex` del motor en uso (D-F2A3-6).

## 8. Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| Un consumidor futuro muta datos compartidos | Contrato explícito de solo lectura + controles §5 (Node, modo congelado, alarma estática, navegador) |
| Copias del arreglo `panels` en un consumidor futuro pierden la clave Symbol | Error explícito `modelo-ajeno` + prueba de identidad; documentado en el contrato |
| Divergencia del bundle experimental respecto del normal | Mismo `src/main.js`; la prueba exige que el bundle normal siga en `dist-a9` y que el experimental solo difiera en el módulo resuelto |
| Rendimiento (criterio 5 pendiente, 3/10) y doble cálculo en modo sombra (≈ 0,5–2 ms extra por construcción [INFERENCIA desde F2A-2P]) | Medir en CEP real; el modo sombra no bloquea la interfaz (se ejecuta después) |
| Memoria: el modelo experimental retiene ≈ 160–570 kB frente a 36–128 kB del legacy (cadena completa) | Un solo modelo vivo en `S`; medir en CEP; D-F2A2P-3 conserva `uniones` completas |
| ε experimental (0,05 mm) necesario para Illustrator real (sin él, 4 paneles) | Solo en el bundle experimental, declarado (DP-3); corpus pendiente |
| Uniones no plegables reales (A-7) desconectan el modelo | Diagnóstico visible; decisión de interfaz pendiente (D-F2A2R-2) |
| `validate()` distinto entre motores | D-F2A3-4 (recomendado: el del legacy) |
| GLB distinto con el experimental (más paneles en la Caja Botánica: 13 frente a 11) | Esperado (corrige KI-22/KI-04); en modo sombra el GLB es el del legacy; comparar por estructura, no por bytes |

## 9. Plan de pruebas y criterios de aceptación

| Área | Prueba | Dónde | Criterio |
|---|---|---|---|
| Contrato v1 | forma exacta de cada salida, `aliasPrint`, `MALOS`, identidad (alternativa B) | Node (`tests/experimental/`) | 100 %; diferencias de excepción solo las tabuladas en §6 |
| Legacy seleccionado | bundle normal = `dist-a9` byte a byte; en el bundle experimental en modo sombra, interfaz, escena, GLB y log del legacy = bundle normal | Node + Chrome headless | Igualdad byte a byte (GLB sin arte) y de píxeles |
| Aislamiento | `src/` sin `experimental`; bundle normal sin marcas; el experimental solo por el selector | Node | Como `f2a2-aislamiento` |
| Integridad `PanelModel` | adaptador frente al oráculo (F2A-2) dentro del bundle experimental | Node + headless | = oráculo |
| Inmutabilidad | §5 (1)–(4) | Node + headless | 0 escrituras; instantáneas idénticas |
| Adyacencias y árbol | H-01/H-02, 788 casos de equivalencia, permutaciones, transformaciones | Node | = F2A-2P |
| Cambio de documento | extraer A → 3D → extraer B → 3D en los dos modos; base reiniciada (D-F2A3-6) | Chrome headless (arnés de A9) | Sin errores; base válida; sin restos del modelo anterior |
| Errores y fallback | entradas inválidas, núcleo incoherente simulado, objetos ajenos | Node + headless | Mensaje visible; vuelta a legacy registrada; nunca silencio |
| Memoria | heap retenido y GPU Δ en ciclos (soak de A1) con el experimental activo | Chrome headless | Sin crecimiento acumulativo; heap dentro del presupuesto acordado |
| Rendimiento | cadena completa frente al legacy en los 10 casos; tiempo de modo sombra | Node + headless | Registrar; criterio 5 no se declara cumplido sin cumplirse |
| GLB | estructura del GLB (validador de A8) con el experimental activo | Node + headless | GLB válido; estructura coherente con los paneles |
| Chromium 99 | bundle experimental con APIs reducidas | Chrome headless | Sin errores |
| **Solo en Illustrator real** (autorización aparte) | instalación con otro ID; carga; modo sombra en la Caja Botánica real; modo activo; Shift/Alt+clic; GLB; rollback | CEP 12 / Chromium 99 | Procedimiento de A4–A9-CEP |

## 10. Plan de implementación por bloques independientes

| Bloque | Contenido | Toca `src/` | Depende de |
|---|---|---|---|
| **I-1** | `experimental/integracion/motor-v1.js` (alternativa B como módulo) + pruebas de contrato (portar las del prototipo) | No | — |
| **I-2** | `experimental/integracion/selector.js` (modos sombra/activo, registro de diferencias con las clases de F2A0_03, vuelta a legacy) + pruebas en Node | No | I-1 |
| **I-3** | Build experimental: `tools/build/build-experimental.mjs` (plugin `onResolve` de esbuild para `./core/engine.js`, ID y menú propios, salida `dist-experimental/`) + prueba de que el bundle normal sigue en `dist-a9` | No (herramienta nueva) | I-2 |
| **I-4** | Arnés de navegador del bundle experimental (modo sombra y activo, modo congelado, cambio de documento, APIs de Chromium 99) en `tests/experimental/` | No | I-3 |
| **I-5** | Instalación/desinstalación del bundle experimental en `tools/a4/` (otro ID; autorización fechada) — sin ejecutarla | No | I-3 |
| **I-6** | Presentación de diagnósticos en la interfaz (contador, lista de uniones no plegables) | **Sí** (`src/ui/`) | Autorización aparte; ajuste de pruebas de texto idéntico de F1 |
| **I-7** | Validación en CEP real (sombra → activo → rollback) | No (procedimiento) | Autorización aparte |

## 11. Decisiones que requieren aprobación

| Id | Decisión | Recomendación |
|---|---|---|
| D-F2A3-1 | Alternativa para `buildAdjacency` | **B** (datos adjuntos a `panels` con clave Symbol, identidad comprobada) |
| D-F2A3-2 | Mecanismo de integración | Bundle experimental aparte que resuelve `./core/engine.js` al selector (sin cambiar `src/`); bundle normal = `dist-a9` |
| D-F2A3-3 | Modo por defecto del bundle experimental y forma de activar el modo activo | Sombra por defecto; activo solo por acción explícita en la consola de depuración, visible y no persistente |
| D-F2A3-4 | `validate()` del motor experimental | Mismo `validateDieline` del legacy + diagnósticos f2a2 aparte |
| D-F2A3-5 | ε en el bundle experimental | 0,05 mm como parámetro experimental declarado (DP-3), visible en el log |
| D-F2A3-6 | Base al cambiar de documento o de motor (KI-30) | Reiniciar a `defaultBaseIndex` del motor en uso |
| D-F2A3-7 | Modo congelado de depuración | Solo en el bundle experimental y solo con la depuración activa; medir su coste |
| D-F2A3-8 | Interfaz de diagnósticos (I-6) | Bloque aparte con autorización (toca `src/ui/`) |
| D-F2A3-9 | Presupuesto de memoria y rendimiento para pasar del modo sombra al activo en CEP | Definir tras medir en CEP real; el criterio 5 sigue pendiente (D-F2A2P-1) |
| D-F2A3-10 | Excepciones: aceptar `ErrorPanelModel` (con código) frente a los `TypeError` del legacy | Aceptar: ambos los captura el mismo `try/catch` |

## 12. Archivos que una implementación futura necesitaría modificar o crear

**Nuevos (bloques I-1…I-5, sin tocar `src/`):** `experimental/integracion/motor-v1.js`, `experimental/integracion/selector.js`, `experimental/integracion/package.json`, `tools/build/build-experimental.mjs`, `tests/experimental/f2a3-motor.test.mjs`, `tests/experimental/f2a3-selector.test.mjs`, `tests/experimental/f2a3-bundle.test.mjs`, `tests/experimental/f2a3-navegador.test.mjs`, documentación `docs/fase2/F2A3_*`.
**Existentes que cambiarían:** `tools/a4/a4.sh` y su procedimiento (instalar y retirar la extensión experimental con otro ID; I-5); `tools/verify-isolation.sh` (reconocer la extensión experimental como no autorizada salvo con autorización fechada); `HANDOFF.md`. **Solo con I-6 (autorización aparte):** `src/ui/fold-controls.js`, `src/ui/controller.js` (y, por tanto, las pruebas de F1 que fijan su texto: `a9-texto-identico`, `a9-limites`, y la huella `dist-a9` del bundle normal si el cambio entra en él).
**No se tocarían:** `src/core/engine.js`, `src/core/legacy/`, `src/main.js`, `src/scene/`, `src/fold/`, `src/export/`, `panel/`, `reference/`, goldens, huellas, fixtures, `tests/run-all.sh`, `experimental/geometria/` (salvo una intervención de rendimiento del núcleo autorizada, D-F2A2P-1).

## 13. Pruebas ejecutadas en esta preparación

| Prueba | Resultado [MEDIDO] |
|---|---|
| `tests/experimental/f2a3-contratos.test.mjs` (commit `9954414`) | 21/21 |
| `tests/run-all.sh` sobre `9954414` | **TODO EN VERDE** (`EXIT_RUN_ALL=0`): aislamiento OK, build verificado (`dist-a9`), Node 662 + 1 omitida, navegador 52 · a7 13 · a8 31 · a9 32 · Chromium-99 4 · puente 6 · a5-observar 3 · A4-CDP 7 |
| después, `tests/run-experimental.sh` | **343/343** (`EXIT_EXPERIMENTAL=0`) = 322 anteriores + 21 de contrato |
| `tools/verify-isolation.sh`, `node tools/build/build.mjs --verify` | verdes al inicio y al cierre; bundle normal sin ninguna marca del núcleo ni del adaptador |
Evidencia: `docs/fase2/evidencia/run-all-F2A-3-propuesta.txt`. Sin fallos intermitentes; no se repitió ninguna batería.
