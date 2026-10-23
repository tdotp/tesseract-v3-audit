# Procedencia del código y los archivos

| Destino en este repo | Origen | Fecha | Notas |
|---|---|---|---|
| `reference/legacy-baseline/` | `/Library/Application Support/Adobe/CEP/extensions/tesseract` (plugin instalado, "Phase 7B"), idéntico a `../tesseract-instalado-copia` | 2026-10-23 | Solo lectura; manifiesto `reference/legacy-baseline.SHA256SUMS` |
| `panel/` | Copia de `reference/legacy-baseline/` sin `main.js.bak` (código muerto) | 2026-10-23 | Copia de trabajo aislada; los cambios se registran en `docs/fase1/` |
| `LICENSE` | `../tesseract-web/LICENSE` (mismo titular) | 2026-10-23 | Propietario |

Dependencias de terceros distribuidas: three.js r132 (MIT) en `panel/libs/three.min.js`; `panel/libs/OrbitControls.js` está cargado y sin uso (se retirará en una tarea posterior, ver `docs/fase0/07_*`).
Regla: solo se copia código desde `Documents/Antigravity/Tesseract/` (nunca desde `~/Downloads/tesseract-web*`).
