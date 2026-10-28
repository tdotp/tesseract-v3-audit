#!/bin/bash
# F2A-3 · I-5 — Instalación AISLADA del bundle EXPERIMENTAL (dist-experimental/, identidad com.tato.tesseract.v3.experimental.panel) en el CEP
# del usuario, con el mismo esquema probado en real de tools/a4/a4.sh (A4–A9). install/uninstall exigen la fecha de la autorización expresa.
#
#   tools/a4/a4-experimental.sh preflight                                   solo lectura: ¿se puede instalar con seguridad?
#   tools/a4/a4-experimental.sh snapshot [archivo]                          huella estructural de las carpetas CEP (sistema y usuario)
#   tools/a4/a4-experimental.sh install   --autorizado-por-usuario=AAAA-MM-DD [--debug-port=8089]
#   tools/a4/a4-experimental.sh verify                                      tras instalar: identidad, huellas, nada más tocado
#   tools/a4/a4-experimental.sh diagnose  [--port=8089]                     solo lectura: estado, registros de CEP, objetivos de DevTools
#   tools/a4/a4-experimental.sh uninstall --autorizado-por-usuario=AAAA-MM-DD   borra SOLO ~/Library/.../extensions/tesseract-v3-experimental
#
# Garantías: destino ÚNICO y fijo (<CEP de usuario>/tesseract-v3-experimental); nunca sobrescribe; nunca toca TesserArt_Validator, el plugin
# original («tesseract», /Library) ni una instalación normal de V3 («tesseract-v3»); uninstall se niega si el destino no tiene la identidad
# experimental; nunca escribe en /Library, nunca cambia preferencias de Adobe ni permisos, y nunca abre, cierra ni reinicia Illustrator.
# Variables SOLO para pruebas en un HOME temporal: TESS_DIST_EXP_DIR, TESS_SYS_CEP, TESS_EXP_STATE, TESS_SKIP_SYSTEM_CHECKS=1, TESS_SKIP_BUILD_VERIFY=1.
set -u
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
HOME_DIR="${HOME:?HOME no definido}"
USER_CEP="$HOME_DIR/Library/Application Support/Adobe/CEP/extensions"
SYS_CEP="${TESS_SYS_CEP:-/Library/Application Support/Adobe/CEP/extensions}"
DIST="${TESS_DIST_EXP_DIR:-$ROOT/dist-experimental}"
DEST="$USER_CEP/tesseract-v3-experimental"
STATE="${TESS_EXP_STATE:-$ROOT/tests/results/f2a3-cep}"
EXPECT_BUNDLE="com.tato.tesseract.v3.experimental"; EXPECT_EXT="com.tato.tesseract.v3.experimental.panel"; EXPECT_MENU="Tesseract V3 (experimental)"
PROTEGIDAS="TesserArt_Validator tesseract tesseract-v3"
PORT=8089; CMD="${1:-}"; [ $# -gt 0 ] && shift
AUTH=""; SNAPFILE=""
for a in "$@"; do case "$a" in
  --autorizado-por-usuario=*) AUTH="${a#*=}";;
  --debug-port=*|--port=*) PORT="${a#*=}";;
  --*) echo "opción desconocida: $a"; exit 2;;
  *) SNAPFILE="$a";; esac; done
case "$PORT" in ''|*[!0-9]*) echo "puerto inválido: $PORT"; exit 2;; esac
fail=0; ok() { echo "  OK   $1"; }; bad() { echo "  FALLA $1"; fail=1; }; warn() { echo "  AVISO $1"; }

