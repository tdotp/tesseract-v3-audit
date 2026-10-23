# 06 — Plan detallado de la Fase 1: Base técnica y modularización sin cambios visibles

Estado: **propuesto; no iniciado.** Requiere tu aprobación del diagnóstico y las decisiones D1–D8 (doc 00 §6).

> **Revisión 2026-10-23:** tras tus prioridades, el esfuerzo y el orden de tareas se reemplazan por `09_ESTIMACION_FASE1_REVISADA.md` y las decisiones por `08_DECISIONES_D1_D8.md`. Los criterios de aceptación detallados de abajo siguen vigentes salvo donde el doc 09 indica cambios.

## 1. Objetivo y alcance

**Objetivo:** dejar el plugin actual en una base modular, probada, construible a un solo bundle y medible, **sin cambiar lo que el usuario ve ni cómo se comporta**, salvo una corrección acotada: la fuga de recursos H1 (F1-10, aislada).

**Dentro:** repo V3 · pipeline de build (IIFE) e instalación paralela · pruebas de caracterización y golden masters · extracción de `host`, `bridge`, `core/legacy`, `scene`, `export`, `ui`, `state`, `app` · `ResourceTracker` y fix de fugas · validación en Illustrator · spike de viabilidad WebGL/PBR en CEP (sin código de producción) · medición base dentro de CEP · ADRs.

**Fuera (explícito):** cambiar el motor geométrico, curvas/huecos, política de tolerancia (Fase 2) · materiales/PBR/entorno, actualizar three (Fase 3) · acabados (4) · GLB en metros/OBJ/PNG nuevo (5) · integraciones Photoshop/Dimension (6) · rediseño UX/UI (7) · editor 2D, render fotográfico, path tracing, IA generativa (no son V3).

**Regla de comportamiento:** el plugin V3-Fase1 debe dar, para los mismos fixtures, los **mismos paneles, adyacencias y áreas** que el plugin actual — incluido el defecto de 11/13 paneles en `caja-botanica-real.json`, que queda documentado como *known issue* hasta la Fase 2.

## 2. Resumen de tareas, esfuerzo y orden

Esfuerzo en **días de trabajo asistido** (jornada con Claude escribiendo/ejecutando y Tato validando). **Estimación mía, ±40 %**, sin medición histórica previa de este equipo; el mayor factor de incertidumbre son las validaciones manuales en Illustrator (esperas, ciclos de reinicio de CEP).

| ID | Tarea | Resp. | Esfuerzo | Depende de | Puerta |
|---|---|---|---|---|---|
| F1-01 | Esqueleto del repo V3 (git, licencia, README, estructura, docs, `PROVENANCE.md`) | Claude | 0.5–1 | D1, D8 | |
| F1-02 | Banco de caracterización: fixtures + golden masters + pruebas contra el código **sin mover** | Claude | 1–1.5 | F1-01 | |
| F1-03 | Pipeline: esbuild→IIFE, `panel/` con manifiesto V3, `install.sh` (instalación paralela, ID propio) | Claude | 1–1.5 | F1-01 | |
| F1-04 | Panel V3 mínimo carga en Illustrator + **medición base en CEP** (protocolo doc 05 §6) | **Tato** + Claude | 0.5–1 | F1-03 | **G1** |
| F1-14 | Spike de viabilidad WebGL2/PBR en CEP (panel desechable, sin código de producción) | Claude + Tato | 0.5–1 | F1-03 | (informa Fase 3) |
| F1-05 | `host`: ExtendScript a `.jsx` + `bridge` (evalScript→Promise, fs) | Claude + Tato | 1–2 | F1-04 | |
| F1-06 | `core/legacy`: extraer geometría pura sin cambiarla + pruebas | Claude | 1.5–2.5 | F1-02 | **G2** |
| F1-07 | `state` + `scene` (renderer, órbita, paneles, bisagras, etiquetas, arte, picking) | Claude | 2–3 | F1-06 | |
| F1-08 | `export`: GLB y PNG como funciones puras + pruebas estructurales | Claude | 1–1.5 | F1-07 | |
| F1-09 | `ui` (paneles DOM) y `app` (composición), mismos IDs/atajos/CSS | Claude | 1.5–2.5 | F1-07 | |
| F1-10 | `ResourceTracker` + corrección de fugas H1 (único cambio de comportamiento) | Claude | 0.5–1 | F1-07 | |
| F1-11 | Calidad: tipado, límites de importación, licencias, presupuesto de tamaño | Claude | 0.5–1 | F1-03 | |
| F1-12 | Validación de paridad en Illustrator + correcciones | **Tato** + Claude | 1–2 | F1-08, F1-09, F1-10 | **G3** |
| F1-13 | ADRs y cierre de Fase 1 (informe, known issues, lista para Fase 2) | Claude | 0.5 | F1-12 | |
| | **Total** (suma de los rangos; F1-14 incluida) | | **13–22** | | |

