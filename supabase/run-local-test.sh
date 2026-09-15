#!/usr/bin/env bash
# ---------------------------------------------------------------
#  Migratsiyalarni lokal Postgres'da tekshiradi.
#  Supabase kerak emas — shunchaki postgres o'rnatilgan bo'lsa yetadi.
#
#    bash supabase/run-local-test.sh
# ---------------------------------------------------------------
set -euo pipefail

PGBIN="${PGBIN:-/usr/lib/postgresql/16/bin}"
PGDATA="${PGDATA:-/tmp/wba-pgtest}"
SOCK="${SOCK:-/tmp/wba-pgsock}"
PORT="${PORT:-55432}"
DB="${DB:-wba_test}"

export PATH="$PGBIN:$PATH"
export PGHOST="$SOCK" PGPORT="$PORT" PGUSER=postgres

# Postgres root ostida ishlamaydi. Root bo'lsak — alohida foydalanuvchi ochamiz.
RUNAS=""
if [ "$(id -u)" = "0" ]; then
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
  rm -rf "$PGDATA"; mkdir -p "$PGDATA" "$SOCK"
  [ -n "$RUNAS" ] && chown -R "$RUNAS" "$PGDATA" "$SOCK"
  pg "initdb -D $PGDATA -U postgres --auth=trust" >/dev/null
  pg "pg_ctl -D $PGDATA -o '-k $SOCK -p $PORT -c listen_addresses=' -l /tmp/wba-pg.log start" >/dev/null
  sleep 2
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
echo "  $PGBIN/pg_ctl -D $PGDATA stop"
