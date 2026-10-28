# Tesseract V3 — Release candidate 3.0.0-rc.1

Fecha: 2026-10-28 · Base: `ec5f5d81f735b23b11f8dcc2da674fbc29c3e4e3` (cierre de la Entrega 2) · Autorización: usuario, 2026-10-28 («Entrega final: estabilización y preparación para producción»). **No autoriza** publicación estable, distribución a terceros, reemplazo del Tesseract original, desinstalar TesserArt_Validator, cambios en repositorios ajenos, preferencias de seguridad ni F2B.
Etiquetas: [MEDIDO] · [CONFIRMADO] · [INFERENCIA] · [NO VERIFICADO]. **[REAL]** = observado en Adobe Illustrator 30.8.2 real (CEP 12.1.1, Chromium 99.0.4844.84, macOS), por DevTools remoto del panel o por AppleScript / Eventos del Sistema. Nada [REAL] procede de mocks ni de Chrome headless.

## 0. Recomendación

**APTO CON RESERVAS** para producción, como sustituto evaluado de V3 con el motor legacy por defecto (modo sombra) y el motor experimental como opción explícita.

Por qué apto:
- En modo sombra, el RC reproduce el legacy **byte a byte en Illustrator real**: GLB plano `737bcd23…` y GLB con arte `b4973a54…` por el diálogo nativo.
- El modo activo permite trabajar de extremo a extremo (geometría, plegado, base por Shift+clic, crease por Alt+clic, materiales, arte, PNG y GLB) y corrige KI-22/KI-04: la Caja Botánica sale con 13 paneles en lugar de 11.
- No hay errores conocidos que comprometan documentos ni que den resultados incorrectos en silencio: las mezclas entre motores se rechazan y los fallos se ven en la interfaz.
- Rendimiento y memoria medidos en CEP: interactivos, con diferencias pequeñas entre motores.
- Es reproducible desde un commit y reversible con un solo comando.

**Reservas** (ninguna impide evaluar el RC; todas condicionan una publicación estable):
1. **Paquete sin firmar.** Hoy solo carga con `PlayerDebugMode=1` (ya configurado de antes en este equipo; no se modificó). Para usuarios finales hace falta un ZXP firmado (§9).
2. **Corpus real reducido.** El motor experimental se validó en real con 2 documentos (N0-A Caja Botánica y N0-B caja con arte) y en automático con 41 casos de plegado y estrés. Antes de hacerlo motor **predeterminado** conviene un corpus real más amplio. Como opción explícita sobre el legacy por defecto, el riesgo es bajo.
3. **Defectos legacy cosméticos que siguen presentes** en los dos modos:
   - KI-25: tras guardar, el mensaje final «GLB exported from current 3D pose» tapa la ruta guardada;
   - KI-12: el botón PNG está oculto;
   - el espesor de 0,25 mm se muestra como «0.3mm» (`toFixed(1)`).
4. **KI-30, base transaccional e indicador de motor** solo existen en este bundle (RC). El bundle «normal» de V3 (`dist-a9`) no se modificó y sigue con KI-30.
5. **Criterio 5 histórico** (en Node, el experimental es más lento que el legacy en 3 de 10 casos). En CEP real la diferencia en la construcción 3D es de unos 4 ms (§5): no se abrió ninguna optimización geométrica.

## 1. Versión, identidad y SHA

| Dato | Valor |
|---|---|
| Versión | **3.0.0-rc.1** (manifiesto `ExtensionBundleVersion="3.0.0"`) |
| Identidad CEP | bundle `com.tato.tesseract.v3.experimental` · extensión `com.tato.tesseract.v3.experimental.panel` · menú **Tesseract V3 (experimental)** · ILST `[0.0,99.9]` · CSXS 12.0 |
| Commit de origen del RC | `7258524024aa20a0f987c6c72d6228849917a368` (código de `217b23349c43d8cd2329a2886b5a239ce6551e26`) |
| `main.js` | sha256 `b36f3d8998555391627cc995a73e1f63714624015122b5e9a1400fe7d8275428` (229 866 B): construido, **instalado y validado en real** |
| Artefacto | `release/tesseract-v3-3.0.0-rc.1.zip` · sha256 **`8f4edc7d288ac12f01913a73d92e54965494b5ccf8d4b2b0485cffaa9dd08d75`** (236 282 B) y carpeta `release/tesseract-v3-3.0.0-rc.1/` (no versionados; se reconstruyen) |
| `SHA256SUMS` de la extensión | sha256 `7454acb73e331f1af0380bdec7e0bf7026f029058171e953194b65c656d1dd31` (13 archivos = `dist-experimental/` = la copia instalada) |
| SHA final del repositorio | §12 |