Camino crítico ≈ F1-01→03→04→05→06→07→09→12→13 ≈ 10–16 días (suma de sus rangos); F1-02, F1-08, F1-10, F1-11, F1-14 corren en paralelo a partes del camino.

**Puertas (go/no-go):**
- **G1** (tras F1-04): el panel V3 mínimo carga en Illustrator sin errores de consola y las medidas base están guardadas. Si no carga → resolver R1 antes de mover código (plan B: bundle con cadenas/`<script>` clásico múltiple).
- **G2** (tras F1-06): los números del `core/legacy` coinciden con los golden masters. Si no → no se avanza a escena.
- **G3** (tras F1-12): lista de paridad firmada por Tato.

## 3. Tareas en detalle

### F1-01 — Esqueleto del repo V3
- **Entregables:** `git init` con rama `main`; `LICENSE` propietario (mismo titular que el repo web); `README.md`; árbol de carpetas del doc 03 §2 (vacías con `.gitkeep`); `docs/fase0/` (estos documentos); `third_party/PROVENANCE.md`; `.gitignore`; configuración local de git con autor = Gerardo y **sin plantillas de trailers**.
- **Aceptación:** `git log --format='%an'` muestra un solo autor; ningún commit contiene `Co-Authored-By` ni "Generated with"; no existe ningún `remote` ni push sin tu OK; `pnpm install --frozen-lockfile && pnpm build && pnpm test` pasa en un clon limpio (aunque `build` y `test` sean triviales en este punto).
- **Nota:** nombre/privacidad del repo remoto, si lo hay, lo decides tú.

### F1-02 — Banco de caracterización
- **Qué:** guardar como fixtures (`tests/fixtures/`): `caja-botanica-real.json`, `caja-botanica-real.svg`, `caja-botanica-illustrator-export.svg` (de `tesseract-web`, con procedencia), los casos sintéticos de `tools/baseline/bench.mjs` (huecos, curvas, rejillas), y los dos GLB de evidencia. Generar **golden masters** ejecutando el código actual sin moverlo: nº de paneles, áreas por panel, adyacencias (pares y `creaseIdx`), árbol de plegado desde cada base posible, estructura del GLB (nodos, materiales, accesores, imágenes).
- **Aceptación:** `pnpm test` ejecuta pruebas que **fallan si cambia cualquiera de esos números**; documentan explícitamente los defectos actuales como *expected current behaviour* (p. ej. `11 paneles / −1347.573 mm²` para el fixture JSON; panel que desaparece con ventana centrada); el código bajo prueba es el `main.js` original extraído por rangos (como `bench.mjs`), no una reescritura.
- **Riesgo:** los rangos de línea son frágiles; mitigarlo con una comprobación de huella (hash) del `main.js` y mensaje claro si cambia.

### F1-03 — Pipeline de build e instalación paralela
- **Qué:** esbuild (IIFE, ES2020, sin minificar en desarrollo, `sourcemap` externo), copia de `panel/` (HTML, CSS, `libs/three.min.js` r132 sin cambios, iconos) a `dist/`; manifiesto V3 con **ID propio** (`com.tato.tesseract.v3.panel`), mismo CSXS 12.0 y host `ILST`; `tools/install.sh` que copia `dist/` a `~/Library/Application Support/Adobe/CEP/extensions/tesseract-v3/` y **se niega** a escribir en `/Library/.../extensions/tesseract`; `.debug` solo en el build de desarrollo.
- **Aceptación:** `pnpm build` produce `dist/` reproducible; el bundle no contiene `import`/`export`/`require`; `install.sh --dry-run` imprime el destino y verifica que no es la carpeta del plugin instalado; tamaño del bundle ≤ el actual + 10 %.

