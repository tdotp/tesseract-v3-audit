# F2A-3 · Entrega 1 — Integración funcional del motor experimental (I-1 a I-4)

Fecha: 2026-10-28 · Base: `5c08e11e02802ee12350d0dc27ee6c7e4f4fb58f` (handoff F2A-3) · Autorización: usuario, 2026-10-28 («Entrega 1: integración funcional», I-1…I-4 sin paradas intermedias).
**Estado: Entrega 1 COMPLETADA.** El motor experimental funciona dentro de un bundle CEP independiente, en modo **sombra** por defecto y en modo **activo** solo por acción explícita. El producto normal (`dist/`, huella `dist-a9`) no cambia y sigue usando solo el legacy. **No se ha instalado nada en Illustrator.** I-5…I-7, F2B y la integración en producción siguen **sin autorizar**.
Etiquetas: [MEDIDO] · [CONFIRMADO] · [INFERENCIA] · [NO VERIFICADO].

## 0. Resumen

| Bloque | Entregado | Pruebas |
|---|---|---|
| **I-1** fachada `GeometryEngine` v1 del experimental | `experimental/integracion/motor-v1.js` | `tests/experimental/f2a3-motor.test.mjs` (18) |
| **I-2** selector legacy/experimental (sombra / activo) | `experimental/integracion/selector.js` | `tests/experimental/f2a3-selector.test.mjs` (57) |
| **I-3** bundle experimental independiente | `tools/build/build-experimental.mjs`, `experimental/integracion/entrada-cep.js` | `tests/experimental/f2a3-bundle.test.mjs` (10) |
| **I-4** pruebas en navegador | — | `tests/experimental/f2a3-navegador.test.mjs` (6) |

- **Legacy, opción segura y predeterminada:** el bundle normal es byte a byte `dist-a9` y no contiene nada experimental [CONFIRMADO]. En el bundle experimental, el modo sombra reproduce **byte a byte** el bundle normal (GLB, log, modelo, árbol, estado) en Chrome headless [CONFIRMADO].
- **Experimental ejecutable:** con el modo activo, la interfaz real construye la Caja Botánica con **13 paneles** y 12 pliegues (el legacy da 11), pliega, aplica arte y exporta un GLB válido. Además, el modelo del navegador es idéntico al del motor en Node [CONFIRMADO].
- **Fallos aislados y sin mezclas:** en sombra, ningún fallo experimental (lance o no un `Error`, tarde, mute su entrada o devuelva basura) cambia la salida ni el log del legacy. En activo:
  - un fallo en `buildPanels` rehace **toda** la construcción con el legacy;
  - un fallo posterior **detiene** la construcción con un error explícito;
  - ninguna combinación de orígenes mezcla resultados [CONFIRMADO].

## 1. Arquitectura implementada

```
bundle NORMAL   (dist/, com.tato.tesseract.v3.panel) ─ byte a byte dist-a9 ─ src/main.js ─ './core/engine.js' ─► src/core/engine.js (legacy)
bundle EXPERIMENTAL (dist-experimental/, com.tato.tesseract.v3.experimental.panel, menú «Tesseract V3 (experimental)»)
  src/main.js (MISMO texto) ─ './core/engine.js' ─(onResolve de esbuild, SOLO desde src/main.js)─► experimental/integracion/entrada-cep.js
      entrada-cep.js ─ setTimeout(0) para la sombra + punto de control __tessMotorExperimental (no enumerable, solo lectura)
        └► selector.js (createLegacyEngine: misma firma)
              ├─ src/core/engine.js (legacy REAL, mismo objeto de opciones ⇒ mismo sink de log)
              └─ motor-v1.js (createExperimentalEngine) ─► experimental/plegado/ ─► experimental/geometria/
```

### 1.1 `motor-v1.js` (I-1)
- **API:** `createExperimentalEngine({ log, eps = 0.05, validate, congelar = false, dependencias })` devuelve un objeto congelado `{ id: 'experimental-f2a2', contract: 1, validate, buildPanels, buildAdjacency, buildFoldTree, defaultBaseIndex, diagnosticos }`.
  - `validate` es obligatorio y es el del legacy, inyectado: el módulo no importa `src/`.
  - `dependencias` solo se usa en pruebas, para inyectar fallos por etapa.