**Reproducir y verificar el artefacto:**

```bash
node tools/build/build-rc.mjs --commit 7258524 --verify
```

Debe responder `OK … reproducible desde 7258524… (sha256 8f4edc7d…)`.

- **Contenido del artefacto:**
  - `extension/`: la carpeta CEP con su `SHA256SUMS` y `BUILD_INFO.json` sin commit;
  - `RELEASE.json`: versión, commit, identidad, manifiesto, motores y compatibilidad;
  - `LEEME.txt`;
  - `SHA256SUMS` de todo el conjunto;
  - el `.zip` determinista: orden, fecha y permisos fijos.
- **Diferencia con el bundle normal:** la extensión es el mismo `src/main.js` y la misma configuración de esbuild que el bundle normal, con 3 sustituciones de módulos (§2).

## 2. Cambios realizados

**En esta entrega:**

| Commit | Cambio |
|---|---|
| `217b233` | Selector: `tiempos()` por operación (modo, origen y ms, con `performance.now` en el bundle), para medir en CEP. Interfaz: diagnósticos repetidos agrupados («… y 17 más: extremo de crease ajustado (ε)» en lugar de 19 líneas) |
| `7258524` | `tools/build/build-rc.mjs` (RC reproducible desde un commit), `tools/a4/f2a3-rc-real.mjs` (interacciones, diálogo nativo, rendimiento), evidencia real, pruebas `f2a3-rc` (8); `f2a3-cep-evidencia` fija la evidencia de la Entrega 2 a su commit (`ec5f5d8`) |
| commit de este informe | Informe, `HANDOFF.md` §28 y evidencia de las baterías |

**Heredado de las Entregas 1 y 2** (incluido en el RC):
- I-1: fachada `GeometryEngine` v1 del experimental.
- I-2: selector sombra/activo con fallback atómico.
- I-3: bundle independiente.
- I-5: instalador aislado.
- I-6: interfaz experimental (barra de motor, KI-30, base transaccional, detención sin restos, diagnósticos legibles).
- I-7: primera validación real.

**Estabilización (revisión de §4 del encargo):**

| Punto | Estado en el RC | ¿Cambio en código compartido? |
|---|---|---|
| KI-30 (documento y base) | Corregido en el RC: documento o motor nuevo ⇒ base por defecto del motor; [REAL] N0-A → N0-B | No: interfaz exclusiva del RC |
| Cambio de base transaccional | Base, ángulos, crease y ALL conservados ante fallo; [REAL] V8 | No |
| Indicador de motor y mensajes | Barra permanente, activación en dos pasos, avisos de fallback y detención; [REAL] | No |
| Recuperación de construcciones detenidas | Sin restos de otro modelo; [REAL] V9 | No |
| Plegado, materiales y arte | [REAL] en los dos modos | No |
| PNG y GLB | [REAL]; GLB por diálogo nativo con y sin arte; PNG por `<a download>` capturado (KI-12) | No |

**Resultado:** no hizo falta modificar código compartido con el bundle normal.
- `src/`, `panel/` y `reference/` siguen sin cambios desde F1.
- `dist/` = `dist-a9` byte a byte.
- Goldens, huellas y fixtures sin tocar.

## 3. Pruebas automatizadas

**Baterías, en secuencia, con el experimental retirado temporalmente** (el aislamiento estricto lo exige; estado previo registrado en `instalacion-durante-baterias.txt`) [MEDIDO]: `tests/run-all.sh` → **TODO EN VERDE** (`EXIT_RUN_ALL=0`: aislamiento estricto OK, build `dist-a9` verificado, Node 662 + 1 omitida, navegador 52 · a7 13 · a8 31 · a9 32 · Chromium-99 4 · puente 6 · a5-observar 3 · A4-CDP 7) y, después, `tests/run-experimental.sh` → **464/464** (`EXIT_EXPERIMENTAL=0`). Evidencia: `docs/release/evidencia/run-all-RC.txt`.

