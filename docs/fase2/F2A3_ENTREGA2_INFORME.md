# F2A-3 · Entrega 2 — Validación real en Illustrator (I-5, I-6, I-7)

Fecha: 2026-10-28 · Base: `0eb339f2e06f71103a8ee77c1ac57223ab30f691` (Entrega 1) · Autorización: usuario, 2026-10-28 («Entrega 2: validación real en Illustrator», I-5…I-7 sin paradas intermedias).
**Estado: Entrega 2 COMPLETADA.** El bundle experimental «Tesseract V3 (experimental)» se instaló de forma aislada, se validó **en Adobe Illustrator 30.8.2 real** (CEP 12.1.1, Chromium 99.0.4844.84) en modo sombra y en modo activo, se desinstaló y se reinstaló. Los dos motores están disponibles en el panel experimental.
- El producto normal (`dist/`) sigue byte a byte en `dist-a9`: **`src/` no ha cambiado**.
- El plugin original y TesserArt_Validator están intactos.
- No hay push.

Etiquetas: [MEDIDO] · [CONFIRMADO] · [INFERENCIA] · [NO VERIFICADO]. **[REAL]** = observado en Illustrator real, por DevTools remoto del panel cargado por CEP o por AppleScript / Eventos del Sistema. Nada marcado [REAL] procede de mocks ni de Chrome headless.

## 0. Resumen para el usuario

| Pregunta | Respuesta |
|---|---|
| ¿Qué funciona realmente en Illustrator? | Todo lo de §4 [REAL]: el panel carga junto a las otras extensiones; extracción de documentos reales, validación y 2D; 3D en sombra idéntico al legacy (**GLB plano `737bcd23…` y GLB con arte `b4973a54…` byte a byte iguales a los reales de A4–A9**); activación y desactivación desde la barra; Caja Botánica con **13 paneles / 12 pliegues**; cambio de base, ángulos, Reset, materiales, espesor, arte, PNG y GLB; recuperación ante errores (base transaccional, detención, fallback); recarga del panel → sombra; desinstalación y reinstalación aisladas |
| ¿Qué se probó solo de forma automatizada? | Las 28 pruebas adversariales de la sombra, la combinatoria de mezclas y los fallos inyectados reales del núcleo (Node); KI-30 y la base transaccional con todos los casos (Chrome headless, `f2a3-interfaz`); el instalador en un HOME temporal; APIs de Chromium 99 reducidas. En real, los fallos se provocaron con el interruptor de depuración `simularFallo` (§6.3) |
| ¿Qué falló y qué se corrigió? | Seis incidencias (§7), de ellas tres corregidas en la interfaz experimental durante la validación real: el deslizador «ALL» no se restauraba, el aviso de fallo quedaba visible tras un cambio de base correcto, y la barra no reflejaba la comparación en sombra diferida (este último en headless, antes de ir a real). Ningún defecto geométrico |
| ¿Qué queda pendiente para producción? | §9: decidir la promoción (criterio 5, presupuesto en CEP); Shift+clic y Alt+clic con el experimental y el diálogo «Save GLB» real (KI-25) sin ejercer en esta entrega; firma del paquete (hoy depende de `PlayerDebugMode=1`, ya configurado de antes); llevar KI-30 y la base transaccional al producto normal (hoy solo en el experimental); contrato v2 transaccional |
| Estado del plugin original | **Intacto.** `verify-isolation.sh`: la extensión instalada en `/Library/…/tesseract` coincide byte a byte con el baseline. Se abrió su panel (y el de «Validador editorial») solo para comprobar la convivencia (§4.1) |
| Estado de la instalación experimental | **Instalada** al cierre en `~/Library/Application Support/Adobe/CEP/extensions/tesseract-v3-experimental`, idéntica a `dist-experimental/` (`a4-experimental.sh verify` y `verify-isolation.sh --experimental-instalado` en verde). Se abre en **Ventana ▸ Extensiones ▸ Tesseract V3 (experimental)**. Para retirarla, ver §10 |
| SHA final y árbol | §11 |

## 1. Arquitectura añadida (sin tocar `src/`)