- **C-01 (alternativa B):**
  - `buildPanels` adapta el troquel y calcula **una vez** las adyacencias exactas.
  - Las adjunta a `m.panels` con `Symbol('tesseract.f2a3.modelo')`. El símbolo es **privado del módulo**: no se exporta, no es enumerable, no se puede escribir ni reconfigurar, el registro adjunto está congelado y guarda una referencia de vuelta a su propio arreglo.
  - `buildAdjacency`, `buildFoldTree`, `defaultBaseIndex` y `diagnosticos` exigen la **identidad** de `panels`, `creaseEdges` y el arreglo de adyacencias. Cualquier otro caso lanza `ErrorPanelModel('modelo-ajeno')`: copias (incluida la copia por reflexión del símbolo o por herencia de prototipo), mezclas de dos construcciones (aunque sean del mismo documento), otro documento o el legacy.
- **Árbol solo para la base pedida:** `buildPanels` no calcula ningún árbol. `buildFoldTree` calcula exactamente uno, el de su base (verificado con un espía).
- **Inmutabilidad:** las salidas son de solo lectura (D-F2A2P-2). Con `congelar: true` se congelan en profundidad (modo de depuración, D-F2A3-7).
- **Log:** por el sink inyectado, una línea por operación. En sombra el selector no le da ningún sink.

### 1.2 `selector.js` (I-2)
- **API:** `createLegacyEngine(options)` usa el mismo nombre y firma que `src/core/engine.js` y devuelve un objeto congelado:
  - v1 (`validate` = legacy en los dos modos, D-F2A3-4);
  - controles fuera de v1: `modo()`, `cambiarModo(modo, { confirmacion })`, `origenDelModelo(panelData)`, `registro()` y `congelarSalidas(v)`.
- **Estado:** solo vive en la clausura (modo, registro acotado a 200 entradas, `WeakSet` y `WeakMap` de orígenes). No hay estado de módulo, globales ni almacenamiento, y **cada selector nuevo arranca en sombra**.
- **Sombra (C-03):**
  - Cada operación devuelve exactamente lo que devuelve el legacy: los mismos objetos y excepciones, y las mismas líneas de log en el mismo orden.
  - El experimental trabaja después, programado con `programar` (en el bundle, `setTimeout(0)`). Usa una copia JSON de la entrada **tomada antes** del legacy y sus propios objetos.
  - Todo va dentro de `try/catch`; solo se anota una comparación estructurada.
- **Activo (C-02):** solo se activa con `cambiarModo('activo', { confirmacion: 'ACTIVAR-EXPERIMENTAL' })`. Cada cambio, cada rechazo y cada construcción se anotan en el log del panel.
  - **Despacho por origen del modelo, no por el modo actual:**
    - los modelos experimentales solo los toca el experimental y los legacy solo el legacy;
    - un objeto experimental (o una copia de uno) que llegue por el camino legacy da `modelo-ajeno`;
    - al cambiar de modo, los modelos ya construidos conservan su motor.
  - **Fallback atómico:** si falla cualquier cosa dentro de `buildPanels` (adaptador, adyacencias o un modelo incoherente), la construcción completa se rehace con el legacy. Se ve en el log («FALLBACK ATÓMICO…») y se anota con etapa y código. Si el experimental modificó la entrada antes de fallar, no se hace fallback: la construcción se detiene (`construccion-detenida`, motivo `entrada-mutada`).
  - **Límite de la API v1 (§3):** si el experimental falla **después** de `buildPanels` (árbol o base), la construcción se detiene con `ErrorPanelModel('construccion-detenida')`, que indica la etapa y la causa. Nunca se devuelve un árbol legacy.
- **Aviso KI-30:** en modo activo, cuando el modelo nuevo viene de otro motor que el anterior, el log avisa de que la base heredada puede designar otro panel. El reinicio efectivo de la base necesita la interfaz y sigue pendiente.