**Batería experimental por archivo:**

| Archivo | n | Cubre |
|---|---|---|
| f2a1-* / f2a2-* / f2a2r / f2a3-contratos | 343 | Núcleo exacto = oráculo; adaptador; árbol; H-01/H-02; contratos e inmutabilidad |
| `f2a3-motor` | 18 | Contrato v1, Symbol privado e identidad, árbol solo para la base pedida, errores, inmutabilidad |
| `f2a3-selector` | 62 | Sombra = legacy, 28 escenarios adversariales, fallback atómico, combinatoria de mezclas, activación, controles y tiempos |
| `f2a3-bundle` | 11 | Sustituciones exactas, paridad byte a byte sin sustituciones, `dist-a9`, identidad CEP, Chromium 99 |
| `f2a3-navegador` | 6 | Bundle en Chrome headless: sombra = normal byte a byte, activo, documento, congelado, recarga, APIs de Chromium 99 |
| `f2a3-interfaz` | 5 | Barra, diagnósticos (agrupados), KI-30, base transaccional, detención y fallback |
| `f2a3-instalador` | 6 | Instalador y desinstalador en un HOME temporal |
| `f2a3-cep-evidencia` | 5 | Evidencia real de la Entrega 2 (reconstruye `ec5f5d8`) |
| `f2a3-rc` | 8 | RC determinista y su evidencia real (§4) |

**Comprobaciones adicionales:**
- `node tools/build/build.mjs --verify` ⇒ `dist-a9`.
- `node tools/build/build-experimental.mjs --verify`.
- `build-rc --verify`.
- `tools/verify-isolation.sh`: estricto sin el experimental instalado, y `--experimental-instalado` con él.

## 4. Pruebas en Illustrator real [REAL]

Evidencia: `docs/release/evidencia/` (RC, `main.js` `b36f3d89…`) y `docs/fase2/evidencia/f2a3-cep/` (Entrega 2). Documentos usados: los desechables N0-A (exportación real de la Caja Botánica) y N0-B (caja con arte Front/Back). Se cerraron sin guardar; N0-B quedó idéntico antes y después. Ningún documento de trabajo se tocó.

| Interacción | Resultado (RC) |
|---|---|
| Carga e identidad | Panel junto a «Tesseract» (original) y «Validador editorial»; `com.tato.tesseract.v3.experimental.panel`, ILST 30.8.2, Chrome/99.0.4844.84, AdobeCEP/12.1.1, three r132, `main.js` `b36f3d89…`; modo SOMBRA; consola sin errores |
| **Shift+clic** (base) | Entrada de confianza por CDP, con coordenadas escaladas por `devicePixelRatio` (1,25): sombra P4 → P3; activo P8 → P11. El selector «Base» y la pestaña Material se actualizan. **Tras plegar a 60°**, Shift+clic cambia a otra base (P5 / P9); al replegar cambia la imagen |
| **Alt+clic** (crease) | «Crease C9 selected» en los dos modos: pestaña Creases, etiqueta «Selected crease: C9 · …», fila resaltada; 0 `Pick error` (KI-29: puede elegir una crease vecina a la clicada) |
| Base por selector y ángulos tras plegar | Base P7 (sombra) y P11 (activo) desde el selector después de plegar; ángulo de una crease a −30° cambia la imagen; Reset vuelve al plano |
| Materiales y espesor | Kraft, Gray y White; `Thickness applied: 0.8mm`; 0 ⇒ `Thickness must be greater than 0` |
| **Diálogo nativo «Save GLB»** | Conducido por teclado (Eventos del Sistema) en el diálogo «Save As» de Illustrator: **sombra plano = `737bcd23…`** y **sombra con arte = `b4973a54…`**, iguales byte a byte a las referencias legacy reales de A4–A9; activo plano `7da50989…`; activo con arte `f497a548…` (igual que en la Entrega 2). En los cuatro casos, guardado nativo = misma pose por la ruta sustituida, byte a byte. **Cancelar:** `GLB export cancelled`, ningún archivo. KI-25 visible |
| PNG | 64–66 kB por `<a download>` capturado y guardado con `cep.fs` (KI-12: botón oculto) |
| Cambio de documento | Activo, N0-A (13 paneles) → N0-B: «Base reiniciada (KI-30)…», EXPERIMENTAL · 2 paneles · 1 pliegue · base P0; arte cargado |
| Reinicio del panel | Activo → recarga ⇒ SOMBRA, `Ready`, sin errores |
| Flujos completos (caja y arte) | Sobre la versión RC, mismos resultados que en la Entrega 2: 11 / 13 paneles; bases; plegado; base transaccional (`conservaBase` y `conservaAngulos`); detención; fallback; vuelta a sombra. Mismos hashes de GLB y PNG |
| Desinstalación y reinstalación | En la Entrega 2, con reinicio de Illustrator (menú sin y con el experimental). En el RC, retirada para las baterías y reinstalación (§6) |

