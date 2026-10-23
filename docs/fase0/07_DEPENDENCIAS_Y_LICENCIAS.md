# 07 — Dependencias, licencias y compatibilidad de tecnologías

Alcance: lo que el plugin usa hoy, lo que traería reutilizar `tesseract-web`, y lo que V3 prevé añadir. **No es asesoría legal**: es un inventario técnico; las dudas de licencia las confirmas tú o un abogado antes de distribuir.
Reglas de gobernanza heredadas del repo web (`DEPENDENCY_POLICY.md`, `CLAUDE.md`): permisivas (MIT/ISC/BSD/Apache-2.0) permitidas con licencia copiada y versión fijada; GPL/AGPL/LGPL **bloqueadas** para código que se distribuya; toda dependencia nueva con entrada en `THIRD_PARTY_NOTICES.md` y copia de licencia en `third_party/licenses/`, **incluidas las transitivas que acaben en el bundle**.

## 1. Plugin actual (lo que se distribuye hoy)

| Componente | Versión | Licencia | Evidencia | Observación |
|---|---|---|---|---|
| three.js (`libs/three.min.js`) | r132 (2021) | MIT | Cabecera "Copyright 2010-2021 Three.js Authors, SPDX MIT" [CONFIRMADO] | Mantener la nota de copyright en el bundle. |
| `OrbitControls.js` (ejemplo de three) | r132 aprox. | MIT (por origen) | **El archivo no lleva cabecera de licencia** [CONFIRMADO] | **No se usa**: eliminar (resuelve la duda). |
| Código propio | — | Propietario (© Gerardo Calambas / TesserArt) | `LICENSE` del repo web; el plugin no tiene `LICENSE` propio | Añadir `LICENSE` al repo V3. |
| Adobe CEP / `CSInterface.js` | — | Términos de Adobe | El plugin **no** incluye `CSInterface.js`: usa `window.__adobe_cep__` directo [CONFIRMADO] | Sin código de Adobe empaquetado. |
| Iconos/logotipos | — | Propios; `linkedin_logo.svg` es marca de terceros | [CONFIRMADO] | Revisar uso de marca si se publica. |
| Fuentes | — | Del sistema (`-apple-system`, `Segoe UI`) | [CONFIRMADO] | Sin fuentes empaquetadas. |

Compatibilidad: manifiesto `CSXS 12.0`, host `ILST [0.0–99.9]`. En esta máquina: Illustrator 30.8.2 (2026), CEF rama 4844 = **Chromium 99** [CONFIRMADO]; Node embebido pero no habilitado. three r132 es anterior a la gestión de color moderna (`colorSpace`) y a `MeshPhysicalMaterial` con iridiscencia/anisotropía; el código del plugin ya ramifica entre `colorSpace` y `encoding` [CONFIRMADO L434–435].

## 2. `tesseract-web` si se reutiliza (`packages/core`)

`pnpm licenses list` sobre una copia construida [MEDIDO]:

| Alcance | Resultado |
|---|---|
| **Producción** (todo lo que arrastra `apps/web`) | MIT 66 · Apache-2.0 2 (`@mediapipe/tasks-vision`, `draco3d`, ambos transitivos de `@react-three/drei`) · ISC 3 · BSD-3-Clause 1 · **sin GPL/AGPL/LGPL** |
| Todo (con desarrollo) | MIT 167 · Apache-2.0 5 (+`typescript`, `baseline-browser-mapping`, `human-signals`) · ISC 10 · BSD-3 2 · CC-BY-4.0 1 (`caniuse-lite`, datos, solo desarrollo) |

Para V3 lo relevante es **`packages/core`**: sus dependencias de ejecución declaradas son solo `zod` (MIT), y **`zod` no se importa en ningún archivo** [CONFIRMADO con `grep`] → el `core` real tiene **cero dependencias de ejecución**. `react`, `three`, `@react-three/*`, `zustand` son de `apps/web` y **no** entran en V3. (Los `@mediapipe`/`draco3d` Apache-2.0 solo aparecerían por `drei`, que V3 no usa.)
El archivo `THIRD_PARTY_NOTICES.md` del repo web lista OrigamiSimulator, `edemaine/fold` y `@react-three/drei` con estado "no integrado/planeado" para los dos primeros: **no heredar entradas que V3 no usa**.

## 3. Dependencias previstas para V3 (todas de desarrollo salvo three)

| Dependencia | Uso | Licencia | Nota |
|---|---|---|---|
| three.js (r132 → versión fijada en Fase 3) | Render, `GLTFExporter` opcional | MIT | Fijar versión exacta; copiar licencia |
| esbuild | Bundle IIFE | MIT | Solo desarrollo |
| TypeScript | Tipado | Apache-2.0 | Solo desarrollo (no se distribuye) |
| Vitest | Pruebas | MIT | Solo desarrollo |
| dependency-cruiser | Límites de módulos | MIT | Solo desarrollo (alternativa: ESLint) |
| three-mesh-bvh, draco3d, KTX2/Basis | Picking acelerado / compresión | MIT / Apache-2.0 / Apache-2.0 | **No** previstas; solo si una medición lo justifica |
| Texturas y HDRI | PBR / entorno (Fase 3) | **CC0** (Poly Haven, ambientCG) o propias | Texturas de Fantastic Fold: **no reutilizar** (Adobe Stock, decisión ya tomada). Registrar licencia **por archivo**. |

Chequeo automatizable (F1-11): `tools/check-licenses` lista dependencias de producción y desarrollo con licencia y falla ante GPL/AGPL/LGPL; se ejecuta dentro de `pnpm check`.

## 4. Compatibilidad de tecnologías (qué se sabe y qué no)

| Tema | Estado |
|---|---|
| CEP 12 + Chromium 99 | Versión **confirmada** en esta máquina. Capacidades dentro del panel (WebGL2, extensiones, Workers, `file://` con módulos) **no verificadas** → F1-04/F1-14. |
| three r132 vs versiones nuevas | r132 funciona hoy; versiones ≥ r150 cambian color, iluminación y empaquetado (ya no hay `examples/js` clásicos desde r148 aprox.): requieren bundler y comparación de imágenes (Fase 3). |
| Salida `ES2020`/IIFE | Soportada por Chromium 99 (ES2021). |
| `JSON` en ExtendScript | No existe (ES3): el plugin usa un serializador propio; mantenerlo. |
| UXP en Illustrator | Sin API pública usable hoy; fechas citadas en documentos previos **no verificadas por mí**. |
| GLB → Adobe Dimension 4.1.9 / Photoshop 27.11.0 | Ambos instalados aquí [CONFIRMADO]. Soporte de unidades, `KHR_*` y transparencias de Dimension: **no probado**. |
| macOS vs Windows | Solo macOS comprobado. |

## 5. Acciones

1. Eliminar `OrbitControls.js` y `main.js.bak` del paquete V3 (no del plugin instalado).
2. Crear `third_party/licenses/` y `THIRD_PARTY_NOTICES.md` de V3 con **solo** lo que realmente se distribuya (three r132 hoy).
3. Copiar `LICENSE` propietario y registrar `PROVENANCE.md` para todo lo traído de `tesseract-web`.
4. Antes de la Fase 3: elegir texturas/HDRI CC0 y guardar licencia de cada una.