```
bundle EXPERIMENTAL = el mismo src/main.js con 3 sustituciones (solo para imports de src/main.js; tools/build/build-experimental.mjs):
  './core/engine.js'        → experimental/integracion/entrada-cep.js        selector (sombra por defecto) + punto de control
  './ui/fold-controls.js'   → experimental/integracion/fold-controls-cep.js  fábrica REAL de src/ui/fold-controls.js + motor intermediario
  './ui/controller.js'      → experimental/integracion/controller-cep.js     fábrica REAL de src/ui/controller.js   + motor intermediario
                               └─ experimental/integracion/interfaz-cep.js   barra, KI-30, base transaccional, diagnósticos
```

### 1.1 Por qué sin tocar `src/`
- Cambiar `src/ui` habría cambiado la huella `dist-a9` y las pruebas de texto idéntico de F1.
- En su lugar, el bundle experimental crea las fábricas **reales** de la interfaz y les pasa un motor intermediario con la forma `GeometryEngine` v1.
- El intermediario recibe el estado `S` de la aplicación. Así puede arreglar KI-30 y hacer transaccional el cambio de base sin modificar ningún archivo de la interfaz.
- El bundle normal no contiene nada de esto. Comprobado:
  - `f2a3-bundle`: `dist/` = `dist-a9`; sin la sustitución, la configuración del bundle experimental produce el mismo `main.js` que el normal, byte a byte;
  - prueba G1: el bundle normal no tiene barra;
  - prueba G3: el bundle normal conserva su comportamiento (KI-30 incluido).

### 1.2 I-6 — Interfaz experimental (`interfaz-cep.js`)

**Barra permanente** (`#tess-exp-motor`, bajo la línea de estado):
- Muestra el modo: **SOMBRA (legacy)** o **ACTIVO (experimental)**.
- Muestra qué produjo la construcción actual: EXPERIMENTAL (experimental-f2a2), LEGACY o LEGACY (fallback), con paneles, pliegues y base.
- Activación en dos pasos: «Activar experimental» → «Confirmar» o «Cancelar».
- «Volver a sombra».
- Mensajes de fallback y detención.
- Diagnósticos geométricos legibles (por ejemplo «Unión no plegable: no se usa como bisagra», «Pieza desconectada de la base: queda plana»), agrupados por tipo. En sombra muestra la comparación con el experimental («legacy 11 paneles · experimental 13 paneles»).
- Se mantiene sincronizada con la consola mediante `suscribir`.

**KI-30:**
- Si el documento o el motor de origen cambian respecto de la construcción anterior, la base vuelve a la base por defecto del motor en uso, y queda escrito en el log («Base reiniciada (KI-30)…»).
- Repetir la misma construcción (Back → Continue) conserva la base elegida.
- La primera construcción no cambia: sombra = normal byte a byte.

**Cambio de base transaccional:**
- Si `buildFoldTree` falla en un modelo que ya tenía un árbol válido:
  1. se restaura la base anterior;
  2. se devuelve el último árbol válido;
  3. después de que `setBasePanel` termina, se restauran los ángulos, la crease seleccionada y el deslizador «ALL».
- La interfaz muestra «Base change failed · base=Pn kept» y el aviso de la barra. No hay excepción sin capturar ni resultado parcial.

**Primer árbol fallido** de una construcción:
- se vacían `foldTree`, `foldSigns`, `foldAngles` y la selección;
- se retira el panel de pliegues del modelo anterior;
- se propaga el error (`3D error: construccion-detenida…`).

Nunca queda aplicado un árbol de otro modelo.

**Mezclas:** las sigue impidiendo el selector (despacho por origen, `modelo-ajeno`).

### 1.3 Selector (añadidos fuera de v1)
- `suscribir(fn)`: avisa de los cambios de modo.
- `diagnosticos(panelData, base)`: devuelve los diagnósticos del modelo experimental y nunca lanza.
- `simularFallo(etapa | null)`: interruptor de **depuración**, no persistente, que hace fallar al experimental en `buildPanels`, `buildAdjacency`, `buildFoldTree` o `defaultBaseIndex`. Sirvió para validar la recuperación en real; está expuesto en `__tessMotorExperimental.simularFallo`.
- `avisarCambioDeOrigen`: la interfaz experimental lo desactiva porque ella misma reinicia la base.