**Incidencia del entorno, resuelta:** con el diálogo nativo abierto, Illustrator bloquea el renderizador del panel (modal de ExtendScript), y el primer conductor esperaba la respuesta del clic. Se corrigió en la herramienta: el clic se lanza sin esperar. Un primer intento quedó con el diálogo abierto; se canceló con Cmd+punto sin guardar nada (`incidencias/`). Escape no llega a ese diálogo.

## 5. Rendimiento y memoria en CEP real [MEDIDO, REAL]

- **Metodología** (`rendimiento-2026-10-28T18-42-35-756Z.json`):
  - N0-A abierto; 5 ejecuciones por modo; **panel recién cargado** en cada una (`Page.reload`); mismos pasos en los dos modos.
  - Tiempos con `performance.now` en la página real:
    - extracción y 3D: clic → texto final de estado, con sondeo cada 20 ms;
    - motor: `tiempos()` del selector;
    - plegado: evento del deslizador ALL → `applyFolding` síncrono y hasta 2 frames;
    - GLB: clic → estado final, con el diálogo sustituido.
  - Memoria: `Runtime.getHeapUsage` (heap JS) tras `HeapProfiler.collectGarbage`.
  - No se mide la memoria de GPU.

| Medida (mediana · rango) | Sombra (legacy en la interfaz) | Activo (experimental) |
|---|---|---|
| Extracción (ExtendScript + validación + 2D) | 53,9 ms · 52,3–54,7 | 54,2 ms · 43,6–60,1 |
| Construcción 3D (clic → «3D ready») | 67,4 ms · 65,8–73,4 | 71,7 ms · 62,0–76,0 |
| `buildPanels` del motor de la interfaz | 12,7 ms · 12,3–12,7 (legacy) | 16,2 ms · 16,1–16,8 (experimental) |
| `buildAdjacency` | 0,6 ms · 0,6–0,9 | 0,2 ms · 0,2–0,4 |
| `buildFoldTree` | 0,3 ms · 0,2–0,4 | 0,3 ms · 0,3–0,4 |
| Sombra experimental diferida (`buildPanels`, fuera del camino de la interfaz) | 13,2 ms · 12,5–14,4 | — |
| Plegado síncrono (ALL → `applyFolding`) | 3,4 ms · 2,9–3,8 | 3,6 ms · 3,2–3,8 |
| Plegado hasta pintar (2 frames) | 59,7 ms · 43,2–67,0 | 62,5 ms · 44,8–63,9 |
| Exportación GLB (sin arte) | 32,1 ms · 24,5–32,8 | 32,4 ms · 31,3–43,3 |
| Heap JS tras construir | 4,76 MB · 4,73–5,48 | 5,41 MB · 4,70–5,61 |
| Δ heap por la construcción | 2,90 MB · 2,87–3,61 | 3,52 MB · 2,81–3,72 |
| Errores de consola | 0 | 0 |

