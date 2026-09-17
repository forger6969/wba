#!/usr/bin/env bash
# ---------------------------------------------------------------
#  Migratsiyalarni lokal Postgres'da tekshiradi.
#  Supabase kerak emas — shunchaki postgres o'rnatilgan bo'lsa yetadi.
#
#    bash supabase/run-local-test.sh
#
#  Windows (Git Bash) da ham ishlaydi: u yerda unix-socket yo'q,
#  shuning uchun ulanish TCP orqali (127.0.0.1) bo'ladi.
# ---------------------------------------------------------------
set -euo pipefail

PORT="${PORT:-55432}"
DB="${DB:-wba_test}"

case "$(uname -s)" in
  MINGW*|MSYS*|CYGWIN*) WINDOWS=1 ;;
  *)                    WINDOWS=0 ;;
esac

if [ "$WINDOWS" = "1" ]; then
  # Eng yangi o'rnatilgan PostgreSQL ning bin papkasi
  PGBIN="${PGBIN:-$(ls -d /c/Program\ Files/PostgreSQL/*/bin 2>/dev/null | sort -V | tail -1)}"
  if [ -z "$PGBIN" ] || [ ! -x "$PGBIN/initdb.exe" ]; then
    echo "PostgreSQL topilmadi. PGBIN o'zgaruvchisini qo'ling, masalan:" >&2
    echo "  PGBIN='/c/Program Files/PostgreSQL/18/bin' bash supabase/run-local-test.sh" >&2
    exit 1
  fi
  PGDATA="${PGDATA:-$TEMP/wba-pgtest}"
  export PATH="$PGBIN:$PATH"
  export PGHOST=127.0.0.1 PGPORT="$PORT" PGUSER=postgres
  # Windows binarilariga yo'l Windows ko'rinishida beriladi
  PGDATA_ARG="$(cygpath -w "$PGDATA")"
  LOG_ARG="$(cygpath -w "$PGDATA.log")"
  ISHGA="-p $PORT -c listen_addresses=127.0.0.1"
else
  PGBIN="${PGBIN:-/usr/lib/postgresql/16/bin}"
  PGDATA="${PGDATA:-/tmp/wba-pgtest}"
  SOCK="${SOCK:-/tmp/wba-pgsock}"
  export PATH="$PGBIN:$PATH"
  export PGHOST="$SOCK" PGPORT="$PORT" PGUSER=postgres
  PGDATA_ARG="$PGDATA"
  LOG_ARG="/tmp/wba-pg.log"
  ISHGA="-k $SOCK -p $PORT -c listen_addresses="
fi

# Postgres root ostida ishlamaydi. Root bo'lsak — alohida foydalanuvchi ochamiz.
RUNAS=""
if [ "$WINDOWS" = "0" ] && [ "$(id -u)" = "0" ]; then
  id -u wbapg >/dev/null 2>&1 || useradd -m wbapg
  RUNAS="wbapg"
fi

pg() {
  if [ -n "$RUNAS" ]; then
    su "$RUNAS" -c "PATH=$PGBIN:\$PATH $*"
  else
    eval "$*"
  fi
}

if ! pg_isready -q 2>/dev/null; then
  echo "→ Vaqtinchalik Postgres ishga tushirilyapti…"
  rm -rf "$PGDATA"; mkdir -p "$PGDATA"
  [ "$WINDOWS" = "0" ] && mkdir -p "$SOCK"
  [ -n "$RUNAS" ] && chown -R "$RUNAS" "$PGDATA" "$SOCK"
  pg "initdb -D '$PGDATA_ARG' -U postgres --auth=trust" >/dev/null

  # Server FONDA qoladi va shu terminaldan butunlay uzilishi kerak.
  # Aks holda Windows'da u terminalning oqimlarini ushlab turadi va
  # skript tugagandan keyin ham buyruq "tugamagan" bo'lib ko'rinadi.
  pg "pg_ctl -D '$PGDATA_ARG' -o '$ISHGA' -l '$LOG_ARG' start" </dev/null >/dev/null 2>&1

  # Server ko'tarilguncha kutamiz (eng ko'pi 30 sek)
  for _ in $(seq 30); do
    pg_isready -q && break
    sleep 1
  done
fi

dropdb --if-exists "$DB"
createdb "$DB"

echo "→ Migratsiyalar…"
psql -d "$DB" -q -v ON_ERROR_STOP=1 -f supabase/_test_shim.sql
for f in supabase/migrations/0*.sql; do
  echo "   $f"
  psql -d "$DB" -q -v ON_ERROR_STOP=1 -f "$f"
done

echo "→ Mantiq va RLS testlari…"
psql -d "$DB" -v ON_ERROR_STOP=1 -f supabase/_test_logic.sql

echo
echo "✓ Hammasi o'tdi. Tozalash uchun:"
echo "  \"$PGBIN/pg_ctl\" -D '$PGDATA_ARG' stop"