### 1.4 I-5 — Instalación aislada (`tools/a4/a4-experimental.sh`)

Comandos: `preflight` · `snapshot` · `install --autorizado-por-usuario=AAAA-MM-DD [--debug-port=8089]` · `verify` · `diagnose` · `uninstall --autorizado-por-usuario=AAAA-MM-DD`.

**Antes de instalar**, el script comprueba:
- el bundle de origen: identidad (bundle, extensión única y menú), SHA256SUMS, ausencia de `.debug` y reproducibilidad con `build-experimental --verify`;
- el destino: único, libre y fijo;
- las extensiones protegidas: TesserArt_Validator, el plugin original `tesseract` y la V3 normal `tesseract-v3`.

**Al instalar** (sin sobrescribir nunca):
- copia primero a un área de preparación (staging) y la verifica;
- escribe un `.debug` propio;
- compara un snapshot de todas las demás extensiones;
- ejecuta `verify-isolation.sh --experimental-instalado`, un modo nuevo; el modo estricto por defecto no cambia;
- si la verificación falla, retira automáticamente lo instalado.

**Al desinstalar:** solo borra el destino experimental, y se niega si el manifiesto del destino tiene otra identidad.

**Nunca toca:** `/Library`, las preferencias de Adobe (solo **lee** `PlayerDebugMode`), los permisos ni Illustrator.

## 2. Pruebas automatizadas nuevas o ampliadas

| Archivo | n | Cobertura |
|---|---|---|
| `f2a3-interfaz.test.mjs` (nuevo, Chrome headless con la interfaz real) | 5 | **G1** barra, activación en dos pasos, cancelación y desactivación; el normal no tiene barra. **G2** motor actual, comparación en sombra y diagnósticos H-01/H-02 legibles. **G3** KI-30 por documento y por motor; se conserva la base al repetir; el normal no cambia. **G4** base transaccional: base, árbol, ángulos, crease y ALL conservados, sin errores de página, y el aviso desaparece tras un cambio correcto. **G5–G6** detención sin restos y fallback visible |
| `f2a3-instalador.test.mjs` (nuevo, HOME temporal) | 6 | Preflight. Autorización obligatoria. Origen con otra identidad rechazado. Instalación idéntica con `.debug` y protegidas intactas. Modo de aislamiento experimental y estricto. Nunca sobrescribe. Detecta copias alteradas. La desinstalación se niega con otra identidad, solo borra lo suyo y es idempotente. Reinstalación. Salvaguardas estáticas |
| `f2a3-cep-evidencia.test.mjs` (nuevo) | 5 | Fija la evidencia real de §4. El `main.js` validado en Illustrator = construcción limpia del árbol actual |
| `f2a3-selector.test.mjs` | 57 → 61 | `suscribir`, `diagnosticos`, `simularFallo` y `avisarCambioDeOrigen` |
| `f2a3-bundle.test.mjs` | 10 → 11 | 3 sustituciones exactas, mismos módulos de `src/` que sin sustituciones, aislamiento estático de la interfaz |
| `f2a3-navegador.test.mjs` (Entrega 1) | 6 | Sigue en verde con la interfaz (sombra = normal byte a byte) |

**Baterías completas, en secuencia y con el experimental NO instalado** (el modo estricto lo exige) [MEDIDO]: `tests/run-all.sh` → **TODO EN VERDE** (`EXIT_RUN_ALL=0`: aislamiento estricto OK, build `dist-a9` verificado, Node 662 + 1 omitida, navegador 52 · a7 13 · a8 31 · a9 32 · Chromium-99 4 · puente 6 · a5-observar 3 · A4-CDP 7, las mismas cifras de siempre) y después `tests/run-experimental.sh` → **455/455** (`EXIT_EXPERIMENTAL=0`; 434 de la Entrega 1 + 21 nuevas). Evidencia: `docs/fase2/evidencia/run-all-F2A-3-entrega2.txt`.

