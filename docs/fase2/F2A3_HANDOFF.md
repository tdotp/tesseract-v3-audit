# F2A-3 · HANDOFF — continuar en un chat nuevo sin el historial

Fecha: 2026-10-28 · Commit de referencia: `8cda001ef131ce0598f05053d1a8ce9205562bff` (propuesta F2A-3 auditada) · Este documento llega en el commit documental siguiente (`git log -1`).
**Estado: F2A-3 = propuesta auditada y viable con condiciones. La implementación NO está autorizada.** El siguiente paso posible es implementar **I-1** e **I-2**, y solo con una autorización expresa en el chat nuevo.
Idioma con el usuario: **español**, explicaciones claras y breves, evidencia antes que afirmaciones, con etiquetas [MEDIDO] / [CONFIRMADO] / [INFERENCIA] / [NO VERIFICADO].

## 1. Objetivo global de Tesseract V3

Tesseract es un plugin CEP de Adobe Illustrator (panel HTML + three.js r132) que lee un **troquel** desde capas del documento (cortes y pliegues), lo convierte en paneles, lo **pliega en 3D**, proyecta el arte frontal y trasero y exporta **GLB**. **V3** lo moderniza sin perder funcionalidad: geometría robusta, plegado 3D, materiales PBR, acabados, visor fluido, exportaciones GLB/OBJ/PNG, abrir en Photoshop/Dimension y una interfaz rediseñada. Illustrator sigue siendo el único editor vectorial. Documento rector: `docs/PLAN_MAESTRO_V3.md` (fases 0–7).
- **F1** (modularización sin cambios visibles) **cerrada** en `1cc1065`.
- **F2** corrige la geometría. Empezó por **KI-22**: el motor legacy depende de la escala absoluta, y la Caja Botánica da 13 paneles a ×0,75 y 11 a ×1. Hoy F2 está en la fase **F2A**: un motor geométrico experimental exacto, validado contra un oráculo independiente, que **todavía no está integrado**.

## 2. Arquitectura actual y separación legacy / experimental

```
Tesseract v3/                          (repo git LOCAL; rama main; sin remoto configurado)
  src/                                 PRODUCTO (fuente del bundle). INTACTO desde el cierre de F1: ninguna fase F2 lo ha tocado
    main.js                            shell + raíz de composición; crea el motor: createLegacyEngine({ log }) de './core/engine.js'
    core/engine.js                     contrato GeometryEngine v1 (única implementación: 'legacy')
    core/legacy/                       motor vigente (8 módulos, texto idéntico al plugin original)
    scene/ fold/ export/ ui/ app/      escena, plegado, GLB, interfaz, estado S (consumidores del motor)
  panel/  reference/                   estáticos del paquete CEP / copia congelada del plugin instalado (solo lectura)
  dist/                                bundle IIFE construido desde src/ (no versionado); huella vigente tests/golden/dist-a9.SHA256SUMS
  experimental/geometria/              núcleo exacto F2A-1 (+ nucleoDetallado de F2A-2): predicados con expansiones, arreglo, caras, ajuste ε
  experimental/plegado/                adaptador a PanelModel v1 (adaptador.js) y adyacencias/árbol (arbol.js) — F2A-2/2R/2P
  tests/run-all.sh                     batería de F1 + F2A-0 (NO modificar)
  tests/run-experimental.sh            batería experimental (tests/experimental/*.test.mjs) — SIEMPRE después de run-all, nunca a la vez
  tests/lib/f2/                        oráculo racional exacto (F2A-0), comparadores, casos, arneses de F2A-2/2R/2P/3
  tools/f2/                            herramientas de diagnóstico, comparación, rendimiento y perfilado (fuera del producto)
  docs/fase2/                          informes de F2 (este documento incluido)
```
**Separación:** `src/` no menciona `experimental/` y el bundle normal no contiene ninguna marca del núcleo ni del adaptador [CONFIRMADO por `tests/experimental/f2a2-aislamiento.test.mjs` y verificado el 2026-10-28]. El producto sigue usando **solo el legacy**.

## 3. Historial de fases y commits relevantes