### F1-04 — Panel mínimo en Illustrator y medición base (puerta G1)
- **Tato:** instala con `install.sh`; abre Ventana ▸ Extensiones ▸ Tesseract v3; ejecuta el protocolo del doc 05 §6 en **el plugin copiado con otro ID** y en el panel V3 mínimo; guarda resultados.
- **Claude:** prepara el panel mínimo (muestra versión y confirma que `window.__adobe_cep__` responde con `evalScript`), el script de recogida y la plantilla de resultados.
- **Aceptación:** panel V3 carga sin errores en consola; existe `tools/baseline/results/cep_<máquina>_<fecha>.json` con los datos de §6 del doc 05 sobre al menos 2 documentos (el troquel conocido y uno complejo); versión de Chromium confirmada con `navigator.userAgent`.

### F1-14 — Spike de viabilidad WebGL2/PBR en CEP
- **Qué:** panel desechable (fuera del producto) con `MeshPhysicalMaterial`, un mapa de entorno, dos texturas de 2048² y una máscara de `clearcoat` de prueba; medir FPS al orbitar, memoria de proceso y errores de consola; probar un `Worker` simple.
- **Aceptación:** informe de una página con: soporta/no soporta (WebGL2, extensiones usadas por three r132 y por una versión posterior), FPS, memoria con 1/3/6 mapas, recomendación de calidad por defecto y de plan B. **No** produce código de producción.

### F1-05 — `host` y `bridge`
- **Qué:** mover `EXTRACT_SCRIPT` y `buildArtworkExportScript` a `src/host/*.jsx` **con el mismo texto**; cargar con `<ScriptPath>` o con `$.evalFile` (decidir tras prueba); `bridge/cep.ts` con `evalScript` como Promise, error uniforme y detección de entorno (CEP vs pruebas); `bridge/fs.ts` para `cep.fs.writeFile`.
- **Aceptación:** con el mismo documento de prueba, el JSON extraído por V3 es **idéntico byte a byte** al del plugin actual (comparación hecha por Tato con un botón de "copiar JSON" o por el golden); extracción y arte funcionan; el error "no hay documento" y "no se encontró capa de corte" se muestran como hoy.
- **Riesgo:** R4; plan B documentado (cadenas generadas en el build).

### F1-06 — `core/legacy` (puerta G2)
- **Qué:** extraer sin modificar: `validateGeometry`, geometría 2D auxiliar, `buildTopology`, contornos/shells/huecos, `buildPanels`, adyacencia (3 variantes), árbol de plegado, signo de pliegue. Las dependencias de `log`/constantes pasan por parámetros o un módulo de configuración. Sin acceso a DOM ni three.
- **Aceptación:** pruebas F1-02 pasan sobre el módulo extraído (no sobre el `main.js`); `core/` no importa `three` ni `document` (verificado con la regla de límites); diferencia de salida con el original = 0 en todos los fixtures.

### F1-07 — `state` y `scene`
- **Qué:** contenedor de estado con acciones y selectores que reemplaza las ~35 variables de clausura; `scene/`: renderer y bucle (idéntico por ahora: sigue renderizando continuo; el modo bajo demanda es de Fase 3), órbita propia, paneles (`ExtrudeGeometry`), bisagras/puentes, etiquetas, arte (overlays y UV por artboard), picking de panel/crease. Se **conservan** `renderOrder` (33, 32, 60, 90, 95, 120), offsets (`ART_*`, `CREASE_*`), materiales y luces.
- **Aceptación:** capturas de referencia (3 poses por fixture: plano, 45°, 90°) generadas con el plugin actual y con V3 son equivalentes (diferencia de píxel por debajo de un umbral acordado, medida en el arnés de navegador); picking devuelve los mismos índices; sin cambios visuales a ojo en Illustrator.

### F1-08 — `export`
- **Qué:** `buildGLBBlobFromCurrentView` y `exportPNG` extraídos a funciones que reciben datos (malla/material/textura) y devuelven bytes; el GLB se sigue escribiendo **en mm y con la misma estructura** (el cambio a metros es Fase 5); guardado vía `bridge`.
- **Aceptación:** para el fixture, el GLB generado tiene el mismo número de nodos/mallas/materiales/accesores/imágenes que el de referencia (`Tesseract_Test_Claude_export_plugin.glb`: 93/93/4/…/2) y se abre en Blender; el botón de PNG sigue oculto (no se cambia la UI aquí).

