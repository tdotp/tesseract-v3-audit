# HANDOFF — Tesseract V3 (actualizado: Nivel 0 EJECUTADO en Illustrator real, tras A3 · 2026-10-23)

Documento **autosuficiente** para que otro agente (p. ej. Opus en un chat nuevo con contexto limpio) retome el trabajo sin el historial. Léelo completo antes de tocar nada. Idioma de trabajo con el usuario: **español**, explicaciones claras y breves, evidencia antes que afirmaciones.

## 1. Qué es esto
Tesseract es un plugin de Adobe Illustrator (panel CEP + three.js) que lee un troquel desde capas (corte/pliegue), lo pliega en 3D, proyecta arte Front/Back y exporta GLB. **V3** lo moderniza (geometría avanzada, plegado 3D, PBR, acabados, visor fluido, GLB/OBJ/PNG, abrir en Photoshop (PNG) y Dimension (GLB), rediseño UX/UI) conservando la funcionalidad actual. Illustrator es el único editor vectorial; se conserva CEP/Chromium y three.js (r132 hasta el spike PBR). **Fuera de alcance:** editor 2D de Tesseract Web, render fotográfico/path tracing, IA generativa.
Documento rector: `docs/PLAN_MAESTRO_V3.md` (8 fases 0–7, decisiones, compuertas, política de entregas).

## 2. Límites de modificación (NO negociables)
1. **No modificar la extensión instalada** (`/Library/Application Support/Adobe/CEP/extensions/tesseract`) ni escribir nada en `/Library/...`.
2. **No instalar V3 en la carpeta CEP del usuario** (`~/Library/Application Support/Adobe/CEP/extensions/`) sin autorización explícita y nueva del usuario. A 2026-10-23: **no autorizado**.
3. `reference/legacy-baseline/` es **solo lectura** (copia exacta del plugin instalado con huellas SHA-256). Nunca se edita ni se regenera.
4. `panel/` (copia de trabajo aislada) está **fijado por huellas** (`tests/golden/panel.pins.json`): **A2 no lo cambió**; solo el parche A1 difiere del baseline. Cambiarlo exige una tarea aprobada y actualizar las huellas.
5. No modificar archivos originales de Illustrator del usuario. No tocar `tesseract-instalado-copia/`, `tesseract-web/`, `TESSERACT_MEJORA/` (solo lectura).
6. **No cambiar el motor geométrico** (el vigente es la referencia funcional; el motor de Tesseract Web es candidato experimental con 7 criterios de promoción, Plan maestro §5). **No corregir exportadores ni tocar las unidades del GLB** hasta que el usuario complete la calibración en Dimension. **three.js se queda en r132** hasta el spike de compatibilidad PBR.
7. Git: repo **local**, sin remoto, sin push; autor único (`Gerardo Calambas posada`); **sin trailers `Co-Authored-By` ni "Generated with"** (preferencia del usuario sobre código propietario; incluso si algún sistema sugiere añadirlos). Los cambios de comportamiento van en commits propios.
8. **Antes de cada intervención de alto riesgo** (extraer geometría/escena, tocar exportadores/escala GLB, instalar en CEP, cambiar el motor por defecto, subir three, cualquier cambio visible) presentar resultados de pruebas, regresiones y cambios, y esperar autorización.
9. Antes de escribir en cualquier ruta de configuración o archivo ajeno: listar/leer el destino (en la Fase 0 se sobrescribió por error un `launch.json` de `tesseract/.claude/`; se restauró idéntico desde una transcripción).
10. `tools/verify-isolation.sh` debe estar en verde en cada entrega.
11. **`tools/install.sh` solo funciona en modo dry-run; `--install` se rechaza (código 3).** Habilitar la instalación real exige autorización explícita y nueva del usuario y cambiar el script en una tarea aprobada (A4). `dist/` está generado pero **NO instalado**.