| Fase | Contenido | Commits clave | Documento |
|---|---|---|---|
| F0–F1 | auditoría; A0–A9 (modularización, build IIFE, validaciones en CEP real, revertidas) | cierre F1 `1cc1065` | `HANDOFF.md` §1–§17 |
| F2.0 | diagnóstico de KI-22 (tolerancia 0,5 mm ≈ detalles reales de 0,5 mm + adyacencia estricta KI-04) | `960cef8` `68f51ac` `7f7049b` | `docs/fase2/00…08` |
| F2A-0 | oráculo exacto independiente (BigInt), 22 sintéticos, pruebas `tests/node/f2-*` | `920d023` … `dc1d917` | `F2A0_00…07` |
| F2A-1 | núcleo experimental (expansiones, vértices simbólicos, ajuste exacto) = oráculo | `621d404` `ec72bde` `3f75984` `c14da24` | `F2A1_INFORME.md`, `F2A1_HANDOFF.md` |
| F2A-2 | adaptador a `PanelModel` v1 + árbol de plegado | `0f271a3` `95c9f33` `57a9c66` `393e230` `2a00433` | `F2A2_INFORME.md` |
| F2A-2R | auditoría 1: H-01 (uniones no colineales usadas como bisagra) y H-02 (falsos ciclos) corregidos | `693eaf1` `5597a48` `d8b4bef` `13a2d99` | `F2A2R_INFORME.md` |
| F2A-2P | optimización de `arbol.js` con salida idéntica (788/788) | `57c8c2b` `ff26426` `63db9fa` `1ed4d60` | `F2A2P_INFORME.md` |
| F2A-3 | propuesta de integración controlada + pruebas de contrato | `9954414` `8cda001` | `F2A3_PROPUESTA.md` |

## 4. Resultados de las auditorías y correcciones

- **Auditoría de F2A-2 (GPT-6):** H-01 (alta) y H-02 (media) ⇒ F2A-2R. Las uniones ahora se clasifican `plegable` / `ambigua` / `no-plegable` con aritmética exacta y sin tolerancias nuevas, y solo las plegables son bisagras. Los ciclos se calculan sobre el grafo completo, con árbol en la componente de la base y bosque generador en las demás. Antes/después: 33 de 42 casos idénticos; cambian solo los afectados [MEDIDO].
- **Segunda auditoría:** F2A-2R aprobada con condiciones; decisiones **D-F2A2R-1…4** (ambiguas bloqueadas por defecto; no plegables de A-7 conservadas y diagnosticadas; F2A-2P autorizada; pruebas explícitas de islas y creases cerradas).
- **Auditoría de F2A-2P:** cierre aprobado. Equivalencia **788/788**; 322/322 pruebas en esa fase; adyacencias y árbol 0,45–0,61× de F2A-2R; heap −20–30 %. **El criterio 5 (tiempo ≤ legacy en todos los casos) NO se cumple: 3/10**, atribuidos al núcleo. Decisiones **D-F2A2P-1…3**: umbrales sin cambiar; referencias compartidas aceptadas bajo contrato de solo lectura; `uniones` completas conservadas.
- **Auditoría de la propuesta F2A-3:** **viable con condiciones** (§6).

## 5. Contratos e invariantes vigentes

- **GeometryEngine v1** (`src/core/engine.js`): `validate(d) → {problems}`, `buildPanels(d) → PanelModel`, `buildAdjacency(panels, creaseEdges) → AdjacencyEdge[]`, `buildFoldTree(panels, adjacency, baseIndex) → FoldEdge[]`, `defaultBaseIndex(m) → número`. Invariantes I1–I10: sin DOM/THREE/estado; determinista; no muta la entrada; la salida puede compartir objetos (solo lectura); identidad de panel = índice; mm; excepciones sin envolver; log por el sink.
- **PanelModel v1:** `{panels: [{vertices CCW, edges: [{u, v, type}], area ≥ 0, centroid}], creaseEdges: [{a, b, creaseIdx, segIdx}] (a/b son anchors de la entrada), creases (la entrada)}`. El adaptador experimental lo cumple con un campo extra declarado `f2a2`, cuyo `detalle` del núcleo no es enumerable. `area` = bruta (DP-6 aplazada).
- **AdjacencyEdge** `{panelA, panelB, crease: {a, b}, creaseIdx}` · **FoldEdge** `{parent, child, crease, sign}` (pivote en `crease.a`; `sign` = +1 si el hijo está a la izquierda de a→b, misma convención que el legacy).
- **Solo lectura (D-F2A2P-2):** las salidas del motor no se mutan. En las uniones plegables, la unión, su recta y el detalle **comparten** los arreglos `creases`/`segmentos`. Los consumidores reales no mutan nada: ejecutados con modelos congelados en profundidad, de los dos motores, no hubo ni una escritura [CONFIRMADO, `tests/experimental/f2a3-contratos.test.mjs`].
- **Política geométrica:** decisiones topológicas exactas; contorno inmutable; ε = 0,05 mm **solo** como parámetro experimental de ajuste de extremos de crease (DP-3). Detalles de 0,5 mm intencionales (DP-1). 13 paneles de la Caja Botánica = candidato, no criterio único (DP-2).

