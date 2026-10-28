# F2A-1 — Evidencia del fallo intermitente de F1 al ejecutar las pruebas experimentales EN PARALELO con tests/node (2026-10-27)

## install-dry-run (corrida 3 de 8, pruebas f2a1 dentro de tests/node/)
test at tests/node/install-dry-run.test.mjs:35:1
✖ el instalador no deja residuos y no toca el plugin instalado ni el baseline (162.3455ms)
  AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:
  
  '1' !== '0'

## Origen: tools/install.sh crea /tmp/tess-iso.$$ mientras corre; tools/a4/a4.sh (a4-herramienta) lo lanza en paralelo
85:if "$ROOT/tools/verify-isolation.sh" >/tmp/tess-iso.$$ 2>&1; then ok "verify-isolation.sh verde"; else bad "verify-isolation.sh falla:"; sed 's/^/        /' /tmp/tess-iso.$$; fi; rm -f /tmp/tess-iso.$$
78:  echo "== 2) instalador en dry-run (dist íntegro, identidad V3, sin colisiones, destino libre, aislamiento)"; if "$ROOT/tools/install.sh" --dry-run >/tmp/tess-a4-d.$$ 2>&1; then ok "install.sh --dry-run correcto"; else bad "install.sh --dry-run falla:"; grep FALLA /tmp/tess-a4-d.$$ | sed 's/^/        /'; fi; rm -f /tmp/tess-a4-d.$$
96:  "$ROOT/tools/install.sh" --dry-run >/tmp/tess-a4-d.$$ 2>&1 || { echo "RECHAZADO: el dry-run falla:"; grep FALLA /tmp/tess-a4-d.$$; rm -f /tmp/tess-a4-d.$$; exit 3; }; rm -f /tmp/tess-a4-d.$$

## Medidas
- dc1d917 (sin F2A-1), worktree temporal: 8/8 corridas en verde (661 pass)
- con tests/node/f2a1-*: fallos intermitentes (install-dry-run 2 de ~12, extraction 1 de ~12)
- sin f2a1 en tests/node (lista explícita): 6/6 en verde
- tras mover f2a1 a tests/experimental/: tests/node 6/6 en verde (662 pass + 1 omitida)