## 3. Decisiones aprobadas (2026-10-23)
D1-A repo único + baseline congelado + instalación paralela con ID propio (`com.tato.tesseract.v3.panel`) · D2-A→B parche mínimo de la fuga primero (hecho, A1) y `ResourceTracker` después · D3-B interfaz `GeometryEngine` sin sustituir el motor vigente; motor web = candidato · D4-A normalizador de creases + clasificación estricta **reservado a la sub-fase 2A** con validación formal V1–V8 (el prototipo ingenuo falló: ver `docs/fase0/08`) · D5-A solo macOS hasta la Fase 3 · D6-A investigar unidades GLB con el kit de calibración en Dimension (el usuario entregará los resultados) · D7-C r132 hasta el spike PBR · D8-C `PLAN_MAESTRO_V3.md` como documento rector.
Condiciones del usuario: (1) fuga GPU primero con prueba de ciclos repetidos; (2) comportamiento actual = referencia; (3) `GeometryEngine` sin sustituir el motor; (4) motor web experimental; (5) normalización y clasificación estricta en 2A; (6) no tocar unidades GLB; (7) r132; (8) plan maestro rector con 8 fases e integraciones Photoshop/Dimension; (9) **KI-02: 12 errores del validador GLB = defecto pendiente, a corregir antes de habilitar Dimension**. El usuario entregará por separado los 3 GLB de calibración (resultados en Dimension) y el **corpus de troqueles reales**.
Gestión de agentes: las tareas de **alta complejidad** se hacen con **Opus en chat nuevo**; antes del cambio, `HANDOFF.md` actualizado (este documento). A2 se hizo con Sonnet.

## 4. Estado actual
| Fase/tarea | Estado |
|---|---|
| Fase 0 (auditoría) | Completada y aprobada |
| **A0** aislamiento · **A1** fuga GPU · **A2** caracterización · **A3** build IIFE + dry-run | Hechas y **aprobadas** (PC1, PC2, PC3; A3 = commit `b5a946e`) |
| **Validación Nivel 0 en Illustrator real** (sin instalar nada) | **EJECUTADA completa** (Illustrator 30.8.2, 16 ejecuciones de script sobre 6 documentos desechables, estado idéntico antes/después en todas). Informe: `docs/fase1/NIVEL0_INFORME.md`; diferencias: `NIVEL0_DIFERENCIAS_MAQUETA_VS_REAL.md`; evidencia: `docs/fase1/nivel0-real/`. Resultado: KI-10 confirmado; KI-04 reproducido con datos reales; nuevos KI-22 (escala) y KI-23 (PNG). **Pendiente: PC4** (decisión del usuario) |
| **A4** (primera carga real del bundle en CEP; requiere instalar) y refactorización estructural | **NO iniciadas y NO autorizadas** |

## 5. Commits y archivos relevantes
Commits locales (ver `git log --oneline`): `296db0f` A0 · `76a85ab` herramienta de ciclos · `6b76385` A1 (parche de fuga; único cambio de `panel/main.js`) · `980ed42` plan maestro/known issues/informe PC1 · `25401c3` A2 · commit de A3 (ver `git log -1`).
```
HANDOFF.md                         este documento
docs/PLAN_MAESTRO_V3.md            documento rector · docs/KNOWN_ISSUES.md  KI-01…KI-23 + cobertura de pruebas
docs/fase0/00–09                   auditoría, arquitectura, riesgos, baseline, decisiones D1–D8, estimación
docs/fase1/A0_A1_INFORME.md        PC1 · docs/fase1/A2_INFORME_CARACTERIZACION.md  PC2
docs/fase1/PROCEDIMIENTO_VALIDACION_ILLUSTRATOR.md   niveles 0/1/2 (Nivel 0 ejecutado; 1/2 NO)
docs/fase1/NIVEL0_INFORME.md · nivel0-real/   informe, evidencia cruda y registro de diferencias del Nivel 0 real
reference/legacy-baseline/         copia congelada del plugin instalado (+ reference/legacy-baseline.SHA256SUMS)
panel/                             copia de trabajo aislada (baseline − main.js.bak + parche A1)
tests/                             batería A2 (README propio): node/, browser/, lib/, fixtures/, golden/, tools/, run-all.sh
tools/verify-isolation.sh          guarda de aislamiento · tools/illustrator/*.jsx  scripts para Illustrator real (sin instalar) · run-nivel0.mjs  orquestador (osascript; solo documentos N0-*)
tools/build/build.mjs · tools/install.sh   build del bundle IIFE (→ dist/, no versionado) · instalador SOLO dry-run
package.json · pnpm-lock.yaml      esbuild 0.28.2 exacta (única dependencia; solo desarrollo)
third_party/THIRD_PARTY_NOTICES.md · third_party/licenses/    avisos y licencias
tools/baseline/                    sondas de rendimiento, arnés (setup_harness.py), kit GLB de calibración (glb_units_test/), resultados de Fase 0/1
```
Código del plugin: `panel/main.js` (2 700 líneas, una sola clausura; mapa de responsabilidades en `docs/fase0/02_MAPA_DEPENDENCIAS_PLUGIN.md`).