### 1.3 Bundle experimental (I-3)
- **`tools/build/build-experimental.mjs`:**
  - Usa el mismo `src/main.js`, la misma configuración de esbuild (IIFE, `chrome99`, sin minificar) y los mismos estáticos que `build.mjs`. La **única** diferencia es la sustitución de `./core/engine.js` cuando la importa `src/main.js`; se exige exactamente una sustitución.
  - Es determinista y escribe `SHA256SUMS` y `BUILD_INFO.json` (`instalado: false`). Acepta `--verify` y `--debug-port`.
  - La salida solo puede ir a `dist-experimental*` (ignorada por git) o a un temporal. Nunca a `dist/`, `panel/`, `reference/`, `src/` ni `~/Library`.
- **Identidad CEP:**
  - bundle: `com.tato.tesseract.v3.experimental`;
  - extensión: `com.tato.tesseract.v3.experimental.panel`;
  - menú: «Tesseract V3 (experimental)».
  - Respecto del manifiesto normal solo cambia la identidad.
- **Control de paridad:** la misma configuración sin sustituir el motor produce **byte a byte** el `main.js` de `dist-a9` [CONFIRMADO].
- **`entrada-cep.js`:** es la única pieza con globales. Usa `setTimeout` para la sombra y `globalThis.__tessMotorExperimental` como punto de control (no enumerable, de solo lectura, congelado). El modo **no** vive ahí.

## 2. Contrato y condiciones de la auditoría

| Condición | Cómo se cumple | Evidencia |
|---|---|---|
| **C-01** símbolo privado e identidad | Símbolo no exportado; registro con referencia de vuelta; identidad de `panels`, `creaseEdges` y adyacencias; las 7 formas de copia y las 12 mezclas dan `modelo-ajeno` | `f2a3-motor` §2; `f2a3-selector` §3 (combinatoria 4×4×3: 12 coherentes pasan, 36 rechazadas) |
| **C-02** fallback atómico | Fallo en `buildPanels` ⇒ legacy completo (paneles, adyacencias, base y árbol idénticos al legacy solo); fallo posterior ⇒ `construccion-detenida`, nunca un árbol legacy (espía: 0 llamadas) | `f2a3-selector` §3; navegador C (unidades «in») |
| **C-03** sombra aislada | Salida, excepciones y log idénticos al legacy en 41 casos, en el flujo de la interfaz con 4 documentos y en 28 escenarios hostiles (7 comportamientos × 4 etapas). Ningún objeto legacy llega al experimental; sin globales nuevos; escena, plegado y GLB idénticos | `f2a3-selector` §1–§2; navegador A |
| Legacy predeterminado | Bundle normal = `dist-a9`; experimental en sombra = normal byte a byte | `f2a3-bundle`; navegador A y F |
| Activo explícito, visible, no persistente | Confirmación exacta (6 variantes incorrectas rechazadas y visibles en el log); línea en cada construcción; al recargar vuelve a sombra; sin almacenamiento | `f2a3-selector` §4; `f2a3-bundle`; navegador B y E |
| Árbol solo para la base pedida | Espía: 0 árboles en `buildPanels`, 1 por `buildFoldTree` | `f2a3-motor` §3 |
| Inmutabilidad | Entrada intacta en todos los casos; salida congelada en Node (consumidores reales) y en el navegador (flujo, base, espesor y preset) sin escrituras | `f2a3-motor` §6; `f2a3-selector` §6; navegador D |

## 3. Límite del fallback y solución transaccional futura

- **Por qué hay un límite:** la API v1 reparte una construcción en varias llamadas que hace la interfaz (`buildPanels`, después `buildAdjacency` y después `buildFoldTree`), y la interfaz guarda cada resultado en `S` entre ellas. Por eso la atomicidad solo se puede garantizar dentro de `buildPanels`.
- **Fallos en `buildPanels`:** las adyacencias se calculan en `buildPanels`, de modo que un fallo del adaptador o de `construirAdyacencias` sí se resuelve atómicamente.
- **Fallos en `buildFoldTree` o `defaultBaseIndex`:** ocurren cuando la interfaz ya muestra los paneles experimentales. Pueden deberse a un invariante interno roto (`adaptador-incoherente`) o a una base inválida.
  - Rehacer con el legacy obligaría a mezclar o a cambiar `S` desde el motor, y las dos cosas están prohibidas.
  - Por eso se lanza `construccion-detenida`. La interfaz lo captura en «Continue to 3D» (`'3D error: …'`). En los cambios de base no hay `try/catch` en `src/ui`: la excepción queda en la consola y el árbol anterior, del mismo modelo, sigue en `S`.
  - Ningún caso real ni sintético de las pruebas provoca este fallo. Solo se observa con fallos inyectados [MEDIDO].