No se modificaron goldens, huellas, fixtures, `tests/run-all.sh` ni aserciones existentes. Solo se ampliaron las listas esperadas de `f2a3-bundle` y `f2a3-selector`, que crecen con las piezas nuevas.

## 3. Procedimiento real seguido (I-7)

1. **Preflight:**
   - Detectó `dist-experimental/` desfasado: se reconstruyó.
   - Detectó un documento de trabajo del usuario abierto en Illustrator (`MEDCO_Octubre.pdf`). **No se tocó.** El usuario autorizó cerrarlo solo si no tenía cambios; al ir a cerrarlo ya estaba cerrado (0 documentos).
2. **Instalación:**

   ```bash
   tools/a4/a4-experimental.sh install --autorizado-por-usuario=2026-10-28 --debug-port=8089
   ```

   Resultado: INSTALACIÓN CORRECTA.
3. **Reinicio de Illustrator:** salir con 0 documentos y volver a abrir. Después se abrió **Ventana ▸ Extensiones ▸ Tesseract V3 (experimental)** con Eventos del Sistema.
4. **Validación por DevTools remoto** (`127.0.0.1:8089`) con `tools/a4/f2a3-cep.mjs`:
   - `identidad`;
   - `caja` sobre el documento desechable N0-A (`run-nivel0.mjs a4-open N0-A`);
   - `arte` sobre N0-B;
   - `recarga`.
   - Las capturas son del panel real (`Page.captureScreenshot`).
5. **Correcciones encontradas en real:** se aplicaron y después se hizo `uninstall` → `install` (reinstalación aislada, dos veces), recarga del panel y repetición completa.
6. **Convivencia:** se abrieron también «Tesseract» (original) y «Validador editorial».
7. **Desinstalación real:** `uninstall`, reinicio de Illustrator, menú sin el experimental, `verify-isolation.sh` estricto en verde. Después se ejecutaron las baterías.
8. **Reinstalación final:** `install`, reinicio de Illustrator, menú con el experimental, panel abierto e identidad (§4.6).

## 4. Resultados en Illustrator real [REAL]

Evidencia: `docs/fase2/evidencia/f2a3-cep/` (JSON por ejecución, `capturas/`, `exportaciones/`, snapshots, estado del documento, `incidencias/`).

### 4.1 Carga e identidad
- **Menú Ventana ▸ Extensiones:** «Libraries, Tesseract, **Tesseract V3 (experimental)**, Validador editorial».
- **Identidad del panel:**
  - extensión `com.tato.tesseract.v3.experimental.panel`;
  - host ILST 30.8.2;
  - `Chrome/99.0.4844.84 AdobeCEP/12.1.1`;
  - three r132;
  - `main.js` igual al de `dist-experimental/` (sha256 `3b1106ab25a4e334…`, 228 121 B; la prueba de evidencia lo reconstruye desde el árbol);
  - modo SOMBRA con la barra visible;
  - consola sin errores.
- **Convivencia:** con los paneles «Tesseract» (original) y «Validador editorial» abiertos a la vez hay **4 motores CEP** en marcha (OnBoarding de Adobe, original, validador y experimental). Sus registros solo muestran las líneas `ClientInitialized` habituales de CEP; ningún error de JavaScript.

### 4.2 Caja Botánica (N0-A, exportación real de Illustrator), `caja-2026-10-28T17-32-41-613Z.json`