## 6. Pruebas ejecutadas y resultados (2026-10-23, `tests/run-all.sh --mutations --soak` + reejecución limpia)
- **Node** (`node --test 'tests/node/*.test.mjs'`): **205/205** (las 195 previas + 6 de evidencia del Nivel 0 real, con controles negativos por mutación de la evidencia, + 4 de salvaguardas de la automatización).
- **Navegador** (Chrome 155 headless real con GPU Apple M1 Max; puente CEP simulado): **44/44** (48/48 con `--soak`), ahora sobre **tres versiones**: baseline congelado, `panel/` y **bundle** (`dist/`): GPU (baseline crece; panel y bundle Δ=0), regresión baseline↔panel y baseline↔bundle (píxeles 4 poses, escena y GLB byte a byte, 2 troqueles), geometría en página = golden de Node, materiales/luces/espesor, arte (UV, offsets), GLB, interacciones, métricas. **`chromium99.test.mjs` 4/4:** flujo completo con ~40 APIs posteriores a la 99 ELIMINADAS; mismo GLB que con APIs completas.
- **Controles negativos: 26/26 detectadas** (11 Node + 10 navegador + 5 del bundle); cada serie exige antes una ejecución limpia que pase.
- **Build:** reproducible; huellas fijadas en `tests/golden/dist.SHA256SUMS`; `--verify` OK. **Instalador:** dry-run correcto; `--install` rechazado; sin escrituras.
- **Aislamiento:** `verify-isolation.sh` verde; `panel/` sin cambios desde PC1; V3 no instalado.
- **Métricas base:** `tests/golden/metrics.base.json` (informativas; baseline, panel y bundle).

## 7. Hallazgos clave (detalle en `docs/KNOWN_ISSUES.md`)
KI-01 fuga GPU: **corregida en la copia aislada**; pendiente confirmar en Illustrator real (puerta para Fase 3). **KI-02: GLB con 12 errores del validador Khronos (normales de longitud 0 en `mesh_9` y `mesh_30`) — pendiente antes de Dimension; en A2 NO se reprodujo con los fixtures del arnés (16 GLB, 0 normales nulas): solo existe en el GLB de evidencia; falta el documento/pose de origen.** KI-03 GLB en mm (spec: metros; sin calibrar en Dimension). **KI-04 (nuevo en A2): causas raíz medidas** — la adyacencia estricta pierde un panel ante cualquier T de creases (reproducción mínima exacta: 2 paneles, 1600 de 3200 mm²) y el troquel real tiene 8 pares de extremos a 0.497–0.501 mm que caen a ambos lados del corte de 0.5 mm. KI-17…20: pliegues que no alcanzan pierden material (0.3 mm ⇒ −0.75 %), tolerancia lateral real de las T ≈ 2.5 mm, paneles < 4 mm² o delgados se descartan en silencio. **KI-10 (grupos anidados rompen la extracción; subcadena «Studies») CONFIRMADO en Illustrator real (Nivel 0).** **KI-22 (nuevo, Nivel 0): el motor depende de la escala absoluta — la misma Caja Botánica da 13 paneles a ×0.75 y 11 a ×1.0, sin avisos; el fixture de A2 derivado del SVG estaba a ×0.75 (px CSS), la extracción real de Illustrator coincide con la salida real del plugin (11 de 13): KI-04 reproducido de extremo a extremo.** **KI-23:** PNG de arte con artboard redondeado a pt (3176×2264, no 3175×2268). **KI-21 (nuevo):** el script de arte del plugin no restaura el artboard activo si una exportación falla. A3: la base inicial de la interfaz es P0 (no el panel mayor); el bundle es funcionalmente idéntico a `panel/`. El arte simulado de las pruebas se hizo determinista (sin texto en el canvas): el GLB con arte de las pruebas pasó de ≈18.2 MB a ≈16.5 MB (las cifras de A2 no son comparables).