- **Solución transaccional (contrato v2, no autorizada):** una operación única `buildModel(d, base) → { panels, creaseEdges, adjacency, tree }` que calcule todo o nada y que la interfaz aplique de una vez. También haría falta un `try/catch` con fallback en el cambio de base de `src/ui/fold-controls.js`, que toca `src/` (bloque aparte, como I-6).

## 4. Pruebas

### 4.1 Pruebas nuevas (91)

| Archivo | n | Cobertura |
|---|---|---|
| `f2a3-motor.test.mjs` | 18 | **Contrato v1:** forma exacta y equivalencia byte a byte con la API directa en 41 casos (incluidos H-01/H-02) y 150 aleatorios degenerados. **C-01:** símbolo privado; identidad frente a copias, mezclas, legacy y otros documentos. **Bases:** árbol solo para la base pedida; las 13 bases de la Caja Botánica; bases inválidas. **Errores:** MALOS; fallos inyectados por etapa sin registro a medias. **Inmutabilidad:** congelación y consumidores reales en 5 casos; referencias compartidas; alias como el legacy |
| `f2a3-selector.test.mjs` | 57 | **Sombra:** idéntica al legacy en 41 casos, en el flujo de 4 documentos y en MALOS; orden diferido FIFO; comparación estructurada. **C-03:** 28 escenarios hostiles; experimental que no se crea; programación que falla; globales; escena, plegado y GLB. **C-02:** 4 fallos en `buildPanels`; árbol que falla en las 13 bases; base inválida y `baseDefecto`; entrada mutada; legacy que también falla; combinatoria de orígenes. **Activación:** confirmación; despacho por origen; aislamiento estático. **Activo:** base y documento con aviso KI-30; H-01/H-02 en todas las bases; consumidores con salida congelada en 5 casos |
| `f2a3-bundle.test.mjs` | 10 | **Bundle:** sustitución única; módulos incluidos; determinismo y SHA256SUMS; identidad CEP; Chromium 99. **Paridad:** byte a byte. **Bundle normal:** sigue en `dist-a9` y sin marcas; salida protegida y `.gitignore`. **Aislamiento:** punto de control (no enumerable, no persistente); aislamiento estático; extensiones CEP instaladas |
| `f2a3-navegador.test.mjs` | 6 | Chrome headless con la interfaz real: **A** sombra = bundle normal byte a byte · **B** activo (13 paneles = Node, bases, arte, GLB) · **C** documento nuevo, desactivación, fallback y reactivación · **D** congelado · **E** recarga · **F** APIs de Chromium 99 |

Las 14 áreas de prueba que exige la Entrega 1 quedan cubiertas: contrato v1, identidad, referencias compartidas e inmutabilidad, sombra con fallos y mutaciones inyectados, activación y desactivación, fallback sin mezclas, cambio de base y documento, geometría real y sintética, Caja Botánica y H-01/H-02, plegado y GLB, integridad del bundle normal, aislamiento CEP, bundle en navegador y APIs de Chromium 99.

### 4.2 Baterías completas, en secuencia [MEDIDO]
Evidencia: `docs/fase2/evidencia/run-all-F2A-3-entrega1.txt` (sobre `7180491`).
- `tests/run-all.sh` → **TODO EN VERDE** (`EXIT_RUN_ALL=0`): aislamiento OK, build verificado (`dist-a9`), instalador en modo de prueba (dry-run) correcto, Node 662 + 1 omitida, navegador 52 · a7 13 · a8 31 · a9 32 · Chromium-99 4 · puente 6 · a5-observar 3 · A4-CDP 7 (las mismas cifras que en la línea base del handoff).
- Después, `tests/run-experimental.sh` → **434/434** (`EXIT_EXPERIMENTAL=0`) = 343 anteriores + 91 nuevas. Sin fallos intermitentes; no se repitió ninguna batería.
- `tools/verify-isolation.sh` y `node tools/build/build.mjs --verify` (`dist-a9`) en verde al inicio y al cierre. `node tools/build/build-experimental.mjs --verify` en verde.
- No se modificaron goldens, huellas, fixtures, `tests/run-all.sh` ni aserciones existentes.