## 6. Decisiones aprobadas y condiciones pendientes (auditoría de la propuesta F2A-3)

**Aprobadas:**
- bundle experimental independiente;
- legacy intacto y predeterminado;
- **modo sombra** por defecto;
- **modo activo** solo por acción explícita, visible y no persistente;
- `validate()` del legacy, con los diagnósticos experimentales aparte;
- **ε = 0,05 mm** solo en el entorno experimental;
- reinicio de la base al cambiar de documento o de motor;
- congelación profunda opcional para depuración;
- interfaz de diagnósticos como intervención aparte;
- presupuesto de rendimiento y memoria pendiente de pruebas en CEP;
- manejo explícito de `ErrorPanelModel`.

**Condiciones arquitectónicas (obligatorias para I-1/I-2):**
- **C-01 — Contrato `buildAdjacency`:**
  - La alternativa B (clave `Symbol` no enumerable en `panels`) está aprobada **condicionalmente**.
  - El símbolo es **privado del adaptador**: no se exporta.
  - Hay que verificar la **identidad** de `panels`, `creaseEdges` y las adyacencias.
  - Queda prohibido **mezclar** construcciones o documentos.
- **C-02 — Fallback atómico:**
  - Ante un fallo del experimental, la **operación completa** se reconstruye con el legacy.
  - Queda prohibido combinar paneles experimentales con adyacencias o árboles legacy.
  - El fallback es explícito, visible y trazable, y se prueba con **fallos inyectados en cada etapa**.
- **C-03 — Sombra aislada:**
  - El experimental en sombra no muta el estado de la aplicación ni cambia la salida legacy.
  - Tampoco altera la escena, el plegado, el arte ni el GLB.
  - Nunca impide que el legacy termine y no deja efectos persistentes.
  - Se exigen **pruebas adversariales**.

**Pendientes (fuera de I-1/I-2):** presupuesto de rendimiento y memoria en CEP; interfaz de diagnósticos (I-6, toca `src/ui/`); reinicio de la base en la interfaz (necesita cambiar `src/ui/`: ver §8.4); KI-30; criterio 5.

## 7. Riesgos conocidos

| Riesgo | Situación |
|---|---|
| **KI-22** (resultado dependiente de la escala) | Corregido en el motor experimental (13 paneles en las 3 extracciones con ε 0,05); el producto (legacy) sigue con el defecto |
| **KI-30** (la base persiste entre documentos) | Abierto. Con dos motores, el índice de base cambia de significado: el reinicio está aprobado, pero requiere tocar la interfaz |
| **Uniones ambiguas** (ejes paralelos desplazados, A-1) | Bloqueadas por defecto, con diagnóstico (D-F2A2R-1); nunca se usa el tramo más largo |
| **Uniones no plegables** (A-7: Illustrator real sin ajuste) | Conservadas y diagnosticadas; desconectan el modelo (D-F2A2R-2); la interfaz está pendiente |
| **Ciclos** | Solo ciclos reales (`numeroCiclomatico` = m − n + c, comprobado); las componentes desconectadas no son ciclos |
| **Memoria** | El modelo experimental retiene ≈ 160–570 kB frente a 36–128 kB del legacy (cadena completa, Node); falta medirlo en CEP |
| **Rendimiento** | Criterio 5: 3/10 casos más lentos que el legacy (histórico ×0,75 con ajuste, caja simple, rejilla 2×2: núcleo). El modo sombra duplica el cálculo (≈ 0,5–2 ms [INFERENCIA]) |
| Chromium 99 real / CEP | Solo empaquetado chrome99 y Chrome headless con APIs reducidas; nunca en CEP real |
| Carrera de pruebas `install-dry-run` ↔ `a4-herramienta` | Incidencia de infraestructura sin corregir: ejecutar las baterías **en secuencia** |

