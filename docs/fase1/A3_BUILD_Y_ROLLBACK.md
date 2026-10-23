# A3 — Build del bundle, herramientas, huellas y rollback

Estado: **nada instalado** en el CEP del usuario ni en Illustrator. Todo lo descrito como "instalación" es el plan de `tools/install.sh --dry-run`.

## 1. Qué se genera y cómo

```bash
cd "Tesseract v3"
pnpm install --frozen-lockfile            # solo la primera vez (esbuild 0.28.2, exacto)
node tools/build/build.mjs                # → dist/  (no instala nada)
node tools/build/build.mjs --verify       # dist/ íntegro y reproducible (reconstruye en un temporal y compara)
tools/install.sh --dry-run                # verifica y muestra el plan; NO escribe nada
```
`tools/build/build.mjs` solo escribe en una carpeta `dist*` del repo o en un directorio temporal del sistema; rechaza `panel/`, `reference/`, la raíz del repo, `/Library` y `~/Library` (probado).

**Qué hace el build:** empaqueta `panel/main.js` con esbuild como **un solo script clásico (IIFE)**, formato `iife`, `target: chrome99`, sin minificar (código legible para depurar), sin mapas de origen, con un banner que lleva la huella de la fuente; copia sin cambios `index.html`, `style.css`, `libs/`, `icons/`, los SVG; **excluye** `main.js.bak` y los `.md`; y reescribe en `CSXS/manifest.xml` **solo la identidad** (6 sustituciones exactas, verificadas una a una) para convivir con el plugin instalado.
**No** refactoriza: el código del bundle es el de `panel/main.js` re-impreso por esbuild (mismos nombres, misma lógica; sin conversión de sintaxis porque no hace falta para Chromium 99).

| Identidad | Plugin instalado | Bundle V3 |
|---|---|---|
| `ExtensionBundleId` | `com.tato.tesseract` | `com.tato.tesseract.v3` |
| `Extension Id` | `com.tato.tesseract.panel` | `com.tato.tesseract.v3.panel` |
| Versión | 0.1.0 | 3.0.0 |
| Nombre / menú | Tesseract | Tesseract V3 |
| Destino previsto | `/Library/Application Support/Adobe/CEP/extensions/tesseract` | `~/Library/Application Support/Adobe/CEP/extensions/tesseract-v3` |

## 2. Herramientas y versiones

| Herramienta | Versión | Licencia | Notas |
|---|---|---|---|
| esbuild | **0.28.2** (exacta; `package.json` + `pnpm-lock.yaml`) | MIT | Publicada el 2026-08-08; texto de licencia en `third_party/licenses/esbuild-0.28.2-MIT.txt`; binario `@esbuild/darwin-arm64` 0.28.2 (MIT) |
| Node.js | v24.12.0 | MIT | El build declara `engines.node >= 22` |
| pnpm | 9.15.4 | MIT | Gestor de paquetes (declarado en `packageManager`) |
| Python | 3.14.7 | PSF | Solo para `tools/install.sh` (validar XML) y `tools/baseline/setup_harness.py` |
| Google Chrome | 155.0.8059.85 | — | Solo pruebas de navegador (headless, perfil temporal) |
| `shasum`, `diff`, `xmllint`/`python3` | del sistema | — | Huellas y comparaciones |

Archivos de herramientas nuevos (SHA-256): `package.json` `3aa3a7f9…`, `pnpm-lock.yaml` `d5b90139…`, `tools/build/build.mjs` `b395ed75…`, `tools/install.sh` `78853edb…` (valores al momento de redactar; los vigentes salen de `git`).

## 3. Archivos generados y huellas SHA-256 (`dist/`, fuente `panel/main.js` sha256 `91b42b7b…`)