### 4.3 Coste [MEDIDO, Node, mediana de 30, orientativo: medido con la batería en paralelo]

| Caso | Legacy solo | Selector en sombra (síncrona: legacy + experimental) | Activo | Activo congelado |
|---|---|---|---|---|
| Caja Botánica real | 3,52 ms | 4,55 ms | 0,79 ms | 1,40 ms |
| Illustrator real (ε 0,05) | 2,91 ms | 5,24 ms | 1,41 ms | 2,33 ms |

En el bundle, la sombra se ejecuta **después** (`setTimeout(0)`), así que no retrasa la respuesta del legacy. El modo congelado cuesta ≈ +0,6–0,9 ms por construcción.

## 5. Decisiones tomadas en la implementación (dentro del alcance)

1. **Árbol solo para la base pedida** (instrucción de la Entrega 1). Sustituye a la idea del handoff §8.1 de validar todas las bases en `buildPanels`; consecuencia: el límite de §3.
2. **Despacho por origen del modelo**, además del modo: es lo que impide las mezclas al cambiar de modo con un modelo ya construido.
3. **Sin fallback si la entrada se mutó:** si el experimental modificó la entrada antes de fallar, el legacy no recibiría la original.
4. **Punto de control global `__tessMotorExperimental`:**
   - es la única excepción a «sin globales» y solo existe en el bundle experimental;
   - es no enumerable, de solo lectura y no guarda el modo.
   - Es necesario porque `src/main.js` guarda el motor en su clausura y la activación «en la consola de depuración» (D-F2A3-3) necesita un punto de acceso.
5. **Una línea de log en cada construcción activa:** «Continue to 3D» limpia el log (`controller.js:157`). Corrección `be93f63`.
6. **`defaultBaseIndex` también exige identidad** (`panels` y `creaseEdges`); `defaultBaseIndex(null)` da `modelo-ajeno` en lugar del `TypeError` del legacy, como en el resto de errores (D-F2A3-10).
7. **`.gitignore`:** una línea, `dist-experimental*/`, para que el bundle experimental construido nunca se versione y el árbol quede limpio. Es el único archivo modificado fuera de las carpetas nuevas.

## 6. Procedimiento de activación y desactivación

1. Construir el bundle experimental:

   ```bash
   node tools/build/build-experimental.mjs
   ```

   Para validar en CEP real (I-7, no autorizada), añadir `--debug-port 8089`. Verificar después con:

   ```bash
   node tools/build/build-experimental.mjs --verify
   ```

   La instalación (I-5) **no está autorizada**.
2. Al abrir el panel «Tesseract V3 (experimental)», el modo es **SOMBRA**: la interfaz usa el legacy, igual que el bundle normal.
3. **Activar**, en la consola de depuración del panel (CEP `.debug`, o la consola del navegador en el arnés):

   ```js
   __tessMotorExperimental.activar('ACTIVAR-EXPERIMENTAL')
   ```

   Devuelve `true` y escribe en el log «modo ACTIVO…». Después hay que pulsar «Continue to 3D»: cada construcción activa escribe «Motor de geometría: modo ACTIVO — esta construcción usa el motor experimental…».
4. **Consultar:**
   - `__tessMotorExperimental.modo()`;
   - `.registro()`, con comparaciones, fallbacks y detenciones;
   - `.origenDelModelo(…)`;
   - `.ayuda()`.
5. **Depuración:** `__tessMotorExperimental.congelarSalidas(true)` congela en profundidad los modelos nuevos.
6. **Desactivar:** `__tessMotorExperimental.desactivar()` vuelve a SOMBRA. El modelo en pantalla conserva su motor hasta la siguiente construcción. **Recargar el panel** también vuelve a SOMBRA, porque no hay persistencia.

## 7. Limitaciones