| Paso | Resultado |
|---|---|
| Extracción y validación | `Extraction complete`, `✅ No problems found`; vista 2D dibujada (818 muestras con trazo) |
| 3D en **sombra** | **LEGACY · 11 paneles · 10 pliegues** (KI-04/KI-22 del legacy, como en A4–A9); barra: «Comparación en sombra: legacy 11 paneles · experimental 13 paneles»; sombra diferida 15 ms (`buildPanels`) |
| PNG y GLB en sombra | **GLB plano = `737bcd2312da1191…` (33 436 B), byte a byte el GLB legacy real de A4–A9** |
| Activación en la barra | Primer clic ⇒ pide confirmación (sigue en sombra); «Confirmar» ⇒ ACTIVO y línea en el log |
| 3D **activo** | **EXPERIMENTAL (experimental-f2a2) · 13 paneles · 12 pliegues · base P8**; la base se reinicia a la del experimental (KI-30); log `=== buildPanels (experimental-f2a2, ε=0.05 mm) === panels=13`, `Adjacency edges: 12`, `Fold tree edges: 12 (base=P8, experimental)` |
| Diagnósticos | «Diagnósticos geométricos (19): 19 × extremo de crease ajustado (ε)», el ajuste ε del Illustrator real (DP-3) |
| Base y ángulos | Bases P12, P5 y P0 desde el selector (`3D ready · base=Pn`); ALL a 60° y una crease a −45° cambian la imagen; Reset Flat vuelve exactamente al plano (mismo hash del lienzo) |
| Materiales y espesor | Kraft, Gray y White board; `Thickness applied: 0.8mm`; espesor 0 ⇒ `Thickness must be greater than 0` |
| PNG y GLB en activo | PNG 68 339 B (`0251c462…`) y GLB 68 192 B (`f8bfbe39…`), **idénticos en las dos ejecuciones completas** (deterministas); el GLB tiene ≥ 13 mallas |
| **Base transaccional** | Con `simularFallo('buildFoldTree')`, P0 → P3 ⇒ «Base change failed · base=P0 kept»; **base y todos los deslizadores conservados**; aviso en la barra; sin el fallo, P3 funciona |
| **Detención** | Primer árbol fallido ⇒ `3D error: construccion-detenida…`; sin panel de pliegues; aviso «Construcción DETENIDA…» |
| **Fallback** | `simularFallo('buildPanels')` ⇒ «LEGACY (fallback) · 11 paneles · 10 pliegues» y aviso; sin el fallo ⇒ experimental 13/12 |
| Vuelta a sombra | «Volver a sombra» y reconstruir ⇒ LEGACY 11, base reiniciada (KI-30) |
| Consola | **0 errores** en toda la ejecución |

### 4.3 Arte (N0-B), `arte-2026-10-28T17-35-44-504Z.json`
- **Sombra:** LEGACY · 2 paneles · 1 pliegue. La comparación indica que coinciden (legacy 2 paneles · experimental 2 paneles). El arte se carga desde las capas («Artwork loaded from layers»).
- **GLB con arte en sombra:** **`b4973a54840cd0c1…` (295 440 B) = `docs/fase1/a8-real/glb/paridad-arte.glb` byte a byte.**
- **Activo:** EXPERIMENTAL · 2 paneles · 1 pliegue; GLB con arte con 2 imágenes (`f497a548…`).
- **Documento intacto:** capas, visibilidad, bloqueo y selección son iguales antes y después (`n0b-estado-antes.txt` = `n0b-estado-despues-2.txt`).

### 4.4 Reinicio del panel
Con el modo ACTIVO, recargar el panel lo devuelve a **SOMBRA (legacy)**, estado `Ready` y consola sin errores. No hay persistencia: `localStorage` y `sessionStorage` vacíos (comprobado en headless).

### 4.5 Desinstalación y reinstalación aisladas
- **Reinstalación:** `uninstall` → `install` tres veces durante la validación; cada vez «las demás extensiones siguen idénticas» y el estado coincide con el snapshot previo.
- **Desinstalación real con reinicio** (`desinstalacion-real.txt`):
  - menú tras reiniciar: «Libraries, Tesseract, Validador editorial»;
  - puerto 8089 sin DevTools;
  - `verify-isolation.sh` estricto en verde;
  - snapshot de las carpetas CEP (sistema y usuario) idéntico al previo a la instalación.

