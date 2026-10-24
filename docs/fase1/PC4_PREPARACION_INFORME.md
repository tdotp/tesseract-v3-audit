# Fase 1 · Cierre de Nivel 0 y preparación de A4 (PC4-preparación)

Fecha: 2026-10-23 · Estado: **entrega para revisión. Nada instalado; `panel/`, baseline y extensión instalada intactos; no se tocó geometría ni se inició refactorización.**
Procedimiento exacto: `A4_PROCEDIMIENTO.md`. Etiquetas: **[MEDIDO]** · **[CONFIRMADO]** · **[NO VERIFICADO]**.

## 1. Cumplimiento de las decisiones del usuario
| # | Decisión | Resultado |
|---|---|---|
| 1 | KI-22 crítico, priorizado para F2 | Hecho en `docs/KNOWN_ISSUES.md` (severidad **Crítica**, fase **F2 / 2A**) |
| 2 | Fixtures y goldens históricos intactos | Hecho: ningún archivo existente de `tests/fixtures/real/` ni `tests/golden/` cambió; **congelados por huellas** (`tests/golden/fixtures.pins.json`, 7 archivos) y verificado por prueba |
| 3 | Nueva familia de fixtures por extracción real ×1,0 | Hecho: `tests/fixtures/illustrator-real/` (4 extracciones de Illustrator real), golden propio `tests/golden/illustrator-real.golden.json` (motor vigente: baseline y panel), generador determinista `tests/tools/make-illustrator-real-fixtures.mjs`; **no se mezcla** con `FIXTURES` |
| 4 | Registrar 13 vs 11 y la dependencia de escala | Hecho: KI-22, golden (`discrepancia_KI22`) y 2 pruebas (13↔11; fixture real = histórico ×4/3 en puntos, bbox, creases y manijas) |
| 5 | Sin tolerancias ad hoc ni parches de la Caja Botánica | Cumplido: ningún cambio en motor/`panel/`; la regla queda escrita en KI-22 |
| 6 | Mantener KI-10, KI-21, KI-23 | Documentados y abiertos |
| 7 | Preparar exclusivamente A4 | Hecho (§2) |
| 8 | No instalar sin autorización expresa | Cumplido: la instalación exige `--autorizado-por-usuario=AAAA-MM-DD`; `tools/install.sh --install` sigue rechazado (3) |
| 9 | No modificar `panel/`, baseline ni instalada | Cumplido (§4) |

## 2. Qué se preparó para A4
- **Procedimiento** (`A4_PROCEDIMIENTO.md`): identidad del paquete, riesgos R1–R10, 10 pasos con comandos exactos y criterios, lista de paridad P-0…P-11 con valores esperados (11 paneles a ×1,0), criterios de aceptación C1–C6, diagnóstico, rollback y evidencia a archivar.
- **`tools/a4/a4.sh`**: preflight (solo lectura), snapshot estructural de todas las extensiones, instalación aislada con staging + verificación + **rollback automático**, verify, diagnose, rollback verificado.
- **`tools/a4/cdp-run.mjs`**: identidad del panel **cargado** (id de extensión, host, Chromium 99, three r132, SHA-256 de `main.js` = `dist/`), consola, `measure_ui.js`, `leak_cycles.js`; nunca actúa sobre el panel del plugin instalado.
- **`run-nivel0.mjs a4-open|a4-close`**: documento desechable `N0-*` para las pruebas del panel.
- **`verify-isolation.sh --a4-instalado`**: admite exactamente `tesseract-v3` idéntica a `dist/`; el modo estricto por defecto no cambió.

## 3. Comprobaciones de seguridad (todas por prueba automática, en un HOME temporal)
Rechazo sin autorización o con formato inválido (sin escribir nada) · destino existente no se sobrescribe · rollback se niega a borrar algo que no sea el bundle V3 · ciclo instalar→verificar→rollback restaura el estado exacto y deja intactas las demás extensiones (usuario y sistema) · detección de archivo alterado, archivo extra y segunda copia `tesseract-v3*` · **rollback automático** ante verificación fallida (fallo inyectado) · análisis estático: sin `sudo`, sin `defaults write`, sin cierre/apertura de Illustrator, sin escritura en `/Library`, `osascript` solo cuenta documentos · el CEP real del usuario no cambió durante las pruebas.

## 4. Estado del repositorio y del sistema [MEDIDO]
- Pruebas: Node **225/225** · navegador **44/44** + Chromium-99 **4/4** + A4-CDP **6/6** · controles negativos **26/26** · `tests/run-all.sh --mutations` ⇒ «TODO EN VERDE».
- `tools/a4/a4.sh preflight` ejecutado en real (solo lectura): **PREFLIGHT CORRECTO** (build reproducible, dry-run correcto, `PlayerDebugMode` 11/12 = 1, puerto 8088 libre; Illustrator en ejecución sin documentos).
- `tools/verify-isolation.sh` verde · `git diff` de `panel/` y `reference/` vacío · `~/Library/Application Support/Adobe/CEP/extensions/` solo contiene `TesserArt_Validator` · `tests/results/a4/` no existe (no se ejecutó nada) · Git: un solo autor, sin remoto, sin trailers.
- Cambios en infraestructura de pruebas, declarados: `tests/browser/cdp.mjs` expone `port` y **cancela el temporizador de `eval`** (mantenía vivo el proceso hasta 5 min); `tests/run-all.sh` incluye `a4-cdp.test.mjs`.

## 5. Límites [NO VERIFICADO]
Nada se cargó en el CEP real. Las sondas de `__adobe_cep__` (`getExtensionId`, `getHostEnvironment`), el `fetch` de `main.js` desde `file://` dentro de CEP, el comportamiento de cachés de CEP tras el rollback y la coexistencia de ambos paneles solo se pueden confirmar en A4. La apertura del menú del panel y el diálogo «Guardar GLB» son manuales.

## 6. Siguiente paso
Esperar tu autorización expresa para ejecutar A4 (con la fecha que usarás en `--autorizado-por-usuario`). Hasta entonces: detenido. KI-22 y la geometría/normalización/topología se asignan a Opus en chat nuevo con `HANDOFF.md`.
