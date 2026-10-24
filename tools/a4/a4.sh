#!/bin/bash
# A4 — primera carga del bundle V3 en el CEP real. HERRAMIENTA PREPARADA, NO EJECUTADA EN REAL: instalar/retirar exige autorización EXPRESA del usuario.
#
#   tools/a4/a4.sh preflight                                  solo lectura: ¿se puede instalar con seguridad?
#   tools/a4/a4.sh snapshot [archivo]                         huella estructural de las carpetas CEP (sistema y usuario)
#   tools/a4/a4.sh install  --autorizado-por-usuario=AAAA-MM-DD [--debug-port N]
#   tools/a4/a4.sh verify                                     tras instalar: identidad, huellas, nada más tocado
#   tools/a4/a4.sh diagnose [--port N]                        solo lectura: estado, registros de CEP, objetivos de DevTools
#   tools/a4/a4.sh rollback --autorizado-por-usuario=AAAA-MM-DD   borra SOLO ~/Library/.../extensions/tesseract-v3 y comprueba
#
# La fecha de --autorizado-por-usuario es la de la autorización expresa dada por el usuario en el chat; sin ella install/rollback se rechazan (código 3).
# Esta herramienta NUNCA cierra, abre ni reinicia Illustrator, NUNCA escribe en /Library, NUNCA toca la extensión "tesseract" ni otras extensiones, y NUNCA cambia preferencias del sistema.
# Variables SOLO para pruebas en un HOME temporal: TESS_DIST_DIR, TESS_SYS_CEP, TESS_A4_STATE, TESS_SKIP_SYSTEM_CHECKS=1 (omite PlayerDebugMode/puerto/Illustrator).
set -u
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
HOME_DIR="${HOME:?HOME no definido}"
USER_CEP="$HOME_DIR/Library/Application Support/Adobe/CEP/extensions"
SYS_CEP="${TESS_SYS_CEP:-/Library/Application Support/Adobe/CEP/extensions}"
DIST="${TESS_DIST_DIR:-$ROOT/dist}"
DEST="$USER_CEP/tesseract-v3"
STATE="${TESS_A4_STATE:-$ROOT/tests/results/a4}"
EXPECT_BUNDLE="com.tato.tesseract.v3"; EXPECT_EXT="com.tato.tesseract.v3.panel"
PORT=8088; CMD="${1:-}"; [ $# -gt 0 ] && shift
AUTH=""; SNAPFILE=""
for a in "$@"; do case "$a" in
  --autorizado-por-usuario=*) AUTH="${a#*=}";;
  --debug-port=*|--port=*) PORT="${a#*=}";;
  --*) echo "opción desconocida: $a"; exit 2;;
  *) SNAPFILE="$a";; esac; done
case "$PORT" in ''|*[!0-9]*) echo "puerto inválido: $PORT"; exit 2;; esac
fail=0; ok() { echo "  OK   $1"; }; bad() { echo "  FALLA $1"; fail=1; }; warn() { echo "  AVISO $1"; }

need_auth() { # install/rollback: exige la fecha de la autorización expresa
  if ! echo "$AUTH" | grep -Eq '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'; then echo "RECHAZADO: '$CMD' requiere --autorizado-por-usuario=AAAA-MM-DD (fecha de la autorización EXPRESA del usuario en el chat). Sin ella no se hace nada."; exit 3; fi; }