### 4.6 Reinstalación final
Evidencia: `reinstalacion-final.txt` e `identidad-2026-10-28T17-55-19-821Z.json`.
- **Instalación** después de las baterías: `build-experimental --verify` y `install` correctos; las demás extensiones idénticas al snapshot.
- **Primer intento de reinicio:** Illustrator respondió «Cancelado por el usuario» (−128) a la orden de salir. No se reinició: el proceso seguía siendo el de las 12:37 y el menú, sin el experimental. Esa línea del archivo corresponde a ese intento. No se insistió.
- **Reinicio del usuario** (proceso nuevo, 12:54:38): menú «Libraries, Tesseract, **Tesseract V3 (experimental)**, Validador editorial». El panel se abrió con todas las comprobaciones de identidad en verde. Su `main.js` es **`3b1106ab…`, el mismo validado en §4.2–§4.4**. Modo SOMBRA, consola sin errores, `a4-experimental.sh verify` y `verify-isolation.sh --experimental-instalado` en verde.

## 5. Comparación legacy / experimental (sin exigir igualdad entre motores)

| Documento | Legacy (sombra) | Experimental (activo) | Lectura |
|---|---|---|---|
| Caja Botánica N0-A | 11 paneles, 10 pliegues | 13 paneles, 12 pliegues, 19 ajustes ε | El experimental corrige KI-04/KI-22. Son topologías distintas a propósito, así que los GLB difieren |
| Caja simple con arte N0-B | 2 paneles, 1 pliegue | 2 paneles, 1 pliegue | Coinciden en estructura. El GLB difiere porque cambia la base por defecto (legacy P1/P0, experimental P0) y el orden de los paneles |

## 6. Activación y desactivación (procedimiento final)

1. Abrir **Ventana ▸ Extensiones ▸ Tesseract V3 (experimental)**. Arranca en **SOMBRA (legacy)**: produce lo mismo que el producto normal.
2. **Activar:** pulsar «Activar experimental» y después «Confirmar» en la barra. Después, «Continue to 3D» (o volver a extraer). La barra indica «ACTIVO (experimental)» y la construcción «EXPERIMENTAL (experimental-f2a2)».
3. **Desactivar:** pulsar «Volver a sombra». El modelo en pantalla conserva su motor hasta reconstruir. Recargar el panel o reiniciar Illustrator también vuelve a SOMBRA.
4. **Consola de depuración** (CEP `.debug`, puerto 8089): `__tessMotorExperimental` con `modo`, `activar('ACTIVAR-EXPERIMENTAL')`, `desactivar`, `registro`, `diagnosticos`, `congelarSalidas` y `simularFallo` (solo depuración). `.ayuda()` lista los comandos.

## 7. Incidencias

| # | Incidencia | Tratamiento |
|---|---|---|
| 1 | El preflight detectó `dist-experimental/` desfasado respecto del código | Se reconstruyó. El preflight y `verify` ya lo impiden |
| 2 | Había un documento de trabajo del usuario abierto (`MEDCO_Octubre.pdf`) | No se tocó; se preguntó. Cerrarlo solo si no tenía cambios (al ir a cerrarlo ya estaba cerrado). `a4-open` ya exige 0 documentos |
| 3 | **[REAL]** En el cambio de base fallido, el deslizador «ALL» volvía a 0 aunque los ángulos sí se restauraban (`incidencias/caja-2026-10-28T17-29-54-640Z.json`, `conservaAngulos: false`) | **Corregido** (`interfaz-cep.js`): se guarda y se restaura su valor. Prueba G4 ampliada |
| 4 | **[REAL]** El aviso «No se pudo cambiar la base…» seguía visible tras un cambio de base posterior correcto (captura V8 de `incidencias/caja-2026-10-28T17-31-32-492Z.json`) | **Corregido:** se borra con el siguiente cambio de base correcto, pero no durante la propia transacción. Prueba G4 ampliada |
| 5 | **[REAL]** El primer GLB con arte en sombra (`9e8dd2e5…`, `incidencias/arte-2026-10-28T17-35-12-078Z.json`) no coincidía con la referencia de A8 | No era un defecto: el panel venía de la sesión de N0-A con otra base heredada. Desde un panel recién cargado, el GLB es **`b4973a54…` byte a byte** |
| 6 | Registros de CEP del experimental con `SharedImageManager::ProduceSkia … non-existent mailbox` en las recargas y capturas | Ruido de la GPU de Chromium, no errores de JavaScript: la consola del panel tuvo 0 errores [INFERENCIA: asociado a `Page.captureScreenshot` y a la recarga] |
| — | En headless, la barra mostraba «Comparación en sombra: pendiente» porque la sombra es diferida | Corregido antes de ir a real: la barra se refresca después de la sombra (FIFO) |