- **Entorno de prueba:** solo Chrome headless con el puente CEP simulado y las APIs posteriores a la 99 eliminadas. **No** se ha probado en CEP 12 ni en Chromium 99 reales (I-7, no autorizada).
- **Visibilidad del modo activo:** solo se indica en el log del panel y en el nombre del menú. Un indicador permanente en la interfaz necesita `src/ui` (I-6).
- **Reinicio de la base (KI-30):** solo se avisa; el reinicio efectivo necesita la interfaz.
- **Sombra síncrona en el hilo de la interfaz:** un experimental que no terminara bloquearía la interfaz después del legacy, porque no hay interrupción. Mitigación futura: un Worker.
- **Comparación en sombra:**
  - es estructural (paneles, áreas, adyacencias, aristas, diagnósticos), no geométrica fina;
  - el árbol se compara en la base experimental cuyo polígono contiene el centroide del panel base legacy;
  - la clasificación de diferencias (F2A0_03) la hace el informe, no el selector.
- **Diagnósticos experimentales:** no se muestran en la interfaz (I-6).

## 8. Riesgos

| Riesgo | Situación |
|---|---|
| Fallo posterior a `buildPanels` en modo activo | Construcción detenida y visible; no ocurre en los casos medidos; solución: contrato v2 (§3) |
| Rendimiento y memoria en CEP | Sin medir en CEP (D-F2A3-9); en Node, el activo es más rápido que el legacy en los dos casos medidos; criterio 5 histórico pendiente |
| Modelo experimental con más memoria (≈ 160–570 kB frente a 36–128 kB) | Sin cambios; un solo modelo vivo en `S`; la sombra se libera con el modelo legacy (`WeakMap`) |
| Instalación con identidad nueva | No ejecutada; `verify-isolation.sh` ya marca cualquier `tesseract-v3*` en el CEP del usuario |
| Uso del punto de control por otro código del panel | Solo el bundle experimental lo publica; sin la confirmación exacta no activa nada |

## 9. Commits (locales, autor único Gerardo Calambas posada, sin trailers)

| SHA | Mensaje |
|---|---|
| `772b360def4f87ada0e9d5a220eff73b938c1b4b` | feat(f2): integrar fachada experimental GeometryEngine v1 |
| `a01233bcc4659d9b11f1a5627f245c87bcae4bdd` | feat(f2): implementar selector legacy experimental |
| `9ce5c1fccb6b3823f69300b72e651eba188fa417` | build(f2): generar bundle experimental independiente |
| `be93f636118fdc7b639365350524797f7919a279` | fix(f2): repetir el aviso de modo activo en cada construccion |
| `71804913e7c3685a56438e9c4aa6071ff2288996` | test(f2): validar integracion experimental en navegador |
| commit de este informe (`git log -1`) | docs(f2): cerrar entrega funcional F2A-3 |

Sin push ni cambios de visibilidad: `tdotp/tesseract-v3-audit` sigue privado y en `8cda001`.

## 10. Rollback

- **Qué hay que deshacer:** todo vive en `experimental/integracion/`, `tools/build/build-experimental.mjs`, `tests/experimental/f2a3-{motor,selector,bundle,navegador}.test.mjs`, este informe y una línea de `.gitignore`. El producto no cambia.
- **Deshacer la entrega completa:**

  ```bash
  git revert --no-edit <commit de este informe> 7180491 be93f63 9ce5c1f a01233b 772b360
  ```

  También se puede volver a `5c08e11` en una rama nueva. Después, borrar `dist-experimental/` si existe.
- **Comprobar el producto:**

  ```bash
  node tools/build/build.mjs --verify
  ```

  ```bash
  tools/verify-isolation.sh
  ```

  `build.mjs --verify` debe dar `dist-a9`, como ya ocurre con la entrega aplicada.
- **Puntos de recuperación anteriores:** `5c08e11` (handoff F2A-3) · `8cda001` · `63db9fa` · `1cc1065` (cierre de F1).

## 11. Siguiente paso (no autorizado)

- I-5: instalar y desinstalar el bundle experimental con su propio ID, con autorización fechada.
- I-6: interfaz de diagnósticos e indicador permanente del modo; reinicio de la base (KI-30); `try/catch` en el cambio de base.
- I-7: validación en CEP real (sombra → activo → rollback).
- Contrato v2 transaccional (§3); presupuesto de rendimiento y memoria en CEP; F2B.