- **Lectura:**
  - Todas las operaciones son interactivas (≤ 76 ms; el plegado está limitado por el refresco).
  - El experimental cuesta unos 4 ms más en `buildPanels` y ~0,6 MB más de heap en la Caja Botánica.
  - La sombra añade ~13 ms **después** de que la interfaz responde.
- **Aceptable para el uso real:** no se abrió ninguna optimización geométrica.
- Las cifras de Node de F2A-2P **no** son mediciones CEP y no se usan aquí.

## 6. Instalación y rollback

- **Requisitos:**
  - macOS con Illustrator 2026 (validado en 30.8.2);
  - `PlayerDebugMode=1` en `com.adobe.CSXS.12`: **ya configurado en este equipo; ninguna herramienta lo cambia**;
  - sin documentos sin guardar al reiniciar Illustrator.
- **Instalar** el RC (desde el repositorio):

  ```bash
  node tools/build/build-experimental.mjs
  ```

  Verificar que su `SHA256SUMS` = `release/…/extension/SHA256SUMS`. Después:

  ```bash
  tools/a4/a4-experimental.sh preflight
  ```

  ```bash
  tools/a4/a4-experimental.sh install --autorizado-por-usuario=AAAA-MM-DD
  ```

  Reiniciar Illustrator y abrir **Ventana ▸ Extensiones ▸ Tesseract V3 (experimental)**.
  - El instalador verifica la identidad, las huellas y el `.debug`.
  - Comprueba que las demás extensiones no cambian (snapshot).
  - Ejecuta `verify-isolation.sh --experimental-instalado`.
  - Nunca sobrescribe.
- **Desinstalar / rollback:**

  ```bash
  tools/a4/a4-experimental.sh uninstall --autorizado-por-usuario=AAAA-MM-DD
  ```

  Borra solo `~/Library/Application Support/Adobe/CEP/extensions/tesseract-v3-experimental` y se niega si la identidad no coincide. Después hay que reiniciar Illustrator.
- **Rollback del código:** volver a `ec5f5d8` (Entrega 2) o `0eb339f` (Entrega 1). `src/` no cambió, así que el producto normal no requiere rollback.
- **Residuos declarados:**
  - caché propia de CEP en `~/Library/Caches/CSXS/cep_cache/ILST_30.8.2_com.tato.tesseract.v3.experimental.panel`;
  - los paneles «Tesseract» y «Validador editorial» quedaron abiertos en el espacio de trabajo tras la prueba de convivencia de la Entrega 2.
- **Estado al cierre de esta entrega:** **experimental instalado** e íntegro (`docs/release/evidencia/instalacion-durante-baterias.txt`).
  - Antes de las baterías se registró el estado (`verify`, `main.js` y snapshot) y se retiró.
  - Después se reinstaló:
    - `build-experimental --verify` correcto;
    - `dist-experimental/` = extensión del RC;
    - `install` y `verify` correctos;
    - `verify-isolation.sh --experimental-instalado` en verde;
    - `main.js` `b36f3d89…`.
  - En Illustrator real, el panel recargado tiene la identidad correcta, está en modo SOMBRA y la consola no tiene errores.
  - TesserArt_Validator y el Tesseract original siguen intactos: snapshot idéntico, y `verify-isolation.sh` compara el original con el baseline byte a byte.

## 7. Uso

1. Abrir **Ventana ▸ Extensiones ▸ Tesseract V3 (experimental)**. La barra indica «Motor: SOMBRA (legacy)»: el resultado es el del legacy.
2. Flujo normal: **Extract Dieline** → **Continue to 3D**. Después:
   - deslizadores, **Shift+clic** sobre un panel (base) y **Alt+clic** sobre una línea roja (crease);
   - pestañas Material, Artwork y Creases;
   - **Export GLB**.
3. **Motor experimental:** «Activar experimental» → «Confirmar» y volver a construir. La barra indica «ACTIVO (experimental)» y el motor de la construcción actual. **«Volver a sombra»** revierte; recargar el panel también.
4. **Diagnósticos geométricos:** en la barra, agrupados por tipo. Si el experimental falla, la barra lo explica:
   - fallback al legacy completo;
   - o construcción detenida sin mezclar resultados;
   - un cambio de base fallido conserva la base y el plegado.