**Efectos residuales declarados:**
- Illustrator crea por sí mismo `~/Library/Caches/CSXS/cep_cache/ILST_30.8.2_com.tato.tesseract.v3.experimental.panel` (como ya pasó con V3 en A4). No forma parte de las extensiones y no se borró.
- Los paneles «Tesseract» y «Validador editorial» quedaron abiertos en el espacio de trabajo tras la comprobación de convivencia. Se pueden cerrar desde el propio panel.
- Los documentos de prueba N0-A y N0-B se cerraron sin guardar.

## 8. Limitaciones

- **No ejercido con el experimental en real:**
  - Shift+clic y Alt+clic sobre el lienzo; comparten `setBasePanel` y la selección con el selector de base, que sí se validó;
  - el diálogo «Save GLB» real: se sustituyó por una ruta, como en A4–A8 (KI-25 ya validado en A8 y A9);
  - la descarga del PNG: el botón sigue oculto (KI-12); se capturó el `<a download>` y se guardó con `cep.fs`.
- **Fallos del experimental en real:** se provocaron con `simularFallo`. Ningún documento real hizo fallar al experimental.
- **Rendimiento y memoria en CEP:** solo se registró el tiempo de la sombra diferida (≈ 15 ms en `buildPanels`, 0–1 ms en las demás etapas). No hay presupuesto formal (D-F2A3-9).
- **Diagnósticos:** son legibles pero verbosos en Illustrator real: 19 entradas «extremo de crease ajustado (ε)» por la Caja Botánica.
- **Corpus:** dos documentos reales (N0-A y N0-B). No se probó Windows.

## 9. Pendiente para producción (no autorizado)

1. Decidir la promoción del experimental:
   - criterio 5 (3/10 casos más lentos en Node);
   - presupuesto de rendimiento y memoria en CEP;
   - corpus real más amplio.
2. Llevar al producto normal KI-30, la base transaccional y un indicador de motor. Hoy solo existen en el bundle experimental, y llevarlos al normal cambiaría `dist-a9`.
3. Contrato v2 transaccional (Entrega 1 §3).
4. Validar en real Shift+clic, Alt+clic y el diálogo «Save GLB» con el experimental.
5. Firmar el paquete (hoy depende de `PlayerDebugMode=1`).
6. F2B.

## 10. Rollback

- **Retirar la instalación experimental** (la instalación de la Entrega 2 lleva la fecha de autorización 2026-10-28):

  ```bash
  tools/a4/a4-experimental.sh uninstall --autorizado-por-usuario=2026-10-28
  ```

  Borra solo `tesseract-v3-experimental` y comprueba el resto de extensiones y el aislamiento estricto. Después hay que reiniciar Illustrator.
- **Código:** revertir los commits de §11 (o volver a `0eb339f`) y borrar `dist-experimental/`. `src/`, `panel/` y `reference/` no cambiaron: el producto normal no requiere rollback (`node tools/build/build.mjs --verify` ⇒ `dist-a9`).

## 11. Commits (locales, autor único Gerardo Calambas posada, sin trailers)

| SHA | Mensaje |
|---|---|
| `65eb807be249f5e04436ae5a927fe774f61692ce` | feat(f2): interfaz experimental con indicador, KI-30 y base transaccional (I-6) |
| `a00bfe4704fd29bb56830d97716119cfde7e5dad` | feat(f2): instalador aislado del bundle experimental (I-5) |
| `3ba72a3befe097649ae3b16224fbd11a51bc58f0` | test(f2): validar el bundle experimental en Illustrator real (I-7, con las dos correcciones encontradas en real y la evidencia) |
| commit de este informe (`git log -1`) | docs(f2): cerrar entrega de validacion real F2A-3 |

Sin push. `tdotp/tesseract-v3-audit` sigue privado y en `0eb339f`.
