# reference/

`legacy-baseline/` es una copia **exacta y de solo lectura** del plugin Tesseract instalado
(`/Library/Application Support/Adobe/CEP/extensions/tesseract`, "Phase 7B", marzo 2026), tomada el 2026-10-23.
`legacy-baseline.SHA256SUMS` es su manifiesto. **Nunca se edita**: es la referencia funcional (decisiones D1/D3).

- `tools/verify-isolation.sh` comprueba que el baseline sigue intacto y que la extensión instalada coincide con él.
- Todo cambio de trabajo se hace en `../panel/` (copia aislada). La diferencia entre `panel/` y el baseline se lista en
  `docs/fase1/` en cada entrega.