### F1-09 — `ui` y `app`
- **Qué:** vistas DOM (importación, visor, tabs, panel de pliegue) sobre el store; mantener `index.html`/ids, CSS y atajos (Shift+clic base, Alt+clic crease, Esc); `buildFoldUI` deja de estar en línea con `style.cssText`.
- **Aceptación:** lista de interacciones del doc 02 §6 completa y equivalente; ningún `id` obligatorio desaparece; el estado de la UI se deriva del store (sin variables globales).

### F1-10 — `ResourceTracker` y fix de fugas (único cambio de comportamiento)
- **Qué:** registrar y liberar geometrías/materiales/texturas de etiquetas y visuales de crease; crear etiquetas/visuales una vez y actualizar posición/rotación en cada tick (no reconstruir).
- **Aceptación (automatizable):** `measure_ui.js` tras 100 ticks → **Δ texturas = 0, Δ buffers = 0, Δ VAOs = 0, Δ geometrías ≈ 0** (±3); costo por tick ≤ el actual; mismo aspecto visual. Commit propio y con mensaje que lo describe como corrección.

### F1-11 — Calidad
- **Qué:** `tsc --noEmit` en `core`, `scene`, `export`, `state`; reglas de límites (dependency-cruiser); `tools/check-licenses` (lista de dependencias de producción y desarrollo con su licencia, falla ante GPL/AGPL); presupuesto de tamaño del bundle.
- **Aceptación:** los cuatro comandos corren en un solo `pnpm check` y fallan cuando se viola una regla (se prueba rompiéndola a propósito).

### F1-12 — Validación de paridad en Illustrator (puerta G3)
- **Tato**, con el documento de prueba y 1–2 troqueles reales, comparando plugin actual (o su copia) vs V3: (1) extracción y validación, (2) paneles/base/clics, (3) sliders por crease/ALL/reset/signo, (4) espesor y stock, (5) arte Front/Back y Tiro/Retiro (artboards y capas), (6) GLB abre en Blender, (7) sin errores en consola, (8) medidas del doc 05 §6 no peores que la base (± ruido), con **fugas = 0**.
- **Aceptación:** lista firmada por Tato; desvíos registrados como defectos con prioridad; cero bloqueantes abiertos.

### F1-13 — ADRs y cierre
- **Entregables:** ADR-001 (límites de módulos y reglas de dependencia), ADR-002 (build IIFE y por qué no módulos ES), ADR-003 (ID de bundle e instalación paralela), ADR-004 (render/recursos: `ResourceTracker`); informe de cierre con *known issues* heredados (11/13, huecos, curvas, topología n^2.5, extracción con grupos anidados), resultados de F1-14 y el plan de Fase 2 refinado con lo aprendido.
- **Aceptación:** el informe lista cada hallazgo del doc 00 con estado (corregido / preservado a propósito / diferido a Fase N).

## 4. Criterios de salida de la Fase 1 (todos)

1. G1, G2 y G3 superadas.
2. `pnpm check` verde en un clon limpio; bundle IIFE; instalación paralela sin tocar el plugin actual.
3. Paridad: mismos paneles/adyacencias/áreas/GLB estructural que el plugin actual para todos los fixtures; mismas interacciones.
4. Fugas H1 = 0 (sonda automática).
5. Medidas base en CEP guardadas; informe del spike F1-14.
6. Documentación al día (ADRs, *known issues*, procedencia, licencias).
7. Sin atribución de IA en el historial; autor único; nada publicado sin tu autorización.

## 5. Riesgos específicos de la Fase 1 y respuesta

| Riesgo | Respuesta |
|---|---|
| R1 el bundle no carga en CEP | G1 antes de mover código; plan B de carga clásica |
| R2/R3 regresiones y "arreglos" involuntarios | Caracterización antes de mover; tarea F1-10 como única excepción, aislada |
| R4 `.jsx` cambia el contexto | Mover texto idéntico, comparar JSON; plan B de cadenas |
| Tus validaciones tardan | Priorizar listas cortas por tarea; automatizar lo posible en el arnés |
| Los rangos de línea de las pruebas se rompen | Hash de `main.js` + mensaje explícito |

## 6. Qué necesito de ti para arrancar

D1–D8 (doc 00 §6), 2–3 troqueles reales adicionales (ideal: uno con curvas, uno con ventana, uno grande), el documento de prueba de Illustrator del GLB de referencia, y confirmar el equipo/SO de destino mínimo.