| Archivo | Bytes | SHA-256 |
|---|---|---|
| `main.js` (bundle IIFE) | 126 415 | `bc2606957595d086ac8b81d2e3af019e0c1d44344bd8c273c9ddb45bb159b5bd` |
| `CSXS/manifest.xml` (identidad V3) | 1 960 | `fd8284639a0dddcaa0186f90af047a3cada12656401a0eced51c8aa423142085` |
| `index.html` (idéntico a `panel/`) | 7 851 | `1850eefe3f4522f7dc85c555f1916ea505577f88fb156cf1aa871c2cf5c37a1a` |
| `style.css` (idéntico) | 8 604 | `23e5903a47dbf7e9500e237813a8c67eec2dad4168f17f4fa90dc0f316c88536` |
| `libs/three.min.js` (r132, idéntico) | 612 899 | `434f6c554d856b46265626505ad48aabb52c8a9ab16aa45fd526b8f55ff2a7cf` |
| `libs/OrbitControls.js` (idéntico; sin uso, KI-16) | 26 609 | `d4f83a29526ad5a805f1671a000b2a27b4564a7efde47226c8d28fc8e07ea4f4` |
| `icons/icon_dark.png` · `icon_dark@2x.png` · `icon_normal.png` · `icon_normal@2x.png` | 786 · 1 301 · 786 · 1 301 | `919c909b…` · `1e402665…` · `133f931a…` · `43b390e0…` |
| `linkedin_logo.svg` · `tesseract_icon.svg` · `tesseract_logo.svg` | 1 500 · 2 110 · 2 405 | `83b4543f…` · `c15ab542…` · `85c15fad…` |
| `SHA256SUMS`, `BUILD_INFO.json` | — | (el primero lista todo lo demás; el segundo documenta herramientas, fuente y salida) |

Total del paquete: **794 527 B** en 13 archivos de contenido. **Reproducible:** dos builds consecutivos dan bytes idénticos (prueba automática), y las huellas están **fijadas** en `tests/golden/dist.SHA256SUMS`: la prueba falla si cambia `panel/main.js` o la versión de esbuild.
`dist/` no se versiona (`.gitignore`); se reconstruye y verifica en cualquier momento.

## 4. Comprobaciones de `tools/install.sh --dry-run` (6 bloques, todas deben pasar)
1. `dist/` íntegro: `SHA256SUMS` verifica, sin archivos no listados, `BUILD_INFO.json` presente (avisa si hay `.debug`).
2. Manifiesto: XML bien formado; identidad exactamente `com.tato.tesseract.v3` / `com.tato.tesseract.v3.panel`; **sin colisión** con ninguna extensión instalada (sistema y usuario).
3. Destino: bajo `~/Library` (nunca `/Library`), **no existe** (no se sobrescribe nada), carpeta de usuario escribible.
4. Aislamiento: `tools/verify-isolation.sh` en verde (baseline intacto; extensión instalada idéntica al baseline).
5. Plan: lista de archivos con tamaño y huella.
6. Rollback descrito.
`--install`, `--yes`, `--force` y variantes se **rechazan con código 3**: la instalación real está deshabilitada hasta autorización explícita.

## 5. Procedimiento de rollback

**Hoy no hay nada que revertir** (no se instaló nada). Para el día en que se autorice una instalación:
1. Antes de instalar: `tools/install.sh --snapshot > snapshot-antes.txt` y `tools/verify-isolation.sh`.
2. Rollback: cerrar Illustrator → borrar **solo** `~/Library/Application Support/Adobe/CEP/extensions/tesseract-v3` (`tools/install.sh --uninstall --dry-run` muestra exactamente qué se borraría) → reabrir Illustrator.
3. Comprobar: `tools/install.sh --snapshot > snapshot-despues.txt && diff snapshot-antes.txt snapshot-despues.txt` (sin diferencias) y `tools/verify-isolation.sh` en verde (que además exige que no exista ninguna carpeta `tesseract-v3*` en el CEP del usuario).
4. Si Illustrator siguiera mostrando el menú "Tesseract V3" tras borrar y reiniciar: reiniciar de nuevo; no hay otros archivos del bundle fuera de esa carpeta [el comportamiento de cachés de CEP no se verificó: NO VERIFICADO].
5. La extensión `tesseract` instalada en `/Library/...` no se toca en ningún paso.

## 6. Límites
- El bundle **no se ha cargado en Illustrator ni en CEP real**; la compatibilidad con Chromium 99 está respaldada por (a) transformación con `target: chrome99` idéntica a `esnext`, (b) lista de APIs/CSS posteriores a la 99 sin coincidencias, (c) ejecución en Chrome con las APIs posteriores **eliminadas** y GLB idéntico al de APIs completas. No es Chromium 99 real; se confirma en A4/Nivel 1.
- La lista de versiones de introducción de APIs es **conocimiento general**, no verificada contra la fuente en esta sesión.