## 8. Plan detallado de I-1 e I-2 (solo con autorización expresa)

### 8.1 I-1 — Fachada `experimental/integracion/motor-v1.js`
- **API:** `createExperimentalEngine({ log, eps = 0.05, validate })` → objeto **congelado** `{ id: 'experimental-f2a2', contract: 1, validate, buildPanels, buildAdjacency, buildFoldTree, defaultBaseIndex, diagnosticos }`.
  - `validate` es el del legacy, **inyectado** (para que el módulo no importe `src/`).
  - `diagnosticos(panels, base)` queda fuera de v1.
- **Símbolo privado (C-01):** `const MODELO = Symbol('tesseract.f2a3.modelo')`, **no exportado**.
  - `buildPanels(d)` ejecuta `adaptarPanelModel` → `construirAdyacencias` y valida **todas** las bases posibles con `construirArbolPlegado`.
  - Así todo el cálculo que puede fallar ocurre en `buildPanels` (base de C-02).
  - Después adjunta, como propiedad no enumerable de `m.panels`, el objeto congelado `{ modelo, ady, creaseEdges, arboles }`.
- **Identidad (C-01):**
  - `buildAdjacency(panels, creaseEdges)` exige `panels[MODELO]` y `creaseEdges === guardado.creaseEdges`. Devuelve **siempre el mismo arreglo** de adyacencias.
  - `buildFoldTree(panels, adjacency, base)` exige `adjacency === guardado.ady.adyacencias` y una base válida.
  - Cualquier otro caso lanza `ErrorPanelModel('modelo-ajeno')`: copias, mezcla de dos construcciones, objetos de otro documento o del legacy.
- **Base por defecto:** `baseDefecto(modelo)` (área bruta, desempate geométrico).
- **Prototipo de partida:** `tests/lib/f2/motor-v1-prototipo.mjs` (ya probado).
- **Archivos nuevos:** `experimental/integracion/motor-v1.js`, `experimental/integracion/package.json` (`"type": "module"`), `tests/experimental/f2a3-motor.test.mjs`.
### 8.2 I-2 — Selector `experimental/integracion/selector.js`
- **API:** exporta `createLegacyEngine(options)`, con el mismo nombre y firma que importa `src/main.js`, para que en I-3 un *build* experimental pueda sustituir `./core/engine.js` sin cambiar `src/`.
  - Crea el legacy real (`../../src/core/engine.js`, que fija el sink de log) y el experimental (§8.1, con `validate` del legacy).
  - Devuelve un objeto v1 congelado más controles fuera de v1: `modo()`, `cambiarModo(modo, { confirmacion })`, `registro()`.
- **Estado:** solo en la clausura de esa llamada. Sin estado de módulo, sin `localStorage` y sin globales (**no persistente**).
- **Modo `sombra` (por defecto, C-03):**
  - Cada operación v1 devuelve **exactamente** lo que devuelve el legacy.
  - Después ejecuta el experimental sobre una **copia profunda** de la entrada, dentro de `try/catch`.
  - Compara un resumen (paneles, áreas, uniones, diagnósticos) y lo anota en `registro()`. **No** escribe en el log del legacy, para no cambiar su texto ni su orden.
  - Una excepción experimental nunca se propaga y nunca recibe objetos del legacy.
- **Modo `activo` (C-02):**
  - `buildPanels` intenta el experimental completo (§8.1). Si falla en **cualquier** etapa, devuelve el **modelo legacy completo** con un mensaje visible (`log`) y una entrada en `registro()` con etapa y código.
  - `buildAdjacency` y `buildFoldTree` despachan por el **origen del modelo**: el modelo experimental lleva el símbolo privado; el legacy, un `WeakSet` del selector.
  - Las adyacencias y árboles del legacy nunca se aplican a paneles experimentales, ni al revés.
