# Avisos de terceros — Tesseract V3

| Componente | Versión | Licencia | Rol | ¿Se distribuye en el paquete CEP? | Licencia copiada en |
|---|---|---|---|---|---|
| three.js | r132 (`panel/libs/three.min.js`) | MIT (© 2010-2021 Three.js Authors; cabecera en el archivo) | Renderer 3D | **Sí** (`dist/libs/three.min.js`) | Cabecera del propio archivo; texto MIT estándar |
| three.js `OrbitControls.js` (ejemplo r132) | r132 | MIT (por origen; el archivo no trae cabecera) | **Sin uso** en el código; se carga en `index.html` | Sí (pendiente de retirar en una tarea posterior, KI-16) | — |
| esbuild | 0.28.2 (exacta, `pnpm-lock.yaml`) | MIT | **Herramienta de build** (genera `dist/main.js`) | **No** (solo desarrollo; el bundle no incluye código de esbuild) | `third_party/licenses/esbuild-0.28.2-MIT.txt` |
| @esbuild/darwin-arm64 | 0.28.2 | MIT | Binario de esbuild para esta plataforma (dependencia opcional) | No | (mismo texto de licencia del paquete esbuild) |
| Node.js | v24.12.0 | MIT | Entorno de ejecución de pruebas y build | No | — |
| Google Chrome | del sistema | Propietaria (herramienta de prueba local) | Navegador de pruebas headless | No | — |

El código propio es propietario (ver `LICENSE`). No se distribuye código de Adobe (el panel usa `window.__adobe_cep__` directamente; no incluye `CSInterface.js`).
Verificación de dependencias: el bundle `dist/main.js` solo contiene código de `panel/main.js`; `dist/libs/` contiene únicamente three.js r132 y OrbitControls.