need_auth() { if ! echo "$AUTH" | grep -Eq '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'; then echo "RECHAZADO: '$CMD' requiere --autorizado-por-usuario=AAAA-MM-DD (fecha de la autorización EXPRESA del usuario). Sin ella no se hace nada."; exit 3; fi; }
safe_dest() {
  case "$DEST" in "$HOME_DIR/Library/Application Support/Adobe/CEP/extensions/tesseract-v3-experimental") ;; *) echo "RECHAZADO: destino inesperado: $DEST"; exit 3;; esac
  case "$DEST" in /Library/*|/System/*) echo "RECHAZADO: destino en ruta de sistema"; exit 3;; esac
  for p in $PROTEGIDAS; do [ "$(basename "$DEST")" = "$p" ] && { echo "RECHAZADO: el destino coincide con una extensión protegida ($p)"; exit 3; }; done; }
tree_hash() { (cd "$1" && find . -type f ! -name .DS_Store -exec stat -f '%N %z' {} + 2>/dev/null | LC_ALL=C sort | shasum -a 256 | cut -c1-16); }
manifest_attr() { python3 - "$1" "$2" <<'PY'
import sys, xml.etree.ElementTree as ET
try:
    r = ET.parse(sys.argv[1]).getroot(); k = sys.argv[2]
    if k == "bundle": print(r.get("ExtensionBundleId", "?"))
    elif k == "ext": print(",".join(sorted({e.get("Id") for e in r.iter("Extension") if e.get("Id")})))
    elif k == "menu": print(",".join(m.text or "" for m in r.iter("Menu")))
except Exception: print("ilegible")
PY
}
snapshot() { for d in "$SYS_CEP" "$USER_CEP"; do echo "## $d"; if [ -d "$d" ]; then (cd "$d" && for e in *; do [ -e "$e" ] || continue; id="-"; [ -f "$e/CSXS/manifest.xml" ] && id=$(manifest_attr "$e/CSXS/manifest.xml" bundle); n=$(find "$e" -type f ! -name .DS_Store | wc -l | tr -d ' '); printf '%s\t%s\tarchivos=%s\ttree=%s\n' "$e" "$id" "$n" "$(tree_hash "$e")"; done); else echo "(no existe)"; fi; done; }
illustrator_state() { pgrep -f "Adobe Illustrator.app/Contents/MacOS/Adobe Illustrator" >/dev/null 2>&1 || { echo "no_en_ejecucion"; return; }; n=$(osascript -e 'tell application "Adobe Illustrator" to count documents' 2>/dev/null) && echo "en_ejecucion_docs=$n" || echo "en_ejecucion_sin_permiso"; }

check_dist() { # identidad e integridad del bundle experimental de origen
  [ -f "$DIST/CSXS/manifest.xml" ] || { bad "no existe $DIST/CSXS/manifest.xml (construye con: node tools/build/build-experimental.mjs)"; return; }
  [ "$(manifest_attr "$DIST/CSXS/manifest.xml" bundle)" = "$EXPECT_BUNDLE" ] && ok "origen: bundle $EXPECT_BUNDLE" || bad "origen: bundle inesperado $(manifest_attr "$DIST/CSXS/manifest.xml" bundle)"
  [ "$(manifest_attr "$DIST/CSXS/manifest.xml" ext)" = "$EXPECT_EXT" ] && ok "origen: única extensión $EXPECT_EXT" || bad "origen: extensiones $(manifest_attr "$DIST/CSXS/manifest.xml" ext)"
  [ "$(manifest_attr "$DIST/CSXS/manifest.xml" menu)" = "$EXPECT_MENU" ] && ok "origen: menú «$EXPECT_MENU»" || bad "origen: menú $(manifest_attr "$DIST/CSXS/manifest.xml" menu)"
  (cd "$DIST" && shasum -a 256 -c SHA256SUMS --quiet 2>/dev/null) && ok "origen: SHA256SUMS ($(grep -c . "$DIST/SHA256SUMS") archivos)" || bad "origen: SHA256SUMS no coincide"
  [ -e "$DIST/.debug" ] && bad "origen con .debug (el instalador lo escribe en el destino; reconstruye sin --debug-port)" || ok "origen sin .debug"
  grep -q "__tessMotorExperimental" "$DIST/main.js" 2>/dev/null && ok "origen: main.js experimental (selector)" || bad "origen: main.js sin el selector experimental"
  if [ "${TESS_SKIP_BUILD_VERIFY:-0}" != 1 ]; then node "$ROOT/tools/build/build-experimental.mjs" --verify --out "$DIST" >/tmp/tess-exp-b.$$ 2>&1 && ok "origen reproducible (build-experimental --verify)" || { bad "build-experimental --verify falla:"; tail -3 /tmp/tess-exp-b.$$ | sed 's/^/        /'; }; rm -f /tmp/tess-exp-b.$$; fi; }

do_verify() {
  echo "== verify · identidad, huellas y nada más tocado"
  [ -d "$DEST" ] || { bad "no existe $DEST"; return; }
  [ "$(manifest_attr "$DEST/CSXS/manifest.xml" bundle)" = "$EXPECT_BUNDLE" ] && ok "manifiesto: bundle $EXPECT_BUNDLE" || bad "bundle inesperado en el destino"
  [ "$(manifest_attr "$DEST/CSXS/manifest.xml" ext)" = "$EXPECT_EXT" ] && ok "extensión $EXPECT_EXT" || bad "extensiones inesperadas en el destino"
  if (cd "$DEST" && shasum -a 256 -c "$DIST/SHA256SUMS" --quiet 2>/dev/null); then ok "huellas SHA-256 = $(basename "$DIST")/"; else bad "las huellas de $DEST no coinciden con $DIST/SHA256SUMS"; fi
  extra=$(cd "$DEST" && find . -type f ! -name .DS_Store ! -name .debug ! -name SHA256SUMS ! -name BUILD_INFO.json | LC_ALL=C sort | diff - <(cut -c67- "$DIST/SHA256SUMS" | LC_ALL=C sort) || true)
  [ -z "$extra" ] && ok "sin archivos de más ni de menos (salvo .debug)" || { bad "archivos distintos:"; echo "$extra" | sed 's/^/        /'; }
  if [ -f "$DEST/.debug" ]; then python3 - "$DEST/.debug" "$EXPECT_EXT" <<'PY' && ok ".debug válido (solo $EXPECT_EXT, host ILST)" || bad ".debug inválido"
import sys, xml.etree.ElementTree as ET
r = ET.parse(sys.argv[1]).getroot(); ex = list(r.iter("Extension")); h = list(r.iter("Host"))
sys.exit(0 if len(ex) == 1 and ex[0].get("Id") == sys.argv[2] and len(h) == 1 and h[0].get("Name") == "ILST" and h[0].get("Port", "").isdigit() else 1)
PY
  else warn "no hay .debug (sin DevTools remoto)"; fi
  ls -ld "$DEST" | grep -q '^d.......w' && bad "el destino es escribible por otros" || ok "permisos del destino razonables"
  if [ -f "$STATE/snapshot-antes.txt" ]; then snapshot > "$STATE/snapshot-ahora.txt"; d=$(diff <(grep -v 'tesseract-v3-experimental' "$STATE/snapshot-antes.txt") <(grep -v 'tesseract-v3-experimental' "$STATE/snapshot-ahora.txt") || true)
    [ -z "$d" ] && ok "las demás extensiones (incl. TesserArt_Validator y el plugin original) están estructuralmente idénticas al snapshot previo" || { bad "otras extensiones cambiaron:"; echo "$d" | sed 's/^/        /'; }
  else warn "sin snapshot-antes.txt (no se puede comparar el resto de extensiones)"; fi
  TESS_DIST_EXP_DIR="$DIST" "$ROOT/tools/verify-isolation.sh" --experimental-instalado >/tmp/tess-exp-iso.$$ 2>&1 && ok "verify-isolation.sh --experimental-instalado verde" || { bad "verify-isolation.sh --experimental-instalado falla:"; sed 's/^/        /' /tmp/tess-exp-iso.$$; }; rm -f /tmp/tess-exp-iso.$$; }

case "$CMD" in
preflight)
  echo "== F2A-3 · instalación experimental · preflight (SOLO LECTURA)"
  echo "== 1) bundle experimental de origen"; check_dist
  echo "== 2) destino y extensiones protegidas"
  [ -d "$USER_CEP" ] && ok "existe la carpeta CEP del usuario" || bad "no existe $USER_CEP"
  [ -e "$DEST" ] && bad "$DEST ya existe (no se sobrescribe; usa uninstall)" || ok "destino libre: $DEST"
  for p in $PROTEGIDAS; do for base in "$USER_CEP" "$SYS_CEP"; do [ -e "$base/$p" ] && ok "protegida presente (no se toca): $base/$p"; done; done
  otros=$(ls -d "$USER_CEP"/tesseract-v3* 2>/dev/null | grep -v '/tesseract-v3-experimental$' || true); [ -z "$otros" ] && ok "no hay otras copias tesseract-v3*" || warn "hay otras copias tesseract-v3*: $otros"
  if [ "${TESS_SKIP_SYSTEM_CHECKS:-0}" != 1 ]; then
    echo "== 3) sistema (solo lectura)"
    pm=$(defaults read com.adobe.CSXS.12 PlayerDebugMode 2>/dev/null || echo "-"); [ "$pm" = "1" ] && ok "PlayerDebugMode CSXS.12 = 1 (ya configurado; no se modifica)" || bad "PlayerDebugMode CSXS.12 = $pm: el bundle no está firmado y NO cargaría. Cambiarlo es una preferencia global: requiere autorización expresa"
    if lsof -nP -iTCP:"$PORT" -sTCP:LISTEN >/dev/null 2>&1; then bad "el puerto $PORT (DevTools) ya está en uso"; else ok "puerto $PORT libre para DevTools remoto"; fi
    st=$(illustrator_state); case "$st" in no_en_ejecucion) ok "Illustrator no está en ejecución";; en_ejecucion_docs=0) warn "Illustrator en ejecución sin documentos: tras instalar hay que reiniciarlo";; *) warn "Illustrator: $st (no cierres documentos sin guardar)";; esac
  fi
  [ $fail = 0 ] && { echo "PREFLIGHT CORRECTO"; exit 0; } || { echo "PREFLIGHT CON FALLOS"; exit 1; };;

snapshot) if [ -n "$SNAPFILE" ]; then snapshot > "$SNAPFILE"; echo "snapshot escrito en $SNAPFILE"; else snapshot; fi;;

install)
  need_auth; safe_dest
  echo "== F2A-3 · instalación experimental AUTORIZADA el $AUTH → $DEST"
  [ -d "$USER_CEP" ] || { echo "RECHAZADO: no existe $USER_CEP (no se crea)"; exit 3; }
  [ -e "$DEST" ] && { echo "RECHAZADO: $DEST ya existe (no se sobrescribe)"; exit 3; }
  check_dist; [ $fail = 0 ] || { echo "RECHAZADO: el bundle de origen no supera las comprobaciones"; exit 3; }
  mkdir -p "$STATE" || exit 3; snapshot > "$STATE/snapshot-antes.txt"; ok "snapshot previo guardado ($STATE/snapshot-antes.txt)"
  STAGE_D=$(mktemp -d /tmp/tess-exp-stage.XXXXXX) || exit 3; cp -R "$DIST/." "$STAGE_D/" || { rm -rf "${STAGE_D:?}"; echo "FALLA copia a staging"; exit 1; }
  (cd "$STAGE_D" && shasum -a 256 -c SHA256SUMS --quiet) || { rm -rf "${STAGE_D:?}"; echo "FALLA: staging no coincide con SHA256SUMS"; exit 1; }; ok "staging verificado"
  created=0; cp -R "$STAGE_D" "$DEST" && created=1; rm -rf "${STAGE_D:?}"
  if [ "$created" != 1 ]; then echo "FALLA la copia al destino"; [ -d "$DEST" ] && rm -rf "${DEST:?}"; exit 1; fi
  chmod -R go-w "$DEST"
  printf '<?xml version="1.0" encoding="UTF-8"?>\n<ExtensionList><Extension Id="%s"><HostList><Host Name="ILST" Port="%s"/></HostList></Extension></ExtensionList>\n' "$EXPECT_EXT" "$PORT" > "$DEST/.debug"
  do_verify
  if [ $fail != 0 ]; then echo "VERIFICACIÓN FALLIDA → retirada automática de $DEST (solo lo creado por esta ejecución)"; rm -rf "${DEST:?}"; snapshot > "$STATE/snapshot-tras-retirada-auto.txt"; diff -q "$STATE/snapshot-antes.txt" "$STATE/snapshot-tras-retirada-auto.txt" >/dev/null && echo "estado restaurado = snapshot previo" || echo "ATENCIÓN: el estado no coincide con el snapshot previo"; exit 1; fi
  python3 - "$STATE/install-record.json" "$AUTH" "$DEST" "$PORT" "$DIST" <<'PY'
import sys, json, datetime, os
out, auth, dest, port, dist = sys.argv[1:6]
sums = dict(l.split(None, 1)[::-1] for l in open(os.path.join(dist, "SHA256SUMS")).read().splitlines() if l.strip())
json.dump({"instalado_utc": datetime.datetime.now(datetime.timezone.utc).isoformat(), "autorizacion_usuario": auth, "destino": dest, "puerto_debug": int(port), "huellas": {k.strip().lstrip("./"): v for k, v in sums.items()},
           "build_info": json.load(open(os.path.join(dist, "BUILD_INFO.json"))), "nota": "Illustrator NO fue reiniciado por esta herramienta; reinícialo para que cargue el panel «Tesseract V3 (experimental)»."}, open(out, "w"), indent=1, ensure_ascii=False)
PY
  echo "INSTALACIÓN CORRECTA. Registro: $STATE/install-record.json. Siguiente paso: reiniciar Illustrator y abrir Ventana ▸ Extensiones ▸ $EXPECT_MENU."; exit 0;;

verify) mkdir -p "$STATE"; do_verify; [ $fail = 0 ] && { echo "VERIFY CORRECTO"; exit 0; } || { echo "VERIFY CON FALLOS"; exit 1; };;

diagnose)
  mkdir -p "$STATE"; OUTF="$STATE/diagnostico-$(date +%Y%m%d-%H%M%S).txt"
  { echo "# Diagnóstico de la instalación experimental (solo lectura) $(date)"; echo "## destino"; ls -la "$DEST" 2>&1 | head -30
    echo "## snapshot"; snapshot
    echo "## PlayerDebugMode"; echo "CSXS.12: $(defaults read com.adobe.CSXS.12 PlayerDebugMode 2>&1)"
    echo "## Illustrator"; illustrator_state
    echo "## DevTools remoto en el puerto $PORT"; curl -s --max-time 3 "http://127.0.0.1:$PORT/json" 2>&1 | head -40
    echo "## registros CSXS que mencionan tesseract (últimas líneas)"; for f in "$HOME_DIR"/Library/Logs/CSXS/*.log; do [ -f "$f" ] && grep -i "tesseract" "$f" 2>/dev/null | tail -5 | sed "s|^|$(basename "$f"): |"; done | head -60
    echo "## verify (resumen)"; do_verify; } 2>&1 | tee "$OUTF"; echo "diagnóstico guardado en $OUTF"; exit 0;;

uninstall|rollback)
  need_auth; safe_dest
  echo "== F2A-3 · desinstalación experimental AUTORIZADA el $AUTH: se borra SOLO $DEST"
  [ -d "$DEST" ] || { echo "no existe $DEST: nada que retirar"; exit 0; }
  id=$(manifest_attr "$DEST/CSXS/manifest.xml" bundle); [ "$id" = "$EXPECT_BUNDLE" ] || { echo "RECHAZADO: $DEST no es el bundle experimental (identidad: $id). No se borra."; exit 3; }
  [ "$(manifest_attr "$DEST/CSXS/manifest.xml" ext)" = "$EXPECT_EXT" ] || { echo "RECHAZADO: $DEST declara otras extensiones. No se borra."; exit 3; }
  mkdir -p "$STATE"; snapshot > "$STATE/snapshot-antes-de-desinstalar.txt"
  rm -rf "${DEST:?}"; [ -e "$DEST" ] && { echo "FALLA: no se pudo borrar"; exit 1; } || ok "borrado $DEST"
  snapshot > "$STATE/snapshot-tras-desinstalar.txt"
  d=$(diff <(grep -v 'tesseract-v3-experimental' "$STATE/snapshot-antes-de-desinstalar.txt") "$STATE/snapshot-tras-desinstalar.txt" || true); [ -z "$d" ] && ok "las demás extensiones siguen idénticas (solo se retiró la experimental)" || { bad "otras extensiones cambiaron:"; echo "$d" | sed 's/^/        /'; }
  if [ -f "$STATE/snapshot-antes.txt" ]; then diff -q "$STATE/snapshot-antes.txt" "$STATE/snapshot-tras-desinstalar.txt" >/dev/null && ok "estado = snapshot previo a la instalación" || warn "el estado difiere del snapshot previo a la instalación (otras extensiones cambiaron entre medias)"; fi
  "$ROOT/tools/verify-isolation.sh" >/tmp/tess-exp-iso.$$ 2>&1 && ok "verify-isolation.sh estricto verde (nada de V3 instalado)" || { bad "verify-isolation.sh falla:"; sed 's/^/        /' /tmp/tess-exp-iso.$$; }; rm -f /tmp/tess-exp-iso.$$
  echo "Falta: reiniciar Illustrator para que el menú «$EXPECT_MENU» desaparezca."; [ $fail = 0 ] && { echo "DESINSTALACIÓN CORRECTA"; exit 0; } || { echo "DESINSTALACIÓN CON FALLOS"; exit 1; };;

*) echo "uso: a4-experimental.sh preflight|snapshot [archivo]|install --autorizado-por-usuario=AAAA-MM-DD [--debug-port=N]|verify|diagnose [--port=N]|uninstall --autorizado-por-usuario=AAAA-MM-DD"; exit 2;;
esac