- **Activación explícita:** `cambiarModo('activo', { confirmacion: 'ACTIVAR-EXPERIMENTAL' })`, con una línea de log en cada cambio. Un selector nuevo siempre arranca en sombra.
- **Congelación profunda opcional** (`options.congelar`): solo para depuración.
- **Archivos nuevos:** `experimental/integracion/selector.js`, `tests/experimental/f2a3-selector.test.mjs`.
### 8.3 Reglas de aislamiento de `experimental/integracion/`
- Solo puede importar `./x.js`, `../plegado/x.js`, `../geometria/x.js` y, únicamente desde `selector.js`, `../../src/core/engine.js`.
- Sin DOM, CEP, THREE ni `localStorage`, y sin `let`/`var` de módulo.
- `src/` sigue sin mencionar `experimental/`.
- El bundle normal sigue byte a byte en `dist-a9`.
### 8.4 Límites de I-1/I-2
- No hay *build* experimental (I-3), ni arnés de navegador del bundle (I-4), ni instalación (I-5), ni interfaz (I-6), ni CEP real (I-7).
- El **reinicio de la base** al cambiar de documento o de motor (aprobado) necesita la interfaz. En I-2 el selector solo ofrece la información (`origenDelModelo(panelData)`). El reinicio efectivo va en un bloque con autorización aparte, y se registra como condición pendiente.

## 9. Pruebas mínimas obligatorias y criterios de aceptación

**I-1:**
1. **Contrato:** forma v1 exacta y claves; mismo resultado byte a byte que la API experimental directa en los 42 casos de `tests/lib/f2/casos-plegado.mjs` (más una muestra del estrés).
2. **C-01:** el símbolo no está exportado, no es enumerable y no se serializa. Lanzan `modelo-ajeno`:
   - copias de `panels`, `creaseEdges` o las adyacencias;
   - mezclas de dos construcciones (A/B), incluidas dos construcciones del **mismo** documento;
   - un modelo del legacy;
   - otro documento.
3. Todas las bases válidas de la Caja Botánica dan el mismo árbol que `construirArbolPlegado`; una base inválida lanza `base-invalida`.
4. `validate` = legacy.
5. Entradas inválidas producen `ErrorPanelModel` con código, nunca éxito silencioso.
6. Consumidores reales con el modelo congelado (`tests/lib/f2/consumidores.mjs`): 0 escrituras.
7. Aislamiento (§8.3) y `esbuild --target=chrome99` sin avisos.

**I-2:**
1. **Sombra por defecto:** salidas y líneas de log idénticas al legacy solo, en los 42 casos y en el flujo completo de la interfaz simulado (`buildPanels` → `buildAdjacency` → `buildFoldTree`, cambio de base, segundo documento).
2. **C-03 adversarial:**
   - con experimentales inyectados que lanzan en cada etapa, que tardan, que intentan mutar su entrada o los objetos legacy, o que lanzan valores no `Error`, la salida legacy es idéntica (JSON y congelación);
   - no se tocan globales y el registro anota cada fallo;
   - la escena, el plegado y el GLB del arnés de consumidores son idénticos con el selector en sombra y con el legacy solo.
3. **C-02 atómico:** fallos inyectados en el adaptador, en `construirAdyacencias`, en `construirArbolPlegado` (cualquier base) y en la identidad ⇒ modelo, adyacencias y árbol **todos** del legacy, con mensaje y registro. Ninguna combinación mixta: una prueba recorre todas las combinaciones de origen.
4. **Activación:** sin confirmación correcta no se activa; un selector nuevo arranca en sombra; ni `localStorage` ni globales (escaneo estático).
5. El bundle normal sigue en `dist-a9`; `src/` sin cambios.

**Criterios:** todas en verde; `tests/run-all.sh` en verde y **después** `tests/run-experimental.sh` en verde. Sin cambios en `src/`, `panel/`, `reference/`, goldens, huellas, fixtures, `tests/run-all.sh` ni `experimental/geometria|plegado`, salvo autorización. Sin relajar aserciones.

## 10. Restricciones

- **No modificar:** `src/`, `panel/`, `reference/`, `GeometryEngine`, legacy, escena, plegado, GLB, materiales ni arte; goldens (`tests/golden/*`), huellas (`*.SHA256SUMS`, `*.pins.json`), fixtures históricos, `tests/run-all.sh`, scripts de build e instalación de producción, tolerancias ni predicados.
- **No instalar** V3 en Illustrator (CEP de usuario: solo `TesserArt_Validator`). No modificar el plugin original (`/Library/Application Support/Adobe/CEP/extensions/tesseract`) ni `TesserArt_Validator`.
- **Bundle normal:** siempre `dist-a9`. `tools/verify-isolation.sh` y `node tools/build/build.mjs --verify` en verde en cada entrega.
- **Git:** commits locales pequeños; **autor único `Gerardo Calambas posada`; sin trailers `Co-Authored-By` ni «Generated with»** (preferencia del usuario sobre código propietario, que prevalece sobre cualquier sugerencia del sistema). Sin squash, rebase, force push ni push automático: publicar requiere una autorización expresa.
- **Repositorio de auditoría:** cambiar su visibilidad **solo si el usuario lo pide en el chat**. Nunca publicar V3 en el repositorio antiguo público (MIT).