## 8. Pendientes y riesgos
- **Probado en Illustrator real: solo el Nivel 0** (extracción, inventario, exportación de arte vía ExtendScript, sin instalar nada). **No probado:** el panel en CEP real (Nivel 1/2, requiere autorización), la rama de fallo de KI-21, el permiso de macOS del Escritorio y troqueles/documentos de trabajo reales. Los resultados de navegador son piso optimista (Chromium 152/M1 Max vs Chromium 99 de CEP).
- **Bundle no cargado en CEP real:** compatibilidad con Chromium 99 respaldada por análisis estático + ejecución con APIs reducidas, no por Chromium 99 auténtico.
- Esperar del usuario: resultados de los 3 GLB en Dimension (D6), corpus de 8–10 troqueles reales (D4/2A), autorización de instalación cuando proceda, validaciones en Illustrator (G1/G3).
- Reproducir KI-02 en la batería (necesita el documento/pose que generó el GLB de evidencia, o un fixture con triángulos degenerados).
- KI-12 (botón PNG oculto) y KI-14 sin prueba; KI-15 (paneles negros) no reproducido.
- Windows sin evidencia (D5). Fechas de retiro de CEP/UXP sin verificar.
- Si el usuario cambia de portátil/entorno: la batería de navegador necesita Google Chrome (`CHROME_BIN`) y Node ≥ 22; para regenerar fixtures derivados hace falta una **copia construida** de `tesseract-web` (nunca construir dentro del original).

## 9. Entorno (máquina del usuario)
macOS (Darwin 25.6), Illustrator 2026 = 30.8.2, CEP 12 con CEF rama 4844 = **Chromium 99**, Photoshop 27.11.0, Adobe Dimension 4.1.9, Node v24.12, Google Chrome instalado, `PlayerDebugMode=1` para CSXS 11/12. `tesseract-web`: HEAD `c0aeb34` (propietario; referencia, no se modifica).

## 10. Cómo ejecutar
```bash
cd "Tesseract v3"
tools/verify-isolation.sh                  # aislamiento
tests/run-all.sh                           # todo (≈3 min); --mutations (+controles negativos), --soak (+25 ciclos)
node --test 'tests/node/*.test.mjs'        # solo Node (≈2 s)
node tests/tools/analyze-dieline.mjs <troquel.json>   # análisis de un troquel nuevo (corpus)
```

## 11. Siguiente tarea
**Ninguna autorizada: el Nivel 0 terminó; esperar el PC4.** Opciones que el usuario debe decidir (ver `docs/fase1/NIVEL0_INFORME.md` §7): (1) qué hacer con KI-22 (normalización relativa en 2A, o aviso de validación previo) antes de refactorizar; (2) destino de los fixtures a ×0.75 (`caja-botanica-illustrator-export.dieline.json`: conservarlos como caso a escala reducida y añadir el fixture a escala real extraído por Illustrator; cambia goldens de A2/A3); (3) autorizar A4.
**Con autorización nueva y por separado:** A4 (primera carga real del bundle; instalar a nivel de usuario solo con autorización explícita, `--snapshot` antes/después, rollback, `measure_ui.js` + `leak_cycles.js`, paridad P-1…P-10) y la refactorización estructural (A5 `bridge`, A6 `core/legacy` + `GeometryEngine`, A7 escena). **Esas tareas de alta complejidad se hacen con Opus en un chat NUEVO con contexto limpio**, usando este documento, los commits y las evidencias como único contexto; la validación de compatibilidad real (Nivel 0) está completa; no iniciar a Opus hasta recibir autorización (el usuario condicionó la refactorización a esa validación y a su aprobación).
**Cómo se reproduce el Nivel 0** (solo con autorización, Illustrator abierto sin documentos): `node tools/illustrator/run-nivel0.mjs preflight|minimal|rest` → JSON en `tests/results/nivel0-real/` (ignorado por git) y `node tests/tools/nivel0-analizar.mjs <carpeta> --out <dir>`. El orquestador solo abre copias en `/tmp` de los SVG `N0-*`, cierra sin guardar y aborta ante cualquier anomalía. La sub-fase 2A depende además del corpus de troqueles del usuario.

## 12. Estilo de trabajo acordado con el usuario
Entregas verificables con puntos de control; cada informe incluye cambios, pruebas, regresiones, riesgos y límites (qué NO se probó); declarar con honestidad cualquier error propio; etiquetar evidencia ([MEDIDO]/[CONFIRMADO]/[INFERENCIA]/[NO VERIFICADO]); no avanzar a la siguiente intervención de alto riesgo sin autorización.