5. **Consola de depuración** (puerto `.debug` 8089): `__tessMotorExperimental.ayuda()`.

## 8. Compatibilidad

- **Validado [REAL]:**
  - Adobe Illustrator 30.8.2 (2026), CEP 12.1.1, Chromium 99.0.4844.84, macOS;
  - convivencia con «Tesseract» (original, `/Library`), «Validador editorial» (TesserArt_Validator) y OnBoarding de Adobe.
- **Declarado en el manifiesto:** ILST `[0.0,99.9]`, CSXS 12.0.
- **No verificado:** Windows, otras versiones de Illustrator y Chromium 99 «limpio» fuera de CEP (solo emulado en headless con las APIs posteriores eliminadas).

## 9. Firma y distribución (evaluación; nada ejecutado)

- **Estado actual:** el RC es una carpeta CEP **sin firmar**; carga solo con `PlayerDebugMode=1`.
- **Para usuarios finales**, el camino estándar de CEP es:
  1. empaquetar `extension/` como **ZXP firmado** con `ZXPSignCmd` de Adobe, usando un certificado (de firma de código comercial o, para pruebas internas, autofirmado) con sello de tiempo;
  2. instalarlo con el **Unified Plugin Installer Agent** de Adobe (`UnifiedPluginInstallerAgent --install <archivo.zxp>`), presente en este equipo;
  3. o distribuirlo por Adobe Exchange.
- **En este equipo** no hay `ZXPSignCmd` ni `ExManCmd`. No se descargó nada, no se generó ningún certificado y no se firmó nada.
- **Decisión pendiente del usuario:** el certificado y el canal de distribución.

## 10. Problemas corregidos

| Problema | Dónde | Corrección |
|---|---|---|
| Deslizador ALL sin restaurar en el cambio de base fallido | [REAL] Entrega 2 | Restaurado (`3ba72a3`) |
| Aviso de fallo visible tras un cambio de base correcto | [REAL] Entrega 2 | Se borra con el siguiente cambio correcto (`3ba72a3`) |
| Diagnósticos verbosos (19 líneas iguales) | [REAL] Entrega 2 | Agrupados (`217b233`) |
| Sin tiempos del motor en CEP | RC | `tiempos()` (`217b233`) |
| Reproducibilidad del artefacto | RC | Construcción desde un commit; rutas de esbuild relativas al `cwd` del árbol (`7258524`) |
| Conductor bloqueado con el diálogo nativo | Herramienta de validación | El clic se lanza sin esperar; cancelar con Cmd+punto |

## 11. Riesgos residuales

| Riesgo | Valoración |
|---|---|
| Paquete sin firmar (depende de `PlayerDebugMode`) | Bloquea la distribución a terceros; no la evaluación en este equipo |
| Corpus real del experimental (2 documentos) | Medio, solo si se hace predeterminado; bajo como opción explícita (sombra por defecto) |
| Un fallo del experimental después de `buildPanels` detiene la construcción, sin fallback al legacy (límite de la API v1) | Bajo: no ocurre en ningún caso real ni sintético; queda visible y es recuperable volviendo a sombra |
| KI-25, KI-12, espesor «0.3mm» y KI-29 (legacy, cosméticos) | Bajo; documentados |
| La sombra se ejecuta en el hilo de la interfaz (~13 ms, después de responder) | Bajo |
| Pruebas estrictas incompatibles con el experimental instalado (`verify-isolation.sh`) | Operativo: retirar y restaurar (§6) |

## 12. Commits y SHA final

| SHA | Mensaje |
|---|---|
| `217b23349c43d8cd2329a2886b5a239ce6551e26` | feat(rc): medir tiempos del motor y agrupar diagnosticos repetidos |
| `7258524024aa20a0f987c6c72d6228849917a368` | build(rc): release candidate reproducible y validacion final en Illustrator |
| commit de este informe (`git log -1`) | docs(rc): release candidate 3.0.0-rc.1 de Tesseract V3 |

Commits locales, autor único Gerardo Calambas posada, sin trailers. Sin push. `tdotp/tesseract-v3-audit` sigue privado y en `0eb339f`.