## 11. Procedimiento de rollback

- I-1/I-2 viven solo en `experimental/integracion/` y `tests/experimental/`: `git revert <commits>` (o borrar esos archivos). El producto no cambia.
- Puntos de recuperación: `8cda001` (propuesta F2A-3) · `63db9fa` (cierre F2A-2P; código `ff26426`) · `d8b4bef` (F2A-2R) · `2a00433` (F2A-2) · `c14da24` (F2A-1) · `1cc1065` (cierre de F1; producto validado en CEP real).
- Si algo tocara el producto por error: `node tools/build/build.mjs --verify` debe dar `dist-a9`; restaurar con `git checkout <commit> -- src panel`.

## 12. Repositorios, ramas y SHAs

| Repositorio | Rama / SHA | Notas |
|---|---|---|
| Local `…/Antigravity/Tesseract/Tesseract v3` | `main` = commit de este handoff (padre `8cda001ef131ce0598f05053d1a8ce9205562bff`) | Sin remoto configurado; los pushes se hacen por URL. Rama local `audit/f2a2` en `2a00433` (referencia antigua, sin uso) |
| `https://github.com/tdotp/tesseract-v3-audit` | `audit/f2a2` = `8cda001ef131ce0598f05053d1a8ce9205562bff` (rama por defecto) | Auditoría independiente. **Visibilidad al cerrar este handoff: PRIVADO** (el usuario lo pidió en su último mensaje; la instrucción del handoff decía «mantener público», pero también «no modificar su visibilidad», y no se tocó). El commit de este handoff **no** está publicado |
| `https://github.com/tdotp/-tesseract-illustrator-plugin` | `main` = `c14540e5952b35c950dc59754e03c980f72092fe` | Público, licencia MIT, versión antigua del plugin. **Nunca** publicar V3 aquí |
| Plugin instalado | `/Library/Application Support/Adobe/CEP/extensions/tesseract` | Original; no tocar. Copia congelada en `reference/legacy-baseline/` |

## 13. Estado de las pruebas al cerrar este handoff [MEDIDO]

Batería en secuencia sobre `8cda001` (2026-10-28), evidencia `docs/fase2/evidencia/run-all-F2A-3-handoff.txt`:
- `tests/run-all.sh` → **TODO EN VERDE** (`EXIT_RUN_ALL=0`): aislamiento OK, build verificado (`dist-a9`), Node 662 + 1 omitida, navegador 52 · a7 13 · a8 31 · a9 32 · Chromium-99 4 · puente 6 · a5-observar 3 · A4-CDP 7.
- Después, `tests/run-experimental.sh` → **343/343** (`EXIT_EXPERIMENTAL=0`).
- `tools/verify-isolation.sh` en verde; CEP de usuario: solo `TesserArt_Validator` (V3 no instalada); `dist/main.js` sin ninguna marca del núcleo ni del adaptador.

## 14. Instrucción exacta para reanudar en otro chat

1. `cd "/Users/gerardocalambasposada/Documents/Antigravity/Tesseract/Tesseract v3" && git log --oneline -3 && git status --short`. Esperado: HEAD = commit «docs(f2): handoff F2A-3 para implementacion controlada I-1 I-2», cuyo padre es `8cda001`; árbol limpio.
2. `tools/verify-isolation.sh` y `node tools/build/build.mjs --verify` (aislamiento y `dist-a9`).
3. Leer este documento entero, después `docs/fase2/F2A3_PROPUESTA.md` y `tests/lib/f2/motor-v1-prototipo.mjs`. Como referencia: `HANDOFF.md` §2 (límites) y §21–§25.
4. Opcional: confirmar la línea base con `tests/run-all.sh` y **después** `tests/run-experimental.sh` (343/343).
5. **Esperar la autorización expresa del usuario** antes de implementar I-1 e I-2. Con autorización, solo `experimental/integracion/` y `tests/experimental/`; I-3…I-7, F2B y la integración en producción siguen sin autorizar.