safe_dest() { # el destino debe ser exactamente <CEP de usuario>/tesseract-v3 dentro de ~/Library
  case "$DEST" in "$HOME_DIR/Library/Application Support/Adobe/CEP/extensions/tesseract-v3") ;; *) echo "RECHAZADO: destino inesperado: $DEST"; exit 3;; esac
  case "$DEST" in /Library/*|/System/*) echo "RECHAZADO: destino en ruta de sistema"; exit 3;; esac; }

tree_hash() { (cd "$1" && find . -type f ! -name .DS_Store -exec stat -f '%N %z' {} + 2>/dev/null | LC_ALL=C sort | shasum -a 256 | cut -c1-16); }
bundle_id() { python3 - "$1" <<'PY'
import sys, xml.etree.ElementTree as ET
try: print(ET.parse(sys.argv[1]).getroot().get("ExtensionBundleId", "?"))
except Exception: print("ilegible")
PY
}
snapshot() { # una línea por extensión: carpeta, nombre, bundle id, nº de archivos, huella de (ruta, tamaño)
  for d in "$SYS_CEP" "$USER_CEP"; do echo "## $d"; if [ -d "$d" ]; then (cd "$d" && for e in *; do [ -e "$e" ] || continue; id="-"; [ -f "$e/CSXS/manifest.xml" ] && id=$(bundle_id "$e/CSXS/manifest.xml"); n=$(find "$e" -type f ! -name .DS_Store | wc -l | tr -d ' '); printf '%s\t%s\tarchivos=%s\ttree=%s\n' "$e" "$id" "$n" "$(tree_hash "$e")"; done); else echo "(no existe)"; fi; done; }

illustrator_state() { # solo lectura; vacío si no se puede consultar
  pgrep -f "Adobe Illustrator.app/Contents/MacOS/Adobe Illustrator" >/dev/null 2>&1 || { echo "no_en_ejecucion"; return; }
  n=$(osascript -e 'tell application "Adobe Illustrator" to count documents' 2>/dev/null) && echo "en_ejecucion_docs=$n" || echo "en_ejecucion_sin_permiso"; }

do_verify() { # comprobaciones posteriores a instalar (también las usa install)
  echo "== verify · identidad, huellas y nada más tocado"
  [ -d "$DEST" ] || { bad "no existe $DEST"; return; }
  if [ -f "$DEST/CSXS/manifest.xml" ]; then id=$(bundle_id "$DEST/CSXS/manifest.xml"); [ "$id" = "$EXPECT_BUNDLE" ] && ok "manifiesto: bundle $id" || bad "bundle inesperado: $id"; grep -q "Id=\"$EXPECT_EXT\"" "$DEST/CSXS/manifest.xml" && ok "extensión $EXPECT_EXT" || bad "falta la extensión $EXPECT_EXT"; grep -q "<Menu>Tesseract V3</Menu>" "$DEST/CSXS/manifest.xml" && ok "menú «Tesseract V3»" || bad "menú inesperado"; else bad "falta el manifiesto"; fi
  if (cd "$DEST" && shasum -a 256 -c "$DIST/SHA256SUMS" --quiet 2>/dev/null); then ok "huellas SHA-256 = dist/ ($(grep -c . "$DIST/SHA256SUMS") archivos)"; else bad "las huellas de $DEST no coinciden con dist/SHA256SUMS"; fi
  extra=$(cd "$DEST" && find . -type f ! -name .DS_Store ! -name .debug ! -name SHA256SUMS ! -name BUILD_INFO.json | LC_ALL=C sort | diff - <(cut -c67- "$DIST/SHA256SUMS" | LC_ALL=C sort) || true)
  [ -z "$extra" ] && ok "sin archivos de más ni de menos (salvo .debug)" || { bad "archivos distintos:"; echo "$extra" | sed 's/^/        /'; }
  if [ -f "$DEST/.debug" ]; then python3 - "$DEST/.debug" "$EXPECT_EXT" <<'PY' && ok ".debug válido (solo $EXPECT_EXT, host ILST)" || bad ".debug inválido"
import sys, xml.etree.ElementTree as ET
r = ET.parse(sys.argv[1]).getroot(); ex = list(r.iter("Extension")); h = list(r.iter("Host"))
sys.exit(0 if len(ex) == 1 and ex[0].get("Id") == sys.argv[2] and len(h) == 1 and h[0].get("Name") == "ILST" and h[0].get("Port", "").isdigit() else 1)
PY
  else warn "no hay .debug (sin DevTools remoto)"; fi
  ls -ld "$DEST" | grep -q '^drwx.....w' && bad "el destino es escribible por otros" || ok "permisos del destino razonables"
  if [ -f "$STATE/snapshot-antes.txt" ]; then
    snapshot > "$STATE/snapshot-ahora.txt"; d=$(diff <(grep -v 'tesseract-v3' "$STATE/snapshot-antes.txt") <(grep -v 'tesseract-v3' "$STATE/snapshot-ahora.txt") || true)
    [ -z "$d" ] && ok "las demás extensiones (sistema y usuario, incl. «tesseract» instalada) están estructuralmente idénticas al snapshot previo" || { bad "otras extensiones cambiaron:"; echo "$d" | sed 's/^/        /'; }
  else warn "sin snapshot-antes.txt (no se puede comparar el resto de extensiones)"; fi
  "$ROOT/tools/verify-isolation.sh" --a4-instalado >/tmp/tess-a4-iso.$$ 2>&1 && ok "verify-isolation.sh --a4-instalado verde" || { bad "verify-isolation.sh falla:"; sed 's/^/        /' /tmp/tess-a4-iso.$$; }; rm -f /tmp/tess-a4-iso.$$
}

case "$CMD" in
preflight)
  echo "== A4 · preflight (SOLO LECTURA; no instala nada)"
  echo "== 1) build reproducible e íntegro"; if node "$ROOT/tools/build/build.mjs" --verify >/tmp/tess-a4-b.$$ 2>&1; then ok "build --verify"; else bad "build --verify falla:"; tail -5 /tmp/tess-a4-b.$$ | sed 's/^/        /'; fi; rm -f /tmp/tess-a4-b.$$
  echo "== 2) instalador en dry-run (dist íntegro, identidad V3, sin colisiones, destino libre, aislamiento)"; if "$ROOT/tools/install.sh" --dry-run >/tmp/tess-a4-d.$$ 2>&1; then ok "install.sh --dry-run correcto"; else bad "install.sh --dry-run falla:"; grep FALLA /tmp/tess-a4-d.$$ | sed 's/^/        /'; fi; rm -f /tmp/tess-a4-d.$$
  echo "== 3) repositorio"; [ -z "$(git -C "$ROOT" status --porcelain 2>/dev/null)" ] && ok "árbol de trabajo limpio ($(git -C "$ROOT" rev-parse --short HEAD))" || warn "hay cambios sin confirmar en el repositorio"
  if [ "${TESS_SKIP_SYSTEM_CHECKS:-0}" != 1 ]; then
    echo "== 4) sistema (solo lectura)"
    for v in 11 12; do pm=$(defaults read com.adobe.CSXS.$v PlayerDebugMode 2>/dev/null || echo "-"); [ "$pm" = "1" ] && ok "PlayerDebugMode CSXS.$v = 1 (extensiones sin firmar permitidas)" || { [ "$v" = 12 ] && bad "PlayerDebugMode CSXS.12 = $pm (el bundle V3 no está firmado: NO cargaría)" || warn "PlayerDebugMode CSXS.$v = $pm"; }; done
    if lsof -nP -iTCP:"$PORT" -sTCP:LISTEN >/dev/null 2>&1; then bad "el puerto $PORT (DevTools) ya está en uso"; else ok "puerto $PORT libre para DevTools remoto"; fi
    st=$(illustrator_state); case "$st" in no_en_ejecucion) ok "Illustrator no está en ejecución (instalar con él cerrado es lo más limpio)";; en_ejecucion_docs=0) warn "Illustrator en ejecución sin documentos: tras instalar hay que REINICIARLO para que cargue el bundle";; en_ejecucion_docs=*) warn "Illustrator en ejecución con ${st#*=} documento(s) abierto(s): NO lo cierres sin guardar; reinícialo tú cuando corresponda";; *) warn "Illustrator en ejecución; no se pudo consultar (${st})";; esac
  fi
  echo "== 5) autorización"; echo "  La instalación real NO está autorizada hasta que el usuario lo diga expresamente en el chat. Este preflight no la concede."
  [ $fail = 0 ] && { echo "PREFLIGHT CORRECTO"; exit 0; } || { echo "PREFLIGHT CON FALLOS"; exit 1; };;

snapshot) if [ -n "$SNAPFILE" ]; then snapshot > "$SNAPFILE"; echo "snapshot escrito en $SNAPFILE"; else snapshot; fi;;

install)
  need_auth; safe_dest
  echo "== A4 · instalación AUTORIZADA el $AUTH → $DEST"
  [ -d "$USER_CEP" ] || { echo "RECHAZADO: no existe $USER_CEP (no se crea)"; exit 3; }
  [ -e "$DEST" ] && { echo "RECHAZADO: $DEST ya existe (no se sobrescribe)"; exit 3; }
  "$ROOT/tools/install.sh" --dry-run >/tmp/tess-a4-d.$$ 2>&1 || { echo "RECHAZADO: el dry-run falla:"; grep FALLA /tmp/tess-a4-d.$$; rm -f /tmp/tess-a4-d.$$; exit 3; }; rm -f /tmp/tess-a4-d.$$
  mkdir -p "$STATE" || exit 3; snapshot > "$STATE/snapshot-antes.txt"; ok "snapshot previo guardado ($STATE/snapshot-antes.txt)"
  STAGE_D=$(mktemp -d /tmp/tess-a4-stage.XXXXXX) || exit 3; cp -R "$DIST/." "$STAGE_D/" || { rm -rf "${STAGE_D:?}"; echo "FALLA copia a staging"; exit 1; }
  (cd "$STAGE_D" && shasum -a 256 -c SHA256SUMS --quiet) || { rm -rf "${STAGE_D:?}"; echo "FALLA: staging no coincide con SHA256SUMS"; exit 1; }; ok "staging verificado"
  created=0; cp -R "$STAGE_D" "$DEST" && created=1; rm -rf "${STAGE_D:?}"
  if [ "$created" != 1 ]; then echo "FALLA la copia al destino"; [ -d "$DEST" ] && rm -rf "${DEST:?}"; exit 1; fi
  printf '<?xml version="1.0" encoding="UTF-8"?>\n<ExtensionList><Extension Id="%s"><HostList><Host Name="ILST" Port="%s"/></HostList></Extension></ExtensionList>\n' "$EXPECT_EXT" "$PORT" > "$DEST/.debug"
  do_verify
  if [ $fail != 0 ]; then echo "VERIFICACIÓN FALLIDA → rollback automático de $DEST (solo lo creado por esta ejecución)"; rm -rf "${DEST:?}"; snapshot > "$STATE/snapshot-tras-rollback-auto.txt"; diff -q "$STATE/snapshot-antes.txt" "$STATE/snapshot-tras-rollback-auto.txt" >/dev/null && echo "estado restaurado = snapshot previo" || echo "ATENCIÓN: el estado no coincide con el snapshot previo"; exit 1; fi
  python3 - "$STATE/install-record.json" "$AUTH" "$DEST" "$PORT" "$DIST" <<'PY'
import sys, json, datetime, os, hashlib
out, auth, dest, port, dist = sys.argv[1:6]
sums = dict(l.split(None, 1)[::-1] for l in open(os.path.join(dist, "SHA256SUMS")).read().splitlines() if l.strip())
json.dump({"instalado_utc": datetime.datetime.now(datetime.timezone.utc).isoformat(), "autorizacion_usuario": auth, "destino": dest, "puerto_debug": int(port), "huellas": {k.strip().lstrip("./"): v for k, v in sums.items()},
           "build_info": json.load(open(os.path.join(dist, "BUILD_INFO.json"))), "nota": "Illustrator NO fue reiniciado por esta herramienta; reinícialo para que cargue el bundle."}, open(out, "w"), indent=1, ensure_ascii=False)
PY
  echo "INSTALACIÓN CORRECTA. Registro: $STATE/install-record.json. Siguiente paso (del usuario): reiniciar Illustrator y abrir Ventana ▸ Extensiones ▸ Tesseract V3."; exit 0;;

verify) mkdir -p "$STATE"; do_verify; [ $fail = 0 ] && { echo "VERIFY CORRECTO"; exit 0; } || { echo "VERIFY CON FALLOS"; exit 1; };;

diagnose)
  mkdir -p "$STATE"; OUTF="$STATE/diagnostico-$(date +%Y%m%d-%H%M%S).txt"
  { echo "# Diagnóstico A4 (solo lectura) $(date)"; echo "## destino"; ls -la "$DEST" 2>&1 | head -30
    echo "## snapshot"; snapshot
    echo "## PlayerDebugMode"; for v in 11 12; do echo "CSXS.$v: $(defaults read com.adobe.CSXS.$v PlayerDebugMode 2>&1)"; done
    echo "## Illustrator"; illustrator_state; pgrep -fl "Adobe Illustrator" | head -3
    echo "## procesos CEP"; pgrep -fl CEPHtmlEngine | head -10
    echo "## DevTools remoto en el puerto $PORT"; lsof -nP -iTCP:"$PORT" -sTCP:LISTEN 2>&1 | head -3; curl -s --max-time 3 "http://127.0.0.1:$PORT/json" 2>&1 | head -40
    echo "## registros CSXS que mencionan tesseract (últimas líneas)"; for f in "$HOME_DIR"/Library/Logs/CSXS/*.log; do [ -f "$f" ] && grep -i "tesseract" "$f" 2>/dev/null | tail -5 | sed "s|^|$(basename "$f"): |"; done | head -60
    echo "## caché de CEP (entradas con tesseract)"; ls "$HOME_DIR/Library/Caches/CSXS/cep_cache" 2>/dev/null | grep -i tesseract | head
    echo "## informes de fallo recientes de Illustrator"; ls -t "$HOME_DIR"/Library/Logs/DiagnosticReports/*Illustrator* 2>/dev/null | head -3
    echo "## verify (resumen)"; do_verify; } 2>&1 | tee "$OUTF"; echo "diagnóstico guardado en $OUTF"; exit 0;;

rollback)
  need_auth; safe_dest
  echo "== A4 · rollback AUTORIZADO el $AUTH: se borra SOLO $DEST"
  [ -d "$DEST" ] || { echo "no existe $DEST: nada que retirar"; exit 0; }
  id=$(bundle_id "$DEST/CSXS/manifest.xml"); [ "$id" = "$EXPECT_BUNDLE" ] || { echo "RECHAZADO: $DEST no es el bundle V3 (identidad: $id). No se borra."; exit 3; }
  rm -rf "${DEST:?}"; [ -e "$DEST" ] && { echo "FALLA: no se pudo borrar"; exit 1; } || ok "borrado $DEST"
  mkdir -p "$STATE"; snapshot > "$STATE/snapshot-tras-rollback.txt"
  if [ -f "$STATE/snapshot-antes.txt" ]; then diff -q "$STATE/snapshot-antes.txt" "$STATE/snapshot-tras-rollback.txt" >/dev/null && ok "estado = snapshot previo a la instalación" || bad "el estado NO coincide con el snapshot previo:"; [ $fail = 0 ] || diff "$STATE/snapshot-antes.txt" "$STATE/snapshot-tras-rollback.txt" | sed 's/^/        /'; else warn "sin snapshot previo para comparar"; fi
  "$ROOT/tools/verify-isolation.sh" >/tmp/tess-a4-iso.$$ 2>&1 && ok "verify-isolation.sh estricto verde (V3 ya no está instalada)" || { bad "verify-isolation.sh falla:"; sed 's/^/        /' /tmp/tess-a4-iso.$$; }; rm -f /tmp/tess-a4-iso.$$
  echo "Falta (usuario): reiniciar Illustrator para que el menú «Tesseract V3» desaparezca."; [ $fail = 0 ] && { echo "ROLLBACK CORRECTO"; exit 0; } || { echo "ROLLBACK CON FALLOS"; exit 1; };;

*) echo "uso: a4.sh preflight|snapshot [archivo]|install --autorizado-por-usuario=AAAA-MM-DD [--debug-port=N]|verify|diagnose [--port=N]|rollback --autorizado-por-usuario=AAAA-MM-DD"; exit 2;;
esac
